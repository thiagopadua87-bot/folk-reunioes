import { supabase } from "./supabase";

// ── Constantes ────────────────────────────────────────────────

export const TIPO_SERVICO_REGRA = [
  { value: "portaria_remota", label: "Portaria Remota" },
  { value: "demais",          label: "Demais Serviços" },
  { value: "venda_direta",    label: "Venda Direta"    },
] as const;

export type TipoServicoRegra = (typeof TIPO_SERVICO_REGRA)[number]["value"];

export const STATUS_COMPETENCIA_LIST = [
  { value: "aberta",               label: "Aberta"                },
  { value: "em_conferencia",       label: "Em Conferência"        },
  { value: "aguardando_aprovacao", label: "Aguardando Aprovação"  },
  { value: "aprovada",             label: "Aprovada"              },
  { value: "enviada_financeiro",   label: "Enviada ao Financeiro" },
  { value: "paga",                 label: "Paga"                  },
  { value: "fechada",              label: "Fechada"               },
] as const;

export type StatusCompetencia = (typeof STATUS_COMPETENCIA_LIST)[number]["value"];

export const STATUS_COMISSAO_LIST = [
  { value: "aguardando_liberacao", label: "Aguardando Liberação" },
  { value: "elegivel",             label: "Elegível"             },
  { value: "na_competencia",       label: "Na Competência"       },
  { value: "aprovada",             label: "Aprovada"             },
  { value: "paga",                 label: "Paga"                 },
  { value: "cancelada",            label: "Cancelada"            },
] as const;

export type StatusComissao = (typeof STATUS_COMISSAO_LIST)[number]["value"];

export type TipoBeneficiario = "consultor" | "gerente" | "indicador";

export const TIPO_VENDEDOR_LIST = [
  { value: "consultor", label: "Consultor" },
  { value: "gerente",   label: "Gerente"   },
  { value: "outro",     label: "Outro"     },
] as const;

export type TipoVendedor = (typeof TIPO_VENDEDOR_LIST)[number]["value"];

// ── Interfaces ────────────────────────────────────────────────

export interface ComissaoRegra {
  id:                         string;
  nome:                       string;
  tipo_servico:               TipoServicoRegra;
  percentual_consultor:       number;
  percentual_consultor_impl:  number;
  percentual_gerente:         number;
  percentual_gerente_proprio: number;
  percentual_indicador:       number;
  meses_recorrencia:          number;
  ativo:                      boolean;
  vigencia_inicio:            string | null;
  vigencia_fim:               string | null;
  observacoes:                string;
  created_at:                 string;
  updated_at:                 string;
}

export interface Competencia {
  id:                    string;
  competencia:           string;
  ano:                   number;
  mes:                   number;
  data_inicio:           string;
  data_fim:              string;
  status:                StatusCompetencia;
  data_aprovacao:        string | null;
  aprovado_por:          string | null;
  data_envio_financeiro: string | null;
  enviado_por:           string | null;
  data_pagamento:        string | null;
  pago_por:              string | null;
  observacoes:           string;
  created_at:            string;
  // computed
  total_comissoes?:      number;
  total_vendedores?:     number;
  total_vendas?:         number;
}

export interface Comissao {
  id:                  string;
  venda_id:            string;
  vendedor_id:         string | null;
  indicador_ref_id:    string | null;
  tipo_beneficiario:   TipoBeneficiario;
  regra_id:            string | null;
  competencia:         string | null;
  valor_base_mensal:   number;
  valor_base_impl:     number;
  percentual_mensal:   number;
  percentual_impl:     number;
  comissao_mensal:     number;
  comissao_impl:       number;
  comissao_total:      number;
  status:              StatusComissao;
  motivo_cancelamento: string | null;
  aprovado_por:        string | null;
  data_aprovacao:      string | null;
  pago_por:            string | null;
  data_pagamento:      string | null;
  observacoes:         string;
  created_at:          string;
  // joins
  vendedor_nome?:      string;
  venda_cliente?:      string;
  venda_data?:         string;
  venda_tipo?:         string;
  venda_servicos?:     string[];
}

