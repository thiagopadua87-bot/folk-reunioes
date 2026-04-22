"use client";

import type { ColunaTabela, LinhaTabela } from "@/lib/blocos";

interface TabelaChecklistProps {
  colunas: ColunaTabela[];
  linhas: LinhaTabela[];
  onChange: (linhas: LinhaTabela[]) => void;
}

function novaLinha(colunas: ColunaTabela[]): LinhaTabela {
  return {
    id: crypto.randomUUID(),
    valores: Object.fromEntries(colunas.map((c) => [c.id, ""])),
  };
}

const TEMPERATURA_CORES: Record<string, string> = {
  Fria: "text-blue-600",
  Morna: "text-amber-600",
  Quente: "text-red-600",
};

export default function TabelaChecklist({ colunas, linhas, onChange }: TabelaChecklistProps) {
  function handleCell(linhaId: string, colunaId: string, value: string) {
    onChange(linhas.map((l) =>
      l.id === linhaId ? { ...l, valores: { ...l.valores, [colunaId]: value } } : l
    ));
  }

  function handleAdd() {
    onChange([...linhas, novaLinha(colunas)]);
  }

  function handleRemove(linhaId: string) {
    onChange(linhas.filter((l) => l.id !== linhaId));
  }

  return (
    <div className="mt-3">
      {linhas.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full min-w-max border-collapse">
            <thead>
              <tr className="bg-folk-header">
                {colunas.map((col) => (
                  <th
                    key={col.id}
                    className="border-b border-gray-200 px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                  >
                    {col.label}
                  </th>
                ))}
                <th className="w-8 border-b border-gray-200" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {linhas.map((linha) => (
                <tr key={linha.id} className="group bg-white hover:bg-gray-50/50 transition-colors">
                  {colunas.map((col) => (
                    <td key={col.id} className="px-3 py-2">
                      {col.tipo === "select" ? (
                        <select
                          value={linha.valores[col.id] ?? ""}
                          onChange={(e) => handleCell(linha.id, col.id, e.target.value)}
                          className={`w-full bg-transparent text-xs outline-none ${
                            TEMPERATURA_CORES[linha.valores[col.id]] ?? "text-gray-700"
                          }`}
                        >
                          <option value="">—</option>
                          {col.opcoes?.map((op) => (
                            <option key={op} value={op}>{op}</option>
                          ))}
                        </select>
                      ) : col.tipo === "moeda" ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-400">R$</span>
                          <input
                            type="text"
                            value={linha.valores[col.id] ?? ""}
                            onChange={(e) => handleCell(linha.id, col.id, e.target.value)}
                            placeholder={col.placeholder}
                            className="w-full min-w-[60px] bg-transparent text-xs text-gray-700 outline-none placeholder:text-gray-300"
                          />
                        </div>
                      ) : (
                        <input
                          type={col.tipo === "date" ? "date" : "text"}
                          value={linha.valores[col.id] ?? ""}
                          onChange={(e) => handleCell(linha.id, col.id, e.target.value)}
                          placeholder={col.placeholder}
                          className="w-full min-w-[80px] bg-transparent text-xs text-gray-700 outline-none placeholder:text-gray-300"
                        />
                      )}
                    </td>
                  ))}
                  <td className="pr-2 text-center">
                    {!linha.salvo && (
                      <button
                        onClick={() => handleRemove(linha.id)}
                        className="text-gray-300 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-400"
                        title="Remover linha"
                      >
                        ×
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button
        onClick={handleAdd}
        className="mt-2 flex items-center gap-1.5 rounded-lg border border-dashed border-folk/30 px-3 py-1.5 text-xs font-semibold text-folk/70 transition-colors hover:border-folk hover:text-folk"
      >
        + Adicionar linha
      </button>
    </div>
  );
}
