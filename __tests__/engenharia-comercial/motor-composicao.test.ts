import { describe, it, expect } from "vitest";
import {
  buildComposicaoContext,
  computeComposition,
} from "../../lib/engenharia-comercial/motor-composicao";
import type {
  ComposicaoInput,
  ComposicaoContext,
  Necessidade,
  Premissa,
  ProjetoDados,
  CatalogoItem,
  Kit,
  KitItem,
  Solucao,
  RegraComposicao,
  PrecoItem,
} from "../../lib/engenharia-comercial/types";

// ── Fixtures ──────────────────────────────────────────────────

function makeProjeto(overrides: Partial<ProjetoDados> = {}): ProjetoDados {
  return {
    versaoId:        "v1",
    numeroUnidades:  120,
    tipoCondominio:  "vertical",
    numeroPortarias: 2,
    numeroAcessos:   8,
    numeroElevadores: 2,
    areaTotal:       4500,
    observacoes:     "",
    dadosExtras:     {},
    ...overrides,
  };
}

function makeNecessidade(overrides: Partial<Necessidade>): Necessidade {
  return {
    id: "n1", versaoId: "v1", categoria: "CFTV",
    item: "Câmera IP", quantidade: 32, unidade: "un",
    observacao: "", ordem: 0,
    ...overrides,
  };
}

function makePremissa(chave: string, valorNumerico?: number, valorTexto = ""): Premissa {
  return {
    id: chave, versaoId: "v1", categoria: "video",
    chave, valorNumerico: valorNumerico ?? null, valorTexto,
    unidade: "", descricao: "", impacto: "", ordem: 0,
  };
}

function makeCatalogoItem(id: string, nome: string): CatalogoItem {
  return {
    id, tipo: "produto", categoriaId: "cat1", fabricanteId: null,
    codigo: id, nome, descricao: "", unidade: "un",
    recorrente: false, dadosEspecificos: {}, vigenciaInicio: null,
    vigenciaFim: null, ativo: true,
  };
}

function makeKit(id: string, nome: string): Kit {
  return {
    id, nome, descricao: "", categoria: "CFTV",
    vigenciaInicio: "2026-01-01", vigenciaFim: null, ativo: true,
  };
}

function makeKitItem(kitId: string, itemId: string, qtd: number, fator = "fixo"): KitItem {
  return {
    id: `ki-${kitId}-${itemId}`, kitId, itemId, quantidadeBase: qtd,
    fatorMultiplicacao: fator as KitItem["fatorMultiplicacao"],
    observacoes: "", ordem: 0,
  };
}

function makeSolucao(id: string, categoria: string): Solucao {
  return {
    id, nome: `Solução ${id}`, descricao: "", categoria,
    tecnologia: "IP", segmento: "intermediario", ativo: true,
  };
}

function makePrecoMap(entries: [string, number][]): Map<string, PrecoItem> {
  return new Map(
    entries.map(([itemId, preco]) => [
      itemId,
      { fornecedorId: "f1", fornecedorNome: "Fornecedor A", preco, prazoDias: 5, preferencial: true },
    ])
  );
}

