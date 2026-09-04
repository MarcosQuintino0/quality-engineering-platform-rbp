import { execFileSync } from 'node:child_process';
import * as path from 'node:path';

import { environment } from '../config/environment';

export type H2Database = 'booking' | 'auth' | 'branding' | 'message' | 'room';

/** Versao do driver H2 usada pelo SUT no commit fixado. */
const H2_VERSION = '2.4.240';
const JDK_IMAGE = 'eclipse-temurin:26-jdk';
const TOOL_DIR = path.resolve(__dirname, '..', '..', 'tools', 'db-query');

/**
 * Acesso somente leitura aos bancos H2 do SUT.
 *
 * O SUT usa H2 embarcado e oferece um servidor TCP oficial quando iniciado com
 * dbServer=true. Como o protocolo TCP do H2 e especifico da JVM e nao tem
 * driver maduro em Node, a consulta e delegada a uma ferramenta JDBC minima
 * executada num container, sem exigir JDK instalado na maquina e sem alterar
 * nada na aplicacao.
 *
 * O detalhamento esta em docs/decisions/adr-0003-acesso-ao-banco.md.
 */
export class H2Client {
  constructor(private readonly database: H2Database) {}

  private jdbcUrl(): string {
    const port = environment.database.ports[this.database];
    // O container acessa o host pelo nome especial host.docker.internal.
    return `jdbc:h2:tcp://host.docker.internal:${port}/mem:rbp-${this.database};MODE=MySQL`;
  }

  /**
   * Executa uma consulta e devolve as linhas como objetos.
   * Apenas comandos de leitura sao aceitos; a propria ferramenta recusa o resto.
   */
  query<T = Record<string, unknown>>(sql: string): T[] {
    if (!environment.database.enabled) {
      throw new Error('Consulta ao banco solicitada com DB_ENABLED=false.');
    }

    const output = execFileSync(
      'docker',
      [
        'run', '--rm',
        '--add-host=host.docker.internal:host-gateway',
        '-v', `${TOOL_DIR}:/tools:ro`,
        '-v', 'rbp-m2:/root/.m2:ro',
        JDK_IMAGE,
        'java',
        '-cp', `/root/.m2/repository/com/h2database/h2/${H2_VERSION}/h2-${H2_VERSION}.jar`,
        '/tools/DbQuery.java',
        this.jdbcUrl(),
        environment.database.user,
        environment.database.password,
        sql,
      ],
      { encoding: 'utf8', timeout: 60_000, stdio: ['ignore', 'pipe', 'pipe'] },
    );

    const json = output.trim();
    if (json === '') return [];

    try {
      return JSON.parse(json) as T[];
    } catch {
      throw new Error(`A consulta nao devolveu JSON valido. Saida: ${json.slice(0, 300)}`);
    }
  }
}

export interface BookingRow {
  BOOKINGID: number;
  ROOMID: number;
  FIRSTNAME: string;
  LASTNAME: string;
  DEPOSITPAID: boolean;
  CHECKIN: string;
  CHECKOUT: string;
}

/** Consultas de dominio, para os testes nao espalharem SQL solto. */
export const bookingDb = {
  byId(bookingId: number): BookingRow[] {
    return new H2Client('booking').query<BookingRow>(
      `SELECT * FROM BOOKINGS WHERE bookingid = ${assertInteger(bookingId)}`,
    );
  },
  countById(bookingId: number): number {
    const rows = new H2Client('booking').query<{ TOTAL: number }>(
      `SELECT COUNT(*) AS TOTAL FROM BOOKINGS WHERE bookingid = ${assertInteger(bookingId)}`,
    );
    return rows[0]?.TOTAL ?? 0;
  },
  byRoomId(roomId: number): BookingRow[] {
    return new H2Client('booking').query<BookingRow>(
      `SELECT * FROM BOOKINGS WHERE roomid = ${assertInteger(roomId)}`,
    );
  },
};

export const roomDb = {
  countById(roomId: number): number {
    const rows = new H2Client('room').query<{ TOTAL: number }>(
      `SELECT COUNT(*) AS TOTAL FROM ROOMS WHERE roomid = ${assertInteger(roomId)}`,
    );
    return rows[0]?.TOTAL ?? 0;
  },
};

/**
 * As consultas interpolam apenas identificadores numericos vindos das APIs do
 * proprio SUT. A validacao explicita impede que um valor inesperado se torne
 * SQL, mesmo num contexto de teste.
 */
function assertInteger(value: number): number {
  if (!Number.isInteger(value)) {
    throw new Error(`Identificador invalido para consulta: ${String(value)}`);
  }
  return value;
}
