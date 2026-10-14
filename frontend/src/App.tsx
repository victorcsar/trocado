import { Navigate, Route, Routes } from 'react-router';
import { useConta } from './api/consultas';
import { LancarProvider } from './components/Lancar';
import { Layout } from './components/Layout';
import { Moeda } from './components/Logo';
import { ErroDeCarga } from './components/ui';
import { Ajustes } from './pages/Ajustes';
import { CaixinhaDetalhe } from './pages/CaixinhaDetalhe';
import { Caixinhas } from './pages/Caixinhas';
import { Entrar } from './pages/Entrar';
import { Mes } from './pages/Mes';
import { Resumo } from './pages/Resumo';

export function App() {
  const conta = useConta();

  if (conta.isPending) {
    return (
      <div className="grid min-h-dvh place-items-center" aria-busy aria-label="Carregando">
        <Moeda tamanho={36} className="animate-pulse" />
      </div>
    );
  }
  if (conta.isError) {
    return (
      <div className="grid min-h-dvh place-items-center px-6">
        <ErroDeCarga erro={conta.error} tentarDeNovo={() => conta.refetch()} />
      </div>
    );
  }
  if (!conta.data) return <Entrar />;

  return (
    <LancarProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Mes />} />
          <Route path="resumo" element={<Resumo />} />
          <Route path="caixinhas" element={<Caixinhas />} />
          <Route path="caixinhas/:id" element={<CaixinhaDetalhe />} />
          <Route path="ajustes" element={<Ajustes />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </LancarProvider>
  );
}
