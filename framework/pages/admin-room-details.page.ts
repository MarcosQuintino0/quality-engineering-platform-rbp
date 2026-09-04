import type { Locator, Page } from '@playwright/test';

/** Detalhe administrativo de um quarto, onde a edicao acontece. */
export class AdminRoomDetailsPage {
  private readonly botaoEditar: Locator;
  private readonly botaoAtualizar: Locator;
  private roomId: number | undefined;

  constructor(private readonly page: Page) {
    this.botaoEditar = page.getByRole('button', { name: 'Edit' });
    this.botaoAtualizar = page.locator('#update');
  }

  /**
   * Abre o detalhe e so retorna quando os dados do quarto ja chegaram.
   *
   * O botao Edit e renderizado antes do fetch do quarto terminar, entao
   * espera-lo nao basta: seria possivel entrar em edicao com o formulario
   * ainda vazio, preencher um campo e ve-lo sobrescrito quando a resposta
   * chegasse. O titulo so exibe "Room: <nome>" depois que o estado e
   * populado, e por isso e ele o sinal de que a pagina esta pronta.
   */
  async abrir(roomId: number): Promise<void> {
    this.roomId = roomId;
    await this.page.goto(`/admin/room/${roomId}`);
    await this.page.getByRole('heading', { name: /^Room: \S+/ }).waitFor({ state: 'visible' });
  }

  async entrarEmEdicao(): Promise<void> {
    await this.botaoEditar.click();
    await this.botaoAtualizar.waitFor({ state: 'visible' });
  }

  async alterar(campos: {
    roomPrice?: number;
    type?: string;
    description?: string;
  }): Promise<void> {
    if (campos.roomPrice !== undefined) {
      await this.page.locator('#roomPrice').fill(String(campos.roomPrice));
    }
    if (campos.type !== undefined) {
      await this.page.locator('#type').selectOption(campos.type);
    }
    if (campos.description !== undefined) {
      await this.page.locator('#description').fill(campos.description);
    }
  }

  /**
   * Salva e aguarda a resposta do servidor.
   *
   * Esperar apenas o formulario fechar seria enganoso: a saida do modo de
   * edicao acontece no cliente e nao prova que a alteracao chegou a ser
   * gravada.
   */
  async salvar(): Promise<void> {
    const resposta = this.page.waitForResponse(
      (response) =>
        response.url().includes(`/api/room/${this.roomId ?? ''}`) &&
        response.request().method() === 'PUT',
    );

    await this.botaoAtualizar.click();
    await resposta;
    await this.botaoEditar.waitFor({ state: 'visible' });
  }

  conteudo(): Locator {
    return this.page.locator('body');
  }
}
