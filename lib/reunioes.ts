import { supabase } from "./supabase";
import type { ChecklistItem } from "./blocos";

export type { ChecklistItem as BlocoItem };

export interface Bloco {
  nome: string;
  itens: ChecklistItem[];
}

export interface Reuniao {
  id: string;
  data: string;
  responsavel: string;
  participantes: string;
  resumo: string;
  user_id: string;
}

export interface SalvarReuniaoPayload {
  responsavel: string;
  participantes: string;
  blocos: Bloco[];
  progresso: number;
  resumo: string;
  user_id: string;
}

export async function salvarReuniao(payload: SalvarReuniaoPayload): Promise<void> {
  const { error } = await supabase.from("reunioes").insert({
    data: new Date().toISOString(),
    responsavel: payload.responsavel,
    participantes: payload.participantes,
    blocos: payload.blocos,
    progresso: payload.progresso,
    resumo: payload.resumo,
    user_id: payload.user_id,
  });

  if (error) throw new Error(error.message);
}

export async function buscarReunioes(userId: string): Promise<Reuniao[]> {
  const { data, error } = await supabase
    .from("reunioes")
    .select("id, data, responsavel, participantes, resumo, user_id")
    .eq("user_id", userId)
    .order("data", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}
