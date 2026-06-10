"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  listarPipeline, formatMoeda,
  STATUS_PIPELINE, TEMPERATURAS, labelStatusPipeline, labelTemperatura,
  type PipelineItem, type StatusPipeline, type Temperatura,
} from "@/lib/comercial";
import { listarVendedores, type Vendedor } from "@/lib/cadastros";
import { Card, Alert } from "@/app/components/ui";

// ── Constantes visuais ──────────────────────────────────────

const STATUS_COR: Record<StatusPipeline, string> = {
  lead_cadastrado:      "#94a3b8",
  apresentacao_empresa: "#60a5fa",
  proposta_analise:     "#f59e0b",
  assembleia_marcada:   "#a78bfa",
  assinatura_contrato:  "#F05A28",
  fechado:              "#059669",
  declinado:            "#ef4444",
};

const MESES_ABREV = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
function labelMes(k: string) {
  const [ano, mes] = k.split("-");
  return `${MESES_ABREV[parseInt(mes) - 1]}/${ano.slice(2)}`;
}

const LABEL = "text-xs font-semibold uppercase tracking-wide text-gray-500";
const INPUT = "rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-folk focus:ring-2 focus:ring-folk/10 w-full";

// ── Sub-componentes ──────────────────────────────────────────

function KPI({ label, value, sub, alerta, cor = "gray" }: {
  label: string; value: string | number; sub?: string; alerta?: boolean;
  cor?: "gray" | "folk" | "green" | "red" | "amber" | "blue" | "purple";
}) {
  const colors = {
    gray:   { card: "border-gray-200 bg-white",         txt: "text-gray-900",    lbl: "text-gray-400" },
    folk:   { card: "border-folk/20 bg-folk/5",         txt: "text-folk",        lbl: "text-folk/60" },
    green:  { card: "border-emerald-200 bg-emerald-50", txt: "text-emerald-700", lbl: "text-emerald-500" },
    red:    { card: "border-red-200 bg-red-50",         txt: "text-red-600",     lbl: "text-red-400" },
    amber:  { card: "border-amber-200 bg-amber-50",     txt: "text-amber-700",   lbl: "text-amber-500" },
    blue:   { card: "border-blue-200 bg-blue-50",       txt: "text-blue-700",    lbl: "text-blue-500" },
    purple: { card: "border-purple-200 bg-purple-50",   txt: "text-purple-700",  lbl: "text-purple-500" },
  }[cor];
  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${colors.card}`}>
      <p className={`text-[10px] font-bold uppercase tracking-wide ${colors.lbl} mb-1`}>{label}</p>
      <p className={`${typeof value === "string" ? "text-lg font-bold leading-tight" : "text-3xl font-black"} ${colors.txt}`}>{alerta && typeof value === "number" && value > 0 ? "⚠ " : ""}{value}</p>
      {sub && <p className={`text-xs mt-0.5 ${colors.lbl}`}>{sub}</p>}
    </div>
  );
}

function BarraH({ label, count, max, cor, pct }: {
  label: string; count: number; max: number; cor: string; pct?: string;
}) {
  const w = max > 0 ? Math.max(3, (count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-40 shrink-0 truncate text-right text-xs text-gray-600" title={label}>{label}</span>
      <div className="h-6 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full transition-all duration-700 flex items-center pl-2"
          style={{ width: `${w}%`, backgroundColor: cor }}>
          {count > 0 && <span className="text-[10px] font-bold text-white">{count}</span>}
        </div>
      </div>
      <span className="w-20 shrink-0 text-right text-xs font-semibold text-gray-600">{pct ?? ""}</span>
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────

export default function DashboardCRMTab() {
  const [pipeline, setPipeline]   = useState<PipelineItem[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro]             = useState<string | null>(null);

  // Filtros
  const hojeStr = new Date().toISOString().slice(0, 10);
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 6); return d.toISOString().slice(0, 10);
  });
  const [dataFim, setDataFim]       = useState(hojeStr);
  const [vendedorId, setVendedorId] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<StatusPipeline | "">("");
  const [temperaturaFiltro, setTemperaturaFiltro] = useState<Temperatura | "">("");

  const carregar = useCallback(async () => {
    setCarregando(true); setErro(null);
    try {
      const [pipe, vends] = await Promise.all([listarPipeline(), listarVendedores({ ativo: true })]);
      setPipeline(pipe); setVendedores(vends);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar.");
    } finally { setCarregando(false); }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // Dados filtrados
  const filtrados = useMemo(() => pipeline.filter(r => {
    if (dataInicio && r.data_inicio_lead < dataInicio) return false;
    if (dataFim    && r.data_inicio_lead > dataFim)    return false;
    if (vendedorId  && r.vendedor_id !== vendedorId)   return false;
    if (statusFiltro && r.status !== statusFiltro)     return false;
    if (temperaturaFiltro && r.temperatura !== temperaturaFiltro) return false;
    return true;
  }), [pipeline, dataInicio, dataFim, vendedorId, statusFiltro, temperaturaFiltro]);

  // ── Cálculos ────────────────────────────────────────────────

  const hoje     = useMemo(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }, []);
  const amanha   = useMemo(() => { const d = new Date(hoje); d.setDate(d.getDate() + 1); return d; }, [hoje]);
  const em7Dias  = useMemo(() => { const d = new Date(hoje); d.setDate(d.getDate() + 7); return d; }, [hoje]);

  const ativos = useMemo(() => filtrados.filter(r => !["fechado", "declinado"].includes(r.status)), [filtrados]);

  const kpis = useMemo(() => ({
    leadsAtivos:         ativos.length,
    mrrPotencial:        ativos.reduce((s, r) => s + r.valor_mensal, 0),
    implantacaoPotencial: ativos.reduce((s, r) => s + r.valor_implantacao, 0),
    acoesAtrasadas: ativos.filter(r => r.proxima_acao_datahora && new Date(r.proxima_acao_datahora) < hoje).length,
    acoesHoje:      ativos.filter(r => {
      if (!r.proxima_acao_datahora) return false;
      const d = new Date(r.proxima_acao_datahora);
      return d >= hoje && d < amanha;
    }).length,
    proximos7Dias: ativos.filter(r => {
      if (!r.proxima_acao_datahora) return false;
      const d = new Date(r.proxima_acao_datahora);
      return d >= amanha && d < em7Dias;
    }).length,
    semProximaAcao: ativos.filter(r => !r.proxima_acao_datahora).length,
  }), [ativos, hoje, amanha, em7Dias]);

  // Funil
  const statusOrdem: StatusPipeline[] = [
    "lead_cadastrado", "apresentacao_empresa", "proposta_analise",
    "assembleia_marcada", "assinatura_contrato", "fechado", "declinado",
  ];

  const funil = useMemo(() => statusOrdem.map((status) => {
    const count = filtrados.filter(r => r.status === status).length;
    const pctConversao = filtrados.length > 0 ? Math.round((count / filtrados.length) * 100) : 0;
    return { status, label: labelStatusPipeline(status), count, cor: STATUS_COR[status], pctConversao };
  }), [filtrados]);

  const maxFunil = useMemo(() => Math.max(...funil.map(f => f.count), 1), [funil]);

  // Novos leads por mês
  const leadsPorMes = useMemo(() => {
    const grupos: Record<string, number> = {};
    filtrados.forEach(r => {
      const m = r.data_inicio_lead.slice(0, 7);
      grupos[m] = (grupos[m] || 0) + 1;
    });
    return Object.entries(grupos).sort(([a], [b]) => a.localeCompare(b)).slice(-12);
  }, [filtrados]);

  const maxLeads = useMemo(() => Math.max(...leadsPorMes.map(([, c]) => c), 1), [leadsPorMes]);

  // Leads por vendedor
  const vendedorStats = useMemo(() => {
    const map: Record<string, {
      nome: string;
      total: number;
      porStatus: Partial<Record<StatusPipeline, number>>;
    }> = {};
    filtrados.forEach(r => {
      const nome = r.vendedor_nome ?? "(Sem vendedor)";
      if (!map[nome]) map[nome] = { nome, total: 0, porStatus: {} };
      map[nome].total++;
      map[nome].porStatus[r.status] = (map[nome].porStatus[r.status] ?? 0) + 1;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filtrados]);

  // Assembleias
  const assembleias = useMemo(() => {
    const agora = new Date();
    const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0);
    const em30 = new Date(agora); em30.setDate(em30.getDate() + 30);

    const comData = filtrados.filter(r => r.data_assembleia);
    return {
      esteMes: comData.filter(r => {
        const d = new Date(r.data_assembleia!);
        return d >= agora && d <= fimMes;
      }),
      proximos30: comData.filter(r => {
        const d = new Date(r.data_assembleia!);
        return d > fimMes && d <= em30;
      }),
      todas: comData,
    };
  }, [filtrados]);

  // ── Render ──────────────────────────────────────────────────

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-folk" />
          <p className="text-sm text-gray-400">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {erro && <Alert status="error" message={erro} />}

      {/* ── Filtros globais ── */}
      <Card className="p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>De</label>
            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className={INPUT} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Até</label>
            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className={INPUT} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Vendedor</label>
            <select value={vendedorId} onChange={e => setVendedorId(e.target.value)} className={INPUT}>
              <option value="">Todos</option>
              {vendedores.map(v => <option key={v.id} value={v.id}>{v.nome}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Status</label>
            <select value={statusFiltro} onChange={e => setStatusFiltro(e.target.value as StatusPipeline | "")} className={INPUT}>
              <option value="">Todos</option>
              {STATUS_PIPELINE.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Temperatura</label>
            <select value={temperaturaFiltro} onChange={e => setTemperaturaFiltro(e.target.value as Temperatura | "")} className={INPUT}>
              <option value="">Todas</option>
              {TEMPERATURAS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-gray-400">{filtrados.length} oportunidade{filtrados.length !== 1 ? "s" : ""} no período</p>
      </Card>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <KPI label="Leads ativos"             value={kpis.leadsAtivos}           cor="folk" />
        <KPI label="MRR Potencial"            value={formatMoeda(kpis.mrrPotencial)}          sub="valor mensal" cor="green" />
        <KPI label="Implantação Potencial"    value={formatMoeda(kpis.implantacaoPotencial)}   sub="soma ativa"   cor="blue" />
        <KPI label="Ações atrasadas"          value={kpis.acoesAtrasadas}        cor={kpis.acoesAtrasadas > 0 ? "red" : "gray"}    alerta />
        <KPI label="Ações para hoje"          value={kpis.acoesHoje}             cor={kpis.acoesHoje > 0 ? "amber" : "gray"} />
        <KPI label="Próximos 7 dias"          value={kpis.proximos7Dias}         cor="blue" />
        <KPI label="Sem próxima ação"         value={kpis.semProximaAcao}        cor={kpis.semProximaAcao > 0 ? "amber" : "gray"} alerta />
      </div>

      {/* ── Linha: Funil + Novos leads por mês ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

        {/* Funil Comercial */}
        <Card className="p-6">
          <h2 className="mb-5 text-sm font-bold text-gray-900">Funil Comercial</h2>
          <div className="flex flex-col gap-2.5">
            {funil.map(({ label, count, cor, pctConversao }) => (
              <BarraH
                key={label}
                label={label}
                count={count}
                max={maxFunil}
                cor={cor}
                pct={filtrados.length > 0 ? `${pctConversao}%` : ""}
              />
            ))}
          </div>
          <p className="mt-3 text-[11px] text-gray-400">% = participação sobre o total de oportunidades no período</p>
        </Card>

        {/* Novos leads por mês */}
        <Card className="p-6">
          <h2 className="mb-5 text-sm font-bold text-gray-900">Novos Leads por Mês</h2>
          {leadsPorMes.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhum dado no período.</p>
          ) : (
            <div className="flex items-end gap-1.5 overflow-x-auto pb-2" style={{ height: 140 }}>
              {leadsPorMes.map(([mes, count]) => {
                const h = maxLeads > 0 ? Math.max(8, (count / maxLeads) * 100) : 8;
                return (
                  <div key={mes} className="flex shrink-0 flex-col items-center gap-1">
                    <span className="text-[10px] font-bold text-gray-700">{count}</span>
                    <div
                      className="w-9 rounded-t-md bg-folk transition-all duration-700"
                      style={{ height: `${h}px` }}
                    />
                    <span className="text-[9px] text-gray-500 whitespace-nowrap">{labelMes(mes)}</span>
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-3 flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm bg-folk" />
            <span className="text-[11px] text-gray-500">Leads pelo data_inicio_lead</span>
          </div>
        </Card>
      </div>

      {/* ── Leads por Vendedor ── */}
      <Card className="p-6">
        <h2 className="mb-5 text-sm font-bold text-gray-900">Leads por Vendedor</h2>
        {vendedorStats.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhum dado no período.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-2 text-left font-semibold uppercase tracking-wide text-gray-400">#</th>
                  <th className="pb-2 text-left font-semibold uppercase tracking-wide text-gray-400">Vendedor</th>
                  <th className="pb-2 text-right font-semibold uppercase tracking-wide text-gray-400">Total</th>
                  <th className="pb-2 text-right font-semibold uppercase tracking-wide text-gray-400">Apresen.</th>
                  <th className="pb-2 text-right font-semibold uppercase tracking-wide text-gray-400">Proposta</th>
                  <th className="pb-2 text-right font-semibold uppercase tracking-wide text-gray-400">Assembleia</th>
                  <th className="pb-2 text-right font-semibold uppercase tracking-wide text-gray-400">Assinatura</th>
                  <th className="pb-2 text-right font-semibold uppercase tracking-wide text-gray-400 text-emerald-600">Fechado</th>
                  <th className="pb-2 text-right font-semibold uppercase tracking-wide text-gray-400 text-red-500">Declinado</th>
                </tr>
              </thead>
              <tbody>
                {vendedorStats.map(({ nome, total, porStatus }, i) => (
                  <tr key={nome} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2.5 pr-3 font-bold text-gray-400">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}º`}
                    </td>
                    <td className="py-2.5 font-semibold text-gray-900">{nome}</td>
                    <td className="py-2.5 text-right font-bold text-gray-900">{total}</td>
                    <td className="py-2.5 text-right text-gray-600">{porStatus.apresentacao_empresa ?? 0}</td>
                    <td className="py-2.5 text-right text-gray-600">{porStatus.proposta_analise ?? 0}</td>
                    <td className="py-2.5 text-right text-purple-600">{porStatus.assembleia_marcada ?? 0}</td>
                    <td className="py-2.5 text-right text-folk">{porStatus.assinatura_contrato ?? 0}</td>
                    <td className="py-2.5 text-right font-semibold text-emerald-600">{porStatus.fechado ?? 0}</td>
                    <td className="py-2.5 text-right text-red-500">{porStatus.declinado ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Assembleias Agendadas ── */}
      <Card className="p-6">
        <h2 className="mb-1 text-sm font-bold text-gray-900">Assembleias Agendadas</h2>
        <p className="mb-5 text-xs text-gray-400">Baseado no campo data_assembleia</p>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {/* Este mês */}
          <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-purple-600 mb-1">Este mês</p>
            <p className="text-3xl font-black text-purple-700">{assembleias.esteMes.length}</p>
          </div>
          {/* Próximos 30 dias */}
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600 mb-1">Próximos 30 dias</p>
            <p className="text-3xl font-black text-blue-700">{assembleias.proximos30.length}</p>
          </div>
          {/* Total com data */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-1">Com data marcada</p>
            <p className="text-3xl font-black text-gray-700">{assembleias.todas.length}</p>
          </div>
        </div>

        {/* Lista das próximas assembleias */}
        {assembleias.esteMes.length + assembleias.proximos30.length > 0 && (
          <div className="mt-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">Próximas assembleias</p>
            <div className="flex flex-col gap-2">
              {[...assembleias.esteMes, ...assembleias.proximos30]
                .sort((a, b) => new Date(a.data_assembleia!).getTime() - new Date(b.data_assembleia!).getTime())
                .slice(0, 10)
                .map(r => (
                  <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-purple-100 bg-white px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 truncate">{r.cliente}</p>
                      {r.vendedor_nome && <p className="text-xs text-gray-400">{r.vendedor_nome}</p>}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-purple-700">
                        {new Date(r.data_assembleia!).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                      </p>
                      <p className="text-xs text-purple-500">
                        {new Date(r.data_assembleia!).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {assembleias.todas.length === 0 && (
          <p className="mt-4 text-sm text-gray-400">Nenhuma assembleia agendada no período.</p>
        )}
      </Card>

      {/* ── Distribuição por temperatura (ativas) ── */}
      <Card className="p-6">
        <h2 className="mb-5 text-sm font-bold text-gray-900">Temperatura das Oportunidades Ativas</h2>
        <div className="flex flex-col gap-2.5">
          {TEMPERATURAS.map(({ value, label }) => {
            const count = ativos.filter(r => r.temperatura === value).length;
            const cor = value === "quente" ? "#f87171" : value === "morna" ? "#fbbf24" : "#93c5fd";
            return (
              <BarraH
                key={value}
                label={label}
                count={count}
                max={ativos.length || 1}
                cor={cor}
                pct={ativos.length > 0 ? `${Math.round((count / ativos.length) * 100)}%` : "0%"}
              />
            );
          })}
        </div>
      </Card>
    </div>
  );
}
