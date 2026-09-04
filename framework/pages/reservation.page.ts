import type { Locator, Page } from '@playwright/test';

import type { BookingDates } from '../api-clients/types';

/**
 * Jornada de reserva do hospede, na pagina publica de um quarto.
 *
 * As datas sao informadas pela query string, e nao arrastando no calendario.
 * Nao e um atalho: e o mesmo caminho que a propria aplicacao usa, porque o
 * botao "Check Availability" da home navega para
 * /reservation/{id}?checkin=...&checkout=..., e o componente le esses
 * parametros para pre-selecionar a estadia. Automatizar o arrasto sobre as
 * celulas do react-big-calendar dependeria de posicao de pixel e do mes
 * exibido, o que produziria um teste fragil sem cobrir nada a mais.
 */
export class ReservationPage {
  private readonly botaoAvancar: Locator;

  constructor(private readonly page: Page) {
    this.botaoAvancar = page.locator('#doReservation');
  }

  /** Abre o quarto com a estadia ja selecionada. */
  async abrirComDatas(roomId: number, datas: BookingDates): Promise<void> {
    const parametros = new URLSearchParams({
      checkin: datas.checkin,
      checkout: datas.checkout,
    });
    await this.page.goto(`/reservation/${roomId}?${parametros.toString()}`);
    await this.botaoAvancar.waitFor({ state: 'visible' });
  }

  /** Avanca do calendario para o formulario de dados do hospede. */
  async avancarParaDados(): Promise<void> {
    await this.botaoAvancar.click();
    await this.campoNome().waitFor({ state: 'visible' });
  }

  campoNome(): Locator {
    return this.page.getByRole('textbox', { name: 'Firstname' });
  }

  async preencherHospede(dados: {
    firstname: string;
    lastname: string;
    email: string;
    phone: string;
  }): Promise<void> {
    await this.page.getByRole('textbox', { name: 'Firstname' }).fill(dados.firstname);
    await this.page.getByRole('textbox', { name: 'Lastname' }).fill(dados.lastname);
    await this.page.getByRole('textbox', { name: 'Email' }).fill(dados.email);
    await this.page.getByRole('textbox', { name: 'Phone' }).fill(dados.phone);
  }

  async confirmar(): Promise<void> {
    await this.page.getByRole('button', { name: 'Reserve Now' }).click();
  }

  confirmacao(): Locator {
    return this.page.getByRole('heading', { name: 'Booking Confirmed' });
  }

  /** Mensagens devolvidas pela validacao do servico de reservas. */
  erros(): Locator {
    return this.page.locator('.alert-danger');
  }
}
