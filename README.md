# Intern

Next.js 16 (App Router) + HeroUI v3 + Prisma 7, ready to connect to TiDB.

## Getting started

```bash
npm install
cp .env.example .env     # then put your TiDB connection string in DATABASE_URL
npm run db:push          # create tables from prisma/schema.prisma in TiDB
npm run dev
```

Open http://localhost:3000, then `/api/health` to verify the TiDB connection.

## Connecting to TiDB

- TiDB is MySQL-compatible → Prisma `provider = "mysql"` with the `@prisma/adapter-mariadb` driver adapter (required in Prisma 7).
- Get the connection string from TiDB Cloud → **Connect**. Format: `mysql://USER:PASSWORD@HOST:4000/DATABASE`.
- TLS is turned on automatically for non-local hosts (`src/lib/prisma.ts`); set `DATABASE_SSL=false` to disable.
- Use `npm run db:push` for schema changes. `prisma migrate dev` needs a shadow database, which TiDB Cloud does not allow.
- Foreign keys need TiDB ≥ 8.5; on older clusters set `relationMode = "prisma"` in the datasource block.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm run db:generate` | Regenerate Prisma Client (also runs on `npm install`) |
| `npm run db:push` | Sync schema to the database |
| `npm run db:studio` | Prisma Studio |

## Structure

- `prisma/schema.prisma`, `prisma.config.ts` — schema and connection config
- `src/lib/prisma.ts` — Prisma Client singleton with TiDB adapter
- `src/app/api/health`, `src/app/api/tasks` — example routes
- `src/app/globals.css` — Tailwind v4 + `@heroui/styles`
# Intern_shop
