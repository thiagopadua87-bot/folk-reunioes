"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  listarVendas, listarPipeline, formatMoeda,
  type Venda, type PipelineItem,
} from "@/lib/comercial";
import { supabase } from "@/lib/supabase";

// ── Configuração ─────────────────────────────────────────────
const META_MENSAL = 50_000;

const MESES_PT = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

// ── Helpers ──────────────────────────────────────────────────

function getMesInicio(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-01`;
}

function getMesFim(): string {
  const n = new Date();
  const d = new Date(n.getFullYear(), n.getMonth() + 1, 0).getDate();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function getNivel(pct: number): { label: string; cor: string; gradiente: string } {
  if (pct >= 0.66) return { label: "OURO",   cor: "#ffd700", gradiente: "from-yellow-500/25 via-yellow-600/10 to-transparent" };
  if (pct >= 0.33) return { label: "PRATA",  cor: "#c0c0c0", gradiente: "from-gray-400/25 via-gray-500/10 to-transparent" };
  return             { label: "BRONZE", cor: "#cd7f32", gradiente: "from-amber-700/25 via-amber-800/10 to-transparent" };
}

interface VendedorStats { nome: string; total: number; contratos: number; }

// ── Componente principal ─────────────────────────────────────

export default function ComercialTVPage() {
  const [vendas,              setVendas]              = useState<Venda[]>([]);
  const [pipeline,            setPipeline]            = useState<PipelineItem[]>([]);
  const [somAtivo,            setSomAtivo]            = useState(false);
  const [novaVendaAtiva,      setNovaVendaAtiva]      = useState(false);
  const [ultimaVendaDestaque, setUltimaVendaDestaque] = useState<Venda | null>(null);
  const [carregando,          setCarregando]          = useState(true);
  const [agora,               setAgora]               = useState(() => new Date());

  const audioRef       = useRef<HTMLAudioElement | null>(null);
  const somAtivoRef    = useRef(false);
  const prevCountRef   = useRef(-1);
  const novaVendaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync ref instantly (for use inside stable callbacks)
  function ativarSom() {
    setSomAtivo(true);
    somAtivoRef.current = true;
    if (audioRef.current) {
      // Unlock browser autoplay restriction
      audioRef.current.volume = 0;
      audioRef.current.play()
        .then(() => {
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current.volume = 1;
          }
        })
        .catch(() => {});
    }
  }

  useEffect(() => {
    audioRef.current = new Audio("/sounds/success.mp3");
    const tick = setInterval(() => setAgora(new Date()), 1_000);
    return () => clearInterval(tick);
  }, []);

  const carregar = useCallback(async (inicial = false) => {
    try {
      const [novasVendas, novoPipeline] = await Promise.all([
        listarVendas({ dataInicio: getMesInicio(), dataFim: getMesFim() }),
        listarPipeline(),
      ]);

      const portaria = novasVendas.filter((v) => v.servicos?.includes("Portaria Remota"));
      const maisRecente = [...portaria].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0] ?? null;

      const isNova =
        !inicial &&
        prevCountRef.current >= 0 &&
        portaria.length > prevCountRef.current &&
        !!maisRecente;

      if (isNova && maisRecente) {
        setUltimaVendaDestaque(maisRecente);
        setNovaVendaAtiva(true);
        if (somAtivoRef.current && audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => {});
        }
        if (novaVendaTimer.current) clearTimeout(novaVendaTimer.current);
        novaVendaTimer.current = setTimeout(() => setNovaVendaAtiva(false), 3_000);
      } else if (inicial && maisRecente) {
        setUltimaVendaDestaque(maisRecente);
      }

      prevCountRef.current = portaria.length;
      setVendas(novasVendas);
      setPipeline(novoPipeline);
    } catch {
      // TV page — falhas silenciosas
    } finally {
      if (inicial) setCarregando(false);
    }
  }, []);

  // Polling a cada 30s
  useEffect(() => {
    carregar(true);
    const interval = setInterval(() => carregar(), 30_000);
    return () => clearInterval(interval);
  }, [carregar]);

  // Realtime Supabase — recarrega ao inserir nova venda
  useEffect(() => {
    const channel = supabase
      .channel("tv-vendas-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "vendas" }, () => {
        // Aguarda 1.2s para garantir que venda_servicos também foi inserido
        setTimeout(() => carregar(), 1_200);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [carregar]);

  // ── Computed ───────────────────────────────────────────────

  const portaria       = vendas.filter((v) => v.servicos?.includes("Portaria Remota"));
  const totalReceita   = portaria.reduce((s, v) => s + v.valor, 0);
  const totalContratos = portaria.length;
  const pct            = Math.min(totalReceita / META_MENSAL, 1);
  const nivel          = getNivel(pct);

  const ranking: VendedorStats[] = Object.values(
    portaria.reduce((acc, v) => {
      const nome = v.vendedor_nome ?? "Sem vendedor";
      if (!acc[nome]) acc[nome] = { nome, total: 0, contratos: 0 };
      acc[nome].total    += v.valor;
      acc[nome].contratos += 1;
      return acc;
    }, {} as Record<string, VendedorStats>)
  )
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const pipelineAtivos     = pipeline.filter((p) => !["fechado", "declinado", "fechado_ganho"].includes(p.status));
  const pipelineNegociacao = pipeline.filter((p) => ["em_analise", "assinatura"].includes(p.status));
  const pipelineConvertidos = pipeline.filter((p) => p.status === "fechado_ganho").length;

  const mesLabel  = `${MESES_PT[agora.getMonth()]} ${agora.getFullYear()}`;
  const horaLabel = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  // ── Loading ────────────────────────────────────────────────

  if (carregando) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-700 border-t-orange-500" />
          <p className="text-lg font-medium text-gray-400">Carregando painel...</p>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @keyframes nova-venda-glow {
          0%   { box-shadow: 0 0  0px  0px rgba(255,215,0,0.0); }
          20%  { box-shadow: 0 0 40px 10px rgba(255,215,0,0.6), 0 0 80px 20px rgba(255,215,0,0.3); }
          80%  { box-shadow: 0 0 40px 10px rgba(255,215,0,0.6), 0 0 80px 20px rgba(255,215,0,0.3); }
          100% { box-shadow: 0 0  0px  0px rgba(255,215,0,0.0); }
        }
        .nova-venda-glow { animation: nova-venda-glow 3s ease-in-out; }

        @keyframes progress-fill {
          from { width: 0%; }
          to   { width: var(--progress-w); }
        }
        .progress-bar { animation: progress-fill 1.8s cubic-bezier(.22,1,.36,1) forwards; }

        @keyframes fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fade-up 0.7s ease-out both; }

        @keyframes nova-badge-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.7; transform: scale(1.05); }
        }
        .nova-badge { animation: nova-badge-pulse 0.8s ease-in-out infinite; }

        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        .text-shimmer {
          background: linear-gradient(90deg, #ffd700 20%, #fff8dc 50%, #ffd700 80%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 2s linear infinite;
        }
      `}</style>

      <div className="flex h-screen flex-col overflow-hidden bg-gray-950 text-white" style={{ fontFamily: "var(--font-inter), sans-serif" }}>

        {/* ── Header ─────────────────────────────────────── */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-800/80 bg-gray-950/90 px-8 py-3">
          <div className="flex items-center gap-3">
            <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-green-400 shadow-[0_0_8px_#4ade80]" />
            <span className="text-base font-black tracking-tight text-white">FOLK</span>
            <span className="text-base font-semibold text-[#F05A28]">COMERCIAL</span>
            <span className="ml-1 rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-0.5 text-xs font-semibold text-orange-400">
              Portaria Remota
            </span>
          </div>

          <div className="flex items-center gap-5">
            <span className="text-sm font-semibold text-gray-300">{mesLabel}</span>
            <span className="font-mono text-sm text-gray-500">{horaLabel}</span>
            {somAtivo ? (
              <span className="flex items-center gap-2 rounded-full border border-green-500/40 bg-green-500/10 px-4 py-1.5 text-sm font-semibold text-green-400">
                🔊 Som ativo
              </span>
            ) : (
              <button
                onClick={ativarSom}
                className="flex items-center gap-2 rounded-full border border-gray-600 bg-gray-800 px-4 py-1.5 text-sm font-semibold text-gray-300 transition-all hover:border-orange-500/50 hover:bg-orange-500/10 hover:text-orange-300"
              >
                🔇 Ativar som
              </button>
            )}
          </div>
        </div>

        {/* ── Grid principal ──────────────────────────────── */}
        <div className="grid flex-1 grid-cols-3 grid-rows-2 gap-4 overflow-hidden p-5">

          {/* META — col 1-2, row 1 */}
          <div className={`relative col-span-2 overflow-hidden rounded-3xl border border-gray-800 bg-gray-900 bg-gradient-to-br ${nivel.gradiente} p-8 flex flex-col justify-between`}>
            {/* Decoração de fundo */}
            <div
              className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full opacity-10 blur-3xl"
              style={{ background: nivel.cor }}
            />

            <div className="flex items-start justify-between">
              <div className="fade-up" key={`receita-${totalReceita}`}>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Meta do mês — Portaria Remota</p>
                <p className="mt-2 text-8xl font-black leading-none tracking-tighter text-white">
                  {formatMoeda(totalReceita)}
                </p>
                <p className="mt-3 text-xl text-gray-500">
                  de <span className="font-semibold text-gray-400">{formatMoeda(META_MENSAL)}</span>
                </p>
              </div>

              <div className="flex flex-col items-end text-right">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Nível atual</p>
                <p
                  className="mt-1 text-5xl font-black leading-none"
                  style={{ color: nivel.cor, textShadow: `0 0 30px ${nivel.cor}80` }}
                >
                  {nivel.label}
                </p>
                <p className="mt-2 text-3xl font-black text-gray-200">{Math.round(pct * 100)}%</p>
                <p className="mt-1 text-sm text-gray-500">
                  {totalContratos} contrato{totalContratos !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            {/* Barra de progresso */}
            <div>
              {/* Marcadores de nível */}
              <div className="relative mb-1 flex justify-between text-[10px] text-gray-700">
                <span>0%</span>
                <span className="absolute left-[33%] -translate-x-1/2">Bronze 33%</span>
                <span className="absolute left-[66%] -translate-x-1/2">Prata 66%</span>
                <span>Meta 100%</span>
              </div>
              <div className="relative h-7 w-full overflow-hidden rounded-full bg-gray-800">
                {/* Marcadores de nível internos */}
                <div className="absolute left-[33%] top-0 h-full w-px bg-gray-700/60" />
                <div className="absolute left-[66%] top-0 h-full w-px bg-gray-700/60" />
                {/* Barra preenchida */}
                <div
                  className="progress-bar h-full rounded-full"
                  style={{
                    "--progress-w": `${pct * 100}%`,
                    background: `linear-gradient(90deg, ${nivel.cor}99 0%, ${nivel.cor} 100%)`,
                    boxShadow: `0 0 24px ${nivel.cor}80, 0 0 48px ${nivel.cor}40`,
                  } as React.CSSProperties}
                />
              </div>
            </div>
          </div>

          {/* RANKING — col 3, row 1 */}
          <div className="rounded-3xl border border-gray-800 bg-gray-900 p-6 flex flex-col gap-4">
            <p className="shrink-0 text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Ranking do mês</p>

            {ranking.length === 0 ? (
              <p className="text-sm text-gray-600">Nenhuma venda registrada.</p>
            ) : (
              <div className="flex flex-1 flex-col justify-around gap-2">
                {ranking.map((v, i) => {
                  const MEDALHAS = ["🥇", "🥈", "🥉"];
                  const CORES    = ["#ffd700", "#c0c0c0", "#cd7f32", "#94a3b8", "#94a3b8"];
                  const pctBar   = totalReceita > 0 ? v.total / totalReceita : 0;
                  return (
                    <div key={v.nome} className="flex items-center gap-3">
                      <span className="w-8 shrink-0 text-center text-xl">
                        {MEDALHAS[i] ?? <span className="text-sm text-gray-500">{i + 1}</span>}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <p className="truncate text-sm font-bold text-white">{v.nome}</p>
                          <p className="shrink-0 text-xs font-semibold text-gray-400">{formatMoeda(v.total)}</p>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
                          <div
                            className="h-full rounded-full transition-all duration-1000"
                            style={{ width: `${pctBar * 100}%`, background: CORES[i] }}
                          />
                        </div>
                        <p className="mt-0.5 text-[10px] text-gray-600">
                          {v.contratos} contrato{v.contratos !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ÚLTIMA VENDA — col 1, row 2 */}
          <div
            className={`relative overflow-hidden rounded-3xl border bg-gray-900 p-6 flex flex-col justify-between transition-all duration-500 ${
              novaVendaAtiva ? "border-yellow-400 nova-venda-glow" : "border-gray-800"
            }`}
          >
            {novaVendaAtiva && (
              <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-yellow-400/10 via-yellow-500/5 to-transparent" />
            )}

            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Última venda</p>
              {novaVendaAtiva && (
                <span className="nova-badge flex items-center gap-1.5 rounded-full bg-yellow-400/20 px-3 py-1 text-xs font-black text-yellow-300">
                  ✨ NOVA VENDA!
                </span>
              )}
            </div>

            {ultimaVendaDestaque ? (
              <div className="fade-up" key={ultimaVendaDestaque.id}>
                <p className={`text-2xl font-black leading-tight ${novaVendaAtiva ? "text-shimmer" : "text-white"}`}>
                  {ultimaVendaDestaque.cliente}
                </p>
                <p
                  className="mt-3 text-5xl font-black leading-none"
                  style={{
                    color:      novaVendaAtiva ? "#ffd700" : "#10b981",
                    textShadow: novaVendaAtiva ? "0 0 30px #ffd70080" : "0 0 20px #10b98180",
                  }}
                >
                  {formatMoeda(ultimaVendaDestaque.valor)}
                </p>
                {ultimaVendaDestaque.vendedor_nome && (
                  <p className="mt-4 text-sm text-gray-500">
                    por <span className="font-semibold text-gray-200">{ultimaVendaDestaque.vendedor_nome}</span>
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-600">Nenhuma venda no mês ainda.</p>
            )}
          </div>

          {/* PIPELINE — col 2-3, row 2 */}
          <div className="col-span-2 rounded-3xl border border-gray-800 bg-gray-900 p-6 flex flex-col justify-between">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Pipeline</p>

            <div className="grid grid-cols-3 items-center gap-4">
              {/* Propostas ativas */}
              <div className="flex flex-col items-center rounded-2xl border border-gray-800 bg-gray-800/50 py-6">
                <p className="text-6xl font-black text-white">{pipelineAtivos.length}</p>
                <p className="mt-2 text-sm font-medium text-gray-400">Ativas</p>
                <p className="text-xs text-gray-600">propostas</p>
              </div>

              {/* Em negociação */}
              <div className="flex flex-col items-center rounded-2xl border border-orange-500/20 bg-orange-500/5 py-6">
                <p className="text-6xl font-black" style={{ color: "#F05A28" }}>{pipelineNegociacao.length}</p>
                <p className="mt-2 text-sm font-medium text-orange-400/80">Em negociação</p>
                <p className="text-xs text-gray-600">análise + assinatura</p>
              </div>

              {/* Convertidas */}
              <div className="flex flex-col items-center rounded-2xl border border-emerald-500/20 bg-emerald-500/5 py-6">
                <p className="text-6xl font-black text-emerald-400">{pipelineConvertidos}</p>
                <p className="mt-2 text-sm font-medium text-emerald-400/80">Convertidas</p>
                <p className="text-xs text-gray-600">no pipeline</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
