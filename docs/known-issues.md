# Defeitos observados no sistema sob teste

Os itens abaixo foram observados diretamente no Restful Booker Platform no
commit fixado `d36bd3f`, durante a construcao desta suite. Nenhum deles e
hipotese: cada um traz o passo de reproducao que o produziu.

Eles nao sao corrigidos aqui. Este repositorio testa o RBP, nao o altera. O
registro existe para que a suite trate cada comportamento de forma consciente,
em vez de transformar um defeito em criterio de aprovacao.

---

## RBP-01 — Consulta de quarto excluido devolve 500 em vez de 404

**Severidade:** media
**Servico:** rbp-room
**Descoberto em:** 04/09/2026

**Reproducao**

```bash
TOKEN=$(curl -s -i -X POST http://localhost:3004/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}' \
  | grep -i "^set-cookie" | sed 's/.*token=\([^;]*\).*/\1/')

ROOM=$(curl -s -X POST http://localhost:3001/room/ \
  -H "Content-Type: application/json" -H "Cookie: token=$TOKEN" \
  -d '{"roomName":"S2","type":"Double","accessible":false,"image":"/images/room1.jpg","description":"probe","features":["WiFi"],"roomPrice":150}')

# extraia o roomid do JSON acima, entao:
curl -s -o /dev/null -w "%{http_code}\n" -X DELETE http://localhost:3001/room/<roomid> -H "Cookie: token=$TOKEN"
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/room/<roomid>
```

**Esperado:** 404 Not Found na consulta apos a exclusao.
**Observado:** 202 na exclusao e **500 Internal Server Error** na consulta.

**Impacto na suite:** QEP-007 comprova a exclusao pela ausencia do quarto na
listagem, e nao pela consulta direta. Assertar 500 transformaria o defeito em
comportamento esperado, e a suite passaria a proteger o bug.

Para comparacao, o servico de reservas trata o mesmo caso corretamente:
consultar uma reserva excluida devolve 404, como QEP-011 verifica.

---

## RBP-02 — Reserva conflita consigo mesma ao ser atualizada

**Severidade:** alta
**Servico:** rbp-booking
**Descoberto em:** 04/09/2026

**Reproducao**

1. Crie uma reserva para o quarto 3 de 2027-01-10 a 2027-01-12.
2. Envie `PUT /booking/{id}` alterando apenas o sobrenome, mantendo as datas.

**Esperado:** 200, com o sobrenome alterado.
**Observado:** **409 Conflict**, com corpo vazio.

Alterando tambem as datas para uma janela livre, o mesmo `PUT` devolve 200.
A checagem de disponibilidade considera a propria reserva sendo editada como
um conflito de datas.

**Impacto no produto:** nao e possivel corrigir o nome, o telefone ou o
indicador de deposito de um hospede sem mover a estadia para outras datas.
Para um sistema de reservas, isso bloqueia uma correcao trivial de cadastro.

**Impacto na suite:** QEP-010 atualiza a reserva movendo-a para uma janela
livre, o que exercita o caminho que funciona. O caminho quebrado esta
documentado aqui em vez de virar um teste que espera 409, o que consolidaria
o defeito como contrato.

---

## RBP-03 — Criar reserva gera mensagem de contato nao solicitada

**Severidade:** baixa
**Servicos:** rbp-booking e rbp-message
**Descoberto em:** 04/09/2026

Cada `POST /booking/` bem-sucedido faz o servico de reservas criar uma mensagem
com assunto `You have a new booking!` no servico de mensagens.

Nao e defeito por si so: e uma notificacao deliberada. Fica registrado porque
tem duas consequencias praticas para os testes:

1. A caixa de mensagens cresce a cada reserva criada, e qualquer assercao sobre
   contagem total de mensagens e instavel por natureza. Por isso a suite sempre
   verifica a presenca de um identificador especifico.
2. Essas mensagens nao sao criadas pelos testes e nao entram no rastreador de
   limpeza. Elas desaparecem quando o ambiente e recriado, ja que o H2 e
   em memoria. A estrategia esta detalhada em `docs/test-data-strategy.md`.

---

## RBP-04 — Frontend em container nao alcanca as APIs: rewrites congelados em localhost

