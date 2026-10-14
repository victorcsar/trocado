import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useCaixinhas, useExcluirTransferencia, useMovimentosDaCaixinha } from '../api/consultas';
import type { MovimentoCaixinha } from '../api/tipos';
import { useAviso } from '../components/Avisos';
import { Folha } from '../components/Folha';
import { FormCaixinha, FormTransferencia } from '../components/FormsCaixinha';
import { Progresso } from '../components/graficos';
import { useLancar } from '../components/Lancar';
import { Botao, Carregando, cx, ErroDeCarga, Nota, Secao } from '../components/ui';
import { diaEMes } from '../lib/datas';
import { reais } from '../lib/dinheiro';

export function CaixinhaDetalhe() {
  const { id = '' } = useParams();
  const dados = useMovimentosDaCaixinha(id);
  const caixinhas = useCaixinhas();
  const { abrir } = useLancar();
  const [folha, setFolha] = useState<'editar' | 'transferir' | null>(null);

  if (dados.isPending) return <div className="px-[18px] lg:px-0"><Carregando /></div>;
  if (dados.isError) return <div className="px-[18px] lg:px-0"><ErroDeCarga erro={dados.error} tentarDeNovo={() => dados.refetch()} /></div>;

  const { caixinha: c, movimentos } = dados.data;
  const fracao = c.metaCentavos ? c.saldoCentavos / c.metaCentavos : null;

  return (
    <div className="px-[18px] lg:max-w-3xl lg:px-0">
      <Link to="/caixinhas" className="rotulo inline-flex items-center gap-1.5 hover:text-texto">
        <ArrowLeft size={14} /> Caixinhas
      </Link>

      <header className="mt-4 border-l-[3px] pl-4" style={{ borderColor: c.cor }}>
        <h1 className="text-[22px] font-bold">{c.nome}</h1>
        <p className="largo mt-1 text-[clamp(36px,11vw,46px)] leading-none">
          <span className="mr-1.5 align-[0.8em] text-[16px] font-bold tracking-normal text-mudo">R$</span>
          {reais(c.saldoCentavos)}
        </p>
        {fracao !== null && (
          <div className="mt-3 max-w-md">
            <p className="mb-1.5 text-[13px] text-mudo">
              <b className="text-texto">{Math.floor(fracao * 100)}%</b> da meta de {reais(c.metaCentavos!)}
              {fracao < 1 && ` · faltam ${reais(c.metaCentavos! - c.saldoCentavos)}`}
            </p>
            <Progresso fracao={fracao} cor={c.cor} />
          </div>
        )}
        {c.arquivada && <p className="mt-2 text-[13px] text-mudo">Arquivada</p>}
      </header>

      <div className="my-6 grid grid-cols-2 gap-3 sm:flex">
        {!c.arquivada && (
          <Botao variante="principal" onClick={() => abrir({ tipo: 'GUARDAR', caixinhaId: c.id })}>
            Guardar
          </Botao>
        )}
        <Botao onClick={() => abrir({ tipo: 'RESGATAR', caixinhaId: c.id })} disabled={c.saldoCentavos <= 0}>
          Resgatar
        </Botao>
        <Botao onClick={() => setFolha('transferir')} disabled={c.saldoCentavos <= 0}>
          Mover
        </Botao>
        <Botao variante="fantasma" onClick={() => setFolha('editar')}>
          Editar
        </Botao>
      </div>

      <Secao titulo="Extrato">
        {movimentos.length ? (
          <ul className="border-t border-linha">
            {movimentos.map((m) => (
              <LinhaMovimento key={`${m.origem}-${m.id}`} movimento={m} />
            ))}
          </ul>
        ) : (
          <p className="text-mudo">Nada guardado aqui ainda.</p>
        )}
      </Secao>

      {folha === 'editar' && (
        <Folha titulo="Editar caixinha" aoFechar={() => setFolha(null)}>
          <FormCaixinha caixinha={c} aoConcluir={() => setFolha(null)} />
        </Folha>
      )}
      {folha === 'transferir' && (
        <Folha titulo="Mover entre caixinhas" aoFechar={() => setFolha(null)}>
          <FormTransferencia caixinhas={(caixinhas.data ?? []).filter((x) => !x.arquivada || x.id === c.id)} deId={c.id} aoConcluir={() => setFolha(null)} />
        </Folha>
      )}
    </div>
  );
}

function LinhaMovimento({ movimento: m }: { movimento: MovimentoCaixinha }) {
  const { abrir } = useLancar();
  const excluir = useExcluirTransferencia();
  const avisar = useAviso();
  const [confirmar, setConfirmar] = useState(false);
  const [erro, setErro] = useState<string>();
  const entrou = m.tipo === 'ENTROU';

  const conteudo = (
    <>
      <span className="estreito w-11 shrink-0 text-[13px] font-semibold text-mudo">{diaEMes(m.data)}</span>
      <span className="min-w-0 flex-1">
        <b className="block truncate text-[15px] font-semibold">{m.descricao || (entrou ? 'Guardado' : 'Resgate')}</b>
        <small className="text-[12.5px] text-mudo">
          {m.origem === 'TRANSFERENCIA' ? 'Movido entre caixinhas' : m.lancamentoDeOrigemId ? 'Guardado de uma entrada' : entrou ? 'Guardado' : 'Resgatado'}
        </small>
      </span>
      <span className={cx('font-semibold whitespace-nowrap', entrou ? 'text-latao' : 'text-texto')}>
        {entrou ? '+' : '−'} {reais(m.valorCentavos)}
      </span>
    </>
  );

  if (m.origem === 'LANCAMENTO') {
    return (
      <li>
        <button type="button" onClick={() => abrir({ id: m.lancamentoDeOrigemId ?? m.id })} className="flex w-full items-center gap-3 border-b border-linha py-3 text-left hover:bg-superficie">
          {conteudo}
        </button>
      </li>
    );
  }
  return (
    <li className="border-b border-linha py-3">
      <button type="button" onClick={() => setConfirmar(!confirmar)} className="flex w-full items-center gap-3 text-left">
        {conteudo}
      </button>
      {confirmar && (
        <div className="mt-2 flex items-center justify-between gap-3 pl-14 text-[13px]">
          <span className="text-mudo">Desfazer esta movimentação?</span>
          <Botao
            variante="perigo"
            className="min-h-9 px-3 text-[13px]"
            carregando={excluir.isPending}
            onClick={() => excluir.mutate(m.id, { onSuccess: () => avisar('Movimentação desfeita'), onError: (e) => setErro(e.message) })}
          >
            Desfazer
          </Botao>
        </div>
      )}
      {erro && <Nota cor="var(--vermelho)" className="mt-2 ml-14">{erro}</Nota>}
    </li>
  );
}
