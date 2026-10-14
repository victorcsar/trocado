import { QueryCache, QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiErro } from './cliente';
import type {
  Caixinha,
  Cartao,
  Categoria,
  LancamentoDetalhado,
  LancamentoEnvio,
  LancamentosDoMes,
  MesDaSerie,
  MovimentoCaixinha,
  ResumoDoMes,
  Usuario,
} from './tipos';

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    // Sessão expirou no meio do uso: volta para a tela de entrada
    onError: (erro) => {
      if (erro instanceof ApiErro && erro.status === 401) queryClient.setQueryData(['conta'], null);
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (tentativas, erro) => !(erro instanceof ApiErro && erro.status < 500) && tentativas < 2,
    },
  },
});

// ---------- Leitura ----------

export function useConta() {
  return useQuery({
    queryKey: ['conta'],
    queryFn: () =>
      api<{ usuario: Usuario }>('/conta')
        .then((r) => r.usuario)
        .catch((erro) => {
          if (erro instanceof ApiErro && erro.status === 401) return null;
          throw erro;
        }),
    staleTime: Infinity,
  });
}

export function useModo() {
  return useQuery({ queryKey: ['modo'], queryFn: () => api<{ demo: boolean }>('/auth/modo'), staleTime: Infinity });
}

export function useLancamentosDoMes(competencia: string) {
  return useQuery({
    queryKey: ['lancamentos', competencia],
    queryFn: () => api<LancamentosDoMes>(`/lancamentos?competencia=${competencia}`),
  });
}

export function useLancamento(id: string | undefined) {
  return useQuery({
    queryKey: ['lancamento', id],
    queryFn: () => api<LancamentoDetalhado>(`/lancamentos/${id}`),
    enabled: !!id,
    staleTime: 0,
  });
}

export function useResumoDoMes(competencia: string) {
  return useQuery({
    queryKey: ['resumo', 'mes', competencia],
    queryFn: () => api<ResumoDoMes>(`/resumo/mes?competencia=${competencia}`),
  });
}

export function useSerie(ate: string, quantidade = 12) {
  return useQuery({
    queryKey: ['resumo', 'serie', ate, quantidade],
    queryFn: () => api<{ meses: MesDaSerie[] }>(`/resumo/serie?ate=${ate}&quantidade=${quantidade}`).then((r) => r.meses),
  });
}

export function useCategorias() {
  return useQuery({
    queryKey: ['categorias'],
    queryFn: () => api<{ categorias: Categoria[] }>('/categorias').then((r) => r.categorias),
  });
}

export function useCartoes() {
  return useQuery({
    queryKey: ['cartoes'],
    queryFn: () => api<{ cartoes: Cartao[] }>('/cartoes').then((r) => r.cartoes),
  });
}

export function useCaixinhas() {
  return useQuery({
    queryKey: ['caixinhas'],
    queryFn: () => api<{ caixinhas: Caixinha[] }>('/caixinhas').then((r) => r.caixinhas),
  });
}

export function useMovimentosDaCaixinha(id: string) {
  return useQuery({
    queryKey: ['caixinhas', id, 'movimentos'],
    queryFn: () => api<{ caixinha: Caixinha; movimentos: MovimentoCaixinha[] }>(`/caixinhas/${id}/movimentos`),
  });
}

// ---------- Escrita ----------

/** Depois de mexer em dinheiro, tudo que mostra totais precisa ser recarregado. */
function useRecarregarNumeros() {
  const qc = useQueryClient();
  return () =>
    Promise.all(
      ['lancamentos', 'lancamento', 'resumo', 'caixinhas', 'cartoes'].map((chave) => qc.invalidateQueries({ queryKey: [chave] })),
    );
}

export function useSalvarLancamento() {
  const recarregar = useRecarregarNumeros();
  return useMutation({
    mutationFn: ({ id, dados }: { id?: string; dados: LancamentoEnvio }) =>
      id ? api(`/lancamentos/${id}`, 'PUT', dados) : api('/lancamentos', 'POST', dados),
    onSuccess: recarregar,
  });
}

export function useExcluirLancamento() {
  const recarregar = useRecarregarNumeros();
  return useMutation({ mutationFn: (id: string) => api(`/lancamentos/${id}`, 'DELETE'), onSuccess: recarregar });
}

export function useTransferir() {
  const recarregar = useRecarregarNumeros();
  return useMutation({
    mutationFn: (dados: { deId: string; paraId: string; valorCentavos: number; data: string; descricao?: string }) =>
      api('/caixinhas/transferencias', 'POST', dados),
    onSuccess: recarregar,
  });
}

export function useExcluirTransferencia() {
  const recarregar = useRecarregarNumeros();
  return useMutation({ mutationFn: (id: string) => api(`/caixinhas/transferencias/${id}`, 'DELETE'), onSuccess: recarregar });
}

/** Cadastro simples (categorias, cartões, caixinhas): criar, editar e excluir. */
export function useCadastro<T extends object>(recurso: 'categorias' | 'cartoes' | 'caixinhas') {
  const recarregar = useRecarregarNumeros();
  const qc = useQueryClient();
  const aoMudar = () => Promise.all([recarregar(), qc.invalidateQueries({ queryKey: [recurso] })]);
  return {
    salvar: useMutation({
      mutationFn: ({ id, dados }: { id?: string; dados: T }) =>
        id ? api(`/${recurso}/${id}`, 'PUT', dados) : api(`/${recurso}`, 'POST', dados),
      onSuccess: aoMudar,
    }),
    excluir: useMutation({ mutationFn: (id: string) => api(`/${recurso}/${id}`, 'DELETE'), onSuccess: aoMudar }),
  };
}

export function useEntrar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dados: { email: string; senha: string }) => api<{ usuario: Usuario }>('/auth/entrar', 'POST', dados),
    onSuccess: ({ usuario }) => {
      // Tira dados de outra sessão sem derrubar a consulta da conta (o App observa ela)
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'conta' });
      qc.setQueryData(['conta'], usuario);
    },
  });
}

export function useSair() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api('/auth/sair', 'POST'),
    onSuccess: () => {
      qc.setQueryData(['conta'], null);
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'conta' && q.queryKey[0] !== 'modo' });
    },
  });
}

export function useAtualizarConta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dados: Partial<Pick<Usuario, 'nome' | 'percentualGuardar'>>) =>
      api<{ usuario: Usuario }>('/conta', 'PUT', dados),
    onSuccess: ({ usuario }) => qc.setQueryData(['conta'], usuario),
  });
}

export function useTrocarSenha() {
  return useMutation({
    mutationFn: (dados: { senhaAtual: string; novaSenha: string }) => api('/conta/senha', 'PUT', dados),
  });
}
