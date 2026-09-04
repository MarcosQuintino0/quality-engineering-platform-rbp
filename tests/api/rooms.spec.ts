import { buildRoom } from '../../framework/factories';
import { expect, test } from '../../framework/fixtures/test-fixtures';
import { esperarStatus } from '../../framework/assertions/api-assertions';
import { rastrear } from '../../framework/reporting/qep';

test.describe('Quartos', () => {
  test('QEP-004 quarto valido e criado com os atributos enviados', async ({
    clients,
    adminToken,
    recursos,
  }) => {
    rastrear({
      id: 'QEP-004',
      camada: 'api',
      risco: 'alto',
      requisito: 'Criacao autorizada de quarto persiste os atributos enviados e devolve 201.',
    });

    const quarto = buildRoom();
    const resposta = await clients.rooms.create(quarto, adminToken);

    esperarStatus(resposta, 201, 'criacao de quarto');
    recursos.track('room', resposta.body.roomid);

    // O identificador e gerado pelo servico; o restante deve voltar igual ao
    // que foi enviado, senao a criacao alterou dados do cliente em silencio.
    expect(resposta.body.roomid).toBeGreaterThan(0);
    expect(resposta.body).toMatchObject({
      roomName: quarto.roomName,
      type: quarto.type,
      accessible: quarto.accessible,
      roomPrice: quarto.roomPrice,
      description: quarto.description,
    });
    expect(resposta.body.features).toEqual(quarto.features);
  });

  test('QEP-005 quarto criado pode ser consultado pelo identificador', async ({
    clients,
    adminToken,
    recursos,
  }) => {
    rastrear({
      id: 'QEP-005',
      camada: 'api',
      risco: 'alto',
      requisito: 'Consulta por identificador devolve o mesmo quarto que foi criado.',
    });

    const quarto = buildRoom();
    const criado = await clients.rooms.create(quarto, adminToken);
    esperarStatus(criado, 201, 'preparacao: criacao do quarto');
    recursos.track('room', criado.body.roomid);

    const consultado = await clients.rooms.getById(criado.body.roomid);

    esperarStatus(consultado, 200, 'consulta do quarto por identificador');
    expect(consultado.body.roomid).toBe(criado.body.roomid);
    expect(consultado.body.roomName).toBe(quarto.roomName);
    expect(consultado.body.roomPrice).toBe(quarto.roomPrice);
  });

  test('QEP-006 quarto e atualizado por quem esta autenticado', async ({
    clients,
    adminToken,
    recursos,
  }) => {
    rastrear({
      id: 'QEP-006',
      camada: 'api',
      risco: 'medio',
      requisito: 'Atualizacao autorizada altera os atributos e o novo estado fica consultavel.',
    });

    const original = buildRoom({ type: 'Single', roomPrice: 120 });
    const criado = await clients.rooms.create(original, adminToken);
    esperarStatus(criado, 201, 'preparacao: criacao do quarto');
    recursos.track('room', criado.body.roomid);

    const alterado = { ...original, type: 'Suite' as const, roomPrice: 480, accessible: true };
    const atualizado = await clients.rooms.update(criado.body.roomid, alterado, adminToken);

    // O servico responde 202 (Accepted) em atualizacao, nao 200.
    esperarStatus(atualizado, 202, 'atualizacao do quarto');

    // A resposta da atualizacao nao basta: o que importa e o estado que fica
    // gravado e visivel na consulta seguinte.
    const consultado = await clients.rooms.getById(criado.body.roomid);
    esperarStatus(consultado, 200, 'consulta apos atualizacao');
    expect(consultado.body).toMatchObject({
      type: 'Suite',
      roomPrice: 480,
      accessible: true,
    });
  });

  test('QEP-007 quarto e excluido por quem esta autenticado', async ({
    clients,
    adminToken,
    recursos,
  }) => {
    rastrear({
      id: 'QEP-007',
      camada: 'api',
      risco: 'medio',
      requisito: 'Exclusao autorizada remove o quarto da listagem da plataforma.',
    });

    const criado = await clients.rooms.create(buildRoom(), adminToken);
    esperarStatus(criado, 201, 'preparacao: criacao do quarto');
    const roomid = criado.body.roomid;

    // Registrado mesmo sendo o proprio teste que exclui: se a exclusao falhar,
    // ou o teste quebrar antes dela, o quarto nao pode ficar para tras. O
    // rastreador trata 404 como limpeza bem-sucedida, entao registrar aqui nao
    // gera falso alarme quando a exclusao do teste funciona.
    recursos.track('room', roomid);

    const removido = await clients.rooms.remove(roomid, adminToken);
    esperarStatus(removido, 202, 'exclusao do quarto');

    // A ausencia e verificada pela listagem, e nao pela consulta direta:
    // consultar um quarto excluido devolve 500 nesta versao do SUT, um defeito
    // registrado em docs/known-issues.md. Verificar pela listagem comprova a
    // exclusao sem transformar o defeito conhecido em criterio de aprovacao.
    const listagem = await clients.rooms.list();
    esperarStatus(listagem, 200, 'listagem de quartos apos exclusao');
    expect(
      listagem.body.rooms.map((quarto) => quarto.roomid),
      'o quarto excluido nao pode continuar na listagem',
    ).not.toContain(roomid);
  });
});
