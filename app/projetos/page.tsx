"use client";

import { useState } from "react";
import ProjetosTab from "./ProjetosTab";
import ObrasTab from "./ObrasTab";
import DashboardObrasTab from "./DashboardObrasTab";
import { useUnsavedChanges } from "@/lib/unsaved-changes";

type Aba = "projetos" | "obras" | "dashboard";

const ABAS: { value: Aba; label: string; descricao: string }[] = [
  { value: "projetos",  label: "Projetos",  descricao: "Projetos em andamento e entregues ao comercial" },
  { value: "obras",     label: "Obras",     descricao: "Acompanhamento de execução e andamento das obras" },
  { value: "dashboard", label: "Dashboard", descricao: "Inteligência operacional, riscos e saúde da operação" },
];

export default function ProjetosPage() {
  const [aba, setAba] = useState<Aba>("projetos");
  const abaAtual = ABAS.find((a) => a.value === aba)!;
  const { guardCancel } = useUnsavedChanges();
  function trocarAba(nova: Aba) { guardCancel(() => setAba(nova)); }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Gerência de Projetos</h1>
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

      {aba === "projetos"  && <ProjetosTab />}
      {aba === "obras"     && <ObrasTab />}
      {aba === "dashboard" && <DashboardObrasTab />}
    </main>
  );
}
