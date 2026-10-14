import { useEffect, useState } from 'react';

export type Tema = 'escuro' | 'claro';
const CHAVE = 'trocado:tema';

function temaSalvo(): Tema {
  try {
    return localStorage.getItem(CHAVE) === 'claro' ? 'claro' : 'escuro';
  } catch {
    return 'escuro';
  }
}

export function useTema() {
  const [tema, setTema] = useState<Tema>(temaSalvo);

  useEffect(() => {
    document.documentElement.dataset.tema = tema;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', tema === 'claro' ? '#f3f0e8' : '#121210');
    try {
      localStorage.setItem(CHAVE, tema);
    } catch {
      // sem armazenamento (aba anônima): o tema só não fica lembrado
    }
  }, [tema]);

  return [tema, setTema] as const;
}
