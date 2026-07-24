import { supabase } from "@/lib/supabase";

// ── Tipos ─────────────────────────────────────────────────────

export type ProjetoDadosForm = {
  id?: string;
  versaoId: string;
  tipoCondominio: string;
  numeroUnidades: number;
  numeroPortarias: number;
  numeroAcessos: number;
  numeroElevadores: number;
  areaTotal: number;
  observacoes: string;
};

export type NecessidadeRow = {
  id: string;
  versaoId: string;
  categoria: string;
  item: string;
  quantidade: number;
  unidade: string;
  observacao: string;
  ordem: number;
};

export type NecessidadePayload = Omit<NecessidadeRow, "id">;

export type VersaoSolucaoRow = {
  id: string;
  versaoId: string;
  categoria: string;
  solucaoId: string;
  solucaoNome: string;
  solucaoSegmento: string;
};

export type SolucaoOpcao = {
  id: string;
  nome: string;
  categoria: string;
  segmento: string;
};

export type PremissaRow = {
  id: string;
  versaoId: string;
  categoria: "video" | "rede" | "disponibilidade" | "capacidade" | "energia" | "acesso" | "geral";
  chave: string;
  valorNumerico: number | null;
  valorTexto: string;
  unidade: string;
  descricao: string;
  impacto: string;
  ordem: number;
};

export type PremissaUpsert = Omit<PremissaRow, "id"> & { id?: string };

export type CustoRow = {
  id: string;
  versaoId: string;
  categoria: string;
  descricao: string;
  tipoCusto: "unico" | "mensal" | "anual";
  valor: number;
  fornecedorId: string | null;
  observacoes: string;
  ordem: number;
};

export type CustoPayload = Omit<CustoRow, "id">;

// ── Premissas padrão ──────────────────────────────────────────

export const PREMISSAS_PADRAO: Omit<PremissaUpsert, "versaoId" | "id">[] = [
  { categoria: "video", chave: "dias_gravacao",    valorNumerico: 30,   valorTexto: "",          unidade: "dias", descricao: "Dias de armazenamento de gravação", impacto: "Determina tamanho dos HDs", ordem: 1 },
  { categoria: "video", chave: "fps",              valorNumerico: 15,   valorTexto: "",          unidade: "fps",  descricao: "Frames por segundo por câmera",     impacto: "Impacta banda e armazenamento", ordem: 2 },
  { categoria: "video", chave: "resolucao",        valorNumerico: null, valorTexto: "Full HD",   unidade: "",     descricao: "Resolução padrão das câmeras",      impacto: "Determina taxa de bitrate", ordem: 3 },
  { categoria: "video", chave: "compressao",       valorNumerico: null, valorTexto: "H.265",     unidade: "",     descricao: "Codec de compressão de vídeo",      impacto: "Reduz storage em ~50% vs H.264", ordem: 4 },
  { categoria: "rede",  chave: "disponibilidade",  valorNumerico: 99.5, valorTexto: "",          unidade: "%",    descricao: "SLA de disponibilidade da rede",    impacto: "Define redundância necessária", ordem: 5 },
  { categoria: "rede",  chave: "redundancia_link", valorNumerico: null, valorTexto: "Sim",       unidade: "",     descricao: "Link redundante contratado",        impacto: "Aumenta OPEX mensal", ordem: 6 },
  { categoria: "capacidade", chave: "fator_crescimento", valorNumerico: 20, valorTexto: "",      unidade: "%",    descricao: "Margem de crescimento futuro",      impacto: "Superprovisiona capacidade", ordem: 7 },
  { categoria: "energia", chave: "tensao_alimentacao", valorNumerico: null, valorTexto: "Bivolt", unidade: "",    descricao: "Tensão de alimentação",             impacto: "Compatibilidade equipamentos", ordem: 8 },
  { categoria: "energia", chave: "nobreak",          valorNumerico: 60, valorTexto: "",          unidade: "min",  descricao: "Autonomia do nobreak",              impacto: "Proteção contra queda de energia", ordem: 9 },
  { categoria: "acesso", chave: "nivel_controle",   valorNumerico: null, valorTexto: "Básico",   unidade: "",     descricao: "Nível de controle de acesso",       impacto: "Define tipo de controladora", ordem: 10 },
  { categoria: "geral",  chave: "garantia_anos",    valorNumerico: 1,   valorTexto: "",          unidade: "anos", descricao: "Período de garantia padrão",        impacto: "Cobre partes e mão de obra", ordem: 11 },
];

