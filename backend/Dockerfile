FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache dumb-init
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./

RUN mkdir -p /app/uploads

EXPOSE 4000
ENTRYPOINT ["dumb-init", "--"]
# NOTE: this project has no prisma/migrations directory — schema changes
# are applied with `db push`, not `migrate deploy` (see README / any
# PART*_*.md doc). Using `migrate deploy` here was leftover from the
# original single-tenant scaffold and does not match how this repo's
# schema has been evolved across the multi-tenancy transformation.
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/main"]
