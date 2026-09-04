#!/usr/bin/env node
/**
 * Aguarda o SUT ficar realmente disponivel.
 *
 * O criterio e o estado observavel de cada servico (health check respondendo
 * UP e frontend servindo HTML), nunca uma espera fixa. O script tambem serve
 * como diagnostico: com --once ele reporta o estado atual e encerra.
 */
const { ALL_SERVICES, healthUrl } = require('./services');

const TIMEOUT_MS = Number(process.env.WAIT_TIMEOUT_MS || 180_000);
const POLL_INTERVAL_MS = 2_000;
const ONCE = process.argv.includes('--once');

async function probe(service) {
  try {
    const response = await fetch(healthUrl(service), {
      signal: AbortSignal.timeout(4_000),
    });
    if (!response.ok) return { up: false, detail: `HTTP ${response.status}` };

    // Servicos Spring devolvem {"status":"UP"}; o frontend devolve HTML.
    if (service.health === '/') return { up: true, detail: 'HTML servido' };

    const body = await response.json();
    return { up: body.status === 'UP', detail: `status=${body.status}` };
  } catch (error) {
    return { up: false, detail: error.name === 'TimeoutError' ? 'timeout' : 'sem resposta' };
  }
}

async function checkAll() {
  const results = await Promise.all(
    ALL_SERVICES.map(async (service) => ({ service, ...(await probe(service)) })),
  );
  return results;
}

function report(results) {
  for (const { service, up, detail } of results) {
    const mark = up ? 'OK  ' : 'FALHA';
    process.stdout.write(`  ${mark} ${service.name.padEnd(9)} :${service.port} ${detail}\n`);
  }
}

async function main() {
  const deadline = Date.now() + TIMEOUT_MS;

  for (;;) {
    const results = await checkAll();
    const pending = results.filter((result) => !result.up);

    if (pending.length === 0) {
      process.stdout.write('[wait-for-services] Todos os servicos responderam UP.\n');
      report(results);
      return;
    }

    if (ONCE || Date.now() > deadline) {
      process.stdout.write(
        ONCE
          ? '[wait-for-services] Estado atual do ambiente:\n'
          : `[wait-for-services] Tempo limite de ${TIMEOUT_MS}ms excedido.\n`,
      );
      report(results);
      process.exitCode = 1;
      return;
    }

    process.stdout.write(
      `[wait-for-services] Aguardando ${pending.length} servico(s): ` +
        `${pending.map((result) => result.service.name).join(', ')}\n`,
    );
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

main();
