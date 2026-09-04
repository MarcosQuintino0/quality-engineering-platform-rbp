# ---------------------------------------------------------------------------
# Build do frontend do SUT com os enderecos de API corretos.
#
# O Dockerfile original do Restful Booker Platform define BOOKING_API, ROOM_API
# e as demais variaveis apenas no estagio de execucao. Mas o next.config.js usa
# essas variaveis para montar os rewrites de /api/*, e com output "standalone"
# os rewrites sao serializados durante o "npm run build", ou seja, no estagio de
# compilacao, onde as variaveis ainda nao existem.
#
# O resultado e que os rewrites ficam congelados apontando para
# http://localhost:3001 e equivalentes. Fora de container isso funciona, porque
# os servicos rodam na mesma maquina. Dentro de container, localhost e o proprio
# frontend, e toda requisicao que cai no rewrite falha com ECONNREFUSED.
#
# O defeito esta documentado como RBP-04 em docs/known-issues.md. Aqui ele e
# contornado definindo as variaveis tambem no estagio de compilacao. Nenhuma
# linha do codigo do SUT e alterada: muda apenas a receita de build, que e
# configuracao de ambiente e pertence a este repositorio.
# ---------------------------------------------------------------------------
FROM node:24 AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# A diferenca em relacao ao Dockerfile original: os enderecos ja existem aqui,
# antes do build, e por isso entram corretamente nos rewrites serializados.
ENV BOOKING_API=http://rbp-booking:3000
ENV ROOM_API=http://rbp-room:3001
ENV BRANDING_API=http://rbp-branding:3002
ENV AUTH_API=http://rbp-auth:3004
ENV MESSAGE_API=http://rbp-message:3006
ENV REPORT_API=http://rbp-report:3005

RUN npm run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV BOOKING_API=http://rbp-booking:3000
ENV ROOM_API=http://rbp-room:3001
ENV BRANDING_API=http://rbp-branding:3002
ENV AUTH_API=http://rbp-auth:3004
ENV MESSAGE_API=http://rbp-message:3006
ENV REPORT_API=http://rbp-report:3005

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

RUN mkdir -p /app/.next/cache && chown -R nextjs:nodejs /app/.next
USER nextjs

EXPOSE 80
ENV PORT=80
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
