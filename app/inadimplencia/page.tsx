"use client";

import { useState } from "react";
import FaturasTab from "./FaturasTab";
import DashboardCobrancaTab from "./DashboardCobrancaTab";
import ConfiguracoesCobrancaTab from "./ConfiguracoesCobrancaTab";
import { useUnsavedChanges } from "@/lib/unsaved-changes";

type Aba = "faturas" | "dashboard" | "configuracoes";

const ABAS: { value: Aba; label: string; descricao: string }[] = [
  { value: "faturas",        label: "Faturas",        descricao: "Faturas em aberto e histórico de ações de cobrança" },
  { value: "dashboard",      label: "Dashboard",      descricao: "Visão gerencial da inadimplência e recuperação de crédito" },
  { value: "configuracoes",  label: "Configurações",  descricao: "Tipos de ação e parâmetros do módulo de cobrança" },
];

export default function InadimplenciaPage() {
  const [aba, setAba] = useState<Aba>("faturas");
  const abaAtual = ABAS.find((a) => a.value === aba)!;
  const { guardCancel } = useUnsavedChanges();

  function trocarAba(nova: Aba) { guardCancel(() => setAba(nova)); }

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

      {aba === "faturas"       && <FaturasTab />}
      {aba === "dashboard"     && <DashboardCobrancaTab />}
      {aba === "configuracoes" && <ConfiguracoesCobrancaTab />}
    </main>
  );
}
