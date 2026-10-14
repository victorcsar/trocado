import { TipoCategoria } from '@prisma/client';

/** Categorias com que toda conta nova começa. Dá pra renomear, trocar a cor ou desativar depois. */
export const CATEGORIAS_PADRAO: { nome: string; tipo: TipoCategoria; cor: string }[] = [
  { nome: 'Salário', tipo: 'ENTRADA', cor: '#9fd38b' },
  { nome: 'Freela', tipo: 'ENTRADA', cor: '#6fc4a6' },
  { nome: 'Rendimentos', tipo: 'ENTRADA', cor: '#e3c25b' },
  { nome: 'Outras entradas', tipo: 'ENTRADA', cor: '#a8a294' },

  { nome: 'Moradia', tipo: 'SAIDA', cor: '#8f9bff' },
  { nome: 'Contas da casa', tipo: 'SAIDA', cor: '#5b8fd6' },
  { nome: 'Mercado', tipo: 'SAIDA', cor: '#6fb7a8' },
  { nome: 'Restaurantes', tipo: 'SAIDA', cor: '#e46d6d' },
  { nome: 'Transporte', tipo: 'SAIDA', cor: '#7fb069' },
  { nome: 'Saúde', tipo: 'SAIDA', cor: '#5fb3d9' },
  { nome: 'Lazer', tipo: 'SAIDA', cor: '#b08bd9' },
  { nome: 'Assinaturas', tipo: 'SAIDA', cor: '#d99a5f' },
  { nome: 'Educação', tipo: 'SAIDA', cor: '#c9b458' },
  { nome: 'Compras', tipo: 'SAIDA', cor: '#d97fb0' },
  { nome: 'Outros gastos', tipo: 'SAIDA', cor: '#8a857a' },
];

export const CAIXINHA_PADRAO = { nome: 'Reserva de emergência', cor: '#d9834a' };
