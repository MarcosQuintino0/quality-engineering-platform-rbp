import { test } from '@playwright/test';

export type Camada = 'api' | 'contrato' | 'interface' | 'integracao' | 'banco' | 'acessibilidade';
export type Risco = 'alto' | 'medio' | 'baixo';

export interface Rastreabilidade {
  /** Identificador do catalogo, no formato QEP-XXX. */
  id: string;
  camada: Camada;
  risco: Risco;
  /** Requisito ou comportamento do SUT que o cenario verifica. */
  requisito: string;
}

/**
 * Registra a rastreabilidade do cenario no relatorio.
 *
 * Cada teste declara a que item do catalogo pertence, em que camada atua e
 * qual risco cobre. As anotacoes aparecem no Allure e no relatorio HTML, o que
 * permite ligar uma falha ao risco correspondente sem consultar planilha.
 */
export function rastrear(info: Rastreabilidade): void {
  test
    .info()
    .annotations.push(
      { type: 'id', description: info.id },
      { type: 'camada', description: info.camada },
      { type: 'risco', description: info.risco },
      { type: 'requisito', description: info.requisito },
    );
}
