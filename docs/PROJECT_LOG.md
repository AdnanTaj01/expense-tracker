# Expense Tracker — Master Project Log

Last updated: Phase 16-17 (analytics, exports, receipts) — 2026-09-25

Ye file project ka single source of truth hai. Isme project ka
overview, decisions, setup steps, har phase ka record, aur
troubleshooting sab kuch ek jagah hai.

---

## 1. Project Overview

A multi-user personal finance system with an optional AI assistant.

Core idea:
- Users register aur login karte hain
- Apne bank accounts, cash, credit cards track karte hain
- Income aur expense transactions record karte hain
- Budgets set karte hain aur usage monitor karte hain
- Dashboard par summary dekhte hain
- Analytics + CSV exports + receipts
- (Phase 18+) AI assistant documents par sawal-jawab karta hai

Rule: App AI ke bina bhi chalti hai. LLM sirf explain karta hai,
woh source of truth nahi hai.

**Backend MVP (Phases 0-11) complete.**
**Frontend MVP (Phases 12-15) complete.**
**Post-MVP polish (forgot password, dark mode, responsive) complete.**
**Analytics + exports + receipts (Phases 16-17) complete.**
**180 tests passing (118 backend + 62 frontend).**
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
| AI / RAG    | LLM provider TBD + pgvector - Phase 18+          |
| Deployment  | Docker Compose + nginx - Phase 22+               |

---

## 3. Architecture

    React  ->  FastAPI  ->  services  ->  SQLAlchemy  ->  PostgreSQL

Layering rules:
- Routers input validate karte hain, service call karte hain
- Services business logic rakhte hain, DB se baat karte hain
- AI tools sirf services call karte hain, kabhi seedha SQL nahi

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
8. LLM provider aur embedding model Phase 18 se pehle decide honge.
9. Receipts: local uploads/ folder (Docker volume). PDF library
   Phase 16 mein decide hoga.
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

Project location: D:\dev\expense-tracker

Python note: System mein 3.14 aur 3.14t (freethreaded) bhi hain,
lekin hum sirf 3.13 use karte hain.

Command convention:
- py -3.13 -> naya venv banane ke liye
- venv active hone ke baad sirf python

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
    |   |   |-- app/
    |   |   |   |-- main.py
    |   |   |   |-- core/ (config.py, security.py)
    |   |   |   |-- db/ (base.py, session.py)
    |   |   |   |-- models/ (user, account, category, transaction,
    |   |   |   |           budget, recurring, password_reset_token,
    |   |   |   |           receipt)
    |   |   |   |-- schemas/ (user, auth, account, category,
    |   |   |   |            transaction, budget, recurring,
    |   |   |   |            dashboard, analytics, receipt)
    |   |   |   |-- services/ (user, account, category, transaction,
    |   |   |   |             budget, recurring, dashboard,
    |   |   |   |             password_reset_service, analytics_service,
    |   |   |   |             export_service, receipt_service)
    |   |   |   |-- api/ (deps.py, v1/{auth, accounts, categories,
    |   |   |   |         transactions, budgets, recurring, dashboard,
    |   |   |   |         analytics, exports, receipts})
    |   |   |   |-- scripts/ (list_users, reset_password,
    |   |   |   |              seed_demo_data)
    |   |   |   |-- ai/ (Phase 18+)
    |   |   |-- tests/ (118 tests)
    |   |   |-- uploads/            (gitignored — receipts storage)
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
    |   |   |         client.test.ts)
    |   |   |-- components/ (Layout.tsx, ProtectedRoute.tsx,
    |   |   |                PasswordInput.tsx, ExportButton.tsx)
    |   |   |-- context/ (AuthContext.tsx, ThemeContext.tsx)
    |   |   |-- pages/ (Login, Register, ForgotPassword,
    |   |   |           ResetPassword, Dashboard, Accounts,
    |   |   |           Categories, Budgets, Transactions,
    |   |   |           Analytics, Receipts, NotFound + tests)
    |   |   |-- test/ (setup.ts, utils.tsx)
    |   |   |-- types/ (api.ts)
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

    # 3. Docker
    docker compose up -d
    docker compose ps

    # 4. Backend
    cd backend
    py -3.13 -m venv .venv
    .venv\Scripts\Activate.ps1
    pip install -r requirements.txt
    # backend/.env banayein
    alembic upgrade head
    uvicorn app.main:app --reload --port 8000

    # 5. Frontend (naya terminal)
    cd frontend
    npm install
    npm run dev

Test: http://localhost:8000/docs  aur  http://localhost:5173

Test databases setup (ek baar):

    docker compose exec db psql -U expense_user -d expense_tracker -c "CREATE DATABASE expense_tracker_test OWNER expense_user;"

Test run:

    cd backend && pytest
    cd frontend && npm test

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

- Commit: (pending)
- Tag: v0.2.0-analytics-receipts (pending)

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

### Database (psql)

    docker compose exec db psql -U expense_user -d expense_tracker
    # andar: \dt  \d users  \l  \q

### Tests

    # Backend
    cd backend
    .venv\Scripts\Activate.ps1
    pytest
    pytest tests/test_auth.py
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
    python -m app.scripts.seed_demo_data user@example.com

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

---

## 13. Docker Details

- Image: pgvector/pgvector:0.8.6-pg18-trixie
- Container: expense_db
- Host port: 5433 -> container 5432
- Volume: expense_tracker_postgres_data
- Restart policy: unless-stopped
- Healthcheck: pg_isready every 5s

Docker Desktop band hone par container bhi band. Dobara:
    docker compose up -d
Tip: Start Docker Desktop when you sign in.

---

## 14. Notes and Gotchas

- Root .env mein plain password, backend .env mein URL-encoded.
- Do containers host par chal sakte hain (purana postgres-db 5432,
  naya expense_db 5433).
- alembic env.py mein `import app.models` zaroori hai.
- pytest alag DB (expense_tracker_test) use karta hai.
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

---

## 15. Roadmap (aage kya)

| Phase | Scope                                    | Est. days |
|-------|------------------------------------------|-----------|
| 18-20 | RAG, AI chat, agent tools                | 4         |
| 21    | Testing aur security sweep               | 1         |
| 22    | Dockerization aur deployment             | 2         |
| 23    | Final QA aur docs                        | 1         |

**Completed:**
- Backend MVP complete at Phase 11 (90 tests)
- Frontend MVP complete at Phase 15 (57 tests)
- Post-MVP polish (forgot password, dark mode, responsive)
- Analytics + exports + receipts at Phase 17
- **Total: 118 backend + 62 frontend = 180 tests**
- Git tags: v0.1.0-mvp, v0.1.1-forgot-password,
  v0.2.0-analytics-receipts

**Next: Phase 18-20 (AI)** — needs decisions:
- LLM provider (OpenAI / Anthropic / Ollama)
- Embedding model
- API key in backend `.env`
- pgvector already set up for RAG

---

## 16. Contact / Repo

- GitHub: https://github.com/AdnanTaj01/expense-tracker
- Visibility: Private
- Local path: D:\dev\expense-tracker