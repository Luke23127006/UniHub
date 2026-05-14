# Prisma Guide

## Setup

Copy `.env.example` to `.env` and fill in `DATABASE_URL`, then:

```bash
npm install
```

## Common Commands

| Task                                 | Command                                                                               |
| ------------------------------------ | ------------------------------------------------------------------------------------- |
| Apply migrations (dev)               | `npx prisma migrate dev --schema src/prisma/schema.prisma`                            |
| Apply migrations (prod)              | `npx prisma migrate deploy --schema src/prisma/schema.prisma`                         |
| Create migration only, no apply      | `npx prisma migrate dev --create-only --name <name> --schema src/prisma/schema.prisma`|
| Reset DB and re-apply all migrations | `npx prisma migrate reset --schema src/prisma/schema.prisma`                          |
| Validate schema                      | `npx prisma validate --schema src/prisma/schema.prisma`                               |
| Regenerate Prisma client             | `npx prisma generate --schema src/prisma/schema.prisma`                               |
| Open Prisma Studio                   | `npx prisma studio --schema src/prisma/schema.prisma`                                 |

## Adding a Migration

1. Edit `src/prisma/schema.prisma` with your changes.
2. Run:
   ```bash
   npx prisma migrate dev --name <short_description> --schema src/prisma/schema.prisma
   ```
   This generates the SQL in `src/prisma/migrations/` and applies it.
3. Commit both the schema and the new migration folder.

> If you need to write raw SQL (e.g. CHECK constraints, partial indexes) that Prisma can't generate, use `--create-only` to get the file first, edit the SQL, then run `npx prisma migrate deploy`.

## Syncing After a Pull

When you pull changes that include new migrations, apply them with:

```bash
npx prisma migrate deploy --schema src/prisma/schema.prisma
```

The Prisma client is regenerated automatically after `migrate dev`. For `migrate deploy`, run `npx prisma generate --schema src/prisma/schema.prisma` manually if needed.

## File Structure

```
src/prisma/
├── schema.prisma          # Source of truth — edit this, not the SQL directly
├── seed.js
├── migrations/
│   ├── migration_lock.toml
│   └── <timestamp>_<name>/
│       └── migration.sql
```
