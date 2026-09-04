import http from 'k6/http';
import { check } from 'k6';

/**
 * Utilitarios compartilhados pelos cenarios de carga.
 *
 * Os cenarios falam com os microsservicos diretamente, e nao com o frontend:
 * medir o Next.js mediria renderizacao de pagina, e o risco R8 e sobre a
 * capacidade das APIs, em especial a consulta de disponibilidade.
 */
const BASE = __ENV.BASE_URL || 'http://host.docker.internal';

export const servicos = {
  auth: `${BASE}:3004/auth`,
  booking: `${BASE}:3000/booking`,
  room: `${BASE}:3001/room`,
};

/** Metricas de negocio, separadas das metricas de protocolo. */
export const CHECK_LISTAGEM = 'listagem de quartos devolve colecao nao vazia';
export const CHECK_DISPONIBILIDADE = 'consulta de disponibilidade responde 200';
export const CHECK_RESERVA = 'reserva criada com identificador';

export function listarQuartos() {
  const resposta = http.get(`${servicos.room}/`, { tags: { operacao: 'listar_quartos' } });

  check(resposta, {
    [CHECK_LISTAGEM]: (r) => {
      if (r.status !== 200) return false;
      try {
        return (r.json('rooms') || []).length > 0;
      } catch {
        return false;
      }
    },
  });

  return resposta;
}

export function consultarDisponibilidade(checkin, checkout) {
  const resposta = http.get(
    `${servicos.booking}/unavailable?checkin=${checkin}&checkout=${checkout}`,
    { tags: { operacao: 'disponibilidade' } },
  );

  check(resposta, { [CHECK_DISPONIBILIDADE]: (r) => r.status === 200 });
  return resposta;
}

export function autenticar() {
  const resposta = http.post(
    `${servicos.auth}/login`,
    JSON.stringify({ username: 'admin', password: 'password' }),
    { headers: { 'Content-Type': 'application/json' }, tags: { operacao: 'login' } },
  );

  check(resposta, { 'login responde 200': (r) => r.status === 200 });
  return resposta;
}

/** Data futura no formato yyyy-MM-dd, deslocada por um numero de dias. */
export function dataFutura(diasAFrente) {
  const data = new Date();
  data.setUTCDate(data.getUTCDate() + diasAFrente);
  return data.toISOString().slice(0, 10);
}

/**
 * Cria uma reserva para um quarto, em datas afastadas por iteracao para nao
 * disputar disponibilidade com as demais unidades virtuais.
 */
export function criarReserva(roomid, deslocamento) {
  const checkin = dataFutura(400 + deslocamento * 4);
  const checkout = dataFutura(400 + deslocamento * 4 + 2);

  const corpo = JSON.stringify({
    roomid,
    firstname: `Carga${String(deslocamento).slice(-6)}`,
    lastname: `Teste${String(deslocamento).slice(-6)}`,
    depositpaid: true,
    bookingdates: { checkin, checkout },
    email: 'carga@example.test',
    phone: '551199998888',
  });

  const resposta = http.post(`${servicos.booking}/`, corpo, {
    headers: { 'Content-Type': 'application/json' },
    tags: { operacao: 'criar_reserva' },
  });

  check(resposta, {
    [CHECK_RESERVA]: (r) => {
      if (r.status !== 201) return false;
      try {
        return r.json('bookingid') > 0;
      } catch {
        return false;
      }
    },
  });

  return resposta;
}
