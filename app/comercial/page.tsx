"use client";

import { useState } from "react";
import VendasTab from "./VendasTab";
import PipelineTab from "./PipelineTab";
import type { PreenchimentoVenda, PipelineItem } from "@/lib/comercial";
import { useUnsavedChanges } from "@/lib/unsaved-changes";

type Aba = "vendas" | "pipeline";

const ABAS: { value: Aba; label: string; descricao: string }[] = [
  { value: "vendas",   label: "Vendas",   descricao: "Contratos fechados e receita realizada" },
  { value: "pipeline", label: "Pipeline", descricao: "Propostas em andamento e potencial de receita" },
];

export default function ComercialPage() {
  const [aba, setAba] = useState<Aba>("vendas");
  const [preenchimento, setPreenchimento] = useState<PreenchimentoVenda | null>(null);
  const abaAtual = ABAS.find((a) => a.value === aba)!;
  const { guardCancel } = useUnsavedChanges();

  function trocarAba(nova: Aba) { guardCancel(() => setAba(nova)); }

  function handleConverter(item: PipelineItem) {
    setPreenchimento({
      pipeline_id:  item.id,
      cliente:      item.cliente,
      vendedor_id:  item.vendedor_id,
      valor_implantacao: item.valor_implantacao,
      valor_mensal:      item.valor_mensal,
      servicos:     item.servicos ?? [],
      observacoes:  item.observacoes,
      indicado_por: item.indicado_por,
    });
    setAba("vendas");
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Comercial</h1>
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

      {aba === "vendas" && (
        <VendasTab
          preenchimento={preenchimento}
          onPreenchimentoUsado={() => setPreenchimento(null)}
        />
      )}
      {aba === "pipeline" && (
        <PipelineTab
          onConverter={handleConverter}
          onIrParaVendas={() => setAba("vendas")}
        />
      )}
    </main>
  );
}
