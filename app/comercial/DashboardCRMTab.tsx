"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  listarPipeline, listarMetas, salvarMeta, formatMoeda,
  STATUS_PIPELINE, TEMPERATURAS, MOTIVOS_PERDA_PIPELINE, labelStatusPipeline,
  type PipelineItem, type StatusPipeline, type Temperatura, type MetaComercial,
} from "@/lib/comercial";
import { listarVendedores, type Vendedor } from "@/lib/cadastros";
import { Card, Alert } from "@/app/components/ui";

// ── Helpers ──────────────────────────────────────────────────

const MESES_ABREV = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const MESES_COMPLETOS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
function labelMes(k: string) {
  const [ano, mes] = k.split("-");
  return `${MESES_ABREV[parseInt(mes) - 1]}/${ano.slice(2)}`;
}

function pct(num: number, den: number) {
  return den > 0 ? Math.round((num / den) * 100) : 0;
}
function diffPct(a: number, b: number) {
  return b > 0 ? Math.round(((a - b) / b) * 100) : null;
}

function calcProbScore(item: PipelineItem): number {
  const stageBase: Record<string, number> = {
    lead_cadastrado: 10, apresentacao_empresa: 25, proposta_analise: 45,
    assembleia_marcada: 65, assinatura_contrato: 85, fechado: 100, declinado: 0,
  };
  const base        = stageBase[item.status] ?? 10;
  const tempMod     = item.temperatura === "quente" ? 15 : item.temperatura === "fria" ? -10 : 0;
  const assembleia  = item.data_assembleia ? 8 : 0;
  const hasAction   = item.proxima_acao_datahora ? 5 : 0;
  const hojeD       = new Date(); hojeD.setHours(0,0,0,0);
  const overdue     = item.proxima_acao_datahora && new Date(item.proxima_acao_datahora) < hojeD ? -12 : 0;
  const ref         = item.ultima_interacao ?? item.created_at;
  const diasSem     = ref ? Math.floor((Date.now() - new Date(ref).getTime()) / 86400000) : 30;
  const inact       = diasSem > 30 ? -25 : diasSem > 15 ? -15 : diasSem > 7 ? -8 : 0;
  return Math.min(99, Math.max(1, Math.round(base + tempMod + assembleia + hasAction + overdue + inact)));
}

const LABEL = "text-xs font-semibold uppercase tracking-wide text-gray-500";
const INPUT = "rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-folk focus:ring-2 focus:ring-folk/10 w-full";

const STATUS_COR: Record<StatusPipeline, string> = {
  lead_cadastrado: "#94a3b8", apresentacao_empresa: "#60a5fa",
  proposta_analise: "#f59e0b", assembleia_marcada: "#a78bfa",
  assinatura_contrato: "#F05A28", fechado: "#059669", declinado: "#ef4444",
};

const STATUS_ORDEM: StatusPipeline[] = [
  "lead_cadastrado","apresentacao_empresa","proposta_analise",
  "assembleia_marcada","assinatura_contrato","fechado","declinado",
];

// ── Sub-componentes ──────────────────────────────────────────

type Cor = "gray"|"folk"|"green"|"red"|"amber"|"blue"|"purple"|"orange";
const COR_MAP: Record<Cor, { card: string; txt: string; lbl: string }> = {
  gray:   { card:"border-gray-200 bg-white",         txt:"text-gray-900",    lbl:"text-gray-400" },
  folk:   { card:"border-folk/20 bg-folk/5",         txt:"text-folk",        lbl:"text-folk/60" },
  green:  { card:"border-emerald-200 bg-emerald-50", txt:"text-emerald-700", lbl:"text-emerald-500" },
  red:    { card:"border-red-200 bg-red-50",         txt:"text-red-600",     lbl:"text-red-400" },
  amber:  { card:"border-amber-200 bg-amber-50",     txt:"text-amber-700",   lbl:"text-amber-500" },
  blue:   { card:"border-blue-200 bg-blue-50",       txt:"text-blue-700",    lbl:"text-blue-500" },
  purple: { card:"border-purple-200 bg-purple-50",   txt:"text-purple-700",  lbl:"text-purple-500" },
  orange: { card:"border-orange-200 bg-orange-50",   txt:"text-orange-700",  lbl:"text-orange-500" },
};

function DeltaLine({ diff, p, label, moeda }: { diff: number; p: number|null; label: string; moeda?: boolean }) {
  if (diff === 0 && p === null) return <p className="text-[10px] text-gray-300 leading-snug">—</p>;
  const up = diff > 0;
  const cls = up ? "text-emerald-600" : "text-red-500";
  const icon = up ? "↑" : "↓";
  const val = moeda ? formatMoeda(Math.abs(diff)) : String(Math.abs(diff));
  const pctStr = p !== null ? ` (${Math.abs(p)}%)` : "";
  return (
    <p className={`text-[10px] font-semibold break-words whitespace-normal [line-height:1.4] ${cls}`}>
      {icon} {up && !moeda ? "+" : ""}{val}{pctStr}{" "}
      <span className="font-normal text-gray-400">{label}</span>
    </p>
  );
}

function KPI({ label, value, sub, alerta, cor="gray", deltaSemana, deltaMes }: {
  label: string; value: string|number; sub?: string; alerta?: boolean; cor?: Cor;
  deltaSemana?: { diff: number; p: number|null; moeda?: boolean }|null;
  deltaMes?:    { diff: number; p: number|null; moeda?: boolean }|null;
}) {
  const { card, txt, lbl } = COR_MAP[cor];
  return (
    <div className={`rounded-2xl border p-4 shadow-sm flex flex-col min-h-[180px] justify-between ${card}`}>
      <div>
        <p className={`text-[10px] font-bold uppercase tracking-wide ${lbl} mb-1`}>{label}</p>
        <p className={`${typeof value === "string" ? "text-sm font-bold leading-tight break-words" : "text-2xl font-black"} ${txt} mb-1`}>
          {alerta && typeof value === "number" && value > 0 ? "⚠ " : ""}{value}
        </p>
        {sub && <p className={`text-[10px] ${lbl} leading-snug`}>{sub}</p>}
      </div>
      <div className="pt-2 flex flex-col gap-1 border-t border-black/5 mt-3">
        {deltaSemana != null && <DeltaLine {...deltaSemana} label="vs semana ant." />}
        {deltaMes    != null && <DeltaLine {...deltaMes}    label="vs mês ant." />}
        {deltaSemana == null && deltaMes == null && <p className="text-[10px] text-gray-300">—</p>}
      </div>
    </div>
  );
}

function BarraH({ label, count, max, cor, extra }: {
  label: string; count: number; max: number; cor: string; extra?: string;
}) {
  const w = max > 0 ? Math.max(3, (count/max)*100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-44 shrink-0 truncate text-right text-xs text-gray-600" title={label}>{label}</span>
      <div className="h-6 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full transition-all duration-700 flex items-center pl-2"
          style={{ width:`${w}%`, backgroundColor:cor }}>
          {count > 0 && <span className="text-[10px] font-bold text-white">{count}</span>}
        </div>
      </div>
      <span className="w-20 shrink-0 text-right text-xs font-semibold text-gray-600">{extra??""}</span>
    </div>
  );
}

function BarraProg({ pct: p, cor, label }: { pct: number; cor: string; label?: string }) {
  const clamp = Math.min(p, 100);
  return (
    <div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full transition-all duration-700" style={{ width:`${clamp}%`, backgroundColor:cor }} />
      </div>
      {label && <p className="mt-0.5 text-[10px] text-gray-500">{label}</p>}
    </div>
  );
}

