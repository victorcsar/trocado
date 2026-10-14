import { ChevronLeft, ChevronRight } from 'lucide-react';
import { competenciaAtual, mesEAno, nomeDoMes, somarMeses } from '../lib/datas';
import { useCompetencia } from '../lib/competencia';

export function SeletorMes() {
  const [competencia, mudar] = useCompetencia();
  const ehAtual = competencia === competenciaAtual();
  return (
    <div className="flex items-center gap-1">
      {!ehAtual && (
        <button type="button" onClick={() => mudar(competenciaAtual())} className="estreito mr-1 text-[12px] font-bold tracking-[0.1em] text-cobre uppercase">
          Hoje
        </button>
      )}
      <button
        type="button"
        onClick={() => mudar(somarMeses(competencia, -1))}
        aria-label={`Mês anterior (${nomeDoMes(somarMeses(competencia, -1))})`}
        className="grid size-9 place-items-center text-mudo hover:text-texto"
      >
        <ChevronLeft size={18} />
      </button>
      <span className="estreito min-w-[72px] text-center text-[14px] font-semibold tracking-[0.08em] uppercase" aria-live="polite">
        {mesEAno(competencia)}
      </span>
      <button
        type="button"
        onClick={() => mudar(somarMeses(competencia, 1))}
        aria-label={`Próximo mês (${nomeDoMes(somarMeses(competencia, 1))})`}
        className="grid size-9 place-items-center text-mudo hover:text-texto"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
