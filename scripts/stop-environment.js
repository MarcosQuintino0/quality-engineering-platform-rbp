#!/usr/bin/env node
/**
 * Derruba o ambiente local do SUT. Os dados vivem apenas em memoria dentro
 * dos containers, entao remover os containers ja devolve o ambiente ao estado
 * inicial na proxima subida.
 */
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const args = ['compose', 'down'];

if (process.argv.includes('--volumes')) args.push('--volumes');

execFileSync('docker', args, { cwd: ROOT, stdio: 'inherit' });
process.stdout.write('[stop-environment] Ambiente encerrado.\n');
