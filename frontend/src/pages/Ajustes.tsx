import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useAtualizarConta, useCartoes, useCategorias, useConta, useSair } from '../api/consultas';
import type { Cartao, Categoria, TipoCategoria } from '../api/tipos';
import { useAviso } from '../components/Avisos';
import { Folha } from '../components/Folha';
import { FormCartao, FormCategoria, FormSenha } from '../components/FormsAjustes';
import { Botao, Carregando, cx, Marca, Secao, Segmentado } from '../components/ui';
import { diaEMes } from '../lib/datas';
import { percentualDe, reais } from '../lib/dinheiro';
import { useTema } from '../lib/tema';

type Painel =
  | { tipo: 'categoria'; categoria?: Categoria; tipoCategoria: TipoCategoria }
  | { tipo: 'cartao'; cartao?: Cartao }
  | { tipo: 'senha' };

export function Ajustes() {
  const [painel, setPainel] = useState<Painel | null>(null);
  const fechar = () => setPainel(null);

  return (
    <div className="space-y-10 px-[18px] pt-1.5 lg:max-w-3xl lg:px-0">
      <RegraDeGuardar />
      <Aparencia />
      <Cartoes abrir={(cartao) => setPainel({ tipo: 'cartao', cartao })} />
      <Categorias abrir={(tipoCategoria, categoria) => setPainel({ tipo: 'categoria', tipoCategoria, categoria })} />
      <Conta trocarSenha={() => setPainel({ tipo: 'senha' })} />

      {painel?.tipo === 'categoria' && (
        <Folha titulo={painel.categoria ? 'Editar categoria' : painel.tipoCategoria === 'SAIDA' ? 'Nova categoria de gasto' : 'Nova categoria de entrada'} aoFechar={fechar}>
          <FormCategoria categoria={painel.categoria} tipo={painel.tipoCategoria} aoConcluir={fechar} />
        </Folha>
      )}
      {painel?.tipo === 'cartao' && (
        <Folha titulo={painel.cartao ? 'Editar cartão' : 'Novo cartão'} aoFechar={fechar}>
          <FormCartao cartao={painel.cartao} aoConcluir={fechar} />
        </Folha>
      )}
      {painel?.tipo === 'senha' && (
        <Folha titulo="Trocar senha" aoFechar={fechar}>
          <FormSenha aoConcluir={fechar} />
        </Folha>
      )}
    </div>
  );
}

function RegraDeGuardar() {
  const conta = useConta();
  const atualizar = useAtualizarConta();
  const avisar = useAviso();
  const salvo = conta.data?.percentualGuardar ?? 0;
  const [percentual, setPercentual] = useState(salvo);
  const mudar = (n: number) => setPercentual(Math.min(100, Math.max(0, n)));

  return (
    <Secao titulo="Quanto guardar de cada entrada">
      <div className="flex items-center gap-4">
        <div className="flex h-14 items-stretch border-b border-linha-forte">
          <button type="button" aria-label="Menos 1%" onClick={() => mudar(percentual - 1)} className="w-11 text-[22px] text-mudo hover:text-texto">
            −
          </button>
          <span className="largo grid w-24 place-items-center text-[32px]" aria-live="polite">
            {percentual}%
          </span>
          <button type="button" aria-label="Mais 1%" onClick={() => mudar(percentual + 1)} className="w-11 text-[22px] text-mudo hover:text-texto">
            +
          </button>
        </div>
        {percentual !== salvo && (
          <Botao variante="principal" carregando={atualizar.isPending} onClick={() => atualizar.mutate({ percentualGuardar: percentual }, { onSuccess: () => avisar('Regra salva') })}>
            Salvar
          </Botao>
        )}
      </div>
      <p className="mt-3 text-[14px] text-mudo">
        Ao lançar uma entrada de R$ 1.000,00, o app sugere guardar <b className="text-texto">R$ {reais(percentualDe(100_000, percentual))}</b> na caixinha padrão. Dá pra mudar na hora.
      </p>
    </Secao>
  );
}

