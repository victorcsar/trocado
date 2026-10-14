import { useState, type FormEvent } from 'react';
import { ApiErro } from '../api/cliente';
import {
  useCaixinhas,
  useCartoes,
  useCategorias,
  useConta,
  useExcluirLancamento,
  useLancamento,
  useSalvarLancamento,
} from '../api/consultas';
import type { FormaPagamento, LancamentoDetalhado, LancamentoEnvio, TipoLancamento } from '../api/tipos';
import { diaEMes, hoje, nomeDoMes, ontem, somarMeses } from '../lib/datas';
import { dividirEmParcelas, percentualDe, reais } from '../lib/dinheiro';
import { competenciaDaCompra, vencimentoDaFatura } from '../lib/fatura';
import { FORMAS } from '../lib/rotulos';
import { useAviso } from './Avisos';
import { CampoValor } from './CampoValor';
import type { PedidoDeLancamento } from './Lancar';
import { Botao, Campo, Carregando, cx, ErroDeCarga, Escolhas, Nota, Segmentado } from './ui';

const TIPOS: { valor: TipoLancamento; rotulo: string }[] = [
  { valor: 'SAIDA', rotulo: 'Gasto' },
  { valor: 'ENTRADA', rotulo: 'Entrada' },
  { valor: 'GUARDAR', rotulo: 'Guardar' },
  { valor: 'RESGATAR', rotulo: 'Resgatar' },
];

interface Estado {
  tipo: TipoLancamento;
  valor: number;
  data: string;
  descricao: string;
  categoriaId?: string;
  forma: FormaPagamento;
  cartaoId?: string;
  parcelas: number;
  caixinhaId?: string;
  /** Entrada: guardar parte dela numa caixinha */
  guardarLigado: boolean;
  guardar: number;
  /** Depois que a pessoa mexe no valor a guardar, ele para de seguir o percentual */
  guardarEditado: boolean;
  caixinhaGuardarId?: string;
}

function estadoInicial(pedido: PedidoDeLancamento, detalhe?: LancamentoDetalhado): Estado {
  const base: Estado = {
    tipo: pedido.tipo ?? 'SAIDA',
    valor: 0,
    data: hoje(),
    descricao: '',
    forma: 'PIX',
    parcelas: 1,
    caixinhaId: pedido.caixinhaId,
    guardarLigado: true,
    guardar: 0,
    guardarEditado: false,
  };
  if (!detalhe) return base;
  const { lancamento: l, compra, guardado } = detalhe;
  return {
    ...base,
    tipo: l.tipo,
    valor: compra?.totalCentavos ?? l.valorCentavos,
    data: l.data,
    descricao: l.descricao,
    categoriaId: l.categoria?.id,
    forma: l.formaPagamento ?? 'PIX',
    cartaoId: l.cartao?.id,
    parcelas: compra?.totalParcelas ?? 1,
    caixinhaId: l.caixinha?.id,
    guardarLigado: !!guardado,
    guardar: guardado?.valorCentavos ?? 0,
    guardarEditado: true,
    caixinhaGuardarId: guardado?.caixinha?.id,
  };
}

export function FormLancamento({ pedido, aoConcluir }: { pedido: PedidoDeLancamento; aoConcluir: () => void }) {
  const detalhe = useLancamento(pedido.id);
  if (pedido.id) {
    if (detalhe.isPending) return <Carregando linhas={5} />;
    if (detalhe.isError) return <ErroDeCarga erro={detalhe.error} tentarDeNovo={() => detalhe.refetch()} />;
  }
  return <Formulario pedido={pedido} detalhe={detalhe.data} aoConcluir={aoConcluir} />;
}

