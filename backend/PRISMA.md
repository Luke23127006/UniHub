# Prisma Guide

## Setup

Copy `.env.example` to `.env` and fill in `DATABASE_URL`, then:

```bash
npm install
```

## Common Commands

| Task                                 | Command                                              |
| ------------------------------------ | ---------------------------------------------------- |
| Apply migrations (dev)               | `npx prisma migrate dev`                             |
| Apply migrations (prod)              | `npx prisma migrate deploy`                          |
| Create migration only, no apply      | `npx prisma migrate dev --create-only --name <name>` |
| Reset DB and re-apply all migrations | `npx prisma migrate reset`                           |
| Validate schema                      | `npx prisma validate`                                |
| Regenerate Prisma client             | `npx prisma generate`                                |
| Open Prisma Studio                   | `npx prisma studio`                                  |

## Adding a Migration

1. Edit `prisma/schema.prisma` with your changes.
2. Run:
   ```bash
   npx prisma migrate dev --name <short_description>
   ```
   This generates the SQL in `prisma/migrations/` and applies it.
3. Commit both the schema and the new migration folder.

> If you need to write raw SQL (e.g. CHECK constraints, partial indexes) that Prisma can't generate, use `--create-only` to get the file first, edit the SQL, then run `npx prisma migrate deploy`.

## Syncing After a Pull

When you pull changes that include new migrations, apply them with:

```bash
npx prisma migrate deploy
```

The Prisma client is regenerated automatically after `migrate dev`. For `migrate deploy`, run `npx prisma generate` manually if needed.

## File Structure

```
prisma/
├── schema.prisma          # Source of truth — edit this, not the SQL directly
├── migrations/
│   ├── migration_lock.toml
│   └── <timestamp>_<name>/
│       └── migration.sql
```
