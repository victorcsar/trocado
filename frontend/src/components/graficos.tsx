import { useEffect, useRef, useState } from 'react';
import type { MesDaSerie, Totais } from '../api/tipos';
import { mesCurto, nomeDoMes } from '../lib/datas';
import { fatia, reaisInteiros } from '../lib/dinheiro';
import { cx } from './ui';

/** Número que conta até o valor quando aparece ou muda (o "sobrou" da tela do mês). */
export function useContagem(alvo: number, duracao = 900) {
  const [valor, setValor] = useState(() => (matchMedia('(prefers-reduced-motion: reduce)').matches ? alvo : 0));
  const anterior = useRef(0);

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValor(alvo);
      anterior.current = alvo;
      return;
    }
    const de = anterior.current;
    const inicio = performance.now();
    let quadro = 0;
    const passo = (agora: number) => {
      const p = Math.min(1, (agora - inicio) / duracao);
      setValor(Math.round(de + (alvo - de) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) quadro = requestAnimationFrame(passo);
      else anterior.current = alvo;
    };
    quadro = requestAnimationFrame(passo);
    return () => {
      cancelAnimationFrame(quadro);
      anterior.current = alvo;
    };
  }, [alvo, duracao]);

  return valor;
}

/** O mês numa barra só: quanto do que entrou saiu, foi guardado e sobrou. */
export function FaixaDoMes({ totais, className }: { totais: Totais; className?: string }) {
  const base = Math.max(totais.entrouCentavos + totais.resgatadoCentavos, totais.saiuCentavos + totais.guardadoCentavos);
  const partes = [
    { classe: 'bg-creme', largura: fatia(totais.saiuCentavos, base) },
    { classe: 'bg-latao', largura: fatia(totais.guardadoCentavos, base) },
    { classe: 'bg-cobre', largura: fatia(totais.sobrouCentavos, base) },
  ];
  return (
    <div className={cx('flex h-2 bg-linha', className)} aria-hidden>
      {partes.map((p, i) => (
        <i key={i} className={cx('anima-x h-full', p.classe)} style={{ width: `${p.largura}%`, animationDelay: `${i * 120}ms` }} />
      ))}
    </div>
  );
}

/** Gastos por categoria numa faixa colorida. */
export function BandaDeCategorias({ itens }: { itens: { cor: string; valor: number }[] }) {
  return (
    <div className="flex h-4 gap-[2px]" aria-hidden>
      {itens.map((item, i) => (
        <i key={i} className="anima-x h-full" style={{ flex: item.valor, background: item.cor, animationDelay: `${i * 50}ms` }} />
      ))}
    </div>
  );
}

export function Progresso({ fracao, cor = 'var(--cobre)', atraso = 0 }: { fracao: number; cor?: string; atraso?: number }) {
  return (
    <div className="h-1 bg-linha" role="presentation">
      <i className="anima-x block h-full" style={{ width: `${Math.min(100, Math.max(0, fracao * 100))}%`, background: cor, animationDelay: `${atraso}ms` }} />
    </div>
  );
}

/**
 * Colunas dos últimos meses: cada coluna é o que entrou, dividido em saiu, guardado e sobrou.
 * Mês que fechou no vermelho ganha uma ponta vermelha com o que faltou.
 */
export function ColunasDosMeses({ meses, selecionado, onSelecionar }: { meses: MesDaSerie[]; selecionado: string; onSelecionar: (c: string) => void }) {
  const ALTURA = 150;
  const maior = Math.max(1, ...meses.map((m) => Math.max(m.entrouCentavos + m.resgatadoCentavos, m.saiuCentavos + m.guardadoCentavos)));
  const px = (c: number) => `${(Math.max(0, c) / maior) * ALTURA}px`;

  return (
    <div>
      <div className="flex items-end gap-1.5" style={{ height: ALTURA + 22 }} role="group" aria-label="Últimos meses">
        {meses.map((m, i) => {
          const ativo = m.competencia === selecionado;
          return (
            <button
              key={m.competencia}
              type="button"
              onClick={() => onSelecionar(m.competencia)}
              aria-pressed={ativo}
              aria-label={`${nomeDoMes(m.competencia)}: entrou ${reaisInteiros(m.entrouCentavos)}, saiu ${reaisInteiros(m.saiuCentavos)}, guardou ${reaisInteiros(m.guardadoCentavos)}, sobrou ${reaisInteiros(m.sobrouCentavos)}`}
              className={cx('group relative flex h-full flex-1 flex-col justify-end transition-opacity', !ativo && 'opacity-60 hover:opacity-100')}
            >
              {ativo && <span className="absolute inset-x-[-12px] top-0 text-center text-[11px] font-bold whitespace-nowrap">{reaisInteiros(m.entrouCentavos)}</span>}
              <span className="anima-y flex flex-col-reverse gap-px" style={{ animationDelay: `${i * 45}ms` }}>
                <i className="block bg-creme" style={{ height: px(m.saiuCentavos) }} />
                <i className="block bg-latao" style={{ height: px(m.guardadoCentavos) }} />
                <i className="block bg-cobre" style={{ height: px(m.sobrouCentavos) }} />
                {m.sobrouCentavos < 0 && <i className="block bg-vermelho" style={{ height: px(-m.sobrouCentavos) }} />}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-1.5">
        {meses.map((m) => (
          <span key={m.competencia} className={cx('estreito flex-1 text-center text-[10.5px] font-semibold uppercase', m.competencia === selecionado ? 'text-texto' : 'text-mudo')}>
            {mesCurto(m.competencia)[0]}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Legenda({ itens }: { itens: { rotulo: string; classe: string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-mudo">
      {itens.map((i) => (
        <span key={i.rotulo} className="flex items-center gap-1.5">
          <i className={cx('block h-[3px] w-2.5', i.classe)} />
          {i.rotulo}
        </span>
      ))}
    </div>
  );
}
