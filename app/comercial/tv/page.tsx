"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  listarVendas, listarPipeline, formatMoeda,
  type Venda, type PipelineItem,
} from "@/lib/comercial";
import { supabase } from "@/lib/supabase";

// ── Configuração ─────────────────────────────────────────────
const META_BRONZE   = 33_000;
const META_PRATA    = 44_000;
const META_OURO     = 55_000;
const POLL_INTERVAL = 10_000; // 10s

const MESES_PT = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

// ── Helpers ──────────────────────────────────────────────────

function getAnoInicio(): string {
  return `${new Date().getFullYear()}-01-01`;
}

function getAnoFim(): string {
  return `${new Date().getFullYear()}-12-31`;
}

type Nivel = { label: string; cor: string; gradiente: string };

function getNivel(receita: number): Nivel | null {
  if (receita >= META_OURO)   return { label: "OURO",   cor: "#ffd700", gradiente: "from-yellow-500/25 via-yellow-600/10 to-transparent" };
  if (receita >= META_PRATA)  return { label: "PRATA",  cor: "#c0c0c0", gradiente: "from-gray-400/25 via-gray-500/10 to-transparent" };
  if (receita >= META_BRONZE) return { label: "BRONZE", cor: "#cd7f32", gradiente: "from-amber-700/25 via-amber-800/10 to-transparent" };
  return null;
}

