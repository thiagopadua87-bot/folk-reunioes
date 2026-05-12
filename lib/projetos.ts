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

export const ANDAMENTOS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100] as const;

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
  observacoes: string;
  created_at: string;
}

export interface Obra {
  id: string;
  user_id: string;
  data_inicio: string;
  data_inicio_previsto: string | null;
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
  venda_id: string | null;
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
  autor_nome?: string | null;
  created_at: string;
}

// ── Obra Ações ────────────────────────────────────────────────

export const OBRA_ACAO_STATUSES = [
  { value: "pendente",            label: "Pendente" },
  { value: "em_andamento",        label: "Em andamento" },
  { value: "concluido",           label: "Concluído" },
  { value: "aguardando_terceiro", label: "Aguardando terceiro" },
  { value: "bloqueado",           label: "Bloqueado" },
] as const;

export const OBRA_ACAO_PRIORIDADES = [
  { value: "baixa",   label: "Baixa" },
  { value: "media",   label: "Média" },
  { value: "alta",    label: "Alta" },
  { value: "critica", label: "Crítica" },
] as const;

export type ObraAcaoStatus    = (typeof OBRA_ACAO_STATUSES)[number]["value"];
export type ObraAcaoPrioridade = (typeof OBRA_ACAO_PRIORIDADES)[number]["value"];

export interface ObraAcao {
  id: string;
  obra_id: string;
  titulo: string;
  descricao: string;
  responsavel: string;
  prazo: string | null;
  status: ObraAcaoStatus;
  prioridade: ObraAcaoPrioridade;
  observacao: string;
  data_conclusao: string | null;
  created_at: string;
  updated_at: string;
}

export type ObraAcaoPayload = Omit<ObraAcao, "id" | "created_at" | "updated_at">;

// ── Obra Pendências ───────────────────────────────────────────

export const OBRA_PENDENCIA_NIVEIS = [
  { value: "critico",     label: "Crítico" },
  { value: "atencao",     label: "Atenção" },
  { value: "informativo", label: "Informativo" },
] as const;

export const OBRA_PENDENCIA_STATUSES = [
  { value: "aberta",     label: "Aberta" },
  { value: "em_analise", label: "Em análise" },
  { value: "resolvida",  label: "Resolvida" },
] as const;

export type ObraPendenciaNivel  = (typeof OBRA_PENDENCIA_NIVEIS)[number]["value"];
export type ObraPendenciaStatus = (typeof OBRA_PENDENCIA_STATUSES)[number]["value"];

export interface ObraPendencia {
  id: string;
  obra_id: string;
  titulo: string;
  descricao: string;
  nivel: ObraPendenciaNivel;
  responsavel: string;
  status: ObraPendenciaStatus;
  created_at: string;
  resolved_at: string | null;
}

export type ObraPendenciaPayload = Omit<ObraPendencia, "id" | "created_at">;

// ── Evento do histórico ───────────────────────────────────────

export interface EventoObra {
  id: string;
  icone: string;
  titulo: string;
  descricao: string;
  autor_nome?: string | null;
  created_at: string;
}

// ── Label helpers ─────────────────────────────────────────────

export const labelObraAcaoStatus     = (v: ObraAcaoStatus)     => OBRA_ACAO_STATUSES.find((s) => s.value === v)?.label ?? v;
export const labelObraAcaoPrioridade = (v: ObraAcaoPrioridade) => OBRA_ACAO_PRIORIDADES.find((p) => p.value === v)?.label ?? v;
export const labelObraPendenciaNivel  = (v: ObraPendenciaNivel)  => OBRA_PENDENCIA_NIVEIS.find((n) => n.value === v)?.label ?? v;
export const labelObraPendenciaStatus = (v: ObraPendenciaStatus) => OBRA_PENDENCIA_STATUSES.find((s) => s.value === v)?.label ?? v;

// ── formatarEventoObra ────────────────────────────────────────

const EVENTO_ICONE: Record<string, string> = {
  situacao:            "📋",
  andamento:           "📊",
  data_prazo:          "📅",
  data_inicio:         "📅",
  data_inicio_previsto:"📅",
  equipe:              "👥",
  tecnico:             "👤",
  terceirizado:        "🏢",
  valor_execucao:      "💰",
  observacoes:         "📝",
  acao_criada:         "✅",
  acao_concluida:      "🎯",
  acao_reaberta:       "🔄",
  acao_editada:        "✏️",
  acao_excluida:       "🗑️",
  pendencia_criada:    "⚠️",
  pendencia_resolvida: "✅",
  pendencia_reaberta:  "🔄",
  pendencia_excluida:  "🗑️",
};

const EVENTO_TITULO: Record<string, string> = {
  situacao:            "Situação alterada",
  andamento:           "Andamento atualizado",
  data_prazo:          "Prazo alterado",
  data_inicio:         "Data de registro alterada",
  data_inicio_previsto:"Início previsto alterado",
  equipe:              "Equipe alterada",
  tecnico:             "Técnico alterado",
  terceirizado:        "Terceirizado alterado",
  valor_execucao:      "Valor de execução alterado",
  observacoes:         "Comentários atualizados",
  acao_criada:         "Ação registrada",
  acao_concluida:      "Ação concluída",
  acao_reaberta:       "Ação reaberta",
  acao_editada:        "Ação editada",
  acao_excluida:       "Ação removida",
  pendencia_criada:    "Pendência registrada",
  pendencia_resolvida: "Pendência resolvida",
  pendencia_reaberta:  "Pendência reaberta",
  pendencia_excluida:  "Pendência removida",
};

