import type { FormaPagamento } from '../api/tipos';

export const FORMAS: { valor: FormaPagamento; rotulo: string }[] = [
  { valor: 'PIX', rotulo: 'Pix' },
  { valor: 'DEBITO', rotulo: 'Débito' },
  { valor: 'CREDITO', rotulo: 'Crédito' },
  { valor: 'DINHEIRO', rotulo: 'Dinheiro' },
  { valor: 'BOLETO', rotulo: 'Boleto' },
  { valor: 'TRANSFERENCIA', rotulo: 'Transferência' },
];

/** Paleta das moedinhas de cor (categorias, cartões, caixinhas). */
export const CORES = ['#d9834a', '#e3c25b', '#9fd38b', '#6fb7a8', '#5fb3d9', '#5b8fd6', '#8f9bff', '#b08bd9', '#d97fb0', '#e46d6d', '#d99a5f', '#8a857a'];
