import { environment } from '../../framework/config/environment';
import { expect, test } from '../../framework/fixtures/test-fixtures';
import { AdminLoginPage } from '../../framework/pages';
import { rastrear } from '../../framework/reporting/qep';

test.describe('Login administrativo', () => {
  test('QEP-017 administrador entra e alcanca a area restrita', async ({ page }) => {
    rastrear({
      id: 'QEP-017',
      camada: 'interface',
      risco: 'alto',
      requisito: 'Credenciais validas dao acesso a administracao de quartos.',
    });

    const login = new AdminLoginPage(page);
    await login.abrir();
    await login.entrar(environment.admin.username, environment.admin.password);

    // A prova de que o login funcionou e chegar ao conteudo restrito, e nao o
    // desaparecimento do formulario.
    await expect(page).toHaveURL(/\/admin\/rooms/);
    await expect(
      page.locator('#createRoom'),
      'a administracao de quartos deveria estar disponivel apos o login',
    ).toBeVisible();
  });

  test('QEP-018 credenciais invalidas mostram erro e mantem o usuario fora', async ({ page }) => {
    rastrear({
      id: 'QEP-018',
      camada: 'interface',
      risco: 'alto',
      requisito: 'Senha incorreta exibe aviso visivel e nao concede acesso.',
    });

    const login = new AdminLoginPage(page);
    await login.abrir();
    await login.entrar(environment.admin.username, 'senha-deliberadamente-incorreta');

    await expect(
      login.mensagemDeErro(),
      'o erro precisa ser anunciado de forma acessivel, com role="alert"',
    ).toBeVisible();

    // Mostrar o erro nao basta: o acesso tem que continuar bloqueado.
    await expect(page).not.toHaveURL(/\/admin\/rooms/);
    await expect(login.formularioDeLogin()).toBeVisible();
  });
});
