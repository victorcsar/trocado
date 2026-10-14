/** Formatos devolvidos pela API (valores em centavos, datas como texto). */

export type TipoLancamento = 'ENTRADA' | 'SAIDA' | 'GUARDAR' | 'RESGATAR';
export type FormaPagamento = 'PIX' | 'DEBITO' | 'CREDITO' | 'DINHEIRO' | 'TRANSFERENCIA' | 'BOLETO';
export type TipoCategoria = 'ENTRADA' | 'SAIDA';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  percentualGuardar: number;
}

export interface Referencia {
  id: string;
  nome: string;
  cor: string;
}

export interface Categoria extends Referencia {
  tipo: TipoCategoria;
  ativa: boolean;
}

export interface Cartao extends Referencia {
  diaFechamento: number;
  diaVencimento: number;
  ativo: boolean;
  faturaAberta: { competencia: string; vencimento: string; totalCentavos: number };
}

export interface Caixinha extends Referencia {
  metaCentavos: number | null;
  padrao: boolean;
  arquivada: boolean;
  saldoCentavos: number;
}

export interface Lancamento {
  id: string;
  tipo: TipoLancamento;
  valorCentavos: number;
  data: string;
  competencia: string;
  descricao: string;
  formaPagamento: FormaPagamento | null;
  categoria: Referencia | null;
  caixinha: Referencia | null;
  cartao: Referencia | null;
  compraId: string | null;
  parcela: number | null;
  totalParcelas: number | null;
  origemId: string | null;
}

export interface Fatura {
  cartao: Referencia;
  vencimento: string;
  totalCentavos: number;
  itens: Lancamento[];
}

export interface LancamentosDoMes {
  competencia: string;
  lancamentos: Lancamento[];
  faturas: Fatura[];
}

export interface LancamentoDetalhado {
  lancamento: Lancamento;
  compra: { totalCentavos: number; totalParcelas: number } | null;
  guardado: Lancamento | null;
}

export interface Totais {
  entrouCentavos: number;
  saiuCentavos: number;
  guardadoCentavos: number;
  resgatadoCentavos: number;
  sobrouCentavos: number;
}

export interface ResumoFatura {
  cartao: Referencia;
  vencimento: string;
  totalCentavos: number;
  quantidade: number;
}

export interface ResumoDoMes {
  competencia: string;
  totais: Totais;
  taxaDePoupanca: number | null;
  gastosPorCategoria: {
    categoria: Referencia;
    valorCentavos: number;
    mediaAnteriorCentavos: number;
    variacaoPercentual: number | null;
  }[];
  entradasPorCategoria: { categoria: Referencia; valorCentavos: number }[];
  faturas: ResumoFatura[];
  proximasFaturas: ResumoFatura[];
  parcelasFuturasCentavos: number;
}

export interface MesDaSerie extends Totais {
  competencia: string;
  taxaDePoupanca: number | null;
}

export interface MovimentoCaixinha {
  id: string;
  origem: 'LANCAMENTO' | 'TRANSFERENCIA';
  tipo: 'ENTROU' | 'SAIU';
  data: string;
  valorCentavos: number;
  descricao: string;
  lancamentoDeOrigemId: string | null;
}

/** O que o formulário envia (o backend valida tudo de novo). */
export type LancamentoEnvio =
  | {
      tipo: 'ENTRADA';
      valorCentavos: number;
      data: string;
      descricao: string;
      categoriaId: string;
      formaPagamento?: FormaPagamento;
      guardar?: { valorCentavos: number; caixinhaId?: string };
    }
  | {
      tipo: 'SAIDA';
      valorCentavos: number;
      data: string;
      descricao: string;
      categoriaId: string;
      formaPagamento: FormaPagamento;
      cartaoId?: string;
      parcelas?: number;
    }
  | { tipo: 'GUARDAR' | 'RESGATAR'; valorCentavos: number; data: string; descricao: string; caixinhaId: string };
