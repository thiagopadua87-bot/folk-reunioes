"use client";

import { useState } from "react";
import ClientesPerdidos from "./ClientesPerdidos";
import GestaoCrise from "./GestaoCrise";

type Aba = "clientes-perdidos" | "gestao-crise";

const ABAS: { value: Aba; label: string; descricao: string }[] = [
  { value: "clientes-perdidos", label: "Clientes Perdidos",  descricao: "Registros de contratos encerrados e análise de causas" },
  { value: "gestao-crise",      label: "Gestão de Crise",    descricao: "Monitoramento de clientes em risco de cancelamento" },
];

export default function OperacionalPage() {
  const [aba, setAba] = useState<Aba>("clientes-perdidos");

  const abaAtual = ABAS.find((a) => a.value === aba)!;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      {/* Cabeçalho */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Operacional</h1>
        <p className="mt-1 text-sm text-gray-500">{abaAtual.descricao}</p>
      </div>

      {/* Seletor de abas */}
      <div className="mb-8 flex gap-1 rounded-2xl border border-gray-200 bg-white p-1 shadow-sm w-fit">
        {ABAS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setAba(value)}
            className={`rounded-xl px-5 py-2 text-sm font-semibold transition-colors ${
              aba === value
                ? "bg-folk text-white shadow-sm"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Conteúdo da aba */}
      {aba === "clientes-perdidos" && <ClientesPerdidos />}
      {aba === "gestao-crise"      && <GestaoCrise />}
    </main>
  );
}
