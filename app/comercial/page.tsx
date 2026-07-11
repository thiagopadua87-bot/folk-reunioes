"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import VendasTab from "./VendasTab";
import PipelineTab from "./PipelineTab";
import DashboardCRMTab from "./DashboardCRMTab";
import type { PreenchimentoVenda, PipelineItem } from "@/lib/comercial";
import { useUnsavedChanges } from "@/lib/unsaved-changes";
import { usePermissions, AccessDenied } from "@/app/components/PermissionsProvider";
import type { ScreenKey } from "@/lib/permissions";

type Aba = "pipeline" | "vendas" | "dashboard" | "comissoes";

const ABAS_BASE: { value: Aba; label: string; descricao: string }[] = [
  { value: "pipeline",  label: "Pipeline",  descricao: "Propostas em andamento e potencial de receita" },
  { value: "vendas",    label: "Vendas",    descricao: "Contratos fechados e receita realizada" },
  { value: "dashboard", label: "Dashboard", descricao: "Visão gerencial do funil e atividades comerciais" },
];

const ABA_COMISSOES = { value: "comissoes" as Aba, label: "Comissões", descricao: "Painel de comissões da equipe comercial" };

const TAB_KEYS: Record<Aba, ScreenKey> = {
  pipeline:  "comercial.pipeline",
  vendas:    "comercial.vendas",
  dashboard: "comercial.dashboard",
  comissoes: "comercial.comissoes",
};

function ComercialPageContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const { guardCancel } = useUnsavedChanges();
  const { isAdmin, perm } = usePermissions();
  const [preenchimento, setPreenchimento] = useState<PreenchimentoVenda | null>(null);

  const ABAS = isAdmin ? [...ABAS_BASE, ABA_COMISSOES] : ABAS_BASE;

  const abaParam = searchParams.get("aba") as Aba | null;
  const aba: Aba = (abaParam === "comissoes" && !isAdmin) ? "pipeline" : (abaParam ?? "pipeline");
  const abaAtual = ABAS.find((a) => a.value === aba) ?? ABAS[0];
  const tabPerm = perm(TAB_KEYS[aba]);

  function trocarAba(nova: Aba) {
    guardCancel(() => router.replace(`/comercial?aba=${nova}`));
  }

  function handleConverter(item: PipelineItem) {
    setPreenchimento({
      pipeline_id:       item.id,
      cliente:           item.cliente,
      vendedor_id:       item.vendedor_id,
      valor_implantacao: item.valor_implantacao,
      valor_mensal:      item.valor_mensal,
      servicos:          item.servicos ?? [],
      observacoes:       item.observacoes,
      indicado_por:      item.indicado_por,
    });
    router.replace("/comercial?aba=vendas");
  }

  const isWide = aba === "pipeline";

  return (
    <main className={`mx-auto px-4 py-8 ${isWide ? "max-w-full" : "max-w-5xl"}`}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Comercial</h1>
        <p className="mt-1 text-sm text-gray-500">{abaAtual.descricao}</p>
      </div>

      <div className="mb-7 flex gap-1 rounded-2xl border border-gray-200 bg-white p-1 shadow-sm w-fit">
        {ABAS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => trocarAba(value)}
            className={`rounded-xl px-5 py-2 text-sm font-semibold transition-colors ${
              aba === value ? "bg-folk text-white shadow-sm" : "text-gray-500 hover:text-gray-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {!tabPerm.can_view ? <AccessDenied /> : (
        <>
          {aba === "pipeline" && (
            <PipelineTab
              onConverter={handleConverter}
              onIrParaVendas={() => router.replace("/comercial?aba=vendas")}
              canEdit={tabPerm.can_edit}
              canDelete={tabPerm.can_delete}
            />
          )}
          {aba === "vendas" && (
            <VendasTab
              preenchimento={preenchimento}
              onPreenchimentoUsado={() => setPreenchimento(null)}
              canEdit={tabPerm.can_edit}
              canDelete={tabPerm.can_delete}
            />
          )}
          {aba === "dashboard" && <DashboardCRMTab />}
          {aba === "comissoes" && (
            <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white">
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-400">Painel de Comissões</p>
                <p className="mt-1 text-xs text-gray-300">Em breve</p>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}

export default function ComercialPage() {
  return (
    <Suspense fallback={null}>
      <ComercialPageContent />
    </Suspense>
  );
}
