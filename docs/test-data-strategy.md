# Estratégia de massa de dados

## O problema

Testes que compartilham dados falham em paralelo, falham fora de ordem, e
falham por motivos que não têm relação com o que deveriam verificar. O tempo
gasto investigando esse tipo de falha é o custo real de uma massa mal
projetada.

## Princípios

**Cada teste cria o que usa.** Nenhum cenário depende de dado deixado por outro
nem do estado inicial do banco, com uma exceção documentada abaixo.

**Identificadores únicos e determinísticos.** A semente base vem de
`DATA_SEED` e é combinada ao índice do worker do Playwright. A mesma execução
produz os mesmos dados; workers paralelos nunca produzem a mesma sequência.
Determinismo e isolamento não são objetivos concorrentes aqui.

**Dado de teste é reconhecível.** Tudo que a suíte cria carrega o prefixo
`QEP`, o que permite distinguir massa de teste do seed do SUT ao inspecionar o
ambiente.

**Válido por padrão.** As factories produzem objetos que passam na validação do
SUT. O cenário que precisa de dado inválido pede explicitamente, o que deixa
visível no teste qual regra está sendo exercitada.

**A limpeza roda mesmo após falha.** O rastreador de recursos remove em ordem
inversa à criação, no teardown da fixture. Falha de limpeza vira anotação no
relatório em vez de exceção, porque mascarar o erro original de um teste com um
erro de teardown atrapalha o diagnóstico.

## A regra de disponibilidade e o paralelismo

Este é o ponto que exigiu decisão explícita.

O SUT recusa reservas com datas sobrepostas no mesmo quarto. Isso é regra de
negócio correta, mas transforma paralelismo em falha aparente: dois testes que
reservem o mesmo quarto nas mesmas datas recebem 409, e a mensagem parece
defeito.

Duas defesas, combinadas:

1. **Cada teste cria o próprio quarto.** Quartos são baratos e o isolamento é
   completo.
2. **A factory de datas afasta progressivamente as estadias.** Cada chamada de
   `buildStayDates` desloca a janela alguns dias adiante, de modo que mesmo
   reservas no mesmo quarto não colidem.

A alternativa seria rodar em série. Seria mais simples e esconderia o
acoplamento em vez de eliminá-lo.

## Exceções documentadas

**Quarto 1 do seed em PERF-003.** O cenário de carga combinada usa o quarto 1,
que vem do seed do SUT e existe sempre. Criar um quarto por unidade virtual
mediria a criação de quartos, e não a criação de reservas.

**Mensagens geradas pelo produto.** Cada reserva criada faz o SUT gerar uma
mensagem `You have a new booking!` (RBP-03 em `docs/known-issues.md`). Essas
mensagens não são criadas pelos testes e não entram no rastreador. Elas somem
quando o ambiente é recriado, já que o H2 é em memória. A consequência prática:
nenhuma asserção da suíte usa contagem total de mensagens, apenas a presença de
um identificador específico.

## Ciclo de vida do ambiente

Os bancos vivem na memória dos containers. Derrubar e subir devolve o ambiente
ao estado inicial:

```bash
npm run env:down && npm run env:up
```

A variável `dbRefresh` é deliberadamente omitida do compose. Com ela, o SUT
reiniciaria o banco periodicamente e o ambiente deixaria de ser determinístico
— uma reserva poderia desaparecer no meio de um teste.

## Segredos

Não há segredo real neste projeto. As credenciais `admin` / `password` são as
credenciais públicas e fixas do Restful Booker Platform, documentadas no README
oficial dele. Estão em `.env.example` porque são configuração, não segredo.

O `.env` está no `.gitignore`. Se este projeto passasse a exigir credencial de
verdade, ela viria de variável protegida do ambiente ou de secret do repositório,
nunca de arquivo versionado.