const EVENTOS_SIMPLES = new Set([
  "acao_criada","acao_concluida","acao_reaberta","acao_editada","acao_excluida",
  "pendencia_criada","pendencia_resolvida","pendencia_reaberta","pendencia_excluida",
]);

export function formatarEventoObra(log: ObraLog): EventoObra {
  const icone = EVENTO_ICONE[log.campo] ?? "📌";
  const titulo = EVENTO_TITULO[log.campo] ?? log.campo;
  const descricao = EVENTOS_SIMPLES.has(log.campo)
    ? (log.valor_novo || log.valor_anterior)
    : [log.valor_anterior, log.valor_novo].filter(Boolean).join(" → ");
  return { id: log.id, icone, titulo, descricao, autor_nome: log.autor_nome ?? null, created_at: log.created_at };
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

  if ((antigo.observacoes ?? "") !== (novo.observacoes ?? ""))
    logs.push({ projeto_id: projetoId, campo: "observacoes", valor_anterior: antigo.observacoes || "—", valor_novo: novo.observacoes || "—" });

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
  let q = supabase.from("obras").select("*, tecnicos(nome), terceirizados(nome_empresa)").order("created_at", { ascending: true });
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

  if ((antigo.observacoes ?? "") !== (novo.observacoes ?? ""))
    logs.push({ obra_id: obraId, campo: "observacoes", valor_anterior: antigo.observacoes || "—", valor_novo: novo.observacoes || "—" });

  if (logs.length === 0) return;
  await supabase.from("obra_logs").insert(logs);
}

// ── Helper interno ────────────────────────────────────────────

async function registrarEventoObra(obraId: string, campo: string, valorAnterior: string, valorNovo: string): Promise<void> {
  await supabase.from("obra_logs").insert({ obra_id: obraId, campo, valor_anterior: valorAnterior, valor_novo: valorNovo });
}

// ── CRUD Obra Ações ───────────────────────────────────────────

export async function listarObraAcoes(obraId: string): Promise<ObraAcao[]> {
  const { data, error } = await supabase
    .from("obra_acoes").select("*").eq("obra_id", obraId).order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as ObraAcao[];
}

export async function criarObraAcao(obraId: string, payload: Omit<ObraAcaoPayload, "obra_id">): Promise<void> {
  const { error } = await supabase.from("obra_acoes").insert({ ...payload, obra_id: obraId });
  if (error) throw new Error(error.message);
  registrarEventoObra(obraId, "acao_criada", "", payload.titulo).catch(() => {});
}

export async function editarObraAcao(id: string, obraId: string, payload: Omit<ObraAcaoPayload, "obra_id">): Promise<void> {
  const { error } = await supabase.from("obra_acoes")
    .update({ ...payload, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
  registrarEventoObra(obraId, "acao_editada", payload.titulo, payload.titulo).catch(() => {});
}

export async function excluirObraAcao(id: string, obraId: string, titulo: string): Promise<void> {
  const { error } = await supabase.from("obra_acoes").delete().eq("id", id);
  if (error) throw new Error(error.message);
  registrarEventoObra(obraId, "acao_excluida", titulo, "").catch(() => {});
}

export async function concluirObraAcao(id: string, obraId: string, titulo: string): Promise<void> {
  const { error } = await supabase.from("obra_acoes")
    .update({ status: "concluido", data_conclusao: new Date().toISOString().slice(0, 10), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  registrarEventoObra(obraId, "acao_concluida", titulo, "").catch(() => {});
}

export async function reabrirObraAcao(id: string, obraId: string, titulo: string): Promise<void> {
  const { error } = await supabase.from("obra_acoes")
    .update({ status: "pendente", data_conclusao: null, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  registrarEventoObra(obraId, "acao_reaberta", titulo, "").catch(() => {});
}

// ── CRUD Obra Pendências ──────────────────────────────────────

export async function listarObraPendencias(obraId: string): Promise<ObraPendencia[]> {
  const { data, error } = await supabase
    .from("obra_pendencias").select("*").eq("obra_id", obraId).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ObraPendencia[];
}

export async function criarObraPendencia(obraId: string, payload: Omit<ObraPendenciaPayload, "obra_id" | "resolved_at">): Promise<void> {
  const { error } = await supabase.from("obra_pendencias").insert({ ...payload, obra_id: obraId, resolved_at: null });
  if (error) throw new Error(error.message);
  registrarEventoObra(obraId, "pendencia_criada", "", payload.titulo).catch(() => {});
}

export async function editarObraPendencia(
  id: string,
  payload: Partial<Omit<ObraPendenciaPayload, "obra_id" | "resolved_at">>,
): Promise<void> {
  const { error } = await supabase.from("obra_pendencias").update(payload).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function excluirObraPendencia(id: string, obraId: string, titulo: string): Promise<void> {
  const { error } = await supabase.from("obra_pendencias").delete().eq("id", id);
  if (error) throw new Error(error.message);
  registrarEventoObra(obraId, "pendencia_excluida", titulo, "").catch(() => {});
}

export async function resolverObraPendencia(id: string, obraId: string, titulo: string): Promise<void> {
  const { error } = await supabase.from("obra_pendencias")
    .update({ status: "resolvida", resolved_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
  registrarEventoObra(obraId, "pendencia_resolvida", titulo, "").catch(() => {});
}

export async function reabrirObraPendencia(id: string, obraId: string, titulo: string): Promise<void> {
  const { error } = await supabase.from("obra_pendencias")
    .update({ status: "aberta", resolved_at: null }).eq("id", id);
  if (error) throw new Error(error.message);
  registrarEventoObra(obraId, "pendencia_reaberta", titulo, "").catch(() => {});
}