function makeBaseInput(overrides: Partial<ComposicaoInput> = {}): ComposicaoInput {
  const camera   = makeCatalogoItem("cam1", "Câmera IP 2MP");
  const nvr      = makeCatalogoItem("nvr1", "NVR 8 canais");
  const hd       = makeCatalogoItem("hd1",  "HD 2TB");
  const hdGrande = makeCatalogoItem("hd2",  "HD 4TB");

  const kit1 = makeKit("kit1", "Kit CFTV Base");
  const kitItens: KitItem[] = [
    makeKitItem("kit1", "cam1", 1,   "por_camera"),
    makeKitItem("kit1", "nvr1", 1,   "fixo"),
    makeKitItem("kit1", "hd1",  1,   "fixo"),
  ];

  const solucao1 = makeSolucao("sol1", "CFTV");

  const context: ComposicaoContext = {
    quantidade_cameras:   32,
    quantidade_acessos:   8,
    quantidade_portarias: 2,
    quantidade_unidades:  120,
    quantidade_usuarios:  0,
    quantidade_pontos:    0,
    quantidade_portas:    0,
    hd_necessario_tb:     4,
    potencia_total_w:     0,
    largura_banda_mb:     96,
  };

  return {
    necessidades:    [makeNecessidade({ categoria: "CFTV", item: "Câmera IP", quantidade: 32 })],
    versaoSolucoes:  [{ versaoId: "v1", categoria: "CFTV", solucaoId: "sol1" }],
    solucoes:        [solucao1],
    solucaoKits:     [{ solucaoId: "sol1", kitId: "kit1", ordem: 0 }],
    kits:            [kit1],
    kitItens,
    itens:           [camera, nvr, hd, hdGrande],
    regras:          [],
    context,
    precos:          makePrecoMap([["cam1", 298], ["nvr1", 650], ["hd1", 180], ["hd2", 320]]),
    ...overrides,
  };
}

// ── buildComposicaoContext ────────────────────────────────────

describe("buildComposicaoContext", () => {
  it("deriva quantidade de câmeras das necessidades", () => {
    const n = makeNecessidade({ categoria: "CFTV", item: "Câmera IP", quantidade: 32 });
    const ctx = buildComposicaoContext([n], [], makeProjeto());
    expect(ctx.quantidade_cameras).toBe(32);
  });

  it("usa numero_portarias e numero_acessos do projeto", () => {
    const ctx = buildComposicaoContext([], [], makeProjeto({ numeroPortarias: 3, numeroAcessos: 12 }));
    expect(ctx.quantidade_portarias).toBe(3);
    expect(ctx.quantidade_acessos).toBe(12);
  });

  it("acumula acessos de necessidades de controle de acesso", () => {
    const n = makeNecessidade({ categoria: "Controle de Acesso", item: "Leitor Facial", quantidade: 8 });
    const ctx = buildComposicaoContext([n], [], makeProjeto({ numeroAcessos: 0 }));
    expect(ctx.quantidade_acessos).toBe(8);
  });

  it("calcula HD necessário a partir de câmeras e premissas", () => {
    const n = makeNecessidade({ categoria: "CFTV", item: "Câmera IP", quantidade: 32 });
    const premissas = [
      makePremissa("dias_gravacao", 30),
      makePremissa("fps", 15),
      makePremissa("resolucao", undefined, "1080p"),
    ];
    const ctx = buildComposicaoContext([n], premissas, makeProjeto());
    // 32 câmeras × 3 Mbps × 86400s × 30 dias / (8 × 1024²) ≈ 29.7 TB → ceil = 30
    expect(ctx.hd_necessario_tb).toBeGreaterThan(0);
    expect(ctx.hd_necessario_tb).toBeLessThanOrEqual(35);
  });

  it("usa HD configurado explicitamente via premissa (sobrescreve derivado)", () => {
    const n = makeNecessidade({ categoria: "CFTV", item: "Câmera IP", quantidade: 32 });
    const premissas = [makePremissa("hd_necessario_tb", 20)];
    const ctx = buildComposicaoContext([n], premissas, makeProjeto());
    expect(ctx.hd_necessario_tb).toBe(20);
  });

  it("deriva largura de banda proporcional ao número de câmeras", () => {
    const n = makeNecessidade({ categoria: "CFTV", item: "Câmera IP", quantidade: 10 });
    const ctx = buildComposicaoContext([n], [makePremissa("resolucao", undefined, "1080p")], makeProjeto());
    // 10 câmeras × 3 Mbps = 30 Mbps
    expect(ctx.largura_banda_mb).toBe(30);
  });
});

// ── computeComposition ────────────────────────────────────────

