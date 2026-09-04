import { sleep } from 'k6';
import exec from 'k6/execution';

import { consultarDisponibilidade, criarReserva, dataFutura, listarQuartos } from '../lib/rbp.js';

/**
 * PERF-003 — carga combinada de leitura com criacao controlada de reservas.
 *
 * Mede o comportamento quando escrita e leitura competem, que e o caso real:
 * a criacao de reserva percorre a regra de disponibilidade e escreve no banco,
 * enquanto as consultas seguem chegando.
 *
 * A escrita e deliberadamente minoritaria, uma a cada dez iteracoes, para
 * refletir a proporcao de um sistema de reservas, em que consultar e muito mais
 * frequente do que reservar.
 *
 * As reservas usam datas muito a frente e afastadas por iteracao, para que a
 * regra de conflito de datas nao transforme concorrencia legitima em erro.
 */
export const options = {
  stages: [
    { duration: '20s', target: 10 },
    { duration: '40s', target: 30 },
    { duration: '20s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(90)<25', 'p(95)<40'],
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
    // A escrita e mais cara que a leitura e merece limite proprio, senao o
    // volume de consultas diluiria uma degradacao na criacao de reservas.
    'http_req_duration{operacao:criar_reserva}': ['p(95)<120'],
  },
};

export default function () {
  listarQuartos();
  consultarDisponibilidade(dataFutura(30), dataFutura(32));

  if (exec.scenario.iterationInTest % 10 === 0) {
    // O quarto 1 vem do seed do SUT e existe sempre.
    criarReserva(1, exec.scenario.iterationInTest);
  }

  sleep(0.5);
}
