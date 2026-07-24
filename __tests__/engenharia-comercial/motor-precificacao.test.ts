import { describe, it, expect } from "vitest";
import { computePricing } from "../../lib/engenharia-comercial/motor-precificacao";
import type { PrecificacaoInput } from "../../lib/engenharia-comercial/types";

// ── Fixtures ──────────────────────────────────────────────────

const PARAMS_PADRAO: Record<string, number> = {
  bdi_percentual:                    25,
  total_impostos_percentual:         11.73,
  margem_minima_percentual:          20,
  margem_alvo_percentual:            30,
  custo_monitoramento_por_cliente:   80,
  custo_suporte_por_cliente:         35,
  custo_telefonia_por_cliente:       45,
  custo_licenca_software_por_cliente: 20,
};

function makeInput(overrides: Partial<PrecificacaoInput> = {}): PrecificacaoInput {
  return {
    itensLista: [
      { quantidade: 32, custoUnitario: 298   }, // câmeras: R$ 9.536
      { quantidade:  1, custoUnitario: 650   }, // NVR:      R$ 650
      { quantidade:  1, custoUnitario: 180   }, // HD:       R$ 180
    ],
    // custo materiais = 10.366
    custosAdicionais: [],
    parametros: { ...PARAMS_PADRAO },
    ...overrides,
  };
}

// ── computePricing ────────────────────────────────────────────

