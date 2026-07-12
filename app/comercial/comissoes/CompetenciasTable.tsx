"use client";

import { useState } from "react";
import {
  type Competencia, type StatusCompetencia,
  listarComissoesPorCompetencia, atualizarStatusCompetenciaAction,
  labelCompetencia, labelStatusCompetencia,
  type ResumoVendedor, type Comissao,
} from "@/lib/comissoes";
import { formatMoeda, formatData } from "@/lib/comercial";
import { usePermissions } from "@/app/components/PermissionsProvider";

const STATUS_STYLE: Record<string, string> = {
  aberta:               "bg-green-100 text-green-700",
  em_conferencia:       "bg-blue-100 text-blue-700",
  aguardando_aprovacao: "bg-yellow-100 text-yellow-700",
  aprovada:             "bg-emerald-100 text-emerald-700",
  enviada_financeiro:   "bg-purple-100 text-purple-700",
  paga:                 "bg-gray-100 text-gray-600",
  fechada:              "bg-gray-100 text-gray-400",
};

const BADGE_BENEFICIARIO: Record<string, string> = {
  consultor: "bg-folk/10 text-folk",
  gerente:   "bg-blue-100 text-blue-700",
  indicador: "bg-amber-100 text-amber-700",
};

const LABEL_BENEFICIARIO: Record<string, string> = {
  consultor: "Consultor",
  gerente:   "Gerente",
  indicador: "Indicador",
};

interface Props {
  competencias: Competencia[];
  onRecarregar: () => void;
}

