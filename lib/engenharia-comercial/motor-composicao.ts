import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  BomItem,
  BomItemAcumulado,
  CatalogoItem,
  ComposicaoContext,
  ComposicaoInput,
  FatorMultiplicacao,
  KitItem,
  Necessidade,
  OperadorCondicao,
  PrecoItem,
  Premissa,
  ProjetoDados,
  RegraComposicao,
} from "./types";
import type { KitItemDbRow, PrecosRow } from "./mappers";

// ── Resolução de vídeo → bitrate de referência (Mbps) ────────
const BITRATE_MBPS: Record<string, Record<number, number>> = {
  "720p":  { 15: 1.5, 25: 2.5 },
  "1080p": { 15: 3.0, 25: 5.0 },
  "4mp":   { 15: 5.0, 25: 7.0 },
  "4k":    { 15: 8.0, 25: 12.0 },
};

function getBitrateMbps(resolucao: string, fps: number): number {
  const res = resolucao.toLowerCase().replace(/\s/g, "");
  const fpsKey = fps <= 15 ? 15 : 25;
  return BITRATE_MBPS[res]?.[fpsKey] ?? 3.0;
}

// ── Contexto de composição ────────────────────────────────────

const KEYWORDS_CAMERA  = ["câmera", "camera", "cam", "ip"];
const KEYWORDS_ACESSO  = ["leitor", "biometria", "facial", "rfid", "acesso", "catraca"];
const KEYWORDS_USUARIO = ["usuário", "usuario", "user", "operador"];
const KEYWORDS_PONTO   = ["ponto", "tomada", "passagem"];
const KEYWORDS_PORTA   = ["porta", "fechadura", "eletroima", "eletromagn"];

function matchesKeyword(text: string, keywords: string[]): boolean {
  const t = text.toLowerCase();
  return keywords.some((k) => t.includes(k));
}

export function buildComposicaoContext(
  necessidades: Necessidade[],
  premissas: Premissa[],
  projetoDados: ProjetoDados
): ComposicaoContext {
  const pm = new Map(premissas.map((p) => [p.chave, p]));

  const ctx: ComposicaoContext = {
    quantidade_cameras:   0,
    quantidade_acessos:   projetoDados.numeroAcessos,
    quantidade_portarias: projetoDados.numeroPortarias,
    quantidade_unidades:  projetoDados.numeroUnidades,
    quantidade_usuarios:  0,
    quantidade_pontos:    0,
    quantidade_portas:    0,
    hd_necessario_tb:     0,
    potencia_total_w:     pm.get("potencia_total_w")?.valorNumerico ?? 0,
    largura_banda_mb:     pm.get("largura_banda_mb")?.valorNumerico ?? 0,
  };

  for (const n of necessidades) {
    const texto = `${n.categoria} ${n.item}`;
    if (matchesKeyword(texto, KEYWORDS_CAMERA))  ctx.quantidade_cameras  += n.quantidade;
    if (matchesKeyword(texto, KEYWORDS_ACESSO))  ctx.quantidade_acessos  += n.quantidade;
    if (matchesKeyword(texto, KEYWORDS_USUARIO)) ctx.quantidade_usuarios += n.quantidade;
    if (matchesKeyword(texto, KEYWORDS_PONTO))   ctx.quantidade_pontos   += n.quantidade;
    if (matchesKeyword(texto, KEYWORDS_PORTA))   ctx.quantidade_portas   += n.quantidade;
  }

  // Derivar armazenamento de vídeo a partir de premissas
  if (ctx.quantidade_cameras > 0) {
    const diasGravacao = pm.get("dias_gravacao")?.valorNumerico    ?? 30;
    const fps          = pm.get("fps")?.valorNumerico              ?? 15;
    const resolucao    = pm.get("resolucao")?.valorTexto           ?? "1080p";
    const cameras      = ctx.quantidade_cameras;

    const bitrate  = getBitrateMbps(resolucao, fps);
    const hdGb     = (cameras * bitrate * 86_400 * diasGravacao) / (8 * 1024);
    ctx.hd_necessario_tb = Math.ceil(hdGb / 1024);

    if (ctx.largura_banda_mb === 0) {
      ctx.largura_banda_mb = Math.ceil(cameras * bitrate);
    }
  }

  // Premissas numéricas explícitas sobrescrevem os valores derivados
  for (const p of premissas) {
    if (p.valorNumerico !== null && p.chave in ctx) {
      ctx[p.chave] = p.valorNumerico;
    }
  }

  return ctx;
}

