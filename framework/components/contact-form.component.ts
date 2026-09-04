import type { Locator, Page } from '@playwright/test';

import type { MessagePayload } from '../api-clients/types';

/**
 * Formulario de contato da pagina inicial.
 *
 * E um componente, e nao uma pagina: aparece dentro da home e tem
 * comportamento proprio, entao vive separado do Page Object da home.
 */
export class ContactForm {
  constructor(private readonly page: Page) {}

  async preencher(mensagem: MessagePayload): Promise<void> {
    await this.page.getByTestId('ContactName').fill(mensagem.name);
    await this.page.getByTestId('ContactEmail').fill(mensagem.email);
    await this.page.getByTestId('ContactPhone').fill(mensagem.phone);
    await this.page.getByTestId('ContactSubject').fill(mensagem.subject);
    await this.page.getByTestId('ContactDescription').fill(mensagem.description);
  }

  async enviar(): Promise<void> {
    await this.page.getByRole('button', { name: 'Submit' }).click();
  }

  /** Agradecimento exibido no lugar do formulario apos o envio. */
  confirmacao(): Locator {
    return this.page.getByRole('heading', { name: /Thanks for getting in touch/i });
  }

  erros(): Locator {
    return this.page.locator('.alert-danger');
  }
}