function Aparencia() {
  const [tema, setTema] = useTema();
  return (
    <Secao titulo="Aparência">
      <div className="max-w-xs">
        <Segmentado
          rotulo="Tema"
          opcoes={[
            { valor: 'escuro', rotulo: 'Escuro' },
            { valor: 'claro', rotulo: 'Claro' },
          ]}
          valor={tema}
          onChange={setTema}
        />
      </div>
    </Secao>
  );
}

function Linha({ cor, titulo, detalhe, direita, apagada, onClick }: { cor: string; titulo: string; detalhe?: string; direita?: string; apagada?: boolean; onClick: () => void }) {
  return (
    <li>
      <button type="button" onClick={onClick} className={cx('grid w-full grid-cols-[3px_minmax(0,1fr)_auto_18px] items-center gap-3 border-b border-linha py-3 text-left hover:bg-superficie', apagada && 'opacity-55')}>
        <Marca cor={cor} className="h-full" />
        <span className="min-w-0">
          <b className="block truncate font-semibold">{titulo}</b>
          {detalhe && <small className="block truncate text-[12.5px] text-mudo">{detalhe}</small>}
        </span>
        <span className="text-[14px] font-semibold">{direita}</span>
        <ChevronRight size={18} className="text-mudo" />
      </button>
    </li>
  );
}

function Cartoes({ abrir }: { abrir: (cartao?: Cartao) => void }) {
  const cartoes = useCartoes();
  return (
    <Secao
      titulo="Cartões de crédito"
      direita={
        <button type="button" onClick={() => abrir()} className="text-cobre">
          + Novo cartão
        </button>
      }
    >
      {cartoes.isPending ? (
        <Carregando linhas={2} />
      ) : cartoes.data?.length ? (
        <ul className="border-t border-linha">
          {cartoes.data.map((c) => (
            <Linha
              key={c.id}
              cor={c.cor}
              titulo={c.nome}
              detalhe={`Fecha dia ${c.diaFechamento} · vence dia ${c.diaVencimento}${c.ativo ? ` · fatura aberta vence ${diaEMes(c.faturaAberta.vencimento)}` : ' · desativado'}`}
              direita={c.ativo ? reais(c.faturaAberta.totalCentavos) : undefined}
              apagada={!c.ativo}
              onClick={() => abrir(c)}
            />
          ))}
        </ul>
      ) : (
        <p className="text-[14px] text-mudo">Nenhum cartão. Cadastre para lançar compras no crédito e parceladas.</p>
      )}
    </Secao>
  );
}

function Categorias({ abrir }: { abrir: (tipo: TipoCategoria, categoria?: Categoria) => void }) {
  const categorias = useCategorias();
  const [tipo, setTipo] = useState<TipoCategoria>('SAIDA');
  const lista = (categorias.data ?? []).filter((c) => c.tipo === tipo);

  return (
    <Secao
      titulo="Categorias"
      direita={
        <button type="button" onClick={() => abrir(tipo)} className="text-cobre">
          + Nova categoria
        </button>
      }
    >
      <div className="mb-1 max-w-xs">
        <Segmentado
          rotulo="Tipo de categoria"
          opcoes={[
            { valor: 'SAIDA', rotulo: 'Gastos' },
            { valor: 'ENTRADA', rotulo: 'Entradas' },
          ]}
          valor={tipo}
          onChange={setTipo}
        />
      </div>
      {categorias.isPending ? (
        <Carregando linhas={4} />
      ) : (
        <ul>
          {lista.map((c) => (
            <Linha key={c.id} cor={c.cor} titulo={c.nome} detalhe={c.ativa ? undefined : 'Desativada'} apagada={!c.ativa} onClick={() => abrir(tipo, c)} />
          ))}
        </ul>
      )}
    </Secao>
  );
}

function Conta({ trocarSenha }: { trocarSenha: () => void }) {
  const conta = useConta();
  const sair = useSair();
  return (
    <Secao titulo="Conta">
      <p className="font-semibold">{conta.data?.nome}</p>
      <p className="text-[14px] text-mudo">{conta.data?.email}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Botao onClick={trocarSenha}>Trocar senha</Botao>
        <Botao variante="fantasma" onClick={() => sair.mutate()}>
          Sair
        </Botao>
      </div>
    </Secao>
  );
}
