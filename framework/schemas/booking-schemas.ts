const bookingDatesSchema = {
  type: 'object',
  required: ['checkin', 'checkout'],
  properties: {
    checkin: { type: 'string', format: 'date' },
    checkout: { type: 'string', format: 'date' },
  },
  additionalProperties: false,
} as const;

/** Contrato de uma reserva devolvida pelo servico rbp-booking. */
export const bookingSchema = {
  type: 'object',
  required: ['bookingid', 'roomid', 'firstname', 'lastname', 'depositpaid', 'bookingdates'],
  properties: {
    bookingid: { type: 'integer', minimum: 1 },
    roomid: { type: 'integer', minimum: 1 },
    firstname: { type: 'string', minLength: 3, maxLength: 18 },
    lastname: { type: 'string', minLength: 3, maxLength: 30 },
    depositpaid: { type: 'boolean' },
    bookingdates: bookingDatesSchema,
    email: { type: 'string' },
    phone: { type: 'string' },
  },
  additionalProperties: true,
} as const;

/** Envelope devolvido na criacao e na atualizacao de reserva. */
export const createdBookingSchema = {
  type: 'object',
  required: ['bookingid', 'booking'],
  properties: {
    bookingid: { type: 'integer', minimum: 1 },
    booking: bookingSchema,
  },
  additionalProperties: false,
} as const;

/** Contrato da listagem de reservas. */
export const bookingsResponseSchema = {
  type: 'object',
  required: ['bookings'],
  properties: {
    bookings: { type: 'array', items: bookingSchema },
  },
  additionalProperties: false,
} as const;
