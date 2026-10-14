import { useResumoDoMes, useSerie } from '../api/consultas';
import type { MesDaSerie, ResumoDoMes } from '../api/tipos';
import { BandaDeCategorias, ColunasDosMeses, Legenda } from '../components/graficos';
import { Carregando, cx, ErroDeCarga, Marca, Nota, Secao } from '../components/ui';
import { useCompetencia } from '../lib/competencia';
import { nomeDoMes, partes } from '../lib/datas';
import { reais } from '../lib/dinheiro';

/** Variação que vale um aviso: pelo menos 20% e R$ 50 acima da média. */
const ALTA_RELEVANTE = { percentual: 20, centavos: 5_000 };

export function Resumo() {
  const [competencia, mudarCompetencia] = useCompetencia();
  const resumo = useResumoDoMes(competencia);
  const serie = useSerie(competencia);

  if (resumo.isPending || serie.isPending) {
    return (
      <div className="px-[18px] lg:px-0">
        <Carregando linhas={6} />
      </div>
    );
  }
  if (resumo.isError || serie.isError) {
    return (
      <div className="px-[18px] lg:px-0">
        <ErroDeCarga erro={resumo.error ?? serie.error} tentarDeNovo={() => (resumo.refetch(), serie.refetch())} />
      </div>
    );
  }

  const nome = nomeDoMes(competencia);
  return (
    <div className="px-[18px] lg:px-0">
      <h1 className="largo pt-1.5 pb-5 text-[34px] leading-none capitalize">
        <span className="rotulo mb-1.5 block">Resumo · {partes(competencia).ano}</span>
        {nome}
      </h1>

      <div className="grid gap-x-12 gap-y-9 lg:grid-cols-2">
        <ParaOndeFoi resumo={resumo.data} />
        <div className="space-y-9">
          <DozeMeses meses={serie.data} selecionado={competencia} onSelecionar={mudarCompetencia} />
          <Entradas resumo={resumo.data} />
        </div>
      </div>
    </div>
  );
}

function ParaOndeFoi({ resumo }: { resumo: ResumoDoMes }) {
  const gastos = resumo.gastosPorCategoria;
  const total = gastos.reduce((t, g) => t + g.valorCentavos, 0);
  const destaque = gastos
    .filter((g) => g.variacaoPercentual !== null && g.variacaoPercentual >= ALTA_RELEVANTE.percentual && g.valorCentavos - g.mediaAnteriorCentavos >= ALTA_RELEVANTE.centavos)
    .sort((a, b) => b.valorCentavos - b.mediaAnteriorCentavos - (a.valorCentavos - a.mediaAnteriorCentavos))[0];

  return (
    <Secao titulo="Para onde foi" direita={reais(total)}>
      {gastos.length ? (
        <>
          <BandaDeCategorias itens={gastos.map((g) => ({ cor: g.categoria.cor, valor: g.valorCentavos }))} />
          <ul className="mt-2">
            {gastos.map((g) => (
              <li key={g.categoria.id} className="grid grid-cols-[3px_minmax(0,1fr)_auto_44px] items-center gap-2.5 border-b border-linha py-[7px] text-[14px]">
                <Marca cor={g.categoria.cor} className="h-full" />
                <span className="truncate">
                  {g.categoria.nome}
                  {g.variacaoPercentual !== null && Math.abs(g.variacaoPercentual) >= 10 && (
                    <small className={cx('ml-2 text-[11.5px]', g.variacaoPercentual > 0 ? 'text-vermelho' : 'text-verde')}>
                      {g.variacaoPercentual > 0 ? '▲' : '▼'} {Math.abs(g.variacaoPercentual)}%
                    </small>
                  )}
                </span>
                <span>{reais(g.valorCentavos)}</span>
                <span className="text-right text-[12.5px] text-mudo">{Math.round((g.valorCentavos / total) * 100)}%</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[12px] text-mudo">▲▼ comparado com a média dos 3 meses anteriores.</p>
          {destaque && (
            <Nota cor="var(--vermelho)" className="mt-4">
              {destaque.categoria.nome}: <b>+{destaque.variacaoPercentual}%</b> sobre a sua média ({reais(destaque.mediaAnteriorCentavos)} por mês).
            </Nota>
          )}
        </>
      ) : (
        <p className="text-mudo">Nenhum gasto neste mês.</p>
      )}
      {resumo.parcelasFuturasCentavos > 0 && (
        <Nota className="mt-4">
          Já comprometido em parcelas dos próximos meses: <b>{reais(resumo.parcelasFuturasCentavos)}</b>.
        </Nota>
      )}
    </Secao>
  );
}

function DozeMeses({ meses, selecionado, onSelecionar }: { meses: MesDaSerie[]; selecionado: string; onSelecionar: (c: string) => void }) {
  const comEntrada = meses.filter((m) => m.taxaDePoupanca !== null);
  const taxaMedia = comEntrada.length ? Math.round((comEntrada.reduce((t, m) => t + m.taxaDePoupanca!, 0) / comEntrada.length) * 10) / 10 : null;
  const mes = meses.find((m) => m.competencia === selecionado);

  return (
    <Secao titulo="12 meses" direita={taxaMedia !== null && <>poupança média {taxaMedia.toLocaleString('pt-BR')}%</>}>
      <ColunasDosMeses meses={meses} selecionado={selecionado} onSelecionar={onSelecionar} />
      <div className="mt-3">
        <Legenda
          itens={[
            { rotulo: 'Saiu', classe: 'bg-creme' },
            { rotulo: 'Guardou', classe: 'bg-latao' },
            { rotulo: 'Sobrou', classe: 'bg-cobre' },
            { rotulo: 'Faltou', classe: 'bg-vermelho' },
          ]}
        />
      </div>
      {mes && (
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1.5 border-t border-linha pt-3 text-[14px] sm:grid-cols-4">
          {[
            ['Entrou', mes.entrouCentavos],
            ['Guardou', mes.guardadoCentavos],
            ['Saiu', mes.saiuCentavos],
            [mes.sobrouCentavos < 0 ? 'Faltou' : 'Sobrou', Math.abs(mes.sobrouCentavos)],
          ].map(([rotulo, valor]) => (
            <div key={rotulo}>
              <dt className="rotulo text-[11px]">{rotulo}</dt>
              <dd className="font-semibold">{reais(valor as number)}</dd>
            </div>
          ))}
        </dl>
      )}
    </Secao>
  );
}

function Entradas({ resumo }: { resumo: ResumoDoMes }) {
  if (!resumo.entradasPorCategoria.length) return null;
  return (
    <Secao titulo="De onde veio" direita={reais(resumo.totais.entrouCentavos)}>
      <ul>
        {resumo.entradasPorCategoria.map((e) => (
          <li key={e.categoria.id} className="grid grid-cols-[3px_minmax(0,1fr)_auto] items-center gap-2.5 border-b border-linha py-[7px] text-[14px]">
            <Marca cor={e.categoria.cor} className="h-full" />
            <span className="truncate">{e.categoria.nome}</span>
            <span>{reais(e.valorCentavos)}</span>
          </li>
        ))}
      </ul>
    </Secao>
  );
}