function Formulario({ pedido, detalhe, aoConcluir }: { pedido: PedidoDeLancamento; detalhe?: LancamentoDetalhado; aoConcluir: () => void }) {
  const [e, setE] = useState(() => estadoInicial(pedido, detalhe));
  const [erros, setErros] = useState<Record<string, string | undefined>>({});
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const conta = useConta();
  const categorias = useCategorias();
  const cartoes = useCartoes();
  const caixinhas = useCaixinhas();
  const salvar = useSalvarLancamento();
  const excluir = useExcluirLancamento();
  const avisar = useAviso();

  const percentual = conta.data?.percentualGuardar ?? 0;
  const editando = !!pedido.id;
  const atual = detalhe?.lancamento;

  const mudar = (parcial: Partial<Estado>) => {
    setE((anterior) => {
      const novo = { ...anterior, ...parcial };
      // Valor a guardar acompanha o percentual até a pessoa mexer nele
      if (!novo.guardarEditado) novo.guardar = percentualDe(novo.valor, percentual);
      return novo;
    });
    setErros({});
  };

  const opcoesDeCategoria = (categorias.data ?? [])
    .filter((c) => c.tipo === (e.tipo === 'ENTRADA' ? 'ENTRADA' : 'SAIDA') && (c.ativa || c.id === atual?.categoria?.id))
    .map((c) => ({ valor: c.id, rotulo: c.nome, cor: c.cor }));
  const opcoesDeCartao = (cartoes.data ?? [])
    .filter((c) => c.ativo || c.id === atual?.cartao?.id)
    .map((c) => ({ valor: c.id, rotulo: c.nome, cor: c.cor, detalhe: `Fecha dia ${c.diaFechamento}` }));
  const caixinhasAbertas = (caixinhas.data ?? []).filter((c) => !c.arquivada);
  const padrao = caixinhasAbertas.find((c) => c.padrao);
  const opcoesDeCaixinha = (lista: typeof caixinhasAbertas) =>
    lista.map((c) => ({ valor: c.id, rotulo: c.nome, cor: c.cor, detalhe: `Saldo ${reais(c.saldoCentavos)}` }));

  const cartao = cartoes.data?.find((c) => c.id === e.cartaoId);
  const ehCredito = e.tipo === 'SAIDA' && e.forma === 'CREDITO';

  function montar(): LancamentoEnvio | null {
    const faltando: Record<string, string> = {};
    if (!e.valor) faltando.valorCentavos = 'Informe o valor';
    if ((e.tipo === 'SAIDA' || e.tipo === 'ENTRADA') && !e.categoriaId) faltando.categoriaId = 'Escolha a categoria';
    if (ehCredito && !e.cartaoId) faltando.cartaoId = 'Escolha o cartão';
    const caixinhaId = e.caixinhaId ?? (e.tipo === 'GUARDAR' ? padrao?.id : undefined);
    if ((e.tipo === 'GUARDAR' || e.tipo === 'RESGATAR') && !caixinhaId) faltando.caixinhaId = 'Escolha a caixinha';
    if (e.tipo === 'ENTRADA' && e.guardarLigado && e.guardar > e.valor) faltando.guardar = 'Não dá pra guardar mais do que entrou';
    if (Object.keys(faltando).length) {
      setErros(faltando);
      return null;
    }

    const comum = { valorCentavos: e.valor, data: e.data, descricao: e.descricao.trim() };
    switch (e.tipo) {
      case 'ENTRADA':
        return {
          tipo: 'ENTRADA',
          ...comum,
          categoriaId: e.categoriaId!,
          guardar: { valorCentavos: e.guardarLigado ? e.guardar : 0, caixinhaId: e.caixinhaGuardarId },
        };
      case 'SAIDA':
        return {
          tipo: 'SAIDA',
          ...comum,
          categoriaId: e.categoriaId!,
          formaPagamento: e.forma,
          ...(ehCredito && { cartaoId: e.cartaoId, parcelas: e.parcelas }),
        };
      default:
        return { tipo: e.tipo, ...comum, caixinhaId: caixinhaId! };
    }
  }

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    const dados = montar();
    if (!dados) return;
    salvar.mutate(
      { id: pedido.id, dados },
      {
        onSuccess: () => {
          avisar(editando ? 'Lançamento salvo' : 'Lançado');
          aoConcluir();
        },
        onError: (erro) => {
          if (erro instanceof ApiErro) {
            setErros({
              geral: erro.message,
              valorCentavos: erro.doCampo('valorCentavos'),
              categoriaId: erro.doCampo('categoriaId'),
              cartaoId: erro.doCampo('cartaoId'),
              caixinhaId: erro.doCampo('caixinhaId'),
            });
          }
        },
      },
    );
  }

  function apagar() {
    excluir.mutate(pedido.id!, {
      onSuccess: () => {
        avisar('Lançamento excluído');
        aoConcluir();
      },
      onError: (erro) => setErros({ geral: erro.message }),
    });
  }

  const avisoDeExclusao = detalhe?.compra
    ? `A compra inteira sai (${detalhe.compra.totalParcelas} parcela${detalhe.compra.totalParcelas > 1 ? 's' : ''}).`
    : detalhe?.guardado
      ? `Os ${reais(detalhe.guardado.valorCentavos)} guardados junto também saem da caixinha.`
      : 'Não dá para desfazer.';

  return (
    <form onSubmit={enviar} noValidate className="space-y-6">
      <Segmentado rotulo="Tipo de lançamento" opcoes={TIPOS} valor={e.tipo} onChange={(tipo) => mudar({ tipo, categoriaId: undefined, caixinhaId: undefined })} />

      <CampoValor
        rotulo={e.tipo === 'SAIDA' ? (ehCredito && e.parcelas > 1 ? 'Valor total da compra' : 'Quanto gastou') : e.tipo === 'ENTRADA' ? 'Quanto entrou' : e.tipo === 'GUARDAR' ? 'Quanto guardar' : 'Quanto resgatar'}
        valor={e.valor}
        onChange={(valor) => mudar({ valor })}
        erro={erros.valorCentavos}
        grande
        autoFocus={!editando}
      />

      <div className="grid grid-cols-[1fr_auto] items-end gap-3">
        <Campo rotulo="Data" type="date" value={e.data} required onChange={(ev) => ev.target.value && mudar({ data: ev.target.value })} />
        <div className="flex gap-px bg-linha">
          {[
            { rotulo: 'Hoje', data: hoje() },
            { rotulo: 'Ontem', data: ontem() },
          ].map((atalho) => (
            <button
              key={atalho.rotulo}
              type="button"
              onClick={() => mudar({ data: atalho.data })}
              className={cx('estreito h-11 bg-fundo px-3 text-[12px] font-bold tracking-[0.1em] uppercase', e.data === atalho.data ? 'text-cobre' : 'text-mudo hover:text-texto')}
            >
              {atalho.rotulo}
            </button>
          ))}
        </div>
      </div>

      {(e.tipo === 'SAIDA' || e.tipo === 'ENTRADA') && (
        <Escolhas rotulo="Categoria" opcoes={opcoesDeCategoria} valor={e.categoriaId} onChange={(categoriaId) => mudar({ categoriaId })} erro={erros.categoriaId} />
      )}

      {e.tipo === 'SAIDA' && (
        <>
          <Escolhas rotulo="Como pagou" colunas={3} opcoes={FORMAS} valor={e.forma} onChange={(forma) => mudar({ forma, parcelas: forma === 'CREDITO' ? e.parcelas : 1 })} />
          {ehCredito && (
            <div className="space-y-5 border-l-[3px] border-cobre pl-4">
              {opcoesDeCartao.length ? (
                <Escolhas rotulo="Cartão" opcoes={opcoesDeCartao} valor={e.cartaoId} onChange={(cartaoId) => mudar({ cartaoId })} erro={erros.cartaoId} />
              ) : (
                <Nota cor="var(--vermelho)">Cadastre um cartão em Ajustes para lançar compras no crédito.</Nota>
              )}
              <Parcelas valor={e.parcelas} onChange={(parcelas) => mudar({ parcelas })} />
              {cartao && e.valor > 0 && <PreviaDaFatura total={e.valor} parcelas={e.parcelas} data={e.data} cartao={cartao} />}
            </div>
          )}
        </>
      )}

      {e.tipo === 'ENTRADA' && (
        <div className="space-y-4 border-l-[3px] border-latao pl-4">
          <label className="flex items-center justify-between gap-3">
            <span>
              <span className="block font-semibold">Guardar parte desta entrada</span>
              <span className="text-[13px] text-mudo">Sua regra: {percentual}% de cada entrada</span>
            </span>
            <input
              type="checkbox"
              checked={e.guardarLigado}
              onChange={(ev) =>
                mudar(
                  ev.target.checked && !e.guardar
                    ? { guardarLigado: true, guardarEditado: false }
                    : { guardarLigado: ev.target.checked },
                )
              }
              className="size-5 accent-[var(--cobre)]"
            />
          </label>
          {e.guardarLigado && (
            <>
              <CampoValor
                rotulo={e.valor ? `Guardar (${Math.round((e.guardar / e.valor) * 1000) / 10}% da entrada)` : 'Guardar'}
                valor={e.guardar}
                onChange={(guardar) => mudar({ guardar, guardarEditado: true })}
                erro={erros.guardar}
              />
              <Escolhas
                rotulo="Em qual caixinha"
                opcoes={opcoesDeCaixinha(caixinhasAbertas)}
                valor={e.caixinhaGuardarId ?? padrao?.id}
                onChange={(caixinhaGuardarId) => mudar({ caixinhaGuardarId })}
              />
            </>
          )}
        </div>
      )}

      {e.tipo === 'GUARDAR' && (
        <Escolhas rotulo="Em qual caixinha" opcoes={opcoesDeCaixinha(caixinhasAbertas)} valor={e.caixinhaId ?? padrao?.id} onChange={(caixinhaId) => mudar({ caixinhaId })} erro={erros.caixinhaId} />
      )}
      {e.tipo === 'RESGATAR' && (
        <Escolhas
          rotulo="De qual caixinha"
          opcoes={opcoesDeCaixinha((caixinhas.data ?? []).filter((c) => c.saldoCentavos > 0 || c.id === e.caixinhaId))}
          valor={e.caixinhaId}
          onChange={(caixinhaId) => mudar({ caixinhaId })}
          erro={erros.caixinhaId}
        />
      )}

      <Campo
        rotulo="Descrição"
        placeholder={e.tipo === 'SAIDA' ? 'Ex.: Atacadão' : e.tipo === 'ENTRADA' ? 'Ex.: Site da padaria' : 'Opcional'}
        value={e.descricao}
        maxLength={120}
        onChange={(ev) => mudar({ descricao: ev.target.value })}
      />

      {erros.geral && <Nota cor="var(--vermelho)">{erros.geral}</Nota>}

      <div className="sticky bottom-0 -mx-5 space-y-3 border-t border-linha bg-fundo px-5 pt-4 pb-1">
        {confirmarExclusao ? (
          <div className="space-y-3">
            <p className="text-[14px]">
              <b>Excluir este lançamento?</b> <span className="text-mudo">{avisoDeExclusao}</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Botao type="button" onClick={() => setConfirmarExclusao(false)}>
                Manter
              </Botao>
              <Botao type="button" variante="perigo" onClick={apagar} carregando={excluir.isPending}>
                Excluir
              </Botao>
            </div>
          </div>
        ) : (
          <div className={cx('grid gap-3', editando && 'grid-cols-[auto_1fr]')}>
            {editando && (
              <Botao type="button" variante="perigo" onClick={() => setConfirmarExclusao(true)}>
                Excluir
              </Botao>
            )}
            <Botao type="submit" variante="principal" carregando={salvar.isPending}>
              {editando ? 'Salvar' : 'Lançar'}
            </Botao>
          </div>
        )}
      </div>
    </form>
  );
}

