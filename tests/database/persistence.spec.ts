import { bookingDb } from '../../framework/database/h2-client';
import { buildBooking, buildRoom, buildStayDates } from '../../framework/factories';
import { expect, test } from '../../framework/fixtures/test-fixtures';
import { esperarStatus } from '../../framework/assertions/api-assertions';
import { rastrear } from '../../framework/reporting/qep';

// Cada consulta ao banco sobe um container com a ferramenta JDBC, o que custa
// alguns segundos. O limite maior evita que o custo de infraestrutura seja
// confundido com lentidao da aplicacao.
test.describe('Persistencia em banco', () => {
  test.describe.configure({ timeout: 180_000 });

  test('QEP-028 valores atualizados na reserva chegam ao banco', async ({
    clients,
    adminToken,
    recursos,
  }) => {
    rastrear({
      id: 'QEP-028',
      camada: 'banco',
      risco: 'alto',
      requisito:
        'A atualizacao de uma reserva grava no banco os novos valores, e nao apenas na resposta da API.',
    });

    const quarto = await clients.rooms.create(buildRoom(), adminToken);
    esperarStatus(quarto, 201, 'preparacao: criacao do quarto');
    recursos.track('room', quarto.body.roomid);

    const original = buildBooking(quarto.body.roomid);
    const criada = await clients.bookings.create(original);
    esperarStatus(criada, 201, 'criacao da reserva');
    const bookingid = criada.body.bookingid;
    recursos.track('booking', bookingid);

    // Estado inicial no banco, para que a comparacao posterior seja significativa.
    const antes = bookingDb.byId(bookingid);
    expect(antes, `a reserva ${bookingid} deveria existir no banco apos a criacao`).toHaveLength(1);
    expect(antes[0]?.FIRSTNAME).toBe(original.firstname);

    // A estadia precisa mudar junto: atualizar mantendo as mesmas datas devolve
    // 409 nesta versao do SUT (RBP-02 em docs/known-issues.md).
    const novaEstadia = buildStayDates(4);
    const alterada = {
      ...original,
      firstname: 'Persistida',
      lastname: 'NoBanco',
      depositpaid: !original.depositpaid,
      bookingdates: novaEstadia,
    };

    const atualizada = await clients.bookings.update(bookingid, alterada, adminToken);
    esperarStatus(atualizada, 200, 'atualizacao da reserva');

    // A verificacao decisiva: o dado gravado, lido direto do H2 do servico.
    // Conferir pela mesma API que escreveu seria circular.
    const depois = bookingDb.byId(bookingid);
    expect(depois, `a reserva ${bookingid} deveria continuar unica no banco`).toHaveLength(1);

    const linha = depois[0];
    expect(linha?.FIRSTNAME).toBe('Persistida');
    expect(linha?.LASTNAME).toBe('NoBanco');
    expect(linha?.CHECKIN).toBe(novaEstadia.checkin);
    expect(linha?.CHECKOUT).toBe(novaEstadia.checkout);
    expect(linha?.ROOMID).toBe(quarto.body.roomid);
  });

  test('QEP-029 exclusao de reserva remove exatamente a linha correspondente', async ({
    clients,
    adminToken,
    recursos,
  }) => {
    rastrear({
      id: 'QEP-029',
      camada: 'banco',
      risco: 'medio',
      requisito:
        'Excluir uma reserva apaga sua linha no banco e preserva as demais reservas do mesmo quarto.',
    });

    const quarto = await clients.rooms.create(buildRoom(), adminToken);
    esperarStatus(quarto, 201, 'preparacao: criacao do quarto');
    const roomid = quarto.body.roomid;
    recursos.track('room', roomid);

    const primeira = await clients.bookings.create(buildBooking(roomid));
    esperarStatus(primeira, 201, 'criacao da primeira reserva');
    const segunda = await clients.bookings.create(buildBooking(roomid));
    esperarStatus(segunda, 201, 'criacao da segunda reserva');
    recursos.track('booking', segunda.body.bookingid);

    expect(
      bookingDb
        .byRoomId(roomid)
        .map((linha) => linha.BOOKINGID)
        .sort(),
      'as duas reservas criadas deveriam estar no banco',
    ).toEqual([primeira.body.bookingid, segunda.body.bookingid].sort());

    const removida = await clients.bookings.remove(primeira.body.bookingid, adminToken);
    esperarStatus(removida, 202, 'exclusao da primeira reserva');

    // A exclusao precisa atingir a linha certa e apenas ela. Uma clausula WHERE
    // errada poderia apagar tudo e a API ainda responderia 202.
    expect(
      bookingDb.countById(primeira.body.bookingid),
      'a reserva excluida nao pode continuar no banco',
    ).toBe(0);
    expect(
      bookingDb.countById(segunda.body.bookingid),
      'excluir uma reserva nao pode afetar as demais do mesmo quarto',
    ).toBe(1);

    // A ausencia de reservas orfas apos excluir o quarto nao e verificada aqui.
    // Hoje o SUT sempre as deixa: o servico de quartos apaga apenas a propria
    // tabela e nao coordena com o servico de reservas (RBP-05 em
    // docs/known-issues.md). Assertar a ausencia produziria um teste
    // permanentemente vermelho, que deixa de ser sinal; assertar a presenca
    // transformaria o defeito em contrato protegido pela suite. A verificacao
    // entra quando o produto passar a tratar o caso.
  });
});
