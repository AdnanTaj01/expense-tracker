# Project Decisions

Locked decisions for the Expense Tracker project.

Confirmation on 2026-09-20. Last updated 2026-09-25.

Ye file un faislon ko record karti hai jo **architectural** hain —
kisi bhi feature ya phase mein badalne se pehle inhein dekh lein.

---

## 1. Order of Work

- **Backend first, then frontend.**
- Har feature ka order:
  1. Model (SQLAlchemy)
  2. Migration (Alembic)
  3. Schema (Pydantic)
  4. Service (business logic)
  5. Endpoint (FastAPI)
  6. Tests
  7. Commit

Yahi pattern Phase 6 se lekar Phase 17 tak follow hua.

---

## 2. Money & Currency

- **Storage:** `NUMERIC(12,2)` (PostgreSQL).
- **Language level:** Python `Decimal`. Kabhi `float` nahi.
- **Frontend:** strings (backend Decimal ko JSON string mein
  serialize karta hai).
- **Currency:** ek user = ek currency (defaults to `PKR`, user
  choose karta hai at register).
- **Multi-currency** MVP mein nahi. Transfers between accounts
  Phase 2 scope.

---

## 3. Account Balance & Transactions

- **Rule:** Account balance update **same DB transaction** mein
  hota hai jismein transaction row insert/update/delete hoti hai.
- **Atomicity:** dono ek hi `db.commit()` mein. Rollback par koi
  inconsistency nahi.
- **Recompute test:** har phase mein ek test jo balance ko
  transactions se recompute karke compare karta hai.
- **Sign rule:** `amount` hamesha positive; sign `kind` se aata hai:
  - `income` → `+amount`
  - `expense` → `−amount`

---

## 4. Authentication & JWT

- **Access token:** short-lived (default 30 minutes).
- **Logout:** client token discard karta hai. MVP mein server-side
  revocation nahi.
- **Refresh tokens:** httpOnly cookie + server-side revocation —
  hardening phase mein aayega (Phase 21/22).
- **401 handling:** frontend automatically logout + login page par
  redirect karta hai with "session expired" message.
- **Change password:** backend mein endpoint mojood hai lekin
  frontend Phase 13 ke baad use nahi karta — forgot-password flow
  better UX deta hai.

---

## 5. Password Hashing & Libraries

- **Hashing:** Argon2id via `pwdlib`.
- **JWT:** `PyJWT` (HS256).
- **Not used:** `passlib`, `python-jose` (purani recommendations,
  ab maintain nahi hoti).

---

## 6. Forgot Password Flow

- **Token:** 32 random bytes (`secrets.token_urlsafe`), SHA-256
  hashed in DB.
- **Expiry:** 15 minutes.
- **Single-use:** `used_at` set after successful reset.
- **One active per user:** naya request purane unused tokens
  invalid kar deta hai.
- **Enumeration-safe:** `/forgot-password` **always** 204 return
  karta hai, chahe email exist kare ya na kare.
- **Dev vs prod:**
  - Dev: reset link backend console par print hota hai
    (`DEBUG_RESET_LINKS=true`).
  - Prod: SMTP email send (Phase 16+ mein add karenge).

---

## 7. Database Access

- **Sync SQLAlchemy 2.x + psycopg 3.** Async version nahi use
  karenge.
- **Reason:** simpler learning curve, FastAPI sync functions ko
  thread pool mein efficiently handle karta hai, AI calls
  (Phase 18+) ke liye async use karenge hi — DB sync rahega.

---

## 8. Recurring Transactions

- **Dev:** manual trigger via `POST /api/v1/recurring/{id}/generate`.
- **Scheduler:** baad mein (Phase 2 scope). Koi Celery / APScheduler
  MVP mein nahi.
- **Semantics:** `next_run_at` aage badhta hai; `end_date`
  **inclusive** hai. Safety cap 1000 iterations per call.

---

## 9. AI Layer (Phase 18+)

- **Provider:** LLM + embedding model decide karne hain Phase 18 se
  pehle.
- **Interface:** ek chhota wrapper (`app/ai/llm/`) — provider swap
  aasan ho.
- **Rule:** AI sirf `services` call karta hai, kabhi seedha SQL nahi.
- **Reliability:** app AI ke bina bhi kaam karti hai. LLM sirf
  explain karta hai; source of truth nahi.

---

## 10. Receipts & File Storage

- **MVP:** local disk under `backend/uploads/receipts/`.
- **Filename:** uuid-prefixed stored name; original name
  display-only (untrusted).
- **Allowed types:** image/jpeg, image/png, image/webp, image/gif,
  application/pdf.
- **Max size:** 5 MB (`MAX_UPLOAD_SIZE_MB`).
- **Prod:** object storage (S3 / R2 / etc.) Phase 22 mein.
- **Deletion:** file disk se bhi delete hoti hai.

---

## 11. Frontend Stack

