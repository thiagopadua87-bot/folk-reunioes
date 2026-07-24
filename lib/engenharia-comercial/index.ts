export * from "./types";
export { buildComposicaoContext, computeComposition, generateComposition } from "./motor-composicao";
export { computePricing, generatePricing } from "./motor-precificacao";
export {
  approveException,
  calcularVersao,
  compareVersions,
  convertToSale,
  createVersion,
  rejectException,
  updateVersaoStatus,
} from "./propostas";
