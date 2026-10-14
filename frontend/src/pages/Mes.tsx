import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useLancamentosDoMes, useResumoDoMes } from '../api/consultas';
import type { Fatura, Lancamento, ResumoDoMes } from '../api/tipos';
import { FaixaDoMes, useContagem } from '../components/graficos';
import { useLancar } from '../components/Lancar';
import { Botao, Carregando, cx, ErroDeCarga, Marca, Nota } from '../components/ui';
import { useCompetencia } from '../lib/competencia';
import { competenciaAtual, diaEMes, nomeDoMes, rotuloDoDia } from '../lib/datas';
import { reais } from '../lib/dinheiro';
import { FORMAS } from '../lib/rotulos';

export function Mes() {
  const [competencia] = useCompetencia();
  const resumo = useResumoDoMes(competencia);
  const lista = useLancamentosDoMes(competencia);

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-10">
      <aside className="lg:sticky lg:top-[70px] lg:order-2">
        {resumo.isPending ? (
          <div className="px-[18px] lg:px-0">
            <Carregando linhas={3} />
          </div>
        ) : resumo.isError ? (
          <div className="px-[18px] lg:px-0">
            <ErroDeCarga erro={resumo.error} tentarDeNovo={() => resumo.refetch()} />
          </div>
        ) : (
          <Painel resumo={resumo.data} />
        )}
      </aside>

      <section className="lg:order-1" aria-label={`Lançamentos de ${nomeDoMes(competencia)}`}>
        {lista.isPending ? (
          <div className="px-[18px] pt-6 lg:px-0">
            <Carregando linhas={6} />
          </div>
        ) : lista.isError ? (
          <div className="px-[18px] pt-6 lg:px-0">
            <ErroDeCarga erro={lista.error} tentarDeNovo={() => lista.refetch()} />
          </div>
        ) : (
          <Lista competencia={competencia} lancamentos={lista.data.lancamentos} faturas={lista.data.faturas} />
        )}
      </section>
    </div>
  );
}

function Painel({ resumo }: { resumo: ResumoDoMes }) {
  const { totais } = resumo;
  const sobrou = useContagem(totais.sobrouCentavos);
  const faltou = totais.sobrouCentavos < 0;
  const mes = nomeDoMes(resumo.competencia);

  return (
    <div>
      <section className={cx('px-[18px] pt-[18px] pb-4', faltou ? 'bg-vermelho text-fundo' : 'bg-cobre text-cobre-txt')}>
        <h1 className="estreito text-[12px] font-bold tracking-[0.14em] uppercase">
          {faltou ? 'Faltou' : 'Sobrou'} em {mes}
        </h1>
        <p className="largo mt-1 text-[clamp(40px,13vw,52px)] leading-[1.05]">
          <span className="mr-1.5 align-[0.9em] text-[18px] font-bold tracking-normal">R$</span>
          {reais(Math.abs(sobrou))}
        </p>
      </section>
      <FaixaDoMes totais={totais} />

      <dl className="grid grid-cols-3 border-b border-linha">
        <Total rotulo="Entrou" valor={totais.entrouCentavos} />
        <Total rotulo="Guardou" valor={totais.guardadoCentavos} marca="bg-latao" extra={resumo.taxaDePoupanca !== null ? `${resumo.taxaDePoupanca}%` : undefined} />
        <Total rotulo="Saiu" valor={totais.saiuCentavos} marca="bg-creme" />
      </dl>

      <div className="space-y-2.5 px-[18px] pt-3 lg:px-0">
        {resumo.proximasFaturas.map((f) => (
          <Nota key={f.cartao.id}>
            Fatura aberta do {f.cartao.nome}: <b>{reais(f.totalCentavos)}</b>. Entra em {nomeDoMes(f.vencimento.slice(0, 7))}, quando vence ({diaEMes(f.vencimento)}).
          </Nota>
        ))}
        {totais.resgatadoCentavos > 0 && (
          <Nota cor="var(--cobre)">
            Você resgatou <b>{reais(totais.resgatadoCentavos)}</b> das caixinhas neste mês.
          </Nota>
        )}
      </div>
    </div>
  );
}