// ── Projeto dados ─────────────────────────────────────────────

export async function buscarProjetoDados(versaoId: string): Promise<ProjetoDadosForm | null> {
  const { data } = await supabase
    .from("ec_projeto_dados")
    .select("id, versao_id, tipo_condominio, numero_unidades, numero_portarias, numero_acessos, numero_elevadores, area_total, observacoes")
    .eq("versao_id", versaoId)
    .maybeSingle();
  if (!data) return null;
  const d = data as Record<string, unknown>;
  return {
    id:               d.id as string,
    versaoId:         d.versao_id as string,
    tipoCondominio:   (d.tipo_condominio as string) ?? "",
    numeroUnidades:   (d.numero_unidades as number) ?? 0,
    numeroPortarias:  (d.numero_portarias as number) ?? 0,
    numeroAcessos:    (d.numero_acessos as number) ?? 0,
    numeroElevadores: (d.numero_elevadores as number) ?? 0,
    areaTotal:        (d.area_total as number) ?? 0,
    observacoes:      (d.observacoes as string) ?? "",
  };
}

export async function salvarProjetoDados(dados: ProjetoDadosForm): Promise<void> {
  const row = {
    versao_id:         dados.versaoId,
    tipo_condominio:   dados.tipoCondominio,
    numero_unidades:   dados.numeroUnidades,
    numero_portarias:  dados.numeroPortarias,
    numero_acessos:    dados.numeroAcessos,
    numero_elevadores: dados.numeroElevadores,
    area_total:        dados.areaTotal,
    observacoes:       dados.observacoes,
  };
  const { error } = await supabase
    .from("ec_projeto_dados")
    .upsert({ ...row, ...(dados.id ? { id: dados.id } : {}) }, { onConflict: "versao_id" });
  if (error) throw new Error(error.message);
}

// ── Necessidades ──────────────────────────────────────────────

export async function listarNecessidades(versaoId: string): Promise<NecessidadeRow[]> {
  const { data, error } = await supabase
    .from("ec_necessidades")
    .select("id, versao_id, categoria, item, quantidade, unidade, observacao, ordem")
    .eq("versao_id", versaoId)
    .order("ordem")
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => {
    const d = r as Record<string, unknown>;
    return {
      id:         d.id as string,
      versaoId:   d.versao_id as string,
      categoria:  d.categoria as string,
      item:       d.item as string,
      quantidade: (d.quantidade as number) ?? 1,
      unidade:    (d.unidade as string) ?? "un",
      observacao: (d.observacao as string) ?? "",
      ordem:      (d.ordem as number) ?? 0,
    };
  });
}

export async function criarNecessidade(payload: NecessidadePayload): Promise<NecessidadeRow> {
  const { data, error } = await supabase
    .from("ec_necessidades")
    .insert({
      versao_id:  payload.versaoId,
      categoria:  payload.categoria,
      item:       payload.item,
      quantidade: payload.quantidade,
      unidade:    payload.unidade,
      observacao: payload.observacao,
      ordem:      payload.ordem,
    })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Erro ao criar necessidade");
  const d = data as Record<string, unknown>;
  return {
    id:         d.id as string,
    versaoId:   d.versao_id as string,
    categoria:  d.categoria as string,
    item:       d.item as string,
    quantidade: d.quantidade as number,
    unidade:    d.unidade as string,
    observacao: d.observacao as string,
    ordem:      d.ordem as number,
  };
}

