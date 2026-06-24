"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  listarObras, listarObraAcoesVencidas,
  SITUACOES_OBRA, EQUIPES,
  labelSituacaoObra, labelEquipe, formatData, formatMoeda,
  type Obra, type SituacaoObra, type Equipe,
} from "@/lib/projetos";
import { listarTecnicos, type Tecnico } from "@/lib/cadastros";
import { Card, Alert } from "@/app/components/ui";

// ── Helpers ───────────────────────────────────────────────────

function hojeStr(): string { return new Date().toISOString().slice(0, 10); }

function diasEntre(antes: string, depois: string): number {
  return Math.round(
    (new Date(depois + "T00:00:00").getTime() - new Date(antes + "T00:00:00").getTime()) / 86_400_000
  );
}

const MESES_ABREV = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
function labelMes(key: string): string {
  const [ano, mes] = key.split("-");
  return `${MESES_ABREV[parseInt(mes) - 1]}/${ano.slice(2)}`;
}
function mesesNoPeriodo(inicio: string, fim: string): string[] {
  const lista: string[] = [];
  const cur = new Date(inicio + "T00:00:00");
  const end = new Date(fim   + "T00:00:00");
  while (cur <= end) {
    lista.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`);
    cur.setMonth(cur.getMonth() + 1);
    if (lista.length > 36) break;
  }
  return lista;
}
function dentroDeMes(data: string | null | undefined, mesKey: string): boolean {
  return !!data && data.slice(0, 7) === mesKey;
}

const LABEL = "text-xs font-semibold uppercase tracking-wide text-gray-500";
const INPUT = "rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none focus:border-folk focus:ring-2 focus:ring-folk/10";

// ── Cores ─────────────────────────────────────────────────────

const STATUS_COR: Record<SituacaoObra, string> = {
  a_executar:  "#94a3b8",
  em_execucao: "#F05A28",
  paralizada:  "#ef4444",
  finalizada:  "#22c55e",
};
const STATUS_BG: Record<SituacaoObra, string> = {
  a_executar:  "bg-gray-100 text-gray-600 border-gray-200",
  em_execucao: "bg-folk/10 text-folk border-folk/20",
  paralizada:  "bg-red-100 text-red-700 border-red-200",
  finalizada:  "bg-green-100 text-green-700 border-green-200",
};

// ── Score de risco ────────────────────────────────────────────

function calcRiscoScore(obra: Obra, acoesVencidas: number, hojeD: Date): number {
  let s = 0;
  if (obra.data_prazo && obra.situacao !== "finalizada") {
    const prazo = new Date(obra.data_prazo + "T00:00:00");
    if (prazo < hojeD) {
      const d = Math.floor((hojeD.getTime() - prazo.getTime()) / 86400000);
      s += Math.min(40, d * 2);
    } else {
      const diasRestantes = Math.floor((prazo.getTime() - hojeD.getTime()) / 86400000);
      if (diasRestantes <= 7 && obra.andamento < 70) s += 30;
    }
  }
  if (obra.situacao === "paralizada") s += 35;
  if (["em_execucao","a_executar"].includes(obra.situacao)) {
    const d = Math.floor((hojeD.getTime() - new Date(obra.data_inicio + "T00:00:00").getTime()) / 86400000);
    if (d > 90) s += 20;
  }
  s += Math.min(20, acoesVencidas * 5);
  return Math.min(100, Math.max(0, Math.round(s)));
}

function labelRisco(score: number): { label: string; cls: string; dot: string } {
  if (score >= 81) return { label: "Crítico",  cls: "bg-red-100 text-red-700",     dot: "🔴" };
  if (score >= 61) return { label: "Alto",      cls: "bg-orange-100 text-orange-700", dot: "🟠" };
  if (score >= 31) return { label: "Médio",     cls: "bg-amber-100 text-amber-700",  dot: "🟡" };
  return               { label: "Baixo",     cls: "bg-gray-100 text-gray-600",    dot: "⚪" };
}

// ── Sub-componentes ───────────────────────────────────────────

function DeltaLine({ diff, p, label, moeda }: { diff: number; p: number | null; label: string; moeda?: boolean }) {
  if (diff === 0 && p === null) return <p className="text-[10px] text-gray-300 leading-snug">—</p>;
  const up = diff > 0;
  const cls = up ? "text-emerald-600" : "text-red-500";
  const icon = up ? "↑" : "↓";
  const val = moeda ? formatMoeda(Math.abs(diff)) : String(Math.abs(diff));
  const pStr = p !== null ? ` (${Math.abs(p)}%)` : "";
  return (
    <p className={`text-[10px] font-semibold break-words whitespace-normal [line-height:1.4] ${cls}`}>
      {icon} {up && !moeda ? "+" : ""}{val}{pStr}{" "}
      <span className="font-normal text-gray-400">{label}</span>
    </p>
  );
}

function KPICard({
  label, value, sub, cor = "default", deltaSem, deltaMes,
}: {
  label: string; value: string | number; sub?: string;
  cor?: "default" | "green" | "red" | "amber" | "blue" | "folk";
  deltaSem?: { diff: number; p: number | null; moeda?: boolean } | null;
  deltaMes?: { diff: number; p: number | null; moeda?: boolean } | null;
}) {
  const txt = {
    default: "text-gray-900", green: "text-emerald-600", red: "text-red-600",
    amber: "text-amber-600", blue: "text-blue-600", folk: "text-folk",
  }[cor];
  const border = {
    default: "border-gray-200 bg-white", green: "border-emerald-200 bg-emerald-50",
    red: "border-red-200 bg-red-50", amber: "border-amber-200 bg-amber-50",
    blue: "border-blue-200 bg-blue-50", folk: "border-folk/20 bg-folk/5",
  }[cor];
  return (
    <div className={`flex flex-col min-h-[160px] justify-between gap-1 rounded-2xl border p-4 shadow-sm ${border}`}>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">{label}</p>
        <p className={`text-2xl font-black leading-tight break-words ${txt}`}>{value}</p>
        {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
      <div className="pt-2 flex flex-col gap-1 border-t border-black/5">
        {deltaSem  != null && <DeltaLine {...deltaSem}  label="vs semana ant." />}
        {deltaMes  != null && <DeltaLine {...deltaMes}  label="vs mês ant." />}
        {deltaSem == null && deltaMes == null && <p className="text-[10px] text-gray-300">—</p>}
      </div>
    </div>
  );
}

function BarraH({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-right text-xs text-gray-500">{label}</span>
      <div className="h-6 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full transition-all duration-700 flex items-center pl-2"
          style={{ width: `${Math.max(pct, count > 0 ? 4 : 0)}%`, background: color }}>
          {count > 0 && <span className="text-[10px] font-bold text-white">{count}</span>}
        </div>
      </div>
    </div>
  );
}

function Secao({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-bold text-gray-800 mb-4">{children}</h2>;
}

// ── Componente principal ──────────────────────────────────────

const HOJE = hojeStr();
const ANO_ATUAL = HOJE.slice(0, 4);

interface Filtros { dataInicio: string; dataFim: string; equipe: Equipe | ""; tecnicoId: string; }

function diffPct(a: number, b: number) { return b > 0 ? Math.round(((a - b) / b) * 100) : null; }

export default function ProjetosDashboardPage() {
  const [obras,      setObras]      = useState<Obra[]>([]);
  const [tecnicos,   setTecnicos]   = useState<Tecnico[]>([]);
  const [acoesVenc,  setAcoesVenc]  = useState<{ id: string; obra_id: string }[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro,       setErro]       = useState<string | null>(null);
  const [filtros,    setFiltros]    = useState<Filtros>({
    dataInicio: `${ANO_ATUAL}-01-01`,
    dataFim:    `${ANO_ATUAL}-12-31`,
    equipe: "", tecnicoId: "",
  });

  const carregar = useCallback(async () => {
    setCarregando(true); setErro(null);
    try {
      const [lista, tecs, av] = await Promise.all([
        listarObras(),
        listarTecnicos({ ativo: true }),
        listarObraAcoesVencidas().catch(() => []),
      ]);
      setObras(lista); setTecnicos(tecs); setAcoesVenc(av);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar.");
    } finally { setCarregando(false); }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  function setF<K extends keyof Filtros>(k: K, v: Filtros[K]) {
    setFiltros((p) => ({ ...p, [k]: v }));
  }

  // ── Janelas de tempo ─────────────────────────────────────────

  const hojeD = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const inicioSemAtual = useMemo(() => { const d = new Date(hojeD); d.setDate(d.getDate()-7);  return d; }, [hojeD]);
  const inicioSemAnt   = useMemo(() => { const d = new Date(hojeD); d.setDate(d.getDate()-14); return d; }, [hojeD]);
  const inicioMesAtual = useMemo(() => new Date(hojeD.getFullYear(), hojeD.getMonth(), 1), [hojeD]);
  const inicioMesAnt   = useMemo(() => new Date(hojeD.getFullYear(), hojeD.getMonth()-1, 1), [hojeD]);

  // ── Datasets ─────────────────────────────────────────────────

  // base: sem filtro de data — para KPIs de estado atual
  const base = useMemo(() => obras.filter((o) => {
    if (filtros.equipe    && o.equipe      !== filtros.equipe)    return false;
    if (filtros.tecnicoId && o.tecnico_id  !== filtros.tecnicoId) return false;
    return true;
  }), [obras, filtros.equipe, filtros.tecnicoId]);

  // filtradas: adiciona filtro de data_inicio — para análise histórica
  const filtradas = useMemo(() => base.filter((o) =>
    (!filtros.dataInicio || o.data_inicio >= filtros.dataInicio) &&
    (!filtros.dataFim    || o.data_inicio <= filtros.dataFim)
  ), [base, filtros.dataInicio, filtros.dataFim]);

  // Mapa de ações vencidas por obra (apenas obras em base)
  const baseIds = useMemo(() => new Set(base.map((o) => o.id)), [base]);
  const acoesVencPorObra = useMemo(() => {
    const m: Record<string, number> = {};
    acoesVenc.filter((a) => baseIds.has(a.obra_id)).forEach((a) => {
      m[a.obra_id] = (m[a.obra_id] ?? 0) + 1;
    });
    return m;
  }, [acoesVenc, baseIds]);

  // ── Subsets de base ──────────────────────────────────────────

  const ativas = useMemo(() => base.filter((o) => ["a_executar","em_execucao"].includes(o.situacao)), [base]);
  const paralisadas   = useMemo(() => base.filter((o) => o.situacao === "paralizada"), [base]);
  const finalizadas   = useMemo(() => base.filter((o) => o.situacao === "finalizada"), [base]);
  const prazoVencido  = useMemo(() => base.filter((o) => o.data_prazo && HOJE > o.data_prazo && o.situacao !== "finalizada"), [base]);
  const execucaoLonga = useMemo(() => base.filter((o) => ["em_execucao","a_executar"].includes(o.situacao) && diasEntre(o.data_inicio, HOJE) > 90), [base]);
  const vencemEm7     = useMemo(() => base.filter((o) => {
    if (!o.data_prazo || o.situacao === "finalizada") return false;
    const d = diasEntre(HOJE, o.data_prazo);
    return d >= 0 && d <= 7;
  }), [base]);

  // Obras atrasadas = finalizadas com data_conclusao > data_prazo
  const comAmbas  = useMemo(() => finalizadas.filter((o) => o.data_conclusao && o.data_prazo), [finalizadas]);
  const atrasadasFin = useMemo(() => comAmbas.filter((o) => o.data_conclusao! > o.data_prazo!), [comAmbas]);
  const noPrazoFin   = useMemo(() => comAmbas.filter((o) => o.data_conclusao! <= o.data_prazo!), [comAmbas]);
  const pctPrazo     = useMemo(() => comAmbas.length > 0 ? Math.round((noPrazoFin.length / comAmbas.length) * 100) : null, [comAmbas, noPrazoFin]);
  const atrasoMedio  = useMemo(() => atrasadasFin.length > 0
    ? Math.round(atrasadasFin.reduce((s, o) => s + diasEntre(o.data_prazo!, o.data_conclusao!), 0) / atrasadasFin.length)
    : 0, [atrasadasFin]);

  // ── Valores financeiros ──────────────────────────────────────

  const valorEmExecucao = useMemo(() => ativas.reduce((s, o) => s + o.valor_execucao, 0), [ativas]);
  const valorConcluido  = useMemo(() => finalizadas.reduce((s, o) => s + o.valor_execucao, 0), [finalizadas]);
  const valorEmRisco    = useMemo(() =>
    base.filter((o) => (o.data_prazo && HOJE > o.data_prazo && o.situacao !== "finalizada") || o.situacao === "paralizada")
      .reduce((s, o) => s + o.valor_execucao, 0)
  , [base]);

  // Comparativos por semana/mês (usando data_inicio das obras)
  const dSemA = (d: Date) => new Date(d).toISOString().slice(0,10);
  const semAStr  = dSemA(inicioSemAtual);
  const semBStr  = dSemA(inicioSemAnt);
  const mesAStr  = dSemA(inicioMesAtual);
  const mesBStr  = dSemA(inicioMesAnt);

  const ativasSemA  = useMemo(() => base.filter((o) => ["a_executar","em_execucao"].includes(o.situacao) && o.data_inicio >= semAStr && o.data_inicio <= HOJE), [base, semAStr]);
  const ativasSemB  = useMemo(() => base.filter((o) => ["a_executar","em_execucao"].includes(o.situacao) && o.data_inicio >= semBStr && o.data_inicio < semAStr), [base, semAStr, semBStr]);
  const ativasMesA  = useMemo(() => base.filter((o) => ["a_executar","em_execucao"].includes(o.situacao) && o.data_inicio >= mesAStr && o.data_inicio <= HOJE), [base, mesAStr]);
  const ativasMesB  = useMemo(() => base.filter((o) => ["a_executar","em_execucao"].includes(o.situacao) && o.data_inicio >= mesBStr && o.data_inicio < mesAStr), [base, mesAStr, mesBStr]);

  const valSemA = useMemo(() => ativasSemA.reduce((s,o)=>s+o.valor_execucao,0), [ativasSemA]);
  const valSemB = useMemo(() => ativasSemB.reduce((s,o)=>s+o.valor_execucao,0), [ativasSemB]);
  const valMesA = useMemo(() => ativasMesA.reduce((s,o)=>s+o.valor_execucao,0), [ativasMesA]);
  const valMesB = useMemo(() => ativasMesB.reduce((s,o)=>s+o.valor_execucao,0), [ativasMesB]);

  const finSemA = useMemo(() => base.filter((o)=>o.situacao==="finalizada"&&o.data_conclusao&&o.data_conclusao>=semAStr&&o.data_conclusao<=HOJE), [base,semAStr]);
  const finSemB = useMemo(() => base.filter((o)=>o.situacao==="finalizada"&&o.data_conclusao&&o.data_conclusao>=semBStr&&o.data_conclusao<semAStr), [base,semAStr,semBStr]);
  const finMesA = useMemo(() => base.filter((o)=>o.situacao==="finalizada"&&o.data_conclusao&&o.data_conclusao>=mesAStr&&o.data_conclusao<=HOJE), [base,mesAStr]);
  const finMesB = useMemo(() => base.filter((o)=>o.situacao==="finalizada"&&o.data_conclusao&&o.data_conclusao>=mesBStr&&o.data_conclusao<mesAStr), [base,mesAStr,mesBStr]);

  const valFinSemA = useMemo(()=>finSemA.reduce((s,o)=>s+o.valor_execucao,0),[finSemA]);
  const valFinSemB = useMemo(()=>finSemB.reduce((s,o)=>s+o.valor_execucao,0),[finSemB]);
  const valFinMesA = useMemo(()=>finMesA.reduce((s,o)=>s+o.valor_execucao,0),[finMesA]);
  const valFinMesB = useMemo(()=>finMesB.reduce((s,o)=>s+o.valor_execucao,0),[finMesB]);

  // ── Saúde das Obras ──────────────────────────────────────────

  const saude = useMemo(() => {
    const total = base.length;
    if (total === 0) return { score: 100, label: "Excelente", cor: "green" as const };
    let pen = 0;
    pen += atrasadasFin.length * 5;
    pen += paralisadas.length * 10;
    pen += prazoVencido.length * 3;
    pen += execucaoLonga.length * 5;
    pen += Object.values(acoesVencPorObra).reduce((s, n) => s + n * 2, 0);
    const score = Math.max(0, Math.min(100, Math.round(100 - pen)));
    let label: string; let cor: "green"|"blue"|"amber"|"red";
    if (score >= 90) { label="Excelente"; cor="green"; }
    else if (score >= 75) { label="Boa"; cor="blue"; }
    else if (score >= 60) { label="Atenção"; cor="amber"; }
    else                  { label="Crítica"; cor="red"; }
    return { score, label, cor };
  }, [base, atrasadasFin, paralisadas, prazoVencido, execucaoLonga, acoesVencPorObra]);

  // ── Obras em risco ───────────────────────────────────────────

  const obrasEmRisco = useMemo(() => {
    return base
      .filter((o) => {
        if (o.situacao === "finalizada") return false;
        const acoesV = acoesVencPorObra[o.id] ?? 0;
        const emRisco =
          (o.data_prazo && HOJE > o.data_prazo) ||
          (o.data_prazo && (() => { const d = diasEntre(HOJE, o.data_prazo!); return d >= 0 && d <= 7 && o.andamento < 70; })()) ||
          (["em_execucao","a_executar"].includes(o.situacao) && diasEntre(o.data_inicio, HOJE) > 90) ||
          acoesV > 0;
        return emRisco;
      })
      .map((o) => {
        const acoesV = acoesVencPorObra[o.id] ?? 0;
        const score = calcRiscoScore(o, acoesV, hojeD);
        const diasAtrasoPrazo = o.data_prazo && HOJE > o.data_prazo ? diasEntre(o.data_prazo, HOJE) : 0;
        const diasRestantes  = o.data_prazo ? diasEntre(HOJE, o.data_prazo) : null;
        const diasExecucao   = diasEntre(o.data_inicio, HOJE);
        return { ...o, score, acoesV, diasAtrasoPrazo, diasRestantes, diasExecucao };
      })
      .sort((a, b) => b.score - a.score);
  }, [base, acoesVencPorObra, hojeD]);

  // ── Status ───────────────────────────────────────────────────

  const porStatus = useMemo(() =>
    SITUACOES_OBRA.map((s) => ({
      ...s, count: filtradas.filter((o) => o.situacao === s.value).length,
    }))
  , [filtradas]);
  const maxStatus = useMemo(() => Math.max(...porStatus.map((s) => s.count), 1), [porStatus]);

  // ── Capacidade mês a mês ─────────────────────────────────────

  const meses = useMemo(() =>
    mesesNoPeriodo(filtros.dataInicio, filtros.dataFim).map((key) => {
      const iniciadas  = filtradas.filter((o) => dentroDeMes(o.data_inicio_previsto ?? o.data_inicio, key)).length;
      const concluidas = filtradas.filter((o) => dentroDeMes(o.data_conclusao, key)).length;
      return { key, label: labelMes(key), iniciadas, concluidas, saldo: iniciadas - concluidas };
    })
  , [filtradas, filtros.dataInicio, filtros.dataFim]);
  const maxMes = useMemo(() => Math.max(...meses.flatMap((m) => [m.iniciadas, m.concluidas]), 1), [meses]);

  // ── Performance por técnico ──────────────────────────────────

  const porTecnico = useMemo(() => {
    const proprias = filtradas.filter((o) => o.equipe === "equipe_propria" && o.tecnico_nome);
    return Object.values(
      proprias.reduce((acc, o) => {
        const nome = o.tecnico_nome!;
        if (!acc[nome]) acc[nome] = { nome, total: 0, fin: 0, atrasadas: 0, diasAtraso: 0 };
        acc[nome].total += 1;
        if (o.situacao === "finalizada") {
          acc[nome].fin += 1;
          if (o.data_conclusao && o.data_prazo && o.data_conclusao > o.data_prazo) {
            acc[nome].atrasadas += 1;
            acc[nome].diasAtraso += diasEntre(o.data_prazo, o.data_conclusao);
          }
        }
        return acc;
      }, {} as Record<string, { nome: string; total: number; fin: number; atrasadas: number; diasAtraso: number }>)
    ).map((t) => ({
      ...t,
      pctPrazo:    t.fin > 0 ? Math.round(((t.fin - t.atrasadas) / t.fin) * 100) : null,
      atrasoMedio: t.atrasadas > 0 ? Math.round(t.diasAtraso / t.atrasadas) : 0,
    })).sort((a, b) => b.fin - a.fin);
  }, [filtradas]);

  // ── Resumo Inteligente ───────────────────────────────────────

  const resumo = useMemo(() => {
    const frases: string[] = [];
    const tot = filtradas.length;
    if (tot > 0) frases.push(`📋 ${tot} obra${tot !== 1 ? "s" : ""} registrada${tot !== 1 ? "s" : ""} no período.`);
    if (finalizadas.length > 0) frases.push(`✅ ${finalizadas.length} obra${finalizadas.length !== 1 ? "s foram" : " foi"} finalizada${finalizadas.length !== 1 ? "s" : ""}.`);
    if (prazoVencido.length > 0) frases.push(`⚠️ ${prazoVencido.length} obra${prazoVencido.length !== 1 ? "s estão" : " está"} com prazo vencido.`);
    if (paralisadas.length > 0) frases.push(`🔴 ${paralisadas.length} obra${paralisadas.length !== 1 ? "s paralisadas" : " paralisada"}.`);
    if (execucaoLonga.length > 0) frases.push(`⏱️ ${execucaoLonga.length} obra${execucaoLonga.length !== 1 ? "s estão" : " está"} há mais de 90 dias em execução.`);
    if (pctPrazo !== null) {
      if (pctPrazo < 70) frases.push(`⚠️ Apenas ${pctPrazo}% das obras foram entregues no prazo.`);
      else frases.push(`📈 ${pctPrazo}% das obras foram entregues no prazo.`);
    }
    if (valorEmExecucao > 0) frases.push(`💰 ${formatMoeda(valorEmExecucao)} em obras atualmente em execução.`);
    if (valorEmRisco > 0) frases.push(`⚠️ ${formatMoeda(valorEmRisco)} em valor sob risco (prazo vencido ou paralisadas).`);
    if (vencemEm7.length > 0) frases.push(`📅 ${vencemEm7.length} obra${vencemEm7.length !== 1 ? "s possuem" : " possui"} prazo vencendo nos próximos 7 dias.`);
    const melhor = porTecnico.filter((t) => t.pctPrazo !== null).sort((a, b) => (b.pctPrazo ?? 0) - (a.pctPrazo ?? 0))[0];
    if (melhor && melhor.pctPrazo !== null) frases.push(`🏆 ${melhor.nome} possui o melhor índice de entrega no prazo (${melhor.pctPrazo}%).`);
    return frases;
  }, [filtradas, finalizadas, prazoVencido, paralisadas, execucaoLonga, pctPrazo, valorEmExecucao, valorEmRisco, vencemEm7, porTecnico]);

  // ── Render ───────────────────────────────────────────────────

  const total = filtradas.length;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      {/* Cabeçalho */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <Link href="/projetos" className="text-sm text-gray-400 hover:text-gray-600">← Gerência de Projetos</Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">Dashboard de Obras 2.0</h1>
          <p className="mt-1 text-sm text-gray-500">Inteligência operacional, riscos e saúde da operação</p>
        </div>
        <button onClick={carregar} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 shadow-sm hover:border-gray-300">
          ↺ Atualizar
        </button>
      </div>

      {/* Filtros */}
      <Card className="mb-6 p-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>De</label>
            <input type="date" value={filtros.dataInicio} onChange={(e) => setF("dataInicio", e.target.value)} className={INPUT} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Até</label>
            <input type="date" value={filtros.dataFim} onChange={(e) => setF("dataFim", e.target.value)} className={INPUT} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Equipe</label>
            <select value={filtros.equipe} onChange={(e) => setF("equipe", e.target.value as Equipe | "")} className={INPUT}>
              <option value="">Todas</option>
              {EQUIPES.map((eq) => <option key={eq.value} value={eq.value}>{eq.label}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Técnico</label>
            <select value={filtros.tecnicoId} onChange={(e) => setF("tecnicoId", e.target.value)} className={INPUT}>
              <option value="">Todos</option>
              {tecnicos.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-gray-400">
          {filtradas.length} obra{filtradas.length !== 1 ? "s" : ""} no período · {base.length} no total com filtros aplicados
        </p>
      </Card>

      {erro && <Alert status="error" message={erro} />}

      {carregando ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-folk" />
            <p className="text-sm text-gray-400">Carregando dashboard...</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6">

          {/* ── Resumo Inteligente ── */}
          {resumo.length > 0 && (
            <Card className="p-6">
              <Secao>Resumo Inteligente</Secao>
              <div className="flex flex-col gap-2.5">
                {resumo.map((f, i) => (
                  <p key={i} className="text-sm text-gray-700 leading-relaxed">{f}</p>
                ))}
              </div>
            </Card>
          )}

          {/* ── Saúde + KPIs gerais ── */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {/* Saúde */}
            <div className={`col-span-2 sm:col-span-1 lg:col-span-2 rounded-2xl border p-5 shadow-sm flex flex-col justify-between ${
              saude.cor === "green" ? "border-emerald-200 bg-emerald-50"
              : saude.cor === "blue" ? "border-blue-200 bg-blue-50"
              : saude.cor === "amber" ? "border-amber-200 bg-amber-50"
              : "border-red-200 bg-red-50"
            }`}>
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-2">Saúde das Obras</p>
              <div className="flex items-end gap-3">
                <p className={`text-5xl font-black leading-none ${
                  saude.cor === "green" ? "text-emerald-700"
                  : saude.cor === "blue" ? "text-blue-700"
                  : saude.cor === "amber" ? "text-amber-700"
                  : "text-red-700"
                }`}>{saude.score}%</p>
                <div className="pb-1">
                  <span className={`rounded-full border px-3 py-0.5 text-xs font-bold ${
                    saude.cor === "green" ? "border-emerald-200 bg-white text-emerald-700"
                    : saude.cor === "blue" ? "border-blue-200 bg-white text-blue-700"
                    : saude.cor === "amber" ? "border-amber-200 bg-white text-amber-700"
                    : "border-red-200 bg-white text-red-700"
                  }`}>
                    {saude.cor === "green" ? "🟢" : saude.cor === "blue" ? "🔵" : saude.cor === "amber" ? "🟡" : "🔴"}{" "}
                    {saude.label}
                  </span>
                </div>
              </div>
              <div className="mt-3 flex flex-col gap-1.5 text-xs border-t border-black/5 pt-3">
                {atrasadasFin.length > 0 && <p className="text-red-600">−{atrasadasFin.length * 5}pts atrasadas ({atrasadasFin.length})</p>}
                {paralisadas.length > 0 && <p className="text-red-600">−{paralisadas.length * 10}pts paralisadas ({paralisadas.length})</p>}
                {prazoVencido.length > 0 && <p className="text-amber-600">−{prazoVencido.length * 3}pts prazo vencido ({prazoVencido.length})</p>}
                {execucaoLonga.length > 0 && <p className="text-amber-600">−{execucaoLonga.length * 5}pts +90 dias ({execucaoLonga.length})</p>}
                {Object.keys(acoesVencPorObra).length > 0 && (
                  <p className="text-orange-600">
                    −{Object.values(acoesVencPorObra).reduce((s,n)=>s+n*2,0)}pts ações vencidas ({Object.values(acoesVencPorObra).reduce((s,n)=>s+n,0)})
                  </p>
                )}
              </div>
            </div>

            <KPICard label="Total de Obras"  value={total}              cor="default" deltaSem={null} deltaMes={null} />
            <KPICard label="Em Execução"      value={ativas.length}      cor="folk"    deltaSem={null} deltaMes={null} />
            <KPICard label="Finalizadas"       value={finalizadas.length} cor="green"   deltaSem={null} deltaMes={null} />
            <KPICard label="Em Risco"          value={obrasEmRisco.length} cor={obrasEmRisco.length > 0 ? "red" : "default"} deltaSem={null} deltaMes={null} />
          </div>

          {/* ── Cards Financeiros ── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KPICard
              label="Valor em Execução"
              value={formatMoeda(valorEmExecucao)}
              sub="obras a executar + em execução"
              cor="folk"
              deltaSem={{ diff: valSemA - valSemB, p: diffPct(valSemA, valSemB), moeda: true }}
              deltaMes={{ diff: valMesA - valMesB, p: diffPct(valMesA, valMesB), moeda: true }}
            />
            <KPICard
              label="Valor Concluído"
              value={formatMoeda(valorConcluido)}
              sub="obras finalizadas"
              cor="green"
              deltaSem={{ diff: valFinSemA - valFinSemB, p: diffPct(valFinSemA, valFinSemB), moeda: true }}
              deltaMes={{ diff: valFinMesA - valFinMesB, p: diffPct(valFinMesA, valFinMesB), moeda: true }}
            />
            <KPICard
              label="Valor em Risco"
              value={formatMoeda(valorEmRisco)}
              sub="prazo vencido ou paralisadas"
              cor={valorEmRisco > 0 ? "red" : "default"}
              deltaSem={null}
              deltaMes={null}
            />
          </div>

          {/* ── Obras em Risco ── */}
          <Card className="p-6">
            <Secao>Obras em Risco</Secao>
            {obrasEmRisco.length === 0 ? (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                🟢 Nenhuma obra em situação de risco no momento.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-xs">
                      <th className="py-2.5 pl-4 text-left font-semibold uppercase tracking-wide text-gray-500">Obra / Cliente</th>
                      <th className="py-2.5 px-3 text-left font-semibold uppercase tracking-wide text-gray-500">Situação</th>
                      <th className="py-2.5 px-3 text-left font-semibold uppercase tracking-wide text-gray-500">Detalhes</th>
                      <th className="py-2.5 pr-4 text-right font-semibold uppercase tracking-wide text-gray-500">Risco</th>
                    </tr>
                  </thead>
                  <tbody>
                    {obrasEmRisco.map((o) => {
                      const r = labelRisco(o.score);
                      return (
                        <tr key={o.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                          <td className="py-3 pl-4">
                            <p className="font-semibold text-gray-900">{o.cliente}</p>
                            {(o.tecnico_nome || o.terceirizado_nome) && (
                              <p className="text-[11px] text-gray-400">{o.tecnico_nome ?? o.terceirizado_nome}</p>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${STATUS_BG[o.situacao]}`}>
                              {labelSituacaoObra(o.situacao)}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex flex-col gap-0.5 text-xs text-gray-600">
                              {o.diasAtrasoPrazo > 0 && (
                                <span className="text-red-600 font-semibold">{o.diasAtrasoPrazo}d de atraso no prazo</span>
                              )}
                              {o.diasRestantes !== null && o.diasRestantes >= 0 && o.diasRestantes <= 7 && (
                                <span className="text-amber-600">Prazo vence em {o.diasRestantes}d · andamento {o.andamento}%</span>
                              )}
                              {o.diasExecucao > 90 && (
                                <span className="text-orange-600">{o.diasExecucao}d em execução</span>
                              )}
                              {o.acoesV > 0 && (
                                <span className="text-rose-600">{o.acoesV} ação{o.acoesV !== 1 ? "ões" : ""} vencida{o.acoesV !== 1 ? "s" : ""}</span>
                              )}
                              {o.valor_execucao > 0 && (
                                <span className="text-gray-400">{formatMoeda(o.valor_execucao)}</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-right">
                            <div className="flex flex-col items-end gap-1">
                              <span className={`rounded-full px-2.5 py-0.5 text-xs font-black ${r.cls}`}>
                                {r.dot} {r.label}
                              </span>
                              <span className="text-[10px] text-gray-400">score {o.score}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* ── Status + Alertas ── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="p-6">
              <Secao>Obras por Status</Secao>
              {total === 0 ? (
                <p className="text-sm text-gray-400">Nenhuma obra no período.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {porStatus.map((s) => (
                    <BarraH key={s.value} label={s.label} count={s.count} max={maxStatus} color={STATUS_COR[s.value as SituacaoObra]} />
                  ))}
                  {total > 0 && (
                    <div className="mt-2 flex h-4 w-full overflow-hidden rounded-full">
                      {porStatus.filter((s) => s.count > 0).map((s) => (
                        <div key={s.value} title={`${s.label}: ${s.count}`}
                          className="h-full transition-all"
                          style={{ width: `${(s.count / total) * 100}%`, background: STATUS_COR[s.value as SituacaoObra] }} />
                      ))}
                    </div>
                  )}
                  <div className="mt-1 flex flex-wrap gap-2">
                    {porStatus.filter((s) => s.count > 0).map((s) => (
                      <span key={s.value} className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${STATUS_BG[s.value as SituacaoObra]}`}>
                        {s.label}: {s.count}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            <Card className="p-6">
              <Secao>Alertas Operacionais</Secao>
              {paralisadas.length === 0 && prazoVencido.length === 0 && execucaoLonga.length === 0 ? (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                  ✓ Nenhum alerta no momento
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {paralisadas.length > 0 && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                      <p className="text-sm font-bold text-red-700">🔴 {paralisadas.length} obra{paralisadas.length !== 1 ? "s" : ""} paralisada{paralisadas.length !== 1 ? "s" : ""}</p>
                      <div className="mt-1.5 flex flex-col gap-1">
                        {paralisadas.slice(0, 3).map((o) => (
                          <p key={o.id} className="text-xs text-red-600">{o.cliente} · desde {formatData(o.data_inicio)}</p>
                        ))}
                        {paralisadas.length > 3 && <p className="text-xs text-red-400">+ {paralisadas.length - 3} outras</p>}
                      </div>
                    </div>
                  )}
                  {prazoVencido.length > 0 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                      <p className="text-sm font-bold text-amber-700">⚠ {prazoVencido.length} obra{prazoVencido.length !== 1 ? "s" : ""} com prazo vencido</p>
                      <div className="mt-1.5 flex flex-col gap-1">
                        {prazoVencido.slice(0, 3).map((o) => (
                          <p key={o.id} className="text-xs text-amber-600">
                            {o.cliente} · venceu {formatData(o.data_prazo!)} · {diasEntre(o.data_prazo!, HOJE)}d atrás
                          </p>
                        ))}
                        {prazoVencido.length > 3 && <p className="text-xs text-amber-400">+ {prazoVencido.length - 3} outras</p>}
                      </div>
                    </div>
                  )}
                  {execucaoLonga.length > 0 && (
                    <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3">
                      <p className="text-sm font-bold text-orange-700">⏱ {execucaoLonga.length} obra{execucaoLonga.length !== 1 ? "s" : ""} em execução há +90 dias</p>
                      <div className="mt-1.5 flex flex-col gap-1">
                        {execucaoLonga.slice(0, 3).map((o) => (
                          <p key={o.id} className="text-xs text-orange-600">{o.cliente} · {diasEntre(o.data_inicio, HOJE)}d em execução</p>
                        ))}
                        {execucaoLonga.length > 3 && <p className="text-xs text-orange-400">+ {execucaoLonga.length - 3} outras</p>}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>

          {/* ── Capacidade mês a mês ── */}
          <Card className="p-6">
            <Secao>Capacidade Operacional — Mês a Mês</Secao>
            {meses.length === 0 ? (
              <p className="text-sm text-gray-400">Ajuste o período nos filtros.</p>
            ) : (
              <div className="flex flex-col gap-6">
                <div className="overflow-x-auto">
                  <div className="flex items-end gap-3" style={{ minWidth: `${meses.length * 64}px` }}>
                    {meses.map((m) => (
                      <div key={m.key} className="flex flex-1 flex-col items-center gap-1">
                        <div className="flex w-full items-end justify-center gap-1" style={{ height: "80px" }}>
                          <div className="w-5 rounded-t-md bg-folk/70 transition-all duration-700"
                            style={{ height: maxMes > 0 ? `${(m.iniciadas / maxMes) * 76}px` : "2px" }}
                            title={`Iniciadas: ${m.iniciadas}`} />
                          <div className="w-5 rounded-t-md bg-emerald-500/80 transition-all duration-700"
                            style={{ height: maxMes > 0 ? `${(m.concluidas / maxMes) * 76}px` : "2px" }}
                            title={`Concluídas: ${m.concluidas}`} />
                        </div>
                        <p className="text-[10px] text-gray-500">{m.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-4 text-xs">
                  <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-folk/70" /> Iniciadas</span>
                  <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-emerald-500/80" /> Finalizadas</span>
                </div>
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50 text-xs">
                        <th className="py-2.5 pl-4 text-left font-semibold uppercase tracking-wide text-gray-500">Mês</th>
                        <th className="py-2.5 pr-4 text-center font-semibold uppercase tracking-wide text-gray-500">Iniciadas</th>
                        <th className="py-2.5 pr-4 text-center font-semibold uppercase tracking-wide text-gray-500">Finalizadas</th>
                        <th className="py-2.5 pr-4 text-center font-semibold uppercase tracking-wide text-gray-500">Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {meses.map((m, i) => (
                        <tr key={m.key} className={`border-b border-gray-50 last:border-0 ${i % 2 === 0 ? "" : "bg-gray-50/50"}`}>
                          <td className="py-2.5 pl-4 font-medium text-gray-700">{m.label}</td>
                          <td className="py-2.5 pr-4 text-center font-semibold text-folk">{m.iniciadas}</td>
                          <td className="py-2.5 pr-4 text-center font-semibold text-emerald-600">{m.concluidas}</td>
                          <td className="py-2.5 pr-4 text-center">
                            <span className={`font-bold ${m.saldo > 0 ? "text-amber-600" : m.saldo < 0 ? "text-blue-600" : "text-gray-400"}`}>
                              {m.saldo > 0 ? `+${m.saldo}` : m.saldo}
                            </span>
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                        <td className="py-2.5 pl-4 text-gray-700">Total</td>
                        <td className="py-2.5 pr-4 text-center text-folk">{meses.reduce((s, m) => s + m.iniciadas, 0)}</td>
                        <td className="py-2.5 pr-4 text-center text-emerald-600">{meses.reduce((s, m) => s + m.concluidas, 0)}</td>
                        <td className="py-2.5 pr-4 text-center">
                          {(() => {
                            const s = meses.reduce((acc, m) => acc + m.saldo, 0);
                            return <span className={`font-bold ${s > 0 ? "text-amber-600" : s < 0 ? "text-blue-600" : "text-gray-400"}`}>{s > 0 ? `+${s}` : s}</span>;
                          })()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Card>

          {/* ── KPIs de prazo ── */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <KPICard label="No Prazo"       value={pctPrazo !== null ? `${pctPrazo}%` : "—"} sub={`${noPrazoFin.length} de ${comAmbas.length}`}    cor={pctPrazo !== null && pctPrazo >= 70 ? "green" : "amber"} deltaSem={null} deltaMes={null} />
            <KPICard label="Com Atraso"      value={atrasadasFin.length > 0 ? `${100 - (pctPrazo ?? 0)}%` : "—"} sub={`${atrasadasFin.length} de ${comAmbas.length}`} cor={atrasadasFin.length > 0 ? "red" : "default"} deltaSem={null} deltaMes={null} />
            <KPICard label="Atraso Médio"    value={atrasoMedio > 0 ? `${atrasoMedio}d` : "—"} sub="obras com atraso" cor={atrasoMedio > 14 ? "red" : atrasoMedio > 0 ? "amber" : "default"} deltaSem={null} deltaMes={null} />
            <KPICard label="Vencem em 7d"    value={vencemEm7.length} sub="obras com prazo próximo" cor={vencemEm7.length > 0 ? "amber" : "default"} deltaSem={null} deltaMes={null} />
          </div>

          {/* ── Performance por técnico ── */}
          {porTecnico.length > 0 && (
            <Card className="p-6">
              <Secao>Performance por Técnico</Secao>
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-xs">
                      <th className="py-2.5 pl-4 text-left font-semibold uppercase tracking-wide text-gray-500">Técnico</th>
                      <th className="py-2.5 pr-4 text-center font-semibold uppercase tracking-wide text-gray-500">Total</th>
                      <th className="py-2.5 pr-4 text-center font-semibold uppercase tracking-wide text-gray-500">Finalizadas</th>
                      <th className="py-2.5 pr-4 text-center font-semibold uppercase tracking-wide text-gray-500">% no Prazo</th>
                      <th className="py-2.5 pr-4 text-center font-semibold uppercase tracking-wide text-gray-500">Atraso Médio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {porTecnico.map((t, i) => (
                      <tr key={t.nome} className={`border-b border-gray-50 last:border-0 ${i % 2 === 0 ? "" : "bg-gray-50/50"}`}>
                        <td className="py-3 pl-4 font-medium text-gray-800">{t.nome}</td>
                        <td className="py-3 pr-4 text-center text-gray-600">{t.total}</td>
                        <td className="py-3 pr-4 text-center font-semibold text-emerald-600">{t.fin}</td>
                        <td className="py-3 pr-4 text-center">
                          {t.pctPrazo !== null ? (
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                              t.pctPrazo >= 80 ? "bg-emerald-100 text-emerald-700"
                              : t.pctPrazo >= 50 ? "bg-amber-100 text-amber-700"
                              : "bg-red-100 text-red-700"
                            }`}>{t.pctPrazo}%</span>
                          ) : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="py-3 pr-4 text-center">
                          {t.atrasoMedio > 0
                            ? <span className="font-semibold text-amber-600">{t.atrasoMedio}d</span>
                            : <span className="text-gray-400">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {total === 0 && !carregando && (
            <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-16 text-center text-sm text-gray-400">
              Nenhuma obra encontrada para o período e filtros selecionados.
            </div>
          )}

        </div>
      )}
    </main>
  );
}
