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
    // O alerta e buscado dentro do cartao de login, e nao na pagina inteira.
    // O Next injeta um #__next-route-announcer__ com role="alert" para anunciar
    // mudancas de rota a leitores de tela, e ele aparece de forma intermitente
    // apos navegacao no cliente. Sem o escopo, getByRole('alert') resolve para
    // dois elementos e o teste falha por strict mode em parte das execucoes.
    this.alerta = page.locator('.card').getByRole('alert');
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
