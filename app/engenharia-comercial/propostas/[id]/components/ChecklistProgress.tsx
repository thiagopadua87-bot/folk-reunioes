"use client";

import type { ChecklistVersao } from "@/lib/engenharia-comercial/propostas-db";
import type { EcVersaoStatus } from "@/lib/engenharia-comercial/types";

type Step = {
  key: keyof ChecklistVersao;
  label: string;
  optional?: boolean;
  section: string;
};

const STEPS: Step[] = [
  { key: "temDadosProjeto", label: "Dados do projeto",        section: "escopo" },
  { key: "temNecessidades", label: "Necessidades do cliente", section: "escopo" },
  { key: "temSolucoes",     label: "Soluções técnicas",       section: "solucoes" },
  { key: "temPremissas",    label: "Premissas de engenharia", section: "premissas" },
  { key: "temCustos",       label: "Custos adicionais",       section: "custos", optional: true },
  { key: "temEngenharia",   label: "Cálculo executado",       section: "" },
  { key: "temPrecificacao", label: "Precificação gerada",     section: "" },
];

function completedFromStatus(status: EcVersaoStatus): Partial<ChecklistVersao> {
  const calc = status !== "rascunho";
  return {
    temEngenharia:   calc,
    temPrecificacao: calc,
  };
}

export function ChecklistProgress({
  checklist,
  status,
  onNavigate,
}: {
  checklist: ChecklistVersao;
  status: EcVersaoStatus;
  onNavigate?: (section: string) => void;
}) {
  const overrides = completedFromStatus(status);
  const effective = { ...checklist, ...overrides };

  const total     = STEPS.filter((s) => !s.optional).length;
  const completed = STEPS.filter((s) => !s.optional && effective[s.key]).length;
  const pct       = Math.round((completed / total) * 100);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">Progresso</span>
        <span className="text-xs font-semibold text-folk">{pct}%</span>
      </div>

      {/* Progress bar */}
      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-folk-gradient transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ul className="space-y-2">
        {STEPS.map((step) => {
          const done    = effective[step.key];
          const clickable = !done && step.section && onNavigate;
          return (
            <li key={step.key} className="flex items-center gap-2.5 text-sm">
              {done ? (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100">
                  <svg className="h-3 w-3 text-green-600" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              ) : (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-gray-200 bg-white" />
              )}
              <span
                onClick={clickable ? () => onNavigate!(step.section) : undefined}
                className={`flex-1 ${done ? "text-gray-500 line-through" : "text-gray-700"} ${
                  clickable ? "cursor-pointer hover:text-folk" : ""
                }`}
              >
                {step.label}
                {step.optional && (
                  <span className="ml-1 text-xs text-gray-400">(opcional)</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
