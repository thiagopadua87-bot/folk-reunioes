"use client";

import { useState, useEffect, useCallback } from "react";
import { listarPipelineLixeira, formatMoeda, labelStatusPipeline, type PipelineLixeiraItem } from "@/lib/comercial";

function formatDt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function PipelineLixeiraAdmin() {
  const [itens, setItens]           = useState<PipelineLixeiraItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro]             = useState<string | null>(null);
  const [busca, setBusca]           = useState("");

  const carregar = useCallback(async () => {
    setCarregando(true); setErro(null);
    try { setItens(await listarPipelineLixeira()); }
    catch (e) { setErro(e instanceof Error ? e.message : "Erro ao carregar."); }
    finally { setCarregando(false); }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const visiveis = itens.filter((r) =>
    !busca || r.cliente.toLowerCase().includes(busca.toLowerCase()) ||
    (r.excluido_por_nome ?? "").toLowerCase().includes(busca.toLowerCase())
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
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-gray-900">Lixeira do Pipeline</h2>
          <p className="text-xs text-gray-400 mt-0.5">Leads excluídos — {itens.length} registro{itens.length !== 1 ? "s" : ""}</p>
        </div>
        <input
          type="text"
          placeholder="Buscar por cliente ou usuário..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-folk focus:ring-2 focus:ring-folk/10 w-64"
        />
      </div>

      {erro && <p className="text-sm text-red-600">{erro}</p>}

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
              </tr>
            </thead>
            <tbody>
              {visiveis.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-red-50/40 transition-colors">
                  <td className="py-3 pr-4 font-semibold text-gray-900">{r.cliente}</td>
                  <td className="py-3 pr-4 font-mono text-gray-500">{r.cnpj ?? "—"}</td>
                  <td className="py-3 pr-4 text-gray-600">{labelStatusPipeline(r.status as Parameters<typeof labelStatusPipeline>[0])}</td>
                  <td className="py-3 pr-4 text-gray-600">{r.vendedor_nome ?? "—"}</td>
                  <td className="py-3 pr-4 text-right text-gray-700">
                    {r.valor_mensal > 0 ? formatMoeda(r.valor_mensal) : "—"}
                  </td>
                  <td className="py-3 pr-4 text-right text-gray-700">
                    {r.valor_implantacao > 0 ? formatMoeda(r.valor_implantacao) : "—"}
                  </td>
                  <td className="py-3 pr-4 text-gray-500">
                    {r.data_inicio_lead ? new Date(r.data_inicio_lead + "T00:00:00").toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td className="py-3 pr-4 text-gray-500 whitespace-nowrap">{formatDt(r.excluido_em)}</td>
                  <td className="py-3 font-medium text-gray-700">{r.excluido_por_nome ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
