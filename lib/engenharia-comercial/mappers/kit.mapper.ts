import type { Kit, KitItem, FatorMultiplicacao } from "../types";

// DB row types (snake_case, as returned by Supabase)

export type KitDbRow = {
  id: string;
  nome: string;
  descricao: string;
  categoria: string;
  vigencia_inicio: string | null;
  vigencia_fim: string | null;
  ativo: boolean;
  ec_kit_itens?: KitItemDbRow[];
};

export type KitItemDbRow = {
  id: string;
  kit_id: string;
  item_id: string;
  quantidade_base: number;
  fator_multiplicacao: string;
  observacoes: string;
  ordem: number;
};

// Mappers

export function mapKitDbToDomain(row: KitDbRow): Kit {
  return {
    id: row.id,
    nome: row.nome,
    descricao: row.descricao,
    categoria: row.categoria,
    vigenciaInicio: row.vigencia_inicio ?? "",
    vigenciaFim: row.vigencia_fim ?? null,
    ativo: row.ativo,
  };
}

export function mapKitItemDbToDomain(ki: KitItemDbRow, kitId: string): KitItem {
  return {
    id: ki.id,
    kitId,
    itemId: ki.item_id,
    quantidadeBase: ki.quantidade_base,
    // string → union literal: safe because the DB CHECK constraint enforces valid values
    fatorMultiplicacao: ki.fator_multiplicacao as FatorMultiplicacao,
    observacoes: ki.observacoes,
    ordem: ki.ordem,
  };
}
