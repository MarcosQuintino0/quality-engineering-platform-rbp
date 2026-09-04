import type { APIRequestContext } from '@playwright/test';

import { criarComExclusao } from './creation-lock';
import { HttpClient, type ApiResponse } from './http-client';
import type { Message, MessagePayload } from './types';

/**
 * A listagem devolve um resumo, nao a mensagem completa, e usa "id" onde o
 * detalhe usa "messageid". A diferenca e do contrato do SUT e esta refletida
 * aqui de proposito, para que o teste exercite a forma real da resposta.
 */
export interface MessageSummary {
  id: number;
  name: string;
  subject: string;
  read: boolean;
}

export interface MessagesResponse {
  messages: MessageSummary[];
}

export interface MessageCount {
  count: number;
}

/** Cliente de mensagens de contato. O envio e publico; a leitura e protegida. */
export class MessageClient {
  private readonly http: HttpClient;

  constructor(request: APIRequestContext) {
    this.http = new HttpClient(request, 'message');
  }

  /** Serializada entre workers por causa de RBP-06. Ver creation-lock.ts. */
  async create(payload: MessagePayload): Promise<ApiResponse<Message>> {
    return criarComExclusao(() => this.http.post<Message>('/', payload));
  }

  async list(token: string): Promise<ApiResponse<MessagesResponse>> {
    return this.http.get<MessagesResponse>('/', { token });
  }

  async getById(messageId: number, token: string): Promise<ApiResponse<Message>> {
    return this.http.get<Message>(`/${messageId}`, { token });
  }

  async count(token: string): Promise<ApiResponse<MessageCount>> {
    return this.http.get<MessageCount>('/count', { token });
  }

  async remove(messageId: number, token: string): Promise<ApiResponse<never>> {
    return this.http.delete<never>(`/${messageId}`, { token });
  }
}
