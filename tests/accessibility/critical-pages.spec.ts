import AxeBuilder from '@axe-core/playwright';

import baseline from './baseline.json';
import { buildRoom, buildStayDates } from '../../framework/factories';
import { expect, test } from '../../framework/fixtures/test-fixtures';
import { esperarStatus } from '../../framework/assertions/api-assertions';
import { rastrear } from '../../framework/reporting/qep';

/** Severidades que reprovam. Violacoes de impacto menor sao ignoradas aqui. */
const SEVERIDADES_BLOQUEANTES = ['serious', 'critical'];

const conhecidas: Record<string, Record<string, number>> = baseline.violacoesConhecidas;

interface Achado {
  pagina: string;
  regra: string;
  impacto: string;
  ocorrencias: number;
  ajuda: string;
}

test.describe('Acessibilidade', () => {
  test('QEP-030 paginas criticas nao introduzem violacoes serias ou criticas', async ({
    page,
    clients,
    adminToken,
    recursos,
  }, testInfo) => {
    rastrear({
      id: 'QEP-030',
      camada: 'acessibilidade',
      risco: 'medio',
      requisito:
        'Nenhuma violacao de acessibilidade de impacto serio ou critico alem das ja documentadas na baseline do SUT.',
    });

    const quarto = await clients.rooms.create(buildRoom(), adminToken);
    esperarStatus(quarto, 201, 'preparacao: criacao do quarto');
    recursos.track('room', quarto.body.roomid);

    const estadia = buildStayDates(2);
    const parametros = new URLSearchParams({
      checkin: estadia.checkin,
      checkout: estadia.checkout,
    });

    // O caminho que uma pessoa percorre para reservar, mais a porta de entrada
    // da administracao. Sao as telas onde uma barreira impede a tarefa inteira.
    const paginas = [
      { nome: 'Home', url: '/' },
      { nome: 'Reserva do quarto', url: `/reservation/${quarto.body.roomid}?${parametros.toString()}` },
      { nome: 'Login administrativo', url: '/admin' },
    ];

    const achados: Achado[] = [];

    for (const pagina of paginas) {
      await page.goto(pagina.url);
      await page.waitForLoadState('domcontentloaded');

      const resultado = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      for (const violacao of resultado.violations) {
        const impacto = violacao.impact;
        if (impacto === null || impacto === undefined) continue;
        if (!SEVERIDADES_BLOQUEANTES.includes(impacto)) continue;

        achados.push({
          pagina: pagina.nome,
          regra: violacao.id,
          impacto,
          ocorrencias: violacao.nodes.length,
          ajuda: violacao.help,
        });
      }
    }

    // Regressao: regra que nao esta na baseline, ou que passou a afetar mais
    // elementos do que o documentado.
    const regressoes = achados.filter((achado) => {
      const tolerado = conhecidas[achado.pagina]?.[achado.regra];
      return tolerado === undefined || achado.ocorrencias > tolerado;
    });

    // Melhoria: violacao conhecida que diminuiu ou desapareceu. Nao reprova,
    // mas fica anotada para que a baseline seja apertada em vez de envelhecer
    // permissiva.
    const melhorias: string[] = [];
    for (const [pagina, regras] of Object.entries(conhecidas)) {
      for (const [regra, tolerado] of Object.entries(regras)) {
        const atual = achados.find((item) => item.pagina === pagina && item.regra === regra);
        const ocorrencias = atual?.ocorrencias ?? 0;
        if (ocorrencias < tolerado) {
          melhorias.push(`[${pagina}] ${regra}: ${tolerado} -> ${ocorrencias}`);
        }
      }
    }

    if (melhorias.length > 0) {
      testInfo.annotations.push({
        type: 'baseline-de-acessibilidade-pode-ser-reduzida',
        description: melhorias.join('; '),
      });
    }

    const detalhe = regressoes
      .map(
        (item) =>
          `[${item.pagina}] ${item.regra} (${item.impacto}, ${item.ocorrencias} elementos, ` +
          `tolerado ${conhecidas[item.pagina]?.[item.regra] ?? 0}): ${item.ajuda}`,
      )
      .join('\n');

    expect(
      regressoes,
      `violacoes de acessibilidade alem da baseline documentada:\n${detalhe}`,
    ).toEqual([]);
  });
});
