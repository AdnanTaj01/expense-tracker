# Expense Tracker — Master Project Log

Last updated: Phase 11 complete (2026-09-23)

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

Backend MVP (Phases 0-11) complete. 90 tests passing.

---

## 2. Tech Stack

| Layer       | Technology                                       |
|-------------|--------------------------------------------------|
| Frontend    | React + TypeScript + Tailwind (Vite) - Phase 12+ |
| Backend     | Python 3.13 + FastAPI + Uvicorn (complete)       |
| Database    | PostgreSQL 18 + pgvector (Docker)                |
| ORM         | SQLAlchemy 2.x (sync) + psycopg 3                |
| Migrations  | Alembic                                          |
| Auth        | PyJWT (HS256) + Argon2id (pwdlib)                |
| Testing     | pytest + httpx (TestClient)                      |
| AI / RAG    | LLM provider TBD + pgvector - Phase 18+          |
| Deployment  | Docker Compose + nginx - Phase 22+               |

---

## 3. Architecture

    React  ->  FastAPI  ->  services  ->  SQLAlchemy  ->  PostgreSQL

Layering rules:
- Routers input validate karte hain, service call karte hain
- Services business logic rakhte hain, DB se baat karte hain
- AI tools sirf services call karte hain, kabhi seedha SQL nahi

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
    Optional: TanStack Query, React Hook Form.

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
lekin hum sirf 3.13 use karte hain. Wajah: 3.13 ke prebuilt wheels
zyada tar packages ke liye available hain, Windows par compile errors
kam honge.

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
    |   |-- .env                (gitignored - real values)
    |   |-- .env.example        (committed)
    |   |-- .venv/              (gitignored)
    |   |-- requirements.txt
    |   |-- alembic.ini
    |   |-- pytest.ini
    |   |-- alembic/
    |   |   |-- env.py
    |   |   |-- script.py.mako
    |   |   |-- versions/
    |   |       |-- ea030cbc5ab6_create_alembic_version_table.py
    |   |       |-- 7673bc3416bf_create_users_table.py
    |   |       |-- 3c9938a801aa_create_accounts_and_categories_tables.py
    |   |       |-- e78852c3c6d5_create_transactions_table.py
    |   |       |-- fdaed5992445_create_budgets_table.py
    |   |       |-- a157bb4870e3_create_recurring_rules_table.py
    |   |-- app/
    |   |   |-- __init__.py
    |   |   |-- main.py             FastAPI app + router include
    |   |   |-- core/
    |   |   |   |-- config.py       Pydantic settings from .env
    |   |   |   |-- security.py     Argon2 + JWT
    |   |   |-- db/
    |   |   |   |-- base.py         DeclarativeBase
    |   |   |   |-- session.py      engine + SessionLocal + get_db
    |   |   |-- models/
    |   |   |   |-- __init__.py     exports User, Account, Category,
    |   |   |   |                   Transaction, Budget, RecurringRule
    |   |   |   |-- user.py
    |   |   |   |-- account.py
    |   |   |   |-- category.py
    |   |   |   |-- transaction.py
    |   |   |   |-- budget.py
    |   |   |   |-- recurring.py
    |   |   |-- schemas/
    |   |   |   |-- __init__.py
    |   |   |   |-- user.py
    |   |   |   |-- auth.py
    |   |   |   |-- account.py
    |   |   |   |-- category.py
    |   |   |   |-- transaction.py
    |   |   |   |-- budget.py
    |   |   |   |-- recurring.py
    |   |   |   |-- dashboard.py
    |   |   |-- services/
    |   |   |   |-- __init__.py
    |   |   |   |-- user_service.py
    |   |   |   |-- account_service.py
    |   |   |   |-- category_service.py (includes seed defaults)
    |   |   |   |-- transaction_service.py (safe balance updates)
    |   |   |   |-- budget_service.py (live usage computation)
    |   |   |   |-- recurring_service.py (generate due transactions)
    |   |   |   |-- dashboard_service.py (aggregation queries)
    |   |   |-- api/
    |   |   |   |-- __init__.py
    |   |   |   |-- deps.py         get_current_user
    |   |   |   |-- v1/
    |   |   |       |-- __init__.py api_router
    |   |   |       |-- auth.py
    |   |   |       |-- accounts.py
    |   |   |       |-- categories.py
    |   |   |       |-- transactions.py
    |   |   |       |-- budgets.py
    |   |   |       |-- recurring.py
    |   |   |       |-- dashboard.py
    |   |   |-- ai/                 (Phase 18+)
    |   |-- tests/
    |   |   |-- __init__.py
    |   |   |-- conftest.py         fixtures: client, db_session
    |   |   |-- test_auth.py        8 tests
    |   |   |-- test_accounts.py    8 tests
    |   |   |-- test_categories.py  9 tests
    |   |   |-- test_transactions.py 18 tests
    |   |   |-- test_budgets.py     15 tests
    |   |   |-- test_recurring.py   17 tests
    |   |   |-- test_dashboard.py   15 tests
    |   |-- uploads/                gitignored
    |-- frontend/                   (Phase 12+)
    |-- deploy/                     (Phase 22+)

