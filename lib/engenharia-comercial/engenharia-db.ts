/**
 * Camada de consulta para os resultados congelados do motor de engenharia.
 * Lê SOMENTE de ec_lista_materiais e ec_precificacao — nunca escreve.
 * Toda lógica derivada (memorial, comparação) fica aqui, fora dos componentes.
 */

import { supabase } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildComposicaoContext } from "./motor-composicao";
import type { ComposicaoContext, Necessidade, Premissa, ProjetoDados } from "./types";

// ── Tipos de domínio para visualização ───────────────────────

export type BomItemView = {
  id:               string;
  versaoId:         string;
  itemId:           string;
  codigo:           string;
  nome:             string;
  unidade:          string;
  categoria:        string;
  fabricante:       string;
  quantidade:       number;
  custoUnitario:    number;
  custoTotal:       number;
  fornecedorId:     string | null;
  fornecedorNome:   string;
  prazoEntregaDias: number;
  origem:           "kit" | "regra" | "manual";
  origemNome:       string;
  ordem:            number;
};

export type EtapaView = {
  etapa:    string;
  valor:    number;
  formula?: string;
};

export type PrecificacaoView = {
  versaoId:               string;
  custoTotalMateriais:    number;
  custoInstalacao:        number;
  custoOutrosUnicos:      number;
  bdiAplicado:            number;
  impostosAplicados:      number;
  valorImplantacao:       number;
  custoMensalOperacional: number;
  custoMensalAdicional:   number;
  margemAplicada:         number;
  valorMensal:            number;
  requiresApproval:       boolean;
  calculatedAt:           string;
  etapas:                 EtapaView[];
  parametrosUtilizados:   Record<string, number>;
  margemMinima:           number;
};

export type MemorialKitItem = {
  itemId:    string;
  codigo:    string;
  nome:      string;
  unidade:   string;
  quantidade: number;
};

export type MemorialKit = {
  kitId:   string;
  kitNome: string;
  itens:   MemorialKitItem[];
};

export type MemorialCategoria = {
  categoria:   string;
  solucaoId:   string | null;
  solucaoNome: string;
  kits:        MemorialKit[];
};

export type MemorialRegra = {
  regraName: string;
  itens:     MemorialKitItem[];
};

export type MemorialPremissa = {
  chave:    string;
  valor:    string;
  unidade:  string;
  descricao: string;
};

export type MemorialEngenharia = {
  versaoId:   string;
  bom:        BomItemView[];
  categorias: MemorialCategoria[];
  regras:     MemorialRegra[];
  contexto:   ComposicaoContext;
  premissas:  MemorialPremissa[];
};

export type DeltaBomItem = {
  itemId:        string;
  codigo:        string;
  nome:          string;
  unidade:       string;
  qtdA:          number;
  qtdB:          number;
  custoUnitario: number;
  deltaCusto:    number;
};

export type ComparacaoBom = {
  versaoIdA:        string;
  versaoIdB:        string;
  adicionados:      DeltaBomItem[];
  removidos:        DeltaBomItem[];
  alterados:        DeltaBomItem[];
  iguais:           number;
  implantacaoA:     number | null;
  implantacaoB:     number | null;
  deltaImplantacao: number | null;
  mensalA:          number | null;
  mensalB:          number | null;
  deltaMensal:      number | null;
};

// ── Helpers ───────────────────────────────────────────────────

function extractSnapshot<T>(raw: unknown, key: string, fallback: T): T {
  if (raw && typeof raw === "object") {
    const val = (raw as Record<string, unknown>)[key];
    if (val !== undefined && val !== null) return val as T;
  }
  return fallback;
}

// ── Lista de Materiais (BOM) ─────────────────────────────────

