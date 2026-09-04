import { buildBooking, buildRoom, buildStayDates } from '../../framework/factories';
import { expect, test } from '../../framework/fixtures/test-fixtures';
import { ReservationPage } from '../../framework/pages';
import { esperarStatus } from '../../framework/assertions/api-assertions';
import { obrigatorio } from '../../framework/assertions/obrigatorio';
import { rastrear } from '../../framework/reporting/qep';

test.describe('Jornada de reserva do hospede', () => {
  test('QEP-022 hospede reserva um quarto do inicio ao fim', async ({
    page,
    clients,
    adminToken,
    recursos,
  }) => {
    rastrear({
      id: 'QEP-022',
      camada: 'interface',
      risco: 'alto',
      requisito: 'O hospede escolhe datas, informa seus dados e recebe confirmacao da reserva.',
    });

    const quarto = await clients.rooms.create(buildRoom(), adminToken);
    esperarStatus(quarto, 201, 'preparacao: criacao do quarto');
    recursos.track('room', quarto.body.roomid);

    const estadia = buildStayDates(2);
    const hospede = buildBooking(quarto.body.roomid);

    const reserva = new ReservationPage(page);
    await reserva.abrirComDatas(quarto.body.roomid, estadia);
    await reserva.avancarParaDados();
    await reserva.preencherHospede({
      firstname: hospede.firstname,
      lastname: hospede.lastname,
      email: hospede.email as string,
      phone: hospede.phone as string,
    });
    await reserva.confirmar();

    await expect(
      reserva.confirmacao(),
      'a jornada deveria terminar com a confirmacao da reserva',
    ).toBeVisible();

    // Confirmar na tela nao prova que a reserva existe. A verificacao pela API
    // e o que distingue uma mensagem de sucesso de uma reserva de verdade.
    const registradas = await clients.bookings.list(adminToken, quarto.body.roomid);
    esperarStatus(registradas, 200, 'consulta das reservas do quarto');

    const criada = registradas.body.bookings.find(
      (item) => item.firstname === hospede.firstname && item.lastname === hospede.lastname,
    );
    const naPlataforma = obrigatorio(
      criada,
      'a reserva confirmada na tela deveria existir na plataforma',
    );
    recursos.track('booking', naPlataforma.bookingid);
    expect(naPlataforma.bookingdates.checkin).toBe(estadia.checkin);
  });

  test('QEP-023 reserva sem os dados obrigatorios e recusada com aviso', async ({
    page,
    clients,
    adminToken,
    recursos,
  }) => {
    rastrear({
      id: 'QEP-023',
      camada: 'interface',
      risco: 'medio',
      requisito: 'Enviar a reserva com os campos do hospede vazios exibe os erros e nao reserva.',
    });

    const quarto = await clients.rooms.create(buildRoom(), adminToken);
    esperarStatus(quarto, 201, 'preparacao: criacao do quarto');
    recursos.track('room', quarto.body.roomid);

    const reserva = new ReservationPage(page);
    await reserva.abrirComDatas(quarto.body.roomid, buildStayDates(2));
    await reserva.avancarParaDados();

    // Submete sem preencher nada.
    await reserva.confirmar();

    await expect(
      reserva.erros().first(),
      'os campos obrigatorios vazios precisam gerar aviso visivel',
    ).toBeVisible();
    await expect(reserva.confirmacao()).toHaveCount(0);

    // O aviso so tem valor se nada tiver sido gravado.
    const registradas = await clients.bookings.list(adminToken, quarto.body.roomid);
    esperarStatus(registradas, 200, 'consulta das reservas do quarto');
    expect(registradas.body.bookings, 'uma reserva recusada nao pode deixar registro').toHaveLength(
      0,
    );
  });

  test('QEP-024 combinacao invalida de datas nao gera reserva', async ({
    page,
    clients,
    adminToken,
    recursos,
  }) => {
    rastrear({
      id: 'QEP-024',
      camada: 'interface',
      risco: 'alto',
      requisito: 'Estadia com checkout anterior ao checkin nao pode produzir reserva.',
    });

    const quarto = await clients.rooms.create(buildRoom(), adminToken);
    esperarStatus(quarto, 201, 'preparacao: criacao do quarto');
    recursos.track('room', quarto.body.roomid);

    // Inverte a estadia: saida antes da entrada.
    const base = buildStayDates(2);
    const invertida = { checkin: base.checkout, checkout: base.checkin };

    const hospede = buildBooking(quarto.body.roomid);
    const reserva = new ReservationPage(page);
    await reserva.abrirComDatas(quarto.body.roomid, invertida);
    await reserva.avancarParaDados();
    await reserva.preencherHospede({
      firstname: hospede.firstname,
      lastname: hospede.lastname,
      email: hospede.email as string,
      phone: hospede.phone as string,
    });
    await reserva.confirmar();

    // O criterio e o efeito no sistema, e nao a forma do aviso: uma estadia
    // invertida nao pode virar reserva, seja qual for a mensagem exibida.
    const registradas = await clients.bookings.list(adminToken, quarto.body.roomid);
    esperarStatus(registradas, 200, 'consulta das reservas do quarto');
    expect(
      registradas.body.bookings,
      `uma estadia de ${invertida.checkin} a ${invertida.checkout} nao pode gerar reserva`,
    ).toHaveLength(0);
  });
});
