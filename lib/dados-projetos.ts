import { supabase } from "./supabase";
import type { LinhaTabela } from "./blocos";

export interface DadosProjetos {
  projetos: LinhaTabela[];
  obras: LinhaTabela[];
}

export async function buscarDadosProjetos(userId: string): Promise<DadosProjetos> {
  const { data, error } = await supabase
    .from("dados_projetos")
    .select("tipo, linhas")
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  const marcarSalvo = (linhas: LinhaTabela[]) =>
    linhas.map((l) => ({ ...l, salvo: true }));

  return {
    projetos: marcarSalvo(data?.find((r) => r.tipo === "projetos")?.linhas ?? []),
    obras:    marcarSalvo(data?.find((r) => r.tipo === "obras")?.linhas    ?? []),
  };
}

export async function salvarDadosProjetos(
  userId: string,
  dados: DadosProjetos
): Promise<void> {
  const { error } = await supabase.from("dados_projetos").upsert(
    [
      { user_id: userId, tipo: "projetos", linhas: dados.projetos },
      { user_id: userId, tipo: "obras",    linhas: dados.obras },
    ],
    { onConflict: "user_id,tipo" }
  );

  if (error) throw new Error(error.message);
}
