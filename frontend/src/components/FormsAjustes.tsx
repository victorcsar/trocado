import { useState, type FormEvent } from 'react';
import { ApiErro } from '../api/cliente';
import { useCadastro, useTrocarSenha } from '../api/consultas';
import type { Cartao, Categoria, TipoCategoria } from '../api/tipos';
import { useAviso } from './Avisos';
import { CORES } from '../lib/rotulos';
import { Botao, Campo, Nota, SeletorDeCor } from './ui';

function useConcluir(aoConcluir: () => void) {
  const avisar = useAviso();
  return (texto: string) => {
    avisar(texto);
    aoConcluir();
  };
}

const erroDoCampo = (e: Error, campo: string) => (e instanceof ApiErro ? (e.doCampo(campo) ?? e.message) : e.message);

function Ativo({ valor, onChange, rotulo, dica }: { valor: boolean; onChange: (v: boolean) => void; rotulo: string; dica: string }) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span>
        <span className="block font-semibold">{rotulo}</span>
        <span className="text-[13px] text-mudo">{dica}</span>
      </span>
      <input type="checkbox" checked={valor} onChange={(e) => onChange(e.target.checked)} className="size-5 accent-[var(--cobre)]" />
    </label>
  );
}

export function FormCategoria({ categoria, tipo, aoConcluir }: { categoria?: Categoria; tipo: TipoCategoria; aoConcluir: () => void }) {
  const [nome, setNome] = useState(categoria?.nome ?? '');
  const [cor, setCor] = useState(categoria?.cor ?? CORES[6]!);
  const [ativa, setAtiva] = useState(categoria?.ativa ?? true);
  const [erro, setErro] = useState<string>();
  const { salvar, excluir } = useCadastro('categorias');
  const concluir = useConcluir(aoConcluir);

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (!nome.trim()) return setErro('Dê um nome à categoria');
    const dados = categoria ? { nome: nome.trim(), cor, ativa } : { nome: nome.trim(), cor, tipo };
    salvar.mutate({ id: categoria?.id, dados }, { onSuccess: () => concluir(categoria ? 'Categoria salva' : 'Categoria criada'), onError: (e) => setErro(erroDoCampo(e, 'nome')) });
  }

  return (
    <form onSubmit={enviar} noValidate className="space-y-6">
      <Campo rotulo="Nome" value={nome} maxLength={40} onChange={(e) => setNome(e.target.value)} autoFocus />
      <SeletorDeCor valor={cor} onChange={setCor} />
      {categoria && <Ativo valor={ativa} onChange={setAtiva} rotulo="Ativa" dica="Desativada, some da lista ao lançar, mas o histórico continua." />}
      {erro && <Nota cor="var(--vermelho)">{erro}</Nota>}
      <Botao type="submit" variante="principal" className="w-full" carregando={salvar.isPending}>
        {categoria ? 'Salvar' : 'Criar categoria'}
      </Botao>
      {categoria && (
        <Botao
          type="button"
          variante="perigo"
          className="w-full"
          onClick={() => excluir.mutate(categoria.id, { onSuccess: () => concluir('Categoria excluída'), onError: (e) => setErro(e.message) })}
        >
          Excluir (só se nunca foi usada)
        </Botao>
      )}
    </form>
  );
}

