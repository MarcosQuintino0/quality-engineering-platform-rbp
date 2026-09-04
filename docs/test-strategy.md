# Estrategia de testes

## Objetivo

Dar resposta confiavel e rapida a uma pergunta: o Restful Booker Platform ainda
faz o que promete? A suite existe para detectar regressao com diagnostico
suficiente para corrigir, e nao para produzir um numero de cobertura.

## Sistema sob teste

Restful Booker Platform, commit fixado `d36bd3f`, executado localmente via
Docker. Seis servicos Spring Boot com H2 embarcado e um frontend Next.js que
tambem expoe uma camada BFF em `/api/*`.

O ambiente e local e efemero por decisao: os bancos sao em memoria, entao
recriar os containers devolve o estado inicial. A instancia publica
`automationintesting.online` e usada apenas para exploracao leve; nenhum teste
de carga, escrita em massa ou operacao destrutiva aponta para la, e uma
allowlist de hosts no codigo recusa esse uso.

## Distribuicao por camada

| Camada | Cenarios | Proporcao |
| --- | --- | --- |
| API | QEP-001 a QEP-012 | 12 |
| Contrato | QEP-013 a QEP-016 | 4 |
| Interface | QEP-017 a QEP-025 | 9 |
| Integracao entre camadas | QEP-026, QEP-027 | 2 |
| Persistencia em banco | QEP-028, QEP-029 | 2 |
| Acessibilidade | QEP-030 | 1 |
| **Total** | | **30** |

A forma segue a piramide: a base em API, onde o teste e rapido, estavel e
aponta o servico culpado, e o topo estreito em interface, onde o teste e caro e
fragil mas e o unico que prova que a pessoa consegue usar o sistema.

Os nove cenarios de interface nao repetem o que a API ja cobriu. Eles verificam
o que so existe na interface: o formulario envia o que preencheu, o erro
aparece para quem errou, a jornada de reserva conclui do inicio ao fim.

## Escolha do que automatizar

Cada cenario cobre um risco de `docs/risk-matrix.md`. Um cenario sem risco
associado nao entra na suite, por mais facil que seja de escrever.

O teste e escrito na camada mais baixa que ainda responde a pergunta. Validacao
de campo obrigatorio se verifica na API, nao clicando num formulario, porque na
API o teste roda em milissegundos e nao quebra quando o botao muda de lugar.

## Independencia e paralelismo

Nenhum teste depende de outro nem da ordem de execucao. Cada um cria a propria
massa, com identificadores unicos por worker, e a remove no final por meio do
rastreador de recursos, que roda mesmo quando o teste falha.

A suite roda em paralelo por padrao. Isso nao e otimizacao: e verificacao. Uma
suite que so passa em serie esconde acoplamento entre testes.

O ponto de atencao real e a regra de disponibilidade: duas reservas paralelas no
mesmo quarto e nas mesmas datas conflitam por regra de negocio, e nao por
defeito. Por isso cada teste cria o proprio quarto, e a factory de datas afasta
progressivamente as estadias.

## Espera e estabilidade

Nao ha espera fixa na suite. A sincronizacao usa estado observavel: o health
check do ambiente aguarda o Actuator responder `UP`; os testes de interface
aguardam elemento ou resposta de rede.

Retry nao e mecanismo de aprovacao. Ha uma unica retentativa no CI, para
capturar evidencia de instabilidade, e um teste que so passa na segunda
tentativa e tratado como sinal a investigar. A politica esta em
`docs/flaky-test-policy.md`.

## Diagnostico

Uma falha precisa dizer o que aconteceu sem exigir nova execucao. As assercoes
de API incluem o corpo da resposta na mensagem; trace, screenshot e video ficam
retidos quando o teste falha; cada cenario declara seu identificador, camada,
risco e requisito no relatorio.

## Defeitos encontrados

Foram observados defeitos reais no SUT durante a construcao da suite, com
reproducao registrada em `docs/known-issues.md`. Onde um defeito bloqueia o
caminho esperado, a suite exercita o comportamento correto por outra via e
documenta o desvio, em vez de assertar o comportamento defeituoso. Assertar o
defeito o transformaria em contrato protegido pela propria suite.

## Fora de escopo

Testes de seguranca ofensiva, compatibilidade com Safari e navegadores moveis,
carga contra ambiente publico, e verificacao manual de acessibilidade com
leitor de tela. As razoes estao na matriz de riscos.
