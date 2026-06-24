import { supabase } from "./supabase";

// ── Tipos ─────────────────────────────────────────────────────

export type ReuniaoStatus  = "ativa" | "finalizada";
export type AcaoStatus     = "NAO_INICIADO" | "EM_ANDAMENTO" | "CONCLUIDO" | "CANCELADO";
export type AcaoPrioridade = "BAIXA" | "NORMAL" | "ALTA" | "CRITICA";

export interface ReuniaoV2 {
  id: string;
  user_id: string;
  data: string;
  titulo: string;
  horario_inicio: string | null;
  horario_fim: string | null;
  responsavel: string;
  participantes: string;
  status: ReuniaoStatus;
  observacoes_gerais: string;
  finalizada_at: string | null;
  finalizada_por: string | null;
  reaberta_em: string | null;
  motivo_reabertura: string;
  created_at?: string;
}

export interface ReuniaoParticipante {
  id: string;
  reuniao_id: string;
  nome: string;
  presente: boolean;
  created_at: string;
}

export interface ReuniaoAcao {
  id: string;
  reuniao_id: string;
  numero_seq: number;
  what: string;
  how: string;
  who: string;
  when_date: string;
  status: AcaoStatus;
  prioridade: AcaoPrioridade;
  observacoes: string;
  origem_acao_id: string | null;
  created_by: string | null;
  data_conclusao: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReuniaoLog {
  id: string;
  reuniao_id: string;
  user_id: string | null;
  campo: string;
  valor_anterior: string;
  valor_novo: string;
  autor_nome: string | null;
  created_at: string;
}

export interface CriarReuniaoPayload {
  titulo: string;
  data: string;
  horario_inicio?: string;
  responsavel: string;
}

export interface AtualizarReuniaoPayload {
  titulo?: string;
  horario_inicio?: string | null;
  horario_fim?: string | null;
  responsavel?: string;
  observacoes_gerais?: string;
}

export interface AcaoPayload {
  what: string;
  how: string;
  who: string;
  when_date: string;
  status: AcaoStatus;
  prioridade: AcaoPrioridade;
  observacoes?: string;
  origem_acao_id?: string | null;
}

// ── Formatters ────────────────────────────────────────────────

export function formatData(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function formatNumeroAcao(n: number): string {
  return `AC-${String(n).padStart(3, "0")}`;
}

// ── Reunião CRUD ──────────────────────────────────────────────

export async function listarReunioes(): Promise<ReuniaoV2[]> {
  const { data, error } = await supabase
    .from("reunioes")
    .select(
      "id, user_id, data, titulo, horario_inicio, horario_fim, responsavel, status, observacoes_gerais, finalizada_at, finalizada_por, reaberta_em, motivo_reabertura"
    )
    .order("data", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(normalizeReuniao);
}

export async function buscarReuniao(id: string): Promise<ReuniaoV2> {
  const { data, error } = await supabase
    .from("reunioes")
    .select(
      "id, user_id, data, titulo, horario_inicio, horario_fim, responsavel, participantes, status, observacoes_gerais, finalizada_at, finalizada_por, reaberta_em, motivo_reabertura"
    )
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);
  return normalizeReuniao(data);
}

function normalizeReuniao(row: Record<string, unknown>): ReuniaoV2 {
  return {
    id:                row.id as string,
    user_id:           row.user_id as string,
    data:              row.data as string,
    titulo:            (row.titulo as string | null) ?? "Reunião",
    horario_inicio:    (row.horario_inicio as string | null) ?? null,
    horario_fim:       (row.horario_fim as string | null) ?? null,
    responsavel:       (row.responsavel as string | null) ?? "",
    participantes:     (row.participantes as string | null) ?? "",
    status:            ((row.status as string | null) ?? "ativa") as ReuniaoStatus,
    observacoes_gerais:(row.observacoes_gerais as string | null) ?? "",
    finalizada_at:     (row.finalizada_at as string | null) ?? null,
    finalizada_por:    (row.finalizada_por as string | null) ?? null,
    reaberta_em:       (row.reaberta_em as string | null) ?? null,
    motivo_reabertura: (row.motivo_reabertura as string | null) ?? "",
    created_at:        (row.created_at as string | undefined) ?? undefined,
  };
}

export async function criarReuniao(payload: CriarReuniaoPayload): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado.");

  const { data, error } = await supabase
    .from("reunioes")
    .insert({
      user_id:           user.id,
      titulo:            payload.titulo,
      data:              payload.data,
      horario_inicio:    payload.horario_inicio ?? null,
      responsavel:       payload.responsavel,
      participantes:     "",
      blocos:            [],
      progresso:         0,
      resumo:            "",
      status:            "ativa",
      observacoes_gerais:"",
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

export async function atualizarReuniao(
  id: string,
  payload: AtualizarReuniaoPayload
): Promise<void> {
  const { error } = await supabase.from("reunioes").update(payload).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function finalizarReuniao(id: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("reunioes")
    .update({
      status:         "finalizada",
      finalizada_at:  new Date().toISOString(),
      finalizada_por: user?.id ?? null,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  await registrarLog(id, "finalização", "ativa", "finalizada");
}

export async function reabrirReuniao(
  id: string,
  motivo: string,
  autorNome: string
): Promise<void> {
  const { error } = await supabase
    .from("reunioes")
    .update({
      status:            "ativa",
      reaberta_em:       new Date().toISOString(),
      motivo_reabertura: motivo,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  await registrarLog(id, "reabertura", "finalizada", "ativa", autorNome);
}

export async function excluirReuniao(id: string): Promise<void> {
  const { error } = await supabase.from("reunioes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Participantes ─────────────────────────────────────────────

export async function listarParticipantes(
  reuniaoId: string
): Promise<ReuniaoParticipante[]> {
  const { data, error } = await supabase
    .from("reuniao_participantes")
    .select("*")
    .eq("reuniao_id", reuniaoId)
    .order("created_at");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function adicionarParticipante(
  reuniaoId: string,
  nome: string
): Promise<ReuniaoParticipante> {
  const { data, error } = await supabase
    .from("reuniao_participantes")
    .insert({ reuniao_id: reuniaoId, nome, presente: true })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function atualizarPresenca(
  participanteId: string,
  presente: boolean
): Promise<void> {
  const { error } = await supabase
    .from("reuniao_participantes")
    .update({ presente })
    .eq("id", participanteId);

  if (error) throw new Error(error.message);
}

export async function removerParticipante(participanteId: string): Promise<void> {
  const { error } = await supabase
    .from("reuniao_participantes")
    .delete()
    .eq("id", participanteId);

  if (error) throw new Error(error.message);
}

// ── Ações da Reunião ──────────────────────────────────────────

export async function listarAcoes(reuniaoId: string): Promise<ReuniaoAcao[]> {
  const { data, error } = await supabase
    .from("reuniao_acoes")
    .select("*")
    .eq("reuniao_id", reuniaoId)
    .order("numero_seq");

  if (error) throw new Error(error.message);
  return (data ?? []).map(normalizeAcao);
}

function normalizeAcao(row: Record<string, unknown>): ReuniaoAcao {
  return {
    id:             row.id as string,
    reuniao_id:     row.reuniao_id as string,
    numero_seq:     row.numero_seq as number,
    what:           row.what as string,
    how:            (row.how as string | null) ?? "",
    who:            row.who as string,
    when_date:      row.when_date as string,
    status:         (row.status as AcaoStatus) ?? "NAO_INICIADO",
    prioridade:     (row.prioridade as AcaoPrioridade) ?? "NORMAL",
    observacoes:    (row.observacoes as string | null) ?? "",
    origem_acao_id: (row.origem_acao_id as string | null) ?? null,
    created_by:     (row.created_by as string | null) ?? null,
    data_conclusao: (row.data_conclusao as string | null) ?? null,
    created_at:     row.created_at as string,
    updated_at:     row.updated_at as string,
  };
}

export async function criarAcao(
  reuniaoId: string,
  payload: AcaoPayload
): Promise<ReuniaoAcao> {
  const { data, error } = await supabase
    .from("reuniao_acoes")
    .insert({
      reuniao_id:     reuniaoId,
      what:           payload.what,
      how:            payload.how,
      who:            payload.who,
      when_date:      payload.when_date,
      status:         payload.status,
      prioridade:     payload.prioridade,
      observacoes:    payload.observacoes ?? "",
      origem_acao_id: payload.origem_acao_id ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  const acao = normalizeAcao(data);
  await registrarLog(
    reuniaoId,
    "criação de ação",
    "",
    `${formatNumeroAcao(acao.numero_seq)} — ${acao.what}`
  );
  return acao;
}

export async function editarAcao(
  acaoId: string,
  payload: AcaoPayload,
  oldAcao?: ReuniaoAcao
): Promise<void> {
  const { error } = await supabase
    .from("reuniao_acoes")
    .update({
      what:           payload.what,
      how:            payload.how,
      who:            payload.who,
      when_date:      payload.when_date,
      status:         payload.status,
      prioridade:     payload.prioridade,
      observacoes:    payload.observacoes ?? "",
      origem_acao_id: payload.origem_acao_id ?? null,
    })
    .eq("id", acaoId);

  if (error) throw new Error(error.message);

  if (oldAcao) {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from("profiles")
      .select("nome")
      .eq("id", user?.id ?? "")
      .single();
    const autor = (profile as { nome?: string } | null)?.nome ?? undefined;

    if (payload.status !== oldAcao.status) {
      await registrarLog(
        oldAcao.reuniao_id,
        "status da ação",
        STATUS_LABEL_LOG[oldAcao.status],
        STATUS_LABEL_LOG[payload.status],
        autor
      );
    }
    if (payload.prioridade !== oldAcao.prioridade) {
      await registrarLog(
        oldAcao.reuniao_id,
        "prioridade da ação",
        oldAcao.prioridade,
        payload.prioridade,
        autor
      );
    }
    if (payload.who !== oldAcao.who) {
      await registrarLog(
        oldAcao.reuniao_id,
        "responsável da ação",
        oldAcao.who,
        payload.who,
        autor
      );
    }
    if ((payload.origem_acao_id ?? null) !== oldAcao.origem_acao_id) {
      await registrarLog(
        oldAcao.reuniao_id,
        "origem da ação",
        oldAcao.origem_acao_id ?? "—",
        payload.origem_acao_id ?? "—",
        autor
      );
    }
  }
}

const STATUS_LABEL_LOG: Record<AcaoStatus, string> = {
  NAO_INICIADO: "Não iniciado",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDO:    "Concluído",
  CANCELADO:    "Cancelado",
};

export async function excluirAcao(acaoId: string): Promise<void> {
  const { error } = await supabase.from("reuniao_acoes").delete().eq("id", acaoId);
  if (error) throw new Error(error.message);
}

// ── Pendências herdadas ───────────────────────────────────────

export async function listarPendencias(
  currentReuniaoId: string
): Promise<(ReuniaoAcao & { reuniao_titulo: string; reuniao_data: string })[]> {
  const { data: currentMeeting, error: errMeeting } = await supabase
    .from("reunioes")
    .select("data")
    .eq("id", currentReuniaoId)
    .single();

  if (errMeeting) return [];

  const { data: meetings } = await supabase
    .from("reunioes")
    .select("id, titulo, data")
    .neq("id", currentReuniaoId)
    .lte("data", currentMeeting.data);

  const meetingIds = meetings?.map((m) => m.id) ?? [];
  if (meetingIds.length === 0) return [];

  const { data: actions } = await supabase
    .from("reuniao_acoes")
    .select("*")
    .in("reuniao_id", meetingIds)
    .in("status", ["NAO_INICIADO", "EM_ANDAMENTO"])
    .order("when_date");

  return (actions ?? []).map((a) => ({
    ...normalizeAcao(a),
    reuniao_titulo: meetings?.find((m) => m.id === a.reuniao_id)?.titulo ?? "Reunião",
    reuniao_data:   meetings?.find((m) => m.id === a.reuniao_id)?.data ?? "",
  }));
}

// ── Lookup de nome de usuário ─────────────────────────────────

export async function buscarNomePerfil(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("nome")
    .eq("id", userId)
    .single();
  return (data as { nome?: string } | null)?.nome ?? null;
}

// ── Logs / Auditoria ──────────────────────────────────────────

export async function registrarLog(
  reuniaoId: string,
  campo: string,
  valorAnterior: string,
  valorNovo: string,
  autorNome?: string
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  let nome = autorNome;
  if (!nome && user?.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("nome")
      .eq("id", user.id)
      .single();
    nome = (profile as { nome?: string } | null)?.nome ?? undefined;
  }

  await supabase.from("reuniao_logs").insert({
    reuniao_id:     reuniaoId,
    user_id:        user?.id ?? null,
    campo,
    valor_anterior: valorAnterior,
    valor_novo:     valorNovo,
    autor_nome:     nome ?? null,
  });
}

export async function listarLogs(reuniaoId: string): Promise<ReuniaoLog[]> {
  const { data, error } = await supabase
    .from("reuniao_logs")
    .select("*")
    .eq("reuniao_id", reuniaoId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return data ?? [];
}
