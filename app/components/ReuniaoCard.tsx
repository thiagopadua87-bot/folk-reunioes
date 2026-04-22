"use client";

import { useState } from "react";
import type { Reuniao } from "@/lib/reunioes";
import { Card } from "./ui";

interface ReuniaoCardProps {
  reuniao: Reuniao;
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function ReuniaoCard({ reuniao }: ReuniaoCardProps) {
  const [aberto, setAberto] = useState(false);

  return (
    <Card>
      <div className="px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-folk">
              {formatarData(reuniao.data)}
            </p>

            {reuniao.responsavel && (
              <p className="mt-1 text-sm text-gray-600">
                Ata:{" "}
                <span className="font-semibold text-gray-800">{reuniao.responsavel}</span>
              </p>
            )}

            {reuniao.participantes && (
              <p className="mt-1 text-xs text-gray-400">
                Participantes: {reuniao.participantes}
              </p>
            )}
          </div>

          <button
            onClick={() => setAberto((v) => !v)}
            className={`shrink-0 rounded-xl border px-4 py-1.5 text-sm font-semibold transition-colors ${
              aberto
                ? "border-folk/30 bg-folk/10 text-folk"
                : "border-gray-200 text-gray-600 hover:border-folk/30 hover:text-folk"
            }`}
          >
            {aberto ? "Fechar" : "Ver resumo"}
          </button>
        </div>
      </div>

      {aberto && (
        <div className="border-t border-gray-100 px-6 py-4">
          <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-gray-700">
            {reuniao.resumo || "Sem resumo registrado."}
          </pre>
        </div>
      )}
    </Card>
  );
}
