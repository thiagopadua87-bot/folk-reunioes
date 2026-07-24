"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import type { PropostaDetalhe, VersaoListItem, VersaoKpis, ChecklistVersao } from "@/lib/engenharia-comercial/propostas-db";
import {
  buscarPropostaDetalhe, listarVersoes, buscarKpisVersao, buscarChecklist,
} from "@/lib/engenharia-comercial/propostas-db";
import { VersionBar }         from "./components/VersionBar";
import { DashboardExecutivo }  from "./components/DashboardExecutivo";
import { EscopoEditor }        from "./components/EscopoEditor";
import { SolucoesEditor }      from "./components/SolucoesEditor";
import { PremissasEditor }     from "./components/PremissasEditor";
import { CustosEditor }        from "./components/CustosEditor";
import { CalcularPanel }       from "./components/CalcularPanel";
import { RecalcularBanner }    from "./components/RecalcularBanner";
import { EngenhariaTab }       from "./components/EngenhariaTab";
import { PrecificacaoTab }     from "./components/PrecificacaoTab";
import { ExportacaoButtons }   from "./components/ExportacaoButtons";
import { HistoricoTab }        from "./components/HistoricoTab";
import type { EcVersaoStatus } from "@/lib/engenharia-comercial/types";

// ── Seções disponíveis após cálculo ───────────────────────────

const SECOES_CALCULADO = [
  { id: "resumo",      label: "Resumo" },
  { id: "escopo",      label: "Escopo" },
  { id: "solucoes",    label: "Soluções" },
  { id: "premissas",   label: "Premissas" },
  { id: "custos",      label: "Custos" },
  { id: "engenharia",  label: "Engenharia" },
  { id: "precificacao", label: "Precificação" },
  { id: "historico",   label: "Histórico" },
] as const;

type SecaoId = (typeof SECOES_CALCULADO)[number]["id"];

// ── Skeleton ──────────────────────────────────────────────────

