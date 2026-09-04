# Quality gates

Um gate só vale se puder reprovar. Cada verificação abaixo bloqueia alguma
coisa, e a coluna de motivo explica o defeito que ela detecta — um gate que não
consegue nomear o que impede é cerimônia.

## No pull request

| Verificação                           | Bloqueia | Motivo                                                                    |
| ------------------------------------- | -------- | ------------------------------------------------------------------------- |
| `prettier --check`                    | merge    | Diferença de formatação polui o diff e esconde a mudança real             |
| `eslint`                              | merge    | `any` injustificado e promessa não aguardada produzem falha fantasma      |
| `tsc --noEmit`                        | merge    | Um contrato que mudou de forma aparece aqui antes de virar teste vermelho |
| API e contratos                       | merge    | Cobrem os riscos R1 e R4 com execução de segundos                         |
| Smoke de interface (QEP-017, QEP-022) | merge    | Login e jornada de reserva são o caminho crítico do negócio               |

O objetivo é feedback abaixo de dez minutos. A regressão completa fica no push
para `main`: rodar tudo no PR atrasaria o ciclo sem detectar mais nada, já que
as camadas mais caras raramente quebram sozinhas.

## No push para main

| Verificação                | Bloqueia   | Motivo                                                          |
| -------------------------- | ---------- | --------------------------------------------------------------- |
| Os 30 cenários em Chromium | release    | É o catálogo inteiro; nenhum risco identificado fica descoberto |
| Geração do Allure          | publicação | Relatório que não gera é relatório que ninguém lê               |
| Publicação no Pages        | —          | Falha aqui não invalida os testes, mas é registrada             |

## Na regressão programada

| Verificação                           | Ação em caso de falha  | Motivo                                                     |
| ------------------------------------- | ---------------------- | ---------------------------------------------------------- |
| Catálogo em Chromium e Firefox        | issue                  | Divergência entre navegadores é defeito de compatibilidade |
| Três execuções consecutivas sem retry | issue de instabilidade | Retry mascararia a oscilação                               |
| k6 smoke                              | issue                  | Regressão de performance de ordem de grandeza              |

## Para aceitar uma entrega

Estes são os critérios verificados antes de considerar o trabalho pronto. O
estado atual de cada um está no README.

- [ ] Prettier, ESLint e TypeScript aprovados
- [ ] Exatamente 30 cenários lógicos listados em Chromium
- [ ] Os 30 aprovados localmente
- [ ] Três execuções completas consecutivas sem falha
- [ ] Execução paralela funcional
- [ ] Ambiente sobe seguindo apenas o README
- [ ] Nenhum teste depende de ordem
- [ ] Limpeza funcionando, inclusive após falha
- [ ] Nenhum segredo versionado
- [ ] GitHub Actions verde
- [ ] Allure publicado
- [ ] k6 funcional localmente, com baseline real
- [ ] Evidências visuais reais, não montadas
- [ ] Matriz de rastreabilidade completa
- [ ] README refletindo o comportamento real do projeto

## O que deliberadamente não é gate

**Cobertura de código.** A suíte testa um sistema externo; medir cobertura do
código de teste diria quanto do próprio framework foi exercitado, o que não
informa nada sobre a qualidade do que está sendo testado. Um número alto aqui
seria decorativo.

**Zero violações de acessibilidade.** O SUT já possui violações sérias, e este
repositório não altera código de terceiro. O gate é não introduzir violação
nova além da baseline documentada. Ver `tests/accessibility/baseline.json`.

**Ausência de reservas órfãs.** Documentada como RBP-05 em
`docs/known-issues.md`. Assertar a ausência daria um teste permanentemente
vermelho; assertar a presença transformaria o defeito em contrato protegido
pela suíte.
