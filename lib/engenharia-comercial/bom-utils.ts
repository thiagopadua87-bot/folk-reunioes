/**
 * Utilitários puros para diff de BOM.
 * Sem dependências de DB — seguro para testes unitários sem Supabase.
 */

// Tipos mínimos necessários (subconjunto de BomItemView / DeltaBomItem)
export type BomItemMinimal = {
  itemId:       string;
  codigo:       string;
  nome:         string;
  unidade:      string;
  quantidade:   number;
  custoUnitario: number;
  custoTotal:   number;
};

export type DeltaBomItemResult = {
  itemId:        string;
  codigo:        string;
  nome:          string;
  unidade:       string;
  qtdA:          number;
  qtdB:          number;
  custoUnitario: number;
  deltaCusto:    number;
};

export type DiffBomResult = {
  adicionados: DeltaBomItemResult[];
  removidos:   DeltaBomItemResult[];
  alterados:   DeltaBomItemResult[];
  iguais:      number;
};

export function _diffBomItens(
  bomA: BomItemMinimal[],
  bomB: BomItemMinimal[]
): DiffBomResult {
  const mapA = new Map<string, BomItemMinimal>(bomA.map((i) => [i.itemId, i]));
  const mapB = new Map<string, BomItemMinimal>(bomB.map((i) => [i.itemId, i]));

  const adicionados: DeltaBomItemResult[] = [];
  const removidos:   DeltaBomItemResult[] = [];
  const alterados:   DeltaBomItemResult[] = [];
  let iguais = 0;

  for (const [itemId, itemB] of mapB.entries()) {
    const itemA = mapA.get(itemId);
    if (!itemA) {
      adicionados.push({
        itemId,
        codigo:        itemB.codigo,
        nome:          itemB.nome,
        unidade:       itemB.unidade,
        qtdA:          0,
        qtdB:          itemB.quantidade,
        custoUnitario: itemB.custoUnitario,
        deltaCusto:    Math.round(itemB.custoTotal * 100) / 100,
      });
    } else if (Math.abs(itemA.quantidade - itemB.quantidade) > 0.001) {
      alterados.push({
        itemId,
        codigo:        itemB.codigo,
        nome:          itemB.nome,
        unidade:       itemB.unidade,
        qtdA:          itemA.quantidade,
        qtdB:          itemB.quantidade,
        custoUnitario: itemB.custoUnitario,
        deltaCusto:    Math.round((itemB.custoTotal - itemA.custoTotal) * 100) / 100,
      });
    } else {
      iguais++;
    }
  }

  for (const [itemId, itemA] of mapA.entries()) {
    if (!mapB.has(itemId)) {
      removidos.push({
        itemId,
        codigo:        itemA.codigo,
        nome:          itemA.nome,
        unidade:       itemA.unidade,
        qtdA:          itemA.quantidade,
        qtdB:          0,
        custoUnitario: itemA.custoUnitario,
        deltaCusto:    -Math.round(itemA.custoTotal * 100) / 100,
      });
    }
  }

  return {
    adicionados: adicionados.sort((a, b) => a.nome.localeCompare(b.nome)),
    removidos:   removidos.sort((a, b) => a.nome.localeCompare(b.nome)),
    alterados:   alterados.sort((a, b) => a.nome.localeCompare(b.nome)),
    iguais,
  };
}
