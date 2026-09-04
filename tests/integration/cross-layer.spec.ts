import { buildBooking, buildRoom, buildStayDates } from '../../framework/factories';
import { expect, test } from '../../framework/fixtures/test-fixtures';
import { AdminRoomDetailsPage, ReservationPage } from '../../framework/pages';
import { esperarStatus } from '../../framework/assertions/api-assertions';
import { obrigatorio } from '../../framework/assertions/obrigatorio';
import { rastrear } from '../../framework/reporting/qep';

test.describe('Integracao entre camadas', () => {
  test('QEP-026 quarto criado pela API e reservado pela interface aparece na API', async ({
    page,
    clients,
    adminToken,
    recursos,
  }) => {
    rastrear({
      id: 'QEP-026',
      camada: 'integracao',
      risco: 'alto',
      requisito:
        'Um quarto criado pela API fica reservavel na interface, e a reserva feita ali e visivel pela API.',
    });

    // Camada 1: a plataforma recebe o quarto pela API.
    const quarto = await clients.rooms.create(buildRoom({ roomPrice: 199 }), adminToken);
    esperarStatus(quarto, 201, 'criacao do quarto pela API');
    recursos.track('room', quarto.body.roomid);

    // Camada 2: o hospede reserva pela interface, sem saber que veio da API.
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
    await expect(reserva.confirmacao()).toBeVisible();

    // Camada 3: a API confirma o que a interface gravou.
    const registradas = await clients.bookings.list(adminToken, quarto.body.roomid);
    esperarStatus(registradas, 200, 'consulta das reservas pela API');

    const criada = registradas.body.bookings.find((item) => item.firstname === hospede.firstname);
    const confirmada = obrigatorio(criada, 'a reserva feita na interface deveria existir na API');
    recursos.track('booking', confirmada.bookingid);

    expect(confirmada).toMatchObject({
      roomid: quarto.body.roomid,
      lastname: hospede.lastname,
    });
    expect(confirmada.bookingdates).toEqual(estadia);
  });

  test('QEP-027 reserva criada pela API aparece na administracao', async ({
    paginaAdmin,
    clients,
    adminToken,
    recursos,
  }) => {
    rastrear({
      id: 'QEP-027',
      camada: 'integracao',
      risco: 'alto',
      requisito:
        'Uma reserva criada pela API e exibida na tela administrativa do quarto correspondente.',
    });

    const quarto = await clients.rooms.create(buildRoom(), adminToken);
    esperarStatus(quarto, 201, 'preparacao: criacao do quarto');
    recursos.track('room', quarto.body.roomid);

    const hospede = buildBooking(quarto.body.roomid);
    const reserva = await clients.bookings.create(hospede);
    esperarStatus(reserva, 201, 'criacao da reserva pela API');
    recursos.track('booking', reserva.body.bookingid);

    // Quem opera o hotel precisa enxergar, na tela, a reserva que entrou pela
    // API. E o caminho que uma integracao com canal externo percorreria.
    const detalhes = new AdminRoomDetailsPage(paginaAdmin);
    await detalhes.abrir(quarto.body.roomid);

    await expect(
      detalhes.conteudo(),
      'a administracao do quarto deveria mostrar o hospede da reserva criada pela API',
    ).toContainText(hospede.firstname);
    await expect(detalhes.conteudo()).toContainText(hospede.lastname);
  });
});
