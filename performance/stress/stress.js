import { consultarDisponibilidade, dataFutura, listarQuartos } from '../lib/rbp.js';

/**
 * Cenario de stress, usado para localizar o ponto em que a latencia comeca a
 * crescer. Nao roda no pipeline: e acionado manualmente, e sua saida alimenta a
 * calibragem dos limites dos demais cenarios.
 *
 * Sem pausa entre iteracoes, de proposito: aqui o objetivo e saturar, e nao
 * simular ritmo de uso real.
 */
export const options = {
  stages: [
    { duration: '15s', target: 50 },
    { duration: '20s', target: 150 },
    { duration: '20s', target: 300 },
    { duration: '15s', target: 0 },
  ],
  thresholds: {
    // Somente corretude: saturar e o objetivo, entao latencia alta aqui e
    // resultado esperado e nao motivo de reprovacao.
    http_req_failed: ['rate<0.05'],
  },
};

export default function () {
  listarQuartos();
  consultarDisponibilidade(dataFutura(30), dataFutura(32));
}
