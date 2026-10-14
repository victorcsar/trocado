import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { useCaixinhas } from '../api/consultas';
import type { Caixinha } from '../api/tipos';
import { FormCaixinha, FormTransferencia } from '../components/FormsCaixinha';
import { Folha } from '../components/Folha';
import { Progresso } from '../components/graficos';
import { useLancar } from '../components/Lancar';
import { Botao, Carregando, ErroDeCarga, Marca } from '../components/ui';
import { reais } from '../lib/dinheiro';

export function Caixinhas() {
  const caixinhas = useCaixinhas();
  const { abrir } = useLancar();
  const [folha, setFolha] = useState<'nova' | 'transferir' | null>(null);

  if (caixinhas.isPending) return <div className="px-[18px] lg:px-0"><Carregando /></div>;
  if (caixinhas.isError) return <div className="px-[18px] lg:px-0"><ErroDeCarga erro={caixinhas.error} tentarDeNovo={() => caixinhas.refetch()} /></div>;

  const abertas = caixinhas.data.filter((c) => !c.arquivada);
  const arquivadas = caixinhas.data.filter((c) => c.arquivada);
  const total = caixinhas.data.reduce((t, c) => t + c.saldoCentavos, 0);

  return (
    <div className="px-[18px] lg:max-w-3xl lg:px-0">
      <h1 className="pt-1.5 pb-6">
        <span className="rotulo mb-1 block">Guardado no total</span>
        <span className="largo text-[clamp(36px,11vw,46px)] leading-none">
          <span className="mr-1.5 align-[0.8em] text-[16px] font-bold tracking-normal text-mudo">R$</span>
          {reais(total)}
        </span>
      </h1>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:flex">
        <Botao variante="principal" onClick={() => abrir({ tipo: 'GUARDAR' })}>
          Guardar
        </Botao>
        <Botao onClick={() => abrir({ tipo: 'RESGATAR' })}>Resgatar</Botao>
        <Botao onClick={() => setFolha('transferir')} disabled={abertas.length < 2}>
          Mover
        </Botao>
        <Botao variante="fantasma" onClick={() => setFolha('nova')}>
          + Nova caixinha
        </Botao>
      </div>

      <ul className="border-t border-linha">
        {abertas.map((c, i) => (
          <LinhaCaixinha key={c.id} caixinha={c} atraso={i * 120} />
        ))}
      </ul>

      {arquivadas.length > 0 && (
        <details className="mt-8">
          <summary className="rotulo cursor-pointer">Arquivadas ({arquivadas.length})</summary>
          <ul className="mt-2 border-t border-linha">
            {arquivadas.map((c) => (
              <LinhaCaixinha key={c.id} caixinha={c} atraso={0} />
            ))}
          </ul>
        </details>
      )}

      {folha === 'nova' && (
        <Folha titulo="Nova caixinha" aoFechar={() => setFolha(null)}>
          <FormCaixinha aoConcluir={() => setFolha(null)} />
        </Folha>
      )}
      {folha === 'transferir' && (
        <Folha titulo="Mover entre caixinhas" aoFechar={() => setFolha(null)}>
          <FormTransferencia caixinhas={abertas} aoConcluir={() => setFolha(null)} />
        </Folha>
      )}
    </div>
  );
}

function LinhaCaixinha({ caixinha: c, atraso }: { caixinha: Caixinha; atraso: number }) {
  const fracao = c.metaCentavos ? c.saldoCentavos / c.metaCentavos : null;
  return (
    <li>
      <Link to={`/caixinhas/${c.id}`} className="grid grid-cols-[3px_minmax(0,1fr)_auto] gap-3 border-b border-linha py-3.5 hover:bg-superficie">
        <Marca cor={c.cor} className="h-full" />
        <span className="min-w-0">
          <span className="flex items-baseline justify-between gap-3">
            <b className="truncate text-[16px] font-semibold">{c.nome}</b>
            <span className="largo text-[24px] leading-none">{fracao !== null ? `${Math.floor(fracao * 100)}%` : reais(c.saldoCentavos)}</span>
          </span>
          <small className="mt-0.5 mb-2.5 block text-[13px] text-mudo">
            {fracao !== null ? `${reais(c.saldoCentavos)} de ${reais(c.metaCentavos!)}` : 'Sem meta'}
            {c.padrao && ' · recebe o guardado das entradas'}
          </small>
          {fracao !== null && <Progresso fracao={fracao} cor={c.cor} atraso={atraso} />}
        </span>
        <ChevronRight size={18} className="self-center text-mudo" />
      </Link>
    </li>
  );
}