function Total({ rotulo, valor, marca, extra }: { rotulo: string; valor: number; marca?: string; extra?: string }) {
  return (
    <div className="border-l border-linha py-3 pl-3 first:border-l-0 first:pl-[18px] lg:first:pl-0">
      <dt className="rotulo flex items-center gap-1.5 text-[11px]">
        {marca && <i className={cx('block h-[3px] w-2.5', marca)} />}
        {rotulo}
      </dt>
      <dd className="mt-0.5 text-[15px] font-semibold">
        {reais(valor)}
        {extra && <small className="ml-1 text-[11px] font-medium text-mudo">{extra}</small>}
      </dd>
    </div>
  );
}

type Item = { tipo: 'lancamento'; data: string; lancamento: Lancamento } | { tipo: 'fatura'; data: string; fatura: Fatura };

/** Junta lançamentos e faturas (no dia do vencimento) e agrupa por dia, do mais recente. */
function agruparPorDia(lancamentos: Lancamento[], faturas: Fatura[]) {
  // Valor guardado de uma entrada aparece logo abaixo dela
  const guardados = new Map<string, Lancamento[]>();
  for (const l of lancamentos) if (l.origemId) guardados.set(l.origemId, [...(guardados.get(l.origemId) ?? []), l]);
  const ordenados = lancamentos
    .filter((l) => !l.origemId || !lancamentos.some((o) => o.id === l.origemId))
    .flatMap((l) => [l, ...(guardados.get(l.id) ?? [])]);

  const itens: Item[] = [
    ...faturas.map((fatura) => ({ tipo: 'fatura' as const, data: fatura.vencimento, fatura })),
    ...ordenados.map((lancamento) => ({ tipo: 'lancamento' as const, data: lancamento.data, lancamento })),
  ];
  const dias = new Map<string, Item[]>();
  for (const item of itens) dias.set(item.data, [...(dias.get(item.data) ?? []), item]);
  return [...dias.entries()].sort(([a], [b]) => b.localeCompare(a));
}

function Lista({ competencia, lancamentos, faturas }: { competencia: string; lancamentos: Lancamento[]; faturas: Fatura[] }) {
  const { abrir } = useLancar();

  if (!lancamentos.length && !faturas.length) {
    return (
      <div className="px-[18px] pt-10 text-center lg:px-0 lg:pt-6 lg:text-left">
        <p className="largo text-[22px]">Nada lançado em {nomeDoMes(competencia)}.</p>
        <p className="mt-1 text-mudo">
          {competencia === competenciaAtual() ? 'Comece pelo que entrou: o app já sugere quanto guardar.' : 'Os lançamentos deste mês aparecem aqui.'}
        </p>
        <Botao variante="principal" className="mt-5" onClick={() => abrir({ tipo: 'ENTRADA' })}>
          Lançar uma entrada
        </Botao>
      </div>
    );
  }

  return (
    <div className="pb-4">
      {agruparPorDia(lancamentos, faturas).map(([dia, itens]) => (
        <div key={dia}>
          <h3 className="rotulo mx-[18px] mt-5 border-b border-linha pb-1.5 lg:mx-0">{rotuloDoDia(dia)}</h3>
          <ul>
            {itens.map((item) =>
              item.tipo === 'fatura' ? (
                <LinhaFatura key={`f-${item.fatura.cartao.id}`} fatura={item.fatura} />
              ) : (
                <LinhaLancamento
                  key={item.lancamento.id}
                  lancamento={item.lancamento}
                  entrada={item.lancamento.origemId ? lancamentos.find((o) => o.id === item.lancamento.origemId) : undefined}
                />
              ),
            )}
          </ul>
        </div>
      ))}
    </div>
  );
}

const nomeDaForma = (forma: Lancamento['formaPagamento']) => FORMAS.find((f) => f.valor === forma)?.rotulo;

