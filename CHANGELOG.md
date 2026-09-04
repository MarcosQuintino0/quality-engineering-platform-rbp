# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).
Este projeto segue [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [1.0.0] — 2026-09-04

Primeira versão completa da plataforma de testes.

### Adicionado

**Ambiente reproduzível**

- Subida do Restful Booker Platform em containers a partir do commit fixado
  `d36bd3f`, sem exigir JDK 26, Maven ou k6 instalados na máquina.
- Health check por estado observável, com diagnóstico via `npm run env:status`.
- Acesso somente leitura aos bancos H2 por ferramenta JDBC mínima em container,
  usando o servidor TCP que o próprio SUT oferece.

**Catálogo de 30 cenários**

- 12 de API (QEP-001 a QEP-012)
- 4 de contrato (QEP-013 a QEP-016)
- 9 de interface (QEP-017 a QEP-025)
- 2 de integração entre camadas (QEP-026, QEP-027)
- 2 de persistência em banco (QEP-028, QEP-029)
- 1 de acessibilidade (QEP-030)

**Framework**

- Clientes de API sem asserção embutida.
- Page Objects orientados a comportamento.
- Factories com semente determinística, isoladas por worker.
- Rastreador de recursos que limpa mesmo após falha.
- Validação de contrato com Ajv, relatando todos os desvios de uma vez.
- Rastreabilidade por cenário no relatório: identificador, camada, risco e
  requisito.

**Performance**

- PERF-001 a PERF-005 em k6, executados em container.
- Guarda de host que recusa carga contra qualquer alvo fora da allowlist.
- Baseline medida e limites derivados dela, não estimados.

**CI/CD**

- Verificação de pull request com gates estáticos e cenários críticos.
- Regressão completa no push para `main`, com Allure publicado no GitHub Pages.
- Regressão estendida, sob demanda, com Firefox, análise de instabilidade e k6 smoke.
- Execução manual de performance com cenário e duração parametrizados.
- Dependabot semanal com agrupamento de dependências relacionadas.

**Documentação**

- Estratégia de testes, matriz de riscos, matriz de rastreabilidade,
  arquitetura, quality gates, estratégia de massa de dados, política de testes
  instáveis e estratégia de performance.
- Quatro ADRs registrando decisões com as alternativas descartadas.
- Evidências visuais reais: GIF da jornada de reserva e capturas do ambiente em
  execução.

### Encontrado no sistema sob teste

Seis defeitos, todos com reprodução verificada em `docs/known-issues.md`:

- **RBP-01** — consulta de quarto excluído devolve 500 em vez de 404.
- **RBP-02** — reserva conflita consigo mesma ao ser atualizada, impedindo
  corrigir o nome de um hóspede sem mover as datas.
- **RBP-03** — criar reserva gera mensagem de contato não solicitada.
- **RBP-04** — frontend em container não alcança as APIs, porque os rewrites do
  Next são serializados no build com `localhost` congelado.
- **RBP-05** — excluir um quarto deixa reservas órfãs no banco de reservas.
- **RBP-06** — criação concorrente devolve o identificador e os dados de outro
  recurso, por conexão JDBC compartilhada entre threads.

Nenhum deles virou asserção da suíte: assertar o comportamento defeituoso o
transformaria em contrato protegido pelos próprios testes.

### Instabilidades tratadas

- **FLK-01** (QEP-020) — sincronização: a página renderizava o botão de edição
  antes de os dados chegarem. Corrigido aguardando estado observável.
- **FLK-02** (QEP-018) — erro do teste: `getByRole('alert')` disputava com o
  anunciador de rota do Next. Corrigido escopando o seletor.
- **FLK-03** (QEP-008, QEP-010) — defeito do produto (RBP-06). Contornado com
  serialização documentada do instante da criação, com condição de saída.

Nenhuma foi resolvida com aumento de timeout ou retry.

[1.0.0]: https://github.com/MarcosQuintino0/quality-engineering-platform-rbp/releases/tag/v1.0.0