export async function listarBom(versaoId: string, client?: SupabaseClient): Promise<BomItemView[]> {
  const db = client ?? supabase;
  const { data, error } = await db
    .from("ec_lista_materiais")
    .select(
      "id, versao_id, item_id, item_snapshot, quantidade, custo_unitario, fornecedor_id, fornecedor_snapshot, origem, origem_nome, ordem"
    )
    .eq("versao_id", versaoId)
    .order("ordem");

  if (error) throw new Error(error.message);

  return (data ?? []).map((r) => {
    const d  = r as Record<string, unknown>;
    const is = d.item_snapshot as Record<string, unknown> | null;
    const fs = d.fornecedor_snapshot as Record<string, unknown> | null;
    const qty  = d.quantidade as number;
    const cuUn = d.custo_unitario as number;

    return {
      id:               d.id as string,
      versaoId:         d.versao_id as string,
      itemId:           d.item_id as string,
      codigo:           extractSnapshot(is, "codigo", ""),
      nome:             extractSnapshot(is, "nome", "(item desconhecido)"),
      unidade:          extractSnapshot(is, "unidade", "un"),
      categoria:        extractSnapshot(is, "categoria", ""),
      fabricante:       extractSnapshot(is, "fabricante", ""),
      quantidade:       qty,
      custoUnitario:    cuUn,
      custoTotal:       Math.round(qty * cuUn * 100) / 100,
      fornecedorId:     d.fornecedor_id as string | null,
      fornecedorNome:   extractSnapshot(fs, "nome", ""),
      prazoEntregaDias: extractSnapshot(fs, "prazo_entrega_dias", 0),
      origem:           d.origem as "kit" | "regra" | "manual",
      origemNome:       d.origem_nome as string,
      ordem:            d.ordem as number,
    };
  });
}

// ── Precificação ──────────────────────────────────────────────

export async function buscarPrecificacao(versaoId: string, client?: SupabaseClient): Promise<PrecificacaoView | null> {
  const db = client ?? supabase;
  const { data } = await db
    .from("ec_precificacao")
    .select("*")
    .eq("versao_id", versaoId)
    .maybeSingle();

  if (!data) return null;

  const d = data as Record<string, unknown>;
  const memorial = (d.memorial_calculo ?? {}) as Record<string, unknown>;

  return {
    versaoId:               d.versao_id as string,
    custoTotalMateriais:    (d.custo_total_materiais as number)    ?? 0,
    custoInstalacao:        (d.custo_instalacao as number)         ?? 0,
    custoOutrosUnicos:      (d.custo_outros_unicos as number)      ?? 0,
    bdiAplicado:            (d.bdi_aplicado as number)             ?? 0,
    impostosAplicados:      (d.impostos_aplicados as number)       ?? 0,
    valorImplantacao:       (d.valor_implantacao as number)        ?? 0,
    custoMensalOperacional: (d.custo_mensal_operacional as number) ?? 0,
    custoMensalAdicional:   (d.custo_mensal_adicional as number)   ?? 0,
    margemAplicada:         (d.margem_aplicada as number)          ?? 0,
    valorMensal:            (d.valor_mensal as number)             ?? 0,
    requiresApproval:       (d.requires_approval as boolean)       ?? false,
    calculatedAt:           (d.calculated_at as string)            ?? "",
    etapas:                 (memorial.etapas as EtapaView[])       ?? [],
    parametrosUtilizados:   (memorial.parametrosUtilizados as Record<string, number>) ?? {},
    margemMinima:           (memorial.margemMinima as number)       ?? 20,
  };
}

// ── Memorial de Engenharia (rastreabilidade completa) ─────────

