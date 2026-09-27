# Expense Tracker — Master Project Log

Last updated: Phase 18 (AI: documents, RAG, chat) — 2026-09-27

Ye file project ka single source of truth hai. Isme project ka
overview, decisions, setup steps, har phase ka record, aur
troubleshooting sab kuch ek jagah hai.

---

## 1. Project Overview

A multi-user personal finance system with an AI assistant that can
answer questions about a user's uploaded documents (RAG).

Core idea:
- Users register aur login karte hain
- Apne bank accounts, cash, credit cards track karte hain
- Income aur expense transactions record karte hain
- Budgets set karte hain aur usage monitor karte hain
- Dashboard par summary dekhte hain
- Analytics + CSV exports + receipts
- (Phase 18) Documents upload karte hain (PDF/TXT/CSV/etc.), AI
  assistant unke content par sawal-jawab karta hai (RAG)

Rule: App AI ke bina bhi chalti hai. LLM sirf explain karta hai,
woh source of truth nahi hai. Agar GROQ_API_KEY missing/invalid ho,
sirf `/api/v1/chat` 503 deta hai — baaki poori app chalti hai.

**Backend MVP (Phases 0-11) complete.**
**Frontend MVP (Phases 12-15) complete.**
**Post-MVP polish (forgot password, dark mode, responsive) complete.**
**Analytics + exports + receipts (Phases 16-17) complete.**
**AI: documents, chunking/embeddings, RAG chat (Phase 18) complete.**
**197 tests passing (135 backend + 62 frontend).**
**Tags: v0.1.0-mvp, v0.1.1-forgot-password, v0.2.0-analytics-receipts**

---

## 2. Tech Stack

| Layer       | Technology                                       |
|-------------|--------------------------------------------------|
| Frontend    | React 19 + TypeScript + Tailwind 4 + Vite 7      |
| Charts      | Recharts 2.15                                    |
| Backend     | Python 3.13 + FastAPI + Uvicorn (complete)       |
| Database    | PostgreSQL 18 + pgvector (Docker)                |
| ORM         | SQLAlchemy 2.x (sync) + psycopg 3                |
| Migrations  | Alembic                                          |
| Auth        | PyJWT (HS256) + Argon2id (pwdlib)                |
| Backend test| pytest + httpx (TestClient)                      |
| Frontend test| Vitest + React Testing Library + jsdom          |
| Coverage    | pytest-cov (be), V8 (fe) — HTML + LCOV + JUnit   |
| AI / RAG    | Groq (LLM, `openai/gpt-oss-120b`) + local         |
|             | embeddings (`sentence-transformers`,              |
|             | `BAAI/bge-small-en-v1.5`, 384-dim) + pgvector     |
|             | (cosine similarity search) — Phase 18 (done)      |
| PDF/DOCX    | pypdf (PDF text extraction); python-docx planned  |
|             | but blocked on `lxml` network install (see §12)   |
| Deployment  | Docker Compose + nginx - Phase 22+               |

---

## 3. Architecture

    React  ->  FastAPI  ->  services  ->  SQLAlchemy  ->  PostgreSQL

Layering rules:
- Routers input validate karte hain, service call karte hain
- Services business logic rakhte hain, DB se baat karte hain
- AI tools sirf services call karte hain, kabhi seedha SQL nahi
- RAG flow: endpoint -> chat_service.ask() -> search_chunks()
  (embed query -> pgvector cosine distance) -> llm.chat()
  (Groq, context-only system prompt) -> response with sources

