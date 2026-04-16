# Real Estate Property Management System — Build Plan Request

You are a multi-agent software development team. Act as 7 specialized agents working through structured phases of a professional software lifecycle. Each agent must produce its own output before moving to the next phase.

---

## PROJECT CONTEXT

I manage real estate properties including:
- **One tower** (multiple apartments)
- **Multiple houses** for rent
- **Scale:** 20–100 units total

### Current pain points (ranked by priority)
1. **Maintenance cost errors** — numbers sometimes incorrect or manipulated by staff
2. **Scattered WhatsApp receipts** — tenants send payment receipts via WhatsApp, nothing organized
3. **No occupancy/maintenance dashboard** — can't see occupied vs vacant, or maintenance history at a glance
4. Rent price inconsistency across similar units
5. Risk of repeating maintenance for the same issue on the same unit
6. Municipality-approved contracts exist only on paper

**MVP priority:** Solve items 1–3 first. Items 4–6 can be Phase 1 but not at the cost of the top 3.

---

## CONSTRAINTS (read carefully)

| Item | Decision |
|---|---|
| Platform | **Web app + mobile app** (web for owner/employees, mobile for tenants primarily) |
| Language | **Bilingual: Arabic (RTL) + English (LTR)** with a language switcher. All UI, emails, notifications must support both. |
| Scale | 20–100 units, ~100–300 tenants over time |
| Currency | **AED (UAE Dirham)** — display as "AED" in English, "د.إ" in Arabic |
| Date format | **Gregorian only** (no Hijri). Support `DD/MM/YYYY` and Arabic locale formatting |
| Database | **PostgreSQL** (required — hosted on Supabase) |
| Hosting | **Source on GitHub, Frontend on Vercel, Backend on Railway, DB + Storage + Auth on Supabase** |
| File storage | **Supabase Storage** from day one (receipts, contracts, maintenance photos) |
| Budget tier | Small business — prefer open-source stack, avoid expensive SaaS dependencies |
| Existing data migration | Manual entry for MVP; bulk CSV import as a Phase 2 nice-to-have |

### Tech stack — partially locked
The infrastructure is fixed (GitHub / Vercel / Railway / Supabase / PostgreSQL). What's still open:
- **Frontend framework:** suggest **Next.js (App Router) + TypeScript + Tailwind + shadcn/ui** unless you have a strong reason to propose an alternative. Must support RTL natively.
- **Mobile app:** suggest **React Native (Expo)** so tenant app shares code with web. If you recommend otherwise (Flutter, PWA-only), justify it.
- **Backend on Railway:** suggest **Node.js (Fastify or NestJS) + TypeScript** OR **Python (FastAPI)**. Pick one with justification — do not offer both and stall. Use the same language across the project.
- **ORM:** Prisma or Drizzle (if Node) / SQLAlchemy (if Python).
- **Auth:** use **Supabase Auth** (email/password + phone OTP for tenants). Do not build custom auth.
- **OCR:** recommend an approach that works for **Arabic + English text** on Railway's constraints. Options to evaluate: Google Cloud Vision, AWS Textract, Tesseract with Arabic traineddata, or a hosted service. Flag cost per 1000 scans.

Architect Agent: present the chosen stack with one-line justification per choice, then wait for my approval before detailed design.

---

## FUNCTIONAL REQUIREMENTS

### 1. Property Management
- CRUD for properties (tower, houses) and units (apartments, individual houses)
- Each unit has: status (occupied/vacant/under-maintenance), base rent, size, notes
- Hierarchical view: property → units

### 2. Tenant Management
- Tenant profiles (name, ID/passport, phone, email, emergency contact)
- Link tenant → unit with contract start/end dates
- Tenant portal (mobile-first) to view own contract, payment history, upload receipts, submit maintenance requests

### 3. Payments
- Tenants upload receipt images/PDFs (from WhatsApp or direct)
- **OCR auto-extraction** of amount and date from receipts
  - Must handle **Arabic and English** text. Numerals will be standard Western digits (0–9) only — no Arabic-Indic digits needed
  - OCR output is a **suggestion** — owner/employee must confirm before it's finalized
  - Store both raw image and extracted fields
  - Flag low-confidence extractions for manual review
- Rent schedule per tenant (monthly/quarterly/yearly)
- Payment history per tenant and per unit
- Auto-mark overdue after grace period (configurable)

