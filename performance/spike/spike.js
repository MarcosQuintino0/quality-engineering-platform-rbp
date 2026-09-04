import { consultarDisponibilidade, dataFutura, listarQuartos } from '../lib/rbp.js';

/**
 * PERF-004 — pico repentino em fluxo predominantemente de leitura.
 *
 * Simula o padrao de uma divulgacao ou promocao: trafego baixo, salto abrupto,
 * e volta ao normal. O que se verifica nao e apenas o comportamento no pico,
 * mas a recuperacao depois dele.
 */
export const options = {
  stages: [
    { duration: '15s', target: 10 },
    { duration: '10s', target: 200 },
    { duration: '20s', target: 200 },
    { duration: '10s', target: 10 },
    { duration: '15s', target: 10 },
  ],
  thresholds: {
    // Limite mais folgado que o de carga: durante um pico, latencia maior e
    // aceitavel. O que nao e aceitavel e erro, e por isso a taxa de falha
    // continua exigente.
    http_req_duration: ['p(95)<250'],
    http_req_failed: ['rate<0.02'],
    checks: ['rate>0.98'],
  },
};

export default function () {
  listarQuartos();
  consultarDisponibilidade(dataFutura(30), dataFutura(32));
}
