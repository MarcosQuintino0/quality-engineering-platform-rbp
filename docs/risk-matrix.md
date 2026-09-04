# Matriz de riscos

A estrategia de teste deste projeto e orientada a risco. Os cenarios existem
porque cobrem um risco identificado, e nao para preencher uma grade de
funcionalidades.

O sistema testado e uma plataforma de reservas de hospedagem. O prejuizo de um
defeito nao e uniforme: perder uma reserva paga custa muito mais caro do que
exibir uma descricao de quarto errada. A matriz abaixo reflete isso.

## Criterio

**Impacto** — o estrago se o defeito chegar em producao.
**Probabilidade** — chance de o defeito existir ou reaparecer, considerando a
complexidade da regra e quantas partes do sistema ela atravessa.

| | Impacto baixo | Impacto medio | Impacto alto |
| --- | --- | --- | --- |
| **Probabilidade alta** | medio | alto | **critico** |
| **Probabilidade media** | baixo | medio | alto |
| **Probabilidade baixa** | baixo | baixo | medio |

## Riscos

### R1 — Sessao administrativa pode ser burlada
**Impacto:** alto. **Probabilidade:** media. **Classificacao:** alto.

A autenticacao separa quem so pode reservar de quem pode alterar precos, quartos
e reservas alheias. Uma falha aqui expoe dados de hospedes e permite alteracao
indevida de inventario.

O risco e concreto neste sistema: a autorizacao e verificada endpoint a
endpoint, por meio de um cookie lido em cada controller, e nao por um filtro
central. Cada endpoint novo e uma oportunidade de esquecer a verificacao.

**Cobertura:** QEP-001, QEP-002, QEP-003, QEP-013, QEP-017, QEP-018.

### R2 — Reserva e perdida ou gravada incorretamente
**Impacto:** alto. **Probabilidade:** alta. **Classificacao:** critico.

E a transacao que da receita ao negocio. O caminho atravessa frontend, BFF,
servico de reservas e banco; cada fronteira e um ponto onde o dado pode se
perder ou se deformar.

**Cobertura:** QEP-008, QEP-010, QEP-015, QEP-022, QEP-026, QEP-027, QEP-028.

A verificacao em banco existe por causa deste risco: confirmar uma escrita pela
mesma API que a fez e circular e nao prova persistencia.

### R3 — Disponibilidade calculada errado gera overbooking
**Impacto:** alto. **Probabilidade:** media. **Classificacao:** alto.

A regra de conflito de datas e a unica logica de negocio nao trivial do sistema.
A consulta que a implementa cobre tres formas de sobreposicao.

Este risco ja se materializou: **RBP-02** mostra que a checagem considera a
propria reserva como conflito ao atualiza-la. Ver `docs/known-issues.md`.

**Cobertura:** QEP-009, QEP-010, QEP-024, PERF-003.

### R4 — Contrato de API quebra sem aviso
**Impacto:** alto. **Probabilidade:** media. **Classificacao:** alto.

A plataforma tem seis servicos que se consomem mutuamente, e o frontend depende
de todos. Uma mudanca de formato quebra consumidores em silencio: a resposta
continua chegando com status 200 e o campo esperado some.

**Cobertura:** QEP-013, QEP-014, QEP-015, QEP-016.

### R5 — Exclusao deixa dados orfaos ou falha silenciosamente
**Impacto:** medio. **Probabilidade:** media. **Classificacao:** medio.

Excluir um quarto que possui reservas e excluir uma reserva sao operacoes que
podem "funcionar" na resposta e nao acontecer no armazenamento.

Este risco tambem ja se materializou: **RBP-01**, consulta de quarto excluido
devolvendo 500.

**Cobertura:** QEP-007, QEP-011, QEP-021, QEP-029.

### R6 — Interface administrativa impede a operacao diaria
**Impacto:** medio. **Probabilidade:** alta. **Classificacao:** alto.

Quem opera o hotel trabalha pela interface. Um formulario que nao salva bloqueia
o trabalho mesmo com a API integra.

**Cobertura:** QEP-017 a QEP-021, QEP-023, QEP-025.

### R7 — Plataforma inacessivel a pessoas com deficiencia
**Impacto:** medio. **Probabilidade:** media. **Classificacao:** medio.

Alem da barreira de uso, ha exposicao legal. No Brasil, a LBI (Lei 13.146/2015)
trata acessibilidade digital como obrigacao.

A verificacao automatizada cobre apenas parte do problema: axe detecta violacoes
estruturais, nao usabilidade real com leitor de tela. A limitacao esta declarada
no README.

**Cobertura:** QEP-030.

### R8 — Degradacao sob carga na consulta de disponibilidade
**Impacto:** medio. **Probabilidade:** media. **Classificacao:** medio.

A consulta de disponibilidade e o endpoint mais chamado e o mais custoso.

**Cobertura:** PERF-001 a PERF-005.

Os limites medidos valem para a maquina local e nao autorizam conclusao sobre
producao. Ver `docs/performance-strategy.md`.

## Riscos assumidos conscientemente

**Branding e relatorios.** Cobertos apenas de forma indireta. Sao superficies de
leitura, com impacto baixo, e cobri-los consumiria orcamento de teste que rende
mais nos riscos criticos.

**Seguranca alem de autenticacao.** Injecao, XSS e escalonamento de privilegio
nao sao cobertos. Exigem ferramental e autorizacao propria, e testes desse tipo
jamais devem rodar contra a instancia publica.

**Compatibilidade entre navegadores.** Chromium e o alvo padrao; Firefox roda em
regressao programada. Safari e navegadores moveis nao sao cobertos.
