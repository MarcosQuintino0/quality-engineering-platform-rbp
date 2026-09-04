import * as path from 'node:path';

import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env'), quiet: true });

export type ServiceName = 'auth' | 'booking' | 'room' | 'branding' | 'message' | 'report';

/** Portas dos servidores TCP H2 que o SUT expoe quando dbServer=true. */
export interface DatabasePorts {
  readonly booking: number;
  readonly auth: number;
  readonly branding: number;
  readonly message: number;
  readonly room: number;
}

export interface Environment {
  /** Raiz do frontend, alvo dos testes de interface. */
  readonly baseUrl: string;
  /**
   * Endereco de cada microsservico.
   *
   * Os testes de API e contrato falam com os servicos diretamente, porque e
   * esse o contrato publicado da plataforma. O frontend expoe em /api/* uma
   * camada BFF com contrato proprio e diferente, coberta de ponta a ponta
   * pelos testes de interface. Ver docs/decisions/adr-0001-camada-de-api.md.
   */
  readonly services: Readonly<Record<ServiceName, string>>;
  readonly admin: { readonly username: string; readonly password: string };
  readonly database: {
    readonly enabled: boolean;
    readonly host: string;
    readonly ports: DatabasePorts;
    readonly user: string;
    readonly password: string;
  };
  /** Semente usada por todas as factories, para massas reproduziveis. */
  readonly dataSeed: number;
  readonly allowedTestHosts: readonly string[];
}

function text(name: string, fallback: string): string {
  const value = process.env[name];
  return value === undefined || value === '' ? fallback : value;
}

function numeric(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`A variavel ${name} precisa ser numerica, mas veio "${raw}".`);
  }
  return parsed;
}

function serviceUrl(name: string, fallbackPort: number): string {
  return text(`${name.toUpperCase()}_URL`, `http://localhost:${fallbackPort}`).replace(/\/+$/, '');
}

export const environment: Environment = {
  baseUrl: text('BASE_URL', 'http://localhost:8080').replace(/\/+$/, ''),
  services: {
    auth: serviceUrl('auth', 3004),
    booking: serviceUrl('booking', 3000),
    room: serviceUrl('room', 3001),
    branding: serviceUrl('branding', 3002),
    message: serviceUrl('message', 3006),
    report: serviceUrl('report', 3005),
  },
  admin: {
    username: text('ADMIN_USERNAME', 'admin'),
    password: text('ADMIN_PASSWORD', 'password'),
  },
  database: {
    enabled: text('DB_ENABLED', 'true') === 'true',
    host: text('DB_HOST', 'localhost'),
    ports: {
      booking: numeric('DB_BOOKING_PORT', 9090),
      auth: numeric('DB_AUTH_PORT', 9091),
      branding: numeric('DB_BRANDING_PORT', 9092),
      message: numeric('DB_MESSAGE_PORT', 9093),
      room: numeric('DB_ROOM_PORT', 9094),
    },
    user: text('DB_USER', 'user'),
    password: text('DB_PASSWORD', 'password'),
  },
  dataSeed: numeric('DATA_SEED', 20260903),
  allowedTestHosts: text('ALLOWED_TEST_HOSTS', 'localhost,127.0.0.1,host.docker.internal')
    .split(',')
    .map((host) => host.trim())
    .filter((host) => host.length > 0),
};

/**
 * Recusa execucoes destrutivas ou de carga fora da allowlist.
 *
 * Existe para que um erro de configuracao nunca aponte testes de carga,
 * escrita em massa ou limpeza de dados para a instancia publica do RBP.
 */
export function assertHostIsAllowedForDestructiveWork(targetUrl: string): void {
  let hostname: string;
  try {
    hostname = new URL(targetUrl).hostname;
  } catch {
    throw new Error(`URL invalida para verificacao de seguranca: "${targetUrl}".`);
  }

  if (!environment.allowedTestHosts.includes(hostname)) {
    throw new Error(
      `Host "${hostname}" nao esta na allowlist de testes (${environment.allowedTestHosts.join(', ')}). ` +
        'Operacoes destrutivas, de escrita em massa e de carga sao permitidas apenas em ambiente local.',
    );
  }
}
