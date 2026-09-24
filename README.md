# Expense Tracker

A multi-user personal finance system with an optional AI assistant.

The app works when the AI is down. The LLM explains results; it is never
the source of truth.

## Stack

- **Frontend:** React 19 + TypeScript + Tailwind CSS + Vite ✅ (foundation)
- **Backend:** Python 3.13 + FastAPI ✅ (complete)
- **Database:** PostgreSQL 18 + pgvector (Docker)
- **ORM / migrations:** SQLAlchemy 2.x (sync) + Alembic + psycopg 3
- **Auth:** JWT (PyJWT) + Argon2 (pwdlib)
- **AI:** LLM provider TBD + RAG via pgvector — Phase 18+
- **Testing:** pytest (backend, 90 tests) + Vitest (frontend, 27 tests)

## Architecture rule

    React  ->  FastAPI  ->  services  ->  SQLAlchemy  ->  PostgreSQL

- **Routers** validate input and call services.
- **Services** hold business logic and talk to the database through models.
- **AI tools** call services only, never SQL.

## Project structure

    expense-tracker/
    |-- docs/          decisions, project log, guides
    |-- backend/       FastAPI app (complete)
    |   |-- app/
    |   |   |-- api/       routers, deps
    |   |   |-- core/      config, security
    |   |   |-- db/        base, session
    |   |   |-- models/    SQLAlchemy tables
    |   |   |-- schemas/   Pydantic request/response
    |   |   |-- services/  business logic
    |   |   |-- ai/        (Phase 18+)
    |   |-- alembic/       migrations
    |   |-- tests/         pytest suite (90 tests)
    |   |-- requirements.txt
    |-- frontend/      React app
    |   |-- src/
    |   |   |-- api/       HTTP client + API modules
    |   |   |-- components/Layout, ProtectedRoute
    |   |   |-- context/   AuthContext
    |   |   |-- pages/     Route pages
    |   |   |-- test/      Vitest setup + helpers
    |   |   |-- types/     TypeScript types
    |   |-- package.json
    |   |-- vite.config.ts (includes Vitest config)
    |-- deploy/        production compose, backups (Phase 22+)

## Prerequisites

- Python 3.13.x
- Node.js 24 LTS
- Docker Desktop
- Git

## Local setup

### 1. Clone and enter the project

    git clone https://github.com/AdnanTaj01/expense-tracker.git
    cd expense-tracker

### 2. Configure environment

Root `.env` (for Docker Compose):

    POSTGRES_USER=expense_user
    POSTGRES_PASSWORD=<your strong password>
    POSTGRES_DB=expense_tracker
    POSTGRES_HOST_PORT=5433

Backend `.env` (in `backend/`):

    DATABASE_URL=postgresql+psycopg://expense_user:<url-encoded-password>@localhost:5433/expense_tracker
    JWT_SECRET_KEY=<run: python -c "import secrets; print(secrets.token_urlsafe(64))">
    ACCESS_TOKEN_EXPIRE_MINUTES=30
    CORS_ORIGINS=http://localhost:5173

**Important:** in `DATABASE_URL`, encode these characters:
`@` -> `%40`, `:` -> `%3A`, `/` -> `%2F`, `#` -> `%23`, `%` -> `%25`.

Frontend `.env` (in `frontend/`) — optional:

    VITE_API_BASE_URL=http://localhost:8000

The `.env` files are git-ignored. Use `.env.example` as a template.

### 3. Start PostgreSQL

    docker compose up -d
    docker compose ps    # wait for "healthy"

### 4. Backend

    cd backend
    py -3.13 -m venv .venv
    .venv\Scripts\Activate.ps1
    pip install -r requirements.txt
    alembic upgrade head
    uvicorn app.main:app --reload --port 8000

API docs: http://localhost:8000/docs

### 5. Frontend

    cd frontend
    npm install
    npm run dev

App: http://localhost:5173

### 6. Run tests

Backend:

    cd backend
    pytest

Frontend:

    cd frontend
    npm test
    npm run test:coverage

Create the test database once:

    docker compose exec db psql -U expense_user -d expense_tracker -c "CREATE DATABASE expense_tracker_test OWNER expense_user;"

## API endpoints

All protected endpoints require: `Authorization: Bearer <jwt>`.

