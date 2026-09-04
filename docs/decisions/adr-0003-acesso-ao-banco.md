# ADR 0003 — Acesso ao banco por ferramenta JDBC minima em container

- **Status:** aceito
- **Data:** 04/09/2026

## Contexto

Quatro cenarios do catalogo (QEP-026 a QEP-029) verificam persistencia. Isso
exige ler o banco real do SUT.

A investigacao mostrou que o RBP **nao usa PostgreSQL**. Cada servico embarca um
H2 em memoria proprio:

```java
ds.setURL("jdbc:h2:mem:rbp-booking;MODE=MySQL");
```

Sao cinco bancos independentes (auth, booking, branding, message, room), cada um
vivendo dentro da JVM do seu servico. Nao ha banco compartilhado.

O proprio SUT oferece a saida. `BookingDB` e suas equivalentes contem:

```java
if(System.getenv("dbServer").equals("true")){
    Server.createTcpServer("-tcpPort", "9090", "-tcpAllowOthers").start();
}
```

Ou seja, ha um caminho oficial e previsto para acesso externo ao banco, que so
precisa ser ligado por variavel de ambiente.

## Decisao

1. O `docker-compose.yml` define `dbServer=true` e publica as portas 9090 a 9094. Nenhuma linha do codigo do SUT e alterada.
2. As consultas passam por `tools/db-query/DbQuery.java`, um programa de
   arquivo unico executado com o lancador de fonte do Java, dentro de um
   container `eclipse-temurin:26-jdk`.
3. A ferramenta recusa qualquer comando que nao comece com `select`, `show` ou
   `with`, e abre a conexao com `setReadOnly(true)`.

## Justificativa

O protocolo TCP do H2 e especifico da JVM e nao tem driver maduro em Node.
Tentar falar com ele a partir do TypeScript seria reimplementar um protocolo
proprietario dentro de um projeto de testes.

Rodar em container evita exigir JDK 26 instalado na maquina de quem clona o
repositorio, coerente com a decisao de compilar o SUT tambem em container.

A guarda de somente leitura e a parte que mais importa. A suite observa o
estado do banco para provar persistencia; se pudesse escrever por ali,
poderia mascarar um defeito da aplicacao ao corrigir dados pelas costas dela.

## Alternativas descartadas

**Acrescentar PostgreSQL ao ambiente.** Aumentaria a lista de tecnologias do
README sem ter relacao com o sistema testado. O README afirmaria algo falso.

**Expor o console web do H2.** Exigiria alterar o codigo do SUT.

**Desistir da verificacao em banco e provar persistencia so pela API.** Seria
circular: usar a mesma camada para escrever e para confirmar a escrita nao
prova que o dado chegou ao armazenamento.

## Consequencias

- A camada de banco depende de Docker em execucao, como o resto do ambiente.
- Cada consulta sobe um container, o que custa alguns segundos. Aceitavel para
  quatro cenarios; se a camada crescer, vale um container de vida longa.
- Os nomes de coluna vem do H2 em maiusculas (`BOOKINGID`, `FIRSTNAME`), e os
  tipos mapeados em `framework/database/h2-client.ts` refletem isso.