// ── Quantidade por fator de multiplicação ────────────────────

function resolveQuantidade(
  base: number,
  fator: FatorMultiplicacao,
  ctx: ComposicaoContext
): number {
  switch (fator) {
    case "fixo":          return base;
    case "por_camera":    return base * ctx.quantidade_cameras;
    case "por_acesso":    return base * ctx.quantidade_acessos;
    case "por_portaria":  return base * ctx.quantidade_portarias;
    case "por_unidade":   return base * ctx.quantidade_unidades;
    case "por_ponto":     return base * ctx.quantidade_pontos;
    case "por_porta":     return base * ctx.quantidade_portas;
    case "por_usuario":   return base * ctx.quantidade_usuarios;
    default:              return base;
  }
}

// ── Avaliação de condição de regra ────────────────────────────

function avaliaCampoContexto(
  campo: string,
  ctx: ComposicaoContext,
  bom: Map<string, BomItemAcumulado>
): number {
  if (campo in ctx) return ctx[campo];

  // Campos calculados dinamicamente sobre o BOM atual
  if (campo === "total_itens_bom") return bom.size;
  if (campo === "custo_total_bom") {
    let total = 0;
    for (const item of bom.values()) total += item.quantidade;
    return total;
  }

  return 0;
}

function avaliaCondicao(
  valor: number,
  operador: OperadorCondicao,
  limiar: number
): boolean {
  switch (operador) {
    case ">":  return valor > limiar;
    case "<":  return valor < limiar;
    case ">=": return valor >= limiar;
    case "<=": return valor <= limiar;
    case "=":  return valor === limiar;
    case "!=": return valor !== limiar;
  }
}

// ── Aplicação de regras ───────────────────────────────────────

function aplicaRegras(
  bom: Map<string, BomItemAcumulado>,
  regras: RegraComposicao[],
  ctx: ComposicaoContext
): Map<string, BomItemAcumulado> {
  const sorted = [...regras]
    .filter((r) => r.ativo)
    .sort((a, b) => a.prioridade - b.prioridade);

  for (const regra of sorted) {
    const valorCampo = avaliaCampoContexto(regra.condicaoCampo, ctx, bom);
    if (!avaliaCondicao(valorCampo, regra.condicaoOperador, regra.condicaoValor)) {
      continue;
    }

    switch (regra.acao) {
      case "adicionar_produto": {
        if (!regra.produtoId) break;
        const existing = bom.get(regra.produtoId);
        if (existing) {
          bom.set(regra.produtoId, { ...existing, quantidade: existing.quantidade + regra.quantidade });
        } else {
          bom.set(regra.produtoId, {
            itemId: regra.produtoId,
            quantidade: regra.quantidade,
            origem: "regra",
            origemNome: regra.nome,
          });
        }
        break;
      }

      case "adicionar_quantidade": {
        if (!regra.produtoId) break;
        const existing = bom.get(regra.produtoId);
        if (existing) {
          bom.set(regra.produtoId, { ...existing, quantidade: existing.quantidade + regra.quantidade });
        }
        break;
      }

      case "substituir_produto": {
        if (!regra.produtoId || !regra.produtoSubstituidoId) break;
        const original = bom.get(regra.produtoSubstituidoId);
        if (original) {
          const qtd = original.quantidade;
          bom.delete(regra.produtoSubstituidoId);
          bom.set(regra.produtoId, {
            itemId: regra.produtoId,
            quantidade: qtd,
            origem: "regra",
            origemNome: regra.nome,
          });
        }
        break;
      }

      case "remover_produto": {
        if (regra.produtoSubstituidoId) bom.delete(regra.produtoSubstituidoId);
        if (regra.produtoId)            bom.delete(regra.produtoId);
        break;
      }
    }
  }

  return bom;
}

