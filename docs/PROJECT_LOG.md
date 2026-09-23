# Expense Tracker — Master Project Log

Last updated: Phase 12 complete (2026-09-23)

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
- (Phase 18+) AI assistant documents par sawal-jawab karta hai

Rule: App AI ke bina bhi chalti hai. LLM sirf explain karta hai,
woh source of truth nahi hai.

Backend MVP (Phases 0-11) complete. Frontend foundation (Phase 12)
complete. 90 backend tests + 27 frontend tests, sab pass.

---

## 2. Tech Stack

| Layer       | Technology                                       |
|-------------|--------------------------------------------------|
| Frontend    | React 19 + TypeScript + Tailwind 4 + Vite 7      |
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
    |   |   |-- app/
    |   |   |   |-- main.py
    |   |   |   |-- core/ (config.py, security.py)
    |   |   |   |-- db/ (base.py, session.py)
    |   |   |   |-- models/ (user, account, category,
    |   |   |   |           transaction, budget, recurring)
    |   |   |   |-- schemas/ (user, auth, account, category,
    |   |   |   |            transaction, budget, recurring, dashboard)
    |   |   |   |-- services/ (user, account, category, transaction,
    |   |   |   |             budget, recurring, dashboard)
    |   |   |   |-- api/ (deps.py, v1/{auth, accounts, categories,
    |   |   |   |         transactions, budgets, recurring, dashboard})
    |   |   |   |-- ai/ (Phase 18+)
    |   |   |-- tests/ (90 tests)
    |   |-- uploads/            (gitignored)
    |-- frontend/
    |   |-- .env, .env.example
    |   |-- package.json, package-lock.json
    |   |-- vite.config.ts (includes Vitest config)
    |   |-- tsconfig.json, tsconfig.node.json
    |   |-- index.html
    |   |-- src/
    |   |   |-- main.tsx
    |   |   |-- App.tsx
    |   |   |-- index.css
    |   |   |-- api/ (client.ts, auth.ts, client.test.ts)
    |   |   |-- components/ (Layout.tsx, ProtectedRoute.tsx + tests)
    |   |   |-- context/ (AuthContext.tsx + tests)
    |   |   |-- pages/ (Login, Register, Dashboard, Accounts,
    |   |   |           Categories, Budgets, Transactions,
    |   |   |           NotFound + tests)
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
  (create/update/delete all adjust balance in one commit)
- Endpoints: /api/v1/transactions (filters, pagination)
- 18 new tests (43 total), including balance integrity
- Masla: test expectation 1200 vs 1100 (test ghalat tha)
- Commit: 30f4bb6

### Phase 10 - Budgets aur Recurring (Done)
- Models: budget, recurring
- Services: budget_service (live usage), recurring_service
  (generate_due_transactions, end_date inclusive, safety cap)
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
- Commit: (pending with Phase 12)

### Phase 12 - React Foundation (Done)
- Vite 7 + React 19 + TypeScript 5.6 + Tailwind 4
- Files: package.json, vite.config.ts, tsconfig.json,
  tsconfig.node.json, index.html
- src:
  - main.tsx (mount + AuthProvider wrap)
  - App.tsx (BrowserRouter + Routes with ProtectedRoute)
  - api/client.ts (fetch wrapper, ApiError, token storage)
  - api/auth.ts (register, login, me)
  - context/AuthContext.tsx (login/logout/register/isLoading)
  - components/Layout.tsx (navbar + Outlet)
  - components/ProtectedRoute.tsx (redirect to /login)
  - pages: Login, Register, Dashboard, Accounts, Categories,
    Budgets, Transactions, NotFound
  - test/{setup.ts, utils.tsx}
  - types/api.ts (backend schemas as TS types)
- Testing: Vitest + React Testing Library + jsdom + jest-dom
- V8 coverage: HTML + LCOV + JSON summary
- JUnit XML: test-results/junit.xml
- 27 tests passing (6 files)
- Coverage: 89.59% stmts, 85.54% branches
- End-to-end verified: browser -> register -> login -> dashboard
- Masle:
  1. Label/input linking -> htmlFor/id
  2. App.test Router-in-Router -> plain render + pushState
  3. esbuild postinstall warning -> npm approve-scripts esbuild
  4. tsconfig baseUrl deprecation -> removed
- Commit: (pending)

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
Accessibility aur getByLabelText dono ke liye.

### Frontend test: "Router inside Router"
App.tsx mein already BrowserRouter hai. Test mein plain render +
window.history.pushState.

### npm esbuild postinstall warning
npm approve-scripts esbuild
npm rebuild esbuild

### tsconfig baseUrl deprecated (TS 7.0 preview)
baseUrl hata dein. TS 5.6+ mein paths without baseUrl works.

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
- Har phase ke commit se pehle README ka Progress update karein.
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
- Vite dev server port 5173 (strictPort) — backend CORS isi ke liye.
- Vite config mein Vitest config bhi hai (ek hi file).

---

## 15. Roadmap (aage kya)

| Phase | Scope                                    | Est. days |
|-------|------------------------------------------|-----------|
| 13    | Frontend auth wiring + logout flow       | 1         |
| 14-15 | Dashboard, transactions, all UI screens  | 4         |
| 16-17 | Analytics, PDF/CSV, uploads, notifs      | 2         |
| 18-20 | RAG, AI chat, agent tools                | 4         |
| 21    | Testing aur security sweep               | 1         |
| 22    | Dockerization aur deployment             | 2         |
| 23    | Final QA aur docs                        | 1         |

MVP checkpoint: Phase 15 ke end mein.

Backend MVP complete at Phase 11 (90 tests).
Frontend foundation complete at Phase 12 (27 tests).

---

## 16. Contact / Repo

- GitHub: https://github.com/AdnanTaj01/expense-tracker
- Visibility: Private
- Local path: D:\dev\expense-tracker