- **Build tool:** Vite 7.
- **Framework:** React 19 + TypeScript 5.6.
- **Styling:** Tailwind CSS 4 (plugin-based, no config file).
- **Routing:** React Router 7.
- **Charts:** Recharts 2.15 (Phase 16+).
- **State:** Context API (`AuthContext`, `ThemeContext`).
  TanStack Query **optional** — Phase 14+ mein decide karenge.
- **Forms:** plain controlled components. React Hook Form
  **optional**.

---

## 12. Theme & Responsive

- **Theme:** class-based dark mode via Tailwind v4
  `@custom-variant dark`.
- **Storage:** localStorage (`theme` key).
- **Default:** `prefers-color-scheme` on first visit.
- **Responsive:** mobile hamburger menu (`md:hidden`), desktop nav
  `hidden md:flex`. Tables scroll horizontally on small screens.

---

## 13. Project Location & Tooling

- **Location:** `D:\dev\expense-tracker` (OneDrive se bahar).
- **Python:** 3.13.15 (not 3.14 — prebuilt wheels).
- **Node:** 24 LTS.
- **Docker:** PostgreSQL 18 + pgvector, port **5433** (5432 busy).
- **Testing:**
  - Backend: `pytest` + separate test DB (`expense_tracker_test`).
  - Frontend: `Vitest` + React Testing Library + jsdom.
  - Reports: HTML + LCOV + JUnit XML (`coverage/`,
    `test-results/`).

---

## 14. API Conventions

- **Base path:** `/api/v1/*`.
- **Auth:** `Authorization: Bearer <jwt>` header.
- **Ownership:** har service function `user_id` se scope karti
  hai. User B user A ka data nahi dekh sakta (tested).
- **Errors:**
  - `400` — validation / business rule failure.
  - `401` — missing / invalid JWT.
  - `403` — authenticated but not allowed.
  - `404` — not found OR not owned (avoid enumeration).
  - `409` — conflict (e.g., duplicate email).
  - `422` — Pydantic validation error.
- **Money in JSON:** strings (Decimal).
- **Datetime in JSON:** ISO 8601 with timezone.

---

## 15. Testing Strategy

- **Backend:** API-level tests via `TestClient` — real HTTP flow,
  separate test DB, tables truncated between tests.
- **Frontend:** component tests via React Testing Library — user
  behavior, not implementation details.
- **Coverage targets:**
  - Backend: aim for 90%+ (currently 118 tests).
  - Frontend: aim for 85%+ (currently 62 tests).
- **CI-ready reports:** JUnit XML + LCOV.
- **Rule:** har naye endpoint/component ke saath tests likhna.

---

## 16. Git & Versioning

- **Branch:** `main` only (solo project).
- **Commit convention:** `feat:`, `fix:`, `chore:`, `docs:`
  (conventional commits).
- **Tags:**
  - `v0.1.0-mvp` — Phase 15 (MVP checkpoint)
  - `v0.1.1-forgot-password` — post-MVP auth polish
  - `v0.2.0-analytics-receipts` — Phase 16-17
- **Har phase ke commit se pehle:**
  - README.md update (progress + features)
  - docs/PROJECT_LOG.md update (phase record)
  - Har commit message mein phase number

---

## 17. Security Notes

- **.env files** kabhi commit nahi. `.gitignore` first commit se
  pehle ready tha.
- **Secret leak par:** foran rotate karein. Git history se delete
  karna kaafi nahi.
- **Password rules:** min 8 chars. Argon2id hash stored.
- **Enumeration:** forgot-password always 204; protected resource
  par 404 not 403 for foreign IDs.
- **Rate limiting:** Phase 21 mein `slowapi` add karenge.
- **CORS:** `CORS_ORIGINS` `.env` mein; default
  `http://localhost:5173`.

---

## 18. Deployment (Phase 22+)

- **Plan:** Docker Compose production stack + nginx serving built
  frontend.
- **Backups:** pg_dump on schedule.
- **Secrets:** production mein environment variables (never in
  image).
- **Receipts:** object storage (S3-compatible).
- **Frontend:** built static assets served by nginx.

---

## 19. What We Are NOT Doing (MVP)

- ❌ Multi-currency
- ❌ Transfers between accounts
- ❌ Bank API integrations
- ❌ Real-time collaboration
- ❌ Mobile native apps
- ❌ Server-side JWT revocation (refresh tokens)
- ❌ SMTP email in dev (console link instead)
- ❌ Object storage in dev (local disk instead)
- ❌ Background scheduler (manual trigger)

Ye sab **Phase 2+** scope hai, ya project ke MVP ke baad.

---

## 20. Open Decisions (later)

- [ ] Phase 18: LLM provider (OpenAI / Anthropic / Ollama)
- [ ] Phase 18: Embedding model + dimension
- [ ] Phase 16: PDF library choice (for reports)
- [ ] Phase 22: Hosting provider
- [ ] Phase 14+: TanStack Query — adopt ya nahi?

In decisions ko respective phases se pehle lock karenge.