function Secao({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-bold text-gray-900 mb-5">{children}</h2>;
}

// ── Componente principal ─────────────────────────────────────

export default function DashboardCRMTab() {
  const [pipeline, setPipeline]     = useState<PipelineItem[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [metas, setMetas]           = useState<MetaComercial[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro]             = useState<string|null>(null);

  const hojeStr = new Date().toISOString().slice(0,10);
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth()-6); return d.toISOString().slice(0,10);
  });
  const [dataFim, setDataFim]             = useState(hojeStr);
  const [vendedorId, setVendedorId]       = useState("");
  const [statusFiltro, setStatusFiltro]   = useState<StatusPipeline|"">("");
  const [temperaturaFiltro, setTemperaturaFiltro] = useState<Temperatura|"">("");

  // Modal de meta
  const [modalMeta, setModalMeta] = useState<{
    aberto: boolean; meta_contratos: string; meta_mrr: string; meta_implantacao: string; salvando: boolean; erro: string|null;
  }>({ aberto: false, meta_contratos: "", meta_mrr: "", meta_implantacao: "", salvando: false, erro: null });

  const carregar = useCallback(async () => {
    setCarregando(true); setErro(null);
    try {
      const [pipe, vends, ms] = await Promise.all([
        listarPipeline(), listarVendedores({ ativo: true }), listarMetas().catch(() => []),
      ]);
      setPipeline(pipe); setVendedores(vends); setMetas(ms);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar.");
    } finally { setCarregando(false); }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // ── Janelas de tempo ──────────────────────────────────────

  const hoje = useMemo(() => {
    const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }, []);
  const amanha  = useMemo(() => { const d = new Date(hoje); d.setDate(d.getDate()+1); return d; }, [hoje]);
  const em7Dias = useMemo(() => { const d = new Date(hoje); d.setDate(d.getDate()+7); return d; }, [hoje]);
  const inicioSemAtual  = useMemo(() => { const d = new Date(hoje); d.setDate(d.getDate()-7);  return d; }, [hoje]);
  const inicioSemAnt    = useMemo(() => { const d = new Date(hoje); d.setDate(d.getDate()-14); return d; }, [hoje]);
  const inicioMesAtual  = useMemo(() => new Date(hoje.getFullYear(), hoje.getMonth(), 1), [hoje]);
  const inicioMesAnt    = useMemo(() => new Date(hoje.getFullYear(), hoje.getMonth()-1, 1), [hoje]);

  // ── Datasets ──────────────────────────────────────────────

  const base = useMemo(() => pipeline.filter(r => {
    if (vendedorId        && r.vendedor_id !== vendedorId)        return false;
    if (statusFiltro      && r.status !== statusFiltro)           return false;
    if (temperaturaFiltro && r.temperatura !== temperaturaFiltro) return false;
    return true;
  }), [pipeline, vendedorId, statusFiltro, temperaturaFiltro]);

  const filtrados = useMemo(() => base.filter(r =>
    (!dataInicio || r.data_inicio_lead >= dataInicio) &&
    (!dataFim    || r.data_inicio_lead <= dataFim)
  ), [base, dataInicio, dataFim]);

  const ativosBase = useMemo(() => base.filter(r => !["fechado","declinado"].includes(r.status)), [base]);

  // Comparativos
  const semAtual  = useMemo(() => base.filter(r => { const d = new Date(r.data_inicio_lead); return d >= inicioSemAtual && d <= hoje; }), [base, inicioSemAtual, hoje]);
  const semAnt    = useMemo(() => base.filter(r => { const d = new Date(r.data_inicio_lead); return d >= inicioSemAnt && d < inicioSemAtual; }), [base, inicioSemAnt, inicioSemAtual]);
  const mesAtual  = useMemo(() => base.filter(r => { const d = new Date(r.data_inicio_lead); return d >= inicioMesAtual && d <= hoje; }), [base, inicioMesAtual, hoje]);
  const mesAnt    = useMemo(() => base.filter(r => { const d = new Date(r.data_inicio_lead); return d >= inicioMesAnt && d < inicioMesAtual; }), [base, inicioMesAnt, inicioMesAtual]);

  const ativosSemAtual = useMemo(() => semAtual.filter(r => !["fechado","declinado"].includes(r.status)), [semAtual]);
  const ativosSemAnt   = useMemo(() => semAnt.filter(r =>   !["fechado","declinado"].includes(r.status)), [semAnt]);
  const ativosMesAtual = useMemo(() => mesAtual.filter(r =>  !["fechado","declinado"].includes(r.status)), [mesAtual]);
  const ativosMesAnt   = useMemo(() => mesAnt.filter(r =>    !["fechado","declinado"].includes(r.status)), [mesAnt]);

  // ── Meta do mês atual ─────────────────────────────────────

  const metaMes = useMemo(() => {
    const ano = hoje.getFullYear(), mes = hoje.getMonth() + 1;
    return metas.find(m => m.ano === ano && m.mes === mes) ?? null;
  }, [metas, hoje]);

  const realizadoMes = useMemo(() => {
    const inicio = inicioMesAtual.toISOString().slice(0,10);
    const fechadosMes = base.filter(r => r.status === "fechado" && r.ultima_interacao && r.ultima_interacao.slice(0,10) >= inicio);
    return {
      contratos:   fechadosMes.length,
      mrr:         fechadosMes.reduce((s,r) => s + r.valor_mensal, 0),
      implantacao: fechadosMes.reduce((s,r) => s + r.valor_implantacao, 0),
    };
  }, [base, inicioMesAtual]);

  // ── KPIs ─────────────────────────────────────────────────

  const kpis = useMemo(() => {
    const total      = ativosBase.length;
    const mrr        = ativosBase.reduce((s,r) => s + r.valor_mensal, 0);
    const impl       = ativosBase.reduce((s,r) => s + r.valor_implantacao, 0);
    const atrasadas  = ativosBase.filter(r => r.proxima_acao_datahora && new Date(r.proxima_acao_datahora) < hoje).length;
    const acoesHoje  = ativosBase.filter(r => {
      if (!r.proxima_acao_datahora) return false;
      const d = new Date(r.proxima_acao_datahora); return d >= hoje && d < amanha;
    }).length;
    const proxSemana = ativosBase.filter(r => {
      if (!r.proxima_acao_datahora) return false;
      const d = new Date(r.proxima_acao_datahora); return d >= amanha && d < em7Dias;
    }).length;
    const semAcao = ativosBase.filter(r => !r.proxima_acao_datahora).length;

    const mrrSemA = ativosSemAtual.reduce((s,r)=>s+r.valor_mensal,0);
    const mrrSemB = ativosSemAnt.reduce((s,r)=>s+r.valor_mensal,0);
    const mrrMesA = ativosMesAtual.reduce((s,r)=>s+r.valor_mensal,0);
    const mrrMesB = ativosMesAnt.reduce((s,r)=>s+r.valor_mensal,0);
    const implSemA = ativosSemAtual.reduce((s,r)=>s+r.valor_implantacao,0);
    const implSemB = ativosSemAnt.reduce((s,r)=>s+r.valor_implantacao,0);
    const implMesA = ativosMesAtual.reduce((s,r)=>s+r.valor_implantacao,0);
    const implMesB = ativosMesAnt.reduce((s,r)=>s+r.valor_implantacao,0);

    return {
      total, mrr, impl, atrasadas, acoesHoje, proxSemana, semAcao,
      deltaTotalSem: { diff: ativosSemAtual.length - ativosSemAnt.length, p: diffPct(ativosSemAtual.length, ativosSemAnt.length) },
      deltaTotalMes: { diff: ativosMesAtual.length - ativosMesAnt.length, p: diffPct(ativosMesAtual.length, ativosMesAnt.length) },
      deltaMrrSem:   { diff: mrrSemA - mrrSemB, p: diffPct(mrrSemA, mrrSemB),   moeda: true as const },
      deltaMrrMes:   { diff: mrrMesA - mrrMesB, p: diffPct(mrrMesA, mrrMesB),   moeda: true as const },
      deltaImplSem:  { diff: implSemA - implSemB, p: diffPct(implSemA, implSemB), moeda: true as const },
      deltaImplMes:  { diff: implMesA - implMesB, p: diffPct(implMesA, implMesB), moeda: true as const },
    };
  }, [ativosBase, ativosSemAtual, ativosSemAnt, ativosMesAtual, ativosMesAnt, hoje, amanha, em7Dias]);

  // ── Receita Prevista ──────────────────────────────────────

  const receitaPrevista = useMemo(() => {
    const historico = base.filter(r => !["lead_cadastrado"].includes(r.status));
    const taxaConversao = pct(historico.filter(r => r.status === "fechado").length, historico.length) / 100;
    const prevista = kpis.mrr * (taxaConversao || 0.15);
    const mrrMesAntCalc = ativosMesAnt.reduce((s,r)=>s+r.valor_mensal,0);
    const previstaMesAnt = mrrMesAntCalc * (taxaConversao || 0.15);
    return {
      taxaConversao: Math.round(taxaConversao * 100),
      mrr: kpis.mrr,
      prevista,
      deltaMes: { diff: prevista - previstaMesAnt, p: diffPct(prevista, previstaMesAnt), moeda: true as const },
    };
  }, [base, kpis.mrr, ativosMesAnt]);

  // ── Saúde do pipeline ─────────────────────────────────────

  const saude = useMemo(() => {
    const total = ativosBase.length;
    if (total === 0) return { score: 100, label: "Excelente", cor: "green" as Cor, semAcao: 0, atrasadas: 0, semInteracao: 0 };
    const semAcao    = ativosBase.filter(r => !r.proxima_acao_datahora).length;
    const atrasadas  = ativosBase.filter(r => r.proxima_acao_datahora && new Date(r.proxima_acao_datahora) < hoje).length;
    const semInteracao = ativosBase.filter(r => {
      const ref = r.ultima_interacao ?? r.created_at;
      return !ref || (hoje.getTime() - new Date(ref).getTime()) / 86400000 > 7;
    }).length;
    const pen = Math.min(100, (semAcao/total)*40 + (atrasadas/total)*35 + (semInteracao/total)*25);
    const score = Math.max(0, Math.round(100 - pen));
    let label: string; let cor: Cor;
    if (score >= 90) { label="Excelente"; cor="green"; }
    else if (score >= 75) { label="Boa"; cor="blue"; }
    else if (score >= 60) { label="Atenção"; cor="amber"; }
    else                  { label="Crítica"; cor="red"; }
    return { score, label, cor, semAcao, atrasadas, semInteracao };
  }, [ativosBase, hoje]);

  // ── Aging do pipeline ─────────────────────────────────────

  const aging = useMemo(() => {
    const FAIXAS = [
      { label:"0–15 dias",  min:0,  max:15  },
      { label:"16–30 dias", min:16, max:30  },
      { label:"31–60 dias", min:31, max:60  },
      { label:"61–90 dias", min:61, max:90  },
      { label:"90+ dias",   min:91, max:9999},
    ];
    const agora = hoje.getTime();
    const comDias = ativosBase.map(r => ({
      ...r,
      dias: Math.floor((agora - new Date(r.data_inicio_lead).getTime()) / 86400000),
    }));
    const faixas = FAIXAS.map(f => ({
      label: f.label,
      count: comDias.filter(r => r.dias >= f.min && r.dias <= f.max).length,
    }));
    const velhas60  = comDias.filter(r => r.dias > 60).sort((a,b)=>b.dias-a.dias);
    const velhas90  = comDias.filter(r => r.dias > 90);
    return { faixas, velhas60, velhas90, maxFaixa: Math.max(...faixas.map(f=>f.count), 1) };
  }, [ativosBase, hoje]);

  // ── Funil ─────────────────────────────────────────────────

  const funil = useMemo(() => STATUS_ORDEM.map(status => {
    const count = filtrados.filter(r => r.status === status).length;
    return { status, label: labelStatusPipeline(status), count,
      cor: STATUS_COR[status], pctTotal: filtrados.length > 0 ? Math.round((count/filtrados.length)*100) : 0 };
  }), [filtrados]);
  const maxFunil = useMemo(() => Math.max(...funil.map(f=>f.count), 1), [funil]);

  // ── Funil de perdas ───────────────────────────────────────

  const funilPerdas = useMemo(() => {
    const total      = filtrados.length;
    const ativos     = filtrados.filter(r => !["fechado","declinado"].includes(r.status)).length;
    const propostas  = filtrados.filter(r => ["proposta_analise","assembleia_marcada","assinatura_contrato"].includes(r.status)).length;
    const contratos  = filtrados.filter(r => r.status === "fechado").length;
    const declinados = filtrados.filter(r => r.status === "declinado").length;
    return [
      { label:`${total} Leads`,                      count: total,      cor:"bg-slate-400" },
      { label:`${ativos} Oportunidades Ativas`,       count: ativos,     cor:"bg-blue-400" },
      { label:`${propostas} Propostas`,               count: propostas,  cor:"bg-amber-400" },
      { label:`${contratos} Contratos`,               count: contratos,  cor:"bg-emerald-500" },
      { label:`${declinados} Declinadas`,             count: declinados, cor:"bg-red-400" },
    ];
  }, [filtrados]);

  // ── Conversão ─────────────────────────────────────────────

  const conversao = useMemo(() => {
    const total    = filtrados.length;
    const fechados = filtrados.filter(r => r.status === "fechado").length;
    const etapas = [
      { de:"lead_cadastrado", para:"apresentacao_empresa", label:"Lead → Apresentação" },
      { de:"apresentacao_empresa", para:"proposta_analise", label:"Apresentação → Proposta" },
      { de:"proposta_analise", para:"assembleia_marcada", label:"Proposta → Assembleia" },
      { de:"assembleia_marcada", para:"assinatura_contrato", label:"Assembleia → Contrato" },
      { de:"assinatura_contrato", para:"fechado", label:"Contrato → Fechado" },
    ].map(({ de, para, label }) => {
      const iDe   = STATUS_ORDEM.indexOf(de as StatusPipeline);
      const iPara = STATUS_ORDEM.indexOf(para as StatusPipeline);
      const qDe   = STATUS_ORDEM.slice(iDe).reduce((s,st) => s + filtrados.filter(r=>r.status===st).length, 0);
      const qPara = STATUS_ORDEM.slice(iPara).reduce((s,st) => s + filtrados.filter(r=>r.status===st).length, 0);
      return { label, taxa: pct(qPara, qDe), qtdDe: qDe };
    });
    return { total, fechados, taxaGeral: pct(fechados, total), etapas };
  }, [filtrados]);

  // ── Motivos de perda ──────────────────────────────────────

  const motivosPerda = useMemo(() => {
    const declinados = filtrados.filter(r => r.status === "declinado");
    const total = declinados.length;
    const contagem: Record<string, number> = {};
    declinados.forEach(r => {
      const m = r.motivo_perda_categoria ?? "Não informado";
      contagem[m] = (contagem[m] ?? 0) + 1;
    });
    const lista = Object.entries(contagem)
      .map(([motivo, count]) => ({ motivo, count, pct: pct(count, total) }))
      .sort((a,b) => b.count - a.count);
    const top2Pct = lista.slice(0,2).reduce((s,m) => s + m.pct, 0);
    return { lista, total, top2Pct, top2: lista.slice(0,2).map(m=>m.motivo) };
  }, [filtrados]);

  // ── Forecast ──────────────────────────────────────────────

  const forecast = useMemo(() => {
    const DIAS_ETAPA: Record<string, number> = {
      lead_cadastrado: 90, apresentacao_empresa: 60, proposta_analise: 45,
      assembleia_marcada: 30, assinatura_contrato: 15,
    };
    const grupos: Record<string, { count: number; mrr: number; prob: number }> = {};

    ativosBase.forEach(r => {
      const score = calcProbScore(r) / 100;
      if (score < 0.2) return;
      let closingDate: Date;
      if (r.data_assembleia && ["assembleia_marcada","proposta_analise"].includes(r.status)) {
        closingDate = new Date(r.data_assembleia);
        closingDate.setDate(closingDate.getDate() + 20);
      } else if (r.proxima_acao_datahora && score > 0.5) {
        closingDate = new Date(r.proxima_acao_datahora);
        closingDate.setDate(closingDate.getDate() + Math.floor((DIAS_ETAPA[r.status] ?? 60) * 0.4));
      } else {
        closingDate = new Date(hoje);
        closingDate.setDate(closingDate.getDate() + (DIAS_ETAPA[r.status] ?? 60));
      }
      const mes = closingDate.toISOString().slice(0,7);
      if (!grupos[mes]) grupos[mes] = { count: 0, mrr: 0, prob: 0 };
      grupos[mes].count += score;
      grupos[mes].mrr   += r.valor_mensal * score;
      grupos[mes].prob  += score;
    });

    return Object.entries(grupos)
      .filter(([mes]) => mes >= hoje.toISOString().slice(0,7))
      .sort(([a],[b]) => a.localeCompare(b))
      .slice(0,4)
      .map(([mes, v]) => ({
        mes, label: labelMes(mes),
        contratos: Math.round(v.count),
        mrr: Math.round(v.mrr),
      }));
  }, [ativosBase, hoje]);

  // ── Velocidade ────────────────────────────────────────────

  const velocidade = useMemo(() => {
    const durMap: Record<StatusPipeline, number[]> = {} as Record<StatusPipeline, number[]>;
    STATUS_ORDEM.forEach(s => durMap[s] = []);
    filtrados.forEach(r => {
      const ref = r.ultima_interacao ?? r.created_at;
      if (!ref) return;
      const dias = Math.round((new Date(ref).getTime() - new Date(r.data_inicio_lead).getTime()) / 86400000);
      if (dias >= 0 && dias < 730) durMap[r.status].push(dias);
    });
    return STATUS_ORDEM.filter(s => s!=="fechado" && s!=="declinado").map(s => {
      const vals = durMap[s];
      const media = vals.length > 0 ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length) : null;
      return { label: labelStatusPipeline(s), cor: STATUS_COR[s], media, qtd: vals.length };
    }).filter(s => s.qtd > 0);
  }, [filtrados]);

  const gargalo = useMemo(() =>
    velocidade.filter(e => e.media!==null).reduce<typeof velocidade[0]|null>(
      (mx,e) => (!mx || e.media! > mx.media!) ? e : mx, null
    )
  , [velocidade]);

  // ── Evolução ──────────────────────────────────────────────

  const evolucaoPorMes = useMemo(() => {
    const grupos: Record<string,{ count:number; mrr:number; impl:number }> = {};
    base.forEach(r => {
      const m = r.data_inicio_lead.slice(0,7);
      if (!grupos[m]) grupos[m] = { count:0, mrr:0, impl:0 };
      grupos[m].count++; grupos[m].mrr += r.valor_mensal; grupos[m].impl += r.valor_implantacao;
    });
    return Object.entries(grupos).sort(([a],[b])=>a.localeCompare(b)).slice(-12);
  }, [base]);
  const maxLeads = useMemo(() => Math.max(...evolucaoPorMes.map(([,v])=>v.count),1), [evolucaoPorMes]);

  // ── Vendedor stats ────────────────────────────────────────

  const vendedorStats = useMemo(() => {
    type VS = { nome:string; total:number; ativos:number; fechados:number; mrr:number;
      mrrSemA:number; mrrSemB:number; porStatus:Partial<Record<StatusPipeline,number>>; };
    const map: Record<string, VS> = {};
    base.forEach(r => {
      const nome = r.vendedor_nome ?? "(Sem vendedor)";
      if (!map[nome]) map[nome] = { nome, total:0, ativos:0, fechados:0, mrr:0, mrrSemA:0, mrrSemB:0, porStatus:{} };
      const v = map[nome]; v.total++;
      v.porStatus[r.status] = (v.porStatus[r.status]??0)+1;
      if (!["fechado","declinado"].includes(r.status)) { v.ativos++; v.mrr += r.valor_mensal; }
      if (r.status === "fechado") v.fechados++;
      const d = new Date(r.data_inicio_lead);
      if (d >= inicioSemAtual && d <= hoje && !["fechado","declinado"].includes(r.status)) v.mrrSemA += r.valor_mensal;
      if (d >= inicioSemAnt && d < inicioSemAtual && !["fechado","declinado"].includes(r.status)) v.mrrSemB += r.valor_mensal;
    });
    return Object.values(map).sort((a,b)=>b.ativos-a.ativos).map(v => ({
      ...v,
      taxaConversao: pct(v.fechados, v.total),
      crescimento: v.mrrSemB > 0 ? Math.round(((v.mrrSemA-v.mrrSemB)/v.mrrSemB)*100) : v.mrrSemA > 0 ? 100 : 0,
    }));
  }, [base, inicioSemAtual, inicioSemAnt, hoje]);

  // ── Ranking ───────────────────────────────────────────────

  const ranking = useMemo(() => {
    const mrrMax = Math.max(...vendedorStats.map(v=>v.mrr),1);
    return vendedorStats.filter(v=>v.total>0).map(v => ({
      ...v,
      score: Math.round(Math.min(40,v.ativos*2)+Math.min(30,v.fechados*5)+(v.taxaConversao/100)*20+(v.mrr/mrrMax)*10),
    })).sort((a,b)=>b.score-a.score).slice(0,10);
  }, [vendedorStats]);

  // ── Assembleias ───────────────────────────────────────────

  const assembleias = useMemo(() => {
    const agora=new Date(), fimMes=new Date(agora.getFullYear(),agora.getMonth()+1,0);
    const em30=new Date(agora); em30.setDate(em30.getDate()+30);
    const comData = filtrados.filter(r=>r.data_assembleia);
    return {
      esteMes: comData.filter(r=>{ const d=new Date(r.data_assembleia!); return d>=agora&&d<=fimMes; }),
      proximos30: comData.filter(r=>{ const d=new Date(r.data_assembleia!); return d>fimMes&&d<=em30; }),
      todas: comData,
    };
  }, [filtrados]);

  // ── Score de probabilidade (top/bottom) ───────────────────

  const scoreList = useMemo(() => {
    return ativosBase
      .map(r => ({ ...r, score: calcProbScore(r) }))
      .sort((a,b) => b.score - a.score);
  }, [ativosBase]);

  // ── Alertas ───────────────────────────────────────────────

  const alertas = useMemo(() => {
    const lista: { tipo:"red"|"yellow"|"green"; msg:string }[] = [];
    const { semAcao, atrasadas, semInteracao } = saude;
    if (atrasadas > 0) lista.push({ tipo:"red",    msg:`${atrasadas} ação${atrasadas!==1?"ões":"" } atrasada${atrasadas!==1?"s":"" }.` });
    if (semAcao   > 0) lista.push({ tipo:"red",    msg:`${semAcao} oportunidade${semAcao!==1?"s":""} sem próxima ação.` });
    if (aging.velhas60.length > 0) lista.push({ tipo:"yellow", msg:`${aging.velhas60.length} oportunidade${aging.velhas60.length!==1?"s":""} com mais de 60 dias.` });
    if (aging.velhas90.length > 0) lista.push({ tipo:"yellow", msg:`${aging.velhas90.length} oportunidade${aging.velhas90.length!==1?"s":""} com mais de 90 dias.` });
    if (semInteracao > 0) lista.push({ tipo:"yellow", msg:`${semInteracao} oportunidade${semInteracao!==1?"s":""} sem atualização há mais de 7 dias.` });
    if (motivosPerda.top2.length >= 2 && motivosPerda.top2Pct >= 50)
      lista.push({ tipo:"yellow", msg:`${motivosPerda.top2Pct}% das perdas por "${motivosPerda.top2[0]}" e "${motivosPerda.top2[1]}". Revisar posicionamento comercial.` });
    const maxEtapa = funil.filter(f=>!["fechado","declinado"].includes(f.status)).sort((a,b)=>b.count-a.count)[0];
    if (maxEtapa && filtrados.length>0 && maxEtapa.pctTotal>40)
      lista.push({ tipo:"yellow", msg:`"${maxEtapa.label}" concentra ${maxEtapa.pctTotal}% do pipeline.` });
    if (atrasadas===0 && semAcao===0) lista.push({ tipo:"green", msg:"Todas as oportunidades ativas têm próxima ação definida." });
    return lista;
  }, [saude, aging, motivosPerda, funil, filtrados]);

  // ── Resumo Inteligente ────────────────────────────────────

  const resumo = useMemo(() => {
    const frases: string[] = [];
    const tA = ativosMesAtual.length, tB = ativosMesAnt.length;
    if (tA>0 && tB>0) {
      const p = Math.round(((tA-tB)/tB)*100);
      if (p>0) frases.push(`📈 O pipeline cresceu ${p}% em relação ao mês anterior.`);
      else if (p<0) frases.push(`📉 O pipeline caiu ${Math.abs(p)}% em relação ao mês anterior.`);
    }
    const mrrA = ativosMesAtual.reduce((s,r)=>s+r.valor_mensal,0);
    const mrrB = ativosMesAnt.reduce((s,r)=>s+r.valor_mensal,0);
    if (mrrA>mrrB && mrrB>0) frases.push(`📈 O MRR potencial cresceu ${Math.round(((mrrA-mrrB)/mrrB)*100)}% (${formatMoeda(mrrA-mrrB)}).`);
    else if (mrrB>mrrA && mrrB>0) frases.push(`📉 O MRR potencial caiu ${Math.round(((mrrB-mrrA)/mrrB)*100)}% (${formatMoeda(mrrB-mrrA)}).`);
    if (mesAtual.length>0) frases.push(`📈 Foram adicionados ${mesAtual.length} lead${mesAtual.length!==1?"s":""} neste mês.`);
    if (aging.velhas60.length>0) frases.push(`⚠️ ${aging.velhas60.length} oportunidade${aging.velhas60.length!==1?"s":""} com mais de 60 dias no pipeline.`);
    if (motivosPerda.top2.length>0 && motivosPerda.top2Pct>=50)
      frases.push(`⚠️ ${motivosPerda.top2Pct}% das perdas por "${motivosPerda.top2[0]}"${motivosPerda.top2[1] ? ` e "${motivosPerda.top2[1]}"` : ""}.`);
    if (ranking.length>0 && !vendedorId && ranking[0].nome!=="(Sem vendedor)")
      frases.push(`🏆 ${ranking[0].nome} lidera o ranking com score ${ranking[0].score}.`);
    const totalAss = assembleias.esteMes.length + assembleias.proximos30.length;
    if (totalAss>0) frases.push(`📅 ${totalAss===1?"Há 1 assembleia agendada":`Há ${totalAss} assembleias agendadas`} nos próximos 30 dias.`);
    if (forecast.length>0) {
      const total3m = forecast.slice(0,3).reduce((s,f)=>s+f.mrr,0);
      if (total3m>0) frases.push(`💰 Receita prevista para o próximo trimestre: ${formatMoeda(total3m)} em MRR.`);
    }
    if (gargalo && gargalo.media!==null && gargalo.media>14)
      frases.push(`🔍 Gargalo em "${gargalo.label}" com tempo médio de ${gargalo.media} dias.`);
    return frases;
  }, [ativosMesAtual, ativosMesAnt, mesAtual, aging, motivosPerda, ranking, vendedorId, assembleias, forecast, gargalo]);

  // ── Salvar Meta ───────────────────────────────────────────

  async function handleSalvarMeta() {
    const mc = parseFloat(modalMeta.meta_contratos)||0;
    const mm = parseFloat(modalMeta.meta_mrr)||0;
    const mi = parseFloat(modalMeta.meta_implantacao)||0;
    if (mc<=0 && mm<=0 && mi<=0) {
      setModalMeta(p=>({...p, erro:"Preencha ao menos uma meta."})); return;
    }
    setModalMeta(p=>({...p, salvando:true, erro:null}));
    try {
      const saved = await salvarMeta({ ano: hoje.getFullYear(), mes: hoje.getMonth()+1, meta_contratos:mc, meta_mrr:mm, meta_implantacao:mi });
      setMetas(prev => { const idx=prev.findIndex(m=>m.id===saved.id); return idx>=0 ? prev.map((m,i)=>i===idx?saved:m) : [...prev, saved]; });
      setModalMeta({ aberto:false, meta_contratos:"", meta_mrr:"", meta_implantacao:"", salvando:false, erro:null });
    } catch(e) {
      setModalMeta(p=>({...p, salvando:false, erro:e instanceof Error?e.message:"Erro ao salvar."}));
    }
  }

  // ── Render ───────────────────────────────────────────────

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

  const anoAtual = hoje.getFullYear();
  const mesAtualNum = hoje.getMonth();

  return (
    <div className="flex flex-col gap-6">
      {erro && <Alert status="error" message={erro} />}

      {/* ── Filtros ── */}
      <Card className="p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>De</label>
            <input type="date" value={dataInicio} onChange={e=>setDataInicio(e.target.value)} className={INPUT} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Até</label>
            <input type="date" value={dataFim} onChange={e=>setDataFim(e.target.value)} className={INPUT} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Vendedor</label>
            <select value={vendedorId} onChange={e=>setVendedorId(e.target.value)} className={INPUT}>
              <option value="">Todos</option>
              {vendedores.map(v=><option key={v.id} value={v.id}>{v.nome}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Status</label>
            <select value={statusFiltro} onChange={e=>setStatusFiltro(e.target.value as StatusPipeline|"")} className={INPUT}>
              <option value="">Todos</option>
              {STATUS_PIPELINE.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Temperatura</label>
            <select value={temperaturaFiltro} onChange={e=>setTemperaturaFiltro(e.target.value as Temperatura|"")} className={INPUT}>
              <option value="">Todas</option>
              {TEMPERATURAS.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between flex-wrap gap-2">
          <p className="text-[11px] text-gray-400">
            {filtrados.length} oportunidade{filtrados.length!==1?"s":""} no período
            {vendedorId && vendedores.find(v=>v.id===vendedorId) && (
              <> · Filtro: <span className="font-semibold text-folk">{vendedores.find(v=>v.id===vendedorId)!.nome}</span></>
            )}
          </p>
          <button type="button" onClick={()=>setModalMeta({ aberto:true, meta_contratos:String(metaMes?.meta_contratos||""), meta_mrr:String(metaMes?.meta_mrr||""), meta_implantacao:String(metaMes?.meta_implantacao||""), salvando:false, erro:null })}
            className="text-xs font-semibold text-folk hover:underline">
            {metaMes ? "Editar meta do mês" : "Definir meta do mês"}
          </button>
        </div>
      </Card>

      {/* ── Meta Comercial ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-900">
            Meta Comercial — {MESES_COMPLETOS[mesAtualNum]} {anoAtual}
          </h2>
          {!metaMes && (
            <span className="text-[11px] text-gray-400 italic">Nenhuma meta definida para este mês.</span>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            {
              label: "Contratos", meta: metaMes?.meta_contratos??0, realizado: realizadoMes.contratos,
              fmt: (v: number) => String(v), cor: "#F05A28",
            },
            {
              label: "MRR", meta: metaMes?.meta_mrr??0, realizado: realizadoMes.mrr,
              fmt: formatMoeda, cor: "#059669",
            },
            {
              label: "Implantação", meta: metaMes?.meta_implantacao??0, realizado: realizadoMes.implantacao,
              fmt: formatMoeda, cor: "#60a5fa",
            },
          ].map(({ label, meta, realizado, fmt, cor }) => {
            const p = pct(realizado, meta);
            const superada = meta > 0 && realizado >= meta;
            return (
              <div key={label} className={`rounded-2xl border p-4 ${superada ? "border-emerald-200 bg-emerald-50" : "border-gray-200 bg-white"}`}>
                <div className="flex items-start justify-between mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Meta de {label}</p>
                  {superada && <span className="text-[10px] font-bold text-emerald-700">🏆 Superada!</span>}
                </div>
                {meta > 0 ? (
                  <>
                    <div className="flex items-end justify-between mb-1.5">
                      <div>
                        <p className="text-[10px] text-gray-400">Realizado</p>
                        <p className="text-lg font-black text-gray-900">{fmt(realizado)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-gray-400">Meta</p>
                        <p className="text-sm font-semibold text-gray-600">{fmt(meta)}</p>
                      </div>
                    </div>
                    <BarraProg pct={p} cor={superada ? "#059669" : cor} label={`${p}% da meta`} />
                  </>
                ) : (
                  <p className="text-sm text-gray-400 mt-1">Meta não definida</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Resumo Inteligente ── */}
      {resumo.length > 0 && (
        <Card className="p-6">
          <Secao>Resumo Inteligente</Secao>
          <div className="flex flex-col gap-2.5">
            {resumo.map((f,i) => <p key={i} className="text-sm text-gray-700 leading-relaxed">{f}</p>)}
          </div>
        </Card>
      )}

      {/* ── KPIs + Receita Prevista ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
        <KPI label="Leads Ativos"    value={kpis.total} cor="folk"  deltaSemana={kpis.deltaTotalSem} deltaMes={kpis.deltaTotalMes} />
        <KPI label="MRR Potencial"   value={formatMoeda(kpis.mrr)} sub="valor mensal" cor="green" deltaSemana={kpis.deltaMrrSem} deltaMes={kpis.deltaMrrMes} />
        <KPI label="Implantação Pot." value={formatMoeda(kpis.impl)} sub="soma ativa" cor="blue"  deltaSemana={kpis.deltaImplSem} deltaMes={kpis.deltaImplMes} />
        <KPI label="Receita Prevista" value={formatMoeda(receitaPrevista.prevista)}
          sub={`conv. histórica: ${receitaPrevista.taxaConversao}%`} cor="purple"
          deltaSemana={null} deltaMes={receitaPrevista.deltaMes} />
        <KPI label="Ações Atrasadas"  value={kpis.atrasadas}  cor={kpis.atrasadas>0?"red":"gray"}    alerta deltaSemana={null} deltaMes={null} />
        <KPI label="Ações para Hoje"  value={kpis.acoesHoje}  cor={kpis.acoesHoje>0?"amber":"gray"}         deltaSemana={null} deltaMes={null} />
        <KPI label="Próximos 7 Dias"  value={kpis.proxSemana} cor="blue"                                     deltaSemana={null} deltaMes={null} />
        <KPI label="Sem Próxima Ação" value={kpis.semAcao}    cor={kpis.semAcao>0?"orange":"gray"}   alerta deltaSemana={null} deltaMes={null} />
      </div>

      {/* ── Saúde + Alertas ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="p-6">
          <Secao>Saúde do Pipeline</Secao>
          <div className="flex items-start gap-6">
            <div className="flex flex-col items-center">
              <p className={`text-5xl font-black ${COR_MAP[saude.cor].txt}`}>{saude.score}%</p>
              <span className={`mt-1 rounded-full px-3 py-0.5 text-xs font-bold ${COR_MAP[saude.cor].card} ${COR_MAP[saude.cor].txt} border`}>
                {saude.label}
              </span>
            </div>
            <div className="flex-1 flex flex-col gap-3">
              {[
                { label:"Sem ação",           count:saude.semAcao,      cor:"bg-orange-400" },
                { label:"Ações atrasadas",    count:saude.atrasadas,    cor:"bg-red-400" },
                { label:"Sem atualização 7d", count:saude.semInteracao, cor:"bg-amber-400" },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full shrink-0 ${item.cor}`} />
                  <p className="text-xs text-gray-600 flex-1">{item.label}</p>
                  <span className={`text-sm font-bold ${item.count>0?"text-gray-900":"text-gray-300"}`}>{item.count}</span>
                </div>
              ))}
              <p className="text-[10px] text-gray-400 mt-1">90–100% Excelente · 75–89% Boa · 60–74% Atenção · &lt;60% Crítica</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <Secao>Atenção</Secao>
          {alertas.length === 0 ? <p className="text-sm text-gray-400">Nenhum alerta.</p> : (
            <div className="flex flex-col gap-2.5">
              {alertas.map((a,i) => (
                <p key={i} className="text-sm text-gray-700">
                  {a.tipo==="red"?"🔴":a.tipo==="yellow"?"🟡":"🟢"} {a.msg}
                </p>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── Aging do Pipeline ── */}
      <Card className="p-6">
        <Secao>Aging do Pipeline</Secao>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-2.5">
            {aging.faixas.map(f => (
              <BarraH key={f.label} label={f.label} count={f.count} max={aging.maxFaixa}
                cor={f.label.includes("90+") ? "#ef4444" : f.label.includes("61") ? "#f97316" : f.label.includes("31") ? "#f59e0b" : "#60a5fa"}
                extra={`${f.count} oport.`} />
            ))}
          </div>
          {aging.velhas60.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3">Oportunidades mais antigas</p>
              <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                {aging.velhas60.slice(0,10).map(r => (
                  <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-900 truncate">{r.cliente}</p>
                      {r.vendedor_nome && <p className="text-[10px] text-gray-400">{r.vendedor_nome}</p>}
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${r.dias > 90 ? "bg-red-100 text-red-600" : "bg-orange-100 text-orange-600"}`}>
                      {r.dias}d
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* ── Funil Comercial + Funil de Perdas ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="p-6">
          <Secao>Funil Comercial</Secao>
          <div className="flex flex-col gap-2.5">
            {funil.map(({ label, count, cor, pctTotal }) => (
              <BarraH key={label} label={label} count={count} max={maxFunil} cor={cor}
                extra={filtrados.length>0?`${pctTotal}%`:""} />
            ))}
          </div>
          <p className="mt-3 text-[11px] text-gray-400">% = participação no total</p>
        </Card>

        <Card className="p-6">
          <Secao>Funil de Perdas</Secao>
          <div className="flex flex-col items-center gap-0">
            {funilPerdas.map((etapa, i) => {
              const largura = 100 - i * 12;
              return (
                <div key={etapa.label} className="flex flex-col items-center w-full">
                  <div
                    className={`${etapa.cor} rounded-lg py-2 text-center text-xs font-bold text-white transition-all`}
                    style={{ width:`${largura}%` }}
                  >
                    {etapa.label}
                  </div>
                  {i < funilPerdas.length - 1 && (
                    <div className="text-gray-300 text-sm leading-none my-0.5">↓</div>
                  )}
                </div>
              );
            })}
          </div>
          {motivosPerda.lista.length > 0 && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-2">Declinadas por motivo</p>
              <div className="flex flex-col gap-1.5">
                {motivosPerda.lista.slice(0,5).map(m => (
                  <div key={m.motivo} className="flex items-center gap-2 text-xs">
                    <span className="w-36 truncate text-gray-600">{m.motivo}</span>
                    <div className="flex-1 h-3 rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-red-400" style={{ width:`${m.pct}%` }} />
                    </div>
                    <span className="w-8 text-right font-semibold text-gray-600">{m.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* ── Conversão ── */}
      <Card className="p-6">
        <Secao>Conversão por Etapa</Secao>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="flex items-center gap-6">
            <div className="rounded-2xl border border-folk/20 bg-folk/5 px-6 py-4 text-center shrink-0">
              <p className="text-[10px] font-bold uppercase tracking-wide text-folk/60 mb-0.5">Conversão Geral</p>
              <p className="text-4xl font-black text-folk">{conversao.taxaGeral}%</p>
              <p className="text-[11px] text-folk/60">{conversao.fechados} / {conversao.total}</p>
            </div>
            <div className="flex-1 flex flex-col gap-3">
              {conversao.etapas.map(({ label, taxa, qtdDe }) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="w-40 shrink-0 text-xs text-gray-600 text-right">{label}</span>
                  <div className="flex-1 h-5 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full bg-folk" style={{ width:`${taxa}%` }} />
                  </div>
                  <span className="w-10 text-right text-xs font-bold text-gray-700">{taxa}%</span>
                  <span className="text-[10px] text-gray-400 w-10 text-right">({qtdDe})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Motivos de perda detalhado */}
          {motivosPerda.total > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3">Motivos de Perda</p>
              <div className="flex flex-col gap-2">
                {motivosPerda.lista.map(m => (
                  <BarraH key={m.motivo} label={m.motivo} count={m.count} max={motivosPerda.lista[0].count} cor="#ef4444" extra={`${m.pct}%`} />
                ))}
              </div>
              {motivosPerda.top2Pct >= 50 && (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                  <p className="text-xs text-amber-800">⚠ {motivosPerda.top2Pct}% das perdas por "{motivosPerda.top2[0]}"{motivosPerda.top2[1]?` e "${motivosPerda.top2[1]}"`:""}. Revisar posicionamento comercial.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* ── Forecast de Fechamento ── */}
      <Card className="p-6">
        <Secao>Previsão de Fechamentos</Secao>
        {forecast.length === 0 ? (
          <p className="text-sm text-gray-400">Sem dados suficientes para previsão.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {forecast.map(f => (
              <div key={f.mes} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">{f.label}</p>
                <p className="text-2xl font-black text-gray-900">{f.contratos}</p>
                <p className="text-xs text-gray-500">contrato{f.contratos!==1?"s":""}</p>
                <p className="mt-2 text-sm font-semibold text-emerald-700">{formatMoeda(f.mrr)}</p>
                <p className="text-[10px] text-gray-400">MRR previsto</p>
              </div>
            ))}
          </div>
        )}
        <p className="mt-3 text-[11px] text-gray-400">Baseado em etapa, temperatura, assembleia marcada e tempo sem interação. Valores ponderados por probabilidade.</p>
      </Card>

      {/* ── Score de Probabilidade ── */}
      {scoreList.length > 0 && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card className="p-6">
            <Secao>Oportunidades com Maior Probabilidade</Secao>
            <div className="flex flex-col gap-2">
              {scoreList.slice(0,8).map(r => {
                const cls = r.score >= 70 ? "bg-emerald-100 text-emerald-700" : r.score >= 40 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600";
                return (
                  <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-900 truncate">{r.cliente}</p>
                      <p className="text-[10px] text-gray-400">{r.vendedor_nome ?? "—"} · {labelStatusPipeline(r.status)}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-black ${cls}`}>{r.score}%</span>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-6">
            <Secao>Oportunidades em Risco</Secao>
            <div className="flex flex-col gap-2">
              {scoreList.slice().reverse().slice(0,8).map(r => {
                const cls = r.score >= 70 ? "bg-emerald-100 text-emerald-700" : r.score >= 40 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600";
                return (
                  <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-900 truncate">{r.cliente}</p>
                      <p className="text-[10px] text-gray-400">{r.vendedor_nome ?? "—"} · {labelStatusPipeline(r.status)}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-black ${cls}`}>{r.score}%</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ── Velocidade ── */}
      <Card className="p-6">
        <Secao>Velocidade do Pipeline</Secao>
        {velocidade.length === 0 ? (
          <p className="text-sm text-gray-400">Sem dados suficientes.</p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Etapa</th>
                    <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Qtd.</th>
                    <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Tempo médio</th>
                  </tr>
                </thead>
                <tbody>
                  {velocidade.map(({ label, cor, media, qtd }) => (
                    <tr key={label} className="border-b border-gray-50">
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: cor }} />
                          <span className="text-xs text-gray-700">{label}</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-right text-xs text-gray-500">{qtd}</td>
                      <td className="py-2.5 text-right text-xs font-semibold text-gray-900">{media !== null ? `${media} dias` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {gargalo && gargalo.media !== null && (
              <div className="flex flex-col justify-center">
                <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-amber-600 mb-1">⚠ Gargalo</p>
                  <p className="text-base font-bold text-amber-900 mb-1">{gargalo.label}</p>
                  <p className="text-sm text-amber-700">{gargalo.qtd} oportunidade{gargalo.qtd!==1?"s":""}</p>
                  <p className="text-2xl font-black text-amber-700 mt-2">{gargalo.media} dias</p>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* ── Evolução ── */}
      <Card className="p-6">
        <Secao>Evolução do Pipeline</Secao>
        {evolucaoPorMes.length === 0 ? <p className="text-sm text-gray-400">Nenhum dado.</p> : (
          <>
            <div className="flex items-end gap-1.5 overflow-x-auto pb-2" style={{ height:160 }}>
              {evolucaoPorMes.map(([mes, { count }]) => {
                const h = maxLeads > 0 ? Math.max(8, (count/maxLeads)*120) : 8;
                return (
                  <div key={mes} className="flex shrink-0 flex-col items-center gap-1">
                    <span className="text-[10px] font-bold text-gray-700">{count}</span>
                    <div className="w-9 rounded-t-md bg-folk" style={{ height:`${h}px` }} />
                    <span className="text-[9px] text-gray-500 whitespace-nowrap">{labelMes(mes)}</span>
                  </div>
                );
              })}
            </div>
            {(() => {
              const u = evolucaoPorMes[evolucaoPorMes.length-1];
              const p2 = evolucaoPorMes[evolucaoPorMes.length-2];
              if (!u || !p2) return null;
              const dc = u[1].count - p2[1].count;
              return (
                <div className="mt-3 flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-1.5 text-xs text-gray-600"><div className="h-3 w-3 rounded-sm bg-folk" />Leads por mês</div>
                  <p className={`text-xs font-semibold ${dc>=0?"text-emerald-600":"text-red-500"}`}>
                    {dc>=0?"↑":"↓"} {Math.abs(dc)} lead{Math.abs(dc)!==1?"s":""} vs mês anterior
                  </p>
                </div>
              );
            })()}
          </>
        )}
      </Card>

      {/* ── Ranking + Evolução por vendedor ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="p-6">
          <Secao>Ranking Comercial</Secao>
          {ranking.length === 0 ? <p className="text-sm text-gray-400">Sem dados.</p> : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="pb-2 text-left font-semibold uppercase tracking-wide text-gray-400">#</th>
                      <th className="pb-2 text-left font-semibold uppercase tracking-wide text-gray-400">Vendedor</th>
                      <th className="pb-2 text-right font-semibold uppercase tracking-wide text-gray-400">Pipeline</th>
                      <th className="pb-2 text-right font-semibold uppercase tracking-wide text-gray-400">Fechados</th>
                      <th className="pb-2 text-right font-semibold uppercase tracking-wide text-gray-400">Conv.</th>
                      <th className="pb-2 text-right font-semibold uppercase tracking-wide text-gray-400">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.map(({ nome, ativos, fechados, taxaConversao, score }, i) => (
                      <tr key={nome} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2 pr-2 font-bold text-gray-400">{i===0?"🥇":i===1?"🥈":i===2?"🥉":`${i+1}º`}</td>
                        <td className="py-2 font-semibold text-gray-900">{nome}</td>
                        <td className="py-2 text-right text-gray-600">{ativos}</td>
                        <td className="py-2 text-right font-semibold text-emerald-600">{fechados}</td>
                        <td className="py-2 text-right text-gray-600">{taxaConversao}%</td>
                        <td className="py-2 text-right font-black text-sm text-folk">{score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-[10px] text-gray-400">Score = pipeline ativo + fechados + conversão + MRR relativo</p>
            </>
          )}
        </Card>

        <Card className="p-6">
          <Secao>Evolução por Vendedor</Secao>
          {vendedorStats.length === 0 ? <p className="text-sm text-gray-400">Sem dados.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="pb-2 text-left font-semibold uppercase tracking-wide text-gray-400">Vendedor</th>
                    <th className="pb-2 text-right font-semibold uppercase tracking-wide text-gray-400">Pipeline</th>
                    <th className="pb-2 text-right font-semibold uppercase tracking-wide text-gray-400">MRR</th>
                    <th className="pb-2 text-right font-semibold uppercase tracking-wide text-gray-400">Conv.</th>
                    <th className="pb-2 text-right font-semibold uppercase tracking-wide text-gray-400">Cresc.</th>
                  </tr>
                </thead>
                <tbody>
                  {vendedorStats.map(({ nome, ativos, mrr, taxaConversao, crescimento }) => (
                    <tr key={nome} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 font-semibold text-gray-900">{nome}</td>
                      <td className="py-2 text-right font-bold text-gray-900">{ativos}</td>
                      <td className="py-2 text-right text-gray-600">{formatMoeda(mrr)}</td>
                      <td className="py-2 text-right"><span className={`font-semibold ${taxaConversao>=10?"text-emerald-600":taxaConversao>=5?"text-amber-600":"text-gray-500"}`}>{taxaConversao}%</span></td>
                      <td className="py-2 text-right"><span className={`font-bold ${crescimento>0?"text-emerald-600":crescimento<0?"text-red-500":"text-gray-400"}`}>{crescimento>0?`+${crescimento}%`:crescimento<0?`${crescimento}%`:"—"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* ── Assembleias ── */}
      <Card className="p-6">
        <Secao>Assembleias Agendadas</Secao>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-5">
          {[
            { label:"Este mês",         count:assembleias.esteMes.length,    cls:"border-purple-200 bg-purple-50", txt:"text-purple-700" },
            { label:"Próximos 30 dias", count:assembleias.proximos30.length, cls:"border-blue-200 bg-blue-50",     txt:"text-blue-700" },
            { label:"Com data marcada", count:assembleias.todas.length,      cls:"border-gray-200 bg-gray-50",     txt:"text-gray-700" },
          ].map(({ label, count, cls, txt }) => (
            <div key={label} className={`rounded-xl border p-4 ${cls}`}>
              <p className={`text-[10px] font-bold uppercase tracking-wide ${txt} opacity-70 mb-1`}>{label}</p>
              <p className={`text-3xl font-black ${txt}`}>{count}</p>
            </div>
          ))}
        </div>
        {assembleias.esteMes.length + assembleias.proximos30.length > 0 && (
          <div className="flex flex-col gap-2">
            {[...assembleias.esteMes,...assembleias.proximos30]
              .sort((a,b)=>new Date(a.data_assembleia!).getTime()-new Date(b.data_assembleia!).getTime())
              .slice(0,10).map(r=>(
                <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-purple-100 bg-white px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{r.cliente}</p>
                    {r.vendedor_nome && <p className="text-xs text-gray-400">{r.vendedor_nome}</p>}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-purple-700">
                      {new Date(r.data_assembleia!).toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric"})}
                    </p>
                    <p className="text-xs text-purple-500">
                      {new Date(r.data_assembleia!).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        )}
        {assembleias.todas.length === 0 && <p className="text-sm text-gray-400">Nenhuma assembleia agendada.</p>}
      </Card>

      {/* ── Temperatura ── */}
      <Card className="p-6">
        <Secao>Temperatura das Oportunidades Ativas</Secao>
        <div className="flex flex-col gap-2.5">
          {TEMPERATURAS.map(({ value, label }) => {
            const count = ativosBase.filter(r=>r.temperatura===value).length;
            const cor = value==="quente"?"#f87171":value==="morna"?"#fbbf24":"#93c5fd";
            return (
              <BarraH key={value} label={label} count={count} max={ativosBase.length||1} cor={cor}
                extra={ativosBase.length>0?`${Math.round((count/ativosBase.length)*100)}%`:"0%"} />
            );
          })}
        </div>
      </Card>

      {/* ── Modal de configuração de meta ── */}
      {modalMeta.aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="border-b border-gray-100 px-6 py-4">
              <h3 className="text-base font-bold text-gray-900">Meta Comercial</h3>
              <p className="mt-0.5 text-sm text-gray-500">{MESES_COMPLETOS[mesAtualNum]} {anoAtual}</p>
            </div>
            <div className="grid grid-cols-1 gap-4 px-6 py-5">
              <div className="flex flex-col gap-1.5">
                <label className={LABEL}>Meta de Contratos</label>
                <input type="number" min="0" value={modalMeta.meta_contratos}
                  onChange={e=>setModalMeta(p=>({...p,meta_contratos:e.target.value,erro:null}))}
                  placeholder="ex: 10" className={INPUT} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={LABEL}>Meta de MRR (R$)</label>
                <input type="number" min="0" step="0.01" value={modalMeta.meta_mrr}
                  onChange={e=>setModalMeta(p=>({...p,meta_mrr:e.target.value,erro:null}))}
                  placeholder="ex: 55000" className={INPUT} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={LABEL}>Meta de Implantação (R$)</label>
                <input type="number" min="0" step="0.01" value={modalMeta.meta_implantacao}
                  onChange={e=>setModalMeta(p=>({...p,meta_implantacao:e.target.value,erro:null}))}
                  placeholder="ex: 800000" className={INPUT} />
              </div>
              {modalMeta.erro && <p className="text-sm text-red-500">{modalMeta.erro}</p>}
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button type="button"
                onClick={()=>setModalMeta({ aberto:false, meta_contratos:"", meta_mrr:"", meta_implantacao:"", salvando:false, erro:null })}
                className="rounded-2xl border border-gray-200 px-5 py-2 text-sm font-semibold text-gray-600 hover:border-gray-300">
                Cancelar
              </button>
              <button type="button" onClick={handleSalvarMeta} disabled={modalMeta.salvando}
                className="rounded-2xl bg-folk-gradient px-5 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60">
                {modalMeta.salvando ? "Salvando..." : "Salvar Meta"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
