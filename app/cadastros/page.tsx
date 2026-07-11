"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import VendedoresTab from "./VendedoresTab";
import TecnicosTab from "./TecnicosTab";
import TerceirizadosTab from "./TerceirizadosTab";
import CompetitoresTab from "./CompetitoresTab";
import MotivosDePerda from "./MotivosDePerda";
import SindicosGestoresTab from "./SindicosGestoresTab";
import { useUnsavedChanges } from "@/lib/unsaved-changes";
import { usePermissions, AccessDenied } from "@/app/components/PermissionsProvider";
import type { ScreenKey } from "@/lib/permissions";

type Aba =
  | "vendedores"
  | "tecnicos"
  | "terceirizados"
  | "concorrentes"
  | "motivos_perda"
  | "sindicos_gestores";

const ABAS: { value: Aba; label: string; descricao: string }[] = [
  { value: "vendedores",        label: "Vendedores",        descricao: "Equipe comercial responsável pelas vendas" },
  { value: "tecnicos",          label: "Técnicos",          descricao: "Técnicos internos para execução de obras e serviços" },
  { value: "terceirizados",     label: "Terceirizados",     descricao: "Empresas e parceiros terceirizados" },
  { value: "concorrentes",      label: "Concorrentes",      descricao: "Empresas concorrentes presentes nas oportunidades" },
  { value: "motivos_perda",     label: "Motivos de Perda",  descricao: "Cadastro dos motivos utilizados na gestão de clientes perdidos" },
  { value: "sindicos_gestores", label: "Síndicos/Gestores", descricao: "Síndicos e gestores vinculados aos leads do pipeline" },
];

const TAB_KEYS: Record<Aba, ScreenKey> = {
  vendedores:        "cadastros.vendedores",
  tecnicos:          "cadastros.tecnicos",
  terceirizados:     "cadastros.terceirizados",
  concorrentes:      "cadastros.concorrentes",
  motivos_perda:     "cadastros.motivos_perda",
  sindicos_gestores: "cadastros.sindicos_gestores",
};

function CadastrosPageContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const { guardCancel } = useUnsavedChanges();
  const { perm } = usePermissions();

  const aba = (searchParams.get("aba") ?? "vendedores") as Aba;
  const abaAtual = ABAS.find((a) => a.value === aba) ?? ABAS[0];
  const tabPerm = perm(TAB_KEYS[aba]);

  function trocarAba(nova: Aba) {
    guardCancel(() => router.replace(`/cadastros?aba=${nova}`));
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Cadastros</h1>
        <p className="mt-1 text-sm text-gray-500">{abaAtual.descricao}</p>
      </div>

      <div className="mb-8 flex flex-wrap gap-1 rounded-2xl border border-gray-200 bg-white p-1 shadow-sm w-fit">
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
          {aba === "vendedores"        && <VendedoresTab canEdit={tabPerm.can_edit} />}
          {aba === "tecnicos"          && <TecnicosTab canEdit={tabPerm.can_edit} />}
          {aba === "terceirizados"     && <TerceirizadosTab canEdit={tabPerm.can_edit} />}
          {aba === "concorrentes"      && <CompetitoresTab canEdit={tabPerm.can_edit} />}
          {aba === "motivos_perda"     && <MotivosDePerda canEdit={tabPerm.can_edit} />}
          {aba === "sindicos_gestores" && <SindicosGestoresTab canEdit={tabPerm.can_edit} />}
        </>
      )}
    </main>
  );
}

export default function CadastrosPage() {
  return (
    <Suspense fallback={null}>
      <CadastrosPageContent />
    </Suspense>
  );
}
