import { useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react';
import { CORES } from '../lib/rotulos';

const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(' ');
export { cx };

type VarianteBotao = 'principal' | 'secundario' | 'fantasma' | 'perigo';

export function Botao({
  variante = 'secundario',
  className,
  carregando,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: VarianteBotao; carregando?: boolean }) {
  return (
    <button
      {...props}
      disabled={props.disabled || carregando}
      className={cx(
        'inline-flex min-h-11 items-center justify-center gap-2 px-4 text-[15px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        variante === 'principal' && 'bg-cobre text-cobre-txt hover:brightness-110',
        variante === 'secundario' && 'border border-linha-forte text-texto hover:border-texto',
        variante === 'fantasma' && 'text-mudo hover:text-texto',
        variante === 'perigo' && 'border border-vermelho/60 text-vermelho hover:bg-vermelho/10',
        className,
      )}
    >
      {carregando ? 'Salvando…' : children}
    </button>
  );
}

export function Rotulo({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cx('rotulo', className)}>{children}</span>;
}

export function Campo({
  rotulo,
  erro,
  dica,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { rotulo: string; erro?: string; dica?: ReactNode }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="rotulo block">
        {rotulo}
      </label>
      <input
        id={id}
        {...props}
        aria-invalid={!!erro}
        className="mt-1.5 block h-11 w-full border-b border-linha-forte bg-transparent text-[16px] text-texto outline-none transition-colors placeholder:text-mudo/70 focus:border-cobre aria-[invalid=true]:border-vermelho"
      />
      {erro ? <p className="mt-1 text-[13px] text-vermelho">{erro}</p> : dica && <p className="mt-1 text-[13px] text-mudo">{dica}</p>}
    </div>
  );
}

/** Título de seção: rótulo à esquerda, algo à direita (total, ação). */
export function Secao({ titulo, direita, children, className }: { titulo: string; direita?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={className}>
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <h2 className="rotulo">{titulo}</h2>
        {direita && <div className="text-[13px] font-semibold text-texto">{direita}</div>}
      </div>
      {children}
    </section>
  );
}

/** Barrinha vertical de cor que marca categoria, cartão ou caixinha (no lugar de etiqueta). */
export function Marca({ cor, className }: { cor: string; className?: string }) {
  return <i aria-hidden className={cx('block w-[3px] shrink-0 self-stretch', className)} style={{ background: cor }} />;
}

/** Abas com sublinhado cobre: tipo de lançamento, filtros. */
export function Segmentado<T extends string>({
  opcoes,
  valor,
  onChange,
  rotulo,
}: {
  opcoes: { valor: T; rotulo: string }[];
  valor: T;
  onChange: (v: T) => void;
  rotulo: string;
}) {
  return (
    <div role="radiogroup" aria-label={rotulo} className="flex border-b border-linha">
      {opcoes.map((o) => (
        <button
          key={o.valor}
          type="button"
          role="radio"
          aria-checked={o.valor === valor}
          onClick={() => onChange(o.valor)}
          className={cx(
            'estreito -mb-px flex-1 border-b-2 py-3 text-[13px] font-bold tracking-[0.1em] uppercase transition-colors',
            o.valor === valor ? 'border-cobre text-texto' : 'border-transparent text-mudo hover:text-texto',
          )}
        >
          {o.rotulo}
        </button>
      ))}
    </div>
  );
}

/** Lista de escolha em grade (categorias, cartões, caixinhas, forma de pagamento). */
export function Escolhas<T extends string>({
  opcoes,
  valor,
  onChange,
  rotulo,
  colunas = 2,
  erro,
}: {
  opcoes: { valor: T; rotulo: string; cor?: string; detalhe?: string }[];
  valor: T | undefined;
  onChange: (v: T) => void;
  rotulo: string;
  colunas?: 2 | 3;
  erro?: string;
}) {
  return (
    <fieldset>
      <legend className="rotulo mb-2">{rotulo}</legend>
      <div role="radiogroup" className={cx('grid border-t border-l border-linha', colunas === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-3')}>
        {opcoes.map((o) => {
          const ativo = o.valor === valor;
          return (
            <button
              key={o.valor}
              type="button"
              role="radio"
              aria-checked={ativo}
              onClick={() => onChange(o.valor)}
              className={cx(
                'flex min-h-11 items-stretch gap-2.5 border-r border-b border-linha bg-fundo py-2 pr-2 text-left text-[14px] transition-colors',
                o.cor ? 'pl-0' : 'pl-3',
                ativo ? 'bg-superficie font-semibold text-texto shadow-[inset_0_-2px_0_var(--cobre)]' : 'text-mudo hover:text-texto',
              )}
            >
              {o.cor && <Marca cor={o.cor} />}
              <span className="flex min-w-0 flex-col justify-center">
                <span className="truncate">{o.rotulo}</span>
                {o.detalhe && <span className="truncate text-[12px] font-normal text-mudo">{o.detalhe}</span>}
              </span>
            </button>
          );
        })}
      </div>
      {erro && <p className="mt-1 text-[13px] text-vermelho">{erro}</p>}
    </fieldset>
  );
}

/** Escolha de cor em moedinhas. */
export function SeletorDeCor({ valor, onChange }: { valor: string; onChange: (cor: string) => void }) {
  return (
    <fieldset>
      <legend className="rotulo mb-2">Cor</legend>
      <div className="flex flex-wrap gap-2.5">
        {CORES.map((cor) => (
          <button
            key={cor}
            type="button"
            aria-label={`Cor ${cor}`}
            aria-pressed={cor === valor}
            onClick={() => onChange(cor)}
            className={cx('size-8 rounded-full transition-transform', cor === valor ? 'scale-110 ring-2 ring-texto ring-offset-2 ring-offset-fundo' : 'hover:scale-105')}
            style={{ background: cor }}
          />
        ))}
      </div>
    </fieldset>
  );
}

export function Carregando({ linhas = 4 }: { linhas?: number }) {
  return (
    <div aria-busy className="space-y-3 py-2" aria-label="Carregando">
      {Array.from({ length: linhas }, (_, i) => (
        <div key={i} className="h-10 animate-pulse bg-superficie" style={{ animationDelay: `${i * 120}ms` }} />
      ))}
    </div>
  );
}

export function ErroDeCarga({ erro, tentarDeNovo }: { erro: unknown; tentarDeNovo: () => void }) {
  return (
    <div className="border-l-[3px] border-vermelho py-1 pl-3 text-[14px]">
      <p>{erro instanceof Error ? erro.message : 'Não deu para carregar.'}</p>
      <button type="button" onClick={tentarDeNovo} className="mt-1 font-semibold text-cobre">
        Tentar de novo
      </button>
    </div>
  );
}

/** Nota com barra lateral: avisos do mês, erros de formulário. */
export function Nota({ cor = 'var(--latao)', children, className }: { cor?: string; children: ReactNode; className?: string }) {
  return (
    <p className={cx('border-l-[3px] py-0.5 pl-2.5 text-[13px] leading-relaxed text-mudo [&_b]:font-semibold [&_b]:text-texto', className)} style={{ borderColor: cor }}>
      {children}
    </p>
  );
}
