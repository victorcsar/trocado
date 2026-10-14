/** Valores sempre em centavos inteiros. */

/** Percentual de um valor, arredondado para o centavo mais próximo. */
export function percentualDe(valorCentavos: number, percentual: number): number {
  return Math.round((valorCentavos * percentual) / 100);
}

/**
 * Divide um total em parcelas que somam exatamente o total.
 * Os centavos que sobram da divisão vão para as primeiras parcelas,
 * como fazem as lojas: 100,00 em 3x = 33,34 + 33,33 + 33,33.
 */
export function dividirEmParcelas(totalCentavos: number, parcelas: number): number[] {
  if (!Number.isInteger(parcelas) || parcelas < 1) throw new RangeError('Número de parcelas inválido');
  const base = Math.floor(totalCentavos / parcelas);
  const resto = totalCentavos - base * parcelas;
  return Array.from({ length: parcelas }, (_, i) => base + (i < resto ? 1 : 0));
}
