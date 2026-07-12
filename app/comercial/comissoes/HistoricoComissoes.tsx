"use client";

import { useState, useEffect, useCallback } from "react";
import {
  listarComissoesHistorico, listarCompetencias, cancelarComissaoAction,
  type Comissao, type StatusComissao, type Competencia,
  labelCompetencia, labelStatusComissao,
} from "@/lib/comissoes";
import { listarVendedores } from "@/lib/cadastros";
import { formatMoeda, formatData } from "@/lib/comercial";
import type { Vendedor } from "@/lib/cadastros";
import { usePermissions } from "@/app/components/PermissionsProvider";

const STATUS_STYLE: Record<string, string> = {
  aguardando_liberacao: "bg-yellow-100 text-yellow-700",
  elegivel:             "bg-blue-100 text-blue-700",
  na_competencia:       "bg-indigo-100 text-indigo-700",
  aprovada:             "bg-emerald-100 text-emerald-700",
  paga:                 "bg-gray-100 text-gray-600",
  cancelada:            "bg-red-100 text-red-500",
};

const BADGE_TIPO: Record<string, string> = {
  consultor: "bg-folk/10 text-folk",
  gerente:   "bg-blue-100 text-blue-700",
  indicador: "bg-amber-100 text-amber-700",
};

export default function HistoricoComissoes() {
  const { isAdmin } = usePermissions();
  const [comissoes,    setComissoes]    = useState<Comissao[]>([]);
  const [vendedores,   setVendedores]   = useState<Vendedor[]>([]);
  const [competencias, setCompetencias] = useState<Competencia[]>([]);
  const [carregando,   setCarregando]   = useState(true);

  const [filtroVend, setFiltroVend]     = useState("");
  const [filtroComp, setFiltroComp]     = useState("");
  const [filtroStatus, setFiltroStatus] = useState<StatusComissao | "">("");

  const [cancelando, setCancelando]   = useState<string | null>(null);
  const [motivoCanc, setMotivoCanc]   = useState("");
  const [salvandoCanc, setSalvandoCanc] = useState(false);
  const [erro, setErro]               = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [hist, vends, comps] = await Promise.all([
        listarComissoesHistorico({
          vendedorId:  filtroVend  || undefined,
          competencia: filtroComp  || undefined,
          status:      (filtroStatus || undefined) as StatusComissao | undefined,
        }),
        listarVendedores({ ativo: undefined }),
        listarCompetencias(),
      ]);
      setComissoes(hist);
      setVendedores(vends);
      setCompetencias(comps);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar.");
    } finally {
      setCarregando(false);
    }
  }, [filtroVend, filtroComp, filtroStatus]);

  useEffect(() => { carregar(); }, [carregar]);

  async function confirmarCancelamento() {
    if (!cancelando || !motivoCanc.trim()) return;
    setSalvandoCanc(true);
    const result = await cancelarComissaoAction(cancelando, motivoCanc);
    setSalvandoCanc(false);
    if (!result.ok) { setErro(result.error ?? "Erro."); return; }
    setCancelando(null);
    setMotivoCanc("");
    carregar();
  }

  return (
    <div className="space-y-4">
      <h3 className="text-base font-bold text-gray-900">Histórico de Comissões</h3>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filtroVend}
          onChange={(e) => setFiltroVend(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-folk focus:ring-2 focus:ring-folk/10"
        >
          <option value="">Todos os vendedores</option>
          {vendedores.map((v) => (
            <option key={v.id} value={v.id}>{v.nome}</option>
          ))}
        </select>

        <select
          value={filtroComp}
          onChange={(e) => setFiltroComp(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-folk focus:ring-2 focus:ring-folk/10"
        >
          <option value="">Todas as competências</option>
          {competencias.map((c) => (
            <option key={c.competencia} value={c.competencia}>{labelCompetencia(c.competencia)}</option>
          ))}
        </select>

        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value as StatusComissao | "")}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-folk focus:ring-2 focus:ring-folk/10"
        >
          <option value="">Todos os status</option>
          <option value="aguardando_liberacao">Aguardando Liberação</option>
          <option value="elegivel">Elegível</option>
          <option value="na_competencia">Na Competência</option>
          <option value="aprovada">Aprovada</option>
          <option value="paga">Paga</option>
          <option value="cancelada">Cancelada</option>
        </select>
      </div>

      {erro && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>}

      {carregando ? (
        <p className="text-sm text-gray-400">Carregando...</p>
      ) : comissoes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-12 text-center text-sm text-gray-400">
          Nenhuma comissão encontrada com os filtros aplicados.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="border-b border-gray-100">
                <th className="py-3 pl-5 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Vendedor</th>
                <th className="py-3 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Cliente</th>
                <th className="py-3 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Data</th>
                <th className="py-3 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Competência</th>
                <th className="py-3 pr-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Comissão</th>
                <th className="py-3 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                {isAdmin && <th className="py-3 pr-5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500" />}
              </tr>
            </thead>
            <tbody>
              {comissoes.map((c) => (
                <tr key={c.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60">
                  <td className="py-3 pl-5 pr-3">
                    <p className="font-medium text-gray-800">{c.vendedor_nome ?? "—"}</p>
                    <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${BADGE_TIPO[c.tipo_beneficiario]}`}>
                      {c.tipo_beneficiario.charAt(0).toUpperCase() + c.tipo_beneficiario.slice(1)}
                    </span>
                  </td>
                  <td className="py-3 pr-3 text-gray-700">{c.venda_cliente ?? "—"}</td>
                  <td className="py-3 pr-3 text-gray-500">{c.venda_data ? formatData(c.venda_data) : "—"}</td>
                  <td className="py-3 pr-3 text-gray-500">
                    {c.competencia ? labelCompetencia(c.competencia) : "—"}
                  </td>
                  <td className="py-3 pr-3 text-right font-bold text-gray-900">{formatMoeda(c.comissao_total)}</td>
                  <td className="py-3 pr-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[c.status] ?? "bg-gray-100 text-gray-500"}`}>
                      {labelStatusComissao(c.status)}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="py-3 pr-5 text-right">
                      {c.status !== "paga" && c.status !== "cancelada" && (
                        <button
                          onClick={() => { setCancelando(c.id); setMotivoCanc(""); }}
                          className="text-xs font-semibold text-red-500 hover:underline"
                        >
                          Cancelar
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal cancelamento */}
      {cancelando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setCancelando(null)} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-base font-bold text-gray-900">Cancelar Comissão</h3>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Motivo</label>
              <textarea
                value={motivoCanc}
                onChange={(e) => setMotivoCanc(e.target.value)}
                rows={3}
                placeholder="Descreva o motivo do cancelamento..."
                className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-folk focus:ring-2 focus:ring-folk/10"
              />
            </div>
            <div className="mt-4 flex gap-3">
              <button
                onClick={confirmarCancelamento}
                disabled={!motivoCanc.trim() || salvandoCanc}
                className="rounded-2xl bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {salvandoCanc ? "Cancelando..." : "Confirmar"}
              </button>
              <button
                onClick={() => setCancelando(null)}
                className="rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