function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-gray-100 ${className}`} />;
}

// ── Stepper (status = rascunho) ───────────────────────────────

const PASSOS = [
  { id: "escopo",    label: "Escopo" },
  { id: "solucoes",  label: "Soluções" },
  { id: "premissas", label: "Premissas" },
  { id: "custos",    label: "Custos" },
  { id: "calcular",  label: "Calcular" },
];

function Stepper({
  secaoAtiva,
  checklist,
  onNavigate,
}: {
  secaoAtiva: string;
  checklist:  ChecklistVersao | null;
  onNavigate: (s: string) => void;
}) {
  const activeIdx = PASSOS.findIndex((p) => p.id === secaoAtiva);

  const stepsDone = checklist
    ? [
        checklist.temDadosProjeto && checklist.temNecessidades,
        checklist.temSolucoes,
        checklist.temPremissas,
        true,  // custos é opcional
        false, // calcular é ação, nunca "concluído"
      ]
    : [false, false, false, false, false];

  function canNavigateTo(idx: number): boolean {
    if (idx <= activeIdx) return true;
    return stepsDone.slice(0, idx).every(Boolean);
  }

  return (
    <div className="flex items-center overflow-x-auto rounded-xl border border-gray-200 bg-white p-1">
      {PASSOS.map((passo, idx) => {
        const done   = stepsDone[idx] && idx !== activeIdx;
        const active = idx === activeIdx;
        const canGo  = canNavigateTo(idx);
        return (
          <button
            key={passo.id}
            onClick={() => canGo && onNavigate(passo.id)}
            disabled={!canGo}
            title={!canGo ? "Complete as etapas anteriores primeiro" : undefined}
            className={`relative flex min-w-0 flex-1 items-center justify-center gap-1 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
              active  ? "bg-folk-gradient text-white shadow-sm"
              : done  ? "text-green-700 hover:bg-green-50"
              : canGo ? "text-gray-600 hover:bg-gray-100"
              : "cursor-not-allowed text-gray-300"
            }`}
          >
            {done ? (
              <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                active  ? "bg-white/25 text-white"
                : canGo ? "bg-gray-200 text-gray-600"
                : "bg-gray-100 text-gray-300"
              }`}>
                {idx + 1}
              </span>
            )}
            <span className="hidden sm:inline">{passo.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Tab bar (após cálculo) ────────────────────────────────────

function TabBar({ secaoAtiva, onNavigate }: { secaoAtiva: string; onNavigate: (s: string) => void }) {
  return (
    <div className="-mx-1 flex flex-wrap gap-1">
      {SECOES_CALCULADO.map((s) => (
        <button
          key={s.id}
          onClick={() => onNavigate(s.id)}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
            secaoAtiva === s.id
              ? "bg-folk-gradient text-white shadow-sm"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────

function PageInner() {
  const params       = useParams();
  const searchParams = useSearchParams();
  const router       = useRouter();

  const propostaId = params.id as string;
  const secaoParam = searchParams.get("s") ?? "resumo";
  const versaoNum  = searchParams.get("v") ? parseInt(searchParams.get("v")!) : null;

  const [proposta, setProposta]       = useState<PropostaDetalhe | null>(null);
  const [versoes, setVersoes]         = useState<VersaoListItem[]>([]);
  const [versaoAtiva, setVersaoAtiva] = useState<VersaoListItem | null>(null);
  const [kpis, setKpis]               = useState<VersaoKpis | null>(null);
  const [checklist, setChecklist]     = useState<ChecklistVersao | null>(null);
  const [loading, setLoading]         = useState(true);
  const [loadingVersao, setLoadingVersao] = useState(false);
  const [erro, setErro]               = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true); setErro(null);
    try {
      const [det, vers] = await Promise.all([
        buscarPropostaDetalhe(propostaId),
        listarVersoes(propostaId),
      ]);
      if (!det) { setErro("Proposta não encontrada."); return; }
      setProposta(det);
      setVersoes(vers);
      const target = versaoNum
        ? (vers.find((v) => v.numero === versaoNum) ?? vers.find((v) => v.isCurrent) ?? vers.at(-1) ?? null)
        : (vers.find((v) => v.isCurrent) ?? vers.at(-1) ?? null);
      setVersaoAtiva(target);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [propostaId, versaoNum]);

  useEffect(() => { void carregar(); }, [carregar]);

  // Carrega KPIs e checklist quando a versão ativa muda
  useEffect(() => {
    if (!versaoAtiva) { setKpis(null); setChecklist(null); return; }
    setLoadingVersao(true);
    Promise.all([
      buscarKpisVersao(versaoAtiva.id),
      buscarChecklist(versaoAtiva.id),
    ]).then(([k, c]) => {
      setKpis(k);
      setChecklist(c);
    }).catch(() => {}).finally(() => setLoadingVersao(false));
  }, [versaoAtiva]);

  // Atualiza somente o checklist (auto-save dos editores chama isso)
  const handleDadosChanged = useCallback(async () => {
    if (!versaoAtiva) return;
    try {
      const c = await buscarChecklist(versaoAtiva.id);
      setChecklist(c);
    } catch {}
  }, [versaoAtiva]);

  function navigate(s: string) {
    const vParam = versaoAtiva && !versaoAtiva.isCurrent ? `&v=${versaoAtiva.numero}` : "";
    router.push(`?s=${s}${vParam}`);
  }

  function handleSelectVersao(v: VersaoListItem) {
    setVersaoAtiva(v);
    const vParam = v.isCurrent ? "" : `&v=${v.numero}`;
    router.push(`?s=${secaoParam}${vParam}`, { scroll: false });
  }

  function handleNovaVersaoCriada() {
    void carregar();
  }

  function handleCalculado() {
    void carregar();
    router.push("?s=resumo");
  }

  // Após recalcular de dentro do banner, recarrega KPIs + versoes
  async function handleRecalculado() {
    await carregar();
    if (versaoAtiva) {
      const [k, c] = await Promise.all([
        buscarKpisVersao(versaoAtiva.id),
        buscarChecklist(versaoAtiva.id),
      ]);
      setKpis(k);
      setChecklist(c);
    }
  }

  const isReadOnly   = versaoAtiva ? !versaoAtiva.isCurrent : false;
  const calculado    = versaoAtiva?.status !== "rascunho" && versaoAtiva?.status != null;

  const PASSOS_IDS = ["escopo", "solucoes", "premissas", "custos", "calcular"];
  const secaoEfetiva = calculado
    ? (SECOES_CALCULADO.some((s) => s.id === secaoParam) ? secaoParam : "resumo")
    : (PASSOS_IDS.includes(secaoParam) ? secaoParam : "escopo");

  // ── Renderização ──────────────────────────────────────────

  if (erro) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{erro}</div>
    );
  }

  // Conteúdo da seção atual (evita renderizar editor com versaoAtiva nulo)
  function renderSecao() {
    if (!versaoAtiva || !checklist) return null;

    // ── Modo rascunho (Stepper) ──────────────────────────────
    if (!calculado) {
      if (secaoEfetiva === "escopo")    return <EscopoEditor versaoId={versaoAtiva.id} onDadosChanged={handleDadosChanged} readOnly={isReadOnly} />;
      if (secaoEfetiva === "solucoes")  return <SolucoesEditor versaoId={versaoAtiva.id} onDadosChanged={handleDadosChanged} readOnly={isReadOnly} />;
      if (secaoEfetiva === "premissas") return <PremissasEditor versaoId={versaoAtiva.id} onDadosChanged={handleDadosChanged} readOnly={isReadOnly} />;
      if (secaoEfetiva === "custos")    return <CustosEditor versaoId={versaoAtiva.id} onDadosChanged={handleDadosChanged} readOnly={isReadOnly} />;
      if (secaoEfetiva === "calcular")  return (
        <CalcularPanel
          versaoId={versaoAtiva.id}
          onCalculado={handleCalculado}
          onNavigate={navigate}
        />
      );
      // Fallback: dashboard
      return <DashboardExecutivo kpis={kpis} checklist={checklist} versaoStatus={versaoAtiva.status} onNavigate={navigate} />;
    }

    // ── Modo calculado (Tabs) ────────────────────────────────
    if (secaoEfetiva === "resumo")      return <DashboardExecutivo kpis={kpis} checklist={checklist} versaoStatus={versaoAtiva.status} onNavigate={navigate} />;
    if (secaoEfetiva === "escopo")      return <EscopoEditor versaoId={versaoAtiva.id} onDadosChanged={handleDadosChanged} readOnly={isReadOnly} />;
    if (secaoEfetiva === "solucoes")    return <SolucoesEditor versaoId={versaoAtiva.id} onDadosChanged={handleDadosChanged} readOnly={isReadOnly} />;
    if (secaoEfetiva === "premissas")   return <PremissasEditor versaoId={versaoAtiva.id} onDadosChanged={handleDadosChanged} readOnly={isReadOnly} />;
    if (secaoEfetiva === "custos")       return <CustosEditor versaoId={versaoAtiva.id} onDadosChanged={handleDadosChanged} readOnly={isReadOnly} />;
    if (secaoEfetiva === "engenharia")   return <EngenhariaTab versaoId={versaoAtiva.id} versoes={versoes} />;
    if (secaoEfetiva === "precificacao") return <PrecificacaoTab versaoId={versaoAtiva.id} />;
    if (secaoEfetiva === "historico")    return <HistoricoTab propostaId={propostaId} />;

    return null;
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-gray-400">
        <Link href="/engenharia-comercial?aba=propostas" className="hover:text-folk">Propostas</Link>
        <span>/</span>
        {loading ? <Skeleton className="h-4 w-40" /> : (
          <span className="font-medium text-gray-700">{proposta?.nome}</span>
        )}
      </nav>

      {/* Header */}
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-7 w-72" />
          <Skeleton className="h-4 w-48" />
        </div>
      ) : proposta && (
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{proposta.nome}</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {proposta.cliente}
            {proposta.responsavel && <> · {proposta.responsavel}</>}
            {proposta.descricao && <> · {proposta.descricao}</>}
          </p>
        </div>
      )}

      {/* Barra de versões */}
      {loading ? <Skeleton className="h-16 w-full" /> : versoes.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
          <VersionBar
            versoes={versoes}
            versaoSelecionada={versaoAtiva}
            propostaId={propostaId}
            onSelectVersao={handleSelectVersao}
            onNovaVersaoCriada={handleNovaVersaoCriada}
          />
        </div>
      )}

      {/* Aviso versão não-atual */}
      {isReadOnly && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          <span>⚠</span>
          <span>Você está visualizando a V{versaoAtiva?.numero} — não é a versão atual.</span>
          <button
            onClick={() => handleSelectVersao(versoes.find((v) => v.isCurrent)!)}
            className="font-semibold underline"
          >
            Ir para versão atual
          </button>
        </div>
      )}

      {/* Banner: necessita recálculo (só para versões calculadas, não rascunho) */}
      {!loading && versaoAtiva && calculado && versaoAtiva.necessitaRecalculo && (
        <RecalcularBanner versaoId={versaoAtiva.id} onRecalculado={handleRecalculado} />
      )}

      {/* Stepper OU Tab bar + Exportação */}
      {!loading && versaoAtiva && (
        calculado ? (
          <div className="space-y-2">
            <TabBar secaoAtiva={secaoEfetiva} onNavigate={navigate} />
            {!versaoAtiva.necessitaRecalculo && (
              <div className="flex items-center justify-end">
                <ExportacaoButtons versaoId={versaoAtiva.id} />
              </div>
            )}
          </div>
        ) : (
          <Stepper secaoAtiva={secaoEfetiva} checklist={checklist} onNavigate={navigate} />
        )
      )}

      {/* Conteúdo da seção */}
      {loadingVersao ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        renderSecao()
      )}
    </div>
  );
}

export default function PropostaDetailPage() {
  return (
    <Suspense fallback={
      <div className="space-y-4">
        <div className="animate-pulse h-4 w-40 rounded bg-gray-100" />
        <div className="animate-pulse h-7 w-72 rounded bg-gray-100" />
        <div className="animate-pulse h-16 w-full rounded-xl bg-gray-100" />
      </div>
    }>
      <PageInner />
    </Suspense>
  );
}
