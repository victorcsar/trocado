export class ApiErro extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** Erros por campo, quando a API recusa os dados (400) */
    readonly campos: Record<string, string[] | undefined> = {},
  ) {
    super(message);
    this.name = 'ApiErro';
  }

  /** Primeira mensagem do campo, para mostrar embaixo dele. */
  doCampo(campo: string): string | undefined {
    return this.campos[campo]?.[0];
  }
}

type Metodo = 'GET' | 'POST' | 'PUT' | 'DELETE';

export async function api<T>(caminho: string, metodo: Metodo = 'GET', corpo?: unknown): Promise<T> {
  let resposta: Response;
  try {
    resposta = await fetch(`/api${caminho}`, {
      method: metodo,
      headers: corpo === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
      credentials: 'same-origin',
    });
  } catch {
    throw new ApiErro('Sem conexão com o servidor', 0);
  }

  if (resposta.status === 204) return undefined as T;
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    const campos = dados.detalhes && typeof dados.detalhes === 'object' ? dados.detalhes : {};
    throw new ApiErro(dados.erro ?? 'Algo deu errado', resposta.status, campos);
  }
  return dados as T;
}

export function mensagemDeErro(erro: unknown): string {
  return erro instanceof Error ? erro.message : 'Algo deu errado';
}