// ── Função pura principal ─────────────────────────────────────

export function computeComposition(input: ComposicaoInput): BomItem[] {
  const {
    necessidades,
    versaoSolucoes,
    solucoes,
    solucaoKits,
    kits,
    kitItens,
    itens,
    regras,
    context: ctx,
    precos,
  } = input;

  // Lookup maps
  const solucaoMap  = new Map(solucoes.map((s) => [s.id, s]));
  const kitMap      = new Map(kits.map((k) => [k.id, k]));
  const itemMap     = new Map(itens.map((i) => [i.id, i]));
  const solucaoKitsMap = new Map<string, SolucaoKit[]>();
  for (const sk of solucaoKits) {
    const list = solucaoKitsMap.get(sk.solucaoId) ?? [];
    list.push(sk);
    solucaoKitsMap.set(sk.solucaoId, list);
  }
  const kitItensMap = new Map<string, KitItem[]>();
  for (const ki of kitItens) {
    const list = kitItensMap.get(ki.kitId) ?? [];
    list.push(ki);
    kitItensMap.set(ki.kitId, list);
  }

  // Mapa categoria → solucaoId escolhida
  const solucaoEscolhida = new Map(
    versaoSolucoes.map((vs) => [vs.categoria, vs.solucaoId])
  );

  // Acumulador do BOM: itemId → { quantidade, origem, origemNome }
  const bom = new Map<string, BomItemAcumulado>();

  // Expandir categorias → soluções → kits → itens (uma vez por categoria)
  const categoriasProcessadas = new Set<string>();
  for (const necessidade of necessidades) {
    const { categoria } = necessidade;
    if (categoriasProcessadas.has(categoria)) continue;
    categoriasProcessadas.add(categoria);

    const solucaoId = solucaoEscolhida.get(categoria);
    if (!solucaoId) continue;

    const solucao = solucaoMap.get(solucaoId);
    if (!solucao?.ativo) continue;

    const kitsOrdenados = (solucaoKitsMap.get(solucaoId) ?? []).sort(
      (a, b) => a.ordem - b.ordem
    );

    for (const sk of kitsOrdenados) {
      const kit = kitMap.get(sk.kitId);
      if (!kit?.ativo) continue;

      const itensDoProduto = (kitItensMap.get(kit.id) ?? []).sort(
        (a, b) => a.ordem - b.ordem
      );

      for (const ki of itensDoProduto) {
        const qty = resolveQuantidade(ki.quantidadeBase, ki.fatorMultiplicacao, ctx);
        if (qty <= 0) continue;

        const existing = bom.get(ki.itemId);
        if (existing) {
          bom.set(ki.itemId, { ...existing, quantidade: existing.quantidade + qty });
        } else {
          bom.set(ki.itemId, {
            itemId: ki.itemId,
            quantidade: qty,
            origem: "kit",
            origemNome: kit.nome,
          });
        }
      }
    }
  }

  // Aplicar regras de composição
  aplicaRegras(bom, regras, ctx);

  // Converter acumulador em BomItem[] com snapshots e preços
  const resultado: BomItem[] = [];
  let ordem = 0;

  for (const [itemId, acum] of bom.entries()) {
    const item = itemMap.get(itemId);
    const preco = precos.get(itemId);

    const itemSnapshot: Record<string, unknown> = item
      ? {
          nome:       item.nome,
          codigo:     item.codigo,
          tipo:       item.tipo,
          unidade:    item.unidade,
          categoria:  item.categoriaId,
          fabricante: item.fabricanteId ?? "",
        }
      : { nome: `Item desconhecido (${itemId})` };

    const fornecedorSnapshot: Record<string, unknown> = preco
      ? {
          nome:               preco.fornecedorNome,
          preco_unitario:     preco.preco,
          prazo_entrega_dias: preco.prazoDias,
          preferencial:       preco.preferencial,
        }
      : {};

    resultado.push({
      itemId,
      itemSnapshot,
      quantidade:         Math.round(acum.quantidade * 1000) / 1000,
      custoUnitario:      preco?.preco ?? 0,
      fornecedorId:       preco?.fornecedorId ?? null,
      fornecedorSnapshot,
      origem:             acum.origem,
      origemNome:         acum.origemNome,
      observacoes:        "",
      ordem:              ordem++,
    });
  }

  return resultado;
}