### 4. Maintenance Management
- Record maintenance requests (who reported, unit, issue category, description, photos)
- Cost entry with approval workflow: employee submits → owner approves
- **Duplicate prevention rule (explicit):** if the same unit has a maintenance request with the same `issue_category` within the last **30 days** (configurable), system warns and requires owner override with a written justification. Log the override.
- Full maintenance history per unit
- Alert when a unit has ≥3 maintenance requests in 90 days (recurring problem flag)

### 5. Contracts
- Upload scanned municipality-approved contracts (PDF/image)
- Link contract → tenant + unit + date range
- Expiry reminders: 60/30/7 days before end date

### 6. Dashboard & Reports
- Occupancy rate, vacant vs rented units
- Maintenance cost summary (by unit, by month, by category)
- Payment status (paid / due / overdue) with drilldown
- Export reports to PDF and Excel (both languages)

### 7. Roles & Permissions
- **Owner:** full access
- **Employee:** add/edit units, record maintenance, log payments, but **cannot** approve costs or delete records
- **Tenant:** view own data, upload receipts, submit maintenance requests
- **Audit log:** every create/update/delete action logged with user, timestamp, before/after values

---

## EXTRA FEATURES

- **Notifications:** unpaid rent reminders (tenant + owner), contract expiry, maintenance status updates. Channels: in-app + email + optional WhatsApp Business API (mark as Phase 2 if it adds cost).
- **Alerts:** recurring maintenance, suspicious cost entries (e.g., cost > 2× unit average), contract expiring soon
- **Audit log:** immutable, searchable by user/date/action
- **OCR on receipts:** as specified in §3

---

## AGENT ROLES

Work as these 7 agents in order:

1. **Product Manager Agent** — requirements, edge cases, risks, open questions
2. **System Architect Agent** — architecture diagram (described in text), tech stack options, DB schema, API surface
3. **UI/UX Designer Agent** — screen list, key flows (tenant receipt upload, owner dashboard, employee maintenance entry), bilingual/RTL considerations
4. **Backend Developer Agent** — API endpoints spec, business logic, validation rules, OCR integration approach
5. **Frontend Developer Agent** — web (owner/employee) + mobile (tenant) component breakdown, state management, i18n setup
6. **QA/Testing Agent** — test cases covering the 6 pain points, OCR accuracy tests, role-permission tests, edge cases
7. **DevOps Agent** — GitHub repo structure (monorepo vs separate), Vercel deployment for frontend, Railway deployment for backend (env vars, build commands, health checks), Supabase setup (RLS policies, storage buckets, auth config), CI/CD via GitHub Actions, backup strategy (Supabase daily backups + exported dumps), security (RLS, rate limiting, secrets management), monitoring (Railway logs, Sentry or similar)

---

## PROCESS RULES — IMPORTANT

1. Work in these phases, in order:
   - Phase 1: Requirements Analysis (PM Agent)
   - Phase 2: System Design (Architect + UI/UX)
   - Phase 3: Implementation Plan (Backend + Frontend)
   - Phase 4: Development breakdown (tasks, milestones)
   - Phase 5: Testing (QA)
   - Phase 6: Deployment (DevOps)
   - Phase 7: Maintenance & roadmap

2. **STOP after each phase.** Show me the output and wait for my "approved, continue" before starting the next phase. Do not dump all phases at once.

3. **Mandatory stopping points where you MUST pause for my input:**
   - After PM Agent lists open questions → wait for my answers
   - After Architect confirms stack choices (frontend framework, backend language, OCR approach) → wait for my approval
   - After full DB schema is drafted → wait for my review before API spec
   - Before writing any code → wait for approval of the implementation plan

4. **Flag every assumption** with `[ASSUMPTION]` tags. Do not silently assume.

5. **Ask, don't guess.** If a requirement is unclear, ask before proceeding. Asking is not skipping — skipping is producing output without the info.

6. Prioritize **data accuracy and preventing human error** over feature count.

---

## OUTPUT FORMAT

- Clearly separate each agent's section with headers
- Use tables, lists, and code blocks — not walls of prose
- Be practical and specific (file names, endpoint paths, field names), not theoretical
- At the end of each phase, produce a short **"Decisions made / Open questions / Next phase preview"** summary

---

**Start with Phase 1: Product Manager Agent — Requirements Analysis.** Stop at the end of Phase 1 and wait for my approval before continuing.