export async function buscarMemorialEngenharia(versaoId: string, client?: SupabaseClient): Promise<MemorialEngenharia> {
  const db = client ?? supabase;
  // Carrega todas as fontes em paralelo
  const [vsRes, necsRes, premRes, pdRes] = await Promise.all([
    db
      .from("ec_versao_solucoes")
      .select("categoria, solucao_id, ec_solucoes(id, nome)")
      .eq("versao_id", versaoId),
    db
      .from("ec_necessidades")
      .select("id, versao_id, categoria, item, quantidade, unidade, observacao, ordem")
      .eq("versao_id", versaoId)
      .order("ordem"),
    db
      .from("ec_premissas")
      .select("categoria, chave, valor_numerico, valor_texto, unidade, descricao, ordem")
      .eq("versao_id", versaoId)
      .order("ordem"),
    db
      .from("ec_projeto_dados")
      .select("*")
      .eq("versao_id", versaoId)
      .maybeSingle(),
  ]);

  const versaoSolucoes = vsRes.data ?? [];
  const necessidadesRows = necsRes.data ?? [];
  const premissasRows    = premRes.data ?? [];
  const pdRow            = pdRes.data as Record<string, unknown> | null;

  // Monta solucaoId → { nome } e solucaoId → { kitIds } em paralelo
  const solucaoIds = versaoSolucoes
    .map((vs) => (vs as Record<string, unknown>).solucao_id as string)
    .filter(Boolean);

  const solucaoKitsRes = solucaoIds.length > 0
    ? await db
        .from("ec_solucao_kits")
        .select("solucao_id, kit_id, ordem, ec_kits(id, nome)")
        .in("solucao_id", solucaoIds)
        .order("ordem")
    : { data: [] };

  // BOM desta versão
  const bom = await listarBom(versaoId, client);

  // Mapas auxiliares
  const solucaoNomeMap = new Map<string, string>();
  for (const vs of versaoSolucoes) {
    const d  = vs as Record<string, unknown>;
    const sol = d.ec_solucoes as Record<string, string> | null;
    if (sol) solucaoNomeMap.set(d.solucao_id as string, sol.nome);
  }

  // solucaoId → kit[]
  const solucaoKitsMap = new Map<string, { kitId: string; kitNome: string }[]>();
  for (const sk of (solucaoKitsRes.data ?? [])) {
    const d   = sk as Record<string, unknown>;
    const kit = d.ec_kits as Record<string, string> | null;
    if (!kit) continue;
    const solId  = d.solucao_id as string;
    const entry  = { kitId: kit.id, kitNome: kit.nome };
    const list   = solucaoKitsMap.get(solId) ?? [];
    list.push(entry);
    solucaoKitsMap.set(solId, list);
  }

  // BOM agrupado por origemNome (para itens de kit)
  const bomByOrigem = new Map<string, BomItemView[]>();
  for (const item of bom) {
    const list = bomByOrigem.get(item.origemNome) ?? [];
    list.push(item);
    bomByOrigem.set(item.origemNome, list);
  }

  // Contexto de composição (reutiliza função pura do motor)
  const projetoDados: ProjetoDados = pdRow
    ? {
        versaoId,
        numeroUnidades:   (pdRow.numero_unidades as number)   ?? 0,
        tipoCondominio:   (pdRow.tipo_condominio as string)   ?? "",
        numeroPortarias:  (pdRow.numero_portarias as number)  ?? 0,
        numeroAcessos:    (pdRow.numero_acessos as number)    ?? 0,
        numeroElevadores: (pdRow.numero_elevadores as number) ?? 0,
        areaTotal:        (pdRow.area_total as number)        ?? 0,
        observacoes:      (pdRow.observacoes as string)       ?? "",
        dadosExtras:      {},
      }
    : { versaoId, numeroUnidades: 0, tipoCondominio: "", numeroPortarias: 0, numeroAcessos: 0, numeroElevadores: 0, areaTotal: 0, observacoes: "", dadosExtras: {} };

  const necessidades: Necessidade[] = necessidadesRows.map((n) => {
    const d = n as Record<string, unknown>;
    return { id: d.id as string, versaoId, categoria: d.categoria as string, item: d.item as string, quantidade: d.quantidade as number, unidade: d.unidade as string, observacao: d.observacao as string, ordem: d.ordem as number };
  });

  const premissas: Premissa[] = premissasRows.map((p) => {
    const d = p as Record<string, unknown>;
    return { id: "", versaoId, categoria: (d.categoria as string | null) ?? "geral", chave: d.chave as string, valorNumerico: d.valor_numerico as number | null, valorTexto: (d.valor_texto as string | null) ?? "", unidade: (d.unidade as string | null) ?? "", descricao: (d.descricao as string | null) ?? "", impacto: "", ordem: (d.ordem as number) ?? 0 };
  });

  const contexto = buildComposicaoContext(necessidades, premissas, projetoDados);

  // Constrói categorias em ordem das necessidades
  const categoriasOrdenadas = [
    ...new Set(necessidades.map((n) => n.categoria).filter(Boolean)),
  ];

  const categoriasVS = new Map(
    versaoSolucoes.map((vs) => {
      const d = vs as Record<string, unknown>;
      return [d.categoria as string, d.solucao_id as string];
    })
  );

  const categorias: MemorialCategoria[] = categoriasOrdenadas.map((cat) => {
    const solucaoId   = categoriasVS.get(cat) ?? null;
    const solucaoNome = solucaoId ? (solucaoNomeMap.get(solucaoId) ?? "(solução desconhecida)") : "(sem solução)";
    const kitsDaSolucao = solucaoId ? (solucaoKitsMap.get(solucaoId) ?? []) : [];

    const kits: MemorialKit[] = kitsDaSolucao.map((k) => ({
      kitId:   k.kitId,
      kitNome: k.kitNome,
      itens:   (bomByOrigem.get(k.kitNome) ?? []).map((i) => ({
        itemId:     i.itemId,
        codigo:     i.codigo,
        nome:       i.nome,
        unidade:    i.unidade,
        quantidade: i.quantidade,
      })),
    }));

    return { categoria: cat, solucaoId, solucaoNome, kits };
  });

  // Itens de regras agrupados
  const bomRegras = bom.filter((i) => i.origem === "regra");
  const regraMap  = new Map<string, BomItemView[]>();
  for (const item of bomRegras) {
    const list = regraMap.get(item.origemNome) ?? [];
    list.push(item);
    regraMap.set(item.origemNome, list);
  }
  const regras: MemorialRegra[] = [...regraMap.entries()].map(([regraName, itens]) => ({
    regraName,
    itens: itens.map((i) => ({
      itemId:     i.itemId,
      codigo:     i.codigo,
      nome:       i.nome,
      unidade:    i.unidade,
      quantidade: i.quantidade,
    })),
  }));

  // Premissas para exibição
  const premissasView: MemorialPremissa[] = premissasRows.map((p) => {
    const d = p as Record<string, unknown>;
    const num  = d.valor_numerico as number | null;
    const txt  = (d.valor_texto as string) ?? "";
    const uni  = (d.unidade as string)     ?? "";
    return {
      chave:    d.chave as string,
      valor:    num !== null ? `${num}${uni ? " " + uni : ""}` : txt || "—",
      unidade:  uni,
      descricao: (d.descricao as string) ?? "",
    };
  });

  return { versaoId, bom, categorias, regras, contexto, premissas: premissasView };
}

