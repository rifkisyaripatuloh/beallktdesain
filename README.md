# TicketForge AI Backend

Next.js App Router REST API starter for TicketForge AI. Runtime target: Node.js 22, TypeScript, MySQL 8+, Prisma ORM.

## Implemented foundation
- Next.js App Router and TypeScript, with current Next.js `proxy.ts` convention for an optimistic authentication-cookie gate.
- Initial Prisma domain schema for users, sessions, organizations, members, templates/designs, QR tokens, ticket/card batches, tickets, AI history and export history.
- Auth endpoints: register, login, logout, refresh, current profile, update profile and change password.
- Argon2id passwords, short-lived signed JWT access cookie, random refresh token stored as SHA-256 hash and rotated with conditional database update.
- Zod request validation, consistent API response helpers and DB health check endpoint.
- Design configuration validation foundation; no executable code accepted.

## Requirements
- Node.js 22 LTS.
- MySQL 8+.
- Redis will be needed when BullMQ workers are implemented.

## Setup (PowerShell)
```powershell
npm install
Copy-Item .env.example .env
```

Configure `DATABASE_URL`, `JWT_ACCESS_SECRET`, and `JWT_REFRESH_SECRET` in `.env` with strong random values from a trusted secret manager. Laragon's MySQL configuration in this environment listens on port `3306`; set `DATABASE_URL="mysql://USER:PASSWORD@127.0.0.1:3306/ticketforge_ai"` (URL-encode special characters in the password). Create database `ticketforge_ai` in Laragon if needed. Do not commit `.env` or share its contents.

Create the local database if it does not exist:
```sql
CREATE DATABASE ticketforge_ai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Then run:
```powershell
npm run db:generate
npm run db:migrate -- --name init
npm run dev
```

REST API base: `http://localhost:3000/api/v1`.

## Authentication API
- `POST /api/v1/auth/register` — name, email and password (minimum 12 characters).
- `POST /api/v1/auth/login` — sets HttpOnly access and refresh cookies.
- `POST /api/v1/auth/refresh` — rotates refresh token and renews access cookie.
- `POST /api/v1/auth/logout` — revokes current refresh session.
- `GET /api/v1/auth/me` — current profile.
- `PATCH /api/v1/auth/profile` — update name.
- `PATCH /api/v1/auth/password` — change password and revoke all sessions.
- `GET /api/v1/health` — MySQL connectivity status.

## Verification commands
- `npm run typecheck`
- `npm run lint`
- `npm run build` (uses webpack to avoid a Windows Turbopack junction-point limitation)
- `npm test`

## Production checklist
- Add CSRF defenses and login rate limiting before production. Cookies currently use `SameSite=Lax`; require HTTPS and a strict allowed-origin policy.
- Add email verification, account recovery, role assignment policy, audit logging and resource-level authorization in all feature endpoints.
- Encrypt NIK at application layer before writing it. The schema column is only a placeholder and must not hold plaintext NIK.
- Set secrets/DB credentials in deployment secret manager; backup MySQL and monitor auth failures.

## Not in this foundation phase
Organization/member/design CRUD, imports, AI/Ollama, queues/workers, QR verification, exports/storage integration and OpenAPI documentation remain future implementation work.
"# beallktdesain" 