describe("computePricing", () => {
  it("calcula custo total de materiais corretamente", () => {
    const r = computePricing(makeInput());
    expect(r.custoTotalMateriais).toBe(10_366); // 32×298 + 650 + 180
  });

  it("aplica BDI sobre o custo total", () => {
    const r = computePricing(makeInput());
    const esperado = Math.round(10_366 * 1.25 * 100) / 100;
    expect(r.valorImplantacao).toBeGreaterThan(esperado * 0.99);
    expect(r.valorImplantacao).toBeLessThan(esperado * 1.15); // inclui impostos
  });

  it("inclui custo de instalação (mao_de_obra unico) no valor de implantação", () => {
    const input = makeInput({
      custosAdicionais: [
        { categoria: "mao_de_obra", tipoCusto: "unico", valor: 4_500 },
      ],
    });
    const sem = computePricing(makeInput());
    const com = computePricing(input);
    expect(com.valorImplantacao).toBeGreaterThan(sem.valorImplantacao);
    expect(com.custoInstalacao).toBe(4_500);
  });

  it("inclui outros custos únicos (frete) no valor de implantação", () => {
    const input = makeInput({
      custosAdicionais: [
        { categoria: "frete", tipoCusto: "unico", valor: 850 },
      ],
    });
    const r = computePricing(input);
    expect(r.custoOutrosUnicos).toBe(850);
    expect(r.valorImplantacao).toBeGreaterThan(computePricing(makeInput()).valorImplantacao);
  });

  it("soma custos mensais adicionais (cloud, telefonia personalizada)", () => {
    const input = makeInput({
      custosAdicionais: [
        { categoria: "cloud",    tipoCusto: "mensal", valor: 960 },
        { categoria: "telefonia",tipoCusto: "mensal", valor:  45 },
      ],
    });
    const r = computePricing(input);
    expect(r.custoMensalAdicional).toBe(1_005);
  });

  it("rateia custos anuais em 12 meses no valor mensal", () => {
    const input = makeInput({
      custosAdicionais: [
        { categoria: "garantia_estendida", tipoCusto: "anual", valor: 1_200 },
      ],
    });
    const sem = computePricing(makeInput());
    const com = computePricing(input);
    // Rateio anual: 1200 / 12 = 100/mês → valor_mensal deve aumentar
    expect(com.valorMensal).toBeGreaterThan(sem.valorMensal);
  });

  it("calcula custo mensal operacional com os 4 parâmetros fixos", () => {
    const r = computePricing(makeInput());
    // 80 + 35 + 45 + 20 = 180
    expect(r.custoMensalOperacional).toBe(180);
  });

  it("calcula valor mensal pela margem alvo de 30%", () => {
    const r = computePricing(makeInput());
    // custo mensal = 180 / (1 - 0.30) = 257.14...
    expect(r.valorMensal).toBeCloseTo(180 / 0.7, 0);
  });

  it("margem calculada é próxima da margem alvo quando não há custos extras", () => {
    const r = computePricing(makeInput());
    expect(r.margemAplicada).toBeCloseTo(30, 0);
  });

  it("não exige aprovação quando margem >= margem mínima", () => {
    const r = computePricing(makeInput());
    expect(r.requiresApproval).toBe(false);
  });

  it("exige aprovação quando margem calculada < margem mínima", () => {
    // Custo mensal muito alto força margem abaixo do mínimo
    const input = makeInput({
      custosAdicionais: Array(50).fill({ categoria: "cloud", tipoCusto: "mensal", valor: 500 }),
      parametros: {
        ...PARAMS_PADRAO,
        margem_alvo_percentual:  5, // margem alvo baixa
        margem_minima_percentual: 20,
      },
    });
    const r = computePricing(input);
    expect(r.requiresApproval).toBe(true);
    expect(r.memorialCalculo.aprovacaoNecessaria).toBe(true);
  });

  it("memorial de cálculo contém todos os parâmetros utilizados", () => {
    const r = computePricing(makeInput());
    const params = r.memorialCalculo.parametrosUtilizados;
    expect(params.bdi_percentual).toBe(25);
    expect(params.total_impostos_percentual).toBe(11.73);
    expect(params.margem_minima_percentual).toBe(20);
    expect(params.margem_alvo_percentual).toBe(30);
  });

  it("memorial de cálculo registra etapas em ordem lógica", () => {
    const r = computePricing(makeInput());
    const nomes = r.memorialCalculo.etapas.map((e) => e.etapa);
    const idxMateriais     = nomes.findIndex((n) => n.includes("materiais"));
    const idxImplantacao   = nomes.findIndex((n) => n.includes("implantação"));
    const idxValorMensal   = nomes.findIndex((n) => n.includes("Valor mensal"));
    expect(idxMateriais).toBeLessThan(idxImplantacao);
    expect(idxImplantacao).toBeLessThan(idxValorMensal);
  });

  it("memorial de cálculo registra margem calculada e margem mínima", () => {
    const r = computePricing(makeInput());
    expect(r.memorialCalculo.margemCalculada).toBeGreaterThan(0);
    expect(r.memorialCalculo.margemMinima).toBe(20);
  });

  it("usa fallback de 25% para BDI quando parâmetro não está disponível", () => {
    const r = computePricing(makeInput({ parametros: {} }));
    expect(r.bdiAplicado).toBe(25);
  });

  it("valor de implantação é zero quando lista de materiais está vazia", () => {
    const r = computePricing(makeInput({ itensLista: [] }));
    expect(r.custoTotalMateriais).toBe(0);
    expect(r.valorImplantacao).toBe(0);
  });

  it("arredonda todos os valores monetários em 2 casas decimais", () => {
    const input = makeInput({
      itensLista: [{ quantidade: 3, custoUnitario: 1.001 }],
    });
    const r = computePricing(input);
    const isRounded = (n: number) => Number.isFinite(n) && Math.abs(n - Math.round(n * 100) / 100) < 0.001;
    expect(isRounded(r.custoTotalMateriais)).toBe(true);
    expect(isRounded(r.valorImplantacao)).toBe(true);
    expect(isRounded(r.valorMensal)).toBe(true);
  });

  it("calcula corretamente com múltiplos tipos de custo simultâneos", () => {
    const input = makeInput({
      custosAdicionais: [
        { categoria: "mao_de_obra",   tipoCusto: "unico",  valor: 4_500 },
        { categoria: "frete",         tipoCusto: "unico",  valor:   850 },
        { categoria: "cloud",         tipoCusto: "mensal", valor:   960 },
        { categoria: "monitoramento", tipoCusto: "mensal", valor:    80 },
        { categoria: "treinamento",   tipoCusto: "anual",  valor: 1_200 },
      ],
    });
    const r = computePricing(input);
    expect(r.custoInstalacao).toBe(4_500);
    expect(r.custoOutrosUnicos).toBe(850);
    expect(r.custoMensalAdicional).toBe(1_040); // cloud + monitoramento
    expect(r.valorImplantacao).toBeGreaterThan(0);
    expect(r.valorMensal).toBeGreaterThan(0);
  });
});
