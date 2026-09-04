# Como contribuir

## Preparar o ambiente

Pré-requisitos: Node 22 ou superior, Docker com Compose, e Git. Não é preciso
instalar Java, Maven nem k6 — tudo o que precisa deles roda em container.

```bash
npm ci
cp .env.example .env
npm run env:up
```

O primeiro `env:up` clona o Restful Booker Platform no commit fixado, compila os
serviços num container Maven e sobe o ambiente. Demora alguns minutos. As
execuções seguintes reaproveitam o que já foi compilado.

Confirme antes de escrever qualquer teste:

```bash
npm run env:status
npx playwright test
```

## Antes de abrir um pull request

```bash
npm run format:check
npm run lint
npm run typecheck
npx playwright test
```

Rode a suíte mais de uma vez. Um cenário que passa numa execução e falha na
seguinte é instável, e a política em [docs/flaky-test-policy.md](docs/flaky-test-policy.md)
descreve o que fazer.

## Ao adicionar um cenário

A suíte tem exatamente 30 cenários lógicos, e esse número é um invariante. Um
cenário novo precisa de identificador `QEP-XXX` próprio e de entrada na
[matriz de rastreabilidade](docs/traceability-matrix.md).

Antes de escrever, responda: **que risco este cenário cobre?** Se a resposta
não estiver em [docs/risk-matrix.md](docs/risk-matrix.md), ou o risco está
faltando na matriz, ou o cenário não deveria existir.

Escreva na camada mais baixa que ainda responde à pergunta. Validação de campo
se verifica na API, não clicando num formulário: lá o teste roda em
milissegundos e não quebra quando o botão muda de lugar.

## O que não fazer

**Não use espera fixa.** Aguarde estado observável. Se algo só funciona com
`waitForTimeout`, a causa ainda não foi entendida.

**Não use retry para estabilizar.** Retry existe no CI para capturar
evidência, não para produzir verde.

**Não coloque assert dentro de cliente de API.** O cliente devolve a resposta;
quem decide se um 403 é falha ou resultado esperado é o cenário.

**Não asserte comportamento defeituoso.** Ao encontrar um defeito no SUT,
registre em [docs/known-issues.md](docs/known-issues.md) com reprodução e
exercite o caminho correto por outra via. Um teste que espera o bug transforma
o defeito em contrato protegido pela suíte.

**Não deixe dado para trás.** Registre no rastreador de recursos tudo o que o
teste criar.

**Não modifique o SUT.** O Restful Booker Platform é dependência externa. A
única configuração aplicada a ele são variáveis de ambiente que ele mesmo
oferece.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/pt-br/). O corpo
importa mais que o título: explique **por que**, não o que o diff já mostra.
Decisão com alternativa descartada merece um ADR em `docs/decisions/`.

## Encontrou um defeito no SUT?

Registre em `docs/known-issues.md` com passos de reprodução verificados e abra
uma issue usando o template de defeito. Não reporte ao projeto original a
partir daqui: este repositório é um estudo independente.