export function LinhaLancamento({ lancamento: l, recuado, entrada }: { lancamento: Lancamento; recuado?: boolean; entrada?: Lancamento }) {
  const { abrir } = useLancar();
  let titulo = l.descricao || l.categoria?.nome || (l.tipo === 'GUARDAR' ? 'Guardado' : 'Resgate');

  let detalhe: string;
  let cor: string;
  let valor: string;
  let classeValor = '';
  switch (l.tipo) {
    case 'ENTRADA':
      detalhe = [l.categoria?.nome, nomeDaForma(l.formaPagamento)].filter(Boolean).join(' · ');
      cor = l.categoria?.cor ?? 'var(--verde)';
      valor = `+ ${reais(l.valorCentavos)}`;
      classeValor = 'text-verde';
      break;
    case 'SAIDA':
      // Item de fatura: mostra o dia da compra, já que a linha fica no dia do vencimento
      detalhe = l.cartao
        ? [l.categoria?.nome, `compra ${diaEMes(l.data)}`, l.totalParcelas && l.totalParcelas > 1 ? `parcela ${l.parcela}/${l.totalParcelas}` : null]
            .filter(Boolean)
            .join(' · ')
        : [l.categoria?.nome, nomeDaForma(l.formaPagamento)].filter(Boolean).join(' · ');
      cor = l.categoria?.cor ?? 'var(--mudo)';
      valor = `− ${reais(l.valorCentavos)}`;
      break;
    case 'GUARDAR':
      // Guardado junto com uma entrada: "Guardado → Viagem · 20% da entrada"
      if (entrada) {
        titulo = `Guardado → ${l.caixinha?.nome}`;
        detalhe = `${Math.round((l.valorCentavos / entrada.valorCentavos) * 100)}% de ${entrada.descricao || entrada.categoria?.nome}`;
      } else {
        detalhe = `Guardado → ${l.caixinha?.nome}`;
      }
      cor = 'var(--latao)';
      valor = `− ${reais(l.valorCentavos)}`;
      classeValor = 'text-latao';
      break;
    case 'RESGATAR':
      detalhe = `Resgatado de ${l.caixinha?.nome}`;
      cor = 'var(--latao)';
      valor = `+ ${reais(l.valorCentavos)}`;
      classeValor = 'text-latao';
      break;
  }

  return (
    <li>
      <button
        type="button"
        // Valor guardado junto com uma entrada se edita pela entrada
        onClick={() => abrir({ id: l.origemId ?? l.id })}
        className={cx('grid w-full grid-cols-[3px_minmax(0,1fr)_auto] items-center gap-3 border-b border-linha py-[11px] text-left hover:bg-superficie', recuado ? 'pr-[18px] pl-8 lg:pr-2 lg:pl-6' : 'px-[18px] lg:px-0')}
      >
        <Marca cor={cor} className="h-full" />
        <span className="min-w-0">
          <b className={cx('block truncate font-semibold', recuado ? 'text-[14px]' : 'text-[15px]')}>{titulo}</b>
          <small className="block truncate text-[12.5px] text-mudo">{detalhe}</small>
        </span>
        <span className={cx('font-semibold whitespace-nowrap', recuado ? 'text-[14px]' : 'text-[15px]', classeValor)}>{valor}</span>
      </button>
    </li>
  );
}

function LinhaFatura({ fatura }: { fatura: Fatura }) {
  const [aberta, setAberta] = useState(false);
  const compras = fatura.itens.length;
  return (
    <li>
      <button
        type="button"
        aria-expanded={aberta}
        onClick={() => setAberta(!aberta)}
        className="grid w-full grid-cols-[3px_minmax(0,1fr)_auto] items-center gap-3 border-b border-linha px-[18px] py-[11px] text-left hover:bg-superficie lg:px-0"
      >
        <Marca cor={fatura.cartao.cor} className="h-full" />
        <span className="min-w-0">
          <b className="flex items-center gap-1.5 text-[15px] font-semibold">
            Fatura {fatura.cartao.nome}
            <ChevronDown size={15} className={cx('text-mudo transition-transform', aberta && 'rotate-180')} />
          </b>
          <small className="block truncate text-[12.5px] text-mudo">
            Vence {diaEMes(fatura.vencimento)} · {compras} {compras === 1 ? 'compra' : 'compras'}
          </small>
        </span>
        <span className="text-[15px] font-semibold whitespace-nowrap">− {reais(fatura.totalCentavos)}</span>
      </button>
      {aberta && (
        <ul className="bg-superficie/60">
          {fatura.itens.map((l) => (
            <LinhaLancamento key={l.id} lancamento={l} recuado />
          ))}
        </ul>
      )}
    </li>
  );
}
