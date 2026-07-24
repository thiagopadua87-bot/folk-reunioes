import type { CatalogoItem, TipoItem, PrecoItem } from "../types";

// DB row types

export type CatalogoItemDbRow = {
  id: string;
  tipo: string;
  categoria_id: string;
  fabricante_id: string | null;
  codigo: string;
  nome: string;
  descricao: string;
  unidade: string;
  recorrente: boolean;
  dados_especificos: Record<string, unknown> | null;
  vigencia_inicio: string | null;
  vigencia_fim: string | null;
  ativo: boolean;
};

export type PrecosRow = {
  item_id: string;
  fornecedor_id: string;
  ultimo_preco: number;
  prazo_entrega_dias: number;
  preferencial: boolean;
  // Supabase without generated types infers FK joins as arrays; explicit type corrects this.
  ec_fornecedores: { nome: string } | null;
};

// Mappers

export function mapCatalogoItemDbToDomain(row: CatalogoItemDbRow): CatalogoItem {
  return {
    id:               row.id,
    tipo:             row.tipo as TipoItem,
    categoriaId:      row.categoria_id,
    fabricanteId:     row.fabricante_id,
    codigo:           row.codigo,
    nome:             row.nome,
    descricao:        row.descricao,
    unidade:          row.unidade,
    recorrente:       row.recorrente,
    dadosEspecificos: row.dados_especificos ?? {},
    vigenciaInicio:   row.vigencia_inicio,
    vigenciaFim:      row.vigencia_fim,
    ativo:            row.ativo,
  };
}

export function mapPrecosRowToPrecoItem(row: PrecosRow): PrecoItem {
  return {
    fornecedorId:   row.fornecedor_id,
    fornecedorNome: row.ec_fornecedores?.nome ?? "",
    preco:          row.ultimo_preco,
    prazoDias:      row.prazo_entrega_dias,
    preferencial:   row.preferencial,
  };
}
