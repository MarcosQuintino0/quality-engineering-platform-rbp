import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

/**
 * Serializa a criacao de recursos entre os workers do Playwright.
 *
 * Existe por um motivo unico e temporario: o SUT nao e seguro para uso
 * concorrente. Cada classe *DB do Restful Booker Platform e um componente
 * Spring singleton que guarda uma unica java.sql.Connection compartilhada por
 * todas as threads, e a criacao termina com "SELECT LAST_INSERT_ID()", que e
 * escopado por conexao. Sob criacoes simultaneas, uma requisicao recebe o
 * identificador gerado por outra.
 *
 * O defeito esta registrado como RBP-06 em docs/known-issues.md, com
 * reproducao independente em scripts/reproduce-rbp-06.js: 150 criacoes
 * simultaneas produziram 11 respostas com dados de outro quarto e 10
 * identificadores duplicados.
 *
 * Sem esta trava, o defeito aparece na suite como falhas dispersas e
 * confusas: um 409 ao reservar um quarto recem-criado, um 404 ao atualizar uma
 * reserva que acabou de ser criada. Cada execucao acusaria cenarios
 * diferentes, e o diagnostico se perderia. Com ela, o defeito fica concentrado
 * num registro unico e verificavel, e a suite continua sendo sinal confiavel
 * para tudo o mais.
 *
 * O restante da suite permanece paralelo: apenas o instante da criacao e
 * serializado, o que custa poucos milissegundos por recurso.
 *
 * **Condicao de saida:** quando o SUT passar a usar conexao por requisicao ou
 * sincronizar o acesso, esta trava deve ser removida e o paralelismo total
 * restaurado. A verificacao e rodar scripts/reproduce-rbp-06.js: se nao
 * reproduzir mais com concorrencia alta, a trava perdeu a razao de existir.
 */
const ARQUIVO_DE_TRAVA = path.join(os.tmpdir(), 'qep-rbp-criacao.lock');

/** Uma trava mais velha que isso e considerada abandonada por processo morto. */
const IDADE_MAXIMA_MS = 10_000;
const INTERVALO_DE_TENTATIVA_MS = 15;
const TEMPO_LIMITE_MS = 30_000;

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function removerSeAbandonada(): void {
  try {
    const info = fs.statSync(ARQUIVO_DE_TRAVA);
    if (Date.now() - info.mtimeMs > IDADE_MAXIMA_MS) {
      fs.unlinkSync(ARQUIVO_DE_TRAVA);
    }
  } catch {
    // A trava deixou de existir entre a verificacao e a remocao, que e o
    // resultado desejado de qualquer forma.
  }
}

async function adquirir(): Promise<void> {
  const limite = Date.now() + TEMPO_LIMITE_MS;

  for (;;) {
    try {
      // 'wx' falha se o arquivo ja existir, o que torna a criacao atomica e
      // serve como primitiva de exclusao mutua entre processos.
      fs.closeSync(fs.openSync(ARQUIVO_DE_TRAVA, 'wx'));
      return;
    } catch {
      if (Date.now() > limite) {
        throw new Error(
          `Nao foi possivel obter a trava de criacao em ${TEMPO_LIMITE_MS}ms. ` +
            `Remova ${ARQUIVO_DE_TRAVA} se algum processo anterior tiver sido interrompido.`,
        );
      }

      removerSeAbandonada();
      await esperar(INTERVALO_DE_TENTATIVA_MS);
    }
  }
}

function liberar(): void {
  try {
    fs.unlinkSync(ARQUIVO_DE_TRAVA);
  } catch {
    // Ja removida por deteccao de abandono; nada a fazer.
  }
}

/** Executa uma criacao de recurso com exclusao mutua entre processos. */
export async function criarComExclusao<T>(criar: () => Promise<T>): Promise<T> {
  await adquirir();
  try {
    return await criar();
  } finally {
    liberar();
  }
}
