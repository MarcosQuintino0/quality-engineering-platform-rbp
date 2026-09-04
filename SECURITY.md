# Política de segurança

## Escopo

Este repositório contém uma suíte de testes automatizados. Ele não expõe
serviço, não processa dado de pessoa real e não armazena credencial de valor.

O sistema testado, o [Restful Booker Platform](https://github.com/mwinteringham/restful-booker-platform),
é software de terceiro. Vulnerabilidades encontradas nele devem ser reportadas
ao projeto original, não aqui.

## Credenciais neste repositório

As credenciais `admin` / `password` em `.env.example` são as credenciais
públicas e fixas do Restful Booker Platform, documentadas no README oficial
dele. Não são segredo: são configuração de um ambiente de treinamento local.

Nenhum outro valor sensível é versionado. O `.env` está no `.gitignore`, e o
GitHub Secret Scanning está ativo no repositório.

Se este projeto passar a exigir credencial real, ela virá de variável protegida
do ambiente ou de secret do repositório, nunca de arquivo versionado.

## Uso responsável do sistema sob teste

A instância pública `automationintesting.online` é mantida gratuitamente por
Mark Winteringham para fins educacionais.

**Testes de carga, escrita em massa e operações destrutivas rodam apenas em
ambiente local.** Isso não é apenas convenção: o `scripts/run-k6.js` recusa
qualquer alvo fora da allowlist antes de iniciar, e o
`assertHostIsAllowedForDestructiveWork` no framework faz o mesmo em código. Um
erro de configuração não pode ser suficiente para transformar este projeto em
abuso de um serviço gratuito.

A instância pública é usada apenas para exploração leve e manual.

## Dependências

O Dependabot verifica semanalmente as dependências npm e as ações do GitHub.
Atualizações de segurança têm prioridade sobre compatibilidade de versão.

Para auditar localmente:

```bash
npm audit
```

## Reportar um problema neste repositório

Se encontrar um problema de segurança no código deste repositório — segredo
exposto, dependência vulnerável, workflow com permissão excessiva — abra uma
issue descrevendo o problema e o impacto. Como não há serviço em produção nem
dado de terceiros envolvido, não há necessidade de divulgação privada.
