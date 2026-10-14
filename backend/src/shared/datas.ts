/**
 * Datas do domínio são texto: 'AAAA-MM-DD' (dia) e 'AAAA-MM' (competência).
 * Toda conta aqui é feita com números de ano/mês/dia, sem `Date` com fuso,
 * para um lançamento nunca escorregar para o dia (ou o mês) vizinho.
 */

export const FUSO = 'America/Sao_Paulo';

const RE_DATA = /^(\d{4})-(\d{2})-(\d{2})$/;
const RE_COMPETENCIA = /^(\d{4})-(\d{2})$/;

export function ehDataValida(texto: string): boolean {
  const m = RE_DATA.exec(texto);
  if (!m) return false;
  const [ano, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return mes >= 1 && mes <= 12 && dia >= 1 && dia <= diasNoMes(ano, mes);
}

export function ehCompetenciaValida(texto: string): boolean {
  const m = RE_COMPETENCIA.exec(texto);
  return !!m && Number(m[2]) >= 1 && Number(m[2]) <= 12;
}

export function partesDaData(data: string): { ano: number; mes: number; dia: number } {
  const [ano, mes, dia] = data.split('-').map(Number) as [number, number, number];
  return { ano, mes, dia };
}

export function partesDaCompetencia(competencia: string): { ano: number; mes: number } {
  const [ano, mes] = competencia.split('-').map(Number) as [number, number];
  return { ano, mes };
}

export function diasNoMes(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

export function formatarCompetencia(ano: number, mes: number): string {
  return `${ano}-${String(mes).padStart(2, '0')}`;
}

export function formatarData(ano: number, mes: number, dia: number): string {
  return `${formatarCompetencia(ano, mes)}-${String(dia).padStart(2, '0')}`;
}

export function competenciaDaData(data: string): string {
  return data.slice(0, 7);
}

/** Soma (ou subtrai, com n negativo) meses a uma competência. */
export function somarMeses(competencia: string, n: number): string {
  const { ano, mes } = partesDaCompetencia(competencia);
  const total = ano * 12 + (mes - 1) + n;
  return formatarCompetencia(Math.floor(total / 12), (total % 12) + 1);
}

/** Lista de competências de `inicio` até `fim`, inclusive, em ordem. */
export function intervaloDeCompetencias(inicio: string, fim: string): string[] {
  const lista: string[] = [];
  for (let c = inicio; c <= fim; c = somarMeses(c, 1)) lista.push(c);
  return lista;
}

/** Dia do mês limitado ao último dia (ex.: dia 31 em fevereiro vira 28 ou 29). */
export function diaNoMes(ano: number, mes: number, dia: number): number {
  return Math.min(dia, diasNoMes(ano, mes));
}

/** Hoje no fuso do Brasil, como 'AAAA-MM-DD'. */
export function hoje(agora: Date = new Date()): string {
  // en-CA formata como AAAA-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO }).format(agora);
}