Frontend layering:
- Pages -> components + hooks + context
- API modules (api/*.ts) -> client.ts -> fetch
- Types (types/api.ts) -> shared across frontend
- ThemeProvider + AuthProvider wrappers in main.tsx

---

## 4. Key Decisions (locked)

1. Backend first, phir frontend. Har feature ka order:
   model -> migration -> schema -> service -> endpoint -> test -> commit.
2. Money: NUMERIC(12,2) + Python Decimal. Kabhi float nahi.
   Ek user = ek currency. MVP mein multi-currency nahi.
3. Account balance transaction ke saath same DB transaction mein
   update hota hai. Test balance recompute kar ke compare karta hai.
   Transfers between accounts = Phase 2 (MVP mein nahi).
4. JWT: short-lived access token. Logout = client token discard.
   Refresh tokens (httpOnly cookie, server-side revocation) = hardening
   phase. MVP mein sirf access token.
5. Password hashing: Argon2id via pwdlib. JWT via PyJWT.
   Purani passlib / python-jose use nahi karenge.
6. DB access: sync SQLAlchemy 2.x + psycopg 3.
7. Recurring transactions: dev mein manual trigger. Scheduler baad
   mein. Phase 2 scope.
8. LLM provider aur embedding model (decided Phase 18): **Groq**
   (`openai/gpt-oss-120b`, free tier, OpenAI-compatible API) for
   chat completions; **sentence-transformers** (`BAAI/bge-small-en-v1.5`,
   384 dimensions, runs locally on CPU, no API cost) for embeddings.
9. Receipts: local uploads/ folder (Docker volume). PDF library
   Phase 16 mein decide hoga (pypdf, confirmed Phase 18).
10. Frontend: Vite + React Router + TypeScript + Tailwind.
    Filhal koi extra lib nahi (TanStack Query, React Hook Form
    optional hain - Phase 14+ mein decide karenge).
11. Forgot password: token-based reset with SHA-256 hashed tokens,
    15-min expiry, single-use. Dev mein link console par print
    hota hai; production mein SMTP add karenge.
12. Receipts: local disk storage under `backend/uploads/receipts/`.
    Filename is uuid-prefixed (safety). Original name is untrusted
    display-only. In production this becomes object storage
    (Phase 22).
13. Documents (Phase 18): same local-disk pattern as receipts, under
    `backend/uploads/documents/`, uuid-prefixed stored_name. Allowed
    types: `.pdf .txt .md .markdown .csv .json .xml .html .htm`
    (20 MB max, config `DOCUMENT_MAX_SIZE_MB`). `.docx` deliberately
    left out for now (see §12, lxml install issue) — can be added
    later once `python-docx`/`lxml` install cleanly.
14. RAG pipeline runs synchronously on upload (extract -> chunk ->
    embed -> store), not as a background job. Acceptable for MVP
    file sizes; revisit if uploads get slow (Phase 21+).
15. Chunking: simple whitespace-snapped fixed-size chunks
    (`RAG_CHUNK_SIZE=800`, `RAG_CHUNK_OVERLAP=100`), not
    sentence/semantic chunking. Good enough for the current document
    sizes; can be upgraded later without changing the DB schema.
16. Chat endpoint answers **only** from retrieved chunks (system
    prompt explicitly forbids inventing facts) and always returns
    `sources` (document id/name + excerpt) for transparency.
    `RAG_TOP_K=5` chunks are retrieved per query, scoped to the
    logged-in user's own documents (optionally narrowed to one
    `document_id`).

---

## 5. Local Environment

| Tool         | Version installed | Notes                              |
|--------------|-------------------|------------------------------------|
| Python       | 3.13.15           | Project uses this, not 3.14        |
| Node.js      | v24.19.0          | LTS, Vite ke liye theek hai        |
| npm          | 11.17.0           |                                    |
| Git          | 2.51.0.windows.2  |                                    |
| Docker       | 29.8.0            |                                    |
| Docker Comp. | v5.5.1            |                                    |
| VS Code      | 1.137.0           | Python, Pylance, Docker extensions |
| Groq account | -                 | Free API key from console.groq.com |

Project location: D:\dev\expense-tracker

Python note: System mein 3.14 aur 3.14t (freethreaded) bhi hain,
lekin hum sirf 3.13 use karte hain.

Command convention:
- py -3.13 -> naya venv banane ke liye
- venv active hone ke baad sirf python
- **Zaroori:** har naye terminal mein `.venv\Scripts\Activate.ps1`
  chalana zaroori hai — bina activate kiye `python` system Python
  use karega jahan project packages installed nahi (dekhein §12,
  "ModuleNotFoundError: No module named 'sqlalchemy'").

---

## 6. Folder Structure

    expense-tracker/
    |-- .env                    (root, gitignored - Docker Compose)
    |-- .env.example            (committed, placeholders)
    |-- .gitignore
    |-- README.md
    |-- docker-compose.yml
    |-- docs/
    |   |-- decisions.md
    |   |-- PROJECT_LOG.md      (ye file)
    |-- backend/
    |   |-- .env, .env.example
    |   |-- .venv/              (gitignored)
    |   |-- requirements.txt
    |   |-- alembic.ini, pytest.ini
    |   |-- alembic/
    |   |   |-- env.py, script.py.mako
    |   |   |-- versions/
    |   |       |-- ea030cbc5ab6_create_alembic_version_table.py
    |   |       |-- 7673bc3416bf_create_users_table.py
    |   |       |-- 3c9938a801aa_create_accounts_and_categories_tables.py
    |   |       |-- e78852c3c6d5_create_transactions_table.py
    |   |       |-- fdaed5992445_create_budgets_table.py
    |   |       |-- a157bb4870e3_create_recurring_rules_table.py
    |   |       |-- 585c4f1e42f7_create_password_reset_tokens_table.py
    |   |       |-- 6fb86563d435_create_receipts_table.py
    |   |       |-- e01230aa081f_create_documents_table.py
    |   |       |-- cd20231991b3_create_document_chunks_table.py
    |   |-- app/
    |   |   |-- main.py
    |   |   |-- core/ (config.py, security.py)
    |   |   |-- db/ (base.py, session.py)
    |   |   |-- ai/
    |   |   |   |-- llm/ (client.py — Groq wrapper, ChatMessage,
    |   |   |   |         LLMUnavailableError)
    |   |   |   |-- rag/ (chunking.py, embeddings.py, search.py)
    |   |   |-- models/ (user, account, category, transaction,
    |   |   |           budget, recurring, password_reset_token,
    |   |   |           receipt, document, document_chunk)
    |   |   |-- schemas/ (user, auth, account, category,
    |   |   |            transaction, budget, recurring,
    |   |   |            dashboard, analytics, receipt, document,
    |   |   |            chat)
    |   |   |-- services/ (user, account, category, transaction,
    |   |   |             budget, recurring, dashboard,
    |   |   |             password_reset_service, analytics_service,
    |   |   |             export_service, receipt_service,
    |   |   |             document_service, chat_service)
    |   |   |-- api/ (deps.py, v1/{auth, accounts, categories,
    |   |   |         transactions, budgets, recurring, dashboard,
    |   |   |         analytics, exports, receipts, documents, chat})
    |   |   |-- scripts/ (list_users, reset_password) — note:
    |   |   |              old `app/scripts/seed_demo_data.py`
    |   |   |              (module CLI) superseded by the new
    |   |   |              `backend/scripts/seed_demo_data.py`
    |   |   |              (HTTP-based, see §11)
    |   |-- scripts/ (seed_demo_data.py — new, HTTP-based seeding)
    |   |-- tests/ (135 tests, incl. test_documents.py,
    |   |          test_ai_foundation.py, test_chat.py)
    |   |-- uploads/            (gitignored — receipts/ + documents/)
    |-- frontend/
    |   |-- .env, .env.example
    |   |-- .vscode/settings.json
    |   |-- package.json, package-lock.json
    |   |-- vite.config.ts (includes Vitest config)
    |   |-- tsconfig.json, tsconfig.node.json
    |   |-- index.html
    |   |-- src/
    |   |   |-- main.tsx
    |   |   |-- App.tsx
    |   |   |-- index.css
    |   |   |-- vite-env.d.ts
    |   |   |-- api/ (client.ts, auth.ts, dashboard.ts,
    |   |   |         accounts.ts, categories.ts,
    |   |   |         transactions.ts, budgets.ts,
    |   |   |         analytics.ts, exports.ts, receipts.ts,
    |   |   |         documents.ts, chat.ts, client.test.ts)
    |   |   |-- components/ (Layout.tsx, ProtectedRoute.tsx,
    |   |   |                PasswordInput.tsx, ExportButton.tsx)
    |   |   |-- context/ (AuthContext.tsx, ThemeContext.tsx)
    |   |   |-- pages/ (Login, Register, ForgotPassword,
    |   |   |           ResetPassword, Dashboard, Accounts,
    |   |   |           Categories, Budgets, Transactions,
    |   |   |           Analytics, ReceiptsPage, DocumentsPage,
    |   |   |           ChatPage, NotFound + tests)
    |   |   |-- test/ (setup.ts, utils.tsx)
    |   |   |-- types/ (api.ts — incl. Document, ChatRequest,
    |   |   |          ChatResponse, ChatSource)
    |   |-- coverage/           (gitignored, HTML+LCov reports)
    |   |-- test-results/       (gitignored, JUnit XML)
    |-- deploy/                     (Phase 22+)

---

## 7. Environment Variables

### Root .env (Docker Compose)

    POSTGRES_USER=expense_user
    POSTGRES_PASSWORD=<strong-password>
    POSTGRES_DB=expense_tracker
    POSTGRES_HOST_PORT=5433

Note: POSTGRES_HOST_PORT=5433 (not 5432).

### Backend backend/.env

    DATABASE_URL=postgresql+psycopg://expense_user:<encoded-password>@localhost:5433/expense_tracker
    JWT_SECRET_KEY=<64-byte-url-safe-string>
    ACCESS_TOKEN_EXPIRE_MINUTES=30
    CORS_ORIGINS=http://localhost:5173
    FRONTEND_URL=http://localhost:5173
    DEBUG_RESET_LINKS=true
    UPLOAD_DIR=uploads
    MAX_UPLOAD_SIZE_MB=5

    # Document uploads (for AI / RAG) — Phase 18
    DOCUMENT_MAX_SIZE_MB=20

    # LLM (Groq) — Phase 18
    GROQ_API_KEY=<your Groq API key, from console.groq.com/keys>
    GROQ_MODEL=openai/gpt-oss-120b

    # Embeddings (local, sentence-transformers) — Phase 18
    EMBEDDING_MODEL=BAAI/bge-small-en-v1.5
    EMBEDDING_DIM=384

    # RAG tuning — Phase 18
    RAG_CHUNK_SIZE=800
    RAG_CHUNK_OVERLAP=100
    RAG_TOP_K=5

Password encoding (URL):

| Character | Encode as |
|-----------|-----------|
| @         | %40       |
| :         | %3A       |
| /         | %2F       |
| #         | %23       |
| %         | %25       |
| space     | %20       |

Encode: python -c "import urllib.parse; print(urllib.parse.quote('RAW', safe=''))"
JWT:    python -c "import secrets; print(secrets.token_urlsafe(64))"

`DEBUG_RESET_LINKS=true` -> forgot-password link backend console
par print hota hai. Production mein `false` karein aur SMTP
configure karein (Phase 16+).

`GROQ_API_KEY` blank/invalid ho to poori app chalti hai — sirf
`/api/v1/chat` 503 `LLMUnavailableError` deta hai. Ye by design hai
(decision #8/#16).

### Frontend frontend/.env (optional)

    VITE_API_BASE_URL=http://localhost:8000

Rules:
- .env files kabhi git mein nahi jatein.
- .env.example mein sirf placeholders.
- Frontend mein koi secret nahi hota (browser bundle public hai).

---

## 8. Setup From Scratch

    # 1. Clone
    git clone https://github.com/AdnanTaj01/expense-tracker.git
    cd expense-tracker

    # 2. Root .env banayein

    # 3. Docker (pgvector/pgvector image — vector extension included)
    docker compose up -d
    docker compose ps

    # 4. Backend
    cd backend
    py -3.13 -m venv .venv
    .venv\Scripts\Activate.ps1
    pip install -r requirements.txt
    # backend/.env banayein (Groq key optional but recommended)
    alembic upgrade head
    uvicorn app.main:app --reload --port 8000

    # 5. Frontend (naya terminal)
    cd frontend
    npm install
    npm run dev

Test: http://localhost:8000/docs  aur  http://localhost:5173

Test databases setup (ek baar) — `vector` extension test DB mein
`tests/conftest.py` khud enable kar deta hai, alag se karne ki
zaroorat nahi:

    docker compose exec db psql -U expense_user -d expense_tracker -c "CREATE DATABASE expense_tracker_test OWNER expense_user;"

Test run:

    cd backend && pytest
    cd frontend && npm test

Demo data (optional, for manual UI testing — see §11):

    python scripts\seed_demo_data.py

---

## 9. Phase-by-Phase Record

### Phase 0 - Decisions (Done)
Sab 10 decisions confirm kiye (Section 4 dekhein).

### Phase 1 - Installs (Done)
Python 3.13.15, Node 24, Git, Docker, VS Code extensions install.

### Phase 2 - Repo + Structure (Done)
- Folder structure
- .gitignore, README.md, .env.example, docs/decisions.md
- Git init, first commit, GitHub repo (expense-tracker, private)
- Commit: cc6dc17

### Phase 3 - PostgreSQL + pgvector (Done)
- docker-compose.yml with pgvector/pgvector:0.8.6-pg18-trixie
- Masla: PostgreSQL 18 mein volume path /var/lib/postgresql
- Container expense_db, port 5433:5432
- pgvector 0.8.6, persistence verified
- Commit: 9227780

### Phase 4 - FastAPI Foundation (Done)
- backend/.venv, FastAPI 0.115.6, uvicorn, pydantic-settings
- app/core/config.py, app/main.py with /health + CORS
- Commit: cd9da2b

### Phase 5 - SQLAlchemy + Alembic (Done)
- SQLAlchemy 2.0.44, Alembic 1.14.0, psycopg 3.2.4
- Masla: configparser % interpolation -> seedha create_engine
- First migration: alembic_version
- Commit: f23b7bb

### Phase 6 - User Model (Done)
- app/models/user.py, app/schemas/user.py
- Migration: 7673bc3416bf
- Email uniqueness verified
- Commit: fdf0b8a

### Phase 7 - Auth + Security (Done)
- PyJWT 2.10.1, pwdlib 0.2.1, python-multipart 0.0.20
- app/core/security.py, app/api/deps.py
- app/api/v1/auth.py (register/login/me/change-password)
- pytest setup, 8 tests
- Masla: conftest mein "app" naam overwrite
- Commit: f254fb2

### Phase 8 - Accounts aur Categories (Done)
- Models: account, category (FK users, CASCADE)
- Services: ownership-scoped CRUD
- Endpoints: /api/v1/accounts, /api/v1/categories
- 17 new tests (25 total)
- Commit: 2e4f83f

### Phase 9 - Transactions (Done)
- Model: transaction (amount positive, kind determines sign)
- Service: transaction_service with safe balance updates
- Endpoints: /api/v1/transactions (filters, pagination)
- 18 new tests (43 total), including balance integrity
- Masla: test expectation 1200 vs 1100 (test ghalat tha)
- Commit: 30f4bb6

### Phase 10 - Budgets aur Recurring (Done)
- Models: budget, recurring
- Services: budget_service (live usage), recurring_service
- Endpoints: /api/v1/budgets (5), /api/v1/recurring (5 + /generate)
- 32 new tests (75 total)
- Masle: quantize Decimal, end_date inclusive, uvicorn module cache
- Commit: 3273013

### Phase 11 - Dashboard API (Done)
- No model/migration. Read-only aggregations.
- Service: dashboard_service (summary, by-category, trend, recent,
  overview)
- Endpoints: /api/v1/dashboard (5)
- 15 new tests (90 total)
- Backend MVP complete
- Commit: aca38b6

### Phase 12 - React Foundation (Done)
- Vite 7 + React 19 + TypeScript 5.6 + Tailwind 4
- package.json, vite.config.ts, tsconfig.json, tsconfig.node.json,
  index.html
- src: main.tsx, App.tsx, api/client.ts, api/auth.ts,
  context/AuthContext.tsx, components/Layout.tsx,
  components/ProtectedRoute.tsx, pages (Login, Register, Dashboard,
  Accounts, Categories, Budgets, Transactions, NotFound),
  test/{setup.ts, utils.tsx}, types/api.ts
- Vitest + React Testing Library + jsdom + jest-dom
- V8 coverage: HTML + LCOV + JSON summary
- 27 tests passing
- Masle: htmlFor/id linking, Router-in-Router, esbuild scripts,
  tsconfig baseUrl
- Commit: beb7b10

### Phase 13 - Auth Polish + Change Password (Done)
- 401 auto-logout via client.ts callback
- AuthContext sessionExpired flag
- LoginPage amber session-expired banner
- New ChangePasswordPage (later removed)
- Layout profile dropdown (avatar, name, email, change pw, logout)
- AuthContext changePassword; authApi changePassword
- Types: ChangePasswordPayload
- 2 new tests (29 total)
- Masle: test mock values mein naye fields add karne the
- Commit: 505b8b0

### Phase 14-15 - All Frontend Pages / MVP Checkpoint (Done)
- API modules added: dashboard.ts, accounts.ts, categories.ts,
  transactions.ts, budgets.ts
- Types: AccountCreate/Update, CategoryCreate/Update,
  TransactionCreate/Update added
- DashboardPage — real summary, top categories, recent
  transactions, 6-month trend bars
- AccountsPage — list, create, edit, delete (modal form)
- CategoriesPage — income/expense columns, filter, CRUD
- TransactionsPage — table, filters (account, category, kind,
  date range), pagination, create/edit/delete
- BudgetsPage — month navigation, live usage bars,
  over-budget red highlight
- Each page: loading state, error state, empty state
- 28 new frontend tests (57 total)
- Manual end-to-end verified across all pages
- MVP CHECKPOINT: the whole finance app works without AI
- Tag: v0.1.0-mvp
- Commit: 4ff6131

### Post-MVP Polish - Forgot Password + Dark Mode + Responsive (Done)

**Backend: Forgot password flow**
- New model `PasswordResetToken` (SHA-256 hashed, 15-min expiry,
  single-use, one active per user)
- Migration: `585c4f1e42f7_create_password_reset_tokens_table.py`
- Service: `password_reset_service.py` (create_reset_token +
  consume_reset_token)
- Endpoints:
  - `POST /api/v1/auth/forgot-password` (always 204 — no user
    enumeration)
  - `POST /api/v1/auth/reset-password` (validates token, sets new
    password, marks used)
- In dev, reset link prints to backend console
  (`DEBUG_RESET_LINKS=true`)
- 7 new tests. **97 backend tests total.**

**Frontend: Forgot password flow**
- New `PasswordInput` component with show/hide eye toggle
  (accessible: aria-label, aria-pressed, tabIndex=-1)
- New pages: `ForgotPasswordPage`, `ResetPasswordPage`
- `LoginPage` gets "Forgot password?" link and `passwordReset`
  green banner (after successful reset)
- `RegisterPage` uses `PasswordInput`
- `ChangePasswordPage` **removed** (replaced by forgot-password
  flow)
- Layout dropdown now shows only email + Logout
- `AuthContext` exposes `forgotPassword` + `resetPassword`
- `authApi.forgotPassword` + `authApi.resetPassword`
- Types: `ForgotPasswordRequest`, `ResetPasswordRequest`
- 2 new AuthContext tests. **59 frontend tests total.**

**Theme system**
- New `ThemeContext` (light/dark, localStorage persistence,
  `prefers-color-scheme` default on first visit)
- `ThemeProvider` wraps app in `main.tsx`
- Toggle icon in navbar (desktop + mobile)
- Tailwind v4: `@custom-variant dark` in `index.css`
- `html.dark` color-scheme + body background

**Responsive**
- Mobile hamburger menu (nav links + profile + logout)
- Tables scroll horizontally on small screens
- Modals responsive (max-w-md, py-6, overflow-y-auto)
- Padding `p-6 sm:p-8` throughout
- Nav links hidden on mobile, hamburger menu

**Dark mode across all pages** — Dashboard, Transactions,
Accounts, Categories, Budgets, Login, Register, Forgot,
Reset, 404, Layout, all modals

**Troubleshooting added:**
- `window.matchMedia is not a function` in jsdom → stub in
  `test/setup.ts`
- `getByLabelText(/password/i)` ambiguity (matches "Show password"
  button) → use anchored regex `/^password$/i`
- SQLAlchemy forward references → `from __future__ import annotations`
  + `if TYPE_CHECKING:` imports
- `ChangePassword` schema still exists in backend (kept for
  backward compatibility) but frontend no longer uses it

- Commit: 89a8b9a
- Tag: v0.1.1-forgot-password

### Phase 16-17 - Analytics, CSV Exports, Receipts (Done)

**Backend:**
- `analytics_service.py` + `/api/v1/analytics` (4 endpoints):
  - `month-comparison` — current vs previous month with % change
  - `category-trend` — N months for a category (oldest first)
  - `top-accounts` — rank accounts by expense over N months
  - `weekday-heatmap` — expense/income by weekday (computed in
    Python for DB portability)
- `export_service.py` + `/api/v1/exports` (3 CSV endpoints):
  - transactions.csv, accounts.csv, budgets.csv
  - Proper `Content-Disposition` header (attachment; filename=...)
  - Timestamps in filename: `transactions_2026-09-25_1430.csv`
- **Receipts feature:**
  - `Receipt` model (user_id, transaction_id nullable, stored_name
    uuid-prefixed, original_name, content_type, size_bytes,
    created_at)
  - Migration `6fb86563d435_create_receipts_table.py`
  - `receipt_service.py` — save to disk under
    `uploads/receipts/`, validate content type
    (image/jpeg, image/png, image/webp, image/gif, application/pdf),
    max 5 MB, single active upload, delete file on disk
  - `/api/v1/receipts` endpoints: list, upload (multipart),
    get, download (FileResponse), delete
  - Config: `UPLOAD_DIR=uploads`, `MAX_UPLOAD_SIZE_MB=5`
  - Files stored in `backend/uploads/receipts/` (gitignored)
- CLI helper: `app/scripts/seed_demo_data.py` — seeds 3 accounts,
  17 transactions, 5 budgets for demo
- 8 new analytics tests + 5 exports tests + 8 receipts tests
  = **118 backend tests total**

**Frontend:**
- Recharts 2.15 installed
- `AnalyticsPage` — month comparison cards, Pie chart (top accounts),
  Bar chart (weekday), Line chart (category trend, dropdown selector)
- `ExportButton` component — reusable, with loading + error state
- Export button on Transactions, Accounts, Budgets pages
- `ReceiptsPage` — file upload form, transaction attach dropdown,
  receipts table with download/delete
- Nav: Analytics, Receipts added (7 total nav links)
- `ResizeObserver` stub in `test/setup.ts` (Recharts requirement)
- **62 frontend tests total**

**Masle:**
1. `from __future__ import annotations` line 3 par tha — Python
   rule ke mutabiq ye line 1 honi chahiye. Fix: poori file reorder.
2. `receipts.py` aur `receipt_service.py` files missing thi —
   circular import errors. Fix: dono add kiye.
3. `receipts.ts` file tooti hui save hui (try/parse lines gayab).
   Fix: poora file dobara paste kiya.
4. Analytics tests `ResizeObserver is not defined` de rahe thay.
   Fix: jsdom mein stub add kiya.

- Commit: bfb3188 (rolled into Phase 18 commits — see below)
- Tag: v0.2.0-analytics-receipts

### Phase 18A - AI Foundation (Done)

Goal: Groq LLM client + local embeddings wired up, testable without
a live API key or downloading the model in CI.

- `requirements.txt`: `groq==0.13.0`, `sentence-transformers==3.3.1`,
  `pypdf==5.1.0`
- Config additions: `GROQ_API_KEY`, `GROQ_MODEL`, `EMBEDDING_MODEL`,
  `EMBEDDING_DIM`, `RAG_CHUNK_SIZE`, `RAG_CHUNK_OVERLAP`,
  `RAG_TOP_K`, `settings.llm_enabled` property (True if API key set)
- `app/ai/llm/client.py` — `ChatMessage` dataclass,
  `LLMUnavailableError`, `chat()` (wraps Groq SDK, raises
  `LLMUnavailableError` on any failure so callers never crash)
- `app/ai/rag/embeddings.py` — `embed()`, `embed_one()`,
  `dimension()`; model loaded lazily via `lru_cache` so importing
  the module doesn't trigger a download
- 5 new tests (`test_ai_foundation.py`), all mocked (no real Groq
  call, no real model load): settings wiring, `llm_enabled` flag,
  raises when disabled, calls Groq with correct args (mocked
  client), embedding dimension. **123 backend tests total** at
  this point (before Phase 18B).

### Phase 18B - Document Upload + Text Extraction (Done)

**18B-1: Document model + migration**
- `Document` model: user_id (FK CASCADE), stored_name (uuid-prefixed),
  original_name, content_type, size_bytes, text_content (nullable,
  filled after extraction), page_count (nullable, PDFs only),
  status (`pending`/`ready`/`failed`), error_message, timestamps
- Migration: `e01230aa081f_create_documents_table.py`
- Config: `DOCUMENT_MAX_SIZE_MB=20`

**18B-2: Extraction service + endpoints**
- `document_service.py`: `create_document()` (validate extension +
  size, save to disk under `uploads/documents/`, extract text
  synchronously, set status), `_extract_pdf()` (pypdf, per-page
  join), `_extract_plain_text()` (UTF-8 read with `errors="replace"`),
  `list_documents()`, `get_document()`, `get_document_path()`,
  `delete_document()` (removes file + row)
- `schemas/document.py`: `DocumentRead` (does **not** expose
  `text_content` — kept out of the API response by design, it can
  be large; a "view extracted text" feature is a possible later
  addition, not built yet)
- `api/v1/documents.py`: 5 endpoints (list, upload, get, download,
  delete), all ownership-scoped (404 if not the caller's document)
- Allowed extensions ended up broader than first planned:
  `.pdf .txt .md .markdown .csv .json .xml .html .htm` (`.docx`
  intentionally excluded — see Masle below)

**18B-3: Tests**
- `test_documents.py`, 7 tests: upload+extract, reject unsupported
  extension, reject oversized file, list is ownership-scoped, 404
  for other user's document, download, delete
- **130 backend tests total** at this point

**18B-4: Frontend DocumentsPage**
- `api/documents.ts` (same fetch/FormData/blob-download pattern as
  `receipts.ts`)
- `types/api.ts`: `Document` interface
- `pages/DocumentsPage.tsx` — upload form, status badge
  (pending/ready/failed, color-coded), table with download/delete,
  page-count + error-message shown inline when present
- Nav link + route: `/documents`

**Masle (18B):**
1. `Status code 204 must not have a response body` on the DELETE
   route — FastAPI infers a response model from the `-> None`
   return annotation even with `status_code=204`. **Fix:** add
   `response_model=None` explicitly on that route. (Known FastAPI
   gotcha — always add this whenever a route returns `None` with a
   204/304 status.)
2. `python-docx` install failed: `Could not find a version that
   satisfies the requirement lxml` — a transient network issue
   (PyPI unreachable / read timeouts), not a version conflict.
   Retried install, longer `--timeout`, `pip cache purge` all
   failed the same way at the time. **Decision:** skip `.docx`
   support for now (decision #13); revisit when network is stable.
   `ALLOWED_EXTENSIONS` was widened instead to cover `.csv .json
   .xml .html .htm` (all read fine via `_extract_plain_text`).
3. Password/DB mismatch cost significant debugging time (same class
   of issue recurring from earlier phases) — see §12 for the
   generalized fix; the root cause was always the same: `.env`
   password had been rotated after a `docker compose down -v`, but
   either the running uvicorn process or `tests/conftest.py`'s
   hardcoded `DATABASE_URL` still had the old password.
4. Test-time `KeyError: 'access_token'` in a new `test_documents.py`
   — the ad-hoc `_register_and_login` helper didn't match the app's
   actual register/login contract (register needs `full_name` +
   `currency`; login is OAuth2 form data with a `username` field,
   not JSON with `email`). **Fix:** copy the exact helper already
   working in `test_accounts.py` instead of guessing.

### Phase 18C - Chunking + Embeddings (Done)

**18C-1: DocumentChunk model + pgvector migration**
- `DocumentChunk` model: document_id (FK CASCADE), user_id (FK
  CASCADE, denormalized for fast ownership-scoped search),
  chunk_index, content (Text), embedding (`pgvector.sqlalchemy.Vector`,
  dim = `EMBEDDING_DIM` = 384), created_at
- `pgvector==0.3.6` added to requirements
- Migration: `cd20231991b3_create_document_chunks_table.py` — needed
  **two manual edits** after `alembic revision --autogenerate`
  (autogenerate does not add these on its own):
  1. `import pgvector.sqlalchemy` at the top of the migration file
     (autogenerate references `pgvector.sqlalchemy.vector.VECTOR(...)`
     but doesn't import the module)
  2. `op.execute("CREATE EXTENSION IF NOT EXISTS vector")` as the
     first line of `upgrade()` (Postgres doesn't have the `vector`
     type until the extension is enabled in that specific database)

**18C-2: Chunking + embedding service, wired into upload**
- `app/ai/rag/chunking.py`: `chunk_text()` — fixed-size chunks with
  overlap, snaps the end boundary to the nearest space so words
  aren't split
- `document_service.py` updated: after successful extraction,
  `_create_chunks()` runs automatically — deletes any stale chunks
  (for re-processing), splits `text_content`, embeds all chunks in
  one batch call (`embed()`), inserts one `DocumentChunk` row per
  chunk. If chunking/embedding raises, the whole document falls
  back to `status="failed"` (a document is never left "ready" with
  no usable chunks).
- Manually verified end-to-end via `psql`: a 5-paragraph test `.txt`
  produced 2 chunks with correct content previews.

**Masle (18C):**
1. Pasted code accidentally nested `_create_chunks()` **inside**
   `_process_document()` (wrong indentation) — would have raised
   `NameError` at runtime since the inner `def` came after the call
   site in execution order. Fix: dedent to module level.
2. `psycopg.errors.UndefinedObject: type "vector" does not exist`
   — but only in the **test** database, not in normal `uvicorn` use.
   Root cause: the `vector` extension was enabled in `expense_tracker`
   via the Alembic migration (§18C-1), but `tests/conftest.py` creates
   tables with `Base.metadata.create_all()` directly, bypassing
   Alembic entirely — so the test DB never got the extension. **Fix:**
   in `conftest.py`'s `_setup_test_db` fixture, run
   `CREATE EXTENSION IF NOT EXISTS vector` via a raw `text()` execute
   *before* `Base.metadata.create_all()`. This is a **general
   pattern**: any Postgres extension a migration enables must also be
   enabled in `conftest.py`, because tests never run migrations.
- All 130 existing tests plus manual chunk verification passed after
  the fix. **130 backend tests total** (Phase 18C added no new
  automated tests of its own — chunking/embedding is exercised
  indirectly by `test_documents.py`; targeted RAG tests came in
  Phase 18D).

### Phase 18D - Semantic Search + RAG Chat (Done)

**18D-1: Semantic search**
- `app/ai/rag/search.py`: `search_chunks()` — embeds the query,
  computes cosine distance via pgvector's `.cosine_distance()`
  operator on `DocumentChunk.embedding`, filters to the given
  `user_id` (and optionally one `document_id`), orders by distance
  ascending, limits to `RAG_TOP_K`. Returns a list of `SearchResult`
  dataclasses (chunk_id, document_id, chunk_index, content, distance).
- Manually verified in a Python REPL against a real uploaded document:
  query "How much did I spend on food delivery?" correctly ranked
  the food-delivery chunk first (distance ≈0.28) over an unrelated
  savings chunk (≈0.34).

**18D-2: Chat endpoint**
- `schemas/chat.py`: `ChatRequest` (message, optional document_id),
  `ChatSource` (document_id, document_name, chunk_index, excerpt),
  `ChatResponse` (answer, sources)
- `services/chat_service.py`: `ask()` — calls `search_chunks()`; if
  no chunks found, returns a canned "couldn't find anything relevant"
  answer **without calling the LLM**; otherwise builds a
  context block from the retrieved chunks (each labelled with its
  source document name), sends a strict system prompt ("answer using
  ONLY the provided excerpts... don't make anything up") plus the
  context+question to `llm.chat()`, and returns the answer with a
  `sources` list (one entry per retrieved chunk, not deduped — see
  Masle #3 below)
- `api/v1/chat.py`: `POST /api/v1/chat`, catches
  `LLMUnavailableError` and returns 503 with a clear detail message
- Verified end-to-end via Swagger: uploaded a budget-notes `.txt`,
  asked "How much did I spend on food delivery?", got back the
  correct figure (matching the document) plus 2 sources — confirms
  the full pipeline (embed query -> pgvector search -> Groq
  completion -> grounded answer) works correctly.

**18D-3: Tests**
- `test_chat.py`, 5 tests, all mocking `chat_service.search_chunks`
  and `chat_service.llm_chat` (no real embedding model load, no real
  Groq call): requires auth, happy path with sources, no-results
  path skips the LLM call entirely, 503 when LLM raises
  `LLMUnavailableError`, empty message rejected (422)
- **135 backend tests total**

**18D-4: Frontend ChatPage**
- `types/api.ts`: `ChatSource`, `ChatRequest`, `ChatResponse`
- `api/chat.ts` — same fetch/error-handling pattern as other API
  modules; JSON POST (not FormData, unlike documents/receipts)
- `pages/ChatPage.tsx` — simple chat-bubble UI (user right-aligned
  dark bubble, assistant left-aligned light bubble), auto-scrolls to
  latest message, shows a "Thinking…" placeholder while waiting,
  lists source document names under each assistant reply, inline
  error banner on failure (also rendered as a bubble with a ⚠️ prefix
  so the conversation stays readable)
- Nav link + route: `/chat` ("AI Assistant")

**Masle (18D):**
1. `401 Invalid API Key` from Groq on the first real chat request —
   turned out to be a **placeholder** value
   (`GROQ_API_KEY=gsk_YAHAN_APNI_KEY_PASTE_KAREIN`) never replaced
   with a real key from console.groq.com.
2. After replacing the key, the *same* 401 persisted at first. Root
   cause: `uvicorn --reload` only watches `.py` files, not `.env` —
   the running process still had the old value loaded from process
   start. **Fix:** fully stop (Ctrl+C) and restart uvicorn after any
   `.env` change; `--reload` is not enough.
3. Isolated-testing a Groq API key with `max_tokens=20` produced an
   **empty** response with no error (exit code 0, blank output) —
   not a bug. `openai/gpt-oss-120b` is a reasoning model; it spends
   some of the token budget on internal reasoning before the final
   answer, so a very low `max_tokens` can exhaust the budget before
   any visible text is produced. Raising to `max_tokens=300` (test)
   / the app's actual default of 800 (`llm/client.py`) resolved it.
   **Lesson:** an empty/blank LLM response with `exit_code == 0` and
   no exception is a token-budget symptom, not a connectivity or
   auth problem — check `max_tokens` before re-checking the API key.
4. UX nit (not a bug): asking a question against a single uploaded
   file showed the *same* file name 5 times under "Sources" — because
   `RAG_TOP_K=5` retrieves 5 **chunks**, not 5 documents, and a single
   document can contribute multiple chunks to one answer. **Fix**
   (frontend only): dedupe `sources` by `document_id` using a `Map`
   before rendering, so each source document is listed once per
   answer regardless of how many of its chunks were used.
   *(Scheduled — not yet applied as of this log entry; see "Next
   session" below.)*

**Demo data:** `backend/scripts/seed_demo_data.py` (new, HTTP-based,
different from the old `app/scripts/seed_demo_data.py` CLI module)
— registers/reuses a fixed demo user (`demo@example.com` /
`DemoPass123!`) against a **running** backend, then seeds 4 accounts,
3 extra categories, ~120 days of randomized transactions, and 5
budgets, entirely through the public API (so it exercises the same
code paths a real user would). Useful for populating every page with
realistic data without manual entry. Safe to re-run.

- Commit: (Phase 18A-18D squashed across several commits, see
  `git log` — key ones: "feat: document upload, text extraction, and
  CRUD endpoints (Phase 18B)", "feat: chunk and embed extracted
  document text with pgvector (Phase 18C)", "fix: enable pgvector
  extension in test database", "feat: RAG chat endpoint with semantic
  search over documents (Phase 18D)", "test: add RAG chat endpoint
  tests with mocked search and LLM")
- **197 total tests (135 backend + 62 frontend)**

**Next session (open items):**
- Dedupe `sources` by document in `ChatPage.tsx` (Masle #4 above)
- Optional: add `.docx` support once `python-docx`/`lxml` install
  cleanly (network-dependent, decision #13)
- Optional: expose extracted `text_content` somewhere in the UI
  (currently stored but never shown — see 18B-2 note)

---

## 10. API Endpoints (current)

### Meta
| Method | Path        | Auth |
|--------|-------------|------|
| GET    | /health     | No   |

### Auth
| Method | Path                          | Auth |
|--------|-------------------------------|------|
| POST   | /api/v1/auth/register         | No   |
| POST   | /api/v1/auth/login            | No   |
| GET    | /api/v1/auth/me               | Yes  |
| POST   | /api/v1/auth/change-password  | Yes  |
| POST   | /api/v1/auth/forgot-password  | No   |
| POST   | /api/v1/auth/reset-password   | No   |

### Accounts
| Method | Path                          | Auth |
|--------|-------------------------------|------|
| GET    | /api/v1/accounts              | Yes  |
| POST   | /api/v1/accounts              | Yes  |
| GET    | /api/v1/accounts/{id}         | Yes  |
| PATCH  | /api/v1/accounts/{id}         | Yes  |
| DELETE | /api/v1/accounts/{id}         | Yes  |

### Categories
| Method | Path                          | Auth |
|--------|-------------------------------|------|
| GET    | /api/v1/categories (?kind=)   | Yes  |
| POST   | /api/v1/categories            | Yes  |
| GET    | /api/v1/categories/{id}       | Yes  |
| PATCH  | /api/v1/categories/{id}       | Yes  |
| DELETE | /api/v1/categories/{id}       | Yes  |

### Transactions
| Method | Path                          | Auth |
|--------|-------------------------------|------|
| GET    | /api/v1/transactions          | Yes  |
| POST   | /api/v1/transactions          | Yes  |
| GET    | /api/v1/transactions/{id}     | Yes  |
| PATCH  | /api/v1/transactions/{id}     | Yes  |
| DELETE | /api/v1/transactions/{id}     | Yes  |

### Budgets
| Method | Path                          | Auth |
|--------|-------------------------------|------|
| GET    | /api/v1/budgets (?year,?month)| Yes  |
| POST   | /api/v1/budgets               | Yes  |
| GET    | /api/v1/budgets/{id}          | Yes  |
| PATCH  | /api/v1/budgets/{id}          | Yes  |
| DELETE | /api/v1/budgets/{id}          | Yes  |

### Recurring
| Method | Path                                  | Auth |
|--------|---------------------------------------|------|
| GET    | /api/v1/recurring                     | Yes  |
| POST   | /api/v1/recurring                     | Yes  |
| GET    | /api/v1/recurring/{id}                | Yes  |
| PATCH  | /api/v1/recurring/{id}                | Yes  |
| DELETE | /api/v1/recurring/{id}                | Yes  |
| POST   | /api/v1/recurring/{id}/generate       | Yes  |

### Dashboard
| Method | Path                                  | Auth |
|--------|---------------------------------------|------|
| GET    | /api/v1/dashboard/summary             | Yes  |
| GET    | /api/v1/dashboard/by-category         | Yes  |
| GET    | /api/v1/dashboard/trend               | Yes  |
| GET    | /api/v1/dashboard/recent              | Yes  |
| GET    | /api/v1/dashboard/overview            | Yes  |

### Analytics
| Method | Path                                            | Auth |
|--------|-------------------------------------------------|------|
| GET    | /api/v1/analytics/month-comparison              | Yes  |
| GET    | /api/v1/analytics/category-trend?category_id=X  | Yes  |
| GET    | /api/v1/analytics/top-accounts?months=3         | Yes  |
| GET    | /api/v1/analytics/weekday-heatmap?months=3      | Yes  |

### Exports (CSV)
| Method | Path                                  | Auth |
|--------|---------------------------------------|------|
| GET    | /api/v1/exports/transactions.csv      | Yes  |
| GET    | /api/v1/exports/accounts.csv          | Yes  |
| GET    | /api/v1/exports/budgets.csv           | Yes  |

### Receipts
| Method | Path                                  | Auth |
|--------|---------------------------------------|------|
| GET    | /api/v1/receipts                      | Yes  |
| POST   | /api/v1/receipts (multipart)          | Yes  |
| GET    | /api/v1/receipts/{id}                 | Yes  |
| GET    | /api/v1/receipts/{id}/download        | Yes  |
| DELETE | /api/v1/receipts/{id}                 | Yes  |

### Documents (Phase 18B)
| Method | Path                                  | Auth |
|--------|---------------------------------------|------|
| GET    | /api/v1/documents                     | Yes  |
| POST   | /api/v1/documents (multipart)         | Yes  |
| GET    | /api/v1/documents/{id}                | Yes  |
| GET    | /api/v1/documents/{id}/download       | Yes  |
| DELETE | /api/v1/documents/{id}                | Yes  |

### Chat (Phase 18D, RAG)
| Method | Path                                  | Auth |
|--------|---------------------------------------|------|
| POST   | /api/v1/chat                          | Yes  |

`POST /api/v1/chat` body: `{ "message": str, "document_id": int|null }`.
Response: `{ "answer": str, "sources": [{document_id, document_name,
chunk_index, excerpt}] }`. Returns 503 if the LLM is unavailable.

---

## 11. Common Commands Reference

### Daily workflow

    # Terminal 1 — backend
    docker compose up -d
    cd backend
    .venv\Scripts\Activate.ps1
    uvicorn app.main:app --reload --port 8000

    # Terminal 2 — frontend
    cd frontend
    npm run dev

    # Terminal 3 — git / commands

### Migrations

    alembic revision --autogenerate -m "describe change"
    alembic upgrade head
    alembic downgrade -1
    alembic current
    alembic history

**pgvector columns:** after `--autogenerate`, always check the
generated migration for two things it will NOT add on its own
(§9, Phase 18C-1): `import pgvector.sqlalchemy` at the top, and
`op.execute("CREATE EXTENSION IF NOT EXISTS vector")` as the first
line of `upgrade()`.

### Database (psql)

    docker compose exec db psql -U expense_user -d expense_tracker
    # andar: \dt  \d users  \l  \q

    # Quick RAG sanity check:
    docker compose exec db psql -U expense_user -d expense_tracker -c "SELECT id, document_id, chunk_index, LEFT(content, 40) FROM document_chunks;"

### Tests

    # Backend
    cd backend
    .venv\Scripts\Activate.ps1
    pytest
    pytest tests/test_auth.py
    pytest tests/test_chat.py -v
    pytest -k register
    pytest -v

    # Frontend
    cd frontend
    npm test                    # run once
    npm run test:watch          # watch mode
    npm run test:ui             # browser UI
    npm run test:coverage       # coverage reports

### CLI scripts

    cd backend
    python -m app.scripts.list_users
    python -m app.scripts.reset_password user@example.com NewPass123!

Demo data seeding (Phase 18, new — HTTP-based, needs the backend
running):

    uvicorn app.main:app --reload --port 8000   # terminal 1
    python scripts\seed_demo_data.py            # terminal 2 (from backend/)

Logs in as `demo@example.com` / `DemoPass123!`. Idempotent — re-running
reuses the existing demo user instead of erroring.

### Quick RAG debugging (Python REPL)

    cd backend
    .venv\Scripts\Activate.ps1
    python
    >>> from app.db.session import SessionLocal
    >>> from app.ai.rag.search import search_chunks
    >>> db = SessionLocal()
    >>> results = search_chunks(db, user_id=1, query="your question")
    >>> for r in results:
    ...     print(r.distance, "-", r.content[:80])
    ...
    >>> db.close()

(Note the blank line after the `print(...)` line to close the `for`
loop before typing the next statement — a common REPL gotcha.)

### Git workflow

    cd D:\dev\expense-tracker
    git status
    git add .
    git commit -m "message"
    git push
    git log --oneline -5

---

## 12. Troubleshooting Log

### PostgreSQL 18 volume path
Symptom: container start nahi hota.
Fix: volume mount postgres_data:/var/lib/postgresql (bina /data).

### configparser interpolation
ValueError: invalid interpolation syntax.
Fix: alembic/env.py — create_engine(settings.DATABASE_URL, ...) seedha.

### AttributeError: module 'app' has no attribute 'dependency_overrides'
Fix: tests/conftest.py:
    import app.models
    from app.main import app as fastapi_app

### PowerShell execution policy
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned

### Port 5432 already in use
POSTGRES_HOST_PORT=5433 aur DATABASE_URL mein localhost:5433.

### psql paste nahi hota
Right-click ya Ctrl+Shift+V. Ya PowerShell se:
    docker compose exec db psql ... -c "SQL"

### VS Code "Import could not be resolved"
Ctrl+Shift+P -> Python: Select Interpreter -> backend\.venv\...

### Git push rejected
git pull origin main --no-rebase; conflict resolve; commit; push.

### Secret accidentally committed
Foran rotate karein. Git history se delete kaafi nahi.

### Docker Desktop not running
"failed to connect to the docker API at npipe://..."
Docker Desktop kholain, green whale icon ka intezar, phir docker compose up -d.

### Test expectation vs code mismatch
Dono check karein. Phase 9: 1200 vs 1100 (test ghalat).
Phase 10: end_date inclusive (test assumption ghalat).

### Budget spent "0" vs "0.00"
COALESCE integer 0 return karta hai.
Fix: Decimal(result).quantize(Decimal("0.01"))

### New endpoints missing from Swagger
uvicorn module cache:
    # Ctrl+C
    Get-ChildItem -Recurse -Directory -Filter "__pycache__" | Remove-Item -Recurse -Force
    Get-ChildItem -Recurse -File -Include "*.pyc" | Remove-Item -Force
    # restart uvicorn

### uvicorn: "Could not import module 'main'"
uvicorn app.main:app --reload --port 8000 (module path, file path nahi)

### Frontend test: label without form control
<label htmlFor="x"> aur <input id="x"> — dono zaroori.

### Frontend test: "Router inside Router"
App.tsx mein already BrowserRouter hai. Test mein plain render +
window.history.pushState.

### npm esbuild postinstall warning
npm approve-scripts esbuild
npm rebuild esbuild

### tsconfig baseUrl deprecated (TS 7.0 preview)
baseUrl hata dein. TS 5.6+ mein paths without baseUrl works.

### Tailwind v4 arbitrary values suggestion
Symptom: "The class max-w-[12rem] can be written as max-w-48".
Fix: Replace max-w-[12rem] with max-w-48 (1rem = 4 units).

### Frontend: PowerShell mein file content paste ho gaya
Symptom: PSReadLine crash ya unknown command.
Fix: Ye harmless hai. Aage: file content sirf VS Code mein
     paste karein.

### Frontend test: "clearSessionExpired is not a function"
Symptom: mocked useAuth value mein naye fields nahi.
Fix: Test mock mein saare naye fields add karein.

### Dashboard test: "Found multiple elements with text: /5,000/"
Symptom: Rs 5,000 do jagah (Month Income card + Salary tx).
Fix: getAllByText use karein ya assertion specific karein.

### App.test fails after Dashboard fetches data
Symptom: "welcome, adnan" nahi milta, "Failed to load dashboard".
Fix: App.test mein fetch mock karein (emptyOverview return kare).

### jsdom: "window.matchMedia is not a function"
Symptom: ThemeProvider crashes; many tests fail.
Fix: Add a matchMedia stub in `src/test/setup.ts`.

### Testing Library: getByLabelText(/password/i) is ambiguous
Symptom: "Found multiple elements with the text of: /password/i"
Fix: Use anchored regex: `/^password$/i`. "Show password"
     toggle button bhi match karta hai.

### SQLAlchemy: "User is not defined" / Pylance warnings
Symptom: Pylance reports undefined forward-referenced types.
Fix: Add `from __future__ import annotations` and use
     `if TYPE_CHECKING:` imports for related models.

### Forgot password — reset link missing in browser
Symptom: No email arrives (expected in dev).
Fix: Check backend console. `DEBUG_RESET_LINKS=true` in `.env`
     prints the reset URL to stdout.

### Password field not visible in dark mode
Symptom: Text invisible in dark theme.
Fix: Ensure input has `dark:bg-slate-800 dark:text-slate-100`
     classes. Same for card, table, borders.

### Recharts: "ResizeObserver is not defined"
Symptom: AnalyticsPage tests fail in jsdom.
Fix: In `src/test/setup.ts`, add a ResizeObserver stub:
    if (typeof globalThis.ResizeObserver === "undefined") {
      class ResizeObserverStub {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
      (globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub })
        .ResizeObserver = ResizeObserverStub;
    }

### Python: "from __future__ imports must occur at the beginning"
Symptom: SyntaxError when starting uvicorn/alembic.
Fix: The line must be the very first non-docstring line.
     Move it to line 1, before all other imports.

### TypeScript: "Cannot find module './client'"
Symptom: After pasting a file, imports appear missing.
Fix: The file was likely saved incomplete (missing try/parse lines).
     Check `type <path>` output and re-paste the full file.

### Circular import: "partially initialized module 'app.api.v1'"
Symptom: cannot import name 'receipts' — circular import error.
Fix: The router file was missing. Add `app/api/v1/receipts.py`
     and the required `schemas/receipt.py`, `services/receipt_service.py`.

### FastAPI: "Status code 204 must not have a response body"
Symptom: AssertionError at route-definition time (import/startup),
     on a DELETE route with `status_code=204` and a `-> None`
     return annotation.
Fix: Add `response_model=None` explicitly to that route decorator.
     FastAPI otherwise infers a response model from the return
     type annotation even when it's `None`.

### pip: "Could not find a version that satisfies the requirement
lxml" (or any package) with "(from versions: none)"
Symptom: Looks like a version-compatibility error but isn't — it
     means pip couldn't reach PyPI's index at all (transient
     network issue, VPN/proxy, or a bad connection at that moment).
Fix: Retry plainly first. If it persists: `pip install <pkg>
     --timeout 120`, `pip cache purge`, toggle VPN, or switch
     networks. If nothing works, defer that dependency and continue
     (see decision #13 — `.docx` support deferred this way).

### psycopg.errors.UndefinedObject: type "vector" does not exist
     (in tests only, not in normal app use)
Symptom: `Base.metadata.create_all()` fails inside
     `tests/conftest.py`'s `_setup_test_db` fixture, but `alembic
     upgrade head` against the real dev database works fine.
Cause: A migration ran `CREATE EXTENSION IF NOT EXISTS vector` in
     the main database, but tests build their schema directly via
     SQLAlchemy metadata (bypassing Alembic), so the test database
     never got the extension enabled.
Fix: In `conftest.py`, before `Base.metadata.create_all(bind=engine)`,
     run:
         with engine.begin() as conn:
             conn.execute(sa_text("CREATE EXTENSION IF NOT EXISTS vector"))
     General rule: any `CREATE EXTENSION` a migration does must be
     mirrored in `conftest.py`, since tests never run migrations.

### venv not activated — "ModuleNotFoundError: No module named
'sqlalchemy'" (or any installed package) despite it being installed
Symptom: Prompt shows `PS D:\...>` **without** the `(.venv)` prefix;
     a project package that's definitely installed can't be found.
Fix: Run `.venv\Scripts\Activate.ps1` in that terminal before
     running `python`/`pytest`/`uvicorn`. Often caused by a bad
     copy-pasted multi-line command (e.g. accidentally including a
     stray `(.venv) PS ...>` prompt text in the pasted command) that
     silently breaks the shell session.

### Alembic autogenerate + pgvector: migration file is incomplete
Symptom: `NameError: name 'pgvector' is not defined` when running
     `alembic upgrade head` on a migration that has an `embedding
     pgvector.sqlalchemy.vector.VECTOR(...)` column.
Fix: `alembic revision --autogenerate` detects the column type but
     does NOT add the import for it. Manually add
     `import pgvector.sqlalchemy` near the top of the generated
     migration file, alongside `import sqlalchemy as sa`.

### Indentation bug: helper function accidentally nested inside
another function after a large paste
Symptom: works at import time (`python -c "from ... import x;
     print('OK')"` succeeds) but fails at call time, or the file
     "looks right" visually but a function defined after a `try/
     except` block is actually still inside it.
Fix: When pasting a large service file update, re-view the whole
     function boundary (not just the diff) to confirm the new
     function's `def` is at column 0, not indented under the
     previous function.

### Groq LLM returns an empty string with no error
Symptom: `resp.choices[0].message.content` is `""`/`None`, exit
     code 0, no exception raised anywhere.
Cause: The model (`openai/gpt-oss-120b`) is a reasoning model — it
     consumes part of the `max_tokens` budget on internal reasoning
     before the visible answer. A low `max_tokens` (e.g. 20) can
     exhaust the whole budget before any answer text is produced.
Fix: Raise `max_tokens` (300+ for quick manual tests, 800 is the
     app's default in `llm/client.py`). Always rule this out before
     assuming an API-key/auth problem.

### Groq "401 Invalid API Key" even after fixing `.env`
Symptom: Same 401 error persists after pasting a valid key into
     `.env` and confirming it via `settings.GROQ_API_KEY`.
Cause: `uvicorn --reload` watches `.py` files, not `.env` — the
     already-running process still has the old value loaded from
     when it started.
Fix: Fully stop (Ctrl+C, wait for "Application shutdown complete")
     and start a fresh `uvicorn` process after any `.env` change.

### RAG chat "sources" shows the same document multiple times
Symptom: Asking a question against a single uploaded file lists
     that file's name 3-5 times under "Sources" in the chat UI.
Cause: `RAG_TOP_K` chunks are retrieved (not top-K *documents*); a
     single document can contribute several of the retrieved
     chunks to one answer, and each chunk becomes one `sources`
     entry.
Fix (frontend, `ChatPage.tsx`): dedupe by `document_id` using a
     `Map` before rendering the sources list, so each source
     document appears once per answer regardless of chunk count.
     *(Identified but not yet applied — see §9, "Next session".)*

---

## 13. Docker Details

- Image: pgvector/pgvector:0.8.6-pg18-trixie
- Container: expense_db
- Host port: 5433 -> container 5432
- Volume: expense_tracker_postgres_data
- Restart policy: unless-stopped
- Healthcheck: pg_isready every 5s
- `vector` extension is bundled in the image but still needs
  `CREATE EXTENSION IF NOT EXISTS vector` run once per database
  (main DB: done via the Phase 18C-1 migration; test DB: done
  automatically by `tests/conftest.py`).

Docker Desktop band hone par container bhi band. Dobara:
    docker compose up -d
Tip: Start Docker Desktop when you sign in.

---

## 14. Notes and Gotchas

- Root .env mein plain password, backend .env mein URL-encoded.
- Do containers host par chal sakte hain (purana postgres-db 5432,
  naya expense_db 5433).
- alembic env.py mein `import app.models` zaroori hai.
- pytest alag DB (expense_tracker_test) use karta hai; migrations
  wahan nahi chaltin (`Base.metadata.create_all()` seedha), isliye
  koi bhi manually-enabled Postgres extension `conftest.py` mein
  bhi dobara enable karni padegi (Phase 18C se seekha).
- OneDrive mein project na rakhein.
- Har phase ke commit se pehle README + PROJECT_LOG update karein.
- Account balance AccountUpdate mein intentionally nahi.
- Transaction amount hamesha positive. Sign kind se.
- Category delete -> transactions.category_id NULL.
- Account delete -> uske transactions bhi delete.
- Har user ko 12 default categories milti hain.
- Budget usage live compute hoti hai (store nahi).
- Budget sirf expense categories par.
- Recurring: next_run_at aage badhta hai; end_date inclusive.
- Dashboard queries read-only. Null category -> "Uncategorized".
- Frontend: token localStorage mein. isLoading state se
  protected route pehle render nahi hota.
- Frontend tests jsdom mein chalte hain (real HTTP nahi).
- Vite dev server port 5173 (strictPort).
- Vite config mein Vitest config bhi hai (ek hi file).
- 401 par AuthContext sessionExpired set karta hai.
- Profile dropdown Layout mein hai; click-outside se band.
- Forgot password: 15-min expiry, single-use, SHA-256 hashed.
- Naya forgot-password request purane unused tokens invalid karta hai.
- Password fields: `PasswordInput` with show/hide eye toggle.
- Theme: localStorage `theme` key; `prefers-color-scheme` default.
- Dark mode: Tailwind v4 `@custom-variant dark` — class based.
- Modal `z-30`, dropdown `z-20`.
- Mobile: hamburger `md:hidden`, desktop nav `hidden md:flex`.
- Recharts: `ResponsiveContainer` uses ResizeObserver — stub in tests.
- CSV exports: files served with `Content-Disposition: attachment`.
- Receipts: content types restricted to jpeg/png/webp/gif/pdf.
- Receipts: original_name is untrusted; stored_name is uuid-prefixed.
- Receipts: files stored in `backend/uploads/receipts/` (gitignored).
- Analytics weekday heatmap computed in Python (DB-portable).
- Documents: same untrusted-original-name / uuid-stored-name pattern
  as receipts; stored in `backend/uploads/documents/` (gitignored).
- `DocumentRead` deliberately excludes `text_content` from API
  responses (kept large text out of list/detail payloads); it is
  never surfaced in the UI yet.
- Document processing (extract -> chunk -> embed) is synchronous on
  upload — the request blocks until it's done, including the first
  time the embedding model downloads.
- A document's chunks are always deleted and rebuilt from scratch if
  `_create_chunks()` runs again (idempotent — safe to re-process).
- If chunking/embedding fails after a successful text extraction,
  the whole document is marked `status="failed"`, not "ready" —
  there's no such thing as a "ready" document with zero usable
  chunks.
- Chat only ever answers from retrieved chunks (system prompt
  forbids inventing facts) and always returns `sources`, even when
  the LLM is asked to say it doesn't know.
- `RAG_TOP_K=5` returns 5 chunks, which can come from the same
  document — dedupe by `document_id` in the UI if only unique
  filenames should be shown (see §12).
- `GROQ_API_KEY` missing/invalid disables only `/api/v1/chat`
  (503); everything else in the app is unaffected.
- Any `.env` change requires a full uvicorn restart, not just
  `--reload` (which only watches `.py` files).

---

## 15. Roadmap (aage kya)

| Phase | Scope                                    | Est. days |
|-------|-------------------------------------------|-----------|
| 19-20 | Agent tools, AI over finance data (not    | 3         |
|       | just documents — e.g. "how much did I     |           |
|       | spend this month" answered from live      |           |
|       | transactions/budgets, not just uploads)   |           |
| 21    | Testing aur security sweep               | 1         |
| 22    | Dockerization aur deployment             | 2         |
| 23    | Final QA aur docs                        | 1         |

**Completed:**
- Backend MVP complete at Phase 11 (90 tests)
- Frontend MVP complete at Phase 15 (57 tests)
- Post-MVP polish (forgot password, dark mode, responsive)
- Analytics + exports + receipts at Phase 17
- AI: documents, chunking/embeddings, RAG chat at Phase 18
- **Total: 135 backend + 62 frontend = 197 tests**
- Git tags: v0.1.0-mvp, v0.1.1-forgot-password,
  v0.2.0-analytics-receipts

**Open items carried into next session (see §9 for details):**
- Dedupe chat `sources` by document in the frontend
- Optional `.docx` upload support (blocked on a one-off network
  issue installing `lxml`, not a code problem)
- Optional: surface extracted document text somewhere in the UI

**Next: Phase 19-20 (AI agent tools)** — needs decisions:
- Which finance operations should the AI be allowed to call as
  tools (read-only analytics first, before any write access)?
- Whether chat should merge document context with live financial
  data in one answer, or keep them as separate assistants

---

## 16. Contact / Repo

- GitHub: https://github.com/AdnanTaj01/expense-tracker
- Visibility: Private
- Local path: D:\dev\expense-tracker