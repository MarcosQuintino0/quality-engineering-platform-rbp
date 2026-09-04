import { test as base, type APIRequestContext } from '@playwright/test';

import { AuthClient, BookingClient, MessageClient, RoomClient } from '../api-clients';
import { ResourceTracker } from '../cleanup/resource-tracker';
import { environment } from '../config/environment';

export interface ApiClients {
  auth: AuthClient;
  rooms: RoomClient;
  bookings: BookingClient;
  messages: MessageClient;
}

export interface TestFixtures {
  clients: ApiClients;
  /**
   * Token administrativo compartilhado pelo worker.
   *
   * Cenarios que precisam invalidar a sessao devem abrir a propria sessao com
   * "novaSessao", para nao derrubar o token usado pelos demais testes do mesmo
   * worker.
   */
  adminToken: string;
  /** Abre uma sessao independente, descartavel pelo proprio teste. */
  novaSessao: () => Promise<string>;
  /** Recursos criados pelo teste, removidos automaticamente no teardown. */
  recursos: ResourceTracker;
}

export interface WorkerFixtures {
  workerToken: string;
}

async function autenticar(request: APIRequestContext): Promise<string> {
  const auth = new AuthClient(request);
  const response = await auth.login({
    username: environment.admin.username,
    password: environment.admin.password,
  });

  if (response.status !== 200) {
    throw new Error(
      `Falha ao autenticar como administrador: status ${response.status}. ` +
        'Verifique se o ambiente esta no ar (npm run env:status).',
    );
  }

  const token = AuthClient.extractToken(response);
  if (token === undefined) {
    throw new Error('Login respondeu 200 mas nao devolveu o cookie "token".');
  }

  return token;
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
  // Uma sessao administrativa por worker: evita um login por teste sem criar
  // dependencia entre testes, ja que o token e apenas credencial, nao estado.
  workerToken: [
    async ({ playwright }, use) => {
      const request = await playwright.request.newContext();
      try {
        await use(await autenticar(request));
      } finally {
        await request.dispose();
      }
    },
    { scope: 'worker' },
  ],

  clients: async ({ request }, use) => {
    await use({
      auth: new AuthClient(request),
      rooms: new RoomClient(request),
      bookings: new BookingClient(request),
      messages: new MessageClient(request),
    });
  },

  adminToken: async ({ workerToken }, use) => {
    await use(workerToken);
  },

  novaSessao: async ({ request }, use) => {
    await use(() => autenticar(request));
  },

  recursos: async ({ clients, adminToken }, use, testInfo) => {
    const tracker = new ResourceTracker(
      { rooms: clients.rooms, bookings: clients.bookings, messages: clients.messages },
      async () => adminToken,
    );

    await use(tracker);

    // Roda tambem quando o teste falha: sobra de dados de um teste quebrado
    // contamina os proximos e mascara defeitos reais.
    const report = await tracker.cleanup();

    if (report.failed.length > 0) {
      const detalhe = report.failed
        .map((item) => `${item.kind}#${item.id} (${item.reason})`)
        .join('; ');
      testInfo.annotations.push({ type: 'limpeza-incompleta', description: detalhe });
    }
  },
});

export { expect } from '@playwright/test';
