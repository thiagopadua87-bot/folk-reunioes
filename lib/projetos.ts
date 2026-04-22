import { supabase } from "./supabase";
import type { Tecnico, Terceirizado } from "./cadastros";

// ── Constantes e tipos ──────────────────────────────────────

export const TIPOS_PROJETO = [
  { value: "portaria_remota",       label: "Portaria Remota" },
  { value: "grandes_projetos",      label: "Grandes Projetos" },
  { value: "seguranca_eletronica",  label: "Segurança Eletrônica" },
] as const;

export const SITUACOES_PROJETO = [
  { value: "em_execucao",           label: "Em execução" },
  { value: "entregue_ao_comercial", label: "Entregue ao comercial" },
] as const;

export const SITUACOES_OBRA = [
  { value: "a_executar",  label: "A executar" },
  { value: "em_execucao", label: "Em execução" },
  { value: "paralizada",  label: "Paralizada" },
  { value: "finalizada",  label: "Finalizada" },
] as const;

export const EQUIPES = [
  { value: "equipe_propria", label: "Equipe própria" },
  { value: "terceiro",       label: "Terceiro" },
] as const;

export const ANDAMENTOS = [0, 20, 40, 60, 80, 100] as const;

export type TipoProjeto    = (typeof TIPOS_PROJETO)[number]["value"];
export type SituacaoProjeto = (typeof SITUACOES_PROJETO)[number]["value"];
export type SituacaoObra   = (typeof SITUACOES_OBRA)[number]["value"];
export type Equipe         = (typeof EQUIPES)[number]["value"];
export type Andamento      = (typeof ANDAMENTOS)[number];

export interface Projeto {
  id: string;
  user_id: string;
  data_inicio: string;
  cliente: string;
  servicos: string[];
  situacao: SituacaoProjeto;
  valor: number;
  created_at: string;
}

export interface Obra {
  id: string;
  user_id: string;
  data_inicio: string;
  data_prazo: string | null;
  data_conclusao: string | null;
  cliente: string;
  servicos: string[];
  situacao: SituacaoObra;
  equipe: Equipe;
  tecnico_id: string | null;
  tecnico_nome: string | null;
  terceirizado_id: string | null;
  terceirizado_nome: string | null;
  valor_execucao: number;
  andamento: Andamento;
  observacoes: string;
  created_at: string;
}

export interface ProjetoLog {
  id: string;
  user_id: string;
  projeto_id: string;
  campo: string;
  valor_anterior: string;
  valor_novo: string;
  created_at: string;
}

export interface ObraLog {
  id: string;
  user_id: string;
  obra_id: string;
  campo: string;
  valor_anterior: string;
  valor_novo: string;
  created_at: string;
}

// ── Helpers de exibição ──────────────────────────────────────

export const labelTipoProjeto     = (v: TipoProjeto)     => TIPOS_PROJETO.find((t) => t.value === v)?.label ?? v;
export const labelSituacaoProjeto = (v: SituacaoProjeto) => SITUACOES_PROJETO.find((s) => s.value === v)?.label ?? v;
export const labelSituacaoObra    = (v: SituacaoObra)    => SITUACOES_OBRA.find((s) => s.value === v)?.label ?? v;
export const labelEquipe          = (v: Equipe)           => EQUIPES.find((e) => e.value === v)?.label ?? v;

export function formatMoeda(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}
export function formatData(s: string) {
  if (!s) return "—";
  return new Date(s + "T00:00:00").toLocaleDateString("pt-BR");
}

// ── Helpers de obras ──────────────────────────────────────────

export function calcularDiasExecucao(obra: Obra): number {
  if (!obra.data_inicio) return 0;
  const inicio = new Date(obra.data_inicio + "T00:00:00");
  const fim = obra.data_conclusao ? new Date(obra.data_conclusao + "T00:00:00") : new Date();
  fim.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((fim.getTime() - inicio.getTime()) / 86400000));
}

export function calcularDiasRestantes(obra: Obra): number | null {
  if (!obra.data_prazo || obra.situacao === "finalizada") return null;
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const prazo = new Date(obra.data_prazo + "T00:00:00");
  return Math.floor((prazo.getTime() - hoje.getTime()) / 86400000);
}

// ── Projetos ─────────────────────────────────────────────────

export interface FiltrosProjetos {
  situacao?: SituacaoProjeto | "";
}

