import { sleep } from 'k6';

import { consultarDisponibilidade, dataFutura, listarQuartos } from '../lib/rbp.js';

/**
 * PERF-005 — soak local, carga moderada por periodo prolongado.
 *
 * Procura degradacao que so aparece com o tempo: vazamento de memoria, conexao
 * nao liberada, crescimento de estrutura interna. Uma execucao curta nao revela
 * nada disso, por isso a duracao e o parametro principal.
 *
 * A duracao e configuravel para que o cenario caiba tanto numa verificacao
 * rapida quanto numa execucao longa deliberada:
 *   K6_DURATION=30m npm run perf:soak
 */
export const options = {
  vus: 10,
  duration: __ENV.DURATION || '3m',
  thresholds: {
    http_req_duration: ['p(95)<40'],
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
  },
};

export default function () {
  listarQuartos();
  consultarDisponibilidade(dataFutura(30), dataFutura(32));
  sleep(1);
}
