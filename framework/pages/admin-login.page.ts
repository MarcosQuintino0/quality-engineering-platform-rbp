import type { Locator, Page } from '@playwright/test';

/**
 * Tela de login administrativo.
 *
 * O Page Object expoe o que a pessoa faz na tela, e nao cada elemento
 * presente nela. Por isso ha "entrar" e "mensagemDeErro", e nao getters para
 * cada input.
 */
export class AdminLoginPage {
  private readonly usuario: Locator;
  private readonly senha: Locator;
  private readonly botaoEntrar: Locator;
  private readonly alerta: Locator;

  constructor(private readonly page: Page) {
    this.usuario = page.getByLabel('Username');
    this.senha = page.getByLabel('Password');
    this.botaoEntrar = page.locator('#doLogin');
    // O alerta usa role="alert", que e a forma acessivel de anunciar erro.
    this.alerta = page.getByRole('alert');
  }

  async abrir(): Promise<void> {
    await this.page.goto('/admin');
    await this.botaoEntrar.waitFor({ state: 'visible' });
  }

  async preencher(usuario: string, senha: string): Promise<void> {
    await this.usuario.fill(usuario);
    await this.senha.fill(senha);
  }

  async enviar(): Promise<void> {
    await this.botaoEntrar.click();
  }

  async entrar(usuario: string, senha: string): Promise<void> {
    await this.preencher(usuario, senha);
    await this.enviar();
  }

  mensagemDeErro(): Locator {
    return this.alerta;
  }

  formularioDeLogin(): Locator {
    return this.botaoEntrar;
  }
}
