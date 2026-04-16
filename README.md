# Aqari — Real Estate Property Management System

A bilingual (Arabic/English) property management system for managing rental units, tenants, payments, maintenance, and contracts in the UAE.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend (Web) | Next.js 14 + TypeScript + Tailwind + shadcn/ui |
| Mobile App | React Native (Expo) |
| Backend | NestJS + Fastify + TypeScript |
| Database | PostgreSQL (Supabase) |
| ORM | Prisma |
| Auth | Supabase Auth (email/password + phone OTP) |
| Storage | Supabase Storage |
| OCR | Google Cloud Vision (stubbed) |
| Email | Resend (stubbed) |

## Project Structure

```
aqari/
├── apps/
│   ├── web/          # Next.js dashboard (Owner/Employee)
│   ├── backend/      # NestJS API
│   └── mobile/       # React Native app (All roles)
├── packages/
│   └── shared/       # Types, validation schemas, constants
├── e2e/              # Playwright E2E tests
└── docker-compose.yml
```

## Prerequisites

- Node.js >= 20
- pnpm >= 9
- Docker (for local PostgreSQL)
- Supabase account

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Start local database
docker compose up -d

# 3. Copy environment files
cp apps/backend/.env.example apps/backend/.env
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env

# 4. Edit .env files with your Supabase credentials

# 5. Run database migrations
pnpm prisma migrate dev --schema=apps/backend/prisma/schema.prisma

# 6. Seed database
pnpm prisma db seed --schema=apps/backend/prisma/schema.prisma

# 7. Generate Prisma client
pnpm prisma generate --schema=apps/backend/prisma/schema.prisma

# 8. Start all services
pnpm dev
```

Services will be available at:
- Web: http://localhost:3000
- API: http://localhost:3001
- API Docs: http://localhost:3001/api/docs
- Mobile: Expo DevTools

## Features

### Pain Points Solved
1. **Maintenance cost errors** — Employee-submits → owner-approves workflow + audit log
2. **Scattered WhatsApp receipts** — Receipt upload with OCR + organized payment tracking
3. **No dashboard** — Real-time occupancy, payment, and maintenance dashboards
4. **Rent inconsistency** — Unit comparison tools
5. **Duplicate maintenance** — Automatic detection with configurable window
6. **Paper contracts** — Digital contract upload with expiry reminders

### Key Modules
- Properties & Units CRUD with hierarchical view
- Tenant management with Supabase Auth (phone OTP)
- Contracts with auto-generated payment schedules
- Receipt upload with OCR extraction + confirm/reject workflow
- Maintenance with duplicate detection + cost approval + budget tracking
- Dashboard with charts, alerts, and drill-down
- Notifications with cron jobs (overdue, expiry, recurring)
- Reports export (PDF/Excel, bilingual)
- Immutable audit log
- Bilingual UI (Arabic RTL + English LTR)

## Testing

```bash
# Unit tests
pnpm test

# Integration tests
pnpm test:integration

# E2E tests
pnpm e2e
```

## Deployment

- **Web**: Vercel (auto-deploy from main)
- **Backend**: Railway (Docker)
- **Database**: Supabase
- **Mobile**: EAS Build (Expo)

## License

Private — All rights reserved.
