"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  listarVendas, listarPipeline, formatMoeda,
  TIPOS_VENDA, SERVICOS_COMERCIAL, STATUS_PIPELINE, TEMPERATURAS,
  labelTipoVenda, labelStatusPipeline, labelTemperatura,
  type Venda, type PipelineItem, type TipoVenda, type StatusPipeline, type Temperatura,
} from "@/lib/comercial";
import { listarVendedores, type Vendedor } from "@/lib/cadastros";
import { Card, Alert } from "@/app/components/ui";

// ── Helpers ──────────────────────────────────────────────────

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

function hojeStr() { return new Date().toISOString().slice(0, 10); }

// ── Constantes visuais ────────────────────────────────────────

const SERVICO_CORES: Record<string, string> = {
  "Portaria Remota":        "#F05A28",
  "CFTV":                   "#6366f1",
  "Alarme":                 "#f59e0b",
  "Monitoramento de Alarme":"#10b981",
  "Controle de Acesso":     "#3b82f6",
  "Retrofit":               "#8b5cf6",
};

const TEMP_COR: Record<Temperatura, string> = {
  fria:   "#93c5fd",
  morna:  "#fbbf24",
  quente: "#f87171",
};

const STATUS_PIPE_COR: Record<StatusPipeline, string> = {
  apresentacao:  "#94a3b8",
  em_analise:    "#f59e0b",
  assinatura:    "#F05A28",
  declinado:     "#ef4444",
  fechado_ganho: "#059669",
};

const LABEL = "text-xs font-semibold uppercase tracking-wide text-gray-500";
const INPUT = "rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none focus:border-folk focus:ring-2 focus:ring-folk/10";

// ── Sub-componentes ───────────────────────────────────────────