export async function listarProjetos(filtros?: FiltrosProjetos): Promise<Projeto[]> {
  let q = supabase.from("projetos").select("*").order("data_inicio", { ascending: false });
  if (filtros?.situacao) q = q.eq("situacao", filtros.situacao);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function criarProjeto(payload: Omit<Projeto, "id" | "user_id" | "created_at">): Promise<void> {
  const { error } = await supabase.from("projetos").insert(payload);
  if (error) throw new Error(error.message);
}

export async function editarProjeto(
  id: string,
  payload: Omit<Projeto, "id" | "user_id" | "created_at">,
  dadosAntigos: Projeto,
): Promise<void> {
  const { error } = await supabase.from("projetos").update(payload).eq("id", id);
  if (error) throw new Error(error.message);
  registrarAlteracoesProjeto(id, dadosAntigos, payload).catch(() => {});
}

export async function excluirProjeto(id: string): Promise<void> {
  const { error } = await supabase.from("projetos").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function listarLogsProjeto(projetoId: string): Promise<ProjetoLog[]> {
  const { data, error } = await supabase
    .from("projeto_logs")
    .select("*")
    .eq("projeto_id", projetoId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ProjetoLog[];
}

async function registrarAlteracoesProjeto(
  projetoId: string,
  antigo: Omit<Projeto, "id" | "user_id" | "created_at">,
  novo: Omit<Projeto, "id" | "user_id" | "created_at">,
): Promise<void> {
  type L = { projeto_id: string; campo: string; valor_anterior: string; valor_novo: string };
  const logs: L[] = [];

  if (antigo.situacao !== novo.situacao)
    logs.push({ projeto_id: projetoId, campo: "situacao", valor_anterior: labelSituacaoProjeto(antigo.situacao), valor_novo: labelSituacaoProjeto(novo.situacao) });

  if (antigo.valor !== novo.valor)
    logs.push({ projeto_id: projetoId, campo: "valor", valor_anterior: formatMoeda(antigo.valor), valor_novo: formatMoeda(novo.valor) });

  if (logs.length === 0) return;
  await supabase.from("projeto_logs").insert(logs);
}

// ── Obras ─────────────────────────────────────────────────────

export interface FiltrosObras {
  situacao?: SituacaoObra | "";
  equipe?: Equipe | "";
}

export type ObraPayload = Omit<Obra, "id" | "user_id" | "created_at" | "tecnico_nome" | "terceirizado_nome">;

type RawObra = Omit<Obra, "tecnico_nome" | "terceirizado_nome"> & {
  tecnicos: { nome: string } | null;
  terceirizados: { nome_empresa: string } | null;
};

export async function listarObras(filtros?: FiltrosObras): Promise<Obra[]> {
  let q = supabase.from("obras").select("*, tecnicos(nome), terceirizados(nome_empresa)").order("data_inicio", { ascending: false });
  if (filtros?.situacao) q = q.eq("situacao", filtros.situacao);
  if (filtros?.equipe)   q = q.eq("equipe", filtros.equipe);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return ((data ?? []) as RawObra[]).map(({ tecnicos, terceirizados, ...o }) => ({
    ...o,
    tecnico_nome:      tecnicos?.nome ?? null,
    terceirizado_nome: terceirizados?.nome_empresa ?? null,
  }));
}

export async function criarObra(payload: ObraPayload): Promise<void> {
  const { error } = await supabase.from("obras").insert(payload);
  if (error) throw new Error(error.message);
}

export async function editarObra(
  id: string,
  payload: ObraPayload,
  dadosAntigos: Obra,
  tecnicos: Tecnico[],
  terceirizados: Terceirizado[],
): Promise<void> {
  const { error } = await supabase.from("obras").update(payload).eq("id", id);
  if (error) throw new Error(error.message);
  registrarAlteracoesObra(id, dadosAntigos, payload, tecnicos, terceirizados).catch(() => {});
}

export async function excluirObra(id: string): Promise<void> {
  const { error } = await supabase.from("obras").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function listarLogsObra(obraId: string): Promise<ObraLog[]> {
  const { data, error } = await supabase
    .from("obra_logs")
    .select("*")
    .eq("obra_id", obraId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ObraLog[];
}

async function registrarAlteracoesObra(
  obraId: string,
  antigo: Obra,
  novo: ObraPayload,
  tecnicos: Tecnico[],
  terceirizados: Terceirizado[],
): Promise<void> {
  type L = { obra_id: string; campo: string; valor_anterior: string; valor_novo: string };
  const logs: L[] = [];

  if (antigo.data_inicio !== novo.data_inicio)
    logs.push({ obra_id: obraId, campo: "data_inicio", valor_anterior: formatData(antigo.data_inicio), valor_novo: formatData(novo.data_inicio) });

  if ((antigo.data_prazo ?? "") !== (novo.data_prazo ?? ""))
    logs.push({ obra_id: obraId, campo: "data_prazo", valor_anterior: antigo.data_prazo ? formatData(antigo.data_prazo) : "—", valor_novo: novo.data_prazo ? formatData(novo.data_prazo) : "—" });

  if (antigo.situacao !== novo.situacao)
    logs.push({ obra_id: obraId, campo: "situacao", valor_anterior: labelSituacaoObra(antigo.situacao), valor_novo: labelSituacaoObra(novo.situacao) });

  if (antigo.equipe !== novo.equipe)
    logs.push({ obra_id: obraId, campo: "equipe", valor_anterior: labelEquipe(antigo.equipe), valor_novo: labelEquipe(novo.equipe) });

  if ((antigo.tecnico_id ?? "") !== (novo.tecnico_id ?? "")) {
    const nomeAntigo = antigo.tecnico_nome ?? tecnicos.find((t) => t.id === antigo.tecnico_id)?.nome ?? "—";
    const nomeNovo   = tecnicos.find((t) => t.id === novo.tecnico_id)?.nome ?? "—";
    logs.push({ obra_id: obraId, campo: "tecnico", valor_anterior: nomeAntigo, valor_novo: nomeNovo });
  }

  if ((antigo.terceirizado_id ?? "") !== (novo.terceirizado_id ?? "")) {
    const nomeAntigo = antigo.terceirizado_nome ?? terceirizados.find((t) => t.id === antigo.terceirizado_id)?.nome_empresa ?? "—";
    const nomeNovo   = terceirizados.find((t) => t.id === novo.terceirizado_id)?.nome_empresa ?? "—";
    logs.push({ obra_id: obraId, campo: "terceirizado", valor_anterior: nomeAntigo, valor_novo: nomeNovo });
  }

  if (antigo.valor_execucao !== novo.valor_execucao)
    logs.push({ obra_id: obraId, campo: "valor_execucao", valor_anterior: formatMoeda(antigo.valor_execucao), valor_novo: formatMoeda(novo.valor_execucao) });

  if (antigo.andamento !== novo.andamento)
    logs.push({ obra_id: obraId, campo: "andamento", valor_anterior: `${antigo.andamento}%`, valor_novo: `${novo.andamento}%` });

  if (logs.length === 0) return;
  await supabase.from("obra_logs").insert(logs);
}
