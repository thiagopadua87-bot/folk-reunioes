import { supabase } from "./supabase";
import type { Vendedor } from "./cadastros";

// ── Constantes e tipos ──────────────────────────────────────

export const TIPOS_VENDA = [
  { value: "recorrente",   label: "Recorrente" },
  { value: "venda_direta", label: "Venda direta" },
] as const;

export const TEMPERATURAS = [
  { value: "fria",   label: "Fria" },
  { value: "morna",  label: "Morna" },
  { value: "quente", label: "Quente" },
] as const;

export const STATUS_PIPELINE = [
  { value: "apresentacao",  label: "Apresentação da empresa ou proposta" },
  { value: "em_analise",    label: "Em análise" },
  { value: "assinatura",    label: "Assinatura de Contrato" },
  { value: "fechado",       label: "Fechado" },
  { value: "declinado",     label: "Declinado" },
  { value: "fechado_ganho", label: "Fechado (ganho)" },
] as const;

export const SERVICOS_COMERCIAL = [
  "Portaria Remota",
  "CFTV",
  "Alarme",
  "Monitoramento de Alarme",
  "Controle de Acesso",
  "Retrofit",
] as const;

export type TipoVenda      = (typeof TIPOS_VENDA)[number]["value"];
export type Temperatura    = (typeof TEMPERATURAS)[number]["value"];
export type StatusPipeline = (typeof STATUS_PIPELINE)[number]["value"];

export interface Venda {
  id: string;
  user_id: string;
  data_fechamento: string;
  vendedor_id: string | null;
  vendedor_nome: string | null;
  cnpj: string;
  cliente: string;
  valor: number;
  indicado_por: string;
  observacoes: string;
  servicos: string[];
  tipo_venda: TipoVenda;
  arquivo_url: string | null;
  arquivo_nome: string | null;
  enviado_para_projetos: boolean;
  pipeline_id: string | null;
  created_at: string;
}

export interface PipelineItem {
  id: string;
  user_id: string;
  data_inicio_lead: string;
  vendedor_id: string | null;
  vendedor_nome: string | null;
  cliente: string;
  temperatura: Temperatura;
  valor_aproximado: number;
  status: StatusPipeline;
  indicado_por: string;
  observacoes: string;
  servicos: string[];
  convertido_em_venda: boolean;
  venda_id: string | null;
  created_at: string;
}

export interface PreenchimentoVenda {
  pipeline_id: string;
  cliente: string;
  vendedor_id: string | null;
  valor: number;
  servicos: string[];
  observacoes: string;
  indicado_por: string;
}

export interface PipelineLog {
  id: string;
  user_id: string;
  proposta_id: string;
  campo: string;
  valor_anterior: string;
  valor_novo: string;
  created_at: string;
}

// ── Helpers de exibição ──────────────────────────────────────

export const labelTipoVenda      = (v: TipoVenda)      => TIPOS_VENDA.find((t) => t.value === v)?.label ?? v;
export const labelTemperatura    = (v: Temperatura)     => TEMPERATURAS.find((t) => t.value === v)?.label ?? v;
export const labelStatusPipeline = (v: StatusPipeline) => STATUS_PIPELINE.find((s) => s.value === v)?.label ?? v;

export function formatMoeda(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}
export function formatData(s: string) {
  if (!s) return "—";
  return new Date(s + "T00:00:00").toLocaleDateString("pt-BR");
}

// ── Vendas ───────────────────────────────────────────────────

export type VendaPayload = Omit<Venda, "id" | "user_id" | "created_at" | "servicos" | "vendedor_nome" | "arquivo_url" | "arquivo_nome" | "enviado_para_projetos">;

export interface FiltrosVendas {
  dataInicio?: string;
  dataFim?: string;
  tipoVenda?: TipoVenda | "";
}

type RawVenda = Omit<Venda, "servicos" | "vendedor_nome"> & {
  venda_servicos: { servico: string }[];
  vendedores: { nome: string } | null;
};

export async function listarVendas(filtros?: FiltrosVendas): Promise<Venda[]> {
  let q = supabase
    .from("vendas")
    .select("*, venda_servicos(servico), vendedores!vendedor_id(nome)")
    .order("data_fechamento", { ascending: false });
  if (filtros?.dataInicio) q = q.gte("data_fechamento", filtros.dataInicio);
  if (filtros?.dataFim)    q = q.lte("data_fechamento", filtros.dataFim);
  if (filtros?.tipoVenda)  q = q.eq("tipo_venda", filtros.tipoVenda);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data as RawVenda[] ?? []).map(({ venda_servicos, vendedores, ...v }) => ({
    ...v,
    servicos:      venda_servicos.map((vs) => vs.servico),
    vendedor_nome: vendedores?.nome ?? null,
  }));
}