export default function CompetenciasTable({ competencias, onRecarregar }: Props) {
  const { isAdmin } = usePermissions();
  const [expandida, setExpandida]     = useState<string | null>(null);
  const [resumos, setResumos]         = useState<Map<string, ResumoVendedor[]>>(new Map());
  const [carregandoComp, setCarregandoComp] = useState<string | null>(null);
  const [salvando, setSalvando]       = useState(false);
  const [erro, setErro]               = useState<string | null>(null);
  const [comissaoDetalhe, setComissaoDetalhe] = useState<Comissao | null>(null);

  async function toggleCompetencia(comp: string) {
    if (expandida === comp) {
      setExpandida(null);
      return;
    }
    setExpandida(comp);
    if (!resumos.has(comp)) {
      setCarregandoComp(comp);
      try {
        const data = await listarComissoesPorCompetencia(comp);
        setResumos((m) => new Map(m).set(comp, data));
      } finally {
        setCarregandoComp(null);
      }
    }
  }

  async function avancarStatus(comp: Competencia) {
    const PROXIMO: Record<StatusCompetencia, StatusCompetencia | null> = {
      aberta:               "em_conferencia",
      em_conferencia:       "aguardando_aprovacao",
      aguardando_aprovacao: "aprovada",
      aprovada:             "enviada_financeiro",
      enviada_financeiro:   "paga",
      paga:                 "fechada",
      fechada:              null,
    };
    const prox = PROXIMO[comp.status];
    if (!prox) return;
    if (!confirm(`Avançar competência ${labelCompetencia(comp.competencia)} para "${labelStatusCompetencia(prox)}"?`)) return;
    setSalvando(true);
    setErro(null);
    const result = await atualizarStatusCompetenciaAction(comp.id, prox);
    setSalvando(false);
    if (!result.ok) { setErro(result.error ?? "Erro."); return; }
    onRecarregar();
  }

  const LABEL_PROX: Record<StatusCompetencia, string | null> = {
    aberta:               "Iniciar Conferência",
    em_conferencia:       "Enviar p/ Aprovação",
    aguardando_aprovacao: "Aprovar",
    aprovada:             "Enviar ao Financeiro",
    enviada_financeiro:   "Marcar como Paga",
    paga:                 "Fechar",
    fechada:              null,
  };

  if (competencias.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-16 text-center text-sm text-gray-400">
        Nenhuma competência registrada ainda. As competências são criadas automaticamente quando vendas são liberadas.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {erro && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>
      )}

      {competencias.map((comp) => {
        const aberta      = expandida === comp.competencia;
        const carregando  = carregandoComp === comp.competencia;
        const resumoComp  = resumos.get(comp.competencia) ?? [];
        const labelProx   = LABEL_PROX[comp.status];

        return (
          <div key={comp.id} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {/* Header da competência */}
            <div
              className="flex cursor-pointer items-center gap-4 px-5 py-4 hover:bg-gray-50/60 transition-colors"
              onClick={() => toggleCompetencia(comp.competencia)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-bold text-gray-900">{labelCompetencia(comp.competencia)}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[comp.status]}`}>
                    {labelStatusCompetencia(comp.status)}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-gray-500">
                  {new Date(comp.data_inicio + "T12:00:00").toLocaleDateString("pt-BR")} –{" "}
                  {new Date(comp.data_fim + "T12:00:00").toLocaleDateString("pt-BR")}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-lg font-bold text-gray-900">{formatMoeda(comp.total_comissoes ?? 0)}</p>
                <p className="text-xs text-gray-500">{comp.total_vendedores ?? 0} vendedor{(comp.total_vendedores ?? 0) !== 1 ? "es" : ""} · {comp.total_vendas ?? 0} venda{(comp.total_vendas ?? 0) !== 1 ? "s" : ""}</p>
              </div>
              {isAdmin && labelProx && comp.status !== "fechada" && (
                <button
                  onClick={(e) => { e.stopPropagation(); avancarStatus(comp); }}
                  disabled={salvando}
                  className="shrink-0 rounded-xl bg-folk px-3 py-1.5 text-xs font-semibold text-white hover:bg-folk/90 disabled:opacity-60 transition-colors"
                >
                  {labelProx}
                </button>
              )}
              <span className={`shrink-0 text-gray-400 transition-transform ${aberta ? "rotate-180" : ""}`}>▾</span>
            </div>

            {/* Detalhe expandido */}
            {aberta && (
              <div className="border-t border-gray-100 px-5 pb-5 pt-4">
                {carregando ? (
                  <p className="text-sm text-gray-400">Carregando...</p>
                ) : resumoComp.length === 0 ? (
                  <p className="text-sm text-gray-400">Nenhuma comissão nesta competência.</p>
                ) : (
                  <div className="space-y-4">
                    {resumoComp.map((rv) => (
                      <div key={rv.vendedor_id}>
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-sm font-bold text-gray-800">{rv.vendedor_nome}</p>
                          <p className="text-sm font-bold text-folk">{formatMoeda(rv.comissao_total)}</p>
                        </div>
                        <div className="overflow-x-auto rounded-xl border border-gray-100">
                          <table className="w-full text-xs">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="py-2 pl-3 pr-2 text-left font-semibold text-gray-500">Cliente</th>
                                <th className="py-2 pr-2 text-left font-semibold text-gray-500">Data</th>
                                <th className="py-2 pr-2 text-left font-semibold text-gray-500">Tipo</th>
                                <th className="py-2 pr-2 text-right font-semibold text-gray-500">Base MRR</th>
                                <th className="py-2 pr-2 text-right font-semibold text-gray-500">Base Impl.</th>
                                <th className="py-2 pr-2 text-right font-semibold text-gray-500">Comissão</th>
                                <th className="py-2 pr-3 text-left font-semibold text-gray-500">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rv.comissoes.map((c) => (
                                <tr
                                  key={c.id}
                                  className="cursor-pointer border-t border-gray-100 hover:bg-gray-50"
                                  onClick={() => setComissaoDetalhe(c)}
                                >
                                  <td className="py-2 pl-3 pr-2 font-medium text-gray-800">
                                    <div>{c.venda_cliente ?? "—"}</div>
                                    <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${BADGE_BENEFICIARIO[c.tipo_beneficiario]}`}>
                                      {LABEL_BENEFICIARIO[c.tipo_beneficiario]}
                                    </span>
                                  </td>
                                  <td className="py-2 pr-2 text-gray-500">{c.venda_data ? formatData(c.venda_data) : "—"}</td>
                                  <td className="py-2 pr-2 text-gray-500 capitalize">{c.venda_tipo ?? "—"}</td>
                                  <td className="py-2 pr-2 text-right text-gray-700">{formatMoeda(c.valor_base_mensal)}</td>
                                  <td className="py-2 pr-2 text-right text-gray-700">{formatMoeda(c.valor_base_impl)}</td>
                                  <td className="py-2 pr-2 text-right font-bold text-gray-900">{formatMoeda(c.comissao_total)}</td>
                                  <td className="py-2 pr-3">
                                    <span className={`inline-flex rounded-full px-2 py-0.5 font-semibold ${STATUS_STYLE[c.status] ?? "bg-gray-100 text-gray-500"}`}>
                                      {c.status === "aguardando_liberacao" ? "Aguard." : c.status === "elegivel" ? "Elegível" : c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Detalhe de comissão (drawer simples) */}
      {comissaoDetalhe && (
        <ComissaoDetalheModal comissao={comissaoDetalhe} onClose={() => setComissaoDetalhe(null)} />
      )}
    </div>
  );
}

function ComissaoDetalheModal({ comissao: c, onClose }: { comissao: Comissao; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">Detalhes da Comissão</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">✕</button>
        </div>

        <div className="space-y-3 text-sm">
          <Row label="Cliente"       value={c.venda_cliente ?? "—"} />
          <Row label="Data"          value={c.venda_data ? formatData(c.venda_data) : "—"} />
          <Row label="Tipo venda"    value={c.venda_tipo ?? "—"} />
          <Row label="Serviços"      value={(c.venda_servicos ?? []).join(", ") || "—"} />
          <Row label="Beneficiário"  value={LABEL_BENEFICIARIO[c.tipo_beneficiario] ?? c.tipo_beneficiario} />
          <Row label="Competência"   value={c.competencia ? labelCompetencia(c.competencia) : "—"} />
          <hr className="border-gray-100" />
          <Row label="Base MRR"      value={formatMoeda(c.valor_base_mensal)} />
          <Row label="% MRR"         value={`${c.percentual_mensal}%`} />
          <Row label="Comissão MRR"  value={formatMoeda(c.comissao_mensal)} />
          {c.valor_base_impl > 0 && <>
            <Row label="Base Impl."    value={formatMoeda(c.valor_base_impl)} />
            <Row label="% Impl."       value={`${c.percentual_impl}%`} />
            <Row label="Comissão Impl." value={formatMoeda(c.comissao_impl)} />
          </>}
          <hr className="border-gray-100" />
          <div className="flex items-center justify-between font-bold">
            <span className="text-gray-700">Total</span>
            <span className="text-lg text-folk">{formatMoeda(c.comissao_total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-gray-800">{value}</span>
    </div>
  );
}