function KPICard({ label, value, sub, cor = "default" }: {
  label: string; value: string | number; sub?: string;
  cor?: "default" | "green" | "red" | "amber" | "folk";
}) {
  const cls = {
    default: "text-gray-900",
    green:   "text-green-600",
    red:     "text-red-600",
    amber:   "text-amber-600",
    folk:    "text-[#F05A28]",
  }[cor];
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className={`text-3xl font-black ${cls}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

function BarraH({ label, value, max, color, sub }: {
  label: string; value: number; max: number; color: string; sub?: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-36 shrink-0 truncate text-right text-xs text-gray-500" title={label}>{label}</span>
      <div className="h-5 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="w-24 shrink-0 text-right text-xs font-semibold text-gray-700">{sub ?? String(value)}</span>
    </div>
  );
}

// ── Filtros ───────────────────────────────────────────────────

const anoAtual = new Date().getFullYear();

interface Filtros {
  dataInicio:  string;
  dataFim:     string;
  vendedorId:  string;
  tipoVenda:   TipoVenda | "";
}

// ── Componente principal ──────────────────────────────────────

export default function ComercialDashboardPage() {
  const [vendas,     setVendas]     = useState<Venda[]>([]);
  const [pipeline,   setPipeline]   = useState<PipelineItem[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro,       setErro]       = useState<string | null>(null);
  const [filtros,    setFiltros]    = useState<Filtros>({
    dataInicio: `${anoAtual}-01-01`,
    dataFim:    `${anoAtual}-12-31`,
    vendedorId: "",
    tipoVenda:  "",
  });

  const carregar = useCallback(async () => {
    setCarregando(true); setErro(null);
    try {
      const [paginaVendas, p, vends] = await Promise.all([
        listarVendas({ porPagina: 10000 }),
        listarPipeline(),
        listarVendedores({ ativo: true }),
      ]);
      setVendas(paginaVendas.registros);
      setPipeline(p);
      setVendedores(vends);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar.");
    } finally { setCarregando(false); }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  function setF<K extends keyof Filtros>(k: K, v: Filtros[K]) {
    setFiltros((p) => ({ ...p, [k]: v }));
  }

  // ── Filtro client-side ──────────────────────────────────────

  const filtradas = vendas.filter((v) => {
    if (filtros.dataInicio && v.data_fechamento < filtros.dataInicio) return false;
    if (filtros.dataFim    && v.data_fechamento > filtros.dataFim)    return false;
    if (filtros.vendedorId && v.vendedor_id !== filtros.vendedorId)   return false;
    if (filtros.tipoVenda  && v.tipo_venda  !== filtros.tipoVenda)    return false;
    return true;
  });

  // ── KPIs ────────────────────────────────────────────────────

  const totalVendas    = filtradas.length;
  const receitaTotal   = filtradas.reduce((s, v) => s + v.valor_implantacao + v.valor_mensal, 0);
  const ticketMedio    = totalVendas > 0 ? receitaTotal / totalVendas : 0;
  const recorrentes    = filtradas.filter((v) => v.tipo_venda === "recorrente");
  const pctRecorrente  = totalVendas > 0 ? Math.round((recorrentes.length / totalVendas) * 100) : 0;
  const viaPipeline    = filtradas.filter((v) => v.pipeline_id);
  const pctPipeline    = totalVendas > 0 ? Math.round((viaPipeline.length / totalVendas) * 100) : 0;
  const comIndicacao   = filtradas.filter((v) => v.indicado_por?.trim());

  // ── Receita por serviço ─────────────────────────────────────

  const receitaServico = SERVICOS_COMERCIAL.map((s) => {
    const vendasComServico = filtradas.filter((v) => v.servicos?.includes(s));
    return {
      servico: s,
      receita: vendasComServico.reduce((acc, v) => acc + v.valor_implantacao + v.valor_mensal, 0),
      contratos: vendasComServico.length,
    };
  }).filter((s) => s.contratos > 0).sort((a, b) => b.receita - a.receita);

  const maxReceita = Math.max(...receitaServico.map((s) => s.receita), 1);

  // ── Evolução mensal ─────────────────────────────────────────

  const meses = mesesNoPeriodo(filtros.dataInicio, filtros.dataFim).map((key) => {
    const doMes = filtradas.filter((v) => v.data_fechamento.slice(0, 7) === key);
    return {
      key,
      label:     labelMes(key),
      receita:   doMes.reduce((s, v) => s + v.valor_implantacao + v.valor_mensal, 0),
      contratos: doMes.length,
      recorrente: doMes.filter((v) => v.tipo_venda === "recorrente").length,
    };
  });
  const maxMes = Math.max(...meses.map((m) => m.receita), 1);

  // ── Performance por vendedor ─────────────────────────────────

  const porVendedor = Object.values(
    filtradas.reduce((acc, v) => {
      const nome = v.vendedor_nome ?? "Sem vendedor";
      if (!acc[nome]) acc[nome] = { nome, contratos: 0, receita: 0, recorrente: 0, pipeline: 0 };
      acc[nome].contratos  += 1;
      acc[nome].receita    += v.valor_implantacao + v.valor_mensal;
      if (v.tipo_venda === "recorrente")  acc[nome].recorrente += 1;
      if (v.pipeline_id)                 acc[nome].pipeline   += 1;
      return acc;
    }, {} as Record<string, { nome: string; contratos: number; receita: number; recorrente: number; pipeline: number }>)
  ).sort((a, b) => b.receita - a.receita);

  // ── Pipeline ─────────────────────────────────────────────────

  const hoje = hojeStr();
  const pipelineAtivos         = pipeline.filter((p) => !["declinado", "fechado_ganho"].includes(p.status));
  const valorImplantacaoPotencial = pipelineAtivos.reduce((s, p) => s + p.valor_implantacao, 0);
  const valorMensalPotencial      = pipelineAtivos.reduce((s, p) => s + p.valor_mensal, 0);
  const convertidos       = pipeline.filter((p) => p.convertido_em_venda);
  const taxaConversao     = pipeline.length > 0 ? Math.round((convertidos.length / pipeline.length) * 100) : 0;

  const porStatusPipeline = STATUS_PIPELINE.map((s) => ({
    ...s,
    count: pipeline.filter((p) => p.status === s.value).length,
    valor: pipeline.filter((p) => p.status === s.value).reduce((acc, p) => acc + p.valor_implantacao + p.valor_mensal, 0),
  })).filter((s) => s.count > 0);
  const maxStatusPipe = Math.max(...porStatusPipeline.map((s) => s.count), 1);

  const porTemp = TEMPERATURAS.map((t) => ({
    ...t,
    count: pipelineAtivos.filter((p) => p.temperatura === t.value).length,
    valor: pipelineAtivos.filter((p) => p.temperatura === t.value).reduce((s, p) => s + p.valor_implantacao + p.valor_mensal, 0),
  }));
  const maxTemp = Math.max(...porTemp.map((t) => t.count), 1);

  // ── Tipo de venda ────────────────────────────────────────────

  const receitaRecorrente  = recorrentes.reduce((s, v) => s + v.valor_implantacao + v.valor_mensal, 0);
  const receitaDireta      = filtradas.filter((v) => v.tipo_venda === "venda_direta").reduce((s, v) => s + v.valor_implantacao + v.valor_mensal, 0);

  // ── Render ────────────────────────────────────────────────────

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      {/* Cabeçalho */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <Link href="/comercial" className="text-sm text-gray-400 hover:text-gray-600">← Comercial</Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">Dashboard Comercial</h1>
          <p className="mt-1 text-sm text-gray-500">Receita, performance de vendedores e saúde do pipeline</p>
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
            <label className={LABEL}>Vendedor</label>
            <select value={filtros.vendedorId} onChange={(e) => setF("vendedorId", e.target.value)} className={INPUT}>
              <option value="">Todos</option>
              {vendedores.map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Tipo de venda</label>
            <select value={filtros.tipoVenda} onChange={(e) => setF("tipoVenda", e.target.value as TipoVenda | "")} className={INPUT}>
              <option value="">Todos</option>
              {TIPOS_VENDA.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
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
              <KPICard label="Total de vendas"  value={totalVendas} />
              <KPICard label="Receita total"    value={formatMoeda(receitaTotal)} cor="folk"
                sub={totalVendas > 0 ? `${totalVendas} contrato${totalVendas !== 1 ? "s" : ""}` : undefined} />
              <KPICard label="Ticket médio"     value={formatMoeda(ticketMedio)} cor="green" />
              <KPICard label="Recorrente"       value={`${pctRecorrente}%`} cor="amber"
                sub={`${recorrentes.length} de ${totalVendas}`} />
              <KPICard label="Via pipeline"     value={`${pctPipeline}%`}
                sub={`${viaPipeline.length} de ${totalVendas}`} />
            </div>
          </section>

          {/* ── BLOCO 2 + 3 — Serviços e Tipo ───────────────── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

            {/* Receita por serviço */}
            <Card className="p-6">
              <h2 className="mb-4 text-sm font-bold text-gray-800">Receita por serviço</h2>
              {receitaServico.length === 0 ? (
                <p className="text-sm text-gray-400">Nenhuma venda no período.</p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {receitaServico.map((s) => (
                    <BarraH
                      key={s.servico}
                      label={s.servico}
                      value={s.receita}
                      max={maxReceita}
                      color={SERVICO_CORES[s.servico] ?? "#94a3b8"}
                      sub={formatMoeda(s.receita)}
                    />
                  ))}
                  {/* Stacked bar */}
                  {receitaTotal > 0 && (
                    <div className="mt-2 flex h-3 w-full overflow-hidden rounded-full">
                      {receitaServico.map((s) => (
                        <div
                          key={s.servico}
                          title={`${s.servico}: ${formatMoeda(s.receita)}`}
                          className="h-full transition-all"
                          style={{ width: `${(s.receita / receitaTotal) * 100}%`, background: SERVICO_CORES[s.servico] ?? "#94a3b8" }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>

            {/* Tipo de venda + Origem */}
            <div className="flex flex-col gap-4">
              <Card className="flex-1 p-6">
                <h2 className="mb-4 text-sm font-bold text-gray-800">Tipo de venda</h2>
                <div className="flex flex-col gap-3">
                  <BarraH label="Recorrente"   value={receitaRecorrente} max={receitaTotal} color="#F05A28" sub={formatMoeda(receitaRecorrente)} />
                  <BarraH label="Venda direta" value={receitaDireta}     max={receitaTotal} color="#6366f1" sub={formatMoeda(receitaDireta)} />
                  {receitaTotal > 0 && (
                    <div className="mt-1 flex h-3 overflow-hidden rounded-full">
                      <div className="h-full bg-[#F05A28] transition-all" style={{ width: `${(receitaRecorrente / receitaTotal) * 100}%` }} />
                      <div className="h-full bg-[#6366f1] transition-all" style={{ width: `${(receitaDireta / receitaTotal) * 100}%` }} />
                    </div>
                  )}
                </div>
              </Card>
              <Card className="flex-1 p-6">
                <h2 className="mb-4 text-sm font-bold text-gray-800">Origem das vendas</h2>
                <div className="flex flex-col gap-3">
                  <BarraH label="Via pipeline" value={viaPipeline.length}                       max={totalVendas} color="#10b981" sub={`${viaPipeline.length} vendas`} />
                  <BarraH label="Com indicação" value={comIndicacao.length}                      max={totalVendas} color="#f59e0b" sub={`${comIndicacao.length} vendas`} />
                  <BarraH label="Diretas"       value={totalVendas - viaPipeline.length}         max={totalVendas} color="#94a3b8" sub={`${totalVendas - viaPipeline.length} vendas`} />
                </div>
              </Card>
            </div>
          </div>

          {/* ── BLOCO 4 — Evolução mensal ─────────────────────── */}
          <Card className="p-6">
            <h2 className="mb-5 text-sm font-bold text-gray-800">Evolução mensal de receita</h2>
            {meses.length === 0 ? (
              <p className="text-sm text-gray-400">Ajuste o período.</p>
            ) : (
              <div className="flex flex-col gap-6">
                {/* Gráfico */}
                <div className="overflow-x-auto">
                  <div className="flex items-end gap-2" style={{ minWidth: `${meses.length * 60}px` }}>
                    {meses.map((m) => (
                      <div key={m.key} className="flex flex-1 flex-col items-center gap-1">
                        <span className="text-[9px] font-semibold text-gray-400">
                          {m.receita > 0 ? formatMoeda(m.receita).replace("R$\u00a0","R$").replace(/\.000$/,"k") : ""}
                        </span>
                        <div className="flex w-full items-end justify-center gap-0.5" style={{ height: "72px" }}>
                          {/* Recorrente */}
                          <div
                            className="w-4 rounded-t-md bg-[#F05A28]/80 transition-all duration-700"
                            style={{ height: maxMes > 0 ? `${(m.recorrente > 0 ? (filtradas.filter(v => v.data_fechamento.slice(0,7)===m.key && v.tipo_venda==="recorrente").reduce((s,v)=>s+v.valor_implantacao+v.valor_mensal,0) / maxMes) * 68 : 2)}px` : "2px" }}
                            title={`Recorrente: ${formatMoeda(filtradas.filter(v => v.data_fechamento.slice(0,7)===m.key && v.tipo_venda==="recorrente").reduce((s,v)=>s+v.valor_implantacao+v.valor_mensal,0))}`}
                          />
                          {/* Direta */}
                          <div
                            className="w-4 rounded-t-md bg-[#6366f1]/80 transition-all duration-700"
                            style={{ height: maxMes > 0 ? `${(filtradas.filter(v => v.data_fechamento.slice(0,7)===m.key && v.tipo_venda==="venda_direta").reduce((s,v)=>s+v.valor_implantacao+v.valor_mensal,0) / maxMes) * 68}px` : "2px" }}
                            title="Venda direta"
                          />
                        </div>
                        <p className="text-[10px] text-gray-500">{m.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-4 text-xs">
                  <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-[#F05A28]/80" /> Recorrente</span>
                  <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-[#6366f1]/80" /> Venda direta</span>
                </div>
                {/* Tabela */}
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50 text-xs">
                        <th className="py-2.5 pl-4 text-left font-semibold uppercase tracking-wide text-gray-500">Mês</th>
                        <th className="py-2.5 pr-4 text-center font-semibold uppercase tracking-wide text-gray-500">Contratos</th>
                        <th className="py-2.5 pr-4 text-center font-semibold uppercase tracking-wide text-gray-500">Receita</th>
                        <th className="py-2.5 pr-4 text-center font-semibold uppercase tracking-wide text-gray-500">Ticket médio</th>
                        <th className="py-2.5 pr-4 text-center font-semibold uppercase tracking-wide text-gray-500">Recorrente</th>
                      </tr>
                    </thead>
                    <tbody>
                      {meses.map((m, i) => (
                        <tr key={m.key} className={`border-b border-gray-50 last:border-0 ${i % 2 !== 0 ? "bg-gray-50/50" : ""}`}>
                          <td className="py-2.5 pl-4 font-medium text-gray-700">{m.label}</td>
                          <td className="py-2.5 pr-4 text-center text-gray-600">{m.contratos}</td>
                          <td className="py-2.5 pr-4 text-center font-semibold text-gray-800">{m.receita > 0 ? formatMoeda(m.receita) : "—"}</td>
                          <td className="py-2.5 pr-4 text-center text-gray-500">{m.contratos > 0 ? formatMoeda(m.receita / m.contratos) : "—"}</td>
                          <td className="py-2.5 pr-4 text-center">
                            {m.recorrente > 0
                              ? <span className="inline-flex items-center rounded-full bg-folk/10 px-2 py-0.5 text-xs font-semibold text-folk">{m.recorrente}</span>
                              : <span className="text-gray-400">—</span>}
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                        <td className="py-2.5 pl-4 text-gray-700">Total</td>
                        <td className="py-2.5 pr-4 text-center text-gray-700">{totalVendas}</td>
                        <td className="py-2.5 pr-4 text-center text-gray-900">{formatMoeda(receitaTotal)}</td>
                        <td className="py-2.5 pr-4 text-center text-gray-700">{totalVendas > 0 ? formatMoeda(ticketMedio) : "—"}</td>
                        <td className="py-2.5 pr-4 text-center">
                          <span className="inline-flex items-center rounded-full bg-folk/10 px-2 py-0.5 text-xs font-semibold text-folk">{recorrentes.length}</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Card>

          {/* ── BLOCO 5 — Performance por vendedor ───────────── */}
          {porVendedor.length > 0 && (
            <Card className="p-6">
              <h2 className="mb-4 text-sm font-bold text-gray-800">Performance por vendedor</h2>
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-xs">
                      <th className="py-2.5 pl-4 text-left font-semibold uppercase tracking-wide text-gray-500">Vendedor</th>
                      <th className="py-2.5 pr-4 text-center font-semibold uppercase tracking-wide text-gray-500">Contratos</th>
                      <th className="py-2.5 pr-4 text-center font-semibold uppercase tracking-wide text-gray-500">Receita</th>
                      <th className="py-2.5 pr-4 text-center font-semibold uppercase tracking-wide text-gray-500">Ticket médio</th>
                      <th className="py-2.5 pr-4 text-center font-semibold uppercase tracking-wide text-gray-500">Recorrente</th>
                      <th className="py-2.5 pr-4 text-center font-semibold uppercase tracking-wide text-gray-500">Via pipeline</th>
                    </tr>
                  </thead>
                  <tbody>
                    {porVendedor.map((v, i) => (
                      <tr key={v.nome} className={`border-b border-gray-50 last:border-0 ${i % 2 !== 0 ? "bg-gray-50/50" : ""}`}>
                        <td className="py-3 pl-4 font-medium text-gray-800">
                          <span className="mr-2">{["🥇","🥈","🥉"][i] ?? ""}</span>{v.nome}
                        </td>
                        <td className="py-3 pr-4 text-center text-gray-600">{v.contratos}</td>
                        <td className="py-3 pr-4 text-center font-semibold text-gray-800">{formatMoeda(v.receita)}</td>
                        <td className="py-3 pr-4 text-center text-gray-500">{formatMoeda(v.receita / v.contratos)}</td>
                        <td className="py-3 pr-4 text-center">
                          {v.recorrente > 0
                            ? <span className="inline-flex rounded-full bg-folk/10 px-2.5 py-0.5 text-xs font-bold text-folk">{v.recorrente}</span>
                            : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="py-3 pr-4 text-center">
                          {v.pipeline > 0
                            ? <span className="inline-flex rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-bold text-green-700">{v.pipeline}</span>
                            : <span className="text-gray-400">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* ── BLOCO 6 — Pipeline ────────────────────────────── */}
          <section>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-400">Saúde do pipeline</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 mb-4">
              <KPICard label="Propostas ativas"    value={pipelineAtivos.length} />
              <KPICard label="Implantação potencial" value={formatMoeda(valorImplantacaoPotencial)} cor="folk"
                sub="em propostas abertas" />
              <KPICard label="MRR potencial"     value={`${formatMoeda(valorMensalPotencial)}/mês`} cor="green"
                sub="receita mensal em aberto" />
              <KPICard label="Taxa de conversão" value={`${taxaConversao}%`} cor="green"
                sub={`${convertidos.length} de ${pipeline.length}`} />
              <KPICard label="Declinadas"
                value={pipeline.filter(p => p.status === "declinado").length}
                cor={pipeline.filter(p => p.status === "declinado").length > 0 ? "red" : "default"} />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Por status */}
              <Card className="p-6">
                <h2 className="mb-4 text-sm font-bold text-gray-800">Pipeline por status</h2>
                {porStatusPipeline.length === 0 ? (
                  <p className="text-sm text-gray-400">Nenhuma proposta.</p>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {porStatusPipeline.map((s) => (
                      <BarraH
                        key={s.value}
                        label={s.label}
                        value={s.count}
                        max={maxStatusPipe}
                        color={STATUS_PIPE_COR[s.value as StatusPipeline]}
                        sub={`${s.count} · ${formatMoeda(s.valor)}`}
                      />
                    ))}
                  </div>
                )}
              </Card>

              {/* Por temperatura */}
              <Card className="p-6">
                <h2 className="mb-4 text-sm font-bold text-gray-800">Pipeline por temperatura</h2>
                {pipelineAtivos.length === 0 ? (
                  <p className="text-sm text-gray-400">Nenhuma proposta ativa.</p>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2.5">
                      {porTemp.map((t) => (
                        <BarraH
                          key={t.value}
                          label={t.label}
                          value={t.count}
                          max={maxTemp}
                          color={TEMP_COR[t.value as Temperatura]}
                          sub={`${t.count} · ${formatMoeda(t.valor)}`}
                        />
                      ))}
                    </div>
                    {/* Stacked bar de temperatura */}
                    {pipelineAtivos.length > 0 && (
                      <div className="flex h-4 overflow-hidden rounded-full">
                        {porTemp.filter((t) => t.count > 0).map((t) => (
                          <div
                            key={t.value}
                            title={`${t.label}: ${t.count}`}
                            className="h-full transition-all"
                            style={{ width: `${(t.count / pipelineAtivos.length) * 100}%`, background: TEMP_COR[t.value as Temperatura] }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </div>
          </section>

          {totalVendas === 0 && pipeline.length === 0 && (
            <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-16 text-center text-sm text-gray-400">
              Nenhum dado encontrado para o período e filtros selecionados.
            </div>
          )}

        </div>
      )}
    </main>
  );
}
