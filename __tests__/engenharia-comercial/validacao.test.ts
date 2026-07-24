import { describe, test, expect } from "vitest";
import {
  _validarEscopo,
  _validarSolucoes,
  _validarPremissas,
  _validarCustos,
  _agregarResultado,
} from "@/lib/engenharia-comercial/validacao-pura";
import type {
  ProjetoDadosMin,
  NecessidadeMin,
  VersaoSolucaoMin,
  PremissaMin,
  CustoMin,
} from "@/lib/engenharia-comercial/validacao-pura";

// ── Fixtures ──────────────────────────────────────────────────

const pdBase: ProjetoDadosMin = {
  tipoCondominio: "vertical",
  numeroUnidades: 80,
};

const necBase: NecessidadeMin[] = [
  { categoria: "CFTV",   item: "Câmeras de segurança", quantidade: 24 },
  { categoria: "Acesso", item: "Controle de acesso",    quantidade: 4  },
];

const solBase: VersaoSolucaoMin[] = [
  { categoria: "CFTV"   },
  { categoria: "Acesso" },
];

const premBase: PremissaMin[] = [
  { valorNumerico: 15, valorTexto: ""       },
  { valorNumerico: 30, valorTexto: ""       },
];

const custoBase: CustoMin[] = [
  { valor: 500 },
];

// ── _validarEscopo ────────────────────────────────────────────

describe("_validarEscopo", () => {
  test("sem erros quando dados e necessidades estão completos", () => {
    const erros = _validarEscopo(pdBase, necBase);
    expect(erros).toHaveLength(0);
  });

  test("erro bloqueante quando projetoDados é null", () => {
    const erros = _validarEscopo(null, necBase);
    expect(erros).toHaveLength(1);
    expect(erros[0].gravidade).toBe("erro");
    expect(erros[0].secao).toBe("escopo");
    expect(erros[0].mensagem).toMatch(/Dados do projeto/);
  });

  test("aviso quando tipo e unidades são zero/vazio", () => {
    const pd: ProjetoDadosMin = { ...pdBase, tipoCondominio: "", numeroUnidades: 0 };
    const erros = _validarEscopo(pd, necBase);
    expect(erros).toHaveLength(1);
    expect(erros[0].gravidade).toBe("aviso");
  });

  test("erro bloqueante quando lista de necessidades está vazia", () => {
    const erros = _validarEscopo(pdBase, []);
    expect(erros.some((e) => e.gravidade === "erro" && e.mensagem.includes("necessidade"))).toBe(true);
  });

  test("erro bloqueante para necessidade com quantidade zero", () => {
    const nec: NecessidadeMin[] = [{ ...necBase[0], quantidade: 0 }, necBase[1]];
    const erros = _validarEscopo(pdBase, nec);
    expect(erros.some((e) => e.gravidade === "erro" && e.mensagem.includes("incompletos"))).toBe(true);
  });

  test("erro bloqueante para necessidade sem categoria", () => {
    const nec: NecessidadeMin[] = [{ ...necBase[0], categoria: "  " }, necBase[1]];
    const erros = _validarEscopo(pdBase, nec);
    expect(erros.some((e) => e.gravidade === "erro" && e.mensagem.includes("incompletos"))).toBe(true);
  });
});

// ── _validarSolucoes ──────────────────────────────────────────

describe("_validarSolucoes", () => {
  test("sem erros quando todas as categorias têm solução", () => {
    const erros = _validarSolucoes(necBase, solBase);
    expect(erros).toHaveLength(0);
  });

  test("erro bloqueante quando uma categoria está sem solução", () => {
    const sol: VersaoSolucaoMin[] = [solBase[0]]; // CFTV tem, Acesso não
    const erros = _validarSolucoes(necBase, sol);
    expect(erros).toHaveLength(1);
    expect(erros[0].gravidade).toBe("erro");
    expect(erros[0].mensagem).toContain("Acesso");
  });

  test("erro bloqueante quando todas as categorias estão sem solução", () => {
    const erros = _validarSolucoes(necBase, []);
    expect(erros).toHaveLength(1);
    expect(erros[0].gravidade).toBe("erro");
  });

  test("erro bloqueante quando necessidades e soluções são ambas vazias", () => {
    const erros = _validarSolucoes([], []);
    expect(erros).toHaveLength(1);
    expect(erros[0].gravidade).toBe("erro");
    expect(erros[0].mensagem).toMatch(/Nenhuma solução/);
  });

  test("sem erros quando necessidades é vazia mas há soluções", () => {
    const erros = _validarSolucoes([], solBase);
    expect(erros).toHaveLength(0);
  });

  test("preview de até 3 categorias sem solução na mensagem", () => {
    const nec: NecessidadeMin[] = [
      { categoria: "Cat A", item: "x", quantidade: 1 },
      { categoria: "Cat B", item: "x", quantidade: 1 },
      { categoria: "Cat C", item: "x", quantidade: 1 },
      { categoria: "Cat D", item: "x", quantidade: 1 },
    ];
    const erros = _validarSolucoes(nec, []);
    expect(erros[0].mensagem).toContain("e mais 1");
  });
});

