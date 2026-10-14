import { useState, type FormEvent } from 'react';
import { useEntrar, useModo } from '../api/consultas';
import { Moeda } from '../components/Logo';
import { Botao, Campo, Nota } from '../components/ui';

const DEMO = { email: 'demo@trocado.app', senha: 'demonstracao' };

export function Entrar() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const entrar = useEntrar();
  const modo = useModo();

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    entrar.mutate({ email, senha });
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_480px]">
      <section className="flex flex-col justify-end bg-cobre px-[18px] pt-16 pb-8 text-cobre-txt lg:px-14 lg:pb-14">
        <Moeda tamanho={44} cor="var(--cobre-txt)" aro="var(--cobre)" />
        <h1 className="mt-5 text-[clamp(48px,14vw,92px)] leading-[0.9] font-extrabold tracking-[-0.05em] [font-stretch:125%]">trocado</h1>
        <p className="mt-4 max-w-md text-[17px] leading-snug font-medium">
          Quanto entra, quanto sai, quanto você guarda e quanto sobra no fim do mês.
        </p>
      </section>

      <form onSubmit={enviar} noValidate className="flex flex-col justify-center gap-6 px-[18px] py-10 lg:px-14">
        <h2 className="largo text-[26px]">Entrar</h2>
        <Campo rotulo="E-mail" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
        <Campo rotulo="Senha" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
        {entrar.isError && <Nota cor="var(--vermelho)">{entrar.error.message}</Nota>}
        <Botao type="submit" variante="principal" carregando={entrar.isPending}>
          Entrar
        </Botao>

        {modo.data?.demo && (
          <div className="border-t border-linha pt-6">
            <p className="text-[14px] text-mudo">Esta é a versão de demonstração, com 12 meses de dados fictícios.</p>
            <Botao type="button" className="mt-3 w-full" onClick={() => entrar.mutate(DEMO)}>
              Entrar na demonstração
            </Botao>
          </div>
        )}
      </form>
    </div>
  );
}
