import { buildRoom } from '../../framework/factories';
import { expect, test } from '../../framework/fixtures/test-fixtures';
import { esperarStatus } from '../../framework/assertions/api-assertions';
import { rastrear } from '../../framework/reporting/qep';
import { roomSchema, roomsResponseSchema, validateContract } from '../../framework/schemas';

test.describe('Contrato de quartos', () => {
  test('QEP-014 respostas de quarto respeitam o schema publicado', async ({
    clients,
    adminToken,
    recursos,
  }) => {
    rastrear({
      id: 'QEP-014',
      camada: 'contrato',
      risco: 'alto',
      requisito:
        'Criacao, consulta individual e listagem de quartos devolvem a mesma estrutura de quarto.',
    });

    const criado = await clients.rooms.create(buildRoom(), adminToken);
    esperarStatus(criado, 201, 'criacao de quarto para verificacao de contrato');
    recursos.track('room', criado.body.roomid);

    const naCriacao = validateContract(roomSchema, criado.body);
    expect(
      naCriacao.errors,
      `contrato da criacao violado: ${naCriacao.errors.join(' | ')}`,
    ).toEqual([]);

    const consultado = await clients.rooms.getById(criado.body.roomid);
    esperarStatus(consultado, 200, 'consulta de quarto para verificacao de contrato');

    const naConsulta = validateContract(roomSchema, consultado.body);
    expect(
      naConsulta.errors,
      `contrato da consulta violado: ${naConsulta.errors.join(' | ')}`,
    ).toEqual([]);

    // A listagem e o terceiro caminho em que o mesmo recurso aparece; um
    // contrato so e confiavel se as tres representacoes concordarem.
    const listagem = await clients.rooms.list();
    esperarStatus(listagem, 200, 'listagem de quartos para verificacao de contrato');

    const naListagem = validateContract(roomsResponseSchema, listagem.body);
    expect(
      naListagem.errors,
      `contrato da listagem violado: ${naListagem.errors.join(' | ')}`,
    ).toEqual([]);
  });
});
