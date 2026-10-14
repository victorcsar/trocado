import { useSearchParams } from 'react-router';
import { competenciaAtual } from './datas';

const VALIDA = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Mês que a tela mostra, guardado na URL (?mes=2026-10): Mês e Resumo andam juntos,
 * e o link de um mês específico pode ser salvo ou compartilhado.
 */
export function useCompetencia() {
  const [params, setParams] = useSearchParams();
  const daUrl = params.get('mes');
  const competencia = daUrl && VALIDA.test(daUrl) ? daUrl : competenciaAtual();

  const mudar = (nova: string) =>
    setParams(
      (atual) => {
        const proximos = new URLSearchParams(atual);
        if (nova === competenciaAtual()) proximos.delete('mes');
        else proximos.set('mes', nova);
        return proximos;
      },
      { replace: true },
    );

  return [competencia, mudar] as const;
}
