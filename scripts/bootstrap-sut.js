#!/usr/bin/env node
/**
 * Prepara o sistema sob teste (SUT).
 *
 * O Restful Booker Platform e tratado como dependencia externa: o codigo e
 * clonado num commit fixo dentro de .sut/ (fora do controle de versao deste
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

function log(message) {
  process.stdout.write(`[bootstrap-sut] ${message}\n`);
}

function ensureClone() {
  if (fs.existsSync(path.join(SUT_DIR, '.git'))) {
    log('Repositorio do SUT ja presente, sincronizando com o commit fixado.');
    run('git', ['fetch', '--quiet', 'origin'], { cwd: SUT_DIR });
  } else {
    log(`Clonando ${VERSION.repository}`);
    fs.mkdirSync(path.dirname(SUT_DIR), { recursive: true });
    run('git', ['clone', '--quiet', VERSION.repository, SUT_DIR]);
  }

  log(`Fixando no commit ${VERSION.commit}`);
  run('git', ['checkout', '--quiet', VERSION.commit], { cwd: SUT_DIR });
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
  ensureClone();
  buildJars();
  log('SUT pronto. Execute "npm run env:up" para subir o ambiente.');
}

main();