export async function editarNecessidade(id: string, payload: Partial<Omit<NecessidadePayload, "versaoId">>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (payload.categoria  !== undefined) row.categoria  = payload.categoria;
  if (payload.item       !== undefined) row.item       = payload.item;
  if (payload.quantidade !== undefined) row.quantidade = payload.quantidade;
  if (payload.unidade    !== undefined) row.unidade    = payload.unidade;
  if (payload.observacao !== undefined) row.observacao = payload.observacao;
  if (payload.ordem      !== undefined) row.ordem      = payload.ordem;
  const { error } = await supabase.from("ec_necessidades").update(row).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function excluirNecessidade(id: string): Promise<void> {
  const { error } = await supabase.from("ec_necessidades").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Versão-Soluções ───────────────────────────────────────────

export async function listarCategoriasDasNecessidades(versaoId: string): Promise<string[]> {
  const { data } = await supabase
    .from("ec_necessidades")
    .select("categoria")
    .eq("versao_id", versaoId);
  const cats = [...new Set((data ?? []).map((r) => (r as Record<string, unknown>).categoria as string))];
  return cats.sort();
}

export async function listarSolucoesDisponiveis(categoria: string): Promise<SolucaoOpcao[]> {
  const { data, error } = await supabase
    .from("ec_solucoes")
    .select("id, nome, categoria, segmento")
    .eq("categoria", categoria)
    .eq("ativo", true)
    .order("nome");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => {
    const d = r as Record<string, unknown>;
    return { id: d.id as string, nome: d.nome as string, categoria: d.categoria as string, segmento: (d.segmento as string) ?? "" };
  });
}

/** Carrega todas as soluções ativas em uma única query, agrupadas por categoria. */
export async function listarTodasSolucoesDisponiveis(
  categorias: string[]
): Promise<Map<string, SolucaoOpcao[]>> {
  if (categorias.length === 0) return new Map();
  const { data, error } = await supabase
    .from("ec_solucoes")
    .select("id, nome, categoria, segmento")
    .in("categoria", categorias)
    .eq("ativo", true)
    .order("nome");
  if (error) throw new Error(error.message);
  const mapa = new Map<string, SolucaoOpcao[]>();
  for (const r of data ?? []) {
    const d    = r as Record<string, unknown>;
    const cat  = d.categoria as string;
    const item = { id: d.id as string, nome: d.nome as string, categoria: cat, segmento: (d.segmento as string) ?? "" };
    const list = mapa.get(cat) ?? [];
    list.push(item);
    mapa.set(cat, list);
  }
  return mapa;
}

export async function listarVersaoSolucoes(versaoId: string): Promise<VersaoSolucaoRow[]> {
  const { data, error } = await supabase
    .from("ec_versao_solucoes")
    .select("id, versao_id, categoria, solucao_id, ec_solucoes(nome, segmento)")
    .eq("versao_id", versaoId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => {
    const d   = r as Record<string, unknown>;
    const sol = d.ec_solucoes as Record<string, string> | null;
    return {
      id:              d.id as string,
      versaoId:        d.versao_id as string,
      categoria:       d.categoria as string,
      solucaoId:       d.solucao_id as string,
      solucaoNome:     sol?.nome ?? "",
      solucaoSegmento: sol?.segmento ?? "",
    };
  });
}

export async function salvarVersaoSolucao(versaoId: string, categoria: string, solucaoId: string): Promise<void> {
  const { error } = await supabase
    .from("ec_versao_solucoes")
    .upsert({ versao_id: versaoId, categoria, solucao_id: solucaoId }, { onConflict: "versao_id,categoria" });
  if (error) throw new Error(error.message);
}

export async function removerVersaoSolucao(versaoId: string, categoria: string): Promise<void> {
  const { error } = await supabase
    .from("ec_versao_solucoes")
    .delete()
    .eq("versao_id", versaoId)
    .eq("categoria", categoria);
  if (error) throw new Error(error.message);
}

// ── Premissas ─────────────────────────────────────────────────

export async function listarPremissas(versaoId: string): Promise<PremissaRow[]> {
  const { data, error } = await supabase
    .from("ec_premissas")
    .select("id, versao_id, categoria, chave, valor_numerico, valor_texto, unidade, descricao, impacto, ordem")
    .eq("versao_id", versaoId)
    .order("categoria")
    .order("ordem");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => {
    const d = r as Record<string, unknown>;
    return {
      id:            d.id as string,
      versaoId:      d.versao_id as string,
      categoria:     d.categoria as PremissaRow["categoria"],
      chave:         d.chave as string,
      valorNumerico: d.valor_numerico as number | null,
      valorTexto:    (d.valor_texto as string) ?? "",
      unidade:       (d.unidade as string) ?? "",
      descricao:     (d.descricao as string) ?? "",
      impacto:       (d.impacto as string) ?? "",
      ordem:         (d.ordem as number) ?? 0,
    };
  });
}

