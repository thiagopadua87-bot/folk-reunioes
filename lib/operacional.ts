import { supabase } from "./supabase";

// ── Constantes e tipos ──────────────────────────────────────

export const TIPOS_SERVICO = [
  { value: "portaria_remota",          label: "Portaria Remota" },
  { value: "monitoramento",            label: "Monitoramento" },
  { value: "monitoramento_manutencao", label: "Monitoramento + Manutenção" },
  { value: "monitoramento_locacao",    label: "Monitoramento + Locação" },
  { value: "locacao_equipamentos",     label: "Locação de Equipamentos" },
] as const;

export const MOTIVOS_PERDA = [
  { value: "qualidade_servico", label: "Qualidade do serviço" },
  { value: "preco",             label: "Preço" },
  { value: "relacionamento",    label: "Relacionamento" },
  { value: "faturamento",       label: "Faturamento" },
  { value: "outros",            label: "Outros" },
] as const;

export const NIVEIS_RISCO = [
  { value: "baixo",     label: "Baixo" },
  { value: "medio",     label: "Médio" },
  { value: "alto",      label: "Alto" },
  { value: "revertido", label: "Revertido" },
] as const;

export type TipoServico = (typeof TIPOS_SERVICO)[number]["value"];
export type MotivoPerda = (typeof MOTIVOS_PERDA)[number]["value"];
export type NivelRisco  = (typeof NIVEIS_RISCO)[number]["value"];

export interface ClientePerdido {
  id: string;
  user_id: string;
  crise_id: string | null;
  data_aviso: string;
  data_encerramento: string;
  cliente: string;
  tipo_servico: TipoServico;
  valor_contrato: number;
  motivo_perda: MotivoPerda;
  observacoes: string;
  created_at: string;
}

export interface CriseItem {
  id: string;
  user_id: string;
  cliente: string;
  tipo_servico: TipoServico;
  risco: NivelRisco;
  acoes: string;
  apresentou_carta_cancelamento: boolean;
  data_aviso: string | null;
  prazo_aviso_dias: number | null;
  carta_url: string | null;
  carta_nome: string | null;
  promovido_para_perdido: boolean;
  cliente_perdido_id: string | null;
  created_at: string;
}

export interface ClientePerdidoLog {
  id: string;
  user_id: string;
  registro_id: string;
  campo: string;
  valor_anterior: string;
  valor_novo: string;
  autor_nome: string | null;
  created_at: string;
}

export interface CriseLog {
  id: string;
  user_id: string;
  crise_id: string;
  campo: string;
  valor_anterior: string;
  valor_novo: string;
  autor_nome: string | null;
  created_at: string;
}

// ── Histórico de eventos ─────────────────────────────────────

export interface EventoHistorico {
  id: string;
  icone: string;
  titulo: string;
  descricao: string;
  autor_nome: string | null;
  created_at: string;
  fonte: "crise" | "cliente_perdido";
}

export function formatarEventoCrise(log: CriseLog): EventoHistorico {
  let icone: string;
  let titulo: string;
  let descricao: string;

  switch (log.campo) {
    case "crise_criada":
      icone = "🔔"; titulo = "Crise registrada"; descricao = log.valor_novo || "";
      break;
    case "risco":
      if (log.valor_novo === "Revertido") {
        icone = "✅"; titulo = "Crise revertida"; descricao = `Risco anterior: ${log.valor_anterior}`;
      } else {
        icone = "⚠️"; titulo = "Risco alterado"; descricao = `${log.valor_anterior} → ${log.valor_novo}`;
      }
      break;
    case "apresentou_carta_cancelamento":
      if (log.valor_novo === "sim") {
        icone = "📄"; titulo = "Carta de cancelamento registrada"; descricao = "";
      } else {
        icone = "🗑️"; titulo = "Carta de cancelamento removida"; descricao = "";
      }
      break;
    case "data_aviso":
      icone = "📅"; titulo = "Data de aviso atualizada";
      descricao = log.valor_anterior ? `${log.valor_anterior} → ${log.valor_novo}` : log.valor_novo;
      break;
    case "prazo_aviso_dias":
      icone = "⏱️"; titulo = "Prazo de aviso atualizado";
      descricao = log.valor_anterior ? `${log.valor_anterior} → ${log.valor_novo} dias` : `${log.valor_novo} dias`;
      break;
    case "carta_arquivo":
      icone = "📎"; titulo = "Arquivo da carta anexado"; descricao = log.valor_novo;
      break;
    case "promovido_para_perdido":
      icone = "➡️"; titulo = "Promovido a Cliente Perdido"; descricao = "";
      break;
    case "acoes":
      icone = "📝"; titulo = "Ações atualizadas"; descricao = "";
      break;
    case "cliente":
      icone = "👤"; titulo = "Cliente atualizado"; descricao = `${log.valor_anterior} → ${log.valor_novo}`;
      break;
    case "tipo_servico":
      icone = "🔧"; titulo = "Tipo de serviço atualizado"; descricao = `${log.valor_anterior} → ${log.valor_novo}`;
      break;
    default:
      icone = "📋"; titulo = log.campo;
      descricao = log.valor_anterior ? `${log.valor_anterior} → ${log.valor_novo}` : log.valor_novo;
  }

  return { id: log.id, icone, titulo, descricao, autor_nome: log.autor_nome, created_at: log.created_at, fonte: "crise" };
}

