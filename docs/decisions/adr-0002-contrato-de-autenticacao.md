# ADR 0002 — O contrato de autenticacao e verificado no cabecalho, nao num schema de corpo

- **Status:** aceito
- **Data:** 04/09/2026

## Contexto

O catalogo pede, em QEP-013, a validacao do contrato da resposta de
autenticacao. A formulacao pressupoe um corpo JSON a validar contra schema.

O servico de autenticacao do RBP nao devolve corpo. `AuthController.createToken`
responde `ResponseEntity.ok().build()` e entrega a sessao em
`Set-Cookie: token=...; Path=/`. O historico do repositorio confirma que isso e
deliberado: o commit `75a639e` se chama "Removed all use of token from body of
auth call. We want to use a correct means for cookie management".

Verificado no ambiente local:

```
HTTP/1.1 200
Set-Cookie: token=TeX1XiN5lgaORQNZ; Path=/
Content-Length: 0
```

## Decisao

QEP-013 valida o contrato onde ele existe: no cabecalho. A verificacao confere
que o corpo esta de fato vazio, que `Set-Cookie` traz o cookie `token`, que o
token e alfanumerico e tem tamanho compativel com uma sessao, e que o cookie
declara `Path=/`.

A implementacao esta em `framework/schemas/auth-schemas.ts`, com a mesma forma
de retorno dos validadores Ajv, para que o teste nao precise saber qual tipo de
contrato esta verificando.

## Alternativas descartadas

**Validar um schema de corpo vazio.** Aprovaria uma resposta sem `Set-Cookie`,
que e justamente a falha que importa detectar.

**Validar o contrato do BFF, que devolve `{"token":"..."}`.** Contradiria o
ADR 0001 e mediria o frontend, nao o servico de autenticacao.

**Marcar QEP-013 como nao aplicavel e substituir o cenario.** O contrato
existe e e verificavel; o que nao se aplica e a suposicao de que todo contrato
mora no corpo da resposta.

## Consequencias

- O catalogo mantem os trinta identificadores, e QEP-013 continua cobrindo o
  risco que motivou sua criacao.
- A verificacao fica sensivel ao mecanismo de sessao: se o servico voltar a
  devolver o token no corpo, QEP-013 falha, que e o comportamento desejado
  diante de uma mudanca de contrato.
