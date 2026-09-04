import type { Locator, Page } from '@playwright/test';

import type { RoomPayload } from '../api-clients/types';

/**
 * Listagem administrativa de quartos, onde o quarto tambem e criado e
 * excluido.
 */
export class AdminRoomsPage {
  private readonly nome: Locator;
  private readonly tipo: Locator;
  private readonly acessivel: Locator;
  private readonly preco: Locator;
  private readonly botaoCriar: Locator;

  constructor(private readonly page: Page) {
    this.nome = page.getByTestId('roomName');
    this.tipo = page.locator('#type');
    this.acessivel = page.locator('#accessible');
    this.preco = page.locator('#roomPrice');
    this.botaoCriar = page.locator('#createRoom');
  }

  async abrir(): Promise<void> {
    await this.page.goto('/admin/rooms');
    await this.botaoCriar.waitFor({ state: 'visible' });
  }

  /** Preenche e submete o formulario de novo quarto. */
  async criarQuarto(quarto: Pick<RoomPayload, 'roomName' | 'type' | 'accessible' | 'roomPrice'> & {
    features?: string[];
  }): Promise<void> {
    await this.nome.fill(quarto.roomName);
    await this.tipo.selectOption(quarto.type);
    await this.acessivel.selectOption(String(quarto.accessible));
    await this.preco.fill(String(quarto.roomPrice));

    for (const recurso of quarto.features ?? []) {
      await this.page.locator(`#${recurso.toLowerCase()}Checkbox`).check();
    }

    await this.botaoCriar.click();
  }

  /** Linha da listagem correspondente a um quarto, identificada pelo seu id. */
  linhaDoQuarto(roomId: number): Locator {
    return this.page.locator(`#room${roomId}`);
  }

  /** Linha localizada pelo nome exibido, quando o id ainda nao e conhecido. */
  linhaPeloNome(roomName: string): Locator {
    return this.page.getByTestId('roomlisting').filter({ hasText: roomName });
  }

  async abrirQuarto(roomId: number): Promise<void> {
    await this.linhaDoQuarto(roomId).locator('p').first().click();
  }

  async excluirQuarto(roomId: number): Promise<void> {
    await this.linhaDoQuarto(roomId).locator('.roomDelete').click();
  }

  mensagemDeErro(): Locator {
    return this.page.locator('.alert-danger');
  }
}
