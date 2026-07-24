// ============================================================
// Engenharia Comercial — Tipos de domínio
// ============================================================

// ── Catálogo ─────────────────────────────────────────────────

export type TipoItem = "produto" | "servico" | "licenca" | "assinatura";

export type FatorMultiplicacao =
  | "fixo"
  | "por_camera"
  | "por_acesso"
  | "por_portaria"
  | "por_unidade"
  | "por_ponto"
  | "por_porta"
  | "por_usuario";

export type OperadorCondicao = ">" | "<" | ">=" | "<=" | "=" | "!=";

export type AcaoRegra =
  | "adicionar_produto"
  | "substituir_produto"
  | "adicionar_quantidade"
  | "remover_produto";

export type SegmentoSolucao = "basico" | "intermediario" | "premium" | "ultra";

export interface CatalogoItem {
  id: string;
  tipo: TipoItem;
  categoriaId: string;
  fabricanteId: string | null;
  codigo: string;
  nome: string;
  descricao: string;
  unidade: string;
  recorrente: boolean;
  dadosEspecificos: Record<string, unknown>;
  vigenciaInicio: string | null;
  vigenciaFim: string | null;
  ativo: boolean;
}

export interface PrecoItem {
  fornecedorId: string;
  fornecedorNome: string;
  preco: number;
  prazoDias: number;
  preferencial: boolean;
}

export interface Kit {
  id: string;
  nome: string;
  descricao: string;
  categoria: string;
  vigenciaInicio: string;
  vigenciaFim: string | null;
  ativo: boolean;
}

export interface KitItem {
  id: string;
  kitId: string;
  itemId: string;
  quantidadeBase: number;
  fatorMultiplicacao: FatorMultiplicacao;
  observacoes: string;
  ordem: number;
}

export interface RegraComposicao {
  id: string;
  kitId: string | null;
  nome: string;
  condicaoCampo: string;
  condicaoOperador: OperadorCondicao;
  condicaoValor: number;
  acao: AcaoRegra;
  produtoId: string | null;
  produtoSubstituidoId: string | null;
  quantidade: number;
  prioridade: number;
  ativo: boolean;
}

export interface Solucao {
  id: string;
  nome: string;
  descricao: string;
  categoria: string;
  tecnologia: string;
  segmento: SegmentoSolucao;
  ativo: boolean;
}

export interface SolucaoKit {
  solucaoId: string;
  kitId: string;
  ordem: number;
}

// ── Proposta / Versão ─────────────────────────────────────────

export type EcVersaoStatus =
  | "rascunho"
  | "calculado"
  | "aguardando_aprovacao"
  | "aprovacao_concedida"
  | "aprovacao_negada"
  | "enviada"
  | "aprovada_cliente"
  | "recusada";