export function formatarEventoClientePerdido(log: ClientePerdidoLog): EventoHistorico {
  let icone: string;
  let titulo: string;
  let descricao: string;

  switch (log.campo) {
    case "cliente_perdido_criado":
      icone = "📌"; titulo = "Registrado como cliente perdido"; descricao = log.valor_novo || "";
      break;
    case "data_aviso":
      icone = "📅"; titulo = "Data de aviso atualizada"; descricao = `${log.valor_anterior} → ${log.valor_novo}`;
      break;
    case "data_encerramento":
      icone = "🗓️"; titulo = "Data de encerramento atualizada"; descricao = `${log.valor_anterior} → ${log.valor_novo}`;
      break;
    case "valor_contrato":
      icone = "💰"; titulo = "Valor do contrato atualizado"; descricao = `${log.valor_anterior} → ${log.valor_novo}`;
      break;
    case "motivo_perda":
      icone = "❓"; titulo = "Motivo da perda atualizado"; descricao = `${log.valor_anterior} → ${log.valor_novo}`;
      break;
    case "observacoes":
      icone = "📝"; titulo = "Observações atualizadas"; descricao = "";
      break;
    case "cliente":
      icone = "👤"; titulo = "Cliente atualizado"; descricao = `${log.valor_anterior} → ${log.valor_novo}`;
      break;
    case "tipo_servico":
      icone = "🔧"; titulo = "Tipo de serviço atualizado"; descricao = `${log.valor_anterior} → ${log.valor_novo}`;
      break;
    default:
      icone = "📋"; titulo = log.campo;
      descricao = log.valor_anterior ? `${log.valor_anterior} → ${log.valor_novo}` : log.valor_novo;
  }

  return { id: log.id, icone, titulo, descricao, autor_nome: log.autor_nome, created_at: log.created_at, fonte: "cliente_perdido" };
}

// ── Helpers de data ──────────────────────────────────────────

export function calcularEncerramentoBR(dataAviso: string, prazoDias: number): string {
  const d = new Date(dataAviso + "T00:00:00");
  d.setDate(d.getDate() + prazoDias);
  return d.toLocaleDateString("pt-BR");
}

export function calcularEncerramentoISO(dataAviso: string, prazoDias: number): string {
  const d = new Date(dataAviso + "T00:00:00");
  d.setDate(d.getDate() + prazoDias);
  return d.toISOString().split("T")[0];
}