describe("computeComposition", () => {
  it("expande kit com fator fixo corretamente", () => {
    const input = makeBaseInput();
    const bom = computeComposition(input);

    const nvr = bom.find((i) => i.itemId === "nvr1");
    expect(nvr).toBeDefined();
    expect(nvr!.quantidade).toBe(1);
  });

  it("multiplica item por quantidade de câmeras com fator por_camera", () => {
    const input = makeBaseInput();
    const bom = computeComposition(input);

    const cam = bom.find((i) => i.itemId === "cam1");
    expect(cam).toBeDefined();
    expect(cam!.quantidade).toBe(32); // 1 × 32 câmeras
  });

  it("retorna BOM vazio quando nenhuma solução está selecionada", () => {
    const input = makeBaseInput({ versaoSolucoes: [] });
    const bom = computeComposition(input);
    expect(bom).toHaveLength(0);
  });

  it("ignora kits inativos", () => {
    const input = makeBaseInput();
    input.kits[0] = { ...input.kits[0], ativo: false };
    const bom = computeComposition(input);
    expect(bom).toHaveLength(0);
  });

  it("aplica custo unitário do fornecedor no item", () => {
    const input = makeBaseInput();
    const bom = computeComposition(input);
    const nvr = bom.find((i) => i.itemId === "nvr1")!;
    expect(nvr.custoUnitario).toBe(650);
  });

  it("marca item sem preço com custo zero e fornecedor null", () => {
    const input = makeBaseInput({ precos: new Map() });
    const bom = computeComposition(input);
    expect(bom.every((i) => i.custoUnitario === 0 && i.fornecedorId === null)).toBe(true);
  });

  it("registra snapshot do item no BOM", () => {
    const input = makeBaseInput();
    const bom = computeComposition(input);
    const cam = bom.find((i) => i.itemId === "cam1")!;
    expect(cam.itemSnapshot.nome).toBe("Câmera IP 2MP");
    expect(cam.itemSnapshot.codigo).toBe("cam1");
  });

  // ── Regras de composição ──────────────────────────────────

  it("adiciona produto via regra quando condição é satisfeita", () => {
    const switch1 = makeCatalogoItem("switch1", "Switch 24P PoE");
    const regra: RegraComposicao = {
      id: "r1", kitId: null, nome: "Switch para > 16 câmeras",
      condicaoCampo: "quantidade_cameras", condicaoOperador: ">", condicaoValor: 16,
      acao: "adicionar_produto", produtoId: "switch1", produtoSubstituidoId: null,
      quantidade: 1, prioridade: 10, ativo: true,
    };
    const input = makeBaseInput({
      itens:  [...makeBaseInput().itens, switch1],
      regras: [regra],
      precos: makePrecoMap([["cam1", 298], ["nvr1", 650], ["hd1", 180], ["switch1", 420]]),
    });
    const bom = computeComposition(input);
    const sw = bom.find((i) => i.itemId === "switch1");
    expect(sw).toBeDefined();
    expect(sw!.quantidade).toBe(1);
    expect(sw!.origem).toBe("regra");
  });

  it("não adiciona produto quando condição não é satisfeita", () => {
    const regra: RegraComposicao = {
      id: "r1", kitId: null, nome: "Switch para > 64 câmeras",
      condicaoCampo: "quantidade_cameras", condicaoOperador: ">", condicaoValor: 64,
      acao: "adicionar_produto", produtoId: "switch1", produtoSubstituidoId: null,
      quantidade: 1, prioridade: 10, ativo: true,
    };
    const input = makeBaseInput({ regras: [regra] });
    const bom = computeComposition(input);
    expect(bom.find((i) => i.itemId === "switch1")).toBeUndefined();
  });

  it("substitui produto via regra", () => {
    const hdGrande = makeCatalogoItem("hd2", "HD 4TB");
    const regra: RegraComposicao = {
      id: "r2", kitId: null, nome: "Upgrade HD quando > 2TB necessário",
      condicaoCampo: "hd_necessario_tb", condicaoOperador: ">", condicaoValor: 2,
      acao: "substituir_produto", produtoId: "hd2", produtoSubstituidoId: "hd1",
      quantidade: 1, prioridade: 5, ativo: true,
    };
    const input = makeBaseInput({
      itens:  [...makeBaseInput().itens, hdGrande],
      regras: [regra],
      precos: makePrecoMap([["cam1", 298], ["nvr1", 650], ["hd2", 320]]),
    });
    const bom = computeComposition(input);
    expect(bom.find((i) => i.itemId === "hd1")).toBeUndefined();
    expect(bom.find((i) => i.itemId === "hd2")).toBeDefined();
  });

  it("remove produto via regra", () => {
    const regra: RegraComposicao = {
      id: "r3", kitId: null, nome: "Remove NVR se cameras = 0",
      condicaoCampo: "quantidade_cameras", condicaoOperador: "=", condicaoValor: 0,
      acao: "remover_produto", produtoId: null, produtoSubstituidoId: "nvr1",
      quantidade: 1, prioridade: 10, ativo: true,
    };
    const input = makeBaseInput({ regras: [regra] });
    // No contexto atual: 32 câmeras → condição não satisfeita
    const bom = computeComposition(input);
    expect(bom.find((i) => i.itemId === "nvr1")).toBeDefined();
  });

  it("aplica regras em ordem de prioridade crescente", () => {
    const hdGrande  = makeCatalogoItem("hd2",  "HD 4TB");
    const hdGigante = makeCatalogoItem("hd3",  "HD 8TB");
    const r1: RegraComposicao = {
      id: "r1", kitId: null, nome: "Upgrade HD para 4TB",
      condicaoCampo: "hd_necessario_tb", condicaoOperador: ">", condicaoValor: 2,
      acao: "substituir_produto", produtoId: "hd2", produtoSubstituidoId: "hd1",
      quantidade: 1, prioridade: 10, ativo: true,
    };
    const r2: RegraComposicao = {
      id: "r2", kitId: null, nome: "Upgrade HD para 8TB",
      condicaoCampo: "hd_necessario_tb", condicaoOperador: ">", condicaoValor: 3,
      acao: "substituir_produto", produtoId: "hd3", produtoSubstituidoId: "hd2",
      quantidade: 1, prioridade: 20, ativo: true,
    };
    const input = makeBaseInput({
      itens:  [...makeBaseInput().itens, hdGrande, hdGigante],
      regras: [r2, r1], // propositalmente fora de ordem
      precos: makePrecoMap([["cam1", 298], ["nvr1", 650], ["hd3", 500]]),
    });
    const bom = computeComposition(input);
    expect(bom.find((i) => i.itemId === "hd1")).toBeUndefined();
    expect(bom.find((i) => i.itemId === "hd2")).toBeUndefined();
    expect(bom.find((i) => i.itemId === "hd3")).toBeDefined();
  });

  it("ignora regras inativas", () => {
    const regra: RegraComposicao = {
      id: "r1", kitId: null, nome: "Regra inativa",
      condicaoCampo: "quantidade_cameras", condicaoOperador: ">", condicaoValor: 0,
      acao: "adicionar_produto", produtoId: "switch1", produtoSubstituidoId: null,
      quantidade: 1, prioridade: 10, ativo: false,
    };
    const input = makeBaseInput({ regras: [regra] });
    const bom = computeComposition(input);
    expect(bom.find((i) => i.itemId === "switch1")).toBeUndefined();
  });

  it("acumula quantidades quando a mesma necessidade aparece em múltiplas categorias", () => {
    const input = makeBaseInput({
      necessidades: [
        makeNecessidade({ categoria: "CFTV", item: "Câmera IP", quantidade: 20 }),
        makeNecessidade({ id: "n2", categoria: "CFTV", item: "Câmera IP PTZ", quantidade: 12 }),
      ],
    });
    const bom = computeComposition(input);
    const cam = bom.find((i) => i.itemId === "cam1");
    // 1 × 32 câmeras totais no contexto
    expect(cam!.quantidade).toBe(32);
  });

  it("retorna origem=kit para itens de kits", () => {
    const input = makeBaseInput();
    const bom = computeComposition(input);
    const cam = bom.find((i) => i.itemId === "cam1")!;
    expect(cam.origem).toBe("kit");
    expect(cam.origemNome).toBe("Kit CFTV Base");
  });
});
