"use client";

import type { BlocoConfig, LinhaTabela } from "@/lib/blocos";
import TabelaChecklist from "./TabelaChecklist";
import { Card } from "./ui";

interface MeetingBlockProps {
  bloco: BlocoConfig;
  onAnotacaoChange: (itemId: string, value: string) => void;
  onLinhasChange: (itemId: string, linhas: LinhaTabela[]) => void;
}

export default function MeetingBlock({ bloco, onAnotacaoChange, onLinhasChange }: MeetingBlockProps) {
  return (
    <Card>
      <div className="rounded-t-2xl border-b border-gray-100 px-6 py-4 bg-folk-header">
        <h2 className="text-base font-bold text-gray-800">{bloco.nome}</h2>
      </div>

      <div className="divide-y divide-gray-100">
        {bloco.itens.map((item) => (
          <div key={item.id} className="px-6 py-4">
            <p className="text-sm font-semibold text-gray-700">{item.label}</p>

            {item.tipo === "tabela" && item.colunas ? (
              <TabelaChecklist
                colunas={item.colunas}
                linhas={item.linhas ?? []}
                onChange={(linhas) => onLinhasChange(item.id, linhas)}
              />
            ) : (
              <textarea
                value={item.anotacao}
                onChange={(e) => onAnotacaoChange(item.id, e.target.value)}
                placeholder="Anotação (opcional)..."
                rows={2}
                className="mt-2 w-full resize-none rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600 placeholder-gray-400 outline-none transition-colors focus:border-folk focus:ring-2 focus:ring-folk/10"
              />
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
