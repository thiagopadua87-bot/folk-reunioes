"use client";

import { useState } from "react";
import { Card, CardHeader } from "./ui";

interface ResumoCardProps {
  resumo: string;
}

export default function ResumoCard({ resumo }: ResumoCardProps) {
  const [copiado, setCopiado] = useState(false);

  async function handleCopiar() {
    await navigator.clipboard.writeText(resumo);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  }

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-700">Resumo da Reunião</h2>
        <button
          onClick={handleCopiar}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
            copiado
              ? "bg-green-100 text-green-700"
              : "bg-folk/10 text-folk hover:bg-folk/20"
          }`}
        >
          {copiado ? (
            <>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Copiado!
            </>
          ) : (
            <>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-4 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copiar Resumo
            </>
          )}
        </button>
      </CardHeader>
      <pre className="whitespace-pre-wrap break-words px-6 py-4 font-sans text-sm leading-relaxed text-gray-700">
        {resumo}
      </pre>
    </Card>
  );
}