function Parcelas({ valor, onChange }: { valor: number; onChange: (n: number) => void }) {
  const mudar = (n: number) => onChange(Math.min(48, Math.max(1, n)));
  return (
    <div>
      <span className="rotulo block">Parcelas</span>
      <div className="mt-1.5 flex h-11 items-stretch border-b border-linha-forte">
        <button type="button" aria-label="Menos uma parcela" onClick={() => mudar(valor - 1)} className="w-11 text-[20px] text-mudo hover:text-texto">
          −
        </button>
        <span className="largo grid flex-1 place-items-center text-[20px]" aria-live="polite">
          {valor === 1 ? 'À vista' : `${valor}x`}
        </span>
        <button type="button" aria-label="Mais uma parcela" onClick={() => mudar(valor + 1)} className="w-11 text-[20px] text-mudo hover:text-texto">
          +
        </button>
      </div>
    </div>
  );
}

/** Em que fatura cai a compra (e cada parcela), antes de salvar. */
function PreviaDaFatura({ total, parcelas, data, cartao }: { total: number; parcelas: number; data: string; cartao: { nome: string; diaFechamento: number; diaVencimento: number } }) {
  const valores = dividirEmParcelas(total, parcelas);
  const menores = valores.filter((v) => v !== valores[0]).length;
  const primeira = competenciaDaCompra(data, cartao);
  const ultima = somarMeses(primeira, parcelas - 1);
  const vence = diaEMes(vencimentoDaFatura(primeira, cartao.diaVencimento));
  return (
    <Nota cor="var(--cobre)">
      {parcelas > 1 ? (
        <>
          <b>
            {parcelas}x de {reais(valores[0]!)}
          </b>{' '}
          {menores > 0 && <>({menores === 1 ? 'a última' : `as últimas ${menores}`} de {reais(valores[parcelas - 1]!)}) </>}
          na fatura do {cartao.nome}, de <b>{nomeDoMes(primeira)}</b> (vence {vence}) até {nomeDoMes(ultima)}
          {ultima.slice(0, 4) !== primeira.slice(0, 4) && ` de ${ultima.slice(0, 4)}`}.
        </>
      ) : (
        <>
          Entra na fatura de <b>{nomeDoMes(primeira)}</b> do {cartao.nome}, que vence {vence}.
        </>
      )}
    </Nota>
  );
}