### Auth

| Method | Path                          | Purpose                |
|--------|-------------------------------|------------------------|
| POST   | /api/v1/auth/register         | Create a new user      |
| POST   | /api/v1/auth/login            | Get a JWT access token |
| GET    | /api/v1/auth/me               | Current user profile   |
| POST   | /api/v1/auth/change-password  | Change password        |

### Accounts, Categories, Transactions

| Resource | Endpoints |
|----------|-----------|
| Accounts | `GET/POST /api/v1/accounts`, `GET/PATCH/DELETE /api/v1/accounts/{id}` |
| Categories | `GET/POST /api/v1/categories`, `GET/PATCH/DELETE /api/v1/categories/{id}` |
| Transactions | `GET/POST /api/v1/transactions`, `GET/PATCH/DELETE /api/v1/transactions/{id}` |

Transaction list supports: `account_id`, `category_id`, `kind`, `from_date`, `to_date`, `limit`, `offset`.

### Budgets and Recurring

| Resource | Endpoints |
|----------|-----------|
| Budgets | `GET/POST /api/v1/budgets`, `GET/PATCH/DELETE /api/v1/budgets/{id}` |
| Recurring | `GET/POST /api/v1/recurring`, `GET/PATCH/DELETE /api/v1/recurring/{id}`, `POST /api/v1/recurring/{id}/generate` |

### Dashboard

| Method | Path                                  | Purpose                                       |
|--------|---------------------------------------|-----------------------------------------------|
| GET    | /api/v1/dashboard/summary             | Total balance + month income/expense/net      |
| GET    | /api/v1/dashboard/by-category         | Expense breakdown by category                 |
| GET    | /api/v1/dashboard/trend               | Last N months income vs expense               |
| GET    | /api/v1/dashboard/recent              | Recent transactions                           |
| GET    | /api/v1/dashboard/overview            | All of the above in one call                  |

### Meta

| Method | Path        | Purpose         |
|--------|-------------|-----------------|
| GET    | /health     | Liveness check  |

## Progress

| Phase | Scope                             | Status |
|-------|-----------------------------------|--------|
| 0     | Overview and decisions            | Done   |
| 1     | Installs and verification         | Done   |
| 2     | Repo, folders, .gitignore         | Done   |
| 3     | PostgreSQL + pgvector in Docker   | Done   |
| 4     | FastAPI foundation + /health      | Done   |
| 5     | SQLAlchemy + Alembic setup        | Done   |
| 6     | User model + users table          | Done   |
| 7     | Auth (JWT + Argon2) + pytest      | Done   |
| 8     | Accounts and categories           | Done   |
| 9     | Transactions + safe balance       | Done   |
| 10    | Budgets and recurring             | Done   |
| 11    | Dashboard API                     | Done   |
| 12    | React foundation + auth UI        | Done ✅|
| 13    | Auth polish + change password     | Done ✅|
| 14-15 | Dashboard, transactions, all UI   | Next   |
| 16-17 | Analytics, uploads, notifications |        |
| 18-20 | AI: RAG, chat, agent tools        |        |
| 21    | Testing and security sweep        |        |
| 22    | Dockerization and deployment      |        |
| 23    | Final QA and docs                 |        |

- **Testing:** pytest (backend, 90 tests) + Vitest (frontend, 29 tests)

See `docs/PROJECT_LOG.md` for the full phase-by-phase record.

## Notes

- Money is stored as `NUMERIC(12,2)` and handled as `Decimal` — never `float`.
- One currency per user in the MVP (defaults to `PKR`).
- JWT is short-lived; logout means the client discards the token.
  Server-side revocation (refresh tokens) is on the hardening list.
- Docker container is `expense_db` on host port **5433** (not 5432).
- Every new user automatically gets 12 default categories.
- Transaction `amount` is always positive; sign comes from `kind`.
- Account balance is updated in the same DB transaction as the transaction row.
- Budget usage is computed live from transactions (not stored).
- Recurring rules are generated on demand; `end_date` is inclusive.
- Tests use a separate DB (`expense_tracker_test`) for backend;
  frontend tests run in `jsdom` (no real HTTP).
- Frontend test reports: `frontend/coverage/` (HTML + LCOV) and
  `frontend/test-results/junit.xml` (CI-ready).