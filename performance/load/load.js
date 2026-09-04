import { sleep } from 'k6';

import { consultarDisponibilidade, dataFutura, listarQuartos } from '../lib/rbp.js';

/**
 * PERF-002 — carga progressiva em consultas.
 *
 * Sobe a concorrencia em degraus sobre os dois endpoints de leitura mais
 * usados: listagem de quartos e consulta de disponibilidade. A subida em
 * degraus mostra onde a latencia comeca a crescer, o que uma carga constante
 * esconderia.
 *
 * Os limites vem de medicao, nao de estimativa. Ver a derivacao completa em
 * docs/performance-strategy.md.
 */
export const options = {
  stages: [
    { duration: '20s', target: 10 },
    { duration: '30s', target: 25 },
    { duration: '30s', target: 50 },
    { duration: '20s', target: 0 },
  ],
  thresholds: {
    // Medido neste perfil: p(90) 3,09ms e p(95) 3,26ms. O limite fica cerca de
    // cinco a oito vezes acima, margem que absorve variacao de maquina sem
    // deixar passar regressao real: no cenario de stress, com sessenta vezes
    // mais requisicoes por segundo, o p(95) chegou a apenas 17,2ms.
    http_req_duration: ['p(90)<15', 'p(95)<25'],
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
  },
};

export default function () {
  listarQuartos();
  consultarDisponibilidade(dataFutura(30), dataFutura(32));
  sleep(0.5);
}