export interface ResumoVendedor {
  vendedor_id:    string;
  vendedor_nome:  string;
  qtd_vendas:     number;
  comissao_total: number;
  comissoes:      Comissao[];
}

export interface ResumoDashboard {
  aguard_liberacao_valor:  number;
  aguard_liberacao_count:  number;
  elegiveis_valor:         number;
  elegiveis_count:         number;
  aprovadas_valor:         number;
  pagas_total_valor:       number;
  pagas_total_count:       number;
  competencia_aberta:      string | null;
  competencia_valor:       number;
  top_vendedores:          { vendedor_nome: string; total: number }[];
}

// ── Helpers de negócio ────────────────────────────────────────

export function getTipoServicoRegra(
  servicos: string[],
  tipoVenda: "recorrente" | "venda_direta",
): TipoServicoRegra {
  if (tipoVenda === "venda_direta") return "venda_direta";
  if (servicos.includes("Portaria Remota")) return "portaria_remota";
  return "demais";
}

export function calcularCompetencia(dataFechamento: string): {
  competencia: string;
  data_inicio: string;
  data_fim:    string;
} {
  const d   = new Date(dataFechamento + "T12:00:00");
  const dia = d.getDate();

  let ano: number, mes: number;
  if (dia <= 15) {
    mes = d.getMonth() + 1;
    ano = d.getFullYear();
  } else {
    const prox = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    mes = prox.getMonth() + 1;
    ano = prox.getFullYear();
  }

  const competencia  = `${ano}-${String(mes).padStart(2, "0")}`;
  const anoAnt       = mes === 1 ? ano - 1 : ano;
  const mesAnt       = mes === 1 ? 12 : mes - 1;
  const data_inicio  = `${anoAnt}-${String(mesAnt).padStart(2, "0")}-16`;
  const data_fim     = `${ano}-${String(mes).padStart(2, "0")}-15`;

  return { competencia, data_inicio, data_fim };
}

export function labelCompetencia(comp: string): string {
  const [ano, mes] = comp.split("-");
  const meses = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return `${meses[parseInt(mes) - 1]}/${ano}`;
}

export function labelStatusCompetencia(s: StatusCompetencia): string {
  return STATUS_COMPETENCIA_LIST.find((x) => x.value === s)?.label ?? s;
}

export function labelStatusComissao(s: StatusComissao): string {
  return STATUS_COMISSAO_LIST.find((x) => x.value === s)?.label ?? s;
}

interface ComissaoCalculada {
  consultor: { valor_mensal: number; valor_impl: number; total: number; perc_m: number; perc_i: number } | null;
  gerente:   { valor_mensal: number; total: number; perc_m: number } | null;
  indicador: { valor_mensal: number; total: number; perc_m: number } | null;
}

function calcularPorRegra(
  regra: ComissaoRegra,
  valorMensal: number,
  valorImpl: number,
  vendedorEhGerente: boolean,
  temIndicador: boolean,
): ComissaoCalculada {
  if (regra.tipo_servico === "venda_direta") {
    const perc = regra.percentual_consultor;
    return {
      consultor: { valor_mensal: 0, valor_impl: valorImpl, total: valorImpl * perc / 100, perc_m: 0, perc_i: perc },
      gerente:   null,
      indicador: null,
    };
  }

  const base = valorMensal * regra.meses_recorrencia;
  let consultor: ComissaoCalculada["consultor"] = null;
  let gerente:   ComissaoCalculada["gerente"]   = null;
  let indicador: ComissaoCalculada["indicador"] = null;

  if (vendedorEhGerente) {
    const pm = regra.percentual_gerente_proprio;
    const pi = regra.percentual_consultor_impl;
    consultor = {
      valor_mensal: base,
      valor_impl:   valorImpl,
      total:        (base * pm / 100) + (valorImpl * pi / 100),
      perc_m:       pm,
      perc_i:       pi,
    };
  } else {
    const pm = regra.percentual_consultor;
    const pi = regra.percentual_consultor_impl;
    consultor = {
      valor_mensal: base,
      valor_impl:   valorImpl,
      total:        (base * pm / 100) + (valorImpl * pi / 100),
      perc_m:       pm,
      perc_i:       pi,
    };
    const pg = regra.percentual_gerente;
    if (pg > 0) {
      gerente = { valor_mensal: base, total: base * pg / 100, perc_m: pg };
    }
  }

  if (temIndicador) {
    const pi = regra.percentual_indicador;
    indicador = { valor_mensal: base, total: base * pi / 100, perc_m: pi };
  }

  return { consultor, gerente, indicador };
}

