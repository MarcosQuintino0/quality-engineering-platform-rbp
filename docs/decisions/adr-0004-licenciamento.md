# ADR 0004 — Licenca MIT para este repositorio, com o SUT como dependencia externa GPL-3.0

- **Status:** aceito
- **Data:** 04/09/2026

## Contexto

O Restful Booker Platform e distribuido sob **GNU GPL-3.0**, uma licenca
copyleft: trabalhos derivados precisam ser licenciados nos mesmos termos.

Este repositorio precisa de uma licenca propria, e a escolha nao pode ser feita
por gosto. Ela depende de como o RBP e efetivamente usado aqui.

## Como o SUT e utilizado

1. Nenhum arquivo de codigo do RBP e copiado para este repositorio.
2. O codigo do RBP e clonado em tempo de preparacao por
   `scripts/bootstrap-sut.js`, num commit fixo, para `.sut/`, que esta no
   `.gitignore`.
3. Nada do RBP e alterado. A unica configuracao aplicada e a variavel de
   ambiente `dbServer=true`, que o proprio RBP oferece.
4. A interacao acontece por HTTP e pelo protocolo TCP do H2, ou seja, entre
   processos separados.
5. Nenhum binario ou fonte do RBP e redistribuido por este repositorio.

## Decisao

O codigo original deste repositorio e licenciado sob **MIT**. O RBP e creditado
como dependencia externa, com sua licenca GPL-3.0 identificada no README.

## Justificativa

A GPL-3.0 alcanca trabalhos derivados e obras que se combinam com o programa
coberto formando um unico trabalho. Uma suite de testes que se comunica com o
programa por rede, sem incorporar nem redistribuir seu codigo, e um programa
independente: nao ha linkagem, nao ha copia e nao ha distribuicao.

O criterio pratico e simples: quem clona este repositorio recebe zero linhas de
codigo do RBP. Para executar os testes, e o proprio usuario que baixa o RBP
diretamente da fonte oficial, sob os termos da GPL-3.0 do autor.

MIT foi escolhida por ser permissiva e por ser a expectativa usual em um
portfolio: permite que qualquer pessoa reaproveite a arquitetura da suite sem
obrigacoes de copyleft.

## Consequencias

- O README credita Mark Winteringham e o RBP, aponta o repositorio oficial e
  identifica a GPL-3.0.
- O commit fixado do SUT fica registrado, de modo que a versao usada seja
  auditavel.
- Se em algum momento passar a ser necessario copiar codigo do RBP para este
  repositorio, esta decisao precisa ser revisada: a partir dai a GPL-3.0
  passaria a valer para o resultado.
