"use client";

import { useState } from "react";

type Formato = "pdf-executivo" | "pdf-tecnico" | "excel";

const FORMATOS: { id: Formato; label: string; desc: string; icon: string }[] = [
  {
    id:    "pdf-executivo",
    label: "PDF Executivo",
    desc:  "Para o cliente — resumo, solução e valores.",
    icon:  "📄",
  },
  {
    id:    "pdf-tecnico",
    label: "PDF Técnico",
    desc:  "Uso interno — BOM, memorial e precificação.",
    icon:  "📋",
  },
  {
    id:    "excel",
    label: "Excel BOM",
    desc:  "Lista de materiais em planilha .xlsx.",
    icon:  "📊",
  },
];

export function ExportacaoButtons({ versaoId }: { versaoId: string }) {
  const [baixando, setBaixando] = useState<Formato | null>(null);
  const [erro, setErro]         = useState<string | null>(null);

  async function baixar(formato: Formato) {
    setBaixando(formato); setErro(null);
    try {
      let url: string;
      if (formato === "pdf-executivo") {
        url = `/api/ec/propostas/pdf?versaoId=${versaoId}&tipo=executivo`;
      } else if (formato === "pdf-tecnico") {
        url = `/api/ec/propostas/pdf?versaoId=${versaoId}&tipo=tecnico`;
      } else {
        url = `/api/ec/propostas/excel?versaoId=${versaoId}`;
      }

      const res = await fetch(url);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Erro desconhecido" }));
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
      }

      const blob     = await res.blob();
      const blobUrl  = URL.createObjectURL(blob);
      const anchor   = document.createElement("a");
      const filename = res.headers.get("Content-Disposition")
        ?.match(/filename="([^"]+)"/)?.[1] ?? "proposta.pdf";
      anchor.href     = blobUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setBaixando(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {FORMATOS.map((f) => {
          const carregando = baixando === f.id;
          return (
            <button
              key={f.id}
              onClick={() => baixar(f.id)}
              disabled={baixando !== null}
              title={f.desc}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-folk/40 hover:bg-folk/5 hover:text-folk disabled:cursor-not-allowed disabled:opacity-50"
            >
              {carregando ? (
                <svg className="h-3.5 w-3.5 animate-spin text-folk" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <span>{f.icon}</span>
              )}
              {carregando ? "Gerando..." : f.label}
            </button>
          );
        })}
      </div>

      {erro && (
        <p className="mt-2 text-xs text-red-600">
          Erro na exportação: {erro}
        </p>
      )}
    </div>
  );
}
