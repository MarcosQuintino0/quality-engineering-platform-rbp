import type { APIRequestContext, APIResponse } from '@playwright/test';

import { environment, type ServiceName } from '../config/environment';

/**
 * Resposta ja desempacotada, com o corpo lido uma unica vez.
 *
 * Os clientes devolvem sempre este envelope em vez de lancar excecao em
 * status de erro: decidir se um 403 e falha ou comportamento esperado e
 * responsabilidade do teste, nunca do cliente.
 */
export interface ApiResponse<T> {
  readonly status: number;
  readonly headers: Record<string, string>;
  readonly body: T;
  /** Corpo cru, util para diagnosticar respostas que nao sao JSON. */
  readonly raw: string;
}

export interface RequestOptions {
  /** Token de sessao, enviado como cookie, que e o mecanismo usado pelo SUT. */
  token?: string;
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
  /** Corpo enviado sem serializacao, para exercitar payloads malformados. */
  rawBody?: string;
}

async function envelope<T>(response: APIResponse): Promise<ApiResponse<T>> {
  const raw = await response.text();

  let body: T;
  try {
    body = raw.length > 0 ? (JSON.parse(raw) as T) : (undefined as T);
  } catch {
    // Corpo vazio ou nao-JSON e legitimo em varios endpoints do SUT: o login
    // responde 200 sem corpo, por exemplo. O texto cru continua disponivel.
    body = undefined as T;
  }

  return { status: response.status(), headers: response.headers(), body, raw };
}

function toPlaywright(options: RequestOptions): Record<string, unknown> {
  const headers: Record<string, string> = { ...options.headers };

  if (options.token !== undefined) {
    const existing = headers['Cookie'];
    const cookie = `token=${options.token}`;
    headers['Cookie'] = existing === undefined ? cookie : `${existing}; ${cookie}`;
  }

  const result: Record<string, unknown> = { headers };
  if (options.params !== undefined) result['params'] = options.params;
  if (options.rawBody !== undefined) result['data'] = options.rawBody;

  return result;
}

/**
 * Cliente HTTP fino sobre o APIRequestContext do Playwright, endereçando um
 * microsservico do SUT pela sua porta e context path proprios.
 */
export class HttpClient {
  private readonly base: string;

  constructor(
    private readonly request: APIRequestContext,
    service: ServiceName,
  ) {
    // Cada servico Spring publica seus endpoints sob um context path com o
    // proprio nome, por exemplo http://localhost:3001/room.
    this.base = `${environment.services[service]}/${service}`;
  }

  private url(suffix: string): string {
    return `${this.base}${suffix}`;
  }

  async get<T>(suffix: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    return envelope<T>(await this.request.get(this.url(suffix), toPlaywright(options)));
  }

  async post<T>(suffix: string, data: unknown, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const config = toPlaywright(options);
    if (options.rawBody === undefined) config['data'] = data;
    return envelope<T>(await this.request.post(this.url(suffix), config));
  }

  async put<T>(suffix: string, data: unknown, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const config = toPlaywright(options);
    if (options.rawBody === undefined) config['data'] = data;
    return envelope<T>(await this.request.put(this.url(suffix), config));
  }

  async delete<T>(suffix: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    return envelope<T>(await this.request.delete(this.url(suffix), toPlaywright(options)));
  }
}