export interface EcProposta {
  id: string;
  pipelineId: string;
  nome: string;
  descricao: string;
  status: "rascunho" | "ativa" | "encerrada" | "cancelada";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface EcVersao {
  id: string;
  propostaId: string;
  numero: number;
  motivoRevisao: string;
  isCurrent: boolean;
  status: EcVersaoStatus;
  aprovacaoExcecao: AprovacaoExcecao | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AprovacaoExcecao {
  aprovadorId: string;
  aprovadorNome: string;
  motivo: string;
  aprovadoEm: string;
}

export interface ProjetoDados {
  versaoId: string;
  numeroUnidades: number;
  tipoCondominio: string;
  numeroPortarias: number;
  numeroAcessos: number;
  numeroElevadores: number;
  areaTotal: number;
  observacoes: string;
  dadosExtras: Record<string, unknown>;
}

export interface Necessidade {
  id: string;
  versaoId: string;
  categoria: string;
  item: string;
  quantidade: number;
  unidade: string;
  observacao: string;
  ordem: number;
}

export interface Premissa {
  id: string;
  versaoId: string;
  categoria: string;
  chave: string;
  valorNumerico: number | null;
  valorTexto: string;
  unidade: string;
  descricao: string;
  impacto: string;
  ordem: number;
}

export interface VersaoSolucao {
  versaoId: string;
  categoria: string;
  solucaoId: string;
}

export interface CustoProposta {
  id: string;
  versaoId: string;
  categoria: string;
  descricao: string;
  tipoCusto: "unico" | "mensal" | "anual";
  valor: number;
  fornecedorId: string | null;
  observacoes: string;
  ordem: number;
}

// ── Motor de Composição ───────────────────────────────────────

export interface ComposicaoContext {
  quantidade_cameras: number;
  quantidade_acessos: number;
  quantidade_portarias: number;
  quantidade_unidades: number;
  quantidade_usuarios: number;
  quantidade_pontos: number;
  quantidade_portas: number;
  hd_necessario_tb: number;
  potencia_total_w: number;
  largura_banda_mb: number;
  [key: string]: number;
}

export interface BomItemAcumulado {
  itemId: string;
  quantidade: number;
  origem: "kit" | "regra" | "manual";
  origemNome: string;
}

export interface BomItem {
  itemId: string;
  itemSnapshot: Record<string, unknown>;
  quantidade: number;
  custoUnitario: number;
  fornecedorId: string | null;
  fornecedorSnapshot: Record<string, unknown>;
  origem: "kit" | "regra" | "manual";
  origemNome: string;
  observacoes: string;
  ordem: number;
}

export interface ComposicaoInput {
  necessidades: Necessidade[];
  versaoSolucoes: VersaoSolucao[];
  solucoes: Solucao[];
  solucaoKits: SolucaoKit[];
  kits: Kit[];
  kitItens: KitItem[];
  itens: CatalogoItem[];
  regras: RegraComposicao[];
  context: ComposicaoContext;
  precos: Map<string, PrecoItem>;
}

// ── Motor de Precificação ─────────────────────────────────────

export interface EtapaCalculo {
  etapa: string;
  valor: number;
  formula?: string;
}

export interface MemorialCalculo {
  parametrosUtilizados: Record<string, number>;
  etapas: EtapaCalculo[];
  margemCalculada: number;
  margemMinima: number;
  aprovacaoNecessaria: boolean;
}

export interface PrecificacaoInput {
  itensLista: Pick<BomItem, "quantidade" | "custoUnitario">[];
  custosAdicionais: Pick<CustoProposta, "categoria" | "tipoCusto" | "valor">[];
  parametros: Record<string, number>;
}

export interface PrecificacaoResult {
  custoTotalMateriais: number;
  custoInstalacao: number;
  custoOutrosUnicos: number;
  bdiAplicado: number;
  impostosAplicados: number;
  valorImplantacao: number;
  custoMensalOperacional: number;
  custoMensalAdicional: number;
  margemAplicada: number;
  valorMensal: number;
  memorialCalculo: MemorialCalculo;
  requiresApproval: boolean;
}

// ── Comparação de versões ─────────────────────────────────────

export interface DeltaItem {
  itemId: string;
  nomeItem: string;
  quantidadeA: number;
  quantidadeB: number;
  deltaQuantidade: number;
  custoA: number;
  custoB: number;
  deltaCusto: number;
}

export interface ComparacaoVersoes {
  versaoIdA: string;
  versaoIdB: string;
  kpisA: KpiVersao;
  kpisB: KpiVersao;
  deltaImplantacao: number;
  deltaMensal: number;
  deltaMargemPct: number;
  itensAdicionados: DeltaItem[];
  itensRemovidos: DeltaItem[];
  itensAlterados: DeltaItem[];
}

export interface KpiVersao {
  versaoId: string;
  versaoNumero: number;
  valorImplantacao: number;
  valorMensal: number;
  margemPct: number;
  paybackMeses: number | null;
  roiPct: number | null;
  status: EcVersaoStatus;
}
