#!/usr/bin/env node
/**
 * Sobe o ambiente local do SUT e so retorna quando ele esta realmente pronto.
 */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SUT_DIR = path.join(ROOT, '.sut', 'restful-booker-platform');

function log(message) {
  process.stdout.write(`[start-environment] ${message}\n`);
}

if (!fs.existsSync(SUT_DIR)) {
  log('SUT ausente. Executando o bootstrap antes de subir o ambiente.');
  execFileSync(process.execPath, [path.join(__dirname, 'bootstrap-sut.js')], { stdio: 'inherit' });
}

log('Construindo e subindo os containers.');
execFileSync('docker', ['compose', 'up', '-d', '--build'], { cwd: ROOT, stdio: 'inherit' });

log('Aguardando os servicos ficarem saudaveis.');
execFileSync(process.execPath, [path.join(__dirname, 'wait-for-services.js')], {
  stdio: 'inherit',
});

log('Ambiente disponivel em http://localhost:8080');
