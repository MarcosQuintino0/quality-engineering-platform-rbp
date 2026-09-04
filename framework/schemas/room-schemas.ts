/** Contrato de um quarto, conforme serializado pelo servico rbp-room. */
export const roomSchema = {
  type: 'object',
  required: ['roomid', 'roomName', 'type', 'accessible', 'roomPrice', 'features'],
  properties: {
    roomid: { type: 'integer', minimum: 1 },
    roomName: { type: 'string', minLength: 1 },
    type: { type: 'string', enum: ['Single', 'Double', 'Twin', 'Family', 'Suite'] },
    accessible: { type: 'boolean' },
    image: { type: 'string' },
    description: { type: 'string' },
    features: { type: 'array', items: { type: 'string' } },
    roomPrice: { type: 'integer', minimum: 1, maximum: 999 },
  },
  additionalProperties: true,
} as const;

/** Contrato da listagem de quartos. */
export const roomsResponseSchema = {
  type: 'object',
  required: ['rooms'],
  properties: {
    rooms: { type: 'array', items: roomSchema },
  },
  additionalProperties: false,
} as const;
