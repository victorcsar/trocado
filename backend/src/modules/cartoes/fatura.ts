import {
  diaNoMes,
  formatarCompetencia,
  formatarData,
  partesDaCompetencia,
  partesDaData,
  somarMeses,
} from '../../shared/datas';

/** O que a regra da fatura precisa saber do cartão. */
export interface CicloDoCartao {
  diaFechamento: number;
  diaVencimento: number;
}

/**
 * Mês da fatura em que uma compra é paga (a competência dela).
 *
 * A fatura fecha no `diaFechamento`: compra feita antes disso entra na fatura que fecha
 * no próprio mês; compra feita no dia do fechamento ou depois entra na seguinte (é o
 * "melhor dia de compra" dos bancos). A fatura vence no mesmo mês do fechamento quando o
 * vencimento vem depois dele (fecha 3, vence 10) e no mês seguinte quando vem antes
 * (fecha 25, vence 5). Dias que não existem no mês (31 em abril) contam como o último dia.
 */
export function competenciaDaCompra(dataCompra: string, cartao: CicloDoCartao): string {
  const { ano, mes, dia } = partesDaData(dataCompra);
  const mesDaCompra = formatarCompetencia(ano, mes);
  const fechamento = diaNoMes(ano, mes, cartao.diaFechamento);
  const mesDoFechamento = dia < fechamento ? mesDaCompra : somarMeses(mesDaCompra, 1);
  return cartao.diaVencimento > cartao.diaFechamento ? mesDoFechamento : somarMeses(mesDoFechamento, 1);
}

/** Competência de cada parcela: a primeira cai na fatura da compra e as outras nos meses seguintes. */
export function competenciasDasParcelas(dataCompra: string, cartao: CicloDoCartao, parcelas: number): string[] {
  const primeira = competenciaDaCompra(dataCompra, cartao);
  return Array.from({ length: parcelas }, (_, i) => somarMeses(primeira, i));
}

/** Dia em que vence a fatura de uma competência. */
export function vencimentoDaFatura(competencia: string, cartao: CicloDoCartao): string {
  const { ano, mes } = partesDaCompetencia(competencia);
  return formatarData(ano, mes, diaNoMes(ano, mes, cartao.diaVencimento));
}
