import { buildBooking, buildRoom } from '../../framework/factories';
import { expect, test } from '../../framework/fixtures/test-fixtures';
import { esperarStatus } from '../../framework/assertions/api-assertions';
import { rastrear } from '../../framework/reporting/qep';
import { bookingsResponseSchema, createdBookingSchema, validateContract } from '../../framework/schemas';

test.describe('Contrato de reservas', () => {
  test('QEP-015 respostas de reserva respeitam o schema publicado', async ({
    clients,
    adminToken,
    recursos,
  }) => {
    rastrear({
      id: 'QEP-015',
      camada: 'contrato',
      risco: 'alto',
      requisito:
        'Criacao de reserva devolve o envelope {bookingid, booking} e a listagem devolve {bookings:[...]}.',
    });

    const quarto = await clients.rooms.create(buildRoom(), adminToken);
    esperarStatus(quarto, 201, 'preparacao: criacao do quarto');
    recursos.track('room', quarto.body.roomid);

    const criada = await clients.bookings.create(buildBooking(quarto.body.roomid));
    esperarStatus(criada, 201, 'criacao de reserva para verificacao de contrato');
    recursos.track('booking', criada.body.bookingid);

    const naCriacao = validateContract(createdBookingSchema, criada.body);
    expect(naCriacao.errors, `contrato da criacao violado: ${naCriacao.errors.join(' | ')}`).toEqual([]);

    const listagem = await clients.bookings.list(adminToken, quarto.body.roomid);
    esperarStatus(listagem, 200, 'listagem de reservas para verificacao de contrato');

    const naListagem = validateContract(bookingsResponseSchema, listagem.body);
    expect(naListagem.errors, `contrato da listagem violado: ${naListagem.errors.join(' | ')}`).toEqual([]);
  });
});
