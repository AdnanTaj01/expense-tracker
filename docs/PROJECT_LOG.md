# Expense Tracker — Master Project Log

Last updated: Phase 8 complete (2026-09-22)

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

---

## 2. Tech Stack

| Layer       | Technology                                       |
|-------------|--------------------------------------------------|
| Frontend    | React + TypeScript + Tailwind (Vite) - Phase 12+ |
| Backend     | Python 3.13 + FastAPI + Uvicorn                  |
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
   update hoga. Test balance recompute kar ke compare karega.
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
    |   |   |   |-- __init__.py     exports User, Account, Category
    |   |   |   |-- user.py
    |   |   |   |-- account.py
    |   |   |   |-- category.py
    |   |   |-- schemas/
    |   |   |   |-- __init__.py
    |   |   |   |-- user.py         UserBase, UserCreate, UserRead
    |   |   |   |-- auth.py         Token, ChangePassword
    |   |   |   |-- account.py      AccountBase/Create/Update/Read
    |   |   |   |-- category.py     CategoryBase/Create/Update/Read
    |   |   |-- services/
    |   |   |   |-- __init__.py
    |   |   |   |-- user_service.py
    |   |   |   |-- account_service.py
    |   |   |   |-- category_service.py (includes seed defaults)
    |   |   |-- api/
    |   |   |   |-- __init__.py
    |   |   |   |-- deps.py         get_current_user
    |   |   |   |-- v1/
    |   |   |       |-- __init__.py api_router
    |   |   |       |-- auth.py
    |   |   |       |-- accounts.py
    |   |   |       |-- categories.py
    |   |   |-- ai/                 (Phase 18+)
    |   |-- tests/
    |   |   |-- __init__.py
    |   |   |-- conftest.py         fixtures: client, db_session
    |   |   |-- test_auth.py        8 tests
    |   |   |-- test_accounts.py    8 tests
    |   |   |-- test_categories.py  9 tests
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
  volume /var/lib/postgresql par mount karna padta hai (na ke
  /var/lib/postgresql/data)
- Container expense_db, port 5433:5432
- pgvector 0.8.6 enabled aur tested
- Persistence test: container restart ke baad data mehfooz
- Commit: 9227780

### Phase 4 - FastAPI Foundation (Done)
- backend/.venv (Python 3.13)
- FastAPI 0.115.6, uvicorn, pydantic-settings
- app/core/config.py (Pydantic Settings from .env)
- app/main.py with /health + CORS
- Server: uvicorn app.main:app --reload --port 8000
- Commit: cd9da2b

### Phase 5 - SQLAlchemy + Alembic (Done)
- SQLAlchemy 2.0.44, Alembic 1.14.0, psycopg 3.2.4
- app/db/base.py (DeclarativeBase)
- app/db/session.py (engine, SessionLocal, get_db)
- Alembic init
- Masla: configparser % ko interpolation samajhta tha (encoded
  password mein %40) -> fix: env.py mein config.set_main_option
  hata kar seedha create_engine(settings.DATABASE_URL, ...)
- First migration: alembic_version table
- Commit: f23b7bb

### Phase 6 - User Model (Done)
- app/models/user.py (users table)
- app/schemas/user.py (UserBase, UserCreate, UserRead)
- Migration: 7673bc3416bf_create_users_table.py
- Email uniqueness constraint verified
- Commit: fdf0b8a

### Phase 7 - Auth + Security (Done)
- PyJWT 2.10.1, pwdlib 0.2.1 (Argon2), python-multipart 0.0.20
- pytest 8.3.4, httpx 0.28.1
- app/core/security.py - hash_password, verify_password,
  create_access_token, decode_access_token
- app/api/deps.py - get_current_user (Bearer token)
- app/schemas/auth.py - Token, ChangePassword
- app/services/user_service.py
- app/api/v1/auth.py - register/login/me/change-password
- pytest.ini, tests/conftest.py, tests/test_auth.py
- 8 tests passing
- Masla: import app.models ne app naam overwrite kar diya
  -> fix: from app.main import app as fastapi_app in conftest