// ── Comparação entre versões ──────────────────────────────────

import { _diffBomItens as _diffBomItensImpl } from "./bom-utils";

/** Lógica pura de diff entre dois BOMs — delega para bom-utils (testável sem Supabase). */
export function _diffBomItens(
  bomA: BomItemView[],
  bomB: BomItemView[]
): Pick<ComparacaoBom, "adicionados" | "removidos" | "alterados" | "iguais"> {
  return _diffBomItensImpl(bomA, bomB);
}

export async function compararBom(
  versaoIdA: string,
  versaoIdB: string
): Promise<ComparacaoBom> {
  const [bomA, bomB, precA, precB] = await Promise.all([
    listarBom(versaoIdA),
    listarBom(versaoIdB),
    buscarPrecificacao(versaoIdA),
    buscarPrecificacao(versaoIdB),
  ]);

  const diff = _diffBomItens(bomA, bomB);

  const implantacaoA  = precA?.valorImplantacao ?? null;
  const implantacaoB  = precB?.valorImplantacao ?? null;
  const mensalA       = precA?.valorMensal      ?? null;
  const mensalB       = precB?.valorMensal      ?? null;

  return {
    versaoIdA,
    versaoIdB,
    ...diff,
    implantacaoA,
    implantacaoB,
    deltaImplantacao: implantacaoA !== null && implantacaoB !== null ? Math.round((implantacaoB - implantacaoA) * 100) / 100 : null,
    mensalA,
    mensalB,
    deltaMensal:      mensalA !== null && mensalB !== null ? Math.round((mensalB - mensalA) * 100) / 100 : null,
  };
}
