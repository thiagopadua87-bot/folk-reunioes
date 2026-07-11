"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ClientesCobrancaTab from "./ClientesCobrancaTab";
import DashboardCobrancaTab from "./DashboardCobrancaTab";
import ConfiguracoesCobrancaTab from "./ConfiguracoesCobrancaTab";
import { useUnsavedChanges } from "@/lib/unsaved-changes";
import { usePermissions, AccessDenied } from "@/app/components/PermissionsProvider";
import type { ScreenKey } from "@/lib/permissions";

type Aba = "faturas" | "dashboard" | "configuracoes";

const ABAS: { value: Aba; label: string; descricao: string }[] = [
  { value: "faturas",       label: "Clientes",      descricao: "Visão de cobrança por cliente — histórico, ações e faturas em aberto" },
  { value: "dashboard",     label: "Dashboard",     descricao: "Visão gerencial da inadimplência e recuperação de crédito" },
  { value: "configuracoes", label: "Configurações", descricao: "Tipos de ação e parâmetros do módulo de cobrança" },
];

const TAB_KEYS: Record<Aba, ScreenKey> = {
  faturas:       "cobranca.clientes",
  dashboard:     "cobranca.dashboard",
  configuracoes: "cobranca.configuracoes",
};

function InadimplenciaPageContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const { guardCancel } = useUnsavedChanges();
  const { perm } = usePermissions();

  const aba = (searchParams.get("aba") ?? "faturas") as Aba;
  const abaAtual = ABAS.find((a) => a.value === aba) ?? ABAS[0];
  const tabPerm = perm(TAB_KEYS[aba]);

  function trocarAba(nova: Aba) {
    guardCancel(() => router.replace(`/inadimplencia?aba=${nova}`));
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cobrança</h1>
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
          {aba === "faturas"       && <ClientesCobrancaTab canEdit={tabPerm.can_edit} />}
          {aba === "dashboard"     && <DashboardCobrancaTab />}
          {aba === "configuracoes" && <ConfiguracoesCobrancaTab canEdit={tabPerm.can_edit} />}
        </>
      )}
    </main>
  );
}

export default function InadimplenciaPage() {
  return (
    <Suspense fallback={null}>
      <InadimplenciaPageContent />
    </Suspense>
  );
}
