import type { Locator, Page } from '@playwright/test';

/** Detalhe administrativo de um quarto, onde a edicao acontece. */
export class AdminRoomDetailsPage {
  private readonly botaoEditar: Locator;
  private readonly botaoAtualizar: Locator;

  constructor(private readonly page: Page) {
    this.botaoEditar = page.getByRole('button', { name: 'Edit' });
    this.botaoAtualizar = page.locator('#update');
  }

  async abrir(roomId: number): Promise<void> {
    await this.page.goto(`/admin/room/${roomId}`);
    await this.botaoEditar.waitFor({ state: 'visible' });
  }

  async entrarEmEdicao(): Promise<void> {
    await this.botaoEditar.click();
    await this.botaoAtualizar.waitFor({ state: 'visible' });
  }

  async alterar(campos: { roomPrice?: number; type?: string; description?: string }): Promise<void> {
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

  async salvar(): Promise<void> {
    await this.botaoAtualizar.click();
    // A saida do modo de edicao e o estado observavel que indica conclusao.
    await this.botaoEditar.waitFor({ state: 'visible' });
  }

  conteudo(): Locator {
    return this.page.locator('body');
  }
}
