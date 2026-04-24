"use client";

import { useState } from "react";
import Link from "next/link";
import ProjetosTab from "./ProjetosTab";
import ObrasTab from "./ObrasTab";
import { useUnsavedChanges } from "@/lib/unsaved-changes";

type Aba = "projetos" | "obras";

const ABAS: { value: Aba; label: string; descricao: string }[] = [
  { value: "projetos", label: "Projetos", descricao: "Projetos em andamento e entregues ao comercial" },
  { value: "obras",    label: "Obras",    descricao: "Acompanhamento de execução e andamento das obras" },
];

export default function ProjetosPage() {
  const [aba, setAba] = useState<Aba>("projetos");
  const abaAtual = ABAS.find((a) => a.value === aba)!;
  const { guardCancel } = useUnsavedChanges();
  function trocarAba(nova: Aba) { guardCancel(() => setAba(nova)); };

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gerência de Projetos</h1>
          <p className="mt-1 text-sm text-gray-500">{abaAtual.descricao}</p>
        </div>
        <Link
          href="/projetos/dashboard"
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 shadow-sm transition-colors hover:border-folk/30 hover:text-folk"
        >
          📊 Dashboard
        </Link>
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

      {aba === "projetos" && <ProjetosTab />}
      {aba === "obras"    && <ObrasTab />}
    </main>
  );
}
