/** Valores chegam da API em centavos inteiros. */

const doisDecimais = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const semDecimais = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

/** 108955 → "1.089,55" */
export function reais(centavos: number): string {
  return doisDecimais.format(centavos / 100);
}

/** 620000 → "6.200" (rótulos de gráfico) */
export function reaisInteiros(centavos: number): string {
  return semDecimais.format(centavos / 100);
}

export function percentualDe(centavos: number, percentual: number): number {
  return Math.round((centavos * percentual) / 100);
}

/** Mesma regra do backend: os centavos que sobram vão para as primeiras parcelas. */
export function dividirEmParcelas(totalCentavos: number, parcelas: number): number[] {
  const base = Math.floor(totalCentavos / parcelas);
  const resto = totalCentavos - base * parcelas;
  return Array.from({ length: parcelas }, (_, i) => base + (i < resto ? 1 : 0));
}

/** Percentual de uma parte sobre um total, para larguras de barra (0 a 100). */
export function fatia(parte: number, total: number): number {
  if (total <= 0 || parte <= 0) return 0;
  return Math.min(100, (parte / total) * 100);
}
