import type { MessagePayload } from '../api-clients/types';

import { createFaker, testLabel } from './seeded-faker';

/**
 * Mensagem de contato valida.
 *
 * As faixas seguem a validacao real do servico: telefone de 11 a 21
 * caracteres, assunto de 5 a 100 e descricao de 20 a 2000.
 */
export function buildMessage(overrides: Partial<MessagePayload> = {}): MessagePayload {
  const faker = createFaker();
  const suffix = testLabel('M').slice(-6);

  const base: MessagePayload = {
    name: `Qa Contato ${suffix}`,
    email: `contato.${suffix.toLowerCase()}@example.test`,
    phone: faker.string.numeric({ length: 15 }),
    subject: `Assunto automatizado ${suffix}`,
    description: `Mensagem gerada automaticamente pela suite de testes ${suffix}. ${faker.lorem.sentence({ min: 8, max: 14 })}`,
  };

  return { ...base, ...overrides };
}
