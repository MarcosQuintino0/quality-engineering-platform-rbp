#!/usr/bin/env node
/**
 * Gera as evidencias visuais do README a partir do ambiente real.
 *
 * Nada aqui e montado ou editado: o navegador percorre a jornada de reserva no
 * SUT em execucao, o video e gravado pelo proprio Playwright e convertido em
 * GIF com ffmpeg. As capturas de tela sao do mesmo ambiente, no mesmo estado.
 *
 * Uso: node scripts/generate-evidence.js
 */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const { chromium } = require('@playwright/test');

const ROOT = path.resolve(__dirname, '..');
const ASSETS = path.join(ROOT, 'docs', 'assets');
const TEMP = path.join(ASSETS, '.tmp');
const GIFS = path.join(ASSETS, 'gifs');
const SHOTS = path.join(ASSETS, 'screenshots');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';
const ROOM_API = process.env.ROOM_URL || 'http://localhost:3001';
const AUTH_API = process.env.AUTH_URL || 'http://localhost:3004';

/** Pausa curta para que a gravacao fique legivel para quem assiste. */
const RITMO = 1150;

function log(mensagem) {
  process.stdout.write(`[evidencias] ${mensagem}\n`);
}

function dataFutura(dias) {
  const data = new Date();
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString().slice(0, 10);
}

async function obterToken() {
  const resposta = await fetch(`${AUTH_API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'password' }),
  });

  if (!resposta.ok) {
    throw new Error(`Login falhou com status ${resposta.status}. O ambiente esta no ar?`);
  }

  const cookie = resposta.headers.get('set-cookie') || '';
  const encontrado = /token=([^;,\s]+)/.exec(cookie);
  if (encontrado === null) throw new Error('Login nao devolveu o cookie token.');

  return encontrado[1];
}

async function criarQuarto(token) {
  const resposta = await fetch(`${ROOM_API}/room/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: `token=${token}` },
    body: JSON.stringify({
      roomName: 'Demo 401',
      type: 'Suite',
      accessible: true,
      image: '/images/room1.jpg',
      description: 'Suite com vista para o jardim, usada na demonstracao da suite de testes.',
      features: ['WiFi', 'TV', 'Safe'],
      roomPrice: 240,
    }),
  });

  if (!resposta.ok) throw new Error(`Criacao do quarto falhou: ${resposta.status}`);
  return resposta.json();
}

async function removerQuarto(roomid, token) {
  await fetch(`${ROOM_API}/room/${roomid}`, {
    method: 'DELETE',
    headers: { Cookie: `token=${token}` },
  }).catch(() => undefined);
}

async function gravarJornada(roomid) {
  fs.rmSync(TEMP, { recursive: true, force: true });
  fs.mkdirSync(TEMP, { recursive: true });

  const navegador = await chromium.launch();
  const contexto = await navegador.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: TEMP, size: { width: 1280, height: 720 } },
  });

  const pagina = await contexto.newPage();

  const checkin = dataFutura(45);
  const checkout = dataFutura(48);

  log('Gravando a jornada de reserva.');

  await pagina.goto(`${BASE_URL}/reservation/${roomid}?checkin=${checkin}&checkout=${checkout}`);
  await pagina.locator('#doReservation').waitFor({ state: 'visible' });
  await pagina.waitForTimeout(RITMO * 2);

  await pagina.locator('#doReservation').click();
  await pagina.getByRole('textbox', { name: 'Firstname' }).waitFor({ state: 'visible' });
  await pagina.waitForTimeout(RITMO);

  // Dados ficticios, sem qualquer informacao pessoal real.
  await pagina.getByRole('textbox', { name: 'Firstname' }).pressSequentially('Marina', { delay: 55 });
  await pagina.getByRole('textbox', { name: 'Lastname' }).pressSequentially('Duarte', { delay: 55 });
  await pagina.getByRole('textbox', { name: 'Email' }).pressSequentially('marina@example.test', { delay: 35 });
  await pagina.getByRole('textbox', { name: 'Phone' }).pressSequentially('551199990000', { delay: 35 });
  await pagina.waitForTimeout(RITMO);

  await pagina.getByRole('button', { name: 'Reserve Now' }).click();
  await pagina.getByRole('heading', { name: 'Booking Confirmed' }).waitFor({ state: 'visible' });
  await pagina.waitForTimeout(RITMO * 2);

  await contexto.close();
  await navegador.close();

  const videos = fs.readdirSync(TEMP).filter((arquivo) => arquivo.endsWith('.webm'));
  if (videos.length === 0) throw new Error('Nenhum video foi gravado.');

  return path.join(TEMP, videos[0]);
}

function converterParaGif(video) {
  fs.mkdirSync(GIFS, { recursive: true });
  const destino = path.join(GIFS, 'jornada-de-reserva.gif');

  log('Convertendo o video em GIF otimizado.');

  // Paleta dedicada em vez de quantizacao padrao: reduz muito o tamanho do
  // arquivo mantendo o texto da interface legivel, que e o que importa aqui.
  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-i', video,
      '-vf',
      'fps=9,scale=760:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=64:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=4',
      '-loop', '0',
      destino,
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  );

  const tamanhoKb = Math.round(fs.statSync(destino).size / 1024);
  log(`GIF gerado: docs/assets/gifs/jornada-de-reserva.gif (${tamanhoKb} kB)`);

  return destino;
}

async function capturarTelas(roomid, token) {
  fs.mkdirSync(SHOTS, { recursive: true });

  const navegador = await chromium.launch();
  const contexto = await navegador.newContext({ viewport: { width: 1280, height: 800 } });
  await contexto.addCookies([
    { name: 'token', value: token, domain: new URL(BASE_URL).hostname, path: '/' },
  ]);

  const pagina = await contexto.newPage();

  const capturas = [
    { nome: 'home', url: `${BASE_URL}/`, espera: '#rooms' },
    { nome: 'administracao-de-quartos', url: `${BASE_URL}/admin/rooms`, espera: '#createRoom' },
    { nome: 'detalhe-do-quarto', url: `${BASE_URL}/admin/room/${roomid}`, espera: 'text=Room:' },
  ];

  for (const captura of capturas) {
    log(`Capturando ${captura.nome}.`);
    await pagina.goto(captura.url);
    await pagina.locator(captura.espera).first().waitFor({ state: 'visible' });
    await pagina.waitForTimeout(600);
    await pagina.screenshot({ path: path.join(SHOTS, `${captura.nome}.png`), fullPage: false });
  }

  await contexto.close();
  await navegador.close();
}

async function main() {
  const token = await obterToken();
  const quarto = await criarQuarto(token);
  log(`Quarto de demonstracao criado: ${quarto.roomid}`);

  try {
    const video = await gravarJornada(quarto.roomid);
    converterParaGif(video);
    await capturarTelas(quarto.roomid, token);
  } finally {
    fs.rmSync(TEMP, { recursive: true, force: true });
    await removerQuarto(quarto.roomid, token);
    log('Quarto de demonstracao removido.');
  }

  log('Evidencias geradas.');
}

main().catch((erro) => {
  process.stderr.write(`[evidencias] ${erro.message}\n`);
  process.exit(1);
});