- Commit: f254fb2

### Phase 8 - Accounts aur Categories (Done)
- app/models/account.py (accounts table: id, user_id FK CASCADE,
  name, type, balance Numeric(12,2), currency, is_active,
  timestamps)
- app/models/category.py (categories table: id, user_id FK CASCADE,
  name, kind, is_default, timestamps, uq_category_user_name_kind)
- app/models/user.py updated: accounts + categories relationships
  with cascade="all, delete-orphan"
- Migration: 3c9938a801aa_create_accounts_and_categories_tables.py
- Schemas:
  - app/schemas/account.py (AccountType Literal,
    AccountCreate, AccountUpdate, AccountRead)
  - app/schemas/category.py (CategoryKind Literal,
    CategoryCreate, CategoryUpdate, CategoryRead)
  - NOTE: AccountUpdate intentionally excludes balance
- Services:
  - app/services/account_service.py (list/get/create/update/delete,
    all ownership-scoped via user_id)
  - app/services/category_service.py (same + DEFAULT_CATEGORIES list
    of 12 + seed_default_categories)
  - app/services/user_service.py: create_user now calls
    seed_default_categories after user creation
- Endpoints:
  - app/api/v1/accounts.py (5 routes)
  - app/api/v1/categories.py (5 routes, ?kind= filter)
  - app/api/v1/__init__.py includes all three routers
- Tests:
  - tests/test_accounts.py (8 tests)
  - tests/test_categories.py (9 tests)
  - Ownership test: user B gets 404 on user A's account/category
  - 25 tests total passing (8 auth + 8 accounts + 9 categories)
- Docker was offline at one point; restart fixed it.
- Commit: (pending)

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

### Accounts (all ownership-scoped)

| Method | Path                          | Purpose                | Auth |
|--------|-------------------------------|------------------------|------|
| GET    | /api/v1/accounts              | List (?only_active=true) | Yes |
| POST   | /api/v1/accounts              | Create                 | Yes  |
| GET    | /api/v1/accounts/{id}         | Get one                | Yes  |
| PATCH  | /api/v1/accounts/{id}         | Update (no balance)    | Yes  |
| DELETE | /api/v1/accounts/{id}         | Delete                 | Yes  |

### Categories (all ownership-scoped)

| Method | Path                          | Purpose                | Auth |
|--------|-------------------------------|------------------------|------|
| GET    | /api/v1/categories            | List (?kind=income/expense) | Yes |
| POST   | /api/v1/categories            | Create                 | Yes  |
| GET    | /api/v1/categories/{id}       | Get one                | Yes  |
| PATCH  | /api/v1/categories/{id}       | Update                 | Yes  |
| DELETE | /api/v1/categories/{id}       | Delete                 | Yes  |

Auth = Authorization: Bearer <jwt> header.

---

## 11. Common Commands Reference

### Daily workflow

    # Docker start
    docker compose up -d

    # Backend mein kaam
    cd backend
    .venv\Scripts\Activate.ps1
    uvicorn app.main:app --reload --port 8000    # Terminal 1

    # Test / API calls (Terminal 2)
    curl http://localhost:8000/health

### Migrations

    # Nayi migration generate karein
    alembic revision --autogenerate -m "describe change"

    # Latest tak apply
    alembic upgrade head

    # Ek step wapas
    alembic downgrade -1

    # Current version
    alembic current

    # History
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
    pytest                    # all tests
    pytest tests/test_auth.py # one file
    pytest -k register        # name filter
    pytest -v                 # verbose

### Git workflow

    # Root folder se commit
    cd D:\dev\expense-tracker
    git status
    git add .
    git commit -m "message"
    git push

    # History
    git log --oneline -5

---

## 12. Troubleshooting Log

