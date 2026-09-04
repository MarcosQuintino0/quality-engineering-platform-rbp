import type { RoomPayload, RoomType } from '../api-clients/types';

import { createFaker, testLabel } from './seeded-faker';

const ROOM_TYPES: readonly RoomType[] = ['Single', 'Double', 'Twin', 'Family', 'Suite'];
const FEATURES: readonly string[] = ['WiFi', 'TV', 'Safe', 'Radio', 'Refreshments', 'Views'];

/**
 * Produz um quarto valido segundo as restricoes reais do SUT:
 * roomName obrigatorio, type restrito a lista fechada e roomPrice entre 1 e 999.
 *
 * O nome do quarto e limitado a 12 caracteres porque a coluna room_name e
 * exibida na administracao e nomes longos quebram a leitura das evidencias.
 */
export function buildRoom(overrides: Partial<RoomPayload> = {}): RoomPayload {
  const faker = createFaker();

  const base: RoomPayload = {
    roomName: testLabel('R').slice(0, 12),
    type: faker.helpers.arrayElement(ROOM_TYPES),
    accessible: faker.datatype.boolean(),
    image: '/images/room1.jpg',
    description: faker.lorem.sentence({ min: 6, max: 12 }),
    features: faker.helpers.arrayElements(FEATURES, { min: 1, max: 3 }),
    roomPrice: faker.number.int({ min: 50, max: 500 }),
  };

  return { ...base, ...overrides };
}

/** Quarto acessivel, usado pelos cenarios que dependem desse atributo. */
export function buildAccessibleRoom(overrides: Partial<RoomPayload> = {}): RoomPayload {
  return buildRoom({ accessible: true, ...overrides });
}
