# Asset Operations Platform

Serialized equipment control for churches, media teams, production companies, and event operations. The operator workspace stays separate from a password-gated admin dashboard.

## Stack

- Next.js 16 (App Router) + TypeScript
- PostgreSQL + Prisma
- Tailwind CSS
- Render web service + managed Postgres

## Local setup

1. Copy environment variables:

```bash
cp .env.example .env
```

2. Start Postgres (Docker):

```bash
docker compose up -d
```

3. Install dependencies, generate the client, and apply migrations:

```bash
npm install
npx prisma migrate deploy
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000), register an organization, then optionally **Load sample production kit** from Settings.

`AUTH_SECRET` must be at least 32 characters.

## Product surfaces

- `/` — organization register / login
- `/workspace` — operations console (search, sign-out, return, fault, rental)
- `/admin` — protected analytics, equipment, rentals, faulty queue, and history (15-minute password unlock)

## Render

This repo includes a Blueprint in `render.yaml` (web service + Postgres). After pushing to GitHub:

1. Open `https://dashboard.render.com/blueprint/new?repo=https://github.com/Godson-0306/Media-Inventory-System`
2. Set `AUTH_SECRET` (32+ random characters)
3. Apply the Blueprint

Free Render Postgres expires after 30 days. Upgrade the database plan for production use.

Health check: `GET /api/health`
