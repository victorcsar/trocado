import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Painel para formulários: sobe de baixo no celular e entra pela direita no computador.
 * Fecha com Esc, com o X ou clicando fora.
 */
export function Folha({ titulo, aoFechar, children }: { titulo: string; aoFechar: () => void; children: ReactNode }) {
  const painel = useRef<HTMLDivElement>(null);
  const fechar = useRef(aoFechar);
  useEffect(() => {
    fechar.current = aoFechar;
  });

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    painel.current?.querySelector<HTMLElement>('input, button:not([data-fechar]), select, textarea')?.focus({ preventScroll: true });

    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fechar.current();
      // Mantém o Tab dentro do painel
      if (e.key === 'Tab' && painel.current) {
        const focaveis = painel.current.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href]');
        const primeiro = focaveis[0];
        const ultimo = focaveis[focaveis.length - 1];
        if (e.shiftKey && document.activeElement === primeiro) {
          e.preventDefault();
          ultimo?.focus();
        } else if (!e.shiftKey && document.activeElement === ultimo) {
          e.preventDefault();
          primeiro?.focus();
        }
      }
    };
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('keydown', tecla);
      document.body.style.overflow = overflow;
      anterior?.focus?.({ preventScroll: true });
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/55 [animation:aparece_.2s_ease-out] lg:items-stretch" onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}>
      <div
        ref={painel}
        role="dialog"
        aria-modal
        aria-label={titulo}
        className="flex max-h-[94dvh] w-full flex-col border-t-[3px] border-cobre bg-fundo [animation:sobe_.28s_cubic-bezier(.2,.7,.2,1)] lg:max-h-none lg:w-[480px] lg:border-t-0 lg:border-l lg:border-l-linha lg:[animation:desliza_.28s_cubic-bezier(.2,.7,.2,1)]"
      >
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-linha pr-2 pl-5">
          <h2 className="largo text-[19px]">{titulo}</h2>
          <button type="button" data-fechar onClick={aoFechar} aria-label="Fechar" className="grid size-11 place-items-center text-mudo hover:text-texto">
            <X size={20} />
          </button>
        </header>
        {/* O espaço de baixo fica no conteúdo, e não no contêiner que rola: com padding no
            contêiner, o rodapé "sticky" do formulário para acima dele e o conteúdo aparece por baixo */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-5">
          <div className="pb-[max(1.25rem,env(safe-area-inset-bottom))]">{children}</div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
