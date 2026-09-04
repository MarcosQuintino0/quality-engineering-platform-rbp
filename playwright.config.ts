import { defineConfig, devices, type Project } from '@playwright/test';

import { environment } from './framework/config/environment';

const isCI = process.env.CI === 'true' || process.env.CI === '1';

/**
 * Regressao em Firefox e opcional e fica fora da execucao padrao.
 *
 * O projeto ui-firefox reexecuta os mesmos nove cenarios de interface ja
 * cobertos em Chromium. Incluido por padrao, ele inflaria a contagem logica da
 * suite de 30 para 39 sem acrescentar um cenario sequer. Por isso e ativado
 * apenas sob demanda, com RUN_FIREFOX=true, na regressao programada.
 */
const includeFirefox = process.env.RUN_FIREFOX === 'true';

/**
 * Os projetos separam as camadas de teste, nao os navegadores. A execucao
 * padrao cobre exatamente os 30 cenarios do catalogo, uma vez cada.
 */
const projects: Project[] = [
  { name: 'api', testDir: './tests/api' },
  { name: 'contracts', testDir: './tests/contracts' },
  { name: 'ui-chromium', testDir: './tests/ui', use: { ...devices['Desktop Chrome'] } },
  { name: 'integration', testDir: './tests/integration', use: { ...devices['Desktop Chrome'] } },
  { name: 'database', testDir: './tests/database', use: { ...devices['Desktop Chrome'] } },
  {
    name: 'accessibility',
    testDir: './tests/accessibility',
    use: { ...devices['Desktop Chrome'] },
  },
];

if (includeFirefox) {
  projects.push({
    name: 'ui-firefox',
    testDir: './tests/ui',
    use: { ...devices['Desktop Firefox'] },
  });
}

export default defineConfig({
  testDir: '.',
  fullyParallel: true,
  forbidOnly: isCI,

  // Uma unica retentativa no CI, exclusivamente para diagnostico de
  // instabilidade. Retry nao e mecanismo de aprovacao: a politica em
  // docs/flaky-test-policy.md trata um teste que so passa na segunda tentativa
  // como sinal a investigar, nao como execucao saudavel.
  retries: isCI ? 1 : 0,
  workers: isCI ? 4 : undefined,

  timeout: 60_000,
  expect: { timeout: 10_000 },

  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['allure-playwright', { resultsDir: 'allure-results', detail: true }],
  ],

  use: {
    baseURL: environment.baseUrl,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    // Evidencias de diagnostico mantidas apenas quando ha falha, para nao
    // encher artefatos e repositorio com material inutil.
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ignoreHTTPSErrors: false,
  },

  projects,
});
