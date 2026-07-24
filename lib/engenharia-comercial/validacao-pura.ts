/**
 * Regras puras de validação de pré-requisitos para cálculo de engenharia.
 * Sem dependências de DB — seguro para testes unitários sem Supabase.
 */

// Tipos mínimos (subconjunto de ProjetoDadosForm, NecessidadeRow, etc.)
export type ProjetoDadosMin = {
  tipoCondominio: string;
  numeroUnidades: number;
};

export type NecessidadeMin = {
  categoria: string;
  item:      string;
  quantidade: number;
};

export type VersaoSolucaoMin = {
  categoria: string;
};

export type PremissaMin = {
  valorNumerico: number | null;
  valorTexto:    string;
};

export type CustoMin = {
  valor: number;
};

export type ValidacaoSecao = "escopo" | "solucoes" | "premissas" | "custos";

export type ValidacaoErro = {
  secao:     ValidacaoSecao;
  gravidade: "erro" | "aviso";
  mensagem:  string;
};

export type ResultadoValidacao = {
  erros:        ValidacaoErro[];
  bloqueantes:  ValidacaoErro[];
  avisos:       ValidacaoErro[];
  podeCalcular: boolean;
};

// ── Funções puras ─────────────────────────────────────────────

export function _validarEscopo(
  projetoDados: ProjetoDadosMin | null,
  necessidades: NecessidadeMin[]
): ValidacaoErro[] {
  const erros: ValidacaoErro[] = [];

  if (!projetoDados) {
    erros.push({ secao: "escopo", gravidade: "erro", mensagem: "Dados do projeto não foram preenchidos." });
  } else if (projetoDados.tipoCondominio === "" && projetoDados.numeroUnidades === 0) {
    erros.push({ secao: "escopo", gravidade: "aviso", mensagem: "Informe pelo menos o tipo de condomínio ou o número de unidades." });
  }

  if (necessidades.length === 0) {
    erros.push({ secao: "escopo", gravidade: "erro", mensagem: "Nenhuma necessidade do cliente cadastrada." });
  } else {
    const incompletas = necessidades.filter(
      (n) => !n.categoria.trim() || !n.item.trim() || n.quantidade <= 0
    );
    if (incompletas.length > 0) {
      erros.push({
        secao:    "escopo",
        gravidade: "erro",
        mensagem: `${incompletas.length} necessidade${incompletas.length > 1 ? "s" : ""} com dados incompletos (categoria, item ou quantidade ≤ 0).`,
      });
    }
  }
  return erros;
}

export function _validarSolucoes(
  necessidades: NecessidadeMin[],
  versaoSolucoes: VersaoSolucaoMin[]
): ValidacaoErro[] {
  const erros: ValidacaoErro[] = [];

  if (necessidades.length > 0) {
    const categorias          = [...new Set(necessidades.map((n) => n.categoria.trim()).filter(Boolean))];
    const categoriasComSolucao = new Set(versaoSolucoes.map((s) => s.categoria));
    const semSolucao           = categorias.filter((c) => !categoriasComSolucao.has(c));

    if (semSolucao.length > 0) {
      const preview = semSolucao.slice(0, 3).join(", ");
      const sufixo  = semSolucao.length > 3 ? ` e mais ${semSolucao.length - 3}` : "";
      erros.push({
        secao:    "solucoes",
        gravidade: "erro",
        mensagem: `${semSolucao.length} categoria${semSolucao.length > 1 ? "s" : ""} sem solução definida: ${preview}${sufixo}.`,
      });
    }
  } else if (versaoSolucoes.length === 0) {
    erros.push({ secao: "solucoes", gravidade: "erro", mensagem: "Nenhuma solução técnica selecionada." });
  }
  return erros;
}

export function _validarPremissas(premissas: PremissaMin[]): ValidacaoErro[] {
  const erros: ValidacaoErro[] = [];

  if (premissas.length === 0) {
    erros.push({
      secao:    "premissas",
      gravidade: "erro",
      mensagem: "Nenhuma premissa de engenharia cadastrada. Use \"Carregar padrões\" ou adicione manualmente.",
    });
  } else {
    const semValor = premissas.filter((p) => p.valorNumerico === null && !p.valorTexto.trim());
    if (semValor.length > 0) {
      erros.push({
        secao:    "premissas",
        gravidade: "aviso",
        mensagem: `${semValor.length} premissa${semValor.length > 1 ? "s" : ""} sem valor definido (numérico ou texto).`,
      });
    }
  }
  return erros;
}

export function _validarCustos(custos: CustoMin[]): ValidacaoErro[] {
  const zeros = custos.filter((c) => c.valor <= 0);
  if (zeros.length === 0) return [];
  return [{
    secao:    "custos",
    gravidade: "aviso",
    mensagem: `${zeros.length} custo${zeros.length > 1 ? "s" : ""} adicional com valor zero — verifique se está correto.`,
  }];
}

export function _agregarResultado(erros: ValidacaoErro[]): ResultadoValidacao {
  const bloqueantes = erros.filter((e) => e.gravidade === "erro");
  const avisos      = erros.filter((e) => e.gravidade === "aviso");
  return { erros, bloqueantes, avisos, podeCalcular: bloqueantes.length === 0 };
}
