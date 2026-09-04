# Arquitetura

## Visão geral

```mermaid
flowchart LR
    subgraph suite["Suíte de testes"]
        direction TB
        T["tests/<br/>30 cenários QEP"]
        F["framework/<br/>clientes, páginas,<br/>fixtures, factories"]
        P["performance/<br/>cenários k6"]
        T --> F
    end

    subgraph sut["Sistema sob teste (Docker)"]
        direction TB
        FE["rbp-assets<br/>Next.js :8080"]
        API["Microsserviços<br/>:3000 a :3006"]
        DB[("H2 em memória<br/>um por serviço")]
        FE -->|BFF /api/*| API
        API --> DB
    end

    F -->|"HTTP: API e contratos"| API
    F -->|"navegador: interface"| FE
    F -->|"JDBC somente leitura<br/>:9090 a :9094"| DB
    P -->|"carga"| API
```

O ponto que a figura torna evidente: **a suíte fala com as três camadas**, e é
isso que permite provar uma afirmação em vez de apenas repeti-la. Uma reserva
criada na interface é confirmada pela API, e um valor gravado pela API é
confirmado no banco. Verificar uma escrita pela mesma camada que a fez seria
circular.

## Camadas do framework

```mermaid
flowchart TD
    Teste["Cenário de teste<br/>tests/**/*.spec.ts"]

    Teste --> Fixtures["Fixtures<br/>sessão, clientes, limpeza"]
    Teste --> Pages["Page Objects<br/>comportamento da tela"]
    Teste --> Assert["Asserções de domínio"]
    Teste --> Schemas["Schemas de contrato"]

    Fixtures --> Clients["Clientes de API<br/>sem assert embutido"]
    Fixtures --> Cleanup["Rastreador de recursos"]
    Fixtures --> Factories["Factories<br/>semente determinística"]

    Pages --> Componentes["Componentes<br/>formulário de contato"]
    Clients --> HTTP["HttpClient"]
    Cleanup --> Clients
    Teste --> DBc["Cliente H2<br/>somente leitura"]

    HTTP --> Config["Configuração<br/>allowlist de hosts"]
    DBc --> Config
```

### Por que cada peça existe

**Clientes de API sem assert.** Um cliente que valida status por conta própria
decide, no lugar do teste, o que é falha. Em QEP-003 um 403 é o resultado
esperado; em QEP-004 seria defeito. Só o cenário sabe a diferença.

**Page Objects de comportamento.** A página de login expõe `entrar` e
`mensagemDeErro`, não um getter por campo. Um Page Object que espelha o HTML
precisa mudar a cada ajuste de layout, mesmo quando o comportamento não mudou.

**Factories com semente.** A semente vem da configuração e é combinada ao
índice do worker. A mesma execução produz os mesmos dados, e workers paralelos
nunca geram a mesma sequência — determinismo e isolamento ao mesmo tempo.

**Rastreador de recursos.** Registra o que o teste criou e remove em ordem
inversa no teardown, inclusive quando o teste falha. Resíduo de teste quebrado
contamina os seguintes e mascara defeitos reais.

**Cliente H2 isolado.** O acesso ao banco é somente leitura e roda em container.
O detalhamento está no [ADR 0003](decisions/adr-0003-acesso-ao-banco.md).

## Jornada principal ponta a ponta

```mermaid
sequenceDiagram
    participant T as Teste (QEP-026)
    participant A as API de quartos
    participant N as Navegador
    participant B as API de reservas
    participant D as Banco H2

    T->>A: POST /room (com sessão)
    A-->>T: 201 com roomid
    Note over T: rastreia para limpeza

    T->>N: abre /reservation/{roomid}?checkin&checkout
    N->>N: preenche dados do hóspede
    N->>B: POST /booking via BFF
    B->>D: grava a reserva
    B-->>N: 201
    N-->>T: "Booking Confirmed"

    T->>B: GET /booking?roomid (com sessão)
    B-->>T: reserva com as datas enviadas
    Note over T: a confirmação na tela não prova<br/>que o dado existe
```

## Fluxo de CI/CD

```mermaid
flowchart TD
    PR["Pull request"] --> Q["Prettier, ESLint, TypeScript"]
    PR --> R["API, contratos e smoke de interface"]
    Q --> Gate{"Todos verdes?"}
    R --> Gate
    Gate -->|não| Bloqueia["Merge bloqueado"]
    Gate -->|sim| Merge["Merge em main"]

    Merge --> Full["30 cenários em Chromium"]
    Full --> Allure["Gera Allure com histórico"]
    Allure --> Pages["Publica no GitHub Pages"]
    Full -->|falha| Eva["Publica trace, screenshot,<br/>vídeo e logs"]

    Cron["Agendado, 04:00"] --> Reg["Catálogo + Firefox"]
    Cron --> Flk["3 execuções sem retry"]
    Cron --> K6["k6 smoke"]

    Man["Acionamento manual"] --> Perf["Cenário e duração<br/>escolhidos na hora"]
```

Stress, pico e soak nunca disparam sozinhos. São caros, e um disparo acidental
tem consequência real.

## Decisões registradas

| ADR                                                    | Decisão                                                     |
| ------------------------------------------------------ | ----------------------------------------------------------- |
| [0001](decisions/adr-0001-camada-de-api.md)            | Testes de API atacam os microsserviços, não o BFF           |
| [0002](decisions/adr-0002-contrato-de-autenticacao.md) | Contrato de autenticação verificado no cabeçalho            |
| [0003](decisions/adr-0003-acesso-ao-banco.md)          | Acesso ao banco por ferramenta JDBC em container            |
| [0004](decisions/adr-0004-licenciamento.md)            | MIT neste repositório, SUT como dependência externa GPL-3.0 |
