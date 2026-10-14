/**
 * Datas como texto, iguais às da API: 'AAAA-MM-DD' (dia) e 'AAAA-MM' (competência).
 * As contas usam ano/mês/dia numéricos, sem fuso.
 */

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export function hoje(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

export function competenciaAtual(): string {
  return hoje().slice(0, 7);
}

export function partes(competencia: string): { ano: number; mes: number } {
  const [ano, mes] = competencia.split('-').map(Number) as [number, number];
  return { ano, mes };
}

export function somarMeses(competencia: string, n: number): string {
  const { ano, mes } = partes(competencia);
  const total = ano * 12 + (mes - 1) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
}

export function diasNoMes(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

/** '2026-10' → 'outubro' */
export function nomeDoMes(competencia: string): string {
  return MESES[partes(competencia).mes - 1]!;
}

/** '2026-10' → 'out' */
export function mesCurto(competencia: string): string {
  return nomeDoMes(competencia).slice(0, 3);
}

/** '2026-10' → 'Out 2026' */
export function mesEAno(competencia: string): string {
  const nome = mesCurto(competencia);
  return `${nome[0]!.toUpperCase()}${nome.slice(1)} ${partes(competencia).ano}`;
}

/** '2026-10-14' → 'Quarta 14' */
export function rotuloDoDia(data: string): string {
  const [ano, mes, dia] = data.split('-').map(Number) as [number, number, number];
  return `${DIAS[new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay()]} ${dia}`;
}

/** '2026-11-10' → '10/11' */
export function diaEMes(data: string): string {
  return `${data.slice(8, 10)}/${data.slice(5, 7)}`;
}

export function ontem(): string {
  const [ano, mes, dia] = hoje().split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(ano, mes - 1, dia - 1)).toISOString().slice(0, 10);
}
