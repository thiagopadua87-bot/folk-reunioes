import { describe, test, expect } from "vitest";
import { _diffBomItens } from "@/lib/engenharia-comercial/bom-utils";
import type { BomItemMinimal } from "@/lib/engenharia-comercial/bom-utils";

// ── Fixture builder ───────────────────────────────────────────

function makeItem(overrides: Pick<BomItemMinimal, "itemId" | "nome"> & Partial<BomItemMinimal>): BomItemMinimal {
  const quantidade    = overrides.quantidade    ?? 1;
  const custoUnitario = overrides.custoUnitario ?? 100;
  return {
    itemId:        overrides.itemId,
    codigo:        overrides.codigo        ?? `COD-${overrides.itemId}`,
    nome:          overrides.nome,
    unidade:       overrides.unidade       ?? "un",
    quantidade,
    custoUnitario,
    custoTotal:    overrides.custoTotal    ?? quantidade * custoUnitario,
  };
}

const CAMERA  = makeItem({ itemId: "item-cam",  nome: "Câmera IP 2MP",     quantidade: 24, custoUnitario: 350,  custoTotal: 8400  });
const DVR     = makeItem({ itemId: "item-dvr",  nome: "DVR 16 canais",     quantidade: 1,  custoUnitario: 1200, custoTotal: 1200  });
const HD      = makeItem({ itemId: "item-hd",   nome: "HD 4TB",            quantidade: 3,  custoUnitario: 400,  custoTotal: 1200  });
const LEITOR  = makeItem({ itemId: "item-leit", nome: "Leitor Biométrico", quantidade: 4,  custoUnitario: 800,  custoTotal: 3200  });
const SWITCH  = makeItem({ itemId: "item-sw",   nome: "Switch 8 portas",   quantidade: 2,  custoUnitario: 250,  custoTotal: 500   });

// ── Testes _diffBomItens ──────────────────────────────────────

describe("_diffBomItens", () => {
  test("BOMs idênticos: sem adicionados, removidos ou alterados", () => {
    const bom = [CAMERA, DVR, HD];
    const result = _diffBomItens(bom, bom);
    expect(result.adicionados).toHaveLength(0);
    expect(result.removidos).toHaveLength(0);
    expect(result.alterados).toHaveLength(0);
    expect(result.iguais).toBe(3);
  });

  test("item adicionado em B mas não em A", () => {
    const bomA = [CAMERA, DVR];
    const bomB = [CAMERA, DVR, LEITOR];
    const result = _diffBomItens(bomA, bomB);
    expect(result.adicionados).toHaveLength(1);
    expect(result.adicionados[0].itemId).toBe("item-leit");
    expect(result.adicionados[0].qtdA).toBe(0);
    expect(result.adicionados[0].qtdB).toBe(4);
    expect(result.adicionados[0].deltaCusto).toBe(3200);
    expect(result.removidos).toHaveLength(0);
    expect(result.iguais).toBe(2);
  });

  test("item removido de B em relação a A", () => {
    const bomA = [CAMERA, DVR, HD];
    const bomB = [CAMERA, DVR];
    const result = _diffBomItens(bomA, bomB);
    expect(result.removidos).toHaveLength(1);
    expect(result.removidos[0].itemId).toBe("item-hd");
    expect(result.removidos[0].qtdA).toBe(3);
    expect(result.removidos[0].qtdB).toBe(0);
    expect(result.removidos[0].deltaCusto).toBe(-1200);
    expect(result.adicionados).toHaveLength(0);
    expect(result.iguais).toBe(2);
  });

  test("quantidade alterada: gera alterado com deltaCusto correto", () => {
    const cameraV2 = makeItem({ itemId: "item-cam", nome: "Câmera IP 2MP", quantidade: 32, custoUnitario: 350, custoTotal: 11200 });
    const bomA = [CAMERA];   // 24 câmeras
    const bomB = [cameraV2]; // 32 câmeras
    const result = _diffBomItens(bomA, bomB);
    expect(result.alterados).toHaveLength(1);
    expect(result.alterados[0].qtdA).toBe(24);
    expect(result.alterados[0].qtdB).toBe(32);
    expect(result.alterados[0].deltaCusto).toBe(2800); // 11200 - 8400
    expect(result.iguais).toBe(0);
  });

  test("diferença de 0.001 ou menos não gera alterado (tolerância de ponto flutuante)", () => {
    const cameraFloat = makeItem({ itemId: "item-cam", nome: "Câmera IP 2MP", quantidade: 24.0001, custoUnitario: 350, custoTotal: 8400 });
    const result = _diffBomItens([CAMERA], [cameraFloat]);
    expect(result.alterados).toHaveLength(0);
    expect(result.iguais).toBe(1);
  });

  test("BOMs completamente diferentes: todos adicionados / todos removidos", () => {
    const bomA = [CAMERA, DVR];
    const bomB = [LEITOR, SWITCH];
    const result = _diffBomItens(bomA, bomB);
    expect(result.adicionados).toHaveLength(2);
    expect(result.removidos).toHaveLength(2);
    expect(result.alterados).toHaveLength(0);
    expect(result.iguais).toBe(0);
  });

  test("BOM A vazio: todos os itens de B são adicionados", () => {
    const result = _diffBomItens([], [CAMERA, DVR, HD]);
    expect(result.adicionados).toHaveLength(3);
    expect(result.removidos).toHaveLength(0);
    expect(result.iguais).toBe(0);
  });

  test("BOM B vazio: todos os itens de A são removidos", () => {
    const result = _diffBomItens([CAMERA, DVR, HD], []);
    expect(result.adicionados).toHaveLength(0);
    expect(result.removidos).toHaveLength(3);
    expect(result.iguais).toBe(0);
  });

  test("ambos vazios: resultado vazio", () => {
    const result = _diffBomItens([], []);
    expect(result.adicionados).toHaveLength(0);
    expect(result.removidos).toHaveLength(0);
    expect(result.alterados).toHaveLength(0);
    expect(result.iguais).toBe(0);
  });

  test("adicionados e removidos são ordenados por nome", () => {
    const bomA = [SWITCH, CAMERA]; // "Switch", "Câmera"
    const bomB = [LEITOR, DVR];    // "Leitor", "DVR" — nenhum em comum
    const result = _diffBomItens(bomA, bomB);
    const nomesAdic = result.adicionados.map((i) => i.nome);
    const nomesRem  = result.removidos.map((i) => i.nome);
    expect(nomesAdic).toEqual([...nomesAdic].sort((a, b) => a.localeCompare(b)));
    expect(nomesRem).toEqual([...nomesRem].sort((a, b) => a.localeCompare(b)));
  });

  test("deltaCusto é negativo para item removido", () => {
    const result = _diffBomItens([CAMERA], []);
    expect(result.removidos[0].deltaCusto).toBeLessThan(0);
  });

  test("deltaCusto é arredondado a 2 casas decimais", () => {
    const camFloat = makeItem({ itemId: "item-cam", nome: "Câmera", quantidade: 3, custoUnitario: 100.1, custoTotal: 300.30000000000004 });
    const result = _diffBomItens([], [camFloat]);
    expect(result.adicionados[0].deltaCusto).toBe(300.3);
  });
});
