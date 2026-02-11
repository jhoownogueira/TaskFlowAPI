# TaskFlow API — Rodar “prod local” com Docker Compose

Este projeto usa **NestJS + Prisma + PostgreSQL**.  
A ideia do “prod local” é subir **API + DB em containers**, simulando o comportamento de produção (build + `dist` + `prisma migrate deploy`).

---

## Pré-requisitos

- Docker + Docker Compose
- Node.js (opcional, só se você quiser rodar em modo dev fora do Docker)

---

## Arquivos importantes

- `docker-compose.yml`
  - serviço `db` (Postgres)
  - serviço `api` (Nest) com `profiles: ["prod"]`
- `.env.prod`
  - variáveis de ambiente usadas pelo container da API no modo “prod local”
- `Dockerfile`
  - builda o Nest (`npm run build`) e roda `node dist/main.js`

---

## Subir o ambiente “prod local”

-- Na raiz do projeto
- docker compose down
- docker compose --profile prod up -d --build

-- A API estará disponível em: http://localhost:3000


## Modo desenvolvimento

-- Na raiz do projeto
- docker compose up -d db
- npm run start:dev

