import { sleep } from 'k6';

import { consultarDisponibilidade, dataFutura, listarQuartos } from '../lib/rbp.js';

/**
 * PERF-001 — smoke test.
 *
 * Uma unica unidade virtual, carga minima. Nao serve para medir capacidade:
 * serve para provar que o caminho medido funciona e para produzir a linha de
 * base de latencia sem concorrencia, contra a qual os demais cenarios sao
 * interpretados.
 *
 * Sem thresholds inventados: os limites dos cenarios de carga vem da medicao
 * registrada em docs/performance-strategy.md, e nao de um numero escolhido
 * porque parecia razoavel.
 */
export const options = {
  vus: 1,
  iterations: 30,
  thresholds: {
    // O unico limite aqui e de corretude: com uma unica unidade virtual e
    // ambiente ocioso, qualquer erro indica que o cenario esta medindo a coisa
    // errada, e nao saturacao.
    http_req_failed: ['rate==0'],
    checks: ['rate==1'],
  },
};

export default function () {
  listarQuartos();
  consultarDisponibilidade(dataFutura(30), dataFutura(32));
  sleep(0.2);
}
