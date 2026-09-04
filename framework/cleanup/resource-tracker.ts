import type { BookingClient, MessageClient, RoomClient } from '../api-clients';

export type ResourceKind = 'room' | 'booking' | 'message';

interface TrackedResource {
  kind: ResourceKind;
  id: number;
}

export interface CleanupClients {
  rooms: RoomClient;
  bookings: BookingClient;
  messages: MessageClient;
}

export interface CleanupReport {
  removed: TrackedResource[];
  failed: Array<TrackedResource & { reason: string }>;
}

/**
 * Registra os recursos criados por um teste e os remove ao final.
 *
 * A remocao acontece em ordem inversa a criacao, de modo que uma reserva seja
 * apagada antes do quarto a que pertence. A limpeza roda no teardown da
 * fixture, ou seja, tambem depois de um teste que falhou: dados de um teste
 * quebrado nao podem contaminar os proximos.
 *
 * Falhas de limpeza sao registradas e devolvidas em vez de lancadas, porque
 * mascarar o erro original de um teste com um erro de teardown atrapalha o
 * diagnostico. O relatorio permite que a fixture decida o que fazer.
 */
export class ResourceTracker {
  private readonly resources: TrackedResource[] = [];

  constructor(
    private readonly clients: CleanupClients,
    private readonly token: () => Promise<string>,
  ) {}

  track(kind: ResourceKind, id: number): void {
    this.resources.push({ kind, id });
  }

  get tracked(): readonly TrackedResource[] {
    return this.resources;
  }

  async cleanup(): Promise<CleanupReport> {
    const report: CleanupReport = { removed: [], failed: [] };
    if (this.resources.length === 0) return report;

    let token: string;
    try {
      token = await this.token();
    } catch (error) {
      for (const resource of this.resources.slice().reverse()) {
        report.failed.push({ ...resource, reason: `token indisponivel: ${describe(error)}` });
      }
      this.resources.length = 0;
      return report;
    }

    for (const resource of this.resources.slice().reverse()) {
      try {
        const status = await this.remove(resource, token);

        // 404 significa que o proprio teste ja removeu o recurso, o que e um
        // resultado valido de limpeza e nao uma falha.
        if (
          status === 200 ||
          status === 201 ||
          status === 202 ||
          status === 204 ||
          status === 404
        ) {
          report.removed.push(resource);
        } else {
          report.failed.push({ ...resource, reason: `status ${status}` });
        }
      } catch (error) {
        report.failed.push({ ...resource, reason: describe(error) });
      }
    }

    this.resources.length = 0;
    return report;
  }

  private async remove(resource: TrackedResource, token: string): Promise<number> {
    switch (resource.kind) {
      case 'room':
        return (await this.clients.rooms.remove(resource.id, token)).status;
      case 'booking':
        return (await this.clients.bookings.remove(resource.id, token)).status;
      case 'message':
        return (await this.clients.messages.remove(resource.id, token)).status;
    }
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
