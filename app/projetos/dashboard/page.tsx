"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  listarObras, SITUACOES_OBRA, EQUIPES,
  labelSituacaoObra, labelEquipe, formatData,
  type Obra, type SituacaoObra, type Equipe,
} from "@/lib/projetos";
import { listarTecnicos, type Tecnico } from "@/lib/cadastros";
import { Card, Alert } from "@/app/components/ui";

// ── Helpers ──────────────────────────────────────────────────

function diasEntre(antes: string, depois: string): number {
  return Math.round((new Date(depois + "T00:00:00").getTime() - new Date(antes + "T00:00:00").getTime()) / 86_400_000);
}

function hojeStr(): string { return new Date().toISOString().slice(0, 10); }

const MESES_ABREV = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function mesesNoPeriodo(inicio: string, fim: string): string[] {
  const lista: string[] = [];
  const cur = new Date(inicio + "T00:00:00");
  const end = new Date(fim   + "T00:00:00");
  while (cur <= end) {
    lista.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`);
    cur.setMonth(cur.getMonth() + 1);
    if (lista.length > 36) break; // segurança
  }
  return lista;
}

function labelMes(key: string): string {
  const [ano, mes] = key.split("-");
  return `${MESES_ABREV[parseInt(mes) - 1]}/${ano.slice(2)}`;
}

function dentroDeMes(data: string | null | undefined, mesKey: string): boolean {
  return !!data && data.slice(0, 7) === mesKey;
}

// ── Constantes visuais ────────────────────────────────────────

const STATUS_COR: Record<SituacaoObra, string>  = {
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

const DIAS_ALERTA = 90;

const LABEL = "text-xs font-semibold uppercase tracking-wide text-gray-500";
const INPUT = "rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none focus:border-folk focus:ring-2 focus:ring-folk/10";

// ── Sub-componentes ───────────────────────────────────────────

function KPICard({ label, value, sub, cor = "default" }: {
  label: string; value: string | number; sub?: string;
  cor?: "default" | "green" | "red" | "amber";
}) {
  const cls = { default: "text-gray-900", green: "text-green-600", red: "text-red-600", amber: "text-amber-600" }[cor];
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className={`text-3xl font-black ${cls}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

function BarraHorizontal({ value, max, color, label, count }: {
  value: number; max: number; color: string; label: string; count: number;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-right text-xs text-gray-500">{label}</span>
      <div className="h-6 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="w-6 shrink-0 text-xs font-bold text-gray-700">{count}</span>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────

const hoje = hojeStr();
const anoAtual = hoje.slice(0, 4);

interface Filtros {
  dataInicio: string;
  dataFim:    string;
  equipe:     Equipe | "";
  tecnicoId:  string;
}

export default function ProjetosDashboardPage() {
  const [obras,     setObras]     = useState<Obra[]>([]);
  const [tecnicos,  setTecnicos]  = useState<Tecnico[]>([]);
  const [carregando,setCarregando]= useState(true);
  const [erro,      setErro]      = useState<string | null>(null);
  const [filtros,   setFiltros]   = useState<Filtros>({
    dataInicio: `${anoAtual}-01-01`,
    dataFim:    `${anoAtual}-12-31`,
    equipe:     "",
    tecnicoId:  "",
  });

  const carregar = useCallback(async () => {
    setCarregando(true); setErro(null);
    try {
      const [lista, tecs] = await Promise.all([
        listarObras(),
        listarTecnicos({ ativo: true }),
      ]);
      setObras(lista);
      setTecnicos(tecs);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar.");
    } finally { setCarregando(false); }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  function setF<K extends keyof Filtros>(k: K, v: Filtros[K]) {
    setFiltros((p) => ({ ...p, [k]: v }));
  }

  // ── Filtro client-side ──────────────────────────────────────

  const filtradas = obras.filter((o) => {
    if (filtros.dataInicio && o.data_inicio < filtros.dataInicio) return false;
    if (filtros.dataFim    && o.data_inicio > filtros.dataFim)    return false;
    if (filtros.equipe     && o.equipe !== filtros.equipe)        return false;
    if (filtros.tecnicoId  && o.tecnico_id !== filtros.tecnicoId) return false;
    return true;
  });

  // ── KPIs ────────────────────────────────────────────────────

  const total       = filtradas.length;
  const finalizadas = filtradas.filter((o) => o.situacao === "finalizada");
  const comAmbas    = finalizadas.filter((o) => o.data_conclusao && o.data_prazo);
  const noPrazo     = comAmbas.filter((o) => o.data_conclusao! <= o.data_prazo!);
  const atrasadas   = comAmbas.filter((o) => o.data_conclusao! >  o.data_prazo!);
  const pctPrazo    = comAmbas.length > 0 ? Math.round((noPrazo.length  / comAmbas.length) * 100) : null;
  const pctAtraso   = comAmbas.length > 0 ? Math.round((atrasadas.length / comAmbas.length) * 100) : null;
  const atrasoMedio = atrasadas.length > 0
    ? Math.round(atrasadas.reduce((s, o) => s + diasEntre(o.data_prazo!, o.data_conclusao!), 0) / atrasadas.length)
    : 0;

  // ── Status distribution ────────────────────────────────────

  const porStatus = SITUACOES_OBRA.map((s) => ({
    ...s,
    count: filtradas.filter((o) => o.situacao === s.value).length,
  }));
  const maxStatus = Math.max(...porStatus.map((s) => s.count), 1);

  // ── Capacidade mês a mês ───────────────────────────────────

  const meses = mesesNoPeriodo(filtros.dataInicio, filtros.dataFim).map((key) => {
    const iniciadas   = filtradas.filter((o) => dentroDeMes(o.data_inicio_previsto ?? o.data_inicio, key)).length;
    const concluidas  = filtradas.filter((o) => dentroDeMes(o.data_conclusao, key)).length;
    return { key, label: labelMes(key), iniciadas, concluidas, saldo: iniciadas - concluidas };
  });
  const maxMes = Math.max(...meses.flatMap((m) => [m.iniciadas, m.concluidas]), 1);

  // ── Alertas ─────────────────────────────────────────────────

  const paralisadas      = filtradas.filter((o) => o.situacao === "paralizada");
  const prazoVencido     = filtradas.filter((o) => o.data_prazo && hoje > o.data_prazo && o.situacao !== "finalizada");
  const execucaoLonga    = filtradas.filter((o) => o.situacao === "em_execucao" && diasEntre(o.data_inicio, hoje) > DIAS_ALERTA);

  // ── Performance por técnico ─────────────────────────────────

  const proprias = filtradas.filter((o) => o.equipe === "equipe_propria" && o.tecnico_nome);
  const porTecnico = Object.values(
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

  // ── Render ───────────────────────────────────────────────────

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      {/* Cabeçalho */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/projetos" className="text-sm text-gray-400 hover:text-gray-600">← Gerência de Projetos</Link>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">Dashboard de Obras</h1>
          <p className="mt-1 text-sm text-gray-500">Eficiência operacional, prazos e capacidade</p>
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
      </Card>

      {erro && <Alert status="error" message={erro} />}

      {carregando ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-folk" />
        </div>
      ) : (
        <div className="flex flex-col gap-6">

          {/* ── BLOCO 1 — KPIs ───────────────────────────────── */}
          <section>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-400">Visão geral</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <KPICard label="Total de obras"      value={total} />
              <KPICard label="Finalizadas"          value={finalizadas.length} cor="green" />
              <KPICard
                label="No prazo"
                value={pctPrazo !== null ? `${pctPrazo}%` : "—"}
                sub={`${noPrazo.length} de ${comAmbas.length}`}
                cor="green"
              />
              <KPICard
                label="Atrasadas"
                value={pctAtraso !== null ? `${pctAtraso}%` : "—"}
                sub={`${atrasadas.length} de ${comAmbas.length}`}
                cor={atrasadas.length > 0 ? "red" : "default"}
              />
              <KPICard
                label="Atraso médio"
                value={atrasoMedio > 0 ? `${atrasoMedio}d` : "—"}
                sub="obras com atraso"
                cor={atrasoMedio > 0 ? "amber" : "default"}
              />
            </div>
          </section>

          {/* ── BLOCO 2 + ALERTAS — grid lateral ─────────────── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

            {/* BLOCO 2 — Status */}
            <Card className="p-6">
              <h2 className="mb-4 text-sm font-bold text-gray-800">Obras por status</h2>
              {total === 0 ? (
                <p className="text-sm text-gray-400">Nenhuma obra no período.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {porStatus.map((s) => (
                    <BarraHorizontal
                      key={s.value}
                      label={s.label}
                      value={s.count}
                      count={s.count}
                      max={maxStatus}
                      color={STATUS_COR[s.value as SituacaoObra]}
                    />
                  ))}
                  {/* Stacked bar resumida */}
                  {total > 0 && (
                    <div className="mt-2 flex h-4 w-full overflow-hidden rounded-full">
                      {porStatus.filter((s) => s.count > 0).map((s) => (
                        <div
                          key={s.value}
                          title={`${s.label}: ${s.count}`}
                          className="h-full transition-all"
                          style={{ width: `${(s.count / total) * 100}%`, background: STATUS_COR[s.value as SituacaoObra] }}
                        />
                      ))}
                    </div>
                  )}
                  <div className="mt-1 flex flex-wrap gap-3">
                    {porStatus.filter((s) => s.count > 0).map((s) => (
                      <span key={s.value} className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${STATUS_BG[s.value as SituacaoObra]}`}>
                        {s.label}: {s.count}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {/* BLOCO 4 — Alertas */}
            <Card className="p-6">
              <h2 className="mb-4 text-sm font-bold text-gray-800">Alertas operacionais</h2>
              {paralisadas.length === 0 && prazoVencido.length === 0 && execucaoLonga.length === 0 ? (
                <div className="flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
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
                            {o.cliente} · venceu {formatData(o.data_prazo!)} · {diasEntre(o.data_prazo!, hoje)}d atrás
                          </p>
                        ))}
                        {prazoVencido.length > 3 && <p className="text-xs text-amber-400">+ {prazoVencido.length - 3} outras</p>}
                      </div>
                    </div>
                  )}
                  {execucaoLonga.length > 0 && (
                    <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3">
                      <p className="text-sm font-bold text-orange-700">⏱ {execucaoLonga.length} obra{execucaoLonga.length !== 1 ? "s" : ""} em execução há +{DIAS_ALERTA} dias</p>
                      <div className="mt-1.5 flex flex-col gap-1">
                        {execucaoLonga.slice(0, 3).map((o) => (
                          <p key={o.id} className="text-xs text-orange-600">
                            {o.cliente} · {diasEntre(o.data_inicio, hoje)}d em execução
                          </p>
                        ))}
                        {execucaoLonga.length > 3 && <p className="text-xs text-orange-400">+ {execucaoLonga.length - 3} outras</p>}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>

          {/* ── BLOCO 3 — Capacidade mês a mês ───────────────── */}
          <Card className="p-6">
            <h2 className="mb-5 text-sm font-bold text-gray-800">Capacidade operacional — mês a mês</h2>
            {meses.length === 0 ? (
              <p className="text-sm text-gray-400">Ajuste o período nos filtros.</p>
            ) : (
              <div className="flex flex-col gap-6">
                {/* Gráfico de barras duplas */}
                <div className="overflow-x-auto">
                  <div className="flex items-end gap-3" style={{ minWidth: `${meses.length * 64}px` }}>
                    {meses.map((m) => (
                      <div key={m.key} className="flex flex-1 flex-col items-center gap-1">
                        <div className="flex w-full items-end justify-center gap-1" style={{ height: "80px" }}>
                          {/* Iniciadas */}
                          <div
                            className="w-5 rounded-t-md bg-folk/70 transition-all duration-700"
                            style={{ height: maxMes > 0 ? `${(m.iniciadas / maxMes) * 76}px` : "2px" }}
                            title={`Iniciadas: ${m.iniciadas}`}
                          />
                          {/* Concluídas */}
                          <div
                            className="w-5 rounded-t-md bg-green-500/80 transition-all duration-700"
                            style={{ height: maxMes > 0 ? `${(m.concluidas / maxMes) * 76}px` : "2px" }}
                            title={`Concluídas: ${m.concluidas}`}
                          />
                        </div>
                        <p className="text-[10px] text-gray-500">{m.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Legenda */}
                <div className="flex gap-4 text-xs">
                  <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-folk/70" /> Iniciadas</span>
                  <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-green-500/80" /> Finalizadas</span>
                </div>
                {/* Tabela */}
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
                          <td className="py-2.5 pr-4 text-center font-semibold text-[#F05A28]">{m.iniciadas}</td>
                          <td className="py-2.5 pr-4 text-center font-semibold text-green-600">{m.concluidas}</td>
                          <td className="py-2.5 pr-4 text-center">
                            <span className={`font-bold ${m.saldo > 0 ? "text-amber-600" : m.saldo < 0 ? "text-blue-600" : "text-gray-400"}`}>
                              {m.saldo > 0 ? `+${m.saldo}` : m.saldo}
                            </span>
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                        <td className="py-2.5 pl-4 text-gray-700">Total</td>
                        <td className="py-2.5 pr-4 text-center text-[#F05A28]">{meses.reduce((s, m) => s + m.iniciadas, 0)}</td>
                        <td className="py-2.5 pr-4 text-center text-green-600">{meses.reduce((s, m) => s + m.concluidas, 0)}</td>
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

          {/* ── BLOCO 5 — Performance por técnico ─────────────── */}
          {porTecnico.length > 0 && (
            <Card className="p-6">
              <h2 className="mb-4 text-sm font-bold text-gray-800">Performance por técnico</h2>
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-xs">
                      <th className="py-2.5 pl-4 text-left font-semibold uppercase tracking-wide text-gray-500">Técnico</th>
                      <th className="py-2.5 pr-4 text-center font-semibold uppercase tracking-wide text-gray-500">Total</th>
                      <th className="py-2.5 pr-4 text-center font-semibold uppercase tracking-wide text-gray-500">Finalizadas</th>
                      <th className="py-2.5 pr-4 text-center font-semibold uppercase tracking-wide text-gray-500">% no prazo</th>
                      <th className="py-2.5 pr-4 text-center font-semibold uppercase tracking-wide text-gray-500">Atraso médio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {porTecnico.map((t, i) => (
                      <tr key={t.nome} className={`border-b border-gray-50 last:border-0 ${i % 2 === 0 ? "" : "bg-gray-50/50"}`}>
                        <td className="py-3 pl-4 font-medium text-gray-800">{t.nome}</td>
                        <td className="py-3 pr-4 text-center text-gray-600">{t.total}</td>
                        <td className="py-3 pr-4 text-center font-semibold text-green-600">{t.fin}</td>
                        <td className="py-3 pr-4 text-center">
                          {t.pctPrazo !== null ? (
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                              t.pctPrazo >= 80 ? "bg-green-100 text-green-700" :
                              t.pctPrazo >= 50 ? "bg-amber-100 text-amber-700" :
                              "bg-red-100 text-red-700"
                            }`}>
                              {t.pctPrazo}%
                            </span>
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
