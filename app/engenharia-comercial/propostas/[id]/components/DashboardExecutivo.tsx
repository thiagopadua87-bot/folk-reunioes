"use client";

import type { VersaoKpis, ChecklistVersao } from "@/lib/engenharia-comercial/propostas-db";
import type { EcVersaoStatus } from "@/lib/engenharia-comercial/types";
import { ChecklistProgress } from "./ChecklistProgress";
import { StatusBadgeVersao } from "./StatusBadge";

// ── Formatadores ──────────────────────────────────────────────

function brl(v: number | null) {
  if (v == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
}
function pct(v: number | null) {
  if (v == null) return "—";
  return `${v.toFixed(1)}%`;
}
function meses(v: number | null) {
  if (v == null) return "—";
  return `${Math.round(v)} meses`;
}

// ── Card de KPI ───────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  color = "gray",
}: {
  label: string;
  value: string;
  sub?: string;
  color?: "folk" | "blue" | "green" | "amber" | "red" | "gray";
}) {
  const colors = {
    folk:  "bg-folk-gradient text-white",
    blue:  "bg-blue-50  text-blue-700",
    green: "bg-green-50 text-green-700",
    amber: "bg-amber-50 text-amber-700",
    red:   "bg-red-50   text-red-700",
    gray:  "bg-gray-50  text-gray-700",
  };
  const isFolk = color === "folk";
  return (
    <div className={`rounded-xl p-4 ${colors[color]}`}>
      <p className={`text-xs font-semibold uppercase tracking-wide ${isFolk ? "text-white/70" : "text-current/60"}`}>
        {label}
      </p>
      <p className={`mt-1 text-2xl font-bold tracking-tight ${isFolk ? "text-white" : ""}`}>{value}</p>
      {sub && <p className={`mt-0.5 text-xs ${isFolk ? "text-white/60" : "text-current/50"}`}>{sub}</p>}
    </div>
  );
}

// ── Barra de custo ────────────────────────────────────────────

function CostBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pctW = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-36 shrink-0 text-right text-xs text-gray-500">{label}</span>
      <div className="flex-1 overflow-hidden rounded-full bg-gray-100 h-2">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pctW}%` }} />
      </div>
      <span className="w-24 text-right text-xs font-semibold text-gray-700">{brl(value)}</span>
      <span className="w-8 text-right text-xs text-gray-400">{pctW}%</span>
    </div>
  );
}

// ── Bloco de próxima ação ─────────────────────────────────────

type Acao = { mensagem: string; cta?: string; secao?: string; urgente?: boolean };

function getProximaAcao(status: EcVersaoStatus, checklist: ChecklistVersao): Acao {
  if (status === "rascunho") {
    if (!checklist.temDadosProjeto || !checklist.temNecessidades)
      return { mensagem: "Preencha os dados do projeto e as necessidades do cliente.", cta: "Ir para Escopo", secao: "escopo" };
    if (!checklist.temSolucoes)
      return { mensagem: "Selecione as soluções técnicas para cada categoria de necessidade.", cta: "Ir para Soluções", secao: "solucoes" };
    if (!checklist.temPremissas)
      return { mensagem: "Configure as premissas de engenharia (FPS, dias de gravação, banda…).", cta: "Ir para Premissas", secao: "premissas" };
    return { mensagem: "Tudo preenchido. Execute o cálculo de engenharia para gerar a lista de materiais.", cta: "Calcular Engenharia", secao: "calcular", urgente: true };
  }
  if (status === "aguardando_aprovacao")
    return { mensagem: "Margem calculada abaixo do mínimo. Aguardando aprovação de exceção por um administrador.", urgente: true };
  if (status === "aprovacao_negada")
    return { mensagem: "Exceção de margem rejeitada. Crie uma nova versão com ajustes na precificação." };
  if (status === "calculado")
    return { mensagem: "Engenharia calculada e margem aprovada. Revise os valores e envie a proposta ao cliente.", cta: "Enviar ao Cliente", secao: "enviar", urgente: true };
  if (status === "enviada")
    return { mensagem: "Proposta enviada. Aguardando resposta do cliente." };
  if (status === "aprovada_cliente")
    return { mensagem: "Cliente aprovou! Converta esta versão em venda para registrar o fechamento.", cta: "Converter em Venda", secao: "converter", urgente: true };
  if (status === "recusada")
    return { mensagem: "Cliente recusou. Crie uma nova versão com ajustes e reenvie." };
  if (status === "aprovacao_concedida")
    return { mensagem: "Exceção de margem aprovada. Envie a proposta ao cliente.", cta: "Enviar ao Cliente", secao: "enviar" };
  return { mensagem: "Proposta em andamento." };
}

// ── Dashboard Principal ───────────────────────────────────────

export function DashboardExecutivo({
  kpis,
  checklist,
  versaoStatus,
  onNavigate,
}: {
  kpis: VersaoKpis | null;
  checklist: ChecklistVersao;
  versaoStatus: EcVersaoStatus;
  onNavigate?: (secao: string) => void;
}) {
  const acao = getProximaAcao(versaoStatus, checklist);
  const calculado = versaoStatus !== "rascunho";

  // For cost breakdown (when calculated)
  const memorial = kpis?.memorialCalculo as Record<string, unknown> | null;
  const etapas   = memorial?.etapas as Array<{ etapa: string; valor: number }> | null;
  const custoMat = kpis?.custoTotalMateriais ?? 0;
  const bdiApl   = etapas?.find((e) => e.etapa.includes("BDI"))?.valor ?? 0;
  const impApl   = etapas?.find((e) => e.etapa.includes("Impost") || e.etapa.includes("impost"))?.valor ?? 0;
  const instApl  = kpis?.valorImplantacao
    ? (kpis.valorImplantacao - custoMat - bdiApl - impApl)
    : 0;
  const totalImpl = kpis?.valorImplantacao ?? 1;

  // Margin color
  const margem    = kpis?.margemPct ?? null;
  const margemCor = margem == null ? "gray" : margem >= 20 ? "green" : margem >= 15 ? "amber" : "red";

  return (
    <div className="space-y-6">
      {/* ── Próxima ação ──────────────────────────────────────── */}
      <div
        className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
          acao.urgente
            ? "border-folk/30 bg-folk/5"
            : "border-gray-200 bg-gray-50"
        }`}
      >
        <div className="flex items-start gap-2.5">
          <span className={`mt-0.5 text-lg leading-none ${acao.urgente ? "text-folk" : "text-gray-400"}`}>
            {acao.urgente ? "▶" : "◦"}
          </span>
          <p className="text-sm text-gray-700">{acao.mensagem}</p>
        </div>
        {acao.cta && acao.secao && (
          <button
            onClick={() => onNavigate?.(acao.secao!)}
            className="shrink-0 rounded-xl bg-folk-gradient px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
          >
            {acao.cta} →
          </button>
        )}
      </div>

      {/* ── KPIs (só após cálculo) ─────────────────────────────── */}
      {calculado && kpis ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard label="Implantação"  value={brl(kpis.valorImplantacao)}  color="folk" />
            <KpiCard label="Recorrência"  value={`${brl(kpis.valorMensal)}/mês`} color="blue"  sub={`Lucro: ${brl(kpis.lucroMensal)}/mês`} />
            <KpiCard label="Margem"       value={pct(kpis.margemPct)}         color={margemCor} sub="margem aplicada" />
            <KpiCard label="Payback"      value={meses(kpis.paybackMeses)}    color="gray"  sub={kpis.roiPct ? `ROI: ${pct(kpis.roiPct)}` : undefined} />
          </div>

          {/* Breakdown de custos */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="mb-4 text-sm font-semibold text-gray-700">Composição do Valor de Implantação</h3>
            <div className="space-y-3">
              {custoMat  > 0 && <CostBar label="Materiais"  value={custoMat}  total={totalImpl} color="bg-folk-gradient" />}
              {instApl   > 0 && <CostBar label="Instalação" value={instApl}   total={totalImpl} color="bg-blue-400" />}
              {bdiApl    > 0 && <CostBar label="BDI"        value={bdiApl}    total={totalImpl} color="bg-amber-400" />}
              {impApl    > 0 && <CostBar label="Impostos"   value={impApl}    total={totalImpl} color="bg-gray-300" />}
            </div>
          </div>

          {/* Recorrência mensal */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Custo mensal</p>
              <p className="mt-1 text-lg font-bold text-gray-800">
                {brl((kpis.valorMensal ?? 0) - (kpis.lucroMensal ?? 0))}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Receita mensal</p>
              <p className="mt-1 text-lg font-bold text-gray-800">{brl(kpis.valorMensal)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Lucro mensal</p>
              <p className={`mt-1 text-lg font-bold ${(kpis.lucroMensal ?? 0) > 0 ? "text-green-700" : "text-red-600"}`}>
                {brl(kpis.lucroMensal)}
              </p>
            </div>
          </div>

          {/* Status de aprovação (quando necessário) */}
          {kpis.requiresApproval && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                <span>⚠</span>
                <span>Esta versão requer aprovação de exceção de margem</span>
              </div>
              <p className="mt-1 text-xs text-amber-700">
                Margem calculada abaixo do mínimo configurado nos parâmetros financeiros.
                Um administrador precisa aprovar antes do envio ao cliente.
              </p>
            </div>
          )}
        </>
      ) : (
        /* Estado rascunho — sem KPIs, foca no stepper visual */
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center">
          <p className="text-sm font-semibold text-gray-500">Nenhum cálculo executado</p>
          <p className="mt-1 text-xs text-gray-400">
            Preencha as etapas abaixo e clique em Calcular Engenharia para gerar
            a lista de materiais e a precificação.
          </p>
        </div>
      )}

      {/* ── Checklist de progresso ─────────────────────────────── */}
      <ChecklistProgress
        checklist={checklist}
        status={versaoStatus}
        onNavigate={onNavigate}
      />

      {/* Badge de status */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <span>Status desta versão:</span>
        <StatusBadgeVersao status={versaoStatus} />
        {kpis?.calculatedAt && (
          <span>
            · Calculada em{" "}
            {new Date(kpis.calculatedAt).toLocaleDateString("pt-BR", {
              day: "2-digit", month: "2-digit", year: "numeric",
              hour: "2-digit", minute: "2-digit",
            })}
          </span>
        )}
      </div>
    </div>
  );
}