export async function upsertPremissa(versaoId: string, premissa: PremissaUpsert): Promise<void> {
  const row = {
    versao_id:      versaoId,
    categoria:      premissa.categoria,
    chave:          premissa.chave,
    valor_numerico: premissa.valorNumerico,
    valor_texto:    premissa.valorTexto,
    unidade:        premissa.unidade,
    descricao:      premissa.descricao,
    impacto:        premissa.impacto,
    ordem:          premissa.ordem,
    ...(premissa.id ? { id: premissa.id } : {}),
  };
  const { error } = await supabase
    .from("ec_premissas")
    .upsert(row, { onConflict: "versao_id,chave" });
  if (error) throw new Error(error.message);
}

export async function excluirPremissa(id: string): Promise<void> {
  const { error } = await supabase.from("ec_premissas").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function seedPremissasPadrao(versaoId: string): Promise<void> {
  const rows = PREMISSAS_PADRAO.map((p, i) => ({
    versao_id:      versaoId,
    categoria:      p.categoria,
    chave:          p.chave,
    valor_numerico: p.valorNumerico,
    valor_texto:    p.valorTexto,
    unidade:        p.unidade,
    descricao:      p.descricao,
    impacto:        p.impacto,
    ordem:          p.ordem ?? i + 1,
  }));
  const { error } = await supabase
    .from("ec_premissas")
    .upsert(rows, { onConflict: "versao_id,chave" });
  if (error) throw new Error(error.message);
}

// ── Custos adicionais ─────────────────────────────────────────

export async function listarCustos(versaoId: string): Promise<CustoRow[]> {
  const { data, error } = await supabase
    .from("ec_custos_proposta")
    .select("id, versao_id, categoria, descricao, tipo_custo, valor, fornecedor_id, observacoes, ordem")
    .eq("versao_id", versaoId)
    .order("ordem")
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => {
    const d = r as Record<string, unknown>;
    return {
      id:           d.id as string,
      versaoId:     d.versao_id as string,
      categoria:    d.categoria as string,
      descricao:    d.descricao as string,
      tipoCusto:    d.tipo_custo as CustoRow["tipoCusto"],
      valor:        (d.valor as number) ?? 0,
      fornecedorId: d.fornecedor_id as string | null,
      observacoes:  (d.observacoes as string) ?? "",
      ordem:        (d.ordem as number) ?? 0,
    };
  });
}

export async function criarCusto(payload: CustoPayload): Promise<CustoRow> {
  const { data, error } = await supabase
    .from("ec_custos_proposta")
    .insert({
      versao_id:    payload.versaoId,
      categoria:    payload.categoria,
      descricao:    payload.descricao,
      tipo_custo:   payload.tipoCusto,
      valor:        payload.valor,
      fornecedor_id: payload.fornecedorId ?? null,
      observacoes:  payload.observacoes,
      ordem:        payload.ordem,
    })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Erro ao criar custo");
  const d = data as Record<string, unknown>;
  return {
    id:           d.id as string,
    versaoId:     d.versao_id as string,
    categoria:    d.categoria as string,
    descricao:    d.descricao as string,
    tipoCusto:    d.tipo_custo as CustoRow["tipoCusto"],
    valor:        d.valor as number,
    fornecedorId: d.fornecedor_id as string | null,
    observacoes:  d.observacoes as string,
    ordem:        d.ordem as number,
  };
}

export async function editarCusto(id: string, payload: Partial<Omit<CustoPayload, "versaoId">>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (payload.categoria    !== undefined) row.categoria    = payload.categoria;
  if (payload.descricao    !== undefined) row.descricao    = payload.descricao;
  if (payload.tipoCusto    !== undefined) row.tipo_custo   = payload.tipoCusto;
  if (payload.valor        !== undefined) row.valor        = payload.valor;
  if (payload.fornecedorId !== undefined) row.fornecedor_id = payload.fornecedorId;
  if (payload.observacoes  !== undefined) row.observacoes  = payload.observacoes;
  const { error } = await supabase.from("ec_custos_proposta").update(row).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function excluirCusto(id: string): Promise<void> {
  const { error } = await supabase.from("ec_custos_proposta").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