---

## 7. Environment Variables

### Root .env (Docker Compose)

    POSTGRES_USER=expense_user
    POSTGRES_PASSWORD=<strong-password-here>
    POSTGRES_DB=expense_tracker
    POSTGRES_HOST_PORT=5433

Note: POSTGRES_HOST_PORT=5433, NOT 5432. Wajah: 5432 par pehle
se ek purana PostgreSQL container chal raha hai host machine par.

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

Encode karne ka aasan tareeqa:

    python -c "import urllib.parse; print(urllib.parse.quote('RAW_PASSWORD', safe=''))"

JWT secret banane ka tareeqa:

    python -c "import secrets; print(secrets.token_urlsafe(64))"

Rules:
- .env files kabhi git mein nahi jatein (.gitignore cover karta hai)
- .env.example mein sirf placeholders, real values nahi
- Frontend mein koi secret nahi hota (browser bundle public hota hai)

---

## 8. Setup From Scratch (fresh machine)

    # 1. Clone
    git clone https://github.com/AdnanTaj01/expense-tracker.git
    cd expense-tracker

    # 2. Root .env banayein (upar Section 7 dekhein)

    # 3. Docker start karein
    docker compose up -d
    docker compose ps    # "healthy" ka intezar karein

    # 4. Backend setup
    cd backend
    py -3.13 -m venv .venv
    .venv\Scripts\Activate.ps1
    pip install -r requirements.txt

    # 5. backend/.env banayein (Section 7)

    # 6. Migrations apply karein
    alembic upgrade head

    # 7. Server chalayein
    uvicorn app.main:app --reload --port 8000

Test: http://localhost:8000/docs

Test database (ek baar):

    docker compose exec db psql -U expense_user -d expense_tracker -c "CREATE DATABASE expense_tracker_test OWNER expense_user;"

Tests chalayein:

    cd backend
    .venv\Scripts\Activate.ps1
    pytest

---

## 9. Phase-by-Phase Record

### Phase 0 - Decisions (Done)
Sab 10 decisions confirm kiye (Section 4 dekhein).

### Phase 1 - Installs (Done)
Python 3.13.15, Node 24, Git, Docker, VS Code extensions install.

### Phase 2 - Repo + Structure (Done)
- Folder structure banaya
- .gitignore, README.md, .env.example, docs/decisions.md
- Git init, first commit, GitHub repo (expense-tracker, private)
- Commit: cc6dc17

### Phase 3 - PostgreSQL + pgvector (Done)
- docker-compose.yml with pgvector/pgvector:0.8.6-pg18-trixie
- Masla: PostgreSQL 18 mein data directory path badal gaya -
  volume /var/lib/postgresql par mount karna padta hai
