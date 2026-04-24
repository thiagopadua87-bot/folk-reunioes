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
  "Aditivo de contrato",
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
  autor_nome: string | null;
  created_at: string;
}

export interface VendaLog {
  id: string;
  user_id: string;
  venda_id: string;
  campo: string;
  valor_anterior: string;
  valor_novo: string;
  autor_nome: string | null;
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
  const [{ data: item }, autorNome] = await Promise.all([
    supabase.from("pipeline").select("status").eq("id", pipelineId).single(),
    getAutorNome(),
  ]);

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
      autor_nome:     autorNome,
    },
    {
      proposta_id:    pipelineId,
      campo:          "conversao",
      valor_anterior: "pipeline",
      valor_novo:     "convertido_em_venda",
      autor_nome:     autorNome,
    },
  ]);
}

export async function editarVenda(
  id: string,
  payload: VendaPayload,
  servicos: string[],
  arquivo?: File | null,
  dadosAntigos?: Venda,
  vendedores?: Vendedor[],
): Promise<void> {
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

  if (dadosAntigos && vendedores) {
    registrarAlteracoesVenda(id, dadosAntigos, payload, servicos, vendedores, arquivo?.name ?? null).catch(() => {});
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

async function getAutorNome(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("nome").eq("id", user.id).single();
  return (data as { nome: string } | null)?.nome ?? null;
}

export async function listarLogsVenda(vendaId: string): Promise<VendaLog[]> {
  const { data, error } = await supabase
    .from("vendas_logs")
    .select("*")
    .eq("venda_id", vendaId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as VendaLog[];
}

async function registrarAlteracoesVenda(
  vendaId: string,
  antigo: Venda,
  novo: VendaPayload,
  novosServicos: string[],
  vendedores: Vendedor[],
  novoArquivoNome?: string | null,
): Promise<void> {
  type LogInput = { venda_id: string; campo: string; valor_anterior: string; valor_novo: string; autor_nome: string | null };
  const autorNome = await getAutorNome();
  const logs: LogInput[] = [];

  const cnpjFmt = (v: string) => {
    const d = v.replace(/\D/g, "");
    if (d.length !== 14) return v || "—";
    return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`;
  };

  if (antigo.data_fechamento !== novo.data_fechamento)
    logs.push({ venda_id: vendaId, campo: "data_fechamento", valor_anterior: formatData(antigo.data_fechamento), valor_novo: formatData(novo.data_fechamento), autor_nome: autorNome });

  if (antigo.cliente !== novo.cliente)
    logs.push({ venda_id: vendaId, campo: "cliente", valor_anterior: antigo.cliente, valor_novo: novo.cliente, autor_nome: autorNome });

  if ((antigo.cnpj ?? "") !== (novo.cnpj ?? ""))
    logs.push({ venda_id: vendaId, campo: "cnpj", valor_anterior: cnpjFmt(antigo.cnpj), valor_novo: cnpjFmt(novo.cnpj), autor_nome: autorNome });

  if (antigo.vendedor_id !== novo.vendedor_id) {
    const nomeAntigo = antigo.vendedor_nome ?? "—";
    const nomeNovo   = vendedores.find((v) => v.id === novo.vendedor_id)?.nome ?? "—";
    logs.push({ venda_id: vendaId, campo: "vendedor", valor_anterior: nomeAntigo, valor_novo: nomeNovo, autor_nome: autorNome });
  }

  if (antigo.valor !== novo.valor)
    logs.push({ venda_id: vendaId, campo: "valor", valor_anterior: formatMoeda(antigo.valor), valor_novo: formatMoeda(novo.valor), autor_nome: autorNome });

  if (antigo.tipo_venda !== novo.tipo_venda)
    logs.push({ venda_id: vendaId, campo: "tipo_venda", valor_anterior: labelTipoVenda(antigo.tipo_venda), valor_novo: labelTipoVenda(novo.tipo_venda), autor_nome: autorNome });

  if ((antigo.indicado_por ?? "") !== (novo.indicado_por ?? ""))
    logs.push({ venda_id: vendaId, campo: "indicado_por", valor_anterior: antigo.indicado_por || "—", valor_novo: novo.indicado_por || "—", autor_nome: autorNome });

  if ((antigo.observacoes ?? "") !== (novo.observacoes ?? ""))
    logs.push({ venda_id: vendaId, campo: "observacoes", valor_anterior: antigo.observacoes || "—", valor_novo: novo.observacoes || "—", autor_nome: autorNome });

  const antigosServicos = antigo.servicos ?? [];
  for (const s of novosServicos.filter((s) => !antigosServicos.includes(s)))
    logs.push({ venda_id: vendaId, campo: "servico_adicionado", valor_anterior: "", valor_novo: s, autor_nome: autorNome });
  for (const s of antigosServicos.filter((s) => !novosServicos.includes(s)))
    logs.push({ venda_id: vendaId, campo: "servico_removido", valor_anterior: s, valor_novo: "", autor_nome: autorNome });

  if (novoArquivoNome)
    logs.push({ venda_id: vendaId, campo: "arquivo", valor_anterior: antigo.arquivo_nome || "—", valor_novo: novoArquivoNome, autor_nome: autorNome });

  if (logs.length === 0) return;
  await supabase.from("vendas_logs").insert(logs);
}

export async function registrarOrigemVenda(vendaId: string, pipelineId: string): Promise<void> {
  const autorNome = await getAutorNome();
  await supabase.from("vendas_logs").insert({
    venda_id:       vendaId,
    campo:          "origem",
    valor_anterior: "pipeline",
    valor_novo:     pipelineId,
    autor_nome:     autorNome,
  });
}

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
  type LogInput = { proposta_id: string; campo: string; valor_anterior: string; valor_novo: string; autor_nome: string | null };
  const autorNome = await getAutorNome();
  const logs: LogInput[] = [];

  if (antigo.status !== novo.status) {
    logs.push({ proposta_id: propostaId, campo: "status", valor_anterior: labelStatusPipeline(antigo.status), valor_novo: labelStatusPipeline(novo.status), autor_nome: autorNome });
  }

  if (antigo.temperatura !== novo.temperatura) {
    logs.push({ proposta_id: propostaId, campo: "temperatura", valor_anterior: labelTemperatura(antigo.temperatura), valor_novo: labelTemperatura(novo.temperatura), autor_nome: autorNome });
  }

  if (antigo.vendedor_id !== novo.vendedor_id) {
    const nomeAntigo = antigo.vendedor_nome ?? "—";
    const nomeNovo   = vendedores.find((v) => v.id === novo.vendedor_id)?.nome ?? "—";
    logs.push({ proposta_id: propostaId, campo: "vendedor", valor_anterior: nomeAntigo, valor_novo: nomeNovo, autor_nome: autorNome });
  }

  if (antigo.valor_aproximado !== novo.valor_aproximado) {
    logs.push({ proposta_id: propostaId, campo: "valor", valor_anterior: formatMoeda(antigo.valor_aproximado), valor_novo: formatMoeda(novo.valor_aproximado), autor_nome: autorNome });
  }

  const antigosServicos = antigo.servicos ?? [];
  const novosServicos   = novo.servicos   ?? [];
  for (const s of novosServicos.filter((s) => !antigosServicos.includes(s))) {
    logs.push({ proposta_id: propostaId, campo: "servico_adicionado", valor_anterior: "", valor_novo: s, autor_nome: autorNome });
  }
  for (const s of antigosServicos.filter((s) => !novosServicos.includes(s))) {
    logs.push({ proposta_id: propostaId, campo: "servico_removido", valor_anterior: s, valor_novo: "", autor_nome: autorNome });
  }

  if (antigo.data_inicio_lead !== novo.data_inicio_lead)
    logs.push({ proposta_id: propostaId, campo: "data_lead", valor_anterior: formatData(antigo.data_inicio_lead), valor_novo: formatData(novo.data_inicio_lead), autor_nome: autorNome });

  if (antigo.cliente !== novo.cliente)
    logs.push({ proposta_id: propostaId, campo: "cliente", valor_anterior: antigo.cliente, valor_novo: novo.cliente, autor_nome: autorNome });

  if ((antigo.indicado_por ?? "") !== (novo.indicado_por ?? ""))
    logs.push({ proposta_id: propostaId, campo: "indicado_por", valor_anterior: antigo.indicado_por || "—", valor_novo: novo.indicado_por || "—", autor_nome: autorNome });

  if ((antigo.observacoes ?? "") !== (novo.observacoes ?? ""))
    logs.push({ proposta_id: propostaId, campo: "observacoes", valor_anterior: antigo.observacoes || "—", valor_novo: novo.observacoes || "—", autor_nome: autorNome });

  if (antigo.convertido_em_venda && logs.length > 0) {
    logs.push({
      proposta_id:    propostaId,
      campo:          "edicao_pos_conversao",
      valor_anterior: "original",
      valor_novo:     "alterado",
      autor_nome:     autorNome,
    });
  }

  if (logs.length === 0) return;

  await supabase.from("pipeline_logs").insert(logs);
}
