import type { Locator, Page } from '@playwright/test';

/** Pagina inicial publica do hotel. */
export class HomePage {
  constructor(private readonly page: Page) {}

  async abrir(): Promise<void> {
    await this.page.goto('/');
    await this.page.locator('#rooms').waitFor({ state: 'visible' });
  }

  async irParaContato(): Promise<void> {
    await this.page.locator('#contact').scrollIntoViewIfNeeded();
  }

  secaoDeQuartos(): Locator {
    return this.page.locator('#rooms');
  }
}
