import type { Bloco } from "./reunioes";

export interface MetadadosReuniao {
  responsavel: string;
  participantes: string;
}

function formatarLinhasTabela(
  colunas: { id: string; label: string; tipo: string }[],
  linhas: { valores: Record<string, string> }[]
): string {
  if (linhas.length === 0) return "    Nenhum registro.";
  return linhas
    .map((linha) =>
      "    → " +
      colunas
        .map((col) => {
          const val = linha.valores[col.id]?.trim();
          if (!val) return null;
          if (col.tipo === "date") {
            const d = new Date(val + "T00:00:00");
            return isNaN(d.getTime()) ? val : d.toLocaleDateString("pt-BR");
          }
          if (col.tipo === "moeda") return `R$ ${val}`;
          return val;
        })
        .filter(Boolean)
        .join(" | ")
    )
    .join("\n");
}

export function gerarResumo(blocos: Bloco[], meta: MetadadosReuniao): string {
  const data = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const cabecalho = [`Reunião Semanal — ${data}`];
  if (meta.responsavel) cabecalho.push(`Responsável pela ata: ${meta.responsavel}`);
  if (meta.participantes) cabecalho.push(`Participantes: ${meta.participantes}`);

  const secoes = blocos.map((bloco) => {
    const linhas = bloco.itens.map((item) => {
      if (item.tipo === "tabela" && item.colunas) {
        const tabela = formatarLinhasTabela(item.colunas, item.linhas ?? []);
        return `  ${item.label}\n${tabela}`;
      }
      const anotacao = item.anotacao.trim() ? `\n    ${item.anotacao.trim()}` : "";
      return `  ${item.label}${anotacao}`;
    });

    return `${bloco.nome}:\n${linhas.join("\n")}`;
  });

  return [...cabecalho, "", ...secoes].join("\n\n");
}
