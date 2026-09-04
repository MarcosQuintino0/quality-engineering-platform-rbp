#!/usr/bin/env node
/**
 * Preenche os metadados do relatorio Allure antes da geracao.
 *
 * Sem isso o relatorio abre com quatro paineis vazios — Environment, Executors,
 * Categories e Trend — e um relatorio cheio de "nada a mostrar" transmite
 * exatamente a impressao oposta da que deveria: a de que ninguem configurou a
 * ferramenta.
 *
 * Os tres primeiros paineis sao preenchidos aqui com dados reais da execucao.
 * O Trend depende de historico entre execucoes e se preenche sozinho conforme
 * o pipeline roda, ja que o workflow restaura o historico do relatorio anterior.
 */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const RESULTADOS = path.join(ROOT, 'allure-results');
const VERSAO_SUT = JSON.parse(fs.readFileSync(path.join(__dirname, 'sut-version.json'), 'utf8'));

function versaoDoPacote(nome) {
  try {
    const lock = JSON.parse(fs.readFileSync(path.join(ROOT, 'package-lock.json'), 'utf8'));
    return lock.packages[`node_modules/${nome}`]?.version ?? 'desconhecida';
  } catch {
    return 'desconhecida';
  }
}

/** Versao do Docker, quando disponivel: o ambiente do SUT depende dele. */
function versaoDoDocker() {
  try {
    return execFileSync('docker', ['--version'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .trim()
      .replace(/^Docker version /, '')
      .replace(/,.*$/, '');
  } catch {
    return 'indisponivel';
  }
}

/**
 * Painel Environment.
 *
 * Responde a pergunta que todo relatorio de teste deveria responder e quase
 * nenhum responde: contra o que, exatamente, estes numeros foram medidos?
 */
function escreverAmbiente() {
  const linhas = [
    `SUT=Restful Booker Platform`,
    `SUT.commit=${VERSAO_SUT.commit}`,
    `SUT.versao=${VERSAO_SUT.describedAs}`,
    `Frontend=${process.env.BASE_URL || 'http://localhost:8080'}`,
    `Navegador=Chromium (Playwright ${versaoDoPacote('@playwright/test')})`,
    `Node=${process.version}`,
    `TypeScript=${versaoDoPacote('typescript')}`,
    `Docker=${versaoDoDocker()}`,
    `SistemaOperacional=${os.type()} ${os.release()}`,
    `Execucao=${process.env.CI ? 'GitHub Actions' : 'local'}`,
  ];

  fs.writeFileSync(
    path.join(RESULTADOS, 'environment.properties'),
    `${linhas.join('\n')}\n`,
    'utf8',
  );
}

/**
 * Painel Executors.
 *
 * Liga o relatorio a execucao que o produziu. Sem isso, quem abre o relatorio
 * publicado nao tem como voltar ao pipeline que o gerou.
 */
function escreverExecutor() {
  const repo = process.env.GITHUB_REPOSITORY;
  const runId = process.env.GITHUB_RUN_ID;

  const executor =
    repo && runId
      ? {
          name: 'GitHub Actions',
          type: 'github',
          buildName: `${process.env.GITHUB_WORKFLOW ?? 'workflow'} #${process.env.GITHUB_RUN_NUMBER ?? '?'}`,
          buildUrl: `https://github.com/${repo}/actions/runs/${runId}`,
          reportUrl: 'https://marcosquintino0.github.io/quality-engineering-platform-rbp/',
        }
      : {
          name: 'Execucao local',
          type: 'local',
          buildName: `local ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`,
        };

  fs.writeFileSync(
    path.join(RESULTADOS, 'executor.json'),
    JSON.stringify(executor, null, 2),
    'utf8',
  );
}

/**
 * Painel Categories.
 *
 * As categorias seguem a mesma classificacao de causa da politica de testes
 * instaveis, para que uma falha ja chegue ao relatorio triada: quem olha sabe
 * se procura o defeito no produto, no contrato, no ambiente ou no teste.
 */
function escreverCategorias() {
  const categorias = [
    {
      name: 'Falha de contrato',
      messageRegex: '.*contrato.*violado.*|.*(schema|fieldErrors).*',
      matchedStatuses: ['failed'],
    },
    {
      name: 'Autorizacao ou sessao',
      messageRegex: '.*(403|401|token|sessao|autentic).*',
      matchedStatuses: ['failed'],
    },
    {
      name: 'Status HTTP inesperado',
      messageRegex: '.*esperado HTTP.*',
      matchedStatuses: ['failed'],
    },
    {
      name: 'Persistencia em banco',
      messageRegex: '.*(banco|BOOKINGS|ROOMS|JDBC).*',
      matchedStatuses: ['failed'],
    },
    {
      name: 'Acessibilidade alem da baseline',
      messageRegex: '.*acessibilidade.*',
      matchedStatuses: ['failed'],
    },
    {
      name: 'Sincronizacao ou tempo limite',
      messageRegex: '.*(Timeout|waiting for|exceeded).*',
      matchedStatuses: ['failed', 'broken'],
    },
    {
      name: 'Ambiente indisponivel',
      messageRegex: '.*(ECONNREFUSED|env:status|nao esta no ar|Falha ao autenticar).*',
      matchedStatuses: ['broken', 'failed'],
    },
  ];

  fs.writeFileSync(
    path.join(RESULTADOS, 'categories.json'),
    JSON.stringify(categorias, null, 2),
    'utf8',
  );
}

function main() {
  if (!fs.existsSync(RESULTADOS)) {
    process.stderr.write(
      '[allure-metadata] allure-results nao existe. Rode a suite antes de gerar o relatorio.\n',
    );
    process.exit(1);
  }

  escreverAmbiente();
  escreverExecutor();
  escreverCategorias();

  process.stdout.write('[allure-metadata] Environment, Executors e Categories preenchidos.\n');
}

main();
