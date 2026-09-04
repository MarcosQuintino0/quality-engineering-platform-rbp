import type { APIRequestContext } from '@playwright/test';

import { criarComExclusao } from './creation-lock';
import { HttpClient, type ApiResponse } from './http-client';
import type { Room, RoomPayload } from './types';

export interface RoomsResponse {
  rooms: Room[];
}

/** Cliente de quartos. Escrita exige token; leitura e publica. */
export class RoomClient {
  private readonly http: HttpClient;

  constructor(request: APIRequestContext) {
    this.http = new HttpClient(request, 'room');
  }

  async list(): Promise<ApiResponse<RoomsResponse>> {
    return this.http.get<RoomsResponse>('/');
  }

  async getById(roomId: number): Promise<ApiResponse<Room>> {
    return this.http.get<Room>(`/${roomId}`);
  }

  /**
   * A criacao passa por exclusao mutua entre workers por causa de RBP-06: o
   * SUT compartilha uma unica conexao JDBC entre threads e pode devolver o
   * identificador de outro recurso. Ver framework/api-clients/creation-lock.ts.
   */
  async create(payload: RoomPayload, token: string): Promise<ApiResponse<Room>> {
    return criarComExclusao(() => this.http.post<Room>('/', payload, { token }));
  }

  /** Envia um corpo cru, para exercitar payloads deliberadamente invalidos. */
  async createRaw(rawBody: string, token: string): Promise<ApiResponse<unknown>> {
    return this.http.post<unknown>('/', undefined, {
      token,
      rawBody,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async update(roomId: number, payload: RoomPayload, token: string): Promise<ApiResponse<Room>> {
    return this.http.put<Room>(`/${roomId}`, { roomid: roomId, ...payload }, { token });
  }

  async remove(roomId: number, token: string): Promise<ApiResponse<never>> {
    return this.http.delete<never>(`/${roomId}`, { token });
  }
}