**Severidade:** alta (impede o uso do frontend na implantacao em container)
**Servico:** rbp-assets
**Descoberto em:** 04/09/2026

**Sintoma**

Com o ambiente subido pelo `docker-compose.yml` do proprio RBP, abrir o detalhe
de um quarto na administracao ou excluir um quarto pela interface falha. As
chamadas devolvem 500 e o log do container mostra:

```
Failed to proxy http://localhost:3001/room/30 Error: connect ECONNREFUSED 127.0.0.1:3001
```

**Reproducao**

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/api/room      # 200
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/api/room/1    # 500
```

**Causa**

`assets/next.config.js` monta os rewrites de `/api/*` a partir de variaveis de
ambiente, com `localhost` como valor padrao:

```js
const roomApi = process.env.ROOM_API || 'http://localhost:3001';
```

O projeto usa `output: 'standalone'`, e nesse modo a configuracao e serializada
durante o `npm run build`. O `Dockerfile` do RBP, porem, declara `ROOM_API` e as
demais variaveis **apenas no estagio runner**, depois da compilacao. No estagio
builder elas nao existem, entao o build congela os rewrites apontando para
`localhost`.

Fora de container o efeito e invisivel, porque `run_locally` sobe todos os
servicos na mesma maquina e `localhost` esta correto. Dentro de container,
`localhost` e o proprio frontend, e nao ha nada escutando naquelas portas.

As variaveis definidas em tempo de execucao (que o `docker-compose.yml` do RBP
define corretamente) chegam tarde demais: os rewrites ja foram gravados.

**Contorno adotado**

`docker/assets.Dockerfile` neste repositorio define as mesmas variaveis tambem
no estagio de compilacao. Nenhuma linha do codigo do SUT e alterada; muda apenas
a receita de build, que e configuracao de ambiente.

**Impacto na suite**

Sem o contorno, QEP-020 e QEP-021 falham por indisponibilidade de infraestrutura,
e nao por defeito de comportamento. Deixar assim produziria falhas que nao
apontam para nada acionavel, que e o pior tipo de teste vermelho.

---

## RBP-05 — Excluir um quarto deixa reservas orfas no banco de reservas

**Severidade:** alta
**Servicos:** rbp-room e rbp-booking
**Descoberto em:** 04/09/2026, por QEP-029

**Reproducao**

1. Crie um quarto pela API e anote o `roomid`.
2. Crie duas reservas para esse quarto.
3. Exclua o quarto: `DELETE /room/{roomid}` devolve 202.
4. Consulte o banco de reservas:
   `SELECT * FROM BOOKINGS WHERE roomid = {roomid}`.

**Esperado:** nenhuma reserva apontando para um quarto que nao existe mais, ou
uma recusa da exclusao enquanto houver reservas ativas.

**Observado:** a exclusao e aceita e as reservas continuam gravadas, apontando
para um `roomid` inexistente.

**Causa**

`RoomService.deleteRoom` apaga apenas a linha da tabela `ROOMS` no banco do
proprio servico. O servico de quartos possui uma classe `BookingRequests`, mas
ela e usada somente para consultar disponibilidade em
`/booking/unavailable`; nao ha chamada, evento ou compensacao que informe o
servico de reservas sobre a exclusao.

Numa arquitetura de servicos com bancos separados nao existe integridade
referencial entre eles: ou o servico coordena explicitamente, ou o dado fica
inconsistente. Aqui nao ha coordenacao.

**Consequencia**

Reservas passam a referenciar um quarto inexistente. Relatorios por quarto e
telas administrativas que resolvem o `roomid` podem falhar ou omitir dados, e
nao ha caminho pela interface para localizar ou limpar essas reservas.

**Impacto na suite**

QEP-029 verifica o comportamento que esta correto: excluir uma reserva remove
exatamente a linha dela e nao afeta as demais. A ausencia de orfas nao virou
assercao porque hoje ela falharia sempre, e um teste permanentemente vermelho
deixa de ser sinal. Assertar a presenca das orfas seria pior: transformaria o
defeito em contrato protegido pela suite.

A verificacao volta como assercao no momento em que o produto passar a tratar
o caso, seja recusando a exclusao, seja removendo as reservas associadas.