- Container expense_db, port 5433:5432
- pgvector 0.8.6 enabled aur tested
- Persistence test: container restart ke baad data mehfooz
- Commit: 9227780

### Phase 4 - FastAPI Foundation (Done)
- backend/.venv (Python 3.13)
- FastAPI 0.115.6, uvicorn, pydantic-settings
- app/core/config.py, app/main.py with /health + CORS
- Commit: cd9da2b

### Phase 5 - SQLAlchemy + Alembic (Done)
- SQLAlchemy 2.0.44, Alembic 1.14.0, psycopg 3.2.4
- app/db/base.py, app/db/session.py
- Masla: configparser % ko interpolation samajhta tha
  -> fix: create_engine(settings.DATABASE_URL, ...) in env.py
- First migration: alembic_version table
- Commit: f23b7bb

### Phase 6 - User Model (Done)
- app/models/user.py
- app/schemas/user.py
- Migration: 7673bc3416bf_create_users_table.py
- Commit: fdf0b8a

### Phase 7 - Auth + Security (Done)
- PyJWT 2.10.1, pwdlib 0.2.1 (Argon2), python-multipart 0.0.20
- pytest 8.3.4, httpx 0.28.1
- app/core/security.py, app/api/deps.py
- app/api/v1/auth.py - register/login/me/change-password
- 8 tests passing
- Masla: import app.models ne app naam overwrite kar diya
  -> fix: from app.main import app as fastapi_app in conftest
- Commit: f254fb2

### Phase 8 - Accounts aur Categories (Done)
- Models: account.py, category.py (FK to users, CASCADE)
- Migration: 3c9938a801aa_create_accounts_and_categories_tables.py
- Schemas with Literal type validation
- Ownership-scoped services
- Endpoints: /api/v1/accounts, /api/v1/categories
- Seed 12 default categories on user registration
- 17 new tests (25 total)
- Commit: 2e4f83f

### Phase 9 - Transactions (Done)
- Model: transaction.py (FKs to users, accounts CASCADE,
  categories SET NULL, amount always positive, kind determines sign)
- Migration: e78852c3c6d5_create_transactions_table.py
- Schemas: TransactionCreate, TransactionUpdate, TransactionRead,
  TransactionList (paginated)
- Service: transaction_service.py with safe balance updates
  - _signed_delta, _reverse_delta helpers
  - create: insert row + apply balance in one commit
  - update: reverse old effect + apply new + update row
  - delete: reverse effect + delete row
  - recompute_account_balance (used in tests)
- Endpoints: /api/v1/transactions (5 routes with filters + pagination)
- 18 new tests (43 total)
- Masla: test_update_kind_reverses_and_applies mein test ka
  expectation ghalat tha (1200 vs 1100)
- Commit: 30f4bb6

### Phase 10 - Budgets aur Recurring (Done)
- Models: budget.py, recurring.py
- Migrations: fdaed5992445 (budgets),
  a157bb4870e3 (recurring_rules)
- Schemas: Budget*, RecurringRule*, GenerateResult
- Services: budget_service (live usage), recurring_service
  (generate_due_transactions, end_date inclusive, safety cap 1000)
- Endpoints: /api/v1/budgets (5), /api/v1/recurring (5 + /generate)
- 32 new tests (75 total)
- Masle: budget spent "0" vs "0.00" -> quantize fix;
  end_date inclusive (test assumption ghalat);
  uvicorn module cache hid new endpoints
- Commit: 3273013

### Phase 11 - Dashboard API (Done)
- Koi model/migration nahi
- Schemas: dashboard.py (DashboardSummary, CategoryBreakdownItem,
  TrendPoint, DashboardOverview)