function tempoDesde(d: Date): string {
  const seg = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seg < 10)  return "agora";
  if (seg < 60)  return `${seg}s atrás`;
  return `${Math.floor(seg / 60)}m atrás`;
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
  const [erro,                setErro]                = useState<string | null>(null);
  const [ultimaAtualizacao,   setUltimaAtualizacao]   = useState<Date | null>(null);
  const [relogio,             setRelogio]             = useState(() => new Date());
  const [debug,               setDebug]               = useState({ totalVendas: 0, portariaCount: 0, userEmail: "" });

  const audioRef       = useRef<HTMLAudioElement | null>(null);
  const somAtivoRef    = useRef(false);
  const prevCountRef   = useRef(-1);
  const novaVendaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function ativarSom() {
    setSomAtivo(true);
    somAtivoRef.current = true;
    if (audioRef.current) {
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
    const tick = setInterval(() => setRelogio(new Date()), 1_000);
    return () => clearInterval(tick);
  }, []);

  const carregar = useCallback(async (inicial = false) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const [paginaVendas, novoPipeline] = await Promise.all([
        listarVendas({ dataInicio: getAnoInicio(), dataFim: getAnoFim(), porPagina: 10000 }),
        listarPipeline(),
      ]);
      const novasVendas = paginaVendas.registros;

      const portaria    = novasVendas.filter((v) => v.servicos?.includes("Portaria Remota"));
      const maisRecente = [...novasVendas].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0] ?? null;

      const isNova =
        !inicial &&
        prevCountRef.current >= 0 &&
        novasVendas.length > prevCountRef.current &&
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

      prevCountRef.current = novasVendas.length;
      setVendas(novasVendas);
      setPipeline(novoPipeline);
      setErro(null);
      setUltimaAtualizacao(new Date());
      setDebug({ totalVendas: novasVendas.length, portariaCount: portaria.length, userEmail: user?.email ?? "não autenticado" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      console.error("[TV] Erro ao carregar:", msg);
      setErro(msg);
    } finally {
      setCarregando(false);
    }
  }, []);

  // Polling a cada 10s
  useEffect(() => {
    carregar(true);
    const interval = setInterval(() => carregar(), POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [carregar]);

  // Realtime — recarrega imediatamente ao inserir nova venda
  useEffect(() => {
    const channel = supabase
      .channel("tv-vendas-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "vendas" }, () => {
        // Aguarda 1.5s para garantir que venda_servicos foi inserido
        setTimeout(() => carregar(), 1_500);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [carregar]);

  // ── Computed ───────────────────────────────────────────────

  // Meta anual: apenas Portaria Remota
  const portaria       = vendas.filter((v) => v.servicos?.includes("Portaria Remota"));
  const totalReceita   = portaria.reduce((s, v) => s + v.valor_implantacao + v.valor_mensal, 0);
  const totalContratos = portaria.length;
  const nivel      = getNivel(totalReceita);
  const pct        = Math.min(totalReceita / META_OURO, 1);
  const pctBronze  = Math.min(Math.round((totalReceita / META_BRONZE) * 100), 100);
  const proxMeta   = totalReceita < META_BRONZE ? META_BRONZE
                   : totalReceita < META_PRATA  ? META_PRATA
                   : totalReceita < META_OURO   ? META_OURO
                   : null;
  const mesAtual       = new Date().getMonth(); // 0-11
  const mesesRestantes = Math.max(12 - mesAtual, 1);
  const valorRestante  = Math.max(META_OURO - totalReceita, 0);
  const porMes         = valorRestante > 0 ? Math.ceil(valorRestante / mesesRestantes) : 0;

  // Última venda e ranking: todos os serviços
  const ultimaVendaGeral = [...vendas].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )[0] ?? null;

  const ranking: VendedorStats[] = Object.values(
    vendas.reduce((acc, v) => {
      const nome = v.vendedor_nome ?? "Sem vendedor";
      if (!acc[nome]) acc[nome] = { nome, total: 0, contratos: 0 };
      acc[nome].total    += v.valor_mensal;
      acc[nome].contratos += 1;
      return acc;
    }, {} as Record<string, VendedorStats>)
  )
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const totalReceitaGeral     = vendas.reduce((s, v) => s + v.valor_mensal, 0);
  const totalEquipServicos    = vendas.reduce((s, v) => s + v.valor_implantacao, 0);
  const qtdEquipServicos      = vendas.filter((v) => v.valor_implantacao > 0).length;

  const pipelineAtivos      = pipeline.filter((p) => !["fechado", "declinado", "fechado_ganho"].includes(p.status));
  const pipelineNegociacao  = pipeline.filter((p) => ["em_analise", "assinatura"].includes(p.status));
  const pipelineConvertidos = pipeline.filter((p) => p.status === "fechado_ganho").length;

  const mesLabel  = `Meta ${relogio.getFullYear()}`;
  const horaLabel = relogio.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

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
          20%  { box-shadow: 0 0 40px 10px rgba(255,215,0,0.7), 0 0 80px 20px rgba(255,215,0,0.3); }
          80%  { box-shadow: 0 0 40px 10px rgba(255,215,0,0.7), 0 0 80px 20px rgba(255,215,0,0.3); }
          100% { box-shadow: 0 0  0px  0px rgba(255,215,0,0.0); }
        }
        .nova-venda-glow { animation: nova-venda-glow 3s ease-in-out; }

        @keyframes fade-up {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fade-up 0.5s ease-out both; }

        @keyframes nova-badge-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.7; transform: scale(1.06); }
        }
        .nova-badge { animation: nova-badge-pulse 0.7s ease-in-out infinite; }

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

      <div className="relative flex h-screen flex-col overflow-hidden bg-gray-950 text-white" style={{ fontFamily: "var(--font-inter), sans-serif" }}>

        {/* DIAGNÓSTICO — aparece quando não há vendas portaria após primeira carga */}
        {vendas.length === 0 && ultimaAtualizacao && (
          <div className="absolute bottom-5 left-5 z-50 rounded-2xl border border-yellow-500/40 bg-gray-950/95 p-4 font-mono text-xs text-yellow-300 shadow-xl">
            <p className="mb-2 font-bold text-yellow-400">⚠ Diagnóstico — sem dados</p>
            <p>Usuário: <span className="text-white">{debug.userEmail}</span></p>
            <p>Vendas no mês (total): <span className="text-white">{debug.totalVendas}</span></p>
            <p>Com Portaria Remota: <span className="text-white">{debug.portariaCount}</span></p>
            <p>Período buscado: <span className="text-white">{getAnoInicio()} → {getAnoFim()}</span></p>
            {erro && <p className="mt-1 text-red-400">Erro: {erro}</p>}
          </div>
        )}

        {/* ── Header ─────────────────────────────────────── */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-800/80 bg-gray-950/90 px-8 py-3">
          <div className="flex items-center gap-3">
            <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-green-400 shadow-[0_0_8px_#4ade80]" />
            <span className="text-base font-black tracking-tight text-white">FOLK</span>
            <span className="text-base font-semibold text-[#F05A28]">COMERCIAL</span>
            <span className="ml-1 rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-0.5 text-xs font-semibold text-orange-400">
              Portaria Remota
            </span>
            {/* Status de atualização */}
            {erro ? (
              <span className="flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-0.5 text-xs font-semibold text-red-400">
                ⚠ Erro ao carregar — tentando novamente...
              </span>
            ) : ultimaAtualizacao ? (
              <span className="text-xs text-gray-600">
                Atualizado {tempoDesde(ultimaAtualizacao)}
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-gray-300">{mesLabel}</span>
            <span className="font-mono text-sm text-gray-500">{horaLabel}</span>
            <button
              onClick={() => carregar()}
              className="rounded-full border border-gray-700 bg-gray-800/60 px-3 py-1.5 text-xs font-semibold text-gray-400 transition-all hover:border-gray-500 hover:text-gray-200"
              title="Forçar atualização"
            >
              ↺ Atualizar
            </button>
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
          <div className={`relative col-span-2 overflow-hidden rounded-3xl border border-gray-800 bg-gray-900 bg-gradient-to-br ${nivel?.gradiente ?? "from-gray-800/20 to-transparent"} p-8 flex flex-col gap-6`}>
            <div
              className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full opacity-10 blur-3xl"
              style={{ background: nivel?.cor ?? "#6b7280" }}
            />

            {/* Linha superior: valor realizado + bloco direito */}
            <div className="flex items-center justify-between gap-8">

              {/* Esquerda — valor principal */}
              <div className="fade-up min-w-0" key={`receita-${totalReceita}`}>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-600">Meta anual — Portaria Remota</p>
                <p className="mt-2 text-7xl font-black leading-none tracking-tighter text-white">
                  {formatMoeda(totalReceita)}
                </p>
                <p className="mt-3 text-sm text-gray-600/70">
                  {proxMeta
                    ? <>próxima meta: <span className="font-semibold text-gray-500">{formatMoeda(proxMeta)}</span></>
                    : <span className="font-semibold text-yellow-400">Meta ouro atingida!</span>
                  }
                </p>
              </div>

              {/* Direita — status + indicadores */}
              <div className="flex shrink-0 flex-col items-end gap-4 text-right">

                {/* Badge de nível ou contagem regressiva */}
                {nivel ? (
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className="rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-widest"
                      style={{ color: nivel.cor, borderColor: `${nivel.cor}40`, background: `${nivel.cor}12` }}
                    >
                      {nivel.label}
                    </span>
                    <p className="text-4xl font-black text-gray-200">{Math.round(pct * 100)}%</p>
                    <p className="text-xs text-gray-600/70">{totalContratos} contrato{totalContratos !== 1 ? "s" : ""}</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-end gap-1">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-600">Faltam para Bronze</p>
                    <p className="text-4xl font-black text-amber-500/90">
                      {formatMoeda(META_BRONZE - totalReceita)}
                    </p>
                    <p className="text-xs text-gray-600/70">{100 - pctBronze}% para conquistar 🥉</p>
                    <p className="text-xs text-gray-600/70">{totalContratos} contrato{totalContratos !== 1 ? "s" : ""}</p>
                  </div>
                )}

                {/* Indicadores estratégicos */}
                <div className="flex flex-col items-end gap-1 border-t border-gray-800 pt-3">
                  {valorRestante > 0 ? (
                    <>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-600">Restante p/ Ouro</p>
                      <p className="text-2xl font-black text-white">{formatMoeda(valorRestante)}</p>
                      <p className="text-xs text-gray-600/70">
                        <span className="text-sm font-bold text-gray-400">{formatMoeda(porMes)}/mês</span>
                        {" "}por {mesesRestantes} {mesesRestantes === 1 ? "mês" : "meses"}
                      </p>
                    </>
                  ) : (
                    <p className="text-lg font-black text-yellow-400">Meta atingida 🎉</p>
                  )}
                </div>

              </div>
            </div>

            {/* Barra de progresso */}
            <div>
              <div className="relative mb-2 flex justify-between text-[10px] text-gray-700">
                <span>0</span>
                <span className="absolute -translate-x-1/2" style={{ left: `${(META_BRONZE / META_OURO) * 100}%` }}>
                  🥉 {formatMoeda(META_BRONZE)}
                </span>
                <span className="absolute -translate-x-1/2" style={{ left: `${(META_PRATA / META_OURO) * 100}%` }}>
                  🥈 {formatMoeda(META_PRATA)}
                </span>
                <span>🥇 {formatMoeda(META_OURO)}</span>
              </div>
              <div className="relative h-8 w-full overflow-hidden rounded-full bg-gray-800">
                <div className="absolute top-0 h-full w-0.5 bg-gray-700" style={{ left: `${(META_BRONZE / META_OURO) * 100}%` }} />
                <div className="absolute top-0 h-full w-0.5 bg-gray-700" style={{ left: `${(META_PRATA / META_OURO) * 100}%` }} />
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-out"
                  style={{
                    width: `${pct * 100}%`,
                    background: nivel
                      ? `linear-gradient(90deg, ${nivel.cor}80 0%, ${nivel.cor} 100%)`
                      : "linear-gradient(90deg, #4b5563 0%, #6b7280 100%)",
                    boxShadow: nivel ? `0 0 20px ${nivel.cor}60, 0 0 40px ${nivel.cor}30` : "none",
                  }}
                />
              </div>
            </div>
          </div>

          {/* RANKING + EQUIPAMENTOS — col 3, row 1 */}
          <div className="flex flex-col gap-4">

            {/* Ranking */}
            <div className="flex-1 rounded-3xl border border-gray-800 bg-gray-900 p-6 flex flex-col gap-4">
              <p className="shrink-0 text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Ranking — valor mensal</p>

              {ranking.length === 0 ? (
                <p className="text-sm text-gray-600">Nenhuma venda registrada.</p>
              ) : (
                <div className="flex flex-1 flex-col justify-around gap-2">
                  {ranking.map((v, i) => {
                    const MEDALHAS = ["🥇", "🥈", "🥉"];
                    const CORES    = ["#ffd700", "#c0c0c0", "#cd7f32", "#94a3b8", "#94a3b8"];
                    const pctBar   = totalReceitaGeral > 0 ? v.total / totalReceitaGeral : 0;
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

            {/* Vendas de Equipamentos e Serviços */}
            <div className="rounded-3xl border border-gray-800 bg-gray-900 p-6 flex flex-col gap-2">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Vendas de Equipamentos e Serviços</p>
              <p className="text-3xl font-black text-white">{formatMoeda(totalEquipServicos)}</p>
              <p className="text-xs text-gray-600">
                {qtdEquipServicos} contrato{qtdEquipServicos !== 1 ? "s" : ""} com implantação no ano
              </p>
            </div>

          </div>

          {/* ÚLTIMA VENDA — col 1, row 2 */}
          <div
            key={novaVendaAtiva ? "glow" : "normal"}
            className={`relative overflow-hidden rounded-3xl border bg-gray-900 p-6 flex flex-col justify-between transition-colors duration-500 ${
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
                  className="mt-3 text-5xl font-black leading-none transition-colors duration-500"
                  style={{
                    color:      novaVendaAtiva ? "#ffd700" : "#10b981",
                    textShadow: novaVendaAtiva ? "0 0 30px #ffd70080" : "0 0 20px #10b98180",
                  }}
                >
                  {formatMoeda(ultimaVendaDestaque.valor_implantacao + ultimaVendaDestaque.valor_mensal)}
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
              <div className="flex flex-col items-center rounded-2xl border border-gray-800 bg-gray-800/50 py-6">
                <p className="text-6xl font-black text-white">{pipelineAtivos.length}</p>
                <p className="mt-2 text-sm font-medium text-gray-400">Ativas</p>
                <p className="text-xs text-gray-600">propostas</p>
              </div>

              <div className="flex flex-col items-center rounded-2xl border border-orange-500/20 bg-orange-500/5 py-6">
                <p className="text-6xl font-black" style={{ color: "#F05A28" }}>{pipelineNegociacao.length}</p>
                <p className="mt-2 text-sm font-medium text-orange-400/80">Em negociação</p>
                <p className="text-xs text-gray-600">análise + assinatura</p>
              </div>

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
