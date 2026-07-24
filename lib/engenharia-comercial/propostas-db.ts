import { supabase } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { EcVersaoStatus } from "./types";

// ── Tipos para a UI ───────────────────────────────────────────

export type PipelineOption = {
  id: string;
  cliente: string;
  responsavel: string;
};

export type PropostaListItem = {
  propostaId: string;
  propostaNome: string;
  propostaStatus: string;
  pipelineId: string;
  cliente: string;
  versaoId: string | null;
  versaoNumero: number | null;
  versaoStatus: EcVersaoStatus | null;
  valorImplantacao: number | null;
  valorMensal: number | null;
  margemPct: number | null;
  requiresApproval: boolean | null;
};

export type PropostaDetalhe = {
  id: string;
  nome: string;
  descricao: string;
  status: string;
  pipelineId: string;
  cliente: string;
  responsavel: string;
  createdAt: string;
};

export type VersaoListItem = {
  id: string;
  numero: number;
  status: EcVersaoStatus;
  isCurrent: boolean;
  motivoRevisao: string;
  createdAt: string;
  valorImplantacao: number | null;
  valorMensal: number | null;
  margemPct: number | null;
  requiresApproval: boolean | null;
  necessitaRecalculo: boolean;
};

export type VersaoKpis = {
  versaoId: string;
  versaoNumero: number;
  versaoStatus: EcVersaoStatus;
  propostaId: string;
  propostaNome: string;
  cliente: string;
  valorImplantacao: number | null;
  valorMensal: number | null;
  margemPct: number | null;
  custoTotalMateriais: number | null;
  custoMensalOperacional: number | null;
  lucroMensal: number | null;
  paybackMeses: number | null;
  roiPct: number | null;
  requiresApproval: boolean | null;
  calculatedAt: string | null;
  memorialCalculo: Record<string, unknown> | null;
};

export type ChecklistVersao = {
  temDadosProjeto: boolean;
  temNecessidades: boolean;
  temSolucoes: boolean;
  temPremissas: boolean;
  temCustos: boolean;
  temEngenharia: boolean;
  temPrecificacao: boolean;
};

// ── Queries ───────────────────────────────────────────────────

export async function listarPipelinesDisponiveis(): Promise<PipelineOption[]> {
  const { data, error } = await supabase
    .from("pipeline")
    .select("id, cliente, responsavel")
    .not("status", "in", '("fechado","declinado")')
    .order("cliente");
  if (error) throw new Error(error.message);
  return (data ?? []) as PipelineOption[];
}

export async function listarPropostas(filtros?: {
  busca?: string;
  status?: string;
}): Promise<PropostaListItem[]> {
  let q = supabase
    .from("ec_visao_executiva")
    .select(
      "proposta_id, proposta_nome, proposta_status, pipeline_id, cliente, versao_id, versao_numero, versao_status, is_current, valor_implantacao, valor_mensal, margem_pct, requires_approval"
    )
    .eq("is_current", true);

  if (filtros?.status) q = q.eq("proposta_status", filtros.status);
  if (filtros?.busca) {
    const b = filtros.busca.replace(/[%_]/g, "\\$&");
    q = q.or(`proposta_nome.ilike.%${b}%,cliente.ilike.%${b}%`);
  }

  const { data, error } = await q.order("proposta_nome");
  if (error) throw new Error(error.message);

  return (data ?? []).map((r) => {
    const d = r as Record<string, unknown>;
    return {
      propostaId:       d.proposta_id as string,
      propostaNome:     d.proposta_nome as string,
      propostaStatus:   d.proposta_status as string,
      pipelineId:       d.pipeline_id as string,
      cliente:          d.cliente as string,
      versaoId:         d.versao_id as string | null,
      versaoNumero:     d.versao_numero as number | null,
      versaoStatus:     d.versao_status as EcVersaoStatus | null,
      valorImplantacao: d.valor_implantacao as number | null,
      valorMensal:      d.valor_mensal as number | null,
      margemPct:        d.margem_pct as number | null,
      requiresApproval: d.requires_approval as boolean | null,
    };
  });
}

export async function buscarPropostaDetalhe(id: string, client?: SupabaseClient): Promise<PropostaDetalhe | null> {
  const db = client ?? supabase;
  const { data, error } = await db
    .from("ec_propostas")
    .select("id, nome, descricao, status, pipeline_id, created_at, pipeline:pipeline_id(cliente, responsavel)")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  const d = data as Record<string, unknown>;
  const pip = d.pipeline as Record<string, string> | null;
  return {
    id:          d.id as string,
    nome:        d.nome as string,
    descricao:   d.descricao as string,
    status:      d.status as string,
    pipelineId:  d.pipeline_id as string,
    cliente:     pip?.cliente ?? "",
    responsavel: pip?.responsavel ?? "",
    createdAt:   d.created_at as string,
  };
}