- Service: dashboard_service.py (read-only aggregations)
  - get_summary: total_balance + month income/expense/net
  - get_category_breakdown: top expense categories w/ % share
  - get_trend: last N months income vs expense (oldest first)
  - get_recent_transactions: latest N ordered by occurred_at desc
  - get_overview: everything in one call
  - _month_bounds and _prev_months helpers
  - left join category -> "Uncategorized" when null
  - all sums quantized to 2 decimal places
- Endpoints: /api/v1/dashboard (5 routes)
- 15 new tests (90 total)
- Commit: (pending)

**Backend MVP complete at Phase 11.** 90 tests passing.

---

## 10. API Endpoints (current)

### Meta
| Method | Path        | Purpose         | Auth |
|--------|-------------|-----------------|------|
| GET    | /health     | Liveness check  | No   |

### Auth
| Method | Path                          | Purpose                | Auth |
|--------|-------------------------------|------------------------|------|
| POST   | /api/v1/auth/register         | Create new user        | No   |
| POST   | /api/v1/auth/login            | Get JWT access token   | No   |
| GET    | /api/v1/auth/me               | Current user profile   | Yes  |
| POST   | /api/v1/auth/change-password  | Change password        | Yes  |

### Accounts (ownership-scoped)
| Method | Path                          | Purpose                | Auth |
|--------|-------------------------------|------------------------|------|
| GET    | /api/v1/accounts              | List (?only_active=true) | Yes |
| POST   | /api/v1/accounts              | Create                 | Yes  |
| GET    | /api/v1/accounts/{id}         | Get one                | Yes  |
| PATCH  | /api/v1/accounts/{id}         | Update (no balance)    | Yes  |
| DELETE | /api/v1/accounts/{id}         | Delete                 | Yes  |

### Categories (ownership-scoped)
| Method | Path                          | Purpose                | Auth |
|--------|-------------------------------|------------------------|------|
| GET    | /api/v1/categories            | List (?kind=)          | Yes  |
| POST   | /api/v1/categories            | Create                 | Yes  |
| GET    | /api/v1/categories/{id}       | Get one                | Yes  |
| PATCH  | /api/v1/categories/{id}       | Update                 | Yes  |
| DELETE | /api/v1/categories/{id}       | Delete                 | Yes  |

### Transactions (ownership-scoped)
| Method | Path                          | Purpose                             | Auth |
|--------|-------------------------------|-------------------------------------|------|
| GET    | /api/v1/transactions          | List (filters + pagination)         | Yes  |
| POST   | /api/v1/transactions          | Create (auto re-balances account)   | Yes  |
| GET    | /api/v1/transactions/{id}     | Get one                             | Yes  |
| PATCH  | /api/v1/transactions/{id}     | Update (re-balances correctly)      | Yes  |
| DELETE | /api/v1/transactions/{id}     | Delete (reverses balance)           | Yes  |

Query params for list: account_id, category_id, kind, from_date,
to_date, limit (1-200), offset.

### Budgets (ownership-scoped)
| Method | Path                          | Purpose                             | Auth |
|--------|-------------------------------|-------------------------------------|------|
| GET    | /api/v1/budgets               | List (?year=, ?month=) w/ usage     | Yes  |
| POST   | /api/v1/budgets               | Create (expense categories only)    | Yes  |
| GET    | /api/v1/budgets/{id}          | Get one with usage                  | Yes  |
| PATCH  | /api/v1/budgets/{id}          | Update limit                        | Yes  |
| DELETE | /api/v1/budgets/{id}          | Delete                              | Yes  |

Response includes: spent, remaining, percentage, is_exceeded.

### Recurring (ownership-scoped; Phase 2 scope)
| Method | Path                                  | Purpose                          | Auth |
|--------|---------------------------------------|----------------------------------|------|
| GET    | /api/v1/recurring                     | List rules                       | Yes  |
| POST   | /api/v1/recurring                     | Create rule                      | Yes  |
| GET    | /api/v1/recurring/{id}                | Get one                          | Yes  |
| PATCH  | /api/v1/recurring/{id}                | Update rule                      | Yes  |
| DELETE | /api/v1/recurring/{id}                | Delete rule                      | Yes  |
| POST   | /api/v1/recurring/{id}/generate       | Manually materialize due         | Yes  |