### PostgreSQL 18 volume path error
Symptom: Container start hota hi nahi, log kehta hai data
/var/lib/postgresql/data mein hai (unused mount).
Fix: docker-compose.yml mein volume mount
postgres_data:/var/lib/postgresql (bina /data ke).

### configparser interpolation error
Symptom: ValueError: invalid interpolation syntax ... at position 47
Fix: alembic/env.py mein config.set_main_option("sqlalchemy.url", ...)
hata dein, aur seedha create_engine(settings.DATABASE_URL, ...) use karein.

### AttributeError: module 'app' has no attribute 'dependency_overrides'
Symptom: pytest mein saare tests ERROR par.
Fix: tests/conftest.py mein:

    import app.models
    from app.main import app as fastapi_app

Aur fastapi_app.dependency_overrides[...] use karein.

### PowerShell execution policy
Symptom: .venv\Scripts\Activate.ps1 cannot be loaded.
Fix:

    Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned

### Port 5432 already in use
Fix: .env mein POSTGRES_HOST_PORT=5433 aur
DATABASE_URL mein localhost:5433.

### psql mein paste nahi hota
Fix: Right-click se paste, ya Ctrl+Shift+V. Ya command ko
PowerShell se docker compose exec db psql ... -c "SQL" ki tarah chalayein.

### VS Code "Import could not be resolved"
Fix: Ctrl+Shift+P -> Python: Select Interpreter ->
backend\.venv\Scripts\python.exe chunein.

### Git push rejected - remote contains work
Fix:

    git pull origin main --no-rebase
    # conflict resolve karein
    git add .
    git commit
    git push

### Secret accidentally committed
Action: Foran rotate karein. Git history se delete karna kaafi nahi.
Agar repo private hai to rotate karna optional, but recommended.

### Docker Desktop is not running
Symptom: docker compose ps fails with
"failed to connect to the docker API at npipe://..."
Fix: Docker Desktop kholain, green whale icon ka intezar karein,
phir docker compose up -d chalayein.

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

- Root .env mein plain password, backend .env mein
  URL-encoded password. Farq samajhna zaroori hai.
- Do containers ek saath chal sakte hain host par (purana postgres-db
  port 5432 par, naya expense_db port 5433 par). Koi conflict nahi.
- alembic revision --autogenerate ko models ka pata hona chahiye.
  alembic/env.py mein import app.models line zaroori hai.
- pytest ke liye alag database hai (expense_tracker_test) taake
  development data safe rahe.
- OneDrive mein project na rakhein - node_modules aur .venv
  sync mein problems create karte hain.
- Har phase ke commit se pehle README ka "Progress" table update karein.
- Account balance AccountUpdate mein intentionally nahi hai - balance
  sirf transactions se badalta hai (Phase 9).
- Har naye user ko 12 default categories milti hain (3 income, 9
  expense) - seed_default_categories function se.

---

## 15. Roadmap (aage kya)

| Phase | Scope                                    | Est. days |
|-------|------------------------------------------|-----------|
| 9     | Transactions + safe balance updates      | 3         |
| 10    | Budgets (MVP) + recurring (Phase 2)      | 2         |
| 11    | Dashboard backend (summary, breakdown)   | 1         |
| 12-15 | React app + all screens (MVP checkpoint) | 5         |
| 16-17 | Analytics, PDF/CSV, uploads, notifs      | 2         |
| 18-20 | RAG, AI chat, agent tools                | 4         |
| 21    | Testing aur security sweep               | 1         |
| 22    | Dockerization aur deployment             | 2         |
| 23    | Final QA aur docs                        | 1         |

MVP checkpoint: Phase 15 ke end mein. Wahan tak finance app
AI ke bina poora kaam karta hoga, aur Git mein tag hoga.

---

## 16. Contact / Repo

- GitHub: https://github.com/AdnanTaj01/expense-tracker
- Visibility: Private
- Local path: D:\dev\expense-tracker