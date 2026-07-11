"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ObrasTab from "@/app/projetos/ObrasTab";
import DashboardObrasTab from "@/app/projetos/DashboardObrasTab";
import { useUnsavedChanges } from "@/lib/unsaved-changes";
import { usePermissions, AccessDenied } from "@/app/components/PermissionsProvider";
import type { ScreenKey } from "@/lib/permissions";

type Aba = "andamento" | "concluidas" | "dashboard";

const ABAS: { value: Aba; label: string; descricao: string }[] = [
  { value: "andamento",  label: "Em andamento", descricao: "Obras em execução, paralisadas e a executar" },
  { value: "concluidas", label: "Concluídas",   descricao: "Obras finalizadas e entregues" },
  { value: "dashboard",  label: "Dashboard",    descricao: "Inteligência operacional, riscos e saúde das obras" },
];

const TAB_KEYS: Record<Aba, ScreenKey> = {
  andamento:  "obras.andamento",
  concluidas: "obras.concluidas",
  dashboard:  "obras.dashboard",
};

function ObrasPageContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const { guardCancel } = useUnsavedChanges();
  const { perm } = usePermissions();

  const aba = (searchParams.get("aba") ?? "andamento") as Aba;
  const abaAtual = ABAS.find((a) => a.value === aba) ?? ABAS[0];
  const tabPerm = perm(TAB_KEYS[aba]);

  function trocarAba(nova: Aba) {
    guardCancel(() => router.replace(`/obras?aba=${nova}`));
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Obras</h1>
        <p className="mt-1 text-sm text-gray-500">{abaAtual.descricao}</p>
      </div>

      <div className="mb-8 flex gap-1 rounded-2xl border border-gray-200 bg-white p-1 shadow-sm w-fit">
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
          {aba === "andamento"  && <ObrasTab canEdit={tabPerm.can_edit} canDelete={tabPerm.can_delete} />}
          {aba === "concluidas" && <ObrasTab situacaoInicial="finalizada" canEdit={tabPerm.can_edit} canDelete={tabPerm.can_delete} />}
          {aba === "dashboard"  && <DashboardObrasTab />}
        </>
      )}
    </main>
  );
}

export default function ObrasPage() {
  return (
    <Suspense fallback={null}>
      <ObrasPageContent />
    </Suspense>
  );
}
