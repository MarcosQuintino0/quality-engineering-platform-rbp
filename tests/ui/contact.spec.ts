import { buildMessage } from '../../framework/factories';
import { ContactForm } from '../../framework/components/contact-form.component';
import { expect, test } from '../../framework/fixtures/test-fixtures';
import { HomePage } from '../../framework/pages';
import { esperarStatus } from '../../framework/assertions/api-assertions';
import { rastrear } from '../../framework/reporting/qep';

test.describe('Contato pela interface', () => {
  test('QEP-025 mensagem enviada pela home chega a administracao', async ({
    page,
    clients,
    adminToken,
    recursos,
  }) => {
    rastrear({
      id: 'QEP-025',
      camada: 'interface',
      risco: 'medio',
      requisito: 'O formulario de contato registra a mensagem e o visitante recebe confirmacao.',
    });

    const mensagem = buildMessage();

    const home = new HomePage(page);
    await home.abrir();
    await home.irParaContato();

    const contato = new ContactForm(page);
    await contato.preencher(mensagem);
    await contato.enviar();

    await expect(
      contato.confirmacao(),
      'o visitante precisa receber confirmacao do envio',
    ).toBeVisible();

    // A confirmacao na tela nao garante que alguem vai ler a mensagem.
    const caixa = await clients.messages.list(adminToken);
    esperarStatus(caixa, 200, 'listagem de mensagens na administracao');

    const recebida = caixa.body.messages.find((item) => item.subject === mensagem.subject);
    expect(recebida, 'a mensagem enviada deveria aparecer na administracao').toBeDefined();
    recursos.track('message', (recebida as { id: number }).id);
  });
});
