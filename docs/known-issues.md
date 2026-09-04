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
