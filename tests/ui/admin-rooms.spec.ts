import { buildRoom } from '../../framework/factories';
import { expect, test } from '../../framework/fixtures/test-fixtures';
import { AdminRoomDetailsPage, AdminRoomsPage } from '../../framework/pages';
import { esperarStatus } from '../../framework/assertions/api-assertions';
import { obrigatorio } from '../../framework/assertions/obrigatorio';
import { rastrear } from '../../framework/reporting/qep';

test.describe('Administracao de quartos pela interface', () => {
  test('QEP-019 quarto criado pela interface aparece na listagem', async ({
    paginaAdmin,
    clients,
    recursos,
  }) => {
    rastrear({
      id: 'QEP-019',
      camada: 'interface',
      risco: 'alto',
      requisito: 'O formulario de novo quarto grava os valores preenchidos e a listagem os exibe.',
    });

    const quarto = buildRoom({ type: 'Double', accessible: true, roomPrice: 275 });

    const rooms = new AdminRoomsPage(paginaAdmin);
    await rooms.abrir();
    await rooms.criarQuarto({
      roomName: quarto.roomName,
      type: quarto.type,
      accessible: quarto.accessible,
      roomPrice: quarto.roomPrice,
      features: ['WiFi', 'Safe'],
    });

    const linha = rooms.linhaPeloNome(quarto.roomName);
    await expect(linha, 'o quarto criado deveria aparecer na listagem').toBeVisible();

    // A listagem tambem precisa mostrar os valores enviados, e nao apenas o
    // nome: um formulario que grava o nome e perde o preco passaria numa
    // verificacao que so procurasse o titulo.
    await expect(linha).toContainText('Double');
    await expect(linha).toContainText('275');

    // Registra para limpeza buscando o identificador pela API, ja que a
    // interface nao o expoe.
    const listagem = await clients.rooms.list();
    esperarStatus(listagem, 200, 'listagem de quartos para localizar o criado');
    const criado = listagem.body.rooms.find((item) => item.roomName === quarto.roomName);
    const naApi = obrigatorio(criado, 'o quarto criado pela interface deveria existir na API');
    recursos.track('room', naApi.roomid);
  });

  test('QEP-020 alteracao feita na interface fica persistida', async ({
    paginaAdmin,
    clients,
    adminToken,
    recursos,
  }) => {
    rastrear({
      id: 'QEP-020',
      camada: 'interface',
      risco: 'medio',
      requisito: 'A edicao de um quarto grava o novo preco e ele permanece apos recarregar.',
    });

    const criado = await clients.rooms.create(buildRoom({ roomPrice: 100 }), adminToken);
    esperarStatus(criado, 201, 'preparacao: criacao do quarto via API');
    recursos.track('room', criado.body.roomid);

    const detalhes = new AdminRoomDetailsPage(paginaAdmin);
    await detalhes.abrir(criado.body.roomid);
    await detalhes.entrarEmEdicao();
    await detalhes.alterar({ roomPrice: 349, type: 'Suite' });
    await detalhes.salvar();

    // Recarregar e o que distingue "a tela mostrou" de "o sistema gravou".
    await paginaAdmin.reload();
    await expect(detalhes.conteudo()).toContainText('349');

    const confirmado = await clients.rooms.getById(criado.body.roomid);
    esperarStatus(confirmado, 200, 'consulta do quarto apos edicao pela interface');
    expect(confirmado.body.roomPrice).toBe(349);
    expect(confirmado.body.type).toBe('Suite');
  });

  test('QEP-021 exclusao pela interface remove o quarto', async ({
    paginaAdmin,
    clients,
    adminToken,
    recursos,
  }) => {
    rastrear({
      id: 'QEP-021',
      camada: 'interface',
      risco: 'medio',
      requisito: 'O controle de exclusao remove o quarto da listagem e da plataforma.',
    });

    const criado = await clients.rooms.create(buildRoom(), adminToken);
    esperarStatus(criado, 201, 'preparacao: criacao do quarto via API');
    const roomid = criado.body.roomid;

    // Registrado mesmo sendo o proprio teste que exclui, para que uma falha na
    // interface nao deixe o quarto para tras.
    recursos.track('room', roomid);

    const rooms = new AdminRoomsPage(paginaAdmin);
    await rooms.abrir();
    await expect(rooms.linhaDoQuarto(roomid)).toBeVisible();

    await rooms.excluirQuarto(roomid);

    await expect(
      rooms.linhaDoQuarto(roomid),
      'a linha do quarto deveria sumir da listagem apos a exclusao',
    ).toHaveCount(0);

    // A exclusao tem que valer na plataforma, e nao apenas na tela.
    const listagem = await clients.rooms.list();
    esperarStatus(listagem, 200, 'listagem de quartos apos exclusao pela interface');
    expect(listagem.body.rooms.map((item) => item.roomid)).not.toContain(roomid);
  });
});
