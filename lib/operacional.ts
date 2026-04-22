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

export async function editarClientePerdido(
  id: string,
  payload: Omit<ClientePerdido, "id" | "user_id" | "created_at">
): Promise<void> {
  const { error } = await supabase.from("clientes_perdidos").update(payload).eq("id", id);
  if (error) throw new Error(error.message);
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

export async function editarCrise(
  id: string,
  payload: Omit<CriseItem, "id" | "user_id" | "created_at">
): Promise<void> {
  const { error } = await supabase.from("gestao_crise").update(payload).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function excluirCrise(id: string): Promise<void> {
  const { error } = await supabase.from("gestao_crise").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
