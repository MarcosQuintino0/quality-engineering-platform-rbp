export interface AuthCookieContractResult {
  valid: boolean;
  errors: string[];
  token?: string;
}

/**
 * Contrato da resposta de autenticacao.
 *
 * O endpoint POST /auth/login nao devolve JSON: responde 200 com corpo vazio
 * e entrega a sessao no cabecalho Set-Cookie. Por isso a verificacao de
 * contrato aqui e sobre o cabecalho, e nao sobre um schema de corpo. A decisao
 * esta registrada em docs/decisions/adr-0002-contrato-de-autenticacao.md.
 */
export function authCookieContract(headers: Record<string, string>, body: string): AuthCookieContractResult {
  const errors: string[] = [];

  if (body.trim() !== '') {
    errors.push(`corpo deveria ser vazio, mas veio "${truncate(body)}"`);
  }

  const setCookie = headers['set-cookie'];
  if (setCookie === undefined) {
    errors.push('cabecalho set-cookie ausente');
    return { valid: false, errors };
  }

  const match = /(?:^|[\s;,])token=([^;,\s]+)/.exec(setCookie);
  if (match === null) {
    errors.push(`set-cookie nao contem o cookie "token": "${truncate(setCookie)}"`);
    return { valid: false, errors };
  }

  const token = match[1] as string;

  if (!/^[A-Za-z0-9]+$/.test(token)) {
    errors.push(`token deveria ser alfanumerico, mas veio "${truncate(token)}"`);
  }
  if (token.length < 8) {
    errors.push(`token curto demais para ser uma sessao (${token.length} caracteres)`);
  }
  if (!/(?:^|;\s*)Path=\//i.test(setCookie)) {
    errors.push(`set-cookie deveria declarar Path=/, mas veio "${truncate(setCookie)}"`);
  }

  return { valid: errors.length === 0, errors, token };
}

function truncate(value: string, max = 80): string {
  return value.length <= max ? value : `${value.slice(0, max)}...`;
}
