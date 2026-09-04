import type { APIRequestContext } from '@playwright/test';

import { HttpClient, type ApiResponse } from './http-client';
import type { Credentials } from './types';

/**
 * Cliente de autenticacao.
 *
 * O SUT nao devolve o token no corpo da resposta de login: ele responde 200
 * com corpo vazio e entrega o token no cabecalho Set-Cookie. Este cliente
 * expoe esse detalhe explicitamente em vez de escondê-lo, porque a forma do
 * contrato e justamente o que alguns cenarios precisam verificar.
 */
export class AuthClient {
  private readonly http: HttpClient;

  constructor(request: APIRequestContext) {
    this.http = new HttpClient(request, 'auth');
  }

  async login(credentials: Credentials): Promise<ApiResponse<never>> {
    return this.http.post<never>('/login', credentials);
  }

  async validate(token: string): Promise<ApiResponse<never>> {
    return this.http.post<never>('/validate', { token });
  }

  async logout(token: string): Promise<ApiResponse<never>> {
    return this.http.post<never>('/logout', { token });
  }

  /**
   * Extrai o token do cabecalho Set-Cookie de uma resposta de login.
   * Devolve undefined quando o cabecalho nao traz o cookie esperado, para que
   * o teste decida como tratar a ausencia.
   */
  static extractToken(response: ApiResponse<unknown>): string | undefined {
    const setCookie = response.headers['set-cookie'];
    if (setCookie === undefined) return undefined;

    const match = /(?:^|[\s;,])token=([^;,\s]+)/.exec(setCookie);
    return match?.[1];
  }
}
