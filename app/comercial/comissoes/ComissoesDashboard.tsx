"use client";

import {
  type ResumoDashboard, type Competencia,
  labelCompetencia, labelStatusCompetencia,
} from "@/lib/comissoes";
import { formatMoeda } from "@/lib/comercial";

function KpiCard({
  label, valor, subtexto, destaque,
}: { label: string; valor: string; subtexto?: string; destaque?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 ${destaque ? "border-folk/30 bg-folk/5" : "border-gray-200 bg-white"}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${destaque ? "text-folk" : "text-gray-900"}`}>{valor}</p>
      {subtexto && <p className="mt-0.5 text-xs text-gray-400">{subtexto}</p>}
    </div>
  );
}

interface Props {
  dashboard:           ResumoDashboard;
  competencias:        Competencia[];
  onIrParaCompetencias: () => void;
}

export default function ComissoesDashboard({ dashboard, competencias, onIrParaCompetencias }: Props) {
  const compAberta = competencias.find((c) => c.competencia === dashboard.competencia_aberta);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label="Aguardando Liberação"
          valor={formatMoeda(dashboard.aguard_liberacao_valor)}
          subtexto={`${dashboard.aguard_liberacao_count} comissão${dashboard.aguard_liberacao_count !== 1 ? "ões" : ""}`}
        />
        <KpiCard
          label="Elegíveis"
          valor={formatMoeda(dashboard.elegiveis_valor)}
          subtexto={`${dashboard.elegiveis_count} comissão${dashboard.elegiveis_count !== 1 ? "ões" : ""}`}
          destaque
        />
        <KpiCard
          label="Aprovadas"
          valor={formatMoeda(dashboard.aprovadas_valor)}
        />
        <KpiCard
          label="Total Pago"
          valor={formatMoeda(dashboard.pagas_total_valor)}
          subtexto={`${dashboard.pagas_total_count} pagas`}
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Competência aberta */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800">Competência em Aberto</h3>
            <button
              onClick={onIrParaCompetencias}
              className="text-xs font-semibold text-folk hover:underline"
            >
              Ver todas →
            </button>
          </div>

          {compAberta ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-gray-900">
                  {labelCompetencia(compAberta.competencia)}
                </span>
                <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                  {labelStatusCompetencia(compAberta.status)}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {new Date(compAberta.data_inicio + "T12:00:00").toLocaleDateString("pt-BR")} –{" "}
                {new Date(compAberta.data_fim    + "T12:00:00").toLocaleDateString("pt-BR")}
              </p>
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="text-center">
                  <p className="text-lg font-bold text-folk">{formatMoeda(dashboard.competencia_valor)}</p>
                  <p className="text-[10px] text-gray-500">Total</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-900">{compAberta.total_vendas ?? 0}</p>
                  <p className="text-[10px] text-gray-500">Vendas</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-900">{compAberta.total_vendedores ?? 0}</p>
                  <p className="text-[10px] text-gray-500">Vendedores</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Nenhuma competência aberta.</p>
          )}
        </div>

        {/* Top vendedores */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-gray-800">Top Vendedores (Geral)</h3>
          {dashboard.top_vendedores.length === 0 ? (
            <p className="text-sm text-gray-400">Sem dados ainda.</p>
          ) : (
            <div className="space-y-2.5">
              {dashboard.top_vendedores.map((v, i) => (
                <div key={v.vendedor_nome} className="flex items-center gap-3">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    i === 0 ? "bg-folk text-white" : "bg-gray-100 text-gray-500"
                  }`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-gray-800">{v.vendedor_nome}</span>
                      <span className="shrink-0 text-sm font-bold text-gray-900">{formatMoeda(v.total)}</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-folk"
                        style={{ width: `${Math.min(100, (v.total / (dashboard.top_vendedores[0]?.total || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Histórico de competências */}
      {competencias.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h3 className="text-sm font-bold text-gray-800">Histórico de Competências</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-100">
                  <th className="py-2.5 pl-5 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Competência</th>
                  <th className="py-2.5 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Período</th>
                  <th className="py-2.5 pr-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Total</th>
                  <th className="py-2.5 pr-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Vendas</th>
                  <th className="py-2.5 pr-5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {competencias.slice(0, 6).map((c) => (
                  <tr key={c.id} className="border-b border-gray-100 last:border-0">
                    <td className="py-3 pl-5 pr-3 font-semibold text-gray-800">{labelCompetencia(c.competencia)}</td>
                    <td className="py-3 pr-3 text-xs text-gray-500">
                      {new Date(c.data_inicio + "T12:00:00").toLocaleDateString("pt-BR")} –{" "}
                      {new Date(c.data_fim    + "T12:00:00").toLocaleDateString("pt-BR")}
                    </td>
                    <td className="py-3 pr-3 text-right font-bold text-gray-900">
                      {formatMoeda(c.total_comissoes ?? 0)}
                    </td>
                    <td className="py-3 pr-3 text-center text-gray-600">{c.total_vendas ?? 0}</td>
                    <td className="py-3 pr-5">
                      <StatusBadge status={c.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const MAP: Record<string, string> = {
    aberta:               "bg-green-100 text-green-700",
    em_conferencia:       "bg-blue-100 text-blue-700",
    aguardando_aprovacao: "bg-yellow-100 text-yellow-700",
    aprovada:             "bg-emerald-100 text-emerald-700",
    enviada_financeiro:   "bg-purple-100 text-purple-700",
    paga:                 "bg-gray-100 text-gray-600",
    fechada:              "bg-gray-100 text-gray-400",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${MAP[status] ?? "bg-gray-100 text-gray-500"}`}>
      {labelStatusCompetencia(status as never)}
    </span>
  );
}