export function diasParaEncerramento(dataAviso: string, prazoDias: number): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const enc = new Date(dataAviso + "T00:00:00");
  enc.setDate(enc.getDate() + prazoDias);
  return Math.round((enc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

// ── Auth helper ──────────────────────────────────────────────

async function getAutorNome(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("nome").eq("id", user.id).single();
  return (data as { nome: string } | null)?.nome ?? null;
}

// ── Helpers de exibição ──────────────────────────────────────

export function labelTipoServico(v: TipoServico) {
  return TIPOS_SERVICO.find((t) => t.value === v)?.label ?? v;
}
export function labelMotivoPerda(v: MotivoPerda) {
  return MOTIVOS_PERDA.find((m) => m.value === v)?.label ?? v;
}
export function labelNivelRisco(v: NivelRisco) {
  return NIVEIS_RISCO.find((r) => r.value === v)?.label ?? v;
}
export function formatMoeda(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}
export function formatData(s: string) {
  if (!s) return "—";
  return new Date(s + "T00:00:00").toLocaleDateString("pt-BR");
}

// ── Clientes Perdidos ────────────────────────────────────────

export interface FiltrosClientesPerdidos {
  dataInicio?: string;
  dataFim?: string;
  motivo?: MotivoPerda | "";
}

export async function listarClientesPerdidos(
  filtros?: FiltrosClientesPerdidos
): Promise<ClientePerdido[]> {
  let q = supabase
    .from("clientes_perdidos")
    .select("*")
    .order("data_encerramento", { ascending: false });

  if (filtros?.dataInicio) q = q.gte("data_encerramento", filtros.dataInicio);
  if (filtros?.dataFim)    q = q.lte("data_encerramento", filtros.dataFim);
  if (filtros?.motivo)     q = q.eq("motivo_perda", filtros.motivo);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function criarClientePerdido(
  payload: Omit<ClientePerdido, "id" | "user_id" | "created_at">
): Promise<void> {
  const { error } = await supabase.from("clientes_perdidos").insert(payload);
  if (error) throw new Error(error.message);
}

export async function listarLogsClientePerdido(registroId: string): Promise<ClientePerdidoLog[]> {
  const { data, error } = await supabase
    .from("clientes_perdidos_logs")
    .select("*")
    .eq("registro_id", registroId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ClientePerdidoLog[];
}

async function registrarAlteracoesClientePerdido(
  id: string,
  antigo: ClientePerdido,
  novo: Omit<ClientePerdido, "id" | "user_id" | "created_at">,
): Promise<void> {
  type LogInput = { registro_id: string; campo: string; valor_anterior: string; valor_novo: string; autor_nome: string | null };
  const autorNome = await getAutorNome();
  const logs: LogInput[] = [];

  if (antigo.data_aviso !== novo.data_aviso)
    logs.push({ registro_id: id, campo: "data_aviso", valor_anterior: formatData(antigo.data_aviso), valor_novo: formatData(novo.data_aviso), autor_nome: autorNome });

  if (antigo.data_encerramento !== novo.data_encerramento)
    logs.push({ registro_id: id, campo: "data_encerramento", valor_anterior: formatData(antigo.data_encerramento), valor_novo: formatData(novo.data_encerramento), autor_nome: autorNome });

  if (antigo.cliente !== novo.cliente)
    logs.push({ registro_id: id, campo: "cliente", valor_anterior: antigo.cliente, valor_novo: novo.cliente, autor_nome: autorNome });

  if (antigo.tipo_servico !== novo.tipo_servico)
    logs.push({ registro_id: id, campo: "tipo_servico", valor_anterior: labelTipoServico(antigo.tipo_servico), valor_novo: labelTipoServico(novo.tipo_servico), autor_nome: autorNome });

  if (antigo.valor_contrato !== novo.valor_contrato)
    logs.push({ registro_id: id, campo: "valor_contrato", valor_anterior: formatMoeda(antigo.valor_contrato), valor_novo: formatMoeda(novo.valor_contrato), autor_nome: autorNome });

  if (antigo.motivo_perda !== novo.motivo_perda)
    logs.push({ registro_id: id, campo: "motivo_perda", valor_anterior: labelMotivoPerda(antigo.motivo_perda), valor_novo: labelMotivoPerda(novo.motivo_perda), autor_nome: autorNome });

  if ((antigo.observacoes ?? "") !== (novo.observacoes ?? ""))
    logs.push({ registro_id: id, campo: "observacoes", valor_anterior: antigo.observacoes || "—", valor_novo: novo.observacoes || "—", autor_nome: autorNome });

  if (logs.length === 0) return;
  await supabase.from("clientes_perdidos_logs").insert(logs);
}

export async function editarClientePerdido(
  id: string,
  payload: Omit<ClientePerdido, "id" | "user_id" | "created_at">,
  dadosAntigos?: ClientePerdido,
): Promise<void> {
  const { error } = await supabase.from("clientes_perdidos").update(payload).eq("id", id);
  if (error) throw new Error(error.message);
  if (dadosAntigos) registrarAlteracoesClientePerdido(id, dadosAntigos, payload).catch(() => {});
}

export async function excluirClientePerdido(id: string): Promise<void> {
  const { error } = await supabase.from("clientes_perdidos").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Gestão de Crise ──────────────────────────────────────────

// Menor número = aparece primeiro (sort ascendente); revertido fica por último
const PESO_RISCO: Record<NivelRisco, number> = { alto: 0, medio: 1, baixo: 2, revertido: 3 };

export type CriseEditPayload = {
  cliente: string;
  tipo_servico: TipoServico;
  risco: NivelRisco;
  acoes: string;
  apresentou_carta_cancelamento: boolean;
  data_aviso: string | null;
  prazo_aviso_dias: number | null;
};

export async function listarCrises(filtros?: { risco?: NivelRisco | "" }): Promise<CriseItem[]> {
  let q = supabase.from("gestao_crise").select("*");

  if (filtros?.risco) q = q.eq("risco", filtros.risco);

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  return (data ?? []).sort((a, b) => PESO_RISCO[a.risco as NivelRisco] - PESO_RISCO[b.risco as NivelRisco]);
}

export async function criarCrise(
  payload: CriseEditPayload
): Promise<string> {
  const { data, error } = await supabase
    .from("gestao_crise")
    .insert({ ...payload, promovido_para_perdido: false, cliente_perdido_id: null, carta_url: null, carta_nome: null })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Erro ao criar crise.");

  const autorNome = await getAutorNome();
  await supabase.from("crise_logs").insert({
    crise_id: data.id,
    campo: "crise_criada",
    valor_anterior: "",
    valor_novo: payload.cliente,
    autor_nome: autorNome,
  });

  return data.id;
}

export async function listarLogsCrise(criseId: string): Promise<CriseLog[]> {
  const { data, error } = await supabase
    .from("crise_logs")
    .select("*")
    .eq("crise_id", criseId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as CriseLog[];
}

export async function listarHistoricoUnificado(
  criseId: string,
  clientePerdidoId: string,
): Promise<EventoHistorico[]> {
  const [criseLogs, clienteLogs] = await Promise.all([
    listarLogsCrise(criseId),
    listarLogsClientePerdido(clientePerdidoId),
  ]);
  return [
    ...criseLogs.map(formatarEventoCrise),
    ...clienteLogs.map(formatarEventoClientePerdido),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

async function registrarAlteracoesCrise(
  id: string,
  antigo: CriseItem,
  novo: CriseEditPayload,
): Promise<void> {
  type LogInput = { crise_id: string; campo: string; valor_anterior: string; valor_novo: string; autor_nome: string | null };
  const autorNome = await getAutorNome();
  const logs: LogInput[] = [];

  if (antigo.cliente !== novo.cliente)
    logs.push({ crise_id: id, campo: "cliente", valor_anterior: antigo.cliente, valor_novo: novo.cliente, autor_nome: autorNome });

  if (antigo.tipo_servico !== novo.tipo_servico)
    logs.push({ crise_id: id, campo: "tipo_servico", valor_anterior: labelTipoServico(antigo.tipo_servico), valor_novo: labelTipoServico(novo.tipo_servico), autor_nome: autorNome });

  if (antigo.risco !== novo.risco)
    logs.push({ crise_id: id, campo: "risco", valor_anterior: labelNivelRisco(antigo.risco), valor_novo: labelNivelRisco(novo.risco), autor_nome: autorNome });

  if ((antigo.acoes ?? "") !== (novo.acoes ?? ""))
    logs.push({ crise_id: id, campo: "acoes", valor_anterior: antigo.acoes || "—", valor_novo: novo.acoes || "—", autor_nome: autorNome });

  const carteiraAntiga = antigo.apresentou_carta_cancelamento;
  const carteiraNova   = novo.apresentou_carta_cancelamento;
  if (carteiraAntiga !== carteiraNova)
    logs.push({ crise_id: id, campo: "apresentou_carta_cancelamento", valor_anterior: carteiraAntiga ? "sim" : "não", valor_novo: carteiraNova ? "sim" : "não", autor_nome: autorNome });

  if (carteiraNova) {
    if ((antigo.data_aviso ?? "") !== (novo.data_aviso ?? "") && novo.data_aviso)
      logs.push({ crise_id: id, campo: "data_aviso", valor_anterior: antigo.data_aviso ? formatData(antigo.data_aviso) : "—", valor_novo: formatData(novo.data_aviso), autor_nome: autorNome });

    if (antigo.prazo_aviso_dias !== novo.prazo_aviso_dias && novo.prazo_aviso_dias != null)
      logs.push({ crise_id: id, campo: "prazo_aviso_dias", valor_anterior: antigo.prazo_aviso_dias != null ? String(antigo.prazo_aviso_dias) : "—", valor_novo: String(novo.prazo_aviso_dias), autor_nome: autorNome });
  }

  if (logs.length === 0) return;
  await supabase.from("crise_logs").insert(logs);
}

export async function editarCrise(
  id: string,
  payload: CriseEditPayload,
  dadosAntigos?: CriseItem,
): Promise<void> {
  const { error } = await supabase.from("gestao_crise").update(payload).eq("id", id);
  if (error) throw new Error(error.message);
  if (dadosAntigos) registrarAlteracoesCrise(id, dadosAntigos, payload).catch(() => {});
}

export async function uploadCartaArquivo(criseId: string, file: File): Promise<void> {
  const ext = file.name.split(".").pop() ?? "pdf";
  const path = `${criseId}/${Date.now()}.${ext}`;
  const { error: errUp } = await supabase.storage.from("cartas-cancelamento").upload(path, file, { upsert: true });
  if (errUp) throw new Error(`Erro ao enviar arquivo: ${errUp.message}`);

  const { data: urlData } = supabase.storage.from("cartas-cancelamento").getPublicUrl(path);
  const { error: errUpdate } = await supabase
    .from("gestao_crise")
    .update({ carta_url: urlData.publicUrl, carta_nome: file.name })
    .eq("id", criseId);
  if (errUpdate) throw new Error(errUpdate.message);

  const autorNome = await getAutorNome();
  await supabase.from("crise_logs").insert({
    crise_id: criseId,
    campo: "carta_arquivo",
    valor_anterior: "",
    valor_novo: file.name,
    autor_nome: autorNome,
  });
}

export async function removerCartaArquivo(criseId: string, cartaNome: string): Promise<void> {
  const { error } = await supabase
    .from("gestao_crise")
    .update({ carta_url: null, carta_nome: null })
    .eq("id", criseId);
  if (error) throw new Error(error.message);

  const autorNome = await getAutorNome();
  await supabase.from("crise_logs").insert({
    crise_id: criseId,
    campo: "carta_arquivo",
    valor_anterior: cartaNome,
    valor_novo: "",
    autor_nome: autorNome,
  });
}

export async function promoverCriseParaPerdido(
  crise: CriseItem,
  payload: {
    data_aviso: string;
    data_encerramento: string;
    valor_contrato: number;
    motivo_perda: MotivoPerda;
    observacoes: string;
  },
): Promise<string> {
  const autorNome = await getAutorNome();

  const { data: perdido, error: errPerdido } = await supabase
    .from("clientes_perdidos")
    .insert({
      crise_id: crise.id,
      cliente: crise.cliente,
      tipo_servico: crise.tipo_servico,
      ...payload,
    })
    .select("id")
    .single();

  if (errPerdido || !perdido) throw new Error(errPerdido?.message ?? "Erro ao criar cliente perdido.");

  await supabase.from("clientes_perdidos_logs").insert({
    registro_id: perdido.id,
    campo: "cliente_perdido_criado",
    valor_anterior: "",
    valor_novo: `Promovido da crise de ${crise.cliente}`,
    autor_nome: autorNome,
  });

  const { error: errCrise } = await supabase
    .from("gestao_crise")
    .update({ promovido_para_perdido: true, cliente_perdido_id: perdido.id })
    .eq("id", crise.id);
  if (errCrise) throw new Error(errCrise.message);

  await supabase.from("crise_logs").insert({
    crise_id: crise.id,
    campo: "promovido_para_perdido",
    valor_anterior: "não",
    valor_novo: "sim",
    autor_nome: autorNome,
  });

  return perdido.id;
}

export async function excluirCrise(id: string): Promise<void> {
  const { error } = await supabase.from("gestao_crise").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