async function uploadAnexo(vendaId: string, file: File): Promise<{ url: string; nome: string }> {
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${vendaId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("vendas-anexos").upload(path, file, { upsert: true });
  if (error) throw new Error(`Erro ao enviar arquivo: ${error.message}`);
  const { data } = supabase.storage.from("vendas-anexos").getPublicUrl(path);
  return { url: data.publicUrl, nome: file.name };
}

export async function criarVenda(payload: VendaPayload, servicos: string[], arquivo?: File | null): Promise<string> {
  const { data: venda, error: errVenda } = await supabase
    .from("vendas")
    .insert({ ...payload, arquivo_url: null, arquivo_nome: null })
    .select("id")
    .single();
  if (errVenda || !venda) throw new Error(errVenda?.message ?? "Erro ao criar venda.");

  if (arquivo) {
    const { url, nome } = await uploadAnexo(venda.id, arquivo);
    await supabase.from("vendas").update({ arquivo_url: url, arquivo_nome: nome }).eq("id", venda.id);
  }

  if (servicos.length > 0) {
    const { error: errServicos } = await supabase
      .from("venda_servicos")
      .insert(servicos.map((s) => ({ venda_id: venda.id, servico: s })));
    if (errServicos) {
      await supabase.from("vendas").delete().eq("id", venda.id);
      throw new Error(errServicos.message);
    }
  }

  return venda.id;
}

export async function marcarPipelineConvertido(pipelineId: string, vendaId: string): Promise<void> {
  const { data: item } = await supabase
    .from("pipeline")
    .select("status")
    .eq("id", pipelineId)
    .single();

  const statusAnteriorLabel = item?.status
    ? (labelStatusPipeline(item.status as StatusPipeline) ?? item.status)
    : "—";

  const { error } = await supabase
    .from("pipeline")
    .update({ convertido_em_venda: true, venda_id: vendaId, status: "fechado_ganho" })
    .eq("id", pipelineId);
  if (error) throw new Error(error.message);

  await supabase.from("pipeline_logs").insert([
    {
      proposta_id:    pipelineId,
      campo:          "status",
      valor_anterior: statusAnteriorLabel,
      valor_novo:     "Fechado (ganho)",
    },
    {
      proposta_id:    pipelineId,
      campo:          "conversao",
      valor_anterior: "pipeline",
      valor_novo:     "convertido_em_venda",
    },
  ]);
}

export async function editarVenda(id: string, payload: VendaPayload, servicos: string[], arquivo?: File | null): Promise<void> {
  let arquivoExtra: { arquivo_url?: string; arquivo_nome?: string } = {};
  if (arquivo) {
    const { url, nome } = await uploadAnexo(id, arquivo);
    arquivoExtra = { arquivo_url: url, arquivo_nome: nome };
  }

  const { error: errVenda } = await supabase.from("vendas").update({ ...payload, ...arquivoExtra }).eq("id", id);
  if (errVenda) throw new Error(errVenda.message);

  const { error: errDel } = await supabase.from("venda_servicos").delete().eq("venda_id", id);
  if (errDel) throw new Error(errDel.message);

  if (servicos.length > 0) {
    const { error: errIns } = await supabase
      .from("venda_servicos")
      .insert(servicos.map((s) => ({ venda_id: id, servico: s })));
    if (errIns) throw new Error(errIns.message);
  }
}

export async function excluirVenda(id: string): Promise<void> {
  const { error } = await supabase.from("vendas").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function criarObraAPartirDaVenda(venda: Venda): Promise<string> {
  if (venda.enviado_para_projetos) throw new Error("Esta venda já foi enviada para projetos.");

  const hoje = new Date().toISOString().slice(0, 10);

  const { data: obra, error: errObra } = await supabase
    .from("obras")
    .insert({
      data_inicio:     hoje,
      data_prazo:      null,
      data_conclusao:  null,
      cliente:         venda.cliente,
      servicos:        venda.servicos ?? [],
      situacao:        "a_executar",
      equipe:          "equipe_propria",
      tecnico_id:      null,
      terceirizado_id: null,
      valor_execucao:  0,
      andamento:       0,
      observacoes:     venda.observacoes ?? "",
      venda_id:        venda.id,
    })
    .select("id")
    .single();

  if (errObra || !obra) throw new Error(errObra?.message ?? "Erro ao criar obra.");

  const { error: errVenda } = await supabase
    .from("vendas")
    .update({ enviado_para_projetos: true })
    .eq("id", venda.id);

  if (errVenda) throw new Error(errVenda.message);

  return obra.id;
}

// ── Pipeline ─────────────────────────────────────────────────

export type PipelinePayload = Omit<PipelineItem, "id" | "user_id" | "created_at" | "vendedor_nome" | "convertido_em_venda" | "venda_id">;

export interface FiltrosPipeline {
  temperatura?: Temperatura | "";
  status?: StatusPipeline | "";
}

type RawPipelineItem = Omit<PipelineItem, "vendedor_nome"> & {
  vendedores: { nome: string } | null;
};

export async function listarPipeline(filtros?: FiltrosPipeline): Promise<PipelineItem[]> {
  let q = supabase
    .from("pipeline")
    .select("*, vendedores!vendedor_id(nome)")
    .order("data_inicio_lead", { ascending: false });
  if (filtros?.temperatura) q = q.eq("temperatura", filtros.temperatura);
  if (filtros?.status)      q = q.eq("status", filtros.status);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data as RawPipelineItem[] ?? []).map(({ vendedores, ...p }) => ({
    ...p,
    vendedor_nome: vendedores?.nome ?? null,
  }));
}

export async function criarPipelineItem(payload: PipelinePayload): Promise<void> {
  const { error } = await supabase.from("pipeline").insert(payload);
  if (error) throw new Error(error.message);
}

export async function editarPipelineItem(
  id: string,
  payload: PipelinePayload,
  dadosAntigos: PipelineItem,
  vendedores: Vendedor[],
): Promise<void> {
  const { error } = await supabase.from("pipeline").update(payload).eq("id", id);
  if (error) throw new Error(error.message);

  // Log assíncrono — erro de log não bloqueia o save
  registrarAlteracoes(id, dadosAntigos, payload, vendedores).catch(() => {});
}

export async function excluirPipelineItem(id: string): Promise<void> {
  const { error } = await supabase.from("pipeline").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Pipeline Logs ─────────────────────────────────────────────

export async function listarLogs(propostaId: string): Promise<PipelineLog[]> {
  const { data, error } = await supabase
    .from("pipeline_logs")
    .select("*")
    .eq("proposta_id", propostaId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as PipelineLog[];
}

async function registrarAlteracoes(
  propostaId: string,
  antigo: PipelineItem,
  novo: PipelinePayload,
  vendedores: Vendedor[],
): Promise<void> {
  type LogInput = { proposta_id: string; campo: string; valor_anterior: string; valor_novo: string };
  const logs: LogInput[] = [];

  if (antigo.status !== novo.status) {
    logs.push({ proposta_id: propostaId, campo: "status", valor_anterior: labelStatusPipeline(antigo.status), valor_novo: labelStatusPipeline(novo.status) });
  }

  if (antigo.temperatura !== novo.temperatura) {
    logs.push({ proposta_id: propostaId, campo: "temperatura", valor_anterior: labelTemperatura(antigo.temperatura), valor_novo: labelTemperatura(novo.temperatura) });
  }

  if (antigo.vendedor_id !== novo.vendedor_id) {
    const nomeAntigo = antigo.vendedor_nome ?? "—";
    const nomeNovo   = vendedores.find((v) => v.id === novo.vendedor_id)?.nome ?? "—";
    logs.push({ proposta_id: propostaId, campo: "vendedor", valor_anterior: nomeAntigo, valor_novo: nomeNovo });
  }

  if (antigo.valor_aproximado !== novo.valor_aproximado) {
    logs.push({ proposta_id: propostaId, campo: "valor", valor_anterior: formatMoeda(antigo.valor_aproximado), valor_novo: formatMoeda(novo.valor_aproximado) });
  }

  const antigosServicos = antigo.servicos ?? [];
  const novosServicos   = novo.servicos   ?? [];
  for (const s of novosServicos.filter((s) => !antigosServicos.includes(s))) {
    logs.push({ proposta_id: propostaId, campo: "servico_adicionado", valor_anterior: "", valor_novo: s });
  }
  for (const s of antigosServicos.filter((s) => !novosServicos.includes(s))) {
    logs.push({ proposta_id: propostaId, campo: "servico_removido", valor_anterior: s, valor_novo: "" });
  }

  if (antigo.convertido_em_venda && logs.length > 0) {
    logs.push({
      proposta_id:    propostaId,
      campo:          "edicao_pos_conversao",
      valor_anterior: "original",
      valor_novo:     "alterado",
    });
  }

  if (logs.length === 0) return;

  await supabase.from("pipeline_logs").insert(logs);
}
