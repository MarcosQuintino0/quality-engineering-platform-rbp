import { Faker, en } from '@faker-js/faker';

import { environment } from '../config/environment';

/**
 * Gerador de dados deterministico.
 *
 * A semente base vem da configuracao e e combinada com o indice do worker do
 * Playwright. Com isso a mesma execucao produz sempre os mesmos dados, mas
 * workers paralelos nunca geram a mesma sequencia e portanto nao disputam os
 * mesmos registros.
 */
function workerIndex(): number {
  const raw = process.env.TEST_WORKER_INDEX;
  const parsed = raw === undefined ? 0 : Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function createFaker(): Faker {
  const faker = new Faker({ locale: en });
  faker.seed(environment.dataSeed + workerIndex() * 1_000);
  return faker;
}

/**
 * Sufixo curto, unico dentro da execucao, usado para rotular todos os
 * registros criados pela suite. Serve tanto para evitar colisao entre testes
 * paralelos quanto para permitir identificar e limpar sobras.
 */
let sequence = 0;

export const TEST_DATA_PREFIX = 'QEP';

export function uniqueSuffix(): string {
  sequence += 1;
  const worker = workerIndex().toString().padStart(2, '0');
  const counter = sequence.toString().padStart(4, '0');
  // Base36 do relogio evita colisao entre execucoes distintas na mesma maquina.
  const clock = Date.now().toString(36).slice(-5);
  return `${worker}${counter}${clock}`;
}

/** Rotulo reconhecivel: permite distinguir massa da suite de dados do seed. */
export function testLabel(kind: string): string {
  return `${TEST_DATA_PREFIX}-${kind}-${uniqueSuffix()}`;
}
