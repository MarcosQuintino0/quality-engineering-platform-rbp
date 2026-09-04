/**
 * Estreita um valor opcional para o tipo nao opcional, falhando com mensagem
 * propria quando ele nao existe.
 *
 * Existe para evitar o padrao "expect(x).toBeDefined()" seguido de um cast: o
 * expect nao informa o compilador, entao o codigo seguinte precisaria de
 * "as { ... }" para acessar os campos. O cast contorna o verificador de tipos
 * justamente no ponto em que a informacao dele seria util, e ainda produz uma
 * falha confusa quando o valor realmente falta.
 *
 * Esta funcao e um type guard de verdade: nao ha conversao, apenas verificacao
 * em tempo de execucao que o compilador reconhece.
 */
export function obrigatorio<T>(valor: T | undefined | null, mensagem: string): T {
  if (valor === undefined || valor === null) {
    throw new Error(mensagem);
  }
  return valor;
}