// ── Regras ────────────────────────────────────────────────────

export async function listarRegras(): Promise<ComissaoRegra[]> {
  
  const { data, error } = await supabase
    .from("comissoes_regras")
    .select("*")
    .order("tipo_servico");
  if (error) throw new Error(error.message);
  return (data ?? []) as ComissaoRegra[];
}

export async function buscarRegraPorTipo(tipo: TipoServicoRegra): Promise<ComissaoRegra | null> {
  
  const { data } = await supabase
    .from("comissoes_regras")
    .select("*")
    .eq("tipo_servico", tipo)
    .eq("ativo", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as ComissaoRegra | null) ?? null;
}

export async function salvarRegra(
  payload: Partial<Omit<ComissaoRegra, "id" | "created_at">> & { id?: string },
): Promise<ComissaoRegra> {
  
  const now = new Date().toISOString();
  if (payload.id) {
    const { id, ...rest } = payload;
    const { data, error } = await supabase
      .from("comissoes_regras")
      .update({ ...rest, updated_at: now })
      .eq("id", id)
      .select()
      .single();
    if (error || !data) throw new Error(error?.message ?? "Erro ao salvar regra.");
    return data as ComissaoRegra;
  }
  const { data, error } = await supabase
    .from("comissoes_regras")
    .insert({ ...payload, updated_at: now })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Erro ao criar regra.");
  return data as ComissaoRegra;
}

// ── Competências ──────────────────────────────────────────────

export async function listarCompetencias(): Promise<Competencia[]> {
  
  const { data, error } = await supabase
    .from("competencias_comissao")
    .select("*")
    .order("competencia", { ascending: false });
  if (error) throw new Error(error.message);

  const comps = (data ?? []) as Competencia[];

  // Enriquecer com totais
  const { data: totais } = await supabase
    .from("comissoes")
    .select("competencia, comissao_total, venda_id, vendedor_id")
    .in("competencia", comps.map((c) => c.competencia))
    .neq("status", "cancelada")
    .limit(2000);

  for (const comp of comps) {
    const linhas = (totais ?? []).filter((r: { competencia: string | null }) => r.competencia === comp.competencia);
    comp.total_comissoes  = linhas.reduce((s: number, r: { comissao_total: number }) => s + (r.comissao_total ?? 0), 0);
    comp.total_vendas     = new Set(linhas.map((r: { venda_id: string }) => r.venda_id)).size;
    comp.total_vendedores = new Set(linhas.map((r: { vendedor_id: string }) => r.vendedor_id)).size;
  }

  return comps;
}

export async function buscarOuCriarCompetencia(competenciaStr: string): Promise<Competencia> {
  
  const { data: existing } = await supabase
    .from("competencias_comissao")
    .select("*")
    .eq("competencia", competenciaStr)
    .maybeSingle();

  if (existing) return existing as Competencia;

  const { competencia, data_inicio, data_fim } = calcularCompetencia(
    competenciaStr.slice(0, 4) + "-" + competenciaStr.slice(5, 7) + "-15"
  );
  const ano = parseInt(competencia.slice(0, 4));
  const mes = parseInt(competencia.slice(5, 7));

  const { data, error } = await supabase
    .from("competencias_comissao")
    .insert({ competencia, ano, mes, data_inicio, data_fim })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? "Erro ao criar competência.");
  return data as Competencia;
}

