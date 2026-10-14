import { useId } from 'react';
import { reais } from '../lib/dinheiro';
import { cx } from './ui';

const MAXIMO = 1_000_000_000; // R$ 10 milhões, o mesmo teto da API

/**
 * Valor em reais digitado como na maquininha: os dígitos entram pela direita
 * (1, 12, 123 → 0,01 · 0,12 · 1,23). Guarda e devolve centavos.
 */
export function CampoValor({
  rotulo,
  valor,
  onChange,
  erro,
  grande,
  autoFocus,
}: {
  rotulo: string;
  valor: number;
  onChange: (centavos: number) => void;
  erro?: string;
  grande?: boolean;
  autoFocus?: boolean;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="rotulo block">
        {rotulo}
      </label>
      <div className={cx('mt-1 flex items-baseline gap-2 border-b transition-colors focus-within:border-cobre', erro ? 'border-vermelho' : 'border-linha-forte')}>
        <span className={cx('font-bold text-mudo', grande ? 'text-[20px]' : 'text-[15px]')}>R$</span>
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          autoFocus={autoFocus}
          placeholder="0,00"
          value={valor ? reais(valor) : ''}
          onChange={(e) => {
            const digitos = e.target.value.replace(/\D/g, '').slice(-10);
            onChange(Math.min(Number(digitos) || 0, MAXIMO));
          }}
          aria-invalid={!!erro}
          className={cx(
            'w-full min-w-0 bg-transparent text-texto outline-none placeholder:text-mudo/50',
            grande ? 'largo h-16 text-[40px]' : 'h-11 text-[18px] font-semibold',
          )}
        />
      </div>
      {erro && <p className="mt-1 text-[13px] text-vermelho">{erro}</p>}
    </div>
  );
}
