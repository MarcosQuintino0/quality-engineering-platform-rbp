# Matriz de rastreabilidade

Liga cada cenario do catalogo ao risco que ele cobre, ao arquivo que o
automatiza e ao momento do pipeline em que ele roda.

A tabela responde a duas perguntas que costumam ficar sem resposta numa suite:
por que este teste existe, e o que fica descoberto se ele for removido.

**Legenda de execucao no pipeline**

| Sigla | Quando roda |
| --- | --- |
| PR | verificacao de pull request |
| MAIN | push na branch principal |
| REG | regressao programada |

Os riscos (R1 a R8) estao definidos em [risk-matrix.md](risk-matrix.md).

## API — 12 cenarios

| ID | Cenario | Camada | Risco | Requisito verificado | Arquivo | Pipeline |
| --- | --- | --- | --- | --- | --- | --- |
| QEP-001 | Sessao valida e utilizavel | API | R1 alto | Login valido devolve sessao que autoriza operacao protegida | `tests/api/auth.spec.ts` | PR, MAIN, REG |
| QEP-002 | Credenciais invalidas rejeitadas | API | R1 alto | Senha incorreta responde 403 e nao emite cookie | `tests/api/auth.spec.ts` | PR, MAIN, REG |
| QEP-003 | Operacao protegida sem sessao | API | R1 alto | Criacao de quarto sem token responde 403 e nada e criado | `tests/api/auth.spec.ts` | PR, MAIN, REG |
| QEP-004 | Criacao de quarto | API | R5 medio | Criacao autorizada devolve 201 e preserva os atributos | `tests/api/rooms.spec.ts` | PR, MAIN, REG |
| QEP-005 | Consulta de quarto por id | API | R5 medio | Consulta devolve o mesmo quarto criado | `tests/api/rooms.spec.ts` | PR, MAIN, REG |
| QEP-006 | Atualizacao de quarto | API | R5 medio | Atualizacao devolve 202 e o novo estado fica consultavel | `tests/api/rooms.spec.ts` | MAIN, REG |
| QEP-007 | Exclusao de quarto | API | R5 medio | Exclusao devolve 202 e o quarto sai da listagem | `tests/api/rooms.spec.ts` | MAIN, REG |
| QEP-008 | Criacao de reserva | API | R2 critico | Hospede reserva sem autenticacao e recebe o identificador | `tests/api/bookings.spec.ts` | PR, MAIN, REG |
| QEP-009 | Filtro de reservas por quarto | API | R3 alto | O filtro inclui as reservas do quarto e exclui as demais | `tests/api/bookings.spec.ts` | MAIN, REG |
| QEP-010 | Atualizacao de reserva | API | R2 critico | Atualizacao para janela livre devolve 200 com os novos dados | `tests/api/bookings.spec.ts` | MAIN, REG |
| QEP-011 | Exclusao de reserva | API | R5 medio | Exclusao devolve 202 e a reserva deixa de ser consultavel | `tests/api/bookings.spec.ts` | MAIN, REG |
| QEP-012 | Mensagem de contato | API | R6 alto | Mensagem enviada fica visivel na administracao | `tests/api/messages.spec.ts` | MAIN, REG |

## Contrato — 4 cenarios

| ID | Cenario | Camada | Risco | Requisito verificado | Arquivo | Pipeline |
| --- | --- | --- | --- | --- | --- | --- |
| QEP-013 | Contrato de autenticacao | Contrato | R4 alto | 200 sem corpo, com Set-Cookie contendo token alfanumerico e Path=/ | `tests/contracts/auth-contract.spec.ts` | PR, MAIN, REG |
| QEP-014 | Contrato de quarto | Contrato | R4 alto | Criacao, consulta e listagem concordam sobre a forma do quarto | `tests/contracts/room-contract.spec.ts` | PR, MAIN, REG |
| QEP-015 | Contrato de reserva | Contrato | R4 alto | Criacao devolve envelope e listagem devolve colecao | `tests/contracts/booking-contract.spec.ts` | PR, MAIN, REG |
| QEP-016 | Contrato de erro | Contrato | R4 alto | Payload invalido devolve 400 com todos os campos em fieldErrors | `tests/contracts/error-contract.spec.ts` | PR, MAIN, REG |

## Interface — 9 cenarios

