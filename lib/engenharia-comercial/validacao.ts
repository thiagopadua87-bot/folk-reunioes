/**
 * Camada de validação de pré-requisitos para cálculo de engenharia.
 * Toda regra de negócio fica aqui — componentes React apenas chamam e renderizam.
 *
 * As funções _validar* são puras e exportadas para facilitar testes unitários.
 * validarVersaoParaCalculo carrega os dados e delega para essas funções.
 */

import {
  buscarProjetoDados,
  listarNecessidades,
  listarVersaoSolucoes,
  listarPremissas,
  listarCustos,
} from "./versao-dados";

// Re-exporta tipos e funções puras para uso externo (componentes e testes)
export type {
  ValidacaoSecao,
  ValidacaoErro,
  ResultadoValidacao,
} from "./validacao-pura";

export {
  _validarEscopo,
  _validarSolucoes,
  _validarPremissas,
  _validarCustos,
  _agregarResultado,
} from "./validacao-pura";

import { _validarEscopo, _validarSolucoes, _validarPremissas, _validarCustos, _agregarResultado } from "./validacao-pura";
import type { ResultadoValidacao } from "./validacao-pura";

// ── Função principal (DB-aware) ───────────────────────────────

export async function validarVersaoParaCalculo(versaoId: string): Promise<ResultadoValidacao> {
  const [projetoDados, necessidades, versaoSolucoes, premissas, custos] = await Promise.all([
    buscarProjetoDados(versaoId),
    listarNecessidades(versaoId),
    listarVersaoSolucoes(versaoId),
    listarPremissas(versaoId),
    listarCustos(versaoId),
  ]);

  const erros = [
    ..._validarEscopo(projetoDados, necessidades),
    ..._validarSolucoes(necessidades, versaoSolucoes),
    ..._validarPremissas(premissas),
    ..._validarCustos(custos),
  ];

  return _agregarResultado(erros);
}
