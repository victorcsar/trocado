import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { TipoLancamento } from '../api/tipos';
import { Folha } from './Folha';
import { FormLancamento } from './FormLancamento';

export interface PedidoDeLancamento {
  /** Editar um lançamento existente */
  id?: string;
  /** Novo lançamento já com o tipo (e a caixinha) escolhidos */
  tipo?: TipoLancamento;
  caixinhaId?: string;
}

const LancarContexto = createContext<{ abrir: (pedido?: PedidoDeLancamento) => void }>({ abrir: () => {} });

/** O formulário de lançar abre de qualquer tela (botão +, toque numa linha, caixinha). */
export function LancarProvider({ children }: { children: ReactNode }) {
  const [pedido, setPedido] = useState<PedidoDeLancamento | null>(null);
  const abrir = useCallback((p: PedidoDeLancamento = {}) => setPedido(p), []);
  const valor = useMemo(() => ({ abrir }), [abrir]);
  const fechar = () => setPedido(null);

  // Atalho no computador: N abre um lançamento novo (fora de campos de texto)
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement;
      if (e.key.toLowerCase() !== 'n' || e.ctrlKey || e.metaKey || e.altKey) return;
      if (alvo.closest('input, textarea, select, [contenteditable], [role="dialog"]')) return;
      e.preventDefault();
      abrir();
    };
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [abrir]);

  return (
    <LancarContexto.Provider value={valor}>
      {children}
      {pedido && (
        <Folha titulo={pedido.id ? 'Editar lançamento' : 'Novo lançamento'} aoFechar={fechar}>
          <FormLancamento key={pedido.id ?? 'novo'} pedido={pedido} aoConcluir={fechar} />
        </Folha>
      )}
    </LancarContexto.Provider>
  );
}

export function useLancar() {
  return useContext(LancarContexto);
}
