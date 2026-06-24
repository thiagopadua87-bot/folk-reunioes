"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";

// ── Tipos ─────────────────────────────────────────────────────────

interface KPIs {
  totalAberto: number;
  valorAberto: number;
  faturasVencidas: number;
  semAcao: number;
  comPromessa: number;
  negociadas: number;
  juridico: number;
  protestadas: number;
  recebidas: number;
  valorRecebidoMes: number;
  maiorDevedor: { cliente: string; valor: number } | null;
}

interface MesRow    { mes: string; importado: number; recebido: number; em_aberto: number; qtd_total: number; qtd_recebida: number }
interface DiaRow    { dia: string; em_aberto: number; recebido: number }
interface AgingRow  { faixa: string; ordem: number; qtd: number; valor: number }
interface Top10Row  { cliente: string; qtd: number; valor: number }

interface DashData {
  kpis: KPIs;
  historicoMensal: MesRow[];
  historicoDiario: DiaRow[];
  aging: AgingRow[];
  top10: Top10Row[];
  mesesDisponiveis: string[];
}

// ── Helpers ───────────────────────────────────────────────────────

function moeda(v: number) {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function moedaCompacta(v: number) {
  if (v >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `R$${(v / 1_000).toFixed(0)}k`;
  return moeda(v);
}

function mesLabel(yyyymm: string) {
  const [y, m] = yyyymm.split("-");
  const meses = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return `${meses[parseInt(m) - 1]}/${y.slice(2)}`;
}

function diaLabel(yyyymmdd: string) {
  return yyyymmdd.slice(8); // só o dia
}

// ── Sub-componentes ───────────────────────────────────────────────

function KPICard({ titulo, valor, subtitulo, cor }: {
  titulo: string; valor: string | number; subtitulo?: string; cor: string;
}) {
  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${cor}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-60">{titulo}</p>
      <p className="mt-2 text-2xl font-black leading-tight">{valor}</p>
      {subtitulo && <p className="mt-1 text-xs opacity-55">{subtitulo}</p>}
    </div>
  );
}

function SecaoTitulo({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">{children}</h3>
  );
}

// ── Tooltip customizado ───────────────────────────────────────────

function TooltipMoeda({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-lg text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {moeda(p.value)}
        </p>
      ))}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────

