import { buildBooking, buildRoom, buildStayDates } from '../../framework/factories';
import { expect, test } from '../../framework/fixtures/test-fixtures';
import { esperarStatus } from '../../framework/assertions/api-assertions';
import { rastrear } from '../../framework/reporting/qep';

test.describe('Reservas', () => {
  test('QEP-008 reserva valida e criada para um quarto existente', async ({
    clients,
    adminToken,
    recursos,
  }) => {
    rastrear({
      id: 'QEP-008',
      camada: 'api',
      risco: 'alto',
      requisito: 'Hospede cria reserva sem autenticacao e recebe o identificador gerado.',
    });

    const quarto = await clients.rooms.create(buildRoom(), adminToken);
    esperarStatus(quarto, 201, 'preparacao: criacao do quarto');
    recursos.track('room', quarto.body.roomid);

    const reserva = buildBooking(quarto.body.roomid);
    const resposta = await clients.bookings.create(reserva);

    esperarStatus(resposta, 201, 'criacao de reserva');
    recursos.track('booking', resposta.body.bookingid);

    expect(resposta.body.bookingid).toBeGreaterThan(0);
    expect(resposta.body.booking).toMatchObject({
      roomid: quarto.body.roomid,
      firstname: reserva.firstname,
      lastname: reserva.lastname,
      depositpaid: reserva.depositpaid,
    });
    expect(resposta.body.booking.bookingdates).toEqual(reserva.bookingdates);
  });

  test('QEP-009 reservas podem ser filtradas pelo quarto', async ({
    clients,
    adminToken,
    recursos,
  }) => {
    rastrear({
      id: 'QEP-009',
      camada: 'api',
      risco: 'medio',
      requisito: 'Consulta por roomid devolve as reservas daquele quarto e nao de outros.',
    });

    const quarto = await clients.rooms.create(buildRoom(), adminToken);
    esperarStatus(quarto, 201, 'preparacao: criacao do quarto');
    recursos.track('room', quarto.body.roomid);

    const reserva = await clients.bookings.create(buildBooking(quarto.body.roomid));
    esperarStatus(reserva, 201, 'preparacao: criacao da reserva');
    recursos.track('booking', reserva.body.bookingid);

    const listagem = await clients.bookings.list(adminToken, quarto.body.roomid);

    esperarStatus(listagem, 200, 'listagem de reservas por quarto');
    expect(
      listagem.body.bookings.map((item) => item.bookingid),
      'a reserva criada deveria aparecer no filtro do seu proprio quarto',
    ).toContain(reserva.body.bookingid);

    // O filtro so tem valor se tambem excluir o que nao pertence ao quarto.
    const quartosRetornados = new Set(listagem.body.bookings.map((item) => item.roomid));
    expect(
      [...quartosRetornados],
      'o filtro nao pode devolver reservas de outros quartos',
    ).toEqual([quarto.body.roomid]);
  });

  test('QEP-010 reserva e atualizada por quem esta autenticado', async ({
    clients,
    adminToken,
    recursos,
  }) => {
    rastrear({
      id: 'QEP-010',
      camada: 'api',
      risco: 'alto',
      requisito: 'Atualizacao autorizada altera os dados da reserva e devolve o estado novo.',
    });

    const quarto = await clients.rooms.create(buildRoom(), adminToken);
    esperarStatus(quarto, 201, 'preparacao: criacao do quarto');
    recursos.track('room', quarto.body.roomid);

    const original = buildBooking(quarto.body.roomid);
    const criada = await clients.bookings.create(original);
    esperarStatus(criada, 201, 'preparacao: criacao da reserva');
    recursos.track('booking', criada.body.bookingid);

    // A atualizacao precisa mover a estadia para uma janela livre. Nesta
    // versao do SUT, atualizar mantendo as mesmas datas devolve 409, porque a
    // checagem de disponibilidade conta a propria reserva como conflito.
    // O defeito esta registrado em docs/known-issues.md.
    const alterada = {
      ...original,
      firstname: 'Renomeada',
      depositpaid: !original.depositpaid,
      bookingdates: buildStayDates(3),
    };

    const atualizada = await clients.bookings.update(criada.body.bookingid, alterada, adminToken);

    esperarStatus(atualizada, 200, 'atualizacao da reserva');
    expect(atualizada.body.booking).toMatchObject({
      bookingid: criada.body.bookingid,
      firstname: 'Renomeada',
      depositpaid: alterada.depositpaid,
    });
    expect(atualizada.body.booking.bookingdates).toEqual(alterada.bookingdates);
  });

  test('QEP-011 reserva e excluida por quem esta autenticado', async ({
    clients,
    adminToken,
    recursos,
  }) => {
    rastrear({
      id: 'QEP-011',
      camada: 'api',
      risco: 'alto',
      requisito: 'Exclusao autorizada remove a reserva, que deixa de ser consultavel.',
    });

    const quarto = await clients.rooms.create(buildRoom(), adminToken);
    esperarStatus(quarto, 201, 'preparacao: criacao do quarto');
    recursos.track('room', quarto.body.roomid);

    const criada = await clients.bookings.create(buildBooking(quarto.body.roomid));
    esperarStatus(criada, 201, 'preparacao: criacao da reserva');

    const removida = await clients.bookings.remove(criada.body.bookingid, adminToken);
    esperarStatus(removida, 202, 'exclusao da reserva');

    const consulta = await clients.bookings.getById(criada.body.bookingid, adminToken);
    esperarStatus(consulta, 404, 'consulta da reserva apos exclusao');
  });
});