| ID | Cenario | Camada | Risco | Requisito verificado | Arquivo | Pipeline |
| --- | --- | --- | --- | --- | --- | --- |
| QEP-017 | Login administrativo valido | Interface | R1 alto | Credenciais validas dao acesso a administracao | `tests/ui/admin-login.spec.ts` | PR, MAIN, REG |
| QEP-018 | Feedback de login invalido | Interface | R1 alto | Erro anunciado de forma acessivel e acesso mantido bloqueado | `tests/ui/admin-login.spec.ts` | MAIN, REG |
| QEP-019 | Criacao de quarto pela interface | Interface | R6 alto | O formulario grava os valores e a listagem os exibe | `tests/ui/admin-rooms.spec.ts` | MAIN, REG |
| QEP-020 | Edicao de quarto pela interface | Interface | R6 alto | A alteracao persiste apos recarregar e e confirmada pela API | `tests/ui/admin-rooms.spec.ts` | MAIN, REG |
| QEP-021 | Exclusao de quarto pela interface | Interface | R5 medio | O quarto sai da listagem e da plataforma | `tests/ui/admin-rooms.spec.ts` | MAIN, REG |
| QEP-022 | Jornada de reserva do hospede | Interface | R2 critico | Datas, dados e confirmacao, com a reserva existindo na API | `tests/ui/booking-journey.spec.ts` | PR, MAIN, REG |
| QEP-023 | Campos obrigatorios da reserva | Interface | R6 alto | Campos vazios geram aviso e nenhuma reserva e criada | `tests/ui/booking-journey.spec.ts` | MAIN, REG |
| QEP-024 | Combinacao invalida de datas | Interface | R3 alto | Saida antes da entrada nao produz reserva | `tests/ui/booking-journey.spec.ts` | MAIN, REG |
| QEP-025 | Contato pela interface | Interface | R6 alto | Mensagem confirmada na tela chega a administracao | `tests/ui/contact.spec.ts` | MAIN, REG |

## Integracao, banco e acessibilidade — 5 cenarios

| ID | Cenario | Camada | Risco | Requisito verificado | Arquivo | Pipeline |
| --- | --- | --- | --- | --- | --- | --- |
| QEP-026 | API para interface para API | Integracao | R2 critico | Quarto criado pela API e reservado na interface aparece na API | `tests/integration/cross-layer.spec.ts` | MAIN, REG |
| QEP-027 | Reserva da API na administracao | Integracao | R2 critico | Reserva criada pela API e exibida na tela do quarto | `tests/integration/cross-layer.spec.ts` | MAIN, REG |
| QEP-028 | Persistencia da atualizacao | Banco | R2 critico | Os valores atualizados chegam ao H2 do servico | `tests/database/persistence.spec.ts` | MAIN, REG |
| QEP-029 | Exclusao atinge apenas a linha certa | Banco | R5 medio | A reserva excluida some e as demais permanecem | `tests/database/persistence.spec.ts` | MAIN, REG |
| QEP-030 | Acessibilidade das paginas criticas | Acessibilidade | R7 medio | Nenhuma violacao seria ou critica alem da baseline documentada | `tests/accessibility/critical-pages.spec.ts` | MAIN, REG |

## Performance — adicional, fora da contagem dos 30

| ID | Cenario | Risco | Arquivo | Execucao |
| --- | --- | --- | --- | --- |
| PERF-001 | Smoke | R8 medio | `performance/smoke/smoke.js` | REG e manual |
| PERF-002 | Carga progressiva em consultas | R8 medio | `performance/load/load.js` | manual |
| PERF-003 | Carga combinada com criacao de reservas | R8 medio | `performance/load/mixed.js` | manual |
| PERF-004 | Spike em fluxo de leitura | R8 medio | `performance/spike/spike.js` | manual |
| PERF-005 | Soak local | R8 medio | `performance/soak/soak.js` | manual |

## Cobertura por risco

| Risco | Classificacao | Cenarios |
| --- | --- | --- |
| R1 sessao burlada | alto | QEP-001, 002, 003, 013, 017, 018 |
| R2 reserva perdida | critico | QEP-008, 010, 015, 022, 026, 027, 028 |
| R3 overbooking | alto | QEP-009, 010, 024, PERF-003 |
| R4 contrato quebrado | alto | QEP-013, 014, 015, 016 |
| R5 exclusao inconsistente | medio | QEP-004 a 007, 011, 021, 029 |
| R6 interface bloqueia operacao | alto | QEP-012, 017 a 021, 023, 025 |
| R7 acessibilidade | medio | QEP-030 |
| R8 degradacao sob carga | medio | PERF-001 a PERF-005 |

Nenhum risco identificado ficou sem cobertura. Os riscos assumidos
conscientemente, sem cobertura por decisao, estao listados ao final de
[risk-matrix.md](risk-matrix.md).
