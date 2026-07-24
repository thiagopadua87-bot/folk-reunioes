"use client";

import { useState } from "react";
import { calcularEngenharia } from "@/lib/engenharia-comercial/propostas-mutations";

export function RecalcularBanner({
  versaoId,
  onRecalculado,
}: {
  versaoId: string;
  onRecalculado: () => void;
}) {
  const [calculando, setCalculando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function recalcular() {
    setCalculando(true); setErro(null);
    try {
      await calcularEngenharia(versaoId);
      onRecalculado();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setCalculando(false);
    }
  }

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 shrink-0 text-amber-500">⚠</span>
          <div>
            <p className="text-sm font-semibold text-amber-900">
              Esta proposta foi alterada após o último cálculo.
            </p>
            <p className="mt-0.5 text-xs text-amber-700">
              A Lista de Materiais e a Precificação podem não refletir os dados atuais.
              O envio ao cliente e a conversão em venda estão bloqueados até o recálculo.
            </p>
          </div>
        </div>

        <button
          onClick={recalcular}
          disabled={calculando}
          className="shrink-0 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {calculando ? (
            <span className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Recalculando...
            </span>
          ) : "Recalcular Engenharia →"}
        </button>
      </div>

      {erro && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <strong>Erro no cálculo:</strong> {erro}
        </div>
      )}
    </div>
  );
}
