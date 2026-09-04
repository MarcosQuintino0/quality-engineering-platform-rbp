import { environment } from '../../framework/config/environment';
import { expect, test } from '../../framework/fixtures/test-fixtures';
import { esperarStatus } from '../../framework/assertions/api-assertions';
import { rastrear } from '../../framework/reporting/qep';
import { authCookieContract } from '../../framework/schemas';

test.describe('Contrato de autenticacao', () => {
  test('QEP-013 resposta de login respeita o contrato de sessao', async ({ clients }) => {
    rastrear({
      id: 'QEP-013',
      camada: 'contrato',
      risco: 'alto',
      requisito:
        'Login valido responde 200 sem corpo e entrega a sessao em Set-Cookie com token alfanumerico e Path=/.',
    });

    const resposta = await clients.auth.login({
      username: environment.admin.username,
      password: environment.admin.password,
    });

    esperarStatus(resposta, 200, 'login para verificacao de contrato');

    // O contrato de autenticacao deste servico nao e um schema de corpo: a
    // resposta e vazia e a sessao viaja no cabecalho. Verificar um schema JSON
    // aqui nao provaria nada. A justificativa esta no ADR 0002.
    const contrato = authCookieContract(resposta.headers, resposta.raw);

    expect(
      contrato.errors,
      `contrato de autenticacao violado: ${contrato.errors.join(' | ')}`,
    ).toEqual([]);
    expect(contrato.valid).toBe(true);
  });
});
