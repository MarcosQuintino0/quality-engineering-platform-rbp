# Politica de testes instaveis

Um teste instavel e pior do que nenhum teste. Ele treina a equipe a ignorar
vermelho, e a partir dai o vermelho legitimo tambem passa despercebido.

Esta politica descreve o que este projeto faz quando um teste falha de forma
intermitente. Nao e um texto aspiracional: as duas ocorrencias registradas ao
final aconteceram durante a construcao da suite e foram tratadas exatamente
como descrito aqui.

## Principios

**Retry nao aprova.** Ha uma unica retentativa no CI, e ela existe para
capturar evidencia, nao para produzir verde. Um teste que passa apenas na
segunda tentativa nao e uma execucao saudavel: e um sinal.

**Toda intermitencia tem causa.** Nenhum teste falha por acaso. Enquanto a
causa nao for identificada, o teste nao volta a ser confiavel, e marca-lo como
resolvido porque "parou de falhar" apenas adia o problema.

**A investigacao vem antes do contorno.** Aumentar timeout, adicionar espera
fixa ou repetir a acao sao contornos que escondem a causa. Sao aceitos apenas
depois de a causa ser conhecida e registrada, e nunca como primeira reacao.

## Procedimento

1. **Registrar a primeira falha.** Data, cenario, branch, execucao e se foi
   local ou no CI.

2. **Capturar evidencia.** A configuracao ja retem, em caso de falha, trace,
   screenshot, video e o log de rede. As assercoes de API incluem o corpo da
   resposta na mensagem. O objetivo e nao precisar de uma segunda execucao para
   entender o que houve.

3. **Reproduzir.** `--repeat-each` para repetir o cenario isolado e execucoes
   completas da suite para reproduzir concorrencia entre testes. Uma falha que
   so aparece na suite completa e quase sempre acoplamento ou disputa de dado.

4. **Classificar a causa** em uma destas categorias:

   | Categoria     | Significado                                                    |
   | ------------- | -------------------------------------------------------------- |
   | produto       | defeito real do SUT                                            |
   | ambiente      | infraestrutura, rede, container, recurso da maquina            |
   | dado          | massa compartilhada, colisao entre testes, residuo de execucao |
   | sincronizacao | o teste agiu antes de o sistema estar pronto                   |
   | contrato      | a resposta mudou de forma                                      |
   | teste         | erro de logica, seletor ou assercao do proprio teste           |

5. **Corrigir na causa.** Sincronizacao se resolve com estado observavel, nunca
   com espera fixa. Dado se resolve com massa propria por teste. Produto vira
   registro em `docs/known-issues.md` e o teste passa a exercitar o caminho
   correto por outra via.

6. **Quarentena, quando necessario.** Se a causa nao puder ser corrigida na
   hora, o cenario recebe a anotacao `@quarentena` e sai da execucao que
   bloqueia merge, continuando a rodar na regressao programada.

7. **Quarentena e visivel.** Testes em quarentena aparecem no relatorio e no
   README. Quarentena silenciosa e o mesmo que teste apagado.

8. **Toda quarentena tem issue e responsavel.** Sem dono e sem prazo, a
   quarentena vira cemiterio.

9. **Saida da quarentena exige prova.** O cenario volta apos passar em pelo
   menos tres execucoes completas consecutivas.

## Metricas

O projeto acompanha, a partir do relatorio Allure e do JUnit XML:

- aprovacao na primeira tentativa;
- quantidade de retries consumidos;
- cenarios em quarentena;
- tempo total da suite;
- cenarios mais lentos;
- causa das falhas, pela classificacao acima.

Nenhuma reducao de flakiness e afirmada aqui. O que existe e o registro do que
foi efetivamente observado, abaixo.

## Ocorrencias registradas

### FLK-01 — QEP-020 falhou em 1 de 3 execucoes completas

**Data:** 04/09/2026. **Categoria:** sincronizacao. **Status:** corrigido.

Detectado pela exigencia de tres execucoes completas do quality gate. As
execucoes 2 e 3 passaram; a 1 falhou.

O teste editava o preco de um quarto pela interface e, apos recarregar, o valor
antigo continuava na tela. O trace mostrou a sequencia: a pagina renderiza o
botao Edit **antes** de a requisicao do quarto terminar. O teste entrava em
edicao com o formulario ainda vazio, preenchia 349, e quando a resposta chegava
o `setRoom` sobrescrevia o estado, descartando o valor digitado.

Nao era defeito do produto: um humano tambem veria os campos preencherem
sozinhos, mas levaria mais tempo para digitar do que a requisicao para
responder.

**Correcao.** `AdminRoomDetailsPage.abrir` passou a aguardar o titulo
`Room: <nome>`, que so aparece depois de o estado ser populado. `salvar`
aguarda a resposta do `PUT`, porque a saida do modo de edicao acontece no
cliente e nao prova que algo foi gravado.

Nem timeout maior nem retry foram usados: ambos esconderiam a corrida em vez de
elimina-la.

### FLK-02 — QEP-018 falhou em aproximadamente 1 de 3 execucoes

**Data:** 04/09/2026. **Categoria:** teste. **Status:** corrigido.

Apareceu logo apos a correcao de FLK-01. A mensagem foi conclusiva:

```
strict mode violation: getByRole('alert') resolved to 2 elements:
  1) <div role="alert" class="alert alert-danger">Invalid credentials</div>
  2) <div role="alert" aria-live="assertive" id="__next-route-announcer__"></div>
```

O segundo elemento e injetado pelo proprio Next.js: o anunciador de rota, que
informa leitores de tela sobre navegacao no cliente. Ele existe apenas em parte
das execucoes, dependendo de a navegacao ter sido no cliente ou no servidor, e
por isso a falha era intermitente.

A causa era do teste. Procurar `role="alert"` na pagina inteira supoe que so a
aplicacao usa esse papel, e o framework tambem usa.

**Correcao.** O alerta passou a ser buscado dentro do cartao de login. A
intencao original foi preservada: o teste continua exigindo que o erro seja
anunciado de forma acessivel, apenas deixa de disputar com um elemento do
framework.
