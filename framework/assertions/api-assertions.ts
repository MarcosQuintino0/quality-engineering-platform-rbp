import { expect } from '@playwright/test';

import type { ApiResponse } from '../api-clients';

/**
 * Confere o status esperado e, quando ele nao vem, inclui o corpo da resposta
 * na mensagem de falha.
 *
 * Sem isso, uma falha de API aparece como "esperado 201, recebido 400" e exige
 * uma segunda execucao com log para descobrir o motivo. O corpo quase sempre
 * traz a causa, entao ele faz parte da mensagem desde a primeira falha.
 */
export function esperarStatus(resposta: ApiResponse<unknown>, esperado: number, contexto: string): void {
  expect(
    resposta.status,
    `${contexto}: esperado HTTP ${esperado}, recebido ${resposta.status}. Corpo: ${resumir(resposta.raw)}`,
  ).toBe(esperado);
}

/** Aceita qualquer status de uma lista, para endpoints com mais de uma resposta valida. */
export function esperarStatusEntre(
  resposta: ApiResponse<unknown>,
  aceitos: readonly number[],
  contexto: string,
): void {
  expect(
    aceitos,
    `${contexto}: esperado um de [${aceitos.join(', ')}], recebido ${resposta.status}. Corpo: ${resumir(resposta.raw)}`,
  ).toContain(resposta.status);
}

function resumir(raw: string, max = 400): string {
  if (raw.trim() === '') return '(vazio)';
  return raw.length <= max ? raw : `${raw.slice(0, max)}...`;
}
