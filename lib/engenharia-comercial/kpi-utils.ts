export function paybackMeses(valorImplantacao: number, lucroMensal: number): number | null {
  if (lucroMensal <= 0) return null;
  return Math.round(valorImplantacao / lucroMensal);
}

export function formatPayback(meses: number | null): string {
  if (meses === null) return "—";
  if (meses >= 120) return "Acima de 10 anos";
  return `${meses} meses`;
}
