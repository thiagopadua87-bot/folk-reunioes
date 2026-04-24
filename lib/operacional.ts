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
  { value: "baixo", label: "Baixo" },
  { value: "medio", label: "Médio" },
  { value: "alto",  label: "Alto" },
] as const;

export type TipoServico = (typeof TIPOS_SERVICO)[number]["value"];
export type MotivoPerda = (typeof MOTIVOS_PERDA)[number]["value"];
export type NivelRisco  = (typeof NIVEIS_RISCO)[number]["value"];

export interface ClientePerdido {
  id: string;
  user_id: string;
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
    .order("data_aviso", { ascending: false });

  if (filtros?.dataInicio) q = q.gte("data_aviso", filtros.dataInicio);
  if (filtros?.dataFim)    q = q.lte("data_aviso", filtros.dataFim);
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

const PESO_RISCO: Record<NivelRisco, number> = { alto: 0, medio: 1, baixo: 2 };

export async function listarCrises(filtros?: { risco?: NivelRisco | "" }): Promise<CriseItem[]> {
  let q = supabase.from("gestao_crise").select("*");

  if (filtros?.risco) q = q.eq("risco", filtros.risco);

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  return (data ?? []).sort((a, b) => PESO_RISCO[a.risco as NivelRisco] - PESO_RISCO[b.risco as NivelRisco]);
}

export async function criarCrise(
  payload: Omit<CriseItem, "id" | "user_id" | "created_at">
): Promise<void> {
  const { error } = await supabase.from("gestao_crise").insert(payload);
  if (error) throw new Error(error.message);
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

async function registrarAlteracoesCrise(
  id: string,
  antigo: CriseItem,
  novo: Omit<CriseItem, "id" | "user_id" | "created_at">,
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

  if (logs.length === 0) return;
  await supabase.from("crise_logs").insert(logs);
}

export async function editarCrise(
  id: string,
  payload: Omit<CriseItem, "id" | "user_id" | "created_at">,
  dadosAntigos?: CriseItem,
): Promise<void> {
  const { error } = await supabase.from("gestao_crise").update(payload).eq("id", id);
  if (error) throw new Error(error.message);
  if (dadosAntigos) registrarAlteracoesCrise(id, dadosAntigos, payload).catch(() => {});
}

export async function excluirCrise(id: string): Promise<void> {
  const { error } = await supabase.from("gestao_crise").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
