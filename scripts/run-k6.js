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

  const bruto = path.join(ROOT, 'performance', 'results', 'raw');
  fs.mkdirSync(bruto, { recursive: true });

  const carimbo = new Date().toISOString().replace(/[:.]/g, '-');
  const saida = path.join(bruto, `${nome}-${carimbo}.txt`);

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

  // O container nao escreve arquivo algum no volume montado.
  //
  // A versao anterior usava "--summary-export" para gravar o resumo direto no
  // diretorio de resultados. Funcionava no Windows, onde o Docker Desktop
  // ignora as permissoes do volume, e falhava no CI: a imagem do k6 roda como
  // usuario nao-root e o diretorio montado pertence ao usuario do runner. O k6
  // registrava "failed to handle the end-of-test summary" e seguia com codigo
  // de saida zero, ou seja, um erro dentro de um job verde.
  //
  // Agora a saida e capturada e gravada pelo host, que sempre tem permissao.
  argumentos.push(K6_IMAGE, 'run', `/work/${cenario.arquivo}`);

  let texto = '';
  let violou = false;

  try {
    // O k6 escreve o relatorio no stderr e o progresso no stdout; ambos entram
    // no arquivo para que a evidencia fique completa.
    texto = execFileSync('docker', argumentos, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 32 * 1024 * 1024,
    });
  } catch (erro) {
    // O k6 encerra com codigo diferente de zero quando um threshold e violado.
    // Isso e resultado do teste, e nao erro de execucao: o codigo e propagado
    // para que o pipeline reprove, mas sem ruido de stack trace.
    texto = `${erro.stdout ?? ''}${erro.stderr ?? ''}`;
    violou = true;
  }

  process.stdout.write(texto);

  const cabecalho =
    `${cenario.id} — cenario ${nome}\n` +
    `Executado em: ${new Date().toISOString()}\n` +
    `Alvo: ${alvo}\n` +
    'Saida verbatim do k6, sem edicao.\n\n';

  fs.writeFileSync(saida, cabecalho + texto, 'utf8');
  process.stdout.write(`\n[run-k6] Saida completa em ${path.relative(ROOT, saida)}\n`);

  if (violou) {
    process.stdout.write('[run-k6] Threshold violado ou erro de execucao. Ver saida acima.\n');
    process.exitCode = 1;
  }
}

main();