export async function listarVersoes(propostaId: string): Promise<VersaoListItem[]> {
  const { data: versoes, error } = await supabase
    .from("ec_versoes")
    .select("id, numero, status, is_current, motivo_revisao, created_at, necessita_recalculo")
    .eq("proposta_id", propostaId)
    .order("numero");
  if (error) throw new Error(error.message);
  if (!versoes?.length) return [];

  const ids = versoes.map((v) => (v as Record<string, unknown>).id as string);

  const { data: kpis } = await supabase
    .from("ec_visao_executiva")
    .select("versao_id, valor_implantacao, valor_mensal, margem_pct, requires_approval")
    .in("versao_id", ids);

  const kpiMap = new Map(
    (kpis ?? []).map((k) => {
      const d = k as Record<string, unknown>;
      return [d.versao_id as string, d];
    })
  );

  return versoes.map((v) => {
    const vd = v as Record<string, unknown>;
    const k  = kpiMap.get(vd.id as string);
    return {
      id:               vd.id as string,
      numero:           vd.numero as number,
      status:           vd.status as EcVersaoStatus,
      isCurrent:        vd.is_current as boolean,
      motivoRevisao:    vd.motivo_revisao as string,
      createdAt:        vd.created_at as string,
      valorImplantacao:   (k?.valor_implantacao as number) ?? null,
      valorMensal:        (k?.valor_mensal as number) ?? null,
      margemPct:          (k?.margem_pct as number) ?? null,
      requiresApproval:   (k?.requires_approval as boolean) ?? null,
      necessitaRecalculo: (vd.necessita_recalculo as boolean) ?? false,
    };
  });
}

export async function buscarKpisVersao(versaoId: string, client?: SupabaseClient): Promise<VersaoKpis | null> {
  const db = client ?? supabase;
  const { data, error } = await db
    .from("ec_visao_executiva")
    .select("*")
    .eq("versao_id", versaoId)
    .single();
  if (error || !data) return null;
  const d = data as Record<string, unknown>;
  return {
    versaoId:             d.versao_id as string,
    versaoNumero:         d.versao_numero as number,
    versaoStatus:         d.versao_status as EcVersaoStatus,
    propostaId:           d.proposta_id as string,
    propostaNome:         d.proposta_nome as string,
    cliente:              d.cliente as string,
    valorImplantacao:     d.valor_implantacao as number | null,
    valorMensal:          d.valor_mensal as number | null,
    margemPct:            d.margem_pct as number | null,
    custoTotalMateriais:  d.custo_total_materiais as number | null,
    custoMensalOperacional: d.custo_mensal_operacional as number | null,
    lucroMensal:          d.lucro_mensal as number | null,
    paybackMeses:         d.payback_meses as number | null,
    roiPct:               d.roi_pct as number | null,
    requiresApproval:     d.requires_approval as boolean | null,
    calculatedAt:         d.calculated_at as string | null,
    memorialCalculo:      d.memorial_calculo as Record<string, unknown> | null,
  };
}

export async function buscarChecklist(versaoId: string): Promise<ChecklistVersao> {
  const [r1, r2, r3, r4, r5, r6, r7] = await Promise.all([
    supabase.from("ec_projeto_dados").select("id",   { count: "exact", head: true }).eq("versao_id", versaoId),
    supabase.from("ec_necessidades").select("id",    { count: "exact", head: true }).eq("versao_id", versaoId),
    supabase.from("ec_versao_solucoes").select("id", { count: "exact", head: true }).eq("versao_id", versaoId),
    supabase.from("ec_premissas").select("id",       { count: "exact", head: true }).eq("versao_id", versaoId),
    supabase.from("ec_custos_proposta").select("id", { count: "exact", head: true }).eq("versao_id", versaoId),
    supabase.from("ec_lista_materiais").select("id", { count: "exact", head: true }).eq("versao_id", versaoId),
    supabase.from("ec_precificacao").select("id",    { count: "exact", head: true }).eq("versao_id", versaoId),
  ]);
  return {
    temDadosProjeto: (r1.count ?? 0) > 0,
    temNecessidades: (r2.count ?? 0) > 0,
    temSolucoes:     (r3.count ?? 0) > 0,
    temPremissas:    (r4.count ?? 0) > 0,
    temCustos:       (r5.count ?? 0) > 0,
    temEngenharia:   (r6.count ?? 0) > 0,
    temPrecificacao: (r7.count ?? 0) > 0,
  };
}