export default function DashboardCobrancaTab() {
  const [dados, setDados]     = useState<DashData | null>(null);
  const [mes, setMes]         = useState("");
  const [loading, setLoading] = useState(true);
  const [erro, setErro]       = useState("");

  const carregar = useCallback(async (mesParam: string) => {
    setLoading(true);
    setErro("");
    try {
      const url = `/api/cobranca/dashboard${mesParam ? `?mes=${mesParam}` : ""}`;
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro desconhecido");
      setDados(json as DashData);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(mes); }, [mes, carregar]);

  const kpis   = dados?.kpis;
  const top10  = dados?.top10 ?? [];
  const aging  = dados?.aging ?? [];
  const mensal = (dados?.historicoMensal ?? []).map((r) => ({
    ...r,
    label:     mesLabel(r.mes),
    importado: Number(r.importado),
    recebido:  Number(r.recebido),
    em_aberto: Number(r.em_aberto),
  }));
  const diario = (dados?.historicoDiario ?? []).map((r) => ({
    label:     diaLabel(r.dia),
    em_aberto: Number(r.em_aberto),
    recebido:  Number(r.recebido),
  }));

  const valorMaxTop10 = top10.length > 0 ? Number(top10[0].valor) : 1;
  const valorTotalAging = aging.reduce((s, r) => s + Number(r.valor), 0);

  return (
    <div className="space-y-10">

      {/* Seletor de mês */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-600">Mês de referência:</label>
        <select
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-folk"
        >
          <option value="">Todos os meses</option>
          {(dados?.mesesDisponiveis ?? []).map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      {erro && <p className="text-sm text-red-600">{erro}</p>}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span className="animate-spin">⏳</span> Carregando dashboard...
        </div>
      ) : !kpis ? null : (
        <>
          {/* ── KPIs principais ──────────────────────────────────── */}
          <section>
            <SecaoTitulo>Visão geral</SecaoTitulo>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <KPICard
                titulo="Total em aberto"
                valor={moeda(kpis.valorAberto)}
                subtitulo={`${kpis.totalAberto} fatura(s) ativa(s)`}
                cor="bg-red-50 border-red-200 text-red-800"
              />
              <KPICard
                titulo="Faturas vencidas"
                valor={kpis.faturasVencidas}
                subtitulo="títulos em atraso"
                cor="bg-orange-50 border-orange-200 text-orange-800"
              />
              <KPICard
                titulo="Recebido no mês"
                valor={moeda(kpis.valorRecebidoMes)}
                subtitulo="recuperado no mês atual"
                cor="bg-green-50 border-green-200 text-green-800"
              />
              <KPICard
                titulo="Sem ação"
                valor={kpis.semAcao}
                subtitulo="aguardando abordagem"
                cor="bg-yellow-50 border-yellow-200 text-yellow-800"
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <KPICard titulo="Promessas"    valor={kpis.comPromessa}  cor="bg-blue-50 border-blue-200 text-blue-800" />
              <KPICard titulo="Negociadas"   valor={kpis.negociadas}   cor="bg-purple-50 border-purple-200 text-purple-800" />
              <KPICard titulo="Jurídico"     valor={kpis.juridico}     cor="bg-amber-50 border-amber-200 text-amber-800" />
              <KPICard titulo="Protestadas"  valor={kpis.protestadas}  cor="bg-red-50 border-red-200 text-red-800" />
            </div>
          </section>

          {/* ── Gráfico: histórico mensal (ano) ──────────────────── */}
          {mensal.length > 0 && (
            <section>
              <SecaoTitulo>Histórico mensal (últimos 12 meses)</SecaoTitulo>
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={mensal} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={moedaCompacta} tick={{ fontSize: 11 }} width={70} />
                    <Tooltip content={<TooltipMoeda />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="importado"  name="Importado"   fill="#93c5fd" radius={[4,4,0,0]} />
                    <Bar dataKey="recebido"   name="Recebido"    fill="#4ade80" radius={[4,4,0,0]} />
                    <Bar dataKey="em_aberto"  name="Em aberto"   fill="#f87171" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          {/* ── Aging ─────────────────────────────────────────────── */}
          {aging.length > 0 && (
            <section>
              <SecaoTitulo>Aging — faixas de atraso</SecaoTitulo>
              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Faixa</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Qtd</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Valor</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-40">% do total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {aging.map((row) => {
                      const pct = valorTotalAging > 0 ? (Number(row.valor) / valorTotalAging) * 100 : 0;
                      const cor =
                        row.ordem <= 2 ? "bg-yellow-400" :
                        row.ordem <= 4 ? "bg-orange-400" :
                        "bg-red-500";
                      return (
                        <tr key={row.faixa} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-5 py-3 font-medium text-gray-800">{row.faixa}</td>
                          <td className="px-5 py-3 text-right text-gray-600">{row.qtd}</td>
                          <td className="px-5 py-3 text-right font-semibold text-gray-800">{moeda(Number(row.valor))}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                                <div className={`h-full rounded-full ${cor}`} style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs text-gray-400 w-9 text-right">{pct.toFixed(0)}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-gray-50 border-t border-gray-200 font-semibold">
                      <td className="px-5 py-3 text-gray-700">Total</td>
                      <td className="px-5 py-3 text-right text-gray-700">{aging.reduce((s, r) => s + Number(r.qtd), 0)}</td>
                      <td className="px-5 py-3 text-right text-gray-800">{moeda(valorTotalAging)}</td>
                      <td className="px-5 py-3" />
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ── Top 10 devedores ─────────────────────────────────── */}
          {top10.length > 0 && (
            <section>
              <SecaoTitulo>Top 10 devedores</SecaoTitulo>
              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-8">#</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Cliente</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Faturas</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Valor total</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-36">Proporção</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {top10.map((row, i) => {
                      const pct = (Number(row.valor) / valorMaxTop10) * 100;
                      const medalha = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`;
                      return (
                        <tr key={row.cliente} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-5 py-3 text-center text-sm">{medalha}</td>
                          <td className="px-5 py-3 font-medium text-gray-800 max-w-xs truncate">{row.cliente}</td>
                          <td className="px-5 py-3 text-right text-gray-500">{row.qtd}</td>
                          <td className="px-5 py-3 text-right font-bold text-red-700">{moeda(Number(row.valor))}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                                <div className="h-full rounded-full bg-red-400" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Maior devedor destaque */}
          {kpis.maiorDevedor && (
            <section>
              <div className="rounded-2xl border border-red-200 bg-red-50 p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-red-500">Maior devedor</p>
                  <p className="mt-1 text-lg font-bold text-gray-900 truncate">{kpis.maiorDevedor.cliente}</p>
                </div>
                <p className="text-2xl font-black text-red-700 shrink-0">{moeda(kpis.maiorDevedor.valor)}</p>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