### Dashboard (read-only, ownership-scoped)
| Method | Path                                  | Purpose                                 | Auth |
|--------|---------------------------------------|-----------------------------------------|------|
| GET    | /api/v1/dashboard/summary             | Total balance + month income/expense/net| Yes  |
| GET    | /api/v1/dashboard/by-category         | Expense breakdown by category           | Yes  |
| GET    | /api/v1/dashboard/trend               | Last N months income vs expense         | Yes  |
| GET    | /api/v1/dashboard/recent              | Recent transactions                     | Yes  |
| GET    | /api/v1/dashboard/overview            | All of the above in one call            | Yes  |

Auth = Authorization: Bearer <jwt> header.

---

## 11. Common Commands Reference

### Daily workflow

    docker compose up -d

    cd backend
    .venv\Scripts\Activate.ps1
    uvicorn app.main:app --reload --port 8000    # Terminal 1

    # Terminal 2
    curl http://localhost:8000/health

### Migrations

    alembic revision --autogenerate -m "describe change"
    alembic upgrade head
    alembic downgrade -1
    alembic current
    alembic history

### Database (psql)

    docker compose exec db psql -U expense_user -d expense_tracker

    # Andar:
    \dt              # tables list
    \d users         # users schema
    \l               # databases list
    \q               # quit

### Tests

    cd backend
    .venv\Scripts\Activate.ps1
    pytest                    # all tests (90)
    pytest tests/test_auth.py # one file
    pytest -k register        # name filter
    pytest -v                 # verbose

### Git workflow

    cd D:\dev\expense-tracker
    git status
    git add .
    git commit -m "message"
    git push
    git log --oneline -5

---

## 12. Troubleshooting Log

### PostgreSQL 18 volume path error
Symptom: Container start hota hi nahi, log kehta hai data
/var/lib/postgresql/data mein hai (unused mount).
Fix: volume mount postgres_data:/var/lib/postgresql (bina /data ke).

### configparser interpolation error
ValueError: invalid interpolation syntax at position 47.
Fix: alembic/env.py mein config.set_main_option hata kar seedha
create_engine(settings.DATABASE_URL, ...) use karein.

### AttributeError: module 'app' has no attribute 'dependency_overrides'
pytest mein saare tests ERROR par.
Fix: tests/conftest.py mein:

    import app.models
    from app.main import app as fastapi_app

Aur fastapi_app.dependency_overrides[...] use karein.

### PowerShell execution policy
.venv\Scripts\Activate.ps1 cannot be loaded.
Fix: Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned

### Port 5432 already in use
Fix: .env mein POSTGRES_HOST_PORT=5433 aur DATABASE_URL mein
localhost:5433.

### psql mein paste nahi hota
Fix: Right-click se paste, ya Ctrl+Shift+V. Ya PowerShell se
docker compose exec db psql ... -c "SQL" chalayein.

### VS Code "Import could not be resolved"
Fix: Ctrl+Shift+P -> Python: Select Interpreter ->
backend\.venv\Scripts\python.exe.

### Git push rejected
Fix: git pull origin main --no-rebase; conflict resolve; commit; push.

### Secret accidentally committed
Action: Foran rotate karein. Git history se delete karna kaafi nahi.

### Docker Desktop is not running
docker compose ps fails with "failed to connect to the docker API".
Fix: Docker Desktop kholain, green whale icon ka intezar karein,
phir docker compose up -d.

### Test expectation vs code mismatch
Agar test fail ho to dono check karein - test ya code.
Misal: Phase 9 - 1200 vs 1100 (test ghalat tha).
Misal: Phase 10 - end_date inclusive (test assumption ghalat).

