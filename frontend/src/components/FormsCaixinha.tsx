import { useState, type FormEvent } from 'react';
import { ApiErro } from '../api/cliente';
import { useCadastro, useTransferir } from '../api/consultas';
import type { Caixinha } from '../api/tipos';
import { hoje } from '../lib/datas';
import { reais } from '../lib/dinheiro';
import { useAviso } from './Avisos';
import { CampoValor } from './CampoValor';
import { CORES } from '../lib/rotulos';
import { Botao, Campo, Escolhas, Nota, SeletorDeCor } from './ui';

interface DadosCaixinha {
  nome: string;
  metaCentavos: number | null;
  cor: string;
  padrao?: true;
  arquivada?: boolean;
}

export function FormCaixinha({ caixinha, aoConcluir }: { caixinha?: Caixinha; aoConcluir: () => void }) {
  const [nome, setNome] = useState(caixinha?.nome ?? '');
  const [meta, setMeta] = useState(caixinha?.metaCentavos ?? 0);
  const [cor, setCor] = useState(caixinha?.cor ?? CORES[4]!);
  const [padrao, setPadrao] = useState(caixinha?.padrao ?? false);
  const [erro, setErro] = useState<string>();
  const { salvar, excluir } = useCadastro<DadosCaixinha>('caixinhas');
  const avisar = useAviso();

  const concluir = (texto: string) => {
    avisar(texto);
    aoConcluir();
  };
  const falhou = (e: Error) => setErro(e instanceof ApiErro ? (e.doCampo('nome') ?? e.message) : e.message);

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (!nome.trim()) return setErro('Dê um nome à caixinha');
    const dados: DadosCaixinha = { nome: nome.trim(), metaCentavos: meta || null, cor };
    // "padrão" só se liga: deixa de ser quando outra caixinha vira a padrão
    if (padrao && !caixinha?.padrao) dados.padrao = true;
    salvar.mutate({ id: caixinha?.id, dados }, { onSuccess: () => concluir(caixinha ? 'Caixinha salva' : 'Caixinha criada'), onError: falhou });
  }

  const arquivar = (arquivada: boolean) =>
    salvar.mutate(
      { id: caixinha!.id, dados: { nome: caixinha!.nome, metaCentavos: caixinha!.metaCentavos, cor: caixinha!.cor, arquivada } },
      { onSuccess: () => concluir(arquivada ? 'Caixinha arquivada' : 'Caixinha de volta'), onError: falhou },
    );

  return (
    <form onSubmit={enviar} noValidate className="space-y-6">
      <Campo rotulo="Nome" value={nome} maxLength={40} placeholder="Ex.: Viagem" onChange={(e) => setNome(e.target.value)} autoFocus />
      <CampoValor rotulo="Meta (opcional)" valor={meta} onChange={setMeta} />
      <SeletorDeCor valor={cor} onChange={setCor} />
      <label className="flex items-center justify-between gap-3">
        <span>
          <span className="block font-semibold">Caixinha padrão</span>
          <span className="text-[13px] text-mudo">Recebe o valor guardado das entradas quando você não escolhe outra.</span>
        </span>
        <input type="checkbox" checked={padrao} disabled={caixinha?.padrao} onChange={(e) => setPadrao(e.target.checked)} className="size-5 accent-[var(--cobre)]" />
      </label>

      {erro && <Nota cor="var(--vermelho)">{erro}</Nota>}

      <Botao type="submit" variante="principal" className="w-full" carregando={salvar.isPending}>
        {caixinha ? 'Salvar' : 'Criar caixinha'}
      </Botao>

      {caixinha && !caixinha.padrao && (
        <div className="space-y-3 border-t border-linha pt-5">
          {caixinha.arquivada ? (
            <Botao type="button" className="w-full" onClick={() => arquivar(false)}>
              Desarquivar
            </Botao>
          ) : (
            <Botao type="button" className="w-full" onClick={() => arquivar(true)} disabled={caixinha.saldoCentavos > 0}>
              Arquivar
            </Botao>
          )}
          {caixinha.saldoCentavos > 0 && !caixinha.arquivada && <p className="text-[13px] text-mudo">Para arquivar, mova antes o saldo para outra caixinha.</p>}
          <Botao
            type="button"
            variante="perigo"
            className="w-full"
            onClick={() => excluir.mutate(caixinha.id, { onSuccess: () => concluir('Caixinha excluída'), onError: falhou })}
          >
            Excluir (só sem movimentações)
          </Botao>
        </div>
      )}
    </form>
  );
}

export function FormTransferencia({ caixinhas, deId, aoConcluir }: { caixinhas: Caixinha[]; deId?: string; aoConcluir: () => void }) {
  const [de, setDe] = useState(deId);
  const [para, setPara] = useState<string>();
  const [valor, setValor] = useState(0);
  const [erro, setErro] = useState<string>();
  const transferir = useTransferir();
  const avisar = useAviso();
  const origem = caixinhas.find((c) => c.id === de);
  const opcoes = (lista: Caixinha[]) => lista.map((c) => ({ valor: c.id, rotulo: c.nome, cor: c.cor, detalhe: `Saldo ${reais(c.saldoCentavos)}` }));

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (!de || !para) return setErro('Escolha as duas caixinhas');
    if (!valor) return setErro('Informe o valor');
    transferir.mutate(
      { deId: de, paraId: para, valorCentavos: valor, data: hoje() },
      {
        onSuccess: () => {
          avisar('Dinheiro movido');
          aoConcluir();
        },
        onError: (e) => setErro(e.message),
      },
    );
  }

  return (
    <form onSubmit={enviar} noValidate className="space-y-6">
      <p className="text-[14px] text-mudo">Mover entre caixinhas não mexe no mês: não é gasto nem entrada.</p>
      <Escolhas rotulo="De" opcoes={opcoes(caixinhas.filter((c) => c.saldoCentavos > 0))} valor={de} onChange={(id) => (setDe(id), setErro(undefined))} />
      <Escolhas rotulo="Para" opcoes={opcoes(caixinhas.filter((c) => c.id !== de))} valor={para} onChange={(id) => (setPara(id), setErro(undefined))} />
      <CampoValor rotulo={origem ? `Quanto (até ${reais(origem.saldoCentavos)})` : 'Quanto'} valor={valor} onChange={setValor} />
      {erro && <Nota cor="var(--vermelho)">{erro}</Nota>}
      <Botao type="submit" variante="principal" className="w-full" carregando={transferir.isPending}>
        Mover
      </Botao>
    </form>
  );
}
