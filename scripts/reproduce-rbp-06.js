#!/usr/bin/env node
/**
 * Reproduz o defeito RBP-06: criacao concorrente de recursos devolve o
 * identificador e os dados de outro recurso.
 *
 * Cada classe *DB do Restful Booker Platform e um componente Spring singleton
 * que guarda uma unica java.sql.Connection num campo, compartilhada por todas
 * as threads de requisicao, sem sincronizacao. A criacao termina com
 * "SELECT LAST_INSERT_ID()", que e escopado por conexao: sob concorrencia, uma
 * requisicao pode ler o identificador gerado por outra.
 *
 * Este script existe para que o defeito seja verificavel por qualquer pessoa,
 * sem depender da suite. Ele cria quartos simultaneamente e compara o que foi
 * enviado com o que voltou.
 *
 * Uso: node scripts/reproduce-rbp-06.js
 */
const AUTH = process.env.AUTH_URL || 'http://localhost:3004';
const ROOM = process.env.ROOM_URL || 'http://localhost:3001';

const POR_RODADA = Number(process.env.CONCORRENCIA || 25);
const RODADAS = Number(process.env.RODADAS || 6);

async function autenticar() {
  const resposta = await fetch(`${AUTH}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'password' }),
  });

  if (!resposta.ok) {
    throw new Error(`Login falhou com status ${resposta.status}. O ambiente esta no ar?`);
  }

  const encontrado = /token=([^;,\s]+)/.exec(resposta.headers.get('set-cookie') || '');
  if (encontrado === null) throw new Error('Login nao devolveu o cookie token.');
  return encontrado[1];
}

async function criarQuarto(token, nome, preco) {
  const resposta = await fetch(`${ROOM}/room/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: `token=${token}` },
    body: JSON.stringify({
      roomName: nome,
      type: 'Single',
      accessible: false,
      image: '/images/room1.jpg',
      description: 'quarto criado para reproduzir RBP-06',
      features: ['WiFi'],
      roomPrice: preco,
    }),
  });

  if (resposta.status !== 201) return { erro: resposta.status, enviado: nome };

  const criado = await resposta.json();
  return {
    enviado: nome,
    recebido: criado.roomName,
    roomid: criado.roomid,
    precoEnviado: preco,
    precoRecebido: criado.roomPrice,
  };
}

async function main() {
  const token = await autenticar();

  let trocados = 0;
  let duplicados = 0;
  let falhas = 0;
  let total = 0;
  const exemplos = [];

  for (let rodada = 0; rodada < RODADAS; rodada += 1) {
    const marca = String(Date.now() % 100000);

    // O ponto do teste: todas as criacoes partem ao mesmo tempo.
    const resultados = await Promise.all(
      Array.from({ length: POR_RODADA }, (_, i) =>
        criarQuarto(token, `C${rodada}x${i}x${marca}`.slice(0, 12), 100 + i),
      ),
    );

    total += resultados.length;
    falhas += resultados.filter((r) => r.erro !== undefined).length;

    const inconsistentes = resultados.filter(
      (r) =>
        r.erro === undefined && (r.recebido !== r.enviado || r.precoRecebido !== r.precoEnviado),
    );
    trocados += inconsistentes.length;

    const ids = resultados.filter((r) => r.roomid !== undefined).map((r) => r.roomid);
    duplicados += ids.length - new Set(ids).size;

    if (inconsistentes.length > 0 && exemplos.length < 3) {
      const caso = inconsistentes[0];
      exemplos.push(
        `enviado "${caso.enviado}" (preco ${caso.precoEnviado}), ` +
          `recebido "${caso.recebido}" (preco ${caso.precoRecebido}), roomid ${caso.roomid}`,
      );
    }
  }

  process.stdout.write(`\nCriacoes simultaneas: ${total} (${RODADAS} rodadas de ${POR_RODADA})\n`);
  process.stdout.write(`  respostas com dados de outro quarto : ${trocados}\n`);
  process.stdout.write(`  identificadores duplicados          : ${duplicados}\n`);
  process.stdout.write(`  falhas HTTP                         : ${falhas}\n`);

  for (const exemplo of exemplos) {
    process.stdout.write(`  exemplo: ${exemplo}\n`);
  }

  if (trocados > 0 || duplicados > 0) {
    process.stdout.write('\nRBP-06 reproduzido. Ver docs/known-issues.md.\n');
    process.exitCode = 1;
  } else {
    process.stdout.write(
      '\nNao reproduzido nesta execucao. O defeito depende de interleaving:\n' +
        'aumente CONCORRENCIA ou RODADAS e repita.\n',
    );
  }
}

main().catch((erro) => {
  process.stderr.write(`${erro.message}\n`);
  process.exit(2);
});