// ── _validarPremissas ─────────────────────────────────────────

describe("_validarPremissas", () => {
  test("sem erros com premissas válidas", () => {
    const erros = _validarPremissas(premBase);
    expect(erros).toHaveLength(0);
  });

  test("erro bloqueante quando lista de premissas está vazia", () => {
    const erros = _validarPremissas([]);
    expect(erros).toHaveLength(1);
    expect(erros[0].gravidade).toBe("erro");
  });

  test("aviso quando premissa não tem valorNumerico nem valorTexto", () => {
    const prem: PremissaMin[] = [
      ...premBase,
      { valorNumerico: null, valorTexto: "  " },
    ];
    const erros = _validarPremissas(prem);
    expect(erros).toHaveLength(1);
    expect(erros[0].gravidade).toBe("aviso");
  });

  test("sem aviso quando premissa tem apenas valorTexto", () => {
    const prem: PremissaMin[] = [
      ...premBase,
      { valorNumerico: null, valorTexto: "Full HD" },
    ];
    const erros = _validarPremissas(prem);
    expect(erros).toHaveLength(0);
  });
});

// ── _validarCustos ────────────────────────────────────────────

describe("_validarCustos", () => {
  test("sem erros com custos normais", () => {
    const erros = _validarCustos(custoBase);
    expect(erros).toHaveLength(0);
  });

  test("sem erros com lista vazia (custos são opcionais)", () => {
    const erros = _validarCustos([]);
    expect(erros).toHaveLength(0);
  });

  test("aviso para custo com valor zero", () => {
    const erros = _validarCustos([{ valor: 0 }]);
    expect(erros).toHaveLength(1);
    expect(erros[0].gravidade).toBe("aviso");
  });

  test("aviso para custo com valor negativo", () => {
    const erros = _validarCustos([{ valor: -10 }]);
    expect(erros).toHaveLength(1);
    expect(erros[0].gravidade).toBe("aviso");
  });

  test("aviso menciona quantidade de custos com zero", () => {
    const erros = _validarCustos([{ valor: 0 }, { valor: 0 }]);
    expect(erros[0].mensagem).toContain("2");
  });
});

// ── _agregarResultado ─────────────────────────────────────────

describe("_agregarResultado", () => {
  test("podeCalcular = true quando não há erros", () => {
    const r = _agregarResultado([]);
    expect(r.podeCalcular).toBe(true);
    expect(r.bloqueantes).toHaveLength(0);
    expect(r.avisos).toHaveLength(0);
  });

  test("podeCalcular = false quando há erros bloqueantes", () => {
    const r = _agregarResultado([
      { secao: "escopo", gravidade: "erro", mensagem: "teste" },
    ]);
    expect(r.podeCalcular).toBe(false);
    expect(r.bloqueantes).toHaveLength(1);
  });

  test("podeCalcular = true com apenas avisos", () => {
    const r = _agregarResultado([
      { secao: "premissas", gravidade: "aviso", mensagem: "aviso" },
    ]);
    expect(r.podeCalcular).toBe(true);
    expect(r.avisos).toHaveLength(1);
    expect(r.bloqueantes).toHaveLength(0);
  });

  test("separa erros e avisos corretamente", () => {
    const r = _agregarResultado([
      { secao: "escopo",    gravidade: "erro",  mensagem: "bloqueante" },
      { secao: "premissas", gravidade: "aviso", mensagem: "aviso"      },
      { secao: "custos",    gravidade: "aviso", mensagem: "aviso 2"    },
    ]);
    expect(r.erros).toHaveLength(3);
    expect(r.bloqueantes).toHaveLength(1);
    expect(r.avisos).toHaveLength(2);
    expect(r.podeCalcular).toBe(false);
  });
});
