import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

const AvisoContexto = createContext<(texto: string) => void>(() => {});

/** Aviso curto depois de salvar ("Lançado"), acima da barra de navegação. */
export function AvisosProvider({ children }: { children: ReactNode }) {
  const [aviso, setAviso] = useState<{ texto: string; chave: number } | null>(null);
  const timer = useRef<number>(undefined);

  const avisar = useCallback((texto: string) => {
    window.clearTimeout(timer.current);
    setAviso({ texto, chave: Date.now() });
    timer.current = window.setTimeout(() => setAviso(null), 2600);
  }, []);

  return (
    <AvisoContexto.Provider value={avisar}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-[60] flex justify-center px-4 lg:bottom-6">
        {aviso && (
          <p key={aviso.chave} className="border-l-[3px] border-cobre bg-texto px-4 py-2.5 text-[14px] font-semibold text-fundo shadow-lg [animation:sobe_.25s_ease-out]">
            {aviso.texto}
          </p>
        )}
      </div>
    </AvisoContexto.Provider>
  );
}

export function useAviso() {
  return useContext(AvisoContexto);
}
