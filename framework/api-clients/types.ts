/**
 * Modelos de dominio do Restful Booker Platform.
 *
 * Os nomes de campo seguem exatamente o contrato serializado pelo SUT, para
 * que qualquer divergencia apareca como falha de teste e nao seja mascarada
 * por uma camada de traducao.
 */

export type RoomType = 'Single' | 'Double' | 'Twin' | 'Family' | 'Suite';

export interface RoomPayload {
  roomName: string;
  type: RoomType;
  accessible: boolean;
  image: string;
  description: string;
  features: string[];
  roomPrice: number;
}

export interface Room extends RoomPayload {
  roomid: number;
}

export interface BookingDates {
  checkin: string;
  checkout: string;
}

export interface BookingPayload {
  roomid: number;
  firstname: string;
  lastname: string;
  depositpaid: boolean;
  bookingdates: BookingDates;
  email?: string;
  phone?: string;
}

export interface Booking extends BookingPayload {
  bookingid: number;
}

/** Resposta de criacao e atualizacao de reserva: envelope com a reserva dentro. */
export interface CreatedBooking {
  bookingid: number;
  booking: Booking;
}

export interface MessagePayload {
  name: string;
  email: string;
  phone: string;
  subject: string;
  description: string;
}

export interface Message extends MessagePayload {
  messageid: number;
}

export interface Credentials {
  username: string;
  password: string;
}

/**
 * Contrato de erro de validacao, produzido pelo
 * MethodArgumentNotValidExceptionHandler dos servicos Spring.
 */
export interface ValidationError {
  errorCode: number;
  error: string;
  errorMessage: string;
  fieldErrors: string[];
}
