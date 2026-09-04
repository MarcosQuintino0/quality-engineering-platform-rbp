import Ajv, { type ErrorObject, type JSONSchemaType, type Schema } from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);

export interface ContractResult {
  valid: boolean;
  /** Erros ja formatados como "caminho: mensagem", prontos para a mensagem de falha. */
  errors: string[];
}

/**
 * Valida um corpo de resposta contra um schema JSON.
 *
 * Devolve o resultado em vez de lancar, para que o teste produza uma mensagem
 * de falha com todos os desvios de contrato de uma vez, em vez de parar no
 * primeiro.
 */
export function validateContract(schema: Schema | JSONSchemaType<unknown>, data: unknown): ContractResult {
  const validate = ajv.compile(schema);
  const valid = validate(data);

  return {
    valid,
    errors: valid ? [] : formatErrors(validate.errors ?? []),
  };
}

function formatErrors(errors: ErrorObject[]): string[] {
  return errors.map((error) => {
    const path = error.instancePath === '' ? '(raiz)' : error.instancePath;
    const params = Object.entries(error.params)
      .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
      .join(', ');
    return params === '' ? `${path}: ${error.message}` : `${path}: ${error.message} (${params})`;
  });
}
