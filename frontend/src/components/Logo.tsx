import { cx } from './ui';

/** Moeda de cobre com aro e o nome em Archivo larga. */
export function Moeda({
  tamanho = 18,
  cor = 'var(--cobre)',
  aro = 'var(--fundo)',
  className,
}: {
  tamanho?: number;
  cor?: string;
  aro?: string;
  className?: string;
}) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 32 32" aria-hidden className={className}>
      <circle cx="16" cy="16" r="16" fill={cor} />
      <circle cx="16" cy="16" r="10.5" fill="none" stroke={aro} strokeWidth="2.6" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cx('flex items-center gap-2 text-[19px] font-extrabold tracking-[-0.03em] [font-stretch:125%]', className)}>
      <Moeda />
      trocado
    </span>
  );
}
