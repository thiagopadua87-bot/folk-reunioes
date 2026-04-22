export interface ColunaTabela {
  id: string;
  label: string;
  tipo: "text" | "date" | "moeda" | "select";
  placeholder?: string;
  opcoes?: string[];
}

export interface LinhaTabela {
  id: string;
  valores: Record<string, string>;
  salvo?: boolean;
}

export interface ChecklistItem {
  id: string;
  label: string;
  anotacao: string;
  tipo: "texto" | "tabela";
  colunas?: ColunaTabela[];
  linhas?: LinhaTabela[];
}

export interface BlocoConfig {
  nome: string;
  itens: ChecklistItem[];
}

interface ItemDef {
  label: string;
  tipo?: "texto" | "tabela";
  colunas?: ColunaTabela[];
}

const COLUNAS_VENDAS: ColunaTabela[] = [
  { id: "dataFechamento", label: "Data de fechamento", tipo: "date" },
  { id: "responsavel", label: "Responsável", tipo: "text", placeholder: "Nome do responsável" },
  { id: "cliente", label: "Cliente", tipo: "text", placeholder: "Nome do cliente" },
  { id: "valor", label: "Valor", tipo: "moeda", placeholder: "0,00" },
  { id: "servico", label: "Serviço", tipo: "text", placeholder: "Ex: Consultoria" },
  {
    id: "tipoVenda",
    label: "Tipo de venda",
    tipo: "select",
    opcoes: ["Recorrente", "Venda direta"],
  },
];

const COLUNAS_PIPELINE: ColunaTabela[] = [
  { id: "inicioLead", label: "Início do lead", tipo: "date" },
  { id: "responsavel", label: "Responsável", tipo: "text", placeholder: "Nome do responsável" },
  { id: "cliente", label: "Cliente", tipo: "text", placeholder: "Nome do cliente" },
  {
    id: "temperatura",
    label: "Temperatura",
    tipo: "select",
    opcoes: ["Fria", "Morna", "Quente"],
  },
  { id: "valorAproximado", label: "Valor aproximado", tipo: "moeda", placeholder: "0,00" },
  {
    id: "status",
    label: "Status",
    tipo: "select",
    opcoes: ["Apresentação da empresa ou proposta", "Em análise", "Assinatura de Contrato", "Fechado", "Declinado"],
  },
];

const COLUNAS_PROJETOS: ColunaTabela[] = [
  { id: "dataInicio", label: "Data de início", tipo: "date" },
  { id: "cliente", label: "Cliente", tipo: "text", placeholder: "Nome do cliente" },
  {
    id: "tipoProjeto",
    label: "Tipo de projeto",
    tipo: "select",
    opcoes: ["Portaria Remota", "Grandes Projetos", "Segurança Eletrônica"],
  },
  {
    id: "situacaoProjeto",
    label: "Situação do projeto",
    tipo: "select",
    opcoes: ["Em execução", "Entregue ao comercial"],
  },
  { id: "valorAproximado", label: "Valor aproximado", tipo: "moeda", placeholder: "0,00" },
];

const COLUNAS_OBRAS: ColunaTabela[] = [
  { id: "dataInicio", label: "Data de início", tipo: "date" },
  { id: "cliente", label: "Cliente", tipo: "text", placeholder: "Nome do cliente" },
  {
    id: "tipoObra",
    label: "Tipo de obra",
    tipo: "select",
    opcoes: ["Portaria Remota", "Grandes Projetos", "Segurança Eletrônica"],
  },
  {
    id: "situacaoObra",
    label: "Situação da obra",
    tipo: "select",
    opcoes: ["A executar", "Em execução", "Paralizada", "Finalizada"],
  },
  {
    id: "equipe",
    label: "Equipe",
    tipo: "select",
    opcoes: ["Equipe própria", "Terceiro"],
  },
  { id: "executor", label: "Executor da obra", tipo: "text", placeholder: "Nome do executor" },
  {
    id: "percentual",
    label: "Andamento",
    tipo: "select",
    opcoes: ["0%", "20%", "40%", "60%", "80%", "100%"],
  },
];

const ESTRUTURA: Record<string, ItemDef[]> = {
  Abertura: [{ label: "Boas-vindas e confirmação de presentes" }],
  Comercial: [
    { label: "Vendas no ano", tipo: "tabela", colunas: COLUNAS_VENDAS },
    { label: "Pipeline de propostas", tipo: "tabela", colunas: COLUNAS_PIPELINE },
    { label: "Bloqueios ou suporte necessário" },
  ],
  Operação: [
    { label: "Status da central 24h" },
    { label: "Chamados técnicos" },
    { label: "Reclamações ou elogios" },
    { label: "Pontos de melhoria" },
  ],
  Projetos: [
    { label: "Projetos", tipo: "tabela", colunas: COLUNAS_PROJETOS },
    { label: "Obras", tipo: "tabela", colunas: COLUNAS_OBRAS },
  ],
  Ações: [{ label: "Decisões tomadas" }, { label: "Próxima reunião" }],
};

export const BLOCK_NAMES = Object.keys(ESTRUTURA);

export function initialBlocos(): BlocoConfig[] {
  return BLOCK_NAMES.map((nome) => ({
    nome,
    itens: ESTRUTURA[nome].map((def, i) => ({
      id: `${nome}-${i}`,
      label: def.label,
      anotacao: "",
      tipo: def.tipo ?? "texto",
      ...(def.colunas ? { colunas: def.colunas, linhas: [] } : {}),
    })),
  }));
}