### Budget spent returns "0" instead of "0.00"
Symptom: Empty sum returns integer 0 via COALESCE, not Decimal.
Fix: return Decimal(result).quantize(Decimal("0.01"))

### New endpoints missing from Swagger after adding a router
Symptom: New routes not appearing in /docs, but import test passes.
Fix: uvicorn caches Python modules.

    # 1. Ctrl+C in the uvicorn terminal
    # 2. Clear caches:
    Get-ChildItem -Recurse -Directory -Filter "__pycache__" | Remove-Item -Recurse -Force
    Get-ChildItem -Recurse -File -Include "*.pyc" | Remove-Item -Force
    # 3. Restart uvicorn

Verify with:

    (Invoke-RestMethod http://localhost:8000/openapi.json).paths.PSObject.Properties.Name

---

## 13. Docker Details

- Image: pgvector/pgvector:0.8.6-pg18-trixie
- Container name: expense_db
- Host port: 5433 -> container 5432
- Volume: expense_tracker_postgres_data
- Restart policy: unless-stopped
- Healthcheck: pg_isready every 5s

Note: Docker Desktop band hone par container bhi band ho jata hai.
docker compose up -d se dobara start karein.

Tips: Docker Desktop -> Settings -> General -> "Start Docker Desktop
when you sign in" tick karein.

---

## 14. Notes and Gotchas

- Root .env mein plain password, backend .env mein URL-encoded
  password. Farq samajhna zaroori hai.
- Do containers ek saath chal sakte hain host par (purana postgres-db
  port 5432 par, naya expense_db port 5433 par). Koi conflict nahi.
- alembic revision --autogenerate ko models ka pata hona chahiye.
  alembic/env.py mein import app.models line zaroori hai.
- pytest ke liye alag database hai (expense_tracker_test) taake
  development data safe rahe. Har test ke baad saari tables
  truncate hoti hain; session ke end mein drop hoti hain.
- OneDrive mein project na rakhein.
- Har phase ke commit se pehle README ka Progress table update karein.
- Account balance AccountUpdate mein intentionally nahi hai.
- Transaction amount hamesha positive. Sign kind se aata hai.
- Account balance transaction ke saath same DB transaction mein
  update hota hai.
- Category delete karne par transactions zinda rehte hain
  (category_id NULL ho jata hai).
- Account delete karne par uske transactions bhi delete ho jate hain.
- Har naye user ko 12 default categories milti hain (3 income, 9
  expense).
- Budget usage store nahi hoti - har baar transactions se live
  compute hoti hai.
- Budget sirf expense categories par lagta hai.
- Recurring rules generate hone par next_run_at aage badhta hai;
  end_date inclusive hai.
- Recurring safety cap: ek generate call 1000 occurrences se
  zyada nahi banata.
- Dashboard queries read-only hain; koi model ya migration nahi.
- Dashboard aggregation mein har sum quantize hoti hai 2 decimal
  places par.
- Dashboard mein null category ko "Uncategorized" naam se show karte
  hain.

---

## 15. Roadmap (aage kya)

| Phase | Scope                                    | Est. days |
|-------|------------------------------------------|-----------|
| 12-15 | React app + all screens (MVP checkpoint) | 5         |
| 16-17 | Analytics, PDF/CSV, uploads, notifs      | 2         |
| 18-20 | RAG, AI chat, agent tools                | 4         |
| 21    | Testing aur security sweep               | 1         |
| 22    | Dockerization aur deployment             | 2         |
| 23    | Final QA aur docs                        | 1         |

MVP checkpoint: Phase 15 ke end mein. Wahan tak finance app
AI ke bina poora kaam karta hoga, aur Git mein tag hoga.

Backend MVP poora ho gaya hai Phase 11 ke saath (90 tests).

---

## 16. Contact / Repo

- GitHub: https://github.com/AdnanTaj01/expense-tracker
- Visibility: Private
- Local path: D:\dev\expense-tracker