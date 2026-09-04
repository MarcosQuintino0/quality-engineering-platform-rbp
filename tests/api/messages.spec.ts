import { buildMessage } from '../../framework/factories';
import { expect, test } from '../../framework/fixtures/test-fixtures';
import { esperarStatus } from '../../framework/assertions/api-assertions';
import { rastrear } from '../../framework/reporting/qep';

test.describe('Mensagens de contato', () => {
  test('QEP-012 mensagem de contato valida e registrada', async ({
    clients,
    adminToken,
    recursos,
  }) => {
    rastrear({
      id: 'QEP-012',
      camada: 'api',
      risco: 'medio',
      requisito: 'Visitante envia mensagem sem autenticacao e ela fica visivel na administracao.',
    });

    const mensagem = buildMessage();
    const resposta = await clients.messages.create(mensagem);

    esperarStatus(resposta, 201, 'criacao de mensagem de contato');
    recursos.track('message', resposta.body.messageid);

    expect(resposta.body.messageid).toBeGreaterThan(0);
    expect(resposta.body).toMatchObject({
      name: mensagem.name,
      email: mensagem.email,
      subject: mensagem.subject,
    });

    // Registrar nao basta: a mensagem so cumpre seu proposito se chegar a
    // quem administra o hotel.
    const listagem = await clients.messages.list(adminToken);
    esperarStatus(listagem, 200, 'listagem de mensagens na administracao');
    expect(
      listagem.body.messages.map((item) => item.id),
      'a mensagem enviada deveria aparecer na administracao',
    ).toContain(resposta.body.messageid);
  });
});
