"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  listarComissoesHistorico, listarCompetencias, alterarStatusComissao,
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

function gerarCompetenciasRecentes(n = 12): string[] {
  const hoje = new Date();
  const result: string[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    result.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return result;
}

const TODOS_STATUS: StatusComissao[] = [
  "aguardando_liberacao", "elegivel", "na_competencia", "aprovada", "paga", "cancelada",
];

export default function HistoricoComissoes() {
  const { isAdmin } = usePermissions();
  const [comissoes,    setComissoes]    = useState<Comissao[]>([]);
  const [vendedores,   setVendedores]   = useState<Vendedor[]>([]);
  const [competencias, setCompetencias] = useState<Competencia[]>([]);
  const [carregando,   setCarregando]   = useState(true);

  const [filtroVend,   setFiltroVend]   = useState("");
  const [filtroComp,   setFiltroComp]   = useState("");
  const [filtroStatus, setFiltroStatus] = useState<StatusComissao | "">("");

  // modal alterar status
  const [editando,     setEditando]     = useState<Comissao | null>(null);
  const [novoStatus,   setNovoStatus]   = useState<StatusComissao>("aguardando_liberacao");
  const [compSel,      setCompSel]      = useState("");
  const [motivo,       setMotivo]       = useState("");
  const [salvando,     setSalvando]     = useState(false);
  const [erro,         setErro]         = useState<string | null>(null);

  const opcoesCompetencia = useMemo(() => {
    const dbSet   = new Set(competencias.map((c) => c.competencia));
    const geradas = gerarCompetenciasRecentes(12).filter((c) => !dbSet.has(c));
    return [...competencias.map((c) => c.competencia), ...geradas].sort((a, b) => b.localeCompare(a));
  }, [competencias]);

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

  function abrirModal(c: Comissao) {
    setEditando(c);
    // pré-seleciona o próximo status lógico, ou o atual como fallback
    const proximo = proximoStatus(c.status);
    setNovoStatus(proximo);
    setCompSel(c.competencia ?? "");
    setMotivo("");
    setErro(null);
  }

  function proximoStatus(atual: StatusComissao): StatusComissao {
    const fluxo: StatusComissao[] = [
      "aguardando_liberacao", "elegivel", "na_competencia", "aprovada", "paga",
    ];
    const idx = fluxo.indexOf(atual);
    return idx >= 0 && idx + 1 < fluxo.length ? fluxo[idx + 1] : atual;
  }

  const precisaCompetencia = novoStatus === "elegivel" || novoStatus === "na_competencia";
  const precisaMotivo      = novoStatus === "cancelada";

  const podeSalvar =
    editando !== null &&
    novoStatus !== editando.status &&
    (!precisaCompetencia || compSel.trim() !== "") &&
    (!precisaMotivo      || motivo.trim()  !== "");

  async function confirmarAlteracao() {
    if (!editando || !podeSalvar) return;
    setSalvando(true);
    setErro(null);
    const result = await alterarStatusComissao(editando.id, novoStatus, {
      competencia: precisaCompetencia ? compSel : undefined,
      motivo:      precisaMotivo      ? motivo  : undefined,
    });
    setSalvando(false);
    if (!result.ok) { setErro(result.error ?? "Erro."); return; }
    setEditando(null);
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
          {TODOS_STATUS.map((s) => (
            <option key={s} value={s}>{labelStatusComissao(s)}</option>
          ))}
        </select>
      </div>

      {erro && !editando && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>
      )}

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
                          onClick={() => abrirModal(c)}
                          className="rounded-lg px-2 py-1 text-xs font-bold text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                          title="Alterar status"
                        >
                          ···
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

      {/* Modal alterar status */}
      {editando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditando(null)} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-1 text-base font-bold text-gray-900">Alterar Status</h3>
            <p className="mb-4 text-xs text-gray-400">
              {editando.vendedor_nome} · {editando.venda_cliente ?? "—"}
            </p>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Novo status</label>
                <select
                  value={novoStatus}
                  onChange={(e) => setNovoStatus(e.target.value as StatusComissao)}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-folk focus:ring-2 focus:ring-folk/10"
                >
                  {TODOS_STATUS.filter((s) => s !== editando.status).map((s) => (
                    <option key={s} value={s}>{labelStatusComissao(s)}</option>
                  ))}
                </select>
              </div>

              {precisaCompetencia && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Competência</label>
                  <select
                    value={compSel}
                    onChange={(e) => setCompSel(e.target.value)}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-folk focus:ring-2 focus:ring-folk/10"
                  >
                    <option value="">Selecione...</option>
                    {opcoesCompetencia.map((comp) => (
                      <option key={comp} value={comp}>{labelCompetencia(comp)}</option>
                    ))}
                  </select>
                </div>
              )}

              {precisaMotivo && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Motivo do cancelamento</label>
                  <textarea
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    rows={3}
                    placeholder="Descreva o motivo..."
                    className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-folk focus:ring-2 focus:ring-folk/10"
                  />
                </div>
              )}

              {erro && (
                <p className="text-xs text-red-600">{erro}</p>
              )}
            </div>

            <div className="mt-5 flex gap-3">
              <button
                onClick={confirmarAlteracao}
                disabled={!podeSalvar || salvando}
                className="rounded-2xl bg-folk px-4 py-2 text-sm font-semibold text-white hover:bg-folk/90 disabled:opacity-50 transition-colors"
              >
                {salvando ? "Salvando..." : "Confirmar"}
              </button>
              <button
                onClick={() => setEditando(null)}
                className="rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
