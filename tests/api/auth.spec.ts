import { AuthClient } from '../../framework/api-clients';
import { environment } from '../../framework/config/environment';
import { buildRoom } from '../../framework/factories';
import { expect, test } from '../../framework/fixtures/test-fixtures';
import { esperarStatus } from '../../framework/assertions/api-assertions';
import { rastrear } from '../../framework/reporting/qep';

test.describe('Autenticacao', () => {
  test('QEP-001 credenciais validas abrem uma sessao utilizavel', async ({ clients }) => {
    rastrear({
      id: 'QEP-001',
      camada: 'api',
      risco: 'alto',
      requisito: 'Login valido devolve uma sessao que autoriza operacoes protegidas.',
    });

    const resposta = await clients.auth.login({
      username: environment.admin.username,
      password: environment.admin.password,
    });

    esperarStatus(resposta, 200, 'login com credenciais validas');

    // O SUT entrega a sessao no cabecalho Set-Cookie, nao no corpo.
    const token = AuthClient.extractToken(resposta);
    expect(token, 'a resposta de login deveria trazer o cookie "token"').toBeDefined();

    // Um token so vale alguma coisa se abrir uma porta: a prova de que a
    // sessao e utilizavel e o servico aceitar uma operacao protegida com ela,
    // e nao a mera presenca de uma string.
    const validacao = await clients.auth.validate(token as string);
    esperarStatus(validacao, 200, 'validacao do token recem-emitido');
  });

  test('QEP-002 credenciais invalidas sao rejeitadas', async ({ clients }) => {
    rastrear({
      id: 'QEP-002',
      camada: 'api',
      risco: 'alto',
      requisito: 'Senha incorreta nao produz sessao e responde 403.',
    });

    const resposta = await clients.auth.login({
      username: environment.admin.username,
      password: 'senha-deliberadamente-incorreta',
    });

    esperarStatus(resposta, 403, 'login com senha incorreta');
    expect(
      AuthClient.extractToken(resposta),
      'uma tentativa rejeitada nao pode emitir cookie de sessao',
    ).toBeUndefined();
  });

  test('QEP-003 operacao protegida sem autenticacao e bloqueada', async ({ clients }) => {
    rastrear({
      id: 'QEP-003',
      camada: 'api',
      risco: 'alto',
      requisito: 'Criacao de quarto exige sessao; sem token o servico responde 403.',
    });

    const resposta = await clients.rooms.create(buildRoom(), '');

    esperarStatus(resposta, 403, 'criacao de quarto sem token');

    // A verificacao nao para no status: se o recurso tivesse sido criado, o
    // bloqueio seria apenas aparente.
    expect(
      resposta.body,
      'uma requisicao bloqueada nao pode devolver um quarto criado',
    ).toBeUndefined();
  });
});
