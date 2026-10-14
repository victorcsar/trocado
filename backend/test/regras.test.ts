import { describe, expect, it } from 'vitest';
import { ehDataValida, hoje, intervaloDeCompetencias, somarMeses } from '../src/shared/datas';
import { dividirEmParcelas, percentualDe } from '../src/shared/dinheiro';
import { competenciaDaCompra, competenciasDasParcelas, vencimentoDaFatura } from '../src/modules/cartoes/fatura';
import { calcularTotais, taxaDePoupanca } from '../src/modules/resumo/resumo.service';

describe('datas', () => {
  it('soma e subtrai meses atravessando o ano', () => {
    expect(somarMeses('2026-12', 1)).toBe('2027-01');
    expect(somarMeses('2026-01', -1)).toBe('2025-12');
    expect(somarMeses('2026-10', -12)).toBe('2025-10');
    expect(somarMeses('2026-10', 15)).toBe('2028-01');
  });

  it('lista competências de um intervalo', () => {
    expect(intervaloDeCompetencias('2026-11', '2027-02')).toEqual(['2026-11', '2026-12', '2027-01', '2027-02']);
  });

  it('valida datas de verdade, inclusive ano bissexto', () => {
    expect(ehDataValida('2028-02-29')).toBe(true);
    expect(ehDataValida('2026-02-29')).toBe(false);
    expect(ehDataValida('2026-04-31')).toBe(false);
    expect(ehDataValida('2026-4-1')).toBe(false);
  });

  it('"hoje" é o dia no Brasil, não em UTC', () => {
    // 02:00 UTC de 1º de novembro ainda é 31 de outubro em São Paulo
    expect(hoje(new Date('2026-11-01T02:00:00Z'))).toBe('2026-10-31');
  });
});

describe('dinheiro', () => {
  it('calcula percentual arredondando para o centavo', () => {
    expect(percentualDe(500_000, 20)).toBe(100_000);
    expect(percentualDe(12_345, 15)).toBe(1_852); // 1851,75 centavos
  });

  it('divide em parcelas que somam o total, com o resto nas primeiras', () => {
    expect(dividirEmParcelas(10_000, 3)).toEqual([3_334, 3_333, 3_333]);
    expect(dividirEmParcelas(10_001, 2)).toEqual([5_001, 5_000]);
    expect(dividirEmParcelas(5, 10).reduce((a, b) => a + b, 0)).toBe(5);
    expect(() => dividirEmParcelas(100, 0)).toThrow();
  });
});

describe('fatura do cartão', () => {
  const nubank = { diaFechamento: 3, diaVencimento: 10 }; // fecha e vence no mesmo mês
  const inter = { diaFechamento: 25, diaVencimento: 5 }; // vence no mês seguinte ao fechamento

  it('compra antes do fechamento cai na fatura do mês', () => {
    expect(competenciaDaCompra('2026-10-02', nubank)).toBe('2026-10');
  });

  it('compra no dia do fechamento ou depois vai para a próxima', () => {
    expect(competenciaDaCompra('2026-10-03', nubank)).toBe('2026-11');
    expect(competenciaDaCompra('2026-09-20', nubank)).toBe('2026-10');
  });

  it('vencimento antes do fechamento empurra a fatura um mês', () => {
    expect(competenciaDaCompra('2026-10-10', inter)).toBe('2026-11');
    expect(competenciaDaCompra('2026-10-25', inter)).toBe('2026-12');
  });

  it('vira o ano', () => {
    expect(competenciaDaCompra('2026-12-15', nubank)).toBe('2027-01');
  });

  it('fechamento no dia 31 usa o último dia dos meses curtos', () => {
    const fim = { diaFechamento: 31, diaVencimento: 7 };
    expect(competenciaDaCompra('2026-02-27', fim)).toBe('2026-03');
    expect(competenciaDaCompra('2026-02-28', fim)).toBe('2026-04');
  });

  it('cada parcela cai na fatura seguinte', () => {
    expect(competenciasDasParcelas('2026-10-05', nubank, 3)).toEqual(['2026-11', '2026-12', '2027-01']);
  });

  it('vencimento no dia 30 em fevereiro vira o último dia', () => {
    expect(vencimentoDaFatura('2026-02', { diaFechamento: 20, diaVencimento: 30 })).toBe('2026-02-28');
  });
});

describe('totais do mês', () => {
  it('guardar não é gasto e resgatar não é renda', () => {
    const totais = calcularTotais({ ENTRADA: 620_000, GUARDAR: 124_000, SAIDA: 387_045, RESGATAR: 10_000 });
    expect(totais.sobrouCentavos).toBe(620_000 + 10_000 - 124_000 - 387_045);
    expect(totais.entrouCentavos).toBe(620_000);
    expect(totais.saiuCentavos).toBe(387_045);
    expect(taxaDePoupanca(totais)).toBe(20);
  });

  it('sem entrada não há taxa de poupança', () => {
    expect(taxaDePoupanca(calcularTotais({ SAIDA: 1_000 }))).toBeNull();
  });
});