// ── Tipos auxiliares internos ─────────────────────────────────

interface SolucaoKit {
  solucaoId: string;
  kitId: string;
  ordem: number;
}

// ── Orquestrador com banco de dados ──────────────────────────

export async function generateComposition(
  versaoId: string,
  client: SupabaseClient
): Promise<BomItem[]> {
  // Carrega todos os dados necessários em paralelo
  const [
    { data: versaoSolucoes },
    { data: necessidadesRows },
    { data: premissasRows },
    { data: projetoDadosRow },
  ] = await Promise.all([
    client.from("ec_versao_solucoes").select("*").eq("versao_id", versaoId),
    client.from("ec_necessidades").select("*").eq("versao_id", versaoId).order("ordem"),
    client.from("ec_premissas").select("*").eq("versao_id", versaoId),
    client.from("ec_projeto_dados").select("*").eq("versao_id", versaoId).maybeSingle(),
  ]);

  const categorias = (versaoSolucoes ?? []).map((vs) => vs.categoria);

  // Carrega dados do motor filtrados pelas categorias relevantes
  const [
    { data: solucoesRows },
    { data: kitRows },
    { data: todosItens },
    { data: todasRegras },
  ] = await Promise.all([
    client.from("ec_solucoes").select("*").eq("ativo", true).in("categoria", categorias),
    client.from("ec_kits").select("*, ec_kit_itens(*)").eq("ativo", true),
    client.from("ec_catalogo_itens").select("*").eq("ativo", true),
    client.from("ec_regras_composicao").select("*").eq("ativo", true).order("prioridade"),
  ]);

  const solucaoIds = (solucoesRows ?? []).map((s) => s.id);
  const { data: solucaoKitsRows } = await client
    .from("ec_solucao_kits")
    .select("*")
    .in("solucao_id", solucaoIds);

  // Carrega preços (fornecedor preferencial ou menor preço)
  const itemIds = (todosItens ?? []).map((i) => i.id);
  const { data: precosRaw } = await client
    .from("ec_produto_fornecedor")
    .select("item_id, fornecedor_id, ultimo_preco, prazo_entrega_dias, preferencial, ec_fornecedores(nome)")
    .in("item_id", itemIds)
    .eq("ativo", true);
  // Supabase retorna any sem tipos gerados; cast direto de any → tipo concreto é seguro.
  const precosRows = precosRaw as PrecosRow[] | null;

  // Constrói mapa de preços (preferencial ou menor)
  const precosMap = new Map<string, PrecoItem>();
  for (const row of (precosRows ?? [])) {
    const existing = precosMap.get(row.item_id);
    const candidato: PrecoItem = {
      fornecedorId:  row.fornecedor_id,
      fornecedorNome: row.ec_fornecedores?.nome ?? "",
      preco:          row.ultimo_preco,
      prazoDias:      row.prazo_entrega_dias,
      preferencial:   row.preferencial,
    };
    if (!existing || row.preferencial || candidato.preco < existing.preco) {
      precosMap.set(row.item_id, candidato);
    }
  }

  // Mapeia linhas do banco para tipos de domínio
  const projetoDados: ProjetoDados = projetoDadosRow
    ? {
        versaoId:         projetoDadosRow.versao_id,
        numeroUnidades:   projetoDadosRow.numero_unidades,
        tipoCondominio:   projetoDadosRow.tipo_condominio,
        numeroPortarias:  projetoDadosRow.numero_portarias,
        numeroAcessos:    projetoDadosRow.numero_acessos,
        numeroElevadores: projetoDadosRow.numero_elevadores,
        areaTotal:        projetoDadosRow.area_total,
        observacoes:      projetoDadosRow.observacoes,
        dadosExtras:      projetoDadosRow.dados_extras ?? {},
      }
    : {
        versaoId, numeroUnidades: 0, tipoCondominio: "",
        numeroPortarias: 0, numeroAcessos: 0, numeroElevadores: 0,
        areaTotal: 0, observacoes: "", dadosExtras: {},
      };

  const necessidades = (necessidadesRows ?? []).map((n) => ({
    id: n.id, versaoId: n.versao_id, categoria: n.categoria,
    item: n.item, quantidade: n.quantidade, unidade: n.unidade,
    observacao: n.observacao, ordem: n.ordem,
  }));

  const premissas = (premissasRows ?? []).map((p) => ({
    id: p.id, versaoId: p.versao_id, categoria: p.categoria, chave: p.chave,
    valorNumerico: p.valor_numerico, valorTexto: p.valor_texto,
    unidade: p.unidade, descricao: p.descricao, impacto: p.impacto, ordem: p.ordem,
  }));

  const context = buildComposicaoContext(necessidades, premissas, projetoDados);

  const bom = computeComposition({
    necessidades,
    versaoSolucoes: (versaoSolucoes ?? []).map((vs) => ({
      versaoId: vs.versao_id, categoria: vs.categoria, solucaoId: vs.solucao_id,
    })),
    solucoes: (solucoesRows ?? []).map((s) => ({
      id: s.id, nome: s.nome, descricao: s.descricao, categoria: s.categoria,
      tecnologia: s.tecnologia, segmento: s.segmento, ativo: s.ativo,
    })),
    solucaoKits: (solucaoKitsRows ?? []).map((sk) => ({
      solucaoId: sk.solucao_id, kitId: sk.kit_id, ordem: sk.ordem,
    })),
    kits: (kitRows ?? []).map((k) => ({
      id: k.id, nome: k.nome, descricao: k.descricao, categoria: k.categoria,
      vigenciaInicio: k.vigencia_inicio, vigenciaFim: k.vigencia_fim, ativo: k.ativo,
    })),
    kitItens: (kitRows ?? []).flatMap((k) => {
      return ((k.ec_kit_itens ?? []) as KitItemDbRow[]).map((ki) => ({
        id: ki.id,
        kitId: k.id,
        itemId: ki.item_id,
        quantidadeBase: ki.quantidade_base,
        // string → union literal: restrita mas segura pois o DB enforça o CHECK constraint
        fatorMultiplicacao: ki.fator_multiplicacao as FatorMultiplicacao,
        observacoes: ki.observacoes,
        ordem: ki.ordem,
      }));
    }),
    itens: (todosItens ?? []).map((i) => ({
      id: i.id, tipo: i.tipo, categoriaId: i.categoria_id, fabricanteId: i.fabricante_id,
      codigo: i.codigo, nome: i.nome, descricao: i.descricao, unidade: i.unidade,
      recorrente: i.recorrente, dadosEspecificos: i.dados_especificos ?? {},
      vigenciaInicio: i.vigencia_inicio, vigenciaFim: i.vigencia_fim, ativo: i.ativo,
    })),
    regras: (todasRegras ?? []).map((r) => ({
      id: r.id, kitId: r.kit_id, nome: r.nome, condicaoCampo: r.condicao_campo,
      condicaoOperador: r.condicao_operador as OperadorCondicao,
      condicaoValor: r.condicao_valor, acao: r.acao,
      produtoId: r.produto_id, produtoSubstituidoId: r.produto_substituido_id,
      quantidade: r.quantidade, prioridade: r.prioridade, ativo: r.ativo,
    })),
    context,
    precos: precosMap,
  });

  // Persiste lista de materiais (substitui totalmente)
  await client.from("ec_lista_materiais").delete().eq("versao_id", versaoId);

  if (bom.length > 0) {
    await client.from("ec_lista_materiais").insert(
      bom.map((item) => ({
        versao_id:           versaoId,
        item_id:             item.itemId,
        item_snapshot:       item.itemSnapshot,
        quantidade:          item.quantidade,
        custo_unitario:      item.custoUnitario,
        fornecedor_id:       item.fornecedorId,
        fornecedor_snapshot: item.fornecedorSnapshot,
        origem:              item.origem,
        origem_nome:         item.origemNome,
        observacoes:         item.observacoes,
        ordem:               item.ordem,
      }))
    );
  }

  return bom;
}
