"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ClientesPerdidos from "./ClientesPerdidos";
import GestaoCrise from "./GestaoCrise";
import { useUnsavedChanges } from "@/lib/unsaved-changes";

type Aba = "clientes-perdidos" | "gestao-crise";

const ABAS: { value: Aba; label: string; descricao: string }[] = [
  { value: "clientes-perdidos", label: "Clientes Perdidos", descricao: "Registros de contratos encerrados e análise de causas" },
  { value: "gestao-crise",      label: "Gestão de Crise",   descricao: "Monitoramento de clientes em risco de cancelamento" },
];

function OperacionalContent() {
  const searchParams              = useSearchParams();
  const router                    = useRouter();
  const { guardCancel }           = useUnsavedChanges();
  const [focoRegistroId, setFocoRegistroId] = useState<string | null>(null);

  const abaParam = searchParams.get("aba") as Aba | null;
  const aba: Aba = abaParam ?? "clientes-perdidos";
  const abaAtual = ABAS.find((a) => a.value === aba) ?? ABAS[0];

  function trocarAba(nova: Aba) {
    guardCancel(() => router.replace(`/operacional?aba=${nova}`));
  }

  function navegarParaClientePerdido(id: string) {
    setFocoRegistroId(id);
    router.replace("/operacional?aba=clientes-perdidos");
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Operacional</h1>
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

      {aba === "clientes-perdidos" && (
        <ClientesPerdidos
          focoRegistroId={focoRegistroId}
          onFocoConsumido={() => setFocoRegistroId(null)}
        />
      )}
      {aba === "gestao-crise" && (
        <GestaoCrise onNavigarParaClientePerdido={navegarParaClientePerdido} />
      )}
    </main>
  );
}

export default function OperacionalPage() {
  return (
    <Suspense fallback={null}>
      <OperacionalContent />
    </Suspense>
  );
}
