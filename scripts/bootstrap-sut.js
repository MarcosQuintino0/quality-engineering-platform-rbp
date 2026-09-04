#!/usr/bin/env node
/**
 * Prepara o sistema sob teste (SUT).
 *
 * O Restful Booker Platform e tratado como dependencia externa: o codigo e
 * obtido num commit fixo dentro de .sut/ (fora do controle de versao deste
 * repositorio) e os artefatos Java sao compilados dentro de um container
 * Maven, evitando exigir JDK 26 e Maven instalados globalmente na maquina.
 */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SUT_DIR = path.join(ROOT, '.sut', 'restful-booker-platform');
const VERSION = JSON.parse(fs.readFileSync(path.join(__dirname, 'sut-version.json'), 'utf8'));

/**
 * Cache de dependencias Maven.
 *
 * E um diretorio do host, e nao um volume Docker nomeado, para que o CI possa
 * restaura-lo entre execucoes: um volume viveria apenas dentro do runner e a
 * compilacao baixaria tudo de novo a cada pipeline.
 */
const M2_DIR = process.env.M2_DIR || path.join(ROOT, '.m2');

/** Modulos Java necessarios. O frontend (assets) e compilado pelo proprio Dockerfile. */
const JAVA_MODULES = ['auth', 'booking', 'room', 'report', 'branding', 'message'];

function run(command, args, options = {}) {
  execFileSync(command, args, { stdio: 'inherit', ...options });
}

/** Executa ignorando falha, para comandos cujo erro e um resultado aceitavel. */
function runQuiet(command, args, options = {}) {
  try {
    execFileSync(command, args, { stdio: 'ignore', ...options });
    return true;
  } catch {
    return false;
  }
}

function log(message) {
  process.stdout.write(`[bootstrap-sut] ${message}\n`);
}

/**
 * Coloca o codigo do SUT em .sut/ no commit fixado.
 *
 * Nao usa "git clone" porque o diretorio pode ja existir sem ser um
 * repositorio: no CI, o cache restaura os artefatos compilados em
 * .sut/restful-booker-platform/<modulo>/target antes deste passo, e clone
 * recusa diretorio nao vazio. Inicializar no lugar e buscar o commit exato
 * funciona nos dois casos, e o fetch raso e mais rapido que um clone completo.
 */
function ensureSource() {
  fs.mkdirSync(SUT_DIR, { recursive: true });

  if (!fs.existsSync(path.join(SUT_DIR, '.git'))) {
    log('Inicializando repositorio do SUT.');
    run('git', ['init', '--quiet'], { cwd: SUT_DIR });
  }

  // Recria o remote a cada execucao para que uma troca de URL em
  // sut-version.json passe a valer sem exigir limpeza manual.
  runQuiet('git', ['remote', 'remove', 'origin'], { cwd: SUT_DIR });
  run('git', ['remote', 'add', 'origin', VERSION.repository], { cwd: SUT_DIR });

  log(`Buscando o commit fixado ${VERSION.commit}`);
  run('git', ['fetch', '--quiet', '--depth', '1', 'origin', VERSION.commit], { cwd: SUT_DIR });
  run('git', ['checkout', '--quiet', '--force', 'FETCH_HEAD'], { cwd: SUT_DIR });

  const atual = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: SUT_DIR,
    encoding: 'utf8',
  }).trim();
  if (atual !== VERSION.commit) {
    throw new Error(`Esperado o commit ${VERSION.commit}, mas o SUT ficou em ${atual}.`);
  }
}

function jarsPresent() {
  return JAVA_MODULES.every((module) => {
    const targetDir = path.join(SUT_DIR, module, 'target');
    if (!fs.existsSync(targetDir)) return false;
    return fs.readdirSync(targetDir).some((file) => file.endsWith('-exec.jar'));
  });
}

function buildJars() {
  if (jarsPresent() && !process.argv.includes('--rebuild')) {
    log('Artefatos Java ja compilados. Use --rebuild para forcar nova compilacao.');
    return;
  }

  fs.mkdirSync(M2_DIR, { recursive: true });
  log(`Compilando os modulos Java em ${VERSION.mavenImage} (pode demorar na primeira execucao).`);
  run('docker', [
    'run',
    '--rm',
    '-v',
    `${SUT_DIR}:/app`,
    '-v',
    `${M2_DIR}:/root/.m2`,
    '-w',
    '/app',
    VERSION.mavenImage,
    'mvn',
    '-B',
    '-DskipTests',
    'clean',
    'install',
    '-pl',
    JAVA_MODULES.join(','),
  ]);

  if (!jarsPresent()) {
    throw new Error('A compilacao terminou mas os artefatos -exec.jar nao foram encontrados.');
  }
}

function main() {
  ensureSource();
  buildJars();
  log('SUT pronto. Execute "npm run env:up" para subir o ambiente.');
}

main();
