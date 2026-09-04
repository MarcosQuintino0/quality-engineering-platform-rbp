/**
 * Contrato de erro de validacao dos servicos Spring do SUT, produzido pelo
 * MethodArgumentNotValidExceptionHandler. E o unico formato de erro estavel
 * exposto pela plataforma para payload invalido.
 */
export const validationErrorSchema = {
  type: 'object',
  required: ['errorCode', 'error', 'errorMessage', 'fieldErrors'],
  properties: {
    errorCode: { type: 'integer', enum: [400] },
    error: { type: 'string', enum: ['BAD_REQUEST'] },
    errorMessage: { type: 'string', minLength: 1 },
    fieldErrors: { type: 'array', items: { type: 'string', minLength: 1 }, minItems: 1 },
  },
  additionalProperties: false,
} as const;
