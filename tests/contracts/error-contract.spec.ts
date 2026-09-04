import type { ValidationError } from '../../framework/api-clients';
import { expect, test } from '../../framework/fixtures/test-fixtures';
import { esperarStatus } from '../../framework/assertions/api-assertions';
import { obrigatorio } from '../../framework/assertions/obrigatorio';
import { rastrear } from '../../framework/reporting/qep';
import { validateContract, validationErrorSchema } from '../../framework/schemas';

test.describe('Contrato de erro', () => {
  test('QEP-016 payload invalido devolve contrato de erro consistente', async ({
    clients,
    adminToken,
  }) => {
    rastrear({
      id: 'QEP-016',
      camada: 'contrato',
      risco: 'alto',
      requisito:
        'Payload que viola as regras de validacao devolve 400 com {errorCode, error, errorMessage, fieldErrors}.',
    });

    // Tres violacoes de uma vez: nome vazio, tipo fora da lista permitida e
    // preco abaixo do minimo. Um contrato de erro util precisa relatar todas,
    // e nao apenas a primeira que o servico encontrar.
    const invalido = JSON.stringify({
      roomName: '',
      type: 'Penthouse',
      accessible: true,
      image: '/images/room1.jpg',
      description: 'quarto deliberadamente invalido',
      features: [],
      roomPrice: 0,
    });

    const resposta = await clients.rooms.createRaw(invalido, adminToken);

    esperarStatus(resposta, 400, 'criacao de quarto com payload invalido');

    const contrato = validateContract(validationErrorSchema, resposta.body);
    expect(contrato.errors, `contrato de erro violado: ${contrato.errors.join(' | ')}`).toEqual([]);

    const corpo = obrigatorio(
      resposta.body as ValidationError | undefined,
      'a resposta de erro deveria ter corpo JSON',
    );
    expect(
      corpo.fieldErrors.length,
      `esperado um erro por campo invalido, recebido: ${JSON.stringify(corpo.fieldErrors)}`,
    ).toBe(3);
  });
});
