import type { BookingDates, BookingPayload } from '../api-clients/types';

import { createFaker, testLabel } from './seeded-faker';

/** Formata uma data no formato ISO de dia usado pelo contrato (yyyy-MM-dd). */
export function toIsoDate(date: Date): string {
  const iso = date.toISOString();
  return iso.slice(0, 10);
}

/**
 * Janela de datas futura e livre de conflito.
 *
 * Cada chamada afasta a estadia alguns dias a mais no futuro. Isso evita que
 * reservas criadas por testes paralelos no mesmo quarto colidam na regra de
 * disponibilidade do SUT, sem recorrer a esperas ou execucao serial.
 */
let dateOffsetDays = 30;

export function buildStayDates(nights = 2): BookingDates {
  dateOffsetDays += nights + 2;

  const checkin = new Date();
  checkin.setUTCDate(checkin.getUTCDate() + dateOffsetDays);

  const checkout = new Date(checkin);
  checkout.setUTCDate(checkout.getUTCDate() + nights);

  return { checkin: toIsoDate(checkin), checkout: toIsoDate(checkout) };
}

/**
 * Reserva valida. As restricoes de tamanho vem das anotacoes de validacao do
 * SUT: firstname entre 3 e 18 caracteres, lastname entre 3 e 30 e telefone
 * entre 11 e 21 caracteres.
 */
export function buildBooking(
  roomId: number,
  overrides: Partial<BookingPayload> = {},
): BookingPayload {
  const faker = createFaker();
  const suffix = testLabel('B').slice(-6);

  const base: BookingPayload = {
    roomid: roomId,
    firstname: `Qa${suffix}`.slice(0, 18),
    lastname: `Test${suffix}`.slice(0, 30),
    depositpaid: faker.datatype.boolean(),
    bookingdates: buildStayDates(),
    email: `qa.${suffix.toLowerCase()}@example.test`,
    phone: faker.string.numeric({ length: 15 }),
  };

  return { ...base, ...overrides };
}