export async function atualizarStatusCompetencia(
  id: string,
  status: StatusCompetencia,
  extra?: Partial<Pick<Competencia, "data_aprovacao" | "aprovado_por" | "data_envio_financeiro" | "enviado_por" | "data_pagamento" | "pago_por" | "observacoes">>,
): Promise<void> {
  
  const { error } = await supabase
    .from("competencias_comissao")
    .update({ status, updated_at: new Date().toISOString(), ...(extra ?? {}) })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Cálculo e inserção de comissões ───────────────────────────

export async function calcularEInserirComissoes(vendaId: string): Promise<void> {
  

  const { data: venda, error } = await supabase
    .from("vendas")
    .select(`
      id, tipo_venda, valor_mensal, valor_implantacao,
      vendedor_id, gerente_id, indicado_por_id, data_fechamento,
      venda_servicos(servico),
      vendedor:vendedores!vendedor_id(id, tipo, gerente_id)
    `)
    .eq("id", vendaId)
    .single();

  if (error || !venda) return;

  const servicos      = ((venda.venda_servicos ?? []) as { servico: string }[]).map((s) => s.servico);
  const tipoRegra     = getTipoServicoRegra(servicos, venda.tipo_venda as "recorrente" | "venda_direta");
  const regra         = await buscarRegraPorTipo(tipoRegra);
  if (!regra) return;

  const vendedorInfo      = venda.vendedor as unknown as { id: string; tipo: string; gerente_id: string | null } | null;
  const vendedorEhGerente = vendedorInfo?.tipo === "gerente";
  const gerenteId         = (venda.gerente_id ?? vendedorInfo?.gerente_id) as string | null;
  const temIndicador      = !!(venda.indicado_por_id as string | null);

  const calc = calcularPorRegra(
    regra,
    venda.valor_mensal as number,
    venda.valor_implantacao as number,
    vendedorEhGerente,
    temIndicador,
  );

  const rows: object[] = [];

  if (calc.consultor && venda.vendedor_id) {
    rows.push({
      venda_id:          vendaId,
      vendedor_id:       venda.vendedor_id,
      tipo_beneficiario: "consultor",
      regra_id:          regra.id,
      valor_base_mensal: calc.consultor.valor_mensal,
      valor_base_impl:   calc.consultor.valor_impl,
      percentual_mensal: calc.consultor.perc_m,
      percentual_impl:   calc.consultor.perc_i,
      comissao_mensal:   calc.consultor.valor_mensal * calc.consultor.perc_m / 100,
      comissao_impl:     calc.consultor.valor_impl   * calc.consultor.perc_i / 100,
      comissao_total:    calc.consultor.total,
      status:            "aguardando_liberacao",
    });
  }

  if (calc.gerente && gerenteId) {
    rows.push({
      venda_id:          vendaId,
      vendedor_id:       gerenteId,
      tipo_beneficiario: "gerente",
      regra_id:          regra.id,
      valor_base_mensal: calc.gerente.valor_mensal,
      valor_base_impl:   0,
      percentual_mensal: calc.gerente.perc_m,
      percentual_impl:   0,
      comissao_mensal:   calc.gerente.total,
      comissao_impl:     0,
      comissao_total:    calc.gerente.total,
      status:            "aguardando_liberacao",
    });
  }

  if (calc.indicador && (venda.indicado_por_id as string | null)) {
    rows.push({
      venda_id:          vendaId,
      vendedor_id:       null,
      indicador_ref_id:  venda.indicado_por_id,
      tipo_beneficiario: "indicador",
      regra_id:          regra.id,
      valor_base_mensal: calc.indicador.valor_mensal,
      valor_base_impl:   0,
      percentual_mensal: calc.indicador.perc_m,
      percentual_impl:   0,
      comissao_mensal:   calc.indicador.total,
      comissao_impl:     0,
      comissao_total:    calc.indicador.total,
      status:            "aguardando_liberacao",
    });
  }

  if (rows.length > 0) {
    await supabase.from("comissoes").insert(rows);
  }
}

export async function verificarELiberarComissoes(vendaId: string): Promise<void> {
  

  const { data: venda } = await supabase
    .from("vendas")
    .select("contrato_assinado, primeira_nf, data_fechamento")
    .eq("id", vendaId)
    .single();

  if (!venda?.contrato_assinado || !venda?.primeira_nf) return;

  const { competencia } = calcularCompetencia(venda.data_fechamento as string);
  await buscarOuCriarCompetencia(competencia);

  await supabase
    .from("comissoes")
    .update({ status: "elegivel", competencia, updated_at: new Date().toISOString() })
    .eq("venda_id", vendaId)
    .eq("status", "aguardando_liberacao");
}

export async function recalcularComissoesDaVenda(vendaId: string): Promise<void> {
  
  await supabase
    .from("comissoes")
    .delete()
    .eq("venda_id", vendaId)
    .neq("status", "paga");
  await calcularEInserirComissoes(vendaId);
  await verificarELiberarComissoes(vendaId);
}

// ── Leitura de comissões ───────────────────────────────────────

export async function listarComissoesPorCompetencia(competencia: string): Promise<ResumoVendedor[]> {
  

  const { data, error } = await supabase
    .from("comissoes")
    .select(`
      *,
      vendedor:vendedores!vendedor_id(nome),
      venda:vendas!venda_id(cliente, data_fechamento, tipo_venda, venda_servicos(servico))
    `)
    .eq("competencia", competencia)
    .neq("status", "cancelada")
    .order("created_at");

  if (error) throw new Error(error.message);

  const map = new Map<string, ResumoVendedor>();

  for (const row of (data ?? []) as Record<string, unknown>[]) {
    const vendedor = row.vendedor as { nome: string } | null;
    const venda    = row.venda    as { cliente: string; data_fechamento: string; tipo_venda: string; venda_servicos: { servico: string }[] } | null;

    const c: Comissao = {
      id:                  row.id as string,
      venda_id:            row.venda_id as string,
      vendedor_id:         row.vendedor_id as string | null,
      indicador_ref_id:    row.indicador_ref_id as string | null,
      tipo_beneficiario:   row.tipo_beneficiario as TipoBeneficiario,
      regra_id:            row.regra_id as string | null,
      competencia:         row.competencia as string | null,
      valor_base_mensal:   row.valor_base_mensal as number,
      valor_base_impl:     row.valor_base_impl as number,
      percentual_mensal:   row.percentual_mensal as number,
      percentual_impl:     row.percentual_impl as number,
      comissao_mensal:     row.comissao_mensal as number,
      comissao_impl:       row.comissao_impl as number,
      comissao_total:      row.comissao_total as number,
      status:              row.status as StatusComissao,
      motivo_cancelamento: row.motivo_cancelamento as string | null,
      aprovado_por:        row.aprovado_por as string | null,
      data_aprovacao:      row.data_aprovacao as string | null,
      pago_por:            row.pago_por as string | null,
      data_pagamento:      row.data_pagamento as string | null,
      observacoes:         (row.observacoes as string) ?? "",
      created_at:          row.created_at as string,
      vendedor_nome:       vendedor?.nome,
      venda_cliente:       venda?.cliente,
      venda_data:          venda?.data_fechamento,
      venda_tipo:          venda?.tipo_venda,
      venda_servicos:      venda?.venda_servicos?.map((s) => s.servico) ?? [],
    };

    const vid = c.vendedor_id ?? c.indicador_ref_id ?? "";
    if (!map.has(vid)) {
      map.set(vid, {
        vendedor_id:    vid,
        vendedor_nome:  vendedor?.nome ?? "—",
        qtd_vendas:     0,
        comissao_total: 0,
        comissoes:      [],
      });
    }
    const resumo = map.get(vid)!;
    resumo.comissoes.push(c);
    resumo.comissao_total += c.comissao_total;
    // Conta vendas únicas (não contabiliza indicador da mesma venda duplamente)
    const vendasUnicas = new Set(resumo.comissoes.map((x) => x.venda_id));
    resumo.qtd_vendas = vendasUnicas.size;
  }

  return [...map.values()].sort((a, b) => b.comissao_total - a.comissao_total);
}

export async function listarComissoesHistorico(filtros?: {
  vendedorId?:        string;
  competencia?:       string;
  competenciaInicio?: string;
  competenciaFim?:    string;
  status?:            StatusComissao;
  limit?:             number;
}): Promise<Comissao[]> {

  let q = supabase
    .from("comissoes")
    .select(`
      *,
      vendedor:vendedores!vendedor_id(nome),
      indicador:indicadores!indicador_ref_id(nome),
      venda:vendas!venda_id(cliente, data_fechamento, tipo_venda, venda_servicos(servico))
    `)
    .order("created_at", { ascending: false })
    .limit(filtros?.limit ?? 500);

  if (filtros?.vendedorId)        q = q.eq("vendedor_id",  filtros.vendedorId);
  if (filtros?.competencia)       q = q.eq("competencia",  filtros.competencia);
  if (filtros?.competenciaInicio) q = q.gte("competencia", filtros.competenciaInicio);
  if (filtros?.competenciaFim)    q = q.lte("competencia", filtros.competenciaFim);
  if (filtros?.status)            q = q.eq("status",       filtros.status);

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  return ((data ?? []) as Record<string, unknown>[]).map((row) => {
    const vendedor  = row.vendedor  as { nome: string } | null;
    const indicador = row.indicador as { nome: string } | null;
    const venda     = row.venda     as { cliente: string; data_fechamento: string; tipo_venda: string; venda_servicos: { servico: string }[] } | null;
    return {
      id:                  row.id as string,
      venda_id:            row.venda_id as string,
      vendedor_id:         row.vendedor_id as string | null,
      indicador_ref_id:    row.indicador_ref_id as string | null,
      tipo_beneficiario:   row.tipo_beneficiario as TipoBeneficiario,
      regra_id:            row.regra_id as string | null,
      competencia:         row.competencia as string | null,
      valor_base_mensal:   row.valor_base_mensal as number,
      valor_base_impl:     row.valor_base_impl as number,
      percentual_mensal:   row.percentual_mensal as number,
      percentual_impl:     row.percentual_impl as number,
      comissao_mensal:     row.comissao_mensal as number,
      comissao_impl:       row.comissao_impl as number,
      comissao_total:      row.comissao_total as number,
      status:              row.status as StatusComissao,
      motivo_cancelamento: row.motivo_cancelamento as string | null,
      aprovado_por:        row.aprovado_por as string | null,
      data_aprovacao:      row.data_aprovacao as string | null,
      pago_por:            row.pago_por as string | null,
      data_pagamento:      row.data_pagamento as string | null,
      observacoes:         (row.observacoes as string) ?? "",
      created_at:          row.created_at as string,
      vendedor_nome:       vendedor?.nome ?? indicador?.nome,
      venda_cliente:       venda?.cliente,
      venda_data:          venda?.data_fechamento,
      venda_tipo:          venda?.tipo_venda,
      venda_servicos:      venda?.venda_servicos?.map((s) => s.servico) ?? [],
    } as Comissao;
  });
}

// ── Ações sobre comissões ─────────────────────────────────────

export async function alterarStatusComissao(
  id: string,
  novoStatus: StatusComissao,
  opts?: { competencia?: string; motivo?: string },
): Promise<{ ok: boolean; error?: string }> {
  try {
    const now    = new Date().toISOString();
    const update: Record<string, unknown> = { status: novoStatus, updated_at: now };

    if (novoStatus === "cancelada") {
      update.motivo_cancelamento = opts?.motivo ?? "";
    }

    if (opts?.competencia && (novoStatus === "elegivel" || novoStatus === "na_competencia")) {
      update.competencia = opts.competencia;
      await buscarOuCriarCompetencia(opts.competencia);
    }

    const { error } = await supabase
      .from("comissoes")
      .update(update)
      .eq("id", id);

    if (error) return { ok: false, error: error.message };

    // Se liberando: marca gates na venda para manter consistência
    if (novoStatus === "elegivel") {
      const { data: c } = await supabase
        .from("comissoes").select("venda_id").eq("id", id).single();
      if (c?.venda_id) {
        await supabase
          .from("vendas")
          .update({ contrato_assinado: true, primeira_nf: true })
          .eq("id", c.venda_id);
      }
    }

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro." };
  }
}

export async function cancelarComissao(id: string, motivo: string): Promise<void> {
  const { error } = await supabase
    .from("comissoes")
    .update({ status: "cancelada", motivo_cancelamento: motivo, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Dashboard ─────────────────────────────────────────────────

export async function buscarResumoDashboard(): Promise<ResumoDashboard> {
  
  const { data } = await supabase
    .from("comissoes")
    .select("status, comissao_total, competencia, vendedor_id, vendedores!vendedor_id(nome)")
    .neq("status", "cancelada");

  const linhas = (data ?? []) as unknown as {
    status: StatusComissao;
    comissao_total: number;
    competencia: string | null;
    vendedor_id: string;
    vendedores: { nome: string } | null;
  }[];

  const aguard   = linhas.filter((r) => r.status === "aguardando_liberacao");
  const elegiveis = linhas.filter((r) => r.status === "elegivel");
  const aprovadas = linhas.filter((r) => r.status === "aprovada");
  const pagas     = linhas.filter((r) => r.status === "paga");

  // Competência mais recente aberta
  const { data: compAberta } = await supabase
    .from("competencias_comissao")
    .select("competencia")
    .eq("status", "aberta")
    .order("competencia", { ascending: false })
    .limit(1)
    .maybeSingle();

  const compStr = compAberta?.competencia ?? null;
  const naComp  = compStr ? linhas.filter((r) => r.competencia === compStr) : [];

  // Top vendedores (todas as comissões não canceladas)
  const vendMap = new Map<string, { nome: string; total: number }>();
  for (const r of linhas) {
    const nome = r.vendedores?.nome ?? r.vendedor_id;
    if (!vendMap.has(r.vendedor_id)) vendMap.set(r.vendedor_id, { nome, total: 0 });
    vendMap.get(r.vendedor_id)!.total += r.comissao_total;
  }
  const topVendedores = [...vendMap.values()]
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
    .map((v) => ({ vendedor_nome: v.nome, total: v.total }));

  return {
    aguard_liberacao_valor:  aguard.reduce((s, r) => s + r.comissao_total, 0),
    aguard_liberacao_count:  aguard.length,
    elegiveis_valor:         elegiveis.reduce((s, r) => s + r.comissao_total, 0),
    elegiveis_count:         elegiveis.length,
    aprovadas_valor:         aprovadas.reduce((s, r) => s + r.comissao_total, 0),
    pagas_total_valor:       pagas.reduce((s, r) => s + r.comissao_total, 0),
    pagas_total_count:       pagas.length,
    competencia_aberta:      compStr,
    competencia_valor:       naComp.reduce((s, r) => s + r.comissao_total, 0),
    top_vendedores:          topVendedores,
  };
}

// ── Server Actions (chamadas de componentes client) ───────────

export async function atualizarStatusCompetenciaAction(
  id: string,
  status: StatusCompetencia,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const now = new Date().toISOString();
    const extra: Record<string, string> = {};

    if (status === "aprovada") {
      extra.data_aprovacao = now;
      if (user) extra.aprovado_por = user.id;
    } else if (status === "enviada_financeiro") {
      extra.data_envio_financeiro = now;
      if (user) extra.enviado_por = user.id;
    } else if (status === "paga") {
      extra.data_pagamento = now;
      if (user) extra.pago_por = user.id;

      const { data: comp } = await supabase
        .from("competencias_comissao")
        .select("competencia")
        .eq("id", id)
        .single();

      if (comp?.competencia) {
        await supabase
          .from("comissoes")
          .update({ status: "paga", pago_por: user?.id ?? null, data_pagamento: now, updated_at: now })
          .eq("competencia", comp.competencia)
          .in("status", ["aprovada", "elegivel", "na_competencia"]);
      }
    }

    await atualizarStatusCompetencia(id, status, extra as Parameters<typeof atualizarStatusCompetencia>[2]);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro." };
  }
}

export async function salvarRegraAction(
  payload: Parameters<typeof salvarRegra>[0],
): Promise<{ ok: boolean; data?: ComissaoRegra; error?: string }> {
  try {
    const data = await salvarRegra(payload);
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro." };
  }
}

export async function cancelarComissaoAction(
  id: string,
  motivo: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await cancelarComissao(id, motivo);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro." };
  }
}
