import { supabase } from "./supabase";
import type { LinhaTabela } from "./blocos";

export interface DadosComerciais {
  vendas: LinhaTabela[];
  pipeline: LinhaTabela[];
}

export async function buscarDadosComerciais(userId: string): Promise<DadosComerciais> {
  const { data, error } = await supabase
    .from("dados_comerciais")
    .select("tipo, linhas")
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  const marcarSalvo = (linhas: LinhaTabela[]) =>
    linhas.map((l) => ({ ...l, salvo: true }));

  return {
    vendas:    marcarSalvo(data?.find((r) => r.tipo === "vendas")?.linhas   ?? []),
    pipeline:  marcarSalvo(data?.find((r) => r.tipo === "pipeline")?.linhas ?? []),
  };
}

export async function salvarDadosComerciais(
  userId: string,
  dados: DadosComerciais
): Promise<void> {
  const { error } = await supabase.from("dados_comerciais").upsert(
    [
      { user_id: userId, tipo: "vendas",   linhas: dados.vendas },
      { user_id: userId, tipo: "pipeline", linhas: dados.pipeline },
    ],
    { onConflict: "user_id,tipo" }
  );

  if (error) throw new Error(error.message);
}
