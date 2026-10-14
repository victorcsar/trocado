import { diasNoMes, partes, somarMeses } from './datas';

/**
 * Prévia, no formulário, da fatura em que a compra vai cair.
 * É a mesma regra do backend (backend/src/modules/cartoes/fatura.ts, que tem os testes);
 * quem decide de verdade é a API ao gravar.
 */
export function competenciaDaCompra(data: string, cartao: { diaFechamento: number; diaVencimento: number }): string {
  const [ano, mes, dia] = data.split('-').map(Number) as [number, number, number];
  const mesDaCompra = `${ano}-${String(mes).padStart(2, '0')}`;
  const fechamento = Math.min(cartao.diaFechamento, diasNoMes(ano, mes));
  const mesDoFechamento = dia < fechamento ? mesDaCompra : somarMeses(mesDaCompra, 1);
  return cartao.diaVencimento > cartao.diaFechamento ? mesDoFechamento : somarMeses(mesDoFechamento, 1);
}

export function vencimentoDaFatura(competencia: string, diaVencimento: number): string {
  const { ano, mes } = partes(competencia);
  return `${competencia}-${String(Math.min(diaVencimento, diasNoMes(ano, mes))).padStart(2, '0')}`;
}
