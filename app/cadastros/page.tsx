"use client";

import { useState } from "react";
import VendedoresTab from "./VendedoresTab";
import TecnicosTab from "./TecnicosTab";
import TerceirizadosTab from "./TerceirizadosTab";
import CompetitoresTab from "./CompetitoresTab";
import { useUnsavedChanges } from "@/lib/unsaved-changes";

type Aba = "vendedores" | "tecnicos" | "terceirizados" | "concorrentes";

const ABAS: { value: Aba; label: string; descricao: string }[] = [
  { value: "vendedores",    label: "Vendedores",    descricao: "Equipe comercial responsável pelas vendas" },
  { value: "tecnicos",      label: "Técnicos",      descricao: "Técnicos internos para execução de obras e serviços" },
  { value: "terceirizados", label: "Terceirizados", descricao: "Empresas e parceiros terceirizados" },
  { value: "concorrentes",  label: "Concorrentes",  descricao: "Empresas concorrentes presentes nas oportunidades" },
];

export default function CadastrosPage() {
  const [aba, setAba] = useState<Aba>("vendedores");
  const abaAtual = ABAS.find((a) => a.value === aba)!;
  const { guardCancel } = useUnsavedChanges();
  function trocarAba(nova: Aba) { guardCancel(() => setAba(nova)); };

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Cadastros</h1>
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

      {aba === "vendedores"    && <VendedoresTab />}
      {aba === "tecnicos"      && <TecnicosTab />}
      {aba === "terceirizados" && <TerceirizadosTab />}
      {aba === "concorrentes"  && <CompetitoresTab />}
    </main>
  );
}