export function FormCartao({ cartao, aoConcluir }: { cartao?: Cartao; aoConcluir: () => void }) {
  const [nome, setNome] = useState(cartao?.nome ?? '');
  const [fechamento, setFechamento] = useState(String(cartao?.diaFechamento ?? ''));
  const [vencimento, setVencimento] = useState(String(cartao?.diaVencimento ?? ''));
  const [cor, setCor] = useState(cartao?.cor ?? CORES[7]!);
  const [ativo, setAtivo] = useState(cartao?.ativo ?? true);
  const [erros, setErros] = useState<Record<string, string | undefined>>({});
  const { salvar, excluir } = useCadastro('cartoes');
  const concluir = useConcluir(aoConcluir);

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    const dia = (texto: string) => Number(texto);
    const valido = (texto: string) => Number.isInteger(dia(texto)) && dia(texto) >= 1 && dia(texto) <= 31;
    const faltando = {
      nome: nome.trim() ? undefined : 'Dê um nome ao cartão',
      diaFechamento: valido(fechamento) ? undefined : 'Dia entre 1 e 31',
      diaVencimento: valido(vencimento) ? (fechamento === vencimento ? 'Não pode ser o mesmo dia do fechamento' : undefined) : 'Dia entre 1 e 31',
    };
    if (Object.values(faltando).some(Boolean)) return setErros(faltando);
    const dados = { nome: nome.trim(), diaFechamento: dia(fechamento), diaVencimento: dia(vencimento), cor, ...(cartao && { ativo }) };
    salvar.mutate(
      { id: cartao?.id, dados },
      {
        onSuccess: () => concluir(cartao ? 'Cartão salvo' : 'Cartão cadastrado'),
        onError: (e) =>
          setErros({
            geral: e.message,
            ...(e instanceof ApiErro && { diaFechamento: e.doCampo('diaFechamento'), diaVencimento: e.doCampo('diaVencimento') }),
          }),
      },
    );
  }

  return (
    <form onSubmit={enviar} noValidate className="space-y-6">
      <Campo rotulo="Nome" value={nome} maxLength={40} placeholder="Ex.: Nubank" onChange={(e) => setNome(e.target.value)} erro={erros.nome} autoFocus />
      <div className="grid grid-cols-2 gap-4">
        <Campo rotulo="Fecha no dia" inputMode="numeric" value={fechamento} onChange={(e) => setFechamento(e.target.value.replace(/\D/g, '').slice(0, 2))} erro={erros.diaFechamento} />
        <Campo rotulo="Vence no dia" inputMode="numeric" value={vencimento} onChange={(e) => setVencimento(e.target.value.replace(/\D/g, '').slice(0, 2))} erro={erros.diaVencimento} />
      </div>
      <p className="text-[13px] text-mudo">
        Compras feitas a partir do dia do fechamento vão para a fatura seguinte. Cada compra entra no mês em que a fatura vence.
        {cartao && ' Mudar esses dias vale para as compras novas.'}
      </p>
      <SeletorDeCor valor={cor} onChange={setCor} />
      {cartao && <Ativo valor={ativo} onChange={setAtivo} rotulo="Ativo" dica="Desativado, some da lista ao lançar, mas as faturas continuam." />}
      {erros.geral && <Nota cor="var(--vermelho)">{erros.geral}</Nota>}
      <Botao type="submit" variante="principal" className="w-full" carregando={salvar.isPending}>
        {cartao ? 'Salvar' : 'Cadastrar cartão'}
      </Botao>
      {cartao && (
        <Botao
          type="button"
          variante="perigo"
          className="w-full"
          onClick={() => excluir.mutate(cartao.id, { onSuccess: () => concluir('Cartão excluído'), onError: (e) => setErros({ geral: e.message }) })}
        >
          Excluir (só sem compras)
        </Botao>
      )}
    </form>
  );
}

export function FormSenha({ aoConcluir }: { aoConcluir: () => void }) {
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [erro, setErro] = useState<string>();
  const trocar = useTrocarSenha();
  const concluir = useConcluir(aoConcluir);

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (nova.length < 8) return setErro('A nova senha precisa de pelo menos 8 caracteres');
    trocar.mutate({ senhaAtual: atual, novaSenha: nova }, { onSuccess: () => concluir('Senha trocada'), onError: (e) => setErro(e.message) });
  }

  return (
    <form onSubmit={enviar} noValidate className="space-y-6">
      <Campo rotulo="Senha atual" type="password" autoComplete="current-password" value={atual} onChange={(e) => setAtual(e.target.value)} autoFocus />
      <Campo rotulo="Nova senha" type="password" autoComplete="new-password" value={nova} onChange={(e) => setNova(e.target.value)} dica="Pelo menos 8 caracteres." />
      {erro && <Nota cor="var(--vermelho)">{erro}</Nota>}
      <Botao type="submit" variante="principal" className="w-full" carregando={trocar.isPending}>
        Trocar senha
      </Botao>
    </form>
  );
}
