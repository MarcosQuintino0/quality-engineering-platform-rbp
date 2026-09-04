---
name: Teste instável
about: Registrar um cenário que falha de forma intermitente
title: '[FLK] QEP-XXX '
labels: instabilidade
---

> Antes de abrir: leia `docs/flaky-test-policy.md`. Retry não aprova, e a
> investigação vem antes do contorno.

## Cenário

- Identificador: QEP-XXX
- Arquivo:

## Frequência observada

Quantas falhas em quantas execuções, e se foi local ou no CI.

## Evidência capturada

- [ ] trace
- [ ] screenshot
- [ ] vídeo
- [ ] log de rede
- [ ] logs do container (`docker compose logs`)

Cole aqui a mensagem de falha completa.

## Reprodução

```bash
npx playwright test --grep "QEP-XXX" --repeat-each=10
```

Falha isolado, ou apenas na suite completa? Falhar só na suite completa quase
sempre indica acoplamento entre testes ou disputa de dado.

## Causa classificada

Marque uma. Se ainda não foi identificada, deixe em branco e diga o que já foi
descartado.

- [ ] produto — defeito real do SUT
- [ ] ambiente — infraestrutura, rede, container, recurso da máquina
- [ ] dado — massa compartilhada, colisão, resíduo de execução
- [ ] sincronização — o teste agiu antes de o sistema estar pronto
- [ ] contrato — a resposta mudou de forma
- [ ] teste — erro de lógica, seletor ou asserção do próprio teste

## Quarentena

- [ ] O cenário foi colocado em quarentena
- Responsável:
- Prazo para reavaliação:

A saída da quarentena exige três execuções completas consecutivas sem falha.
