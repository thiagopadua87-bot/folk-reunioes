import type { EcVersao, EcVersaoStatus, AprovacaoExcecao } from "../types";

// DB row type for a versão with FK joins

export type VersaoDbRow = {
  id: string;
  proposta_id: string;
  numero: number;
  motivo_revisao: string;
  is_current: boolean;
  status: string;
  aprovacao_excecao: AprovacaoExcecao | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

// Row shape when joined with ec_propostas and ec_precificacao (used in convertToSale)
export type VersaoConvertRow = {
  proposta_id: string;
  status: string;
  ec_propostas: { pipeline_id: string; nome: string } | null;
  ec_precificacao: { valor_implantacao: number; valor_mensal: number } | null;
};

export function mapVersaoDbToDomain(row: Record<string, unknown>): EcVersao {
  return {
    id:               row.id as string,
    propostaId:       row.proposta_id as string,
    numero:           row.numero as number,
    motivoRevisao:    row.motivo_revisao as string,
    isCurrent:        row.is_current as boolean,
    status:           row.status as EcVersaoStatus,
    aprovacaoExcecao: row.aprovacao_excecao as AprovacaoExcecao | null,
    createdBy:        row.created_by as string,
    createdAt:        row.created_at as string,
    updatedAt:        row.updated_at as string,
  };
}
