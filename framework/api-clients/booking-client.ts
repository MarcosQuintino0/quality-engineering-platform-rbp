import type { APIRequestContext } from '@playwright/test';

import { criarComExclusao } from './creation-lock';
import { HttpClient, type ApiResponse } from './http-client';
import type { Booking, BookingPayload, CreatedBooking } from './types';

export interface BookingsResponse {
  bookings: Booking[];
}

export interface BookingSummary {
  bookingDates: { checkin: string; checkout: string };
}

export interface BookingSummariesResponse {
  bookings: BookingSummary[];
}

/**
 * Cliente de reservas.
 *
 * A criacao de reserva e publica no SUT (um hospede reserva sem estar
 * autenticado); leitura, alteracao e exclusao exigem token administrativo.
 */
export class BookingClient {
  private readonly http: HttpClient;

  constructor(request: APIRequestContext) {
    this.http = new HttpClient(request, 'booking');
  }

  async list(token: string, roomId?: number): Promise<ApiResponse<BookingsResponse>> {
    const options = roomId === undefined ? { token } : { token, params: { roomid: roomId } };
    return this.http.get<BookingsResponse>('/', options);
  }

  async getById(bookingId: number, token: string): Promise<ApiResponse<Booking>> {
    return this.http.get<Booking>(`/${bookingId}`, { token });
  }

  /** Serializada entre workers por causa de RBP-06. Ver creation-lock.ts. */
  async create(payload: BookingPayload): Promise<ApiResponse<CreatedBooking>> {
    return criarComExclusao(() => this.http.post<CreatedBooking>('/', payload));
  }

  async update(
    bookingId: number,
    payload: BookingPayload,
    token: string,
  ): Promise<ApiResponse<CreatedBooking>> {
    return this.http.put<CreatedBooking>(`/${bookingId}`, payload, { token });
  }

  async remove(bookingId: number, token: string): Promise<ApiResponse<never>> {
    return this.http.delete<never>(`/${bookingId}`, { token });
  }

  async summaries(roomId: number): Promise<ApiResponse<BookingSummariesResponse>> {
    return this.http.get<BookingSummariesResponse>('/summary', { params: { roomid: roomId } });
  }
}
