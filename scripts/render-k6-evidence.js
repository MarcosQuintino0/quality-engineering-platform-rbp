#!/usr/bin/env node
/**
 * Transforma a saida do k6 numa imagem legivel para o README.
 *
 * O k6 reporta em texto de terminal, que num README vira um bloco cinzento que
 * ninguem le. Esta ferramenta renderiza o mesmo texto com fundo de terminal e
 * o fotografa.
 *
 * O texto e usado **verbatim**, exatamente como o k6 imprimiu. O unico recorte
 * e o inicio: as linhas de progresso ("running 00m03.1s...") sao descartadas,
 * porque sao animacao de terminal e nao resultado. Nenhum numero e alterado,
 * reordenado ou omitido, e o arquivo bruto completo fica versionado ao lado da
 * imagem para conferencia.
 *
 * Uso: node scripts/render-k6-evidence.js [caminho-do-txt]
 */
const fs = require('node:fs');
const path = require('node:path');

const { chromium } = require('@playwright/test');

const ROOT = path.resolve(__dirname, '..');
const BRUTO = path.join(ROOT, 'performance', 'results', 'raw');
const DESTINO = path.join(ROOT, 'docs', 'assets', 'screenshots', 'k6-resultado.png');

/**
 * Cenarios do catalogo, para rotular a imagem com o identificador correto.
 *
 * O rotulo e derivado do nome do arquivo de saida, e nao fixo no codigo: uma
 * imagem de evidencia com o titulo de outro cenario e informacao errada, por
 * mais que os numeros abaixo estejam certos.
 */
const CENARIOS = {
  smoke: { id: 'PERF-001', comando: 'npm run perf:smoke', descricao: 'smoke' },
  load: { id: 'PERF-002', comando: 'npm run perf:load', descricao: 'carga progressiva' },
  mixed: { id: 'PERF-003', comando: 'npm run perf:mixed', descricao: 'carga combinada' },
  spike: { id: 'PERF-004', comando: 'npm run perf:spike', descricao: 'pico' },
  soak: { id: 'PERF-005', comando: 'npm run perf:soak', descricao: 'soak' },
  stress: { id: 'calibragem', comando: 'node scripts/run-k6.js stress', descricao: 'stress' },
};

function identificarCenario(nomeDoArquivo) {
  const chave = path.basename(nomeDoArquivo).split('-')[0];
  const cenario = CENARIOS[chave];

  if (cenario === undefined) {
    throw new Error(
      `Nao foi possivel identificar o cenario a partir de "${nomeDoArquivo}". ` +
        `Esperado um nome comecando por: ${Object.keys(CENARIOS).join(', ')}.`,
    );
  }

  return cenario;
}

function arquivoMaisRecente() {
  if (!fs.existsSync(BRUTO)) return undefined;

  const candidatos = fs
    .readdirSync(BRUTO)
    .filter((nome) => nome.endsWith('.txt'))
    .map((nome) => ({ nome, mtime: fs.statSync(path.join(BRUTO, nome)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);

  return candidatos[0] === undefined ? undefined : path.join(BRUTO, candidatos[0].nome);
}

/** Recorta do primeiro bloco de resultado ate o fim, descartando o progresso. */
function extrairResumo(texto) {
  const linhas = texto.split(/\r?\n/);
  const inicio = linhas.findIndex((linha) => linha.includes('THRESHOLDS'));

  if (inicio === -1) {
    throw new Error('A saida nao contem o bloco THRESHOLDS. O k6 chegou a concluir?');
  }

  return linhas
    .slice(inicio)
    .filter((linha) => !/^\s*(running|default\s+[✓✗])/.test(linha))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd();
}

function escapar(texto) {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Colore apenas marcadores e rotulos; nenhum valor e alterado. */
function colorir(texto) {
  return escapar(texto)
    .replace(/^(\s*)(✓)/gm, '$1<span class="ok">$2</span>')
    .replace(/^(\s*)(✗)/gm, '$1<span class="erro">$2</span>')
    .replace(/(█ [A-Z ]+)/g, '<span class="secao">$1</span>')
    .replace(/^(\s{4}[A-Z]{2,}.*)$/gm, '<span class="grupo">$1</span>');
}

function montarPagina(resumo, origem, cenario) {
  return `<!doctype html><meta charset="utf-8"><style>
  * { box-sizing: border-box; }
  body { margin: 0; background: #0d1117; font-family: 'Cascadia Code', 'Consolas', 'DejaVu Sans Mono', monospace; }
  .janela { width: 980px; margin: 0; background: #0d1117; border: 1px solid #30363d; border-radius: 10px; overflow: hidden; }
  .barra { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: #161b22; border-bottom: 1px solid #30363d; }
  .bolinha { width: 11px; height: 11px; border-radius: 50%; }
  .titulo { margin-left: 10px; color: #8b949e; font-size: 12.5px; }
  pre { margin: 0; padding: 18px 20px 22px; color: #c9d1d9; font-size: 12.8px; line-height: 1.55; white-space: pre; }
  .ok { color: #3fb950; font-weight: 700; }
  .erro { color: #f85149; font-weight: 700; }
  .secao { color: #58a6ff; font-weight: 700; }
  .grupo { color: #8b949e; }
  .rodape { padding: 9px 20px 13px; color: #6e7681; font-size: 11.5px; border-top: 1px solid #21262d; }
</style>
<div class="janela">
  <div class="barra">
    <span class="bolinha" style="background:#ff5f57"></span>
    <span class="bolinha" style="background:#febc2e"></span>
    <span class="bolinha" style="background:#28c840"></span>
    <span class="titulo">${escapar(cenario.comando)} — ${escapar(cenario.id)}, ${escapar(cenario.descricao)}</span>
  </div>
  <pre>${colorir(resumo)}</pre>
  <div class="rodape">Saída verbatim do k6. Arquivo completo: performance/results/raw/${escapar(origem)}</div>
</div>`;
}

async function main() {
  const origem = process.argv[2] ?? arquivoMaisRecente();

  if (origem === undefined || !fs.existsSync(origem)) {
    process.stderr.write(
      '[k6-evidencia] Nenhuma saida encontrada. Rode "npm run perf:smoke" antes.\n',
    );
    process.exit(1);
  }

  const cenario = identificarCenario(origem);
  const resumo = extrairResumo(fs.readFileSync(origem, 'utf8'));

  const navegador = await chromium.launch();
  const pagina = await navegador.newPage({ deviceScaleFactor: 2 });
  await pagina.setContent(montarPagina(resumo, path.basename(origem), cenario));

  fs.mkdirSync(path.dirname(DESTINO), { recursive: true });
  await pagina.locator('.janela').screenshot({ path: DESTINO });
  await navegador.close();

  const kb = Math.round(fs.statSync(DESTINO).size / 1024);
  process.stdout.write(
    `[k6-evidencia] ${cenario.id} (${cenario.descricao}) a partir de ${path.basename(origem)}: ` +
      `docs/assets/screenshots/k6-resultado.png (${kb} kB)\n`,
  );
}

main().catch((erro) => {
  process.stderr.write(`[k6-evidencia] ${erro.message}\n`);
  process.exit(1);
});
