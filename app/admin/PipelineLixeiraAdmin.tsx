"use client";

import { useState, useEffect, useCallback } from "react";
import {
  listarPipelineLixeira, restaurarPipelineItem, formatMoeda, labelStatusPipeline,
  type PipelineLixeiraItem,
} from "@/lib/comercial";

function formatDt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function PipelineLixeiraAdmin() {
  const [itens, setItens]                         = useState<PipelineLixeiraItem[]>([]);
  const [carregando, setCarregando]               = useState(true);
  const [erro, setErro]                           = useState<string | null>(null);
  const [busca, setBusca]                         = useState("");
  const [confirmando, setConfirmando]             = useState<PipelineLixeiraItem | null>(null);
  const [restaurando, setRestaurando]             = useState<string | null>(null);
  const [sucesso, setSucesso]                     = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true); setErro(null);
    try { setItens(await listarPipelineLixeira()); }
    catch (e) { setErro(e instanceof Error ? e.message : "Erro ao carregar."); }
    finally { setCarregando(false); }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  async function handleRestaurar() {
    if (!confirmando) return;
    const id = confirmando.id;
    const nome = confirmando.cliente;
    setConfirmando(null);
    setRestaurando(id);
    setErro(null); setSucesso(null);
    try {
      await restaurarPipelineItem(id);
      setSucesso(`"${nome}" foi restaurado ao pipeline com sucesso.`);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao restaurar.");
    } finally {
      setRestaurando(null);
    }
  }

  const visiveis = itens.filter((r) =>
    !busca ||
    r.cliente.toLowerCase().includes(busca.toLowerCase()) ||
    (r.excluido_por_nome ?? "").toLowerCase().includes(busca.toLowerCase()) ||
    (r.cnpj ?? "").includes(busca)
  );

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-gray-200 border-t-folk" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-base font-bold text-gray-900">Lixeira do Pipeline</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {itens.length} lead{itens.length !== 1 ? "s" : ""} excluído{itens.length !== 1 ? "s" : ""} — admin pode restaurar
          </p>
        </div>
        <input
          type="text"
          placeholder="Buscar por cliente, CNPJ ou usuário..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-folk focus:ring-2 focus:ring-folk/10 w-72"
        />
      </div>

      {erro    && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">{erro}</p>}
      {sucesso && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">{sucesso}</p>}

      {visiveis.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">
          {busca ? "Nenhum resultado para a busca." : "Nenhum lead foi excluído ainda."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="pb-2.5 text-left font-semibold uppercase tracking-wide text-gray-400">Cliente</th>
                <th className="pb-2.5 text-left font-semibold uppercase tracking-wide text-gray-400">CNPJ</th>
                <th className="pb-2.5 text-left font-semibold uppercase tracking-wide text-gray-400">Status</th>
                <th className="pb-2.5 text-left font-semibold uppercase tracking-wide text-gray-400">Vendedor</th>
                <th className="pb-2.5 text-right font-semibold uppercase tracking-wide text-gray-400">MRR</th>
                <th className="pb-2.5 text-right font-semibold uppercase tracking-wide text-gray-400">Implant.</th>
                <th className="pb-2.5 text-left font-semibold uppercase tracking-wide text-gray-400">Entrada</th>
                <th className="pb-2.5 text-left font-semibold uppercase tracking-wide text-gray-400">Excluído em</th>
                <th className="pb-2.5 text-left font-semibold uppercase tracking-wide text-gray-400">Excluído por</th>
                <th className="pb-2.5" />
              </tr>
            </thead>
            <tbody>
              {visiveis.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-amber-50/30 transition-colors">
                  <td className="py-3 pr-4 font-semibold text-gray-900">{r.cliente}</td>
                  <td className="py-3 pr-4 font-mono text-gray-500">{r.cnpj ?? "—"}</td>
                  <td className="py-3 pr-4 text-gray-600">
                    {labelStatusPipeline(r.status as Parameters<typeof labelStatusPipeline>[0])}
                  </td>
                  <td className="py-3 pr-4 text-gray-600">{r.vendedor_nome ?? "—"}</td>
                  <td className="py-3 pr-4 text-right text-gray-700">
                    {(r.valor_mensal ?? 0) > 0 ? formatMoeda(r.valor_mensal) : "—"}
                  </td>
                  <td className="py-3 pr-4 text-right text-gray-700">
                    {(r.valor_implantacao ?? 0) > 0 ? formatMoeda(r.valor_implantacao) : "—"}
                  </td>
                  <td className="py-3 pr-4 text-gray-500">
                    {r.data_inicio_lead
                      ? new Date(r.data_inicio_lead + "T00:00:00").toLocaleDateString("pt-BR")
                      : "—"}
                  </td>
                  <td className="py-3 pr-4 text-gray-500 whitespace-nowrap">{formatDt(r.excluido_em)}</td>
                  <td className="py-3 pr-4 font-medium text-gray-700">{r.excluido_por_nome ?? "—"}</td>
                  <td className="py-3">
                    <button
                      onClick={() => setConfirmando(r)}
                      disabled={restaurando === r.id}
                      className="whitespace-nowrap rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
                    >
                      {restaurando === r.id ? "Restaurando..." : "↩ Restaurar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de confirmação de restauração */}
      {confirmando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-1 text-base font-bold text-gray-900">Restaurar lead?</h3>
            <p className="mb-4 text-sm text-gray-500">
              O lead voltará ao pipeline com todos os dados originais e status{" "}
              <span className="font-semibold text-gray-700">
                {labelStatusPipeline(confirmando.status as Parameters<typeof labelStatusPipeline>[0])}
              </span>.
            </p>

            {/* Resumo do item */}
            <div className="mb-5 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 space-y-1">
              <p className="text-sm font-semibold text-gray-900">{confirmando.cliente}</p>
              {confirmando.cnpj && (
                <p className="text-xs font-mono text-gray-400">{confirmando.cnpj}</p>
              )}
              {confirmando.vendedor_nome && (
                <p className="text-xs text-gray-500">Vendedor: <span className="font-medium">{confirmando.vendedor_nome}</span></p>
              )}
              {((confirmando.valor_mensal ?? 0) > 0 || (confirmando.valor_implantacao ?? 0) > 0) && (
                <p className="text-xs text-gray-500">
                  {(confirmando.valor_mensal ?? 0) > 0 && <>{formatMoeda(confirmando.valor_mensal)}/mês</>}
                  {(confirmando.valor_mensal ?? 0) > 0 && (confirmando.valor_implantacao ?? 0) > 0 && " + "}
                  {(confirmando.valor_implantacao ?? 0) > 0 && <>{formatMoeda(confirmando.valor_implantacao)} implantação</>}
                </p>
              )}
              {confirmando.servicos && confirmando.servicos.length > 0 && (
                <p className="text-xs text-gray-400">{confirmando.servicos.join(", ")}</p>
              )}
              <p className="text-[11px] text-gray-400 pt-0.5">
                Excluído em {formatDt(confirmando.excluido_em)}
                {confirmando.excluido_por_nome ? ` por ${confirmando.excluido_por_nome}` : ""}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmando(null)}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleRestaurar}
                className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
              >
                Restaurar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
