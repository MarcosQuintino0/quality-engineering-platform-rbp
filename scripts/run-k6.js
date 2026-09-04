#!/usr/bin/env node
/**
 * Executa um cenario k6 dentro de container, sem exigir k6 instalado.
 *
 * Antes de executar qualquer coisa, o script recusa alvos fora da allowlist.
 * Teste de carga contra a instancia publica do Restful Booker Platform seria
 * abuso de um servico gratuito mantido por outra pessoa, e um erro de
 * configuracao nao pode ser suficiente para causar isso.
 */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const K6_IMAGE = 'grafana/k6:latest';

const CENARIOS = {
  smoke: { arquivo: 'performance/smoke/smoke.js', id: 'PERF-001' },
  load: { arquivo: 'performance/load/load.js', id: 'PERF-002' },
  mixed: { arquivo: 'performance/load/mixed.js', id: 'PERF-003' },
  stress: { arquivo: 'performance/stress/stress.js', id: 'PERF-STRESS' },
  spike: { arquivo: 'performance/spike/spike.js', id: 'PERF-004' },
  soak: { arquivo: 'performance/soak/soak.js', id: 'PERF-005' },
};

/**
 * Hosts autorizados. A lista e curta e explicita de proposito: qualquer host
 * que nao esteja aqui interrompe a execucao.
 */
const HOSTS_PERMITIDOS = (
  process.env.ALLOWED_TEST_HOSTS || 'localhost,127.0.0.1,host.docker.internal'
)
  .split(',')
  .map((host) => host.trim())
  .filter((host) => host.length > 0);

function abortar(mensagem) {
  process.stderr.write(`[run-k6] ${mensagem}\n`);
  process.exit(1);
}

function validarAlvo(alvo) {
  let hostname;
  try {
    hostname = new URL(alvo).hostname;
  } catch {
    abortar(`Alvo invalido: "${alvo}".`);
    return;
  }

  if (!HOSTS_PERMITIDOS.includes(hostname)) {
    abortar(
      `Recusado: "${hostname}" nao esta na allowlist (${HOSTS_PERMITIDOS.join(', ')}).\n` +
        '           Testes de carga rodam apenas em ambiente local. Nunca aponte esta suite\n' +
        '           para automationintesting.online: e um servico publico e gratuito mantido\n' +
        '           por terceiros, e carga contra ele seria abuso.',
    );
  }
}

function main() {
  const nome = process.argv[2];
  const cenario = CENARIOS[nome];

  if (cenario === undefined) {
    abortar(`Cenario desconhecido: "${nome}". Disponiveis: ${Object.keys(CENARIOS).join(', ')}.`);
    return;
  }

  // Dentro do container, o host e alcancado por host.docker.internal.
  const alvo = process.env.K6_BASE_URL || 'http://host.docker.internal';
  validarAlvo(alvo);

  const arquivo = path.join(ROOT, cenario.arquivo);
  if (!fs.existsSync(arquivo)) abortar(`Arquivo do cenario nao encontrado: ${cenario.arquivo}`);

  const resultados = path.join(ROOT, 'performance', 'results');
  fs.mkdirSync(path.join(resultados, 'raw'), { recursive: true });

  const carimbo = new Date().toISOString().replace(/[:.]/g, '-');
  const saida = `performance/results/raw/${nome}-${carimbo}.json`;

  process.stdout.write(`[run-k6] ${cenario.id} (${nome}) contra ${alvo}\n`);

  const argumentos = [
    'run',
    '--rm',
    '-i',
    '--add-host=host.docker.internal:host-gateway',
    '-v',
    `${ROOT}:/work`,
    '-w',
    '/work',
    '-e',
    `BASE_URL=${alvo}`,
  ];

  if (process.env.K6_DURATION !== undefined) {
    argumentos.push('-e', `DURATION=${process.env.K6_DURATION}`);
  }

  argumentos.push(K6_IMAGE, 'run', '--summary-export', saida, `/work/${cenario.arquivo}`);

  try {
    execFileSync('docker', argumentos, { stdio: 'inherit' });
  } catch {
    // O k6 encerra com codigo diferente de zero quando um threshold e violado.
    // Isso e resultado do teste, e nao erro de execucao: o codigo e propagado
    // para que o pipeline reprove, mas sem ruido de stack trace.
    process.stdout.write(
      '[run-k6] Execucao terminou com threshold violado ou erro. Ver saida acima.\n',
    );
    process.exitCode = 1;
  }

  process.stdout.write(`[run-k6] Resumo bruto em ${saida}\n`);
}

main();
