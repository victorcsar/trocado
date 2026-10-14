import { Plus } from 'lucide-react';
import { NavLink, Outlet, useLocation, useSearchParams } from 'react-router';
import { useConta } from '../api/consultas';
import { useLancar } from './Lancar';
import { Logo } from './Logo';
import { SeletorMes } from './SeletorMes';
import { cx } from './ui';

const ABAS = [
  { para: '/', rotulo: 'Mês', levaMes: true },
  { para: '/resumo', rotulo: 'Resumo', levaMes: true },
  { para: '/caixinhas', rotulo: 'Caixinhas', levaMes: false },
  { para: '/ajustes', rotulo: 'Ajustes', levaMes: false },
];

export function Layout() {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const conta = useConta();
  const { abrir } = useLancar();
  const comMes = pathname === '/' || pathname === '/resumo';
  // Entre Mês e Resumo, o mês escolhido vai junto
  const destino = (aba: (typeof ABAS)[number]) => (aba.levaMes && params.get('mes') ? `${aba.para}?mes=${params.get('mes')}` : aba.para);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
      {/* Computador: menu lateral */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-linha lg:flex">
        <div className="flex h-[58px] items-center px-5">
          <Logo />
        </div>
        <nav className="mt-4 flex flex-col">
          {ABAS.map((aba) => (
            <NavLink
              key={aba.para}
              to={destino(aba)}
              end
              className={({ isActive }) =>
                cx(
                  'estreito border-l-[3px] px-5 py-3 text-[14px] font-bold tracking-[0.1em] uppercase transition-colors',
                  isActive ? 'border-cobre bg-superficie text-texto' : 'border-transparent text-mudo hover:text-texto',
                )
              }
            >
              {aba.rotulo}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 pt-6">
          <button type="button" onClick={() => abrir()} className="flex h-12 w-full items-center justify-center gap-2 bg-cobre font-semibold text-cobre-txt hover:brightness-110">
            <Plus size={18} /> Lançar
          </button>
          <p className="mt-2 text-center text-[12px] text-mudo">
            ou aperte <kbd className="font-semibold text-texto">N</kbd>
          </p>
        </div>
        <p className="mt-auto truncate border-t border-linha px-5 py-4 text-[13px] text-mudo">{conta.data?.nome}</p>
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-[58px] items-center justify-between bg-fundo/95 pr-2 pl-[18px] backdrop-blur lg:pr-6 lg:pl-8">
          <Logo className="lg:hidden" />
          <span className="rotulo hidden lg:block">{ABAS.find((a) => a.para === pathname)?.rotulo}</span>
          {comMes && <SeletorMes />}
        </header>
        <main className="flex-1 pb-[calc(84px+env(safe-area-inset-bottom))] lg:px-8 lg:pb-12">
          <div className="lg:max-w-[1180px]">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Celular: barra de baixo com o botão de lançar */}
      <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-[1fr_58px] border-t border-linha bg-fundo pb-[env(safe-area-inset-bottom)] lg:hidden">
        <nav className="flex">
          {ABAS.map((aba) => (
            <NavLink
              key={aba.para}
              to={destino(aba)}
              end
              className={({ isActive }) =>
                cx(
                  'estreito -mt-px grid h-[58px] flex-1 place-items-center border-t-2 text-[11.5px] font-bold tracking-[0.1em] uppercase',
                  isActive ? 'border-cobre text-texto' : 'border-transparent text-mudo',
                )
              }
            >
              {aba.rotulo}
            </NavLink>
          ))}
        </nav>
        <button type="button" onClick={() => abrir()} aria-label="Lançar" className="grid h-[58px] place-items-center bg-cobre text-cobre-txt">
          <Plus size={26} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
}
