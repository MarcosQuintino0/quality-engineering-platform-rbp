# ADR 0001 — Os testes de API atacam os microsservicos, nao o BFF

- **Status:** aceito
- **Data:** 04/09/2026

## Contexto

O Restful Booker Platform expoe duas superfícies HTTP diferentes, e isso so
ficou visivel ao exercitar o ambiente em execucao.

O `next.config.js` do frontend declara rewrites de `/api/*` para os
microsservicos, o que sugere um proxy transparente. Mas existem quinze
`route.ts` em `assets/src/app/api/`, e no Next.js um route handler tem
precedencia sobre um rewrite. Na pratica, `/api/*` e uma camada BFF com
contrato proprio.

As duas superfícies discordam em pontos que importam:

| Comportamento       | Microsservico (`:3004/auth/login`)        | BFF (`:8080/api/auth/login`) |
| ------------------- | ----------------------------------------- | ---------------------------- |
| Login valido        | 200, corpo vazio, `Set-Cookie: token=...` | 200, corpo `{"token":"..."}` |
| Credencial invalida | 403                                       | 401                          |

Verificado com `curl` contra o ambiente local no commit `d36bd3f`.

## Decisao

Os dezesseis cenarios de API e contrato (QEP-001 a QEP-016) falam com os
microsservicos diretamente, nas portas 3000 a 3006.

## Justificativa

O contrato publicado da plataforma e o dos microsservicos: e o que a colecao
Postman oficial documenta, o que cada servico expoe em seu Swagger e o que um
consumidor externo integraria. O BFF e um detalhe de implementacao do
frontend, que pode mudar sem que a plataforma mude.

Testar o BFF na camada de API tambem produziria uma cobertura enganosa: uma
falha em `/api/auth/login` nao distingue defeito do servico de autenticacao de
defeito do route handler do Next, o que e exatamente o tipo de ambiguidade que
uma suite em camadas deveria eliminar.

O BFF nao fica sem cobertura: os nove cenarios de interface passam por ele em
cada acao, de ponta a ponta, que e o modo como ele e realmente usado.

## Consequencias

- O ambiente local precisa publicar as portas dos servicos, e nao apenas a do
  frontend. O `docker-compose.yml` deste repositorio faz isso.
- Uma quebra exclusiva do BFF aparece como falha de interface, nao de API. E o
  sinal correto: quem quebrou foi o frontend.
- A divergencia de status entre as duas camadas (403 contra 401) fica
  documentada aqui. Nao e defeito de nenhum dos lados isoladamente, mas e uma
  inconsistencia que vale conhecer antes de integrar.
