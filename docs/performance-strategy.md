# Estrategia de performance

## O que este documento nao afirma

Os numeros aqui foram medidos numa maquina de desenvolvimento, contra um
ambiente em containers na mesma maquina, sem rede entre cliente e servidor e
sem concorrencia de outros sistemas.

**Nada aqui autoriza conclusao sobre producao.** Nao ha SLA definido para o
Restful Booker Platform, e inventar um seria pior do que nao ter nenhum. O que
estes cenarios entregam e uma linha de base reproduzivel: se uma alteracao
piorar a latencia em ordem de grandeza, os limites acusam.

**Ambiente de execucao.** Local, exclusivamente. O script `scripts/run-k6.js`
recusa qualquer alvo fora da allowlist antes de iniciar. A instancia publica
`automationintesting.online` e um servico gratuito mantido por terceiros:
carga contra ela seria abuso, e um erro de configuracao nao pode ser suficiente
para causar isso.

## Como os limites foram derivados

A ordem importa: primeiro medir, depois definir. Nenhum limite foi escolhido
por parecer razoavel.

### Passo 1 — baseline sem concorrencia (PERF-001)

Uma unidade virtual, 30 iteracoes, ambiente ocioso.

| Metrica                 | Valor           |
| ----------------------- | --------------- |
| http_req_duration medio | 3,36 ms         |
| mediana                 | 2,84 ms         |
| p(90)                   | 3,40 ms         |
| p(95)                   | 3,57 ms         |
| maximo                  | 22,78 ms        |
| http_req_failed         | 0,00%           |
| checks                  | 100% (60 de 60) |

### Passo 2 — ponto de saturacao

Antes de fixar limites, foi preciso saber onde o sistema realmente sofre. O
cenario de stress subiu ate 300 unidades virtuais sem pausa entre iteracoes.

| Metrica         | Valor                  |
| --------------- | ---------------------- |
| throughput      | 5.246 req/s            |
| p(90)           | 14,54 ms               |
| p(95)           | 17,20 ms               |
| maximo          | 296,09 ms              |
| http_req_failed | 0,04% (247 de 512.749) |

A conclusao dimensiona tudo o mais: mesmo a 5.200 requisicoes por segundo, o
p(95) fica abaixo de 18 ms. O SUT nao e o gargalo nas faixas de carga que os
demais cenarios exercitam.

### Passo 3 — limites com margem justificada

| Cenario                     | Medido p(90) / p(95) | Limite p(90) / p(95) | Margem      |
| --------------------------- | -------------------- | -------------------- | ----------- |
| PERF-002 carga              | 2,66 / 2,82 ms       | 15 / 25 ms           | ~6x e ~9x   |
| PERF-003 combinado          | 2,58 / 3,07 ms       | 25 / 40 ms           | ~10x e ~13x |
| PERF-003 criacao de reserva | 15,97 / 16,87 ms     | — / 120 ms           | ~7x         |
| PERF-004 pico               | 32,44 / 43,68 ms     | — / 250 ms           | ~6x         |
| PERF-005 soak               | ver execucao         | — / 40 ms            | ~13x        |

A margem de aproximadamente uma ordem de grandeza nao e arbitraria. Ela precisa
absorver a variacao de uma maquina compartilhada, onde outros processos
disputam CPU, sem deixar passar regressao real. O passo 2 mostra que uma
degradacao verdadeira e visivel muito antes desses limites: sessenta vezes mais
carga produziu p(95) de 17 ms, ainda dentro do limite de 25 ms do cenario de
carga. Um limite que so dispara com regressao de ordem de grandeza e util;
um limite colado na medicao seria ruido diario.

## Cenarios

| ID       | Cenario           | Perfil                       | Proposito                                                  |
| -------- | ----------------- | ---------------------------- | ---------------------------------------------------------- |
| PERF-001 | smoke             | 1 VU, 30 iteracoes           | Provar que o caminho medido funciona e dar a linha de base |
| PERF-002 | carga progressiva | degraus ate 50 VUs           | Ver onde a latencia comeca a crescer em leitura            |
| PERF-003 | carga combinada   | ate 30 VUs, 10% de escrita   | Medir leitura e escrita competindo                         |
| PERF-004 | pico              | salto de 10 para 200 VUs     | Comportamento no pico e recuperacao depois dele            |
| PERF-005 | soak              | 10 VUs, duracao configuravel | Degradacao que so aparece com o tempo                      |

O cenario de stress existe como ferramenta de calibragem, nao como parte do
catalogo: ele serve para localizar o ponto de saturacao quando os limites
precisarem ser revistos.

## Decisoes de modelagem

**Os cenarios falam com os microsservicos, nao com o frontend.** Medir o
Next.js mediria renderizacao de pagina; o risco R8 e sobre a capacidade das
APIs, em especial a consulta de disponibilidade.

**A escrita e minoritaria em PERF-003.** Uma reserva a cada dez iteracoes
reflete a proporcao real de um sistema de reservas, em que consultar e muito
mais frequente do que reservar. Uma carga com 50% de escrita mediria um sistema
que nao existe.

**As reservas de carga usam datas muito a frente e afastadas por iteracao.**
Sem isso, a regra de conflito de datas do SUT transformaria concorrencia
legitima em erro, e o teste mediria a regra de negocio em vez de capacidade.

**Checks de negocio, e nao apenas status HTTP.** A listagem precisa devolver
colecao nao vazia e a criacao precisa devolver identificador. Um endpoint que
responde 200 com corpo vazio, rapidamente, passaria numa verificacao que so
olhasse o status.

## Execucao no pipeline

| Cenario             | Quando                                             |
| ------------------- | -------------------------------------------------- |
| PERF-001 smoke      | regressao estendida e execucao manual              |
| PERF-002 a PERF-005 | apenas execucao manual, com parametros controlados |

Stress, pico e soak nunca sao acionados automaticamente. Sao caros, e um
disparo acidental num ambiente errado tem consequencia real. O workflow manual
exige selecao explicita do cenario.

## Resultados versionados

Os arquivos brutos do k6 ficam em `performance/results/raw/` e nao sao
versionados: sao grandes e sem valor historico. O que entra no repositorio e o
resumo sanitizado em `performance/results/`, com as metricas relevantes e a
data da medicao.

A saida do k6 e capturada e gravada pelo host, e nao pelo container. A imagem do
k6 roda como usuario nao-root, e escrever direto no volume montado falha no CI,
onde o diretorio pertence ao usuario do runner. O k6 registrava o erro e ainda
assim encerrava com codigo zero, produzindo um job verde com falha dentro.
