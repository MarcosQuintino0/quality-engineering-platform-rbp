## O que muda

Uma ou duas frases sobre o que este PR faz. Se corrige algo, diga o que estava
quebrado antes.

## Por quê

O motivo da mudança. Se houver decisão técnica com alternativa descartada,
explique aqui ou aponte o ADR correspondente em `docs/decisions/`.

## Cenários afetados

Identificadores QEP adicionados, alterados ou removidos. Se a contagem lógica
de 30 mudou, explique por quê — ela é um invariante do projeto.

## Verificações

- [ ] `npm run format:check`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npx playwright test` com o ambiente local no ar
- [ ] A suite passou em execuções consecutivas, sem depender de retry

## Documentação

- [ ] `docs/traceability-matrix.md` atualizada, se a cobertura mudou
- [ ] `docs/known-issues.md` atualizado, se um defeito do SUT foi encontrado
- [ ] ADR criado, se houve decisão arquitetural relevante
- [ ] README atualizado, se o comportamento visível do projeto mudou

## Riscos

O que pode quebrar com esta mudança e como reverter, se necessário.
