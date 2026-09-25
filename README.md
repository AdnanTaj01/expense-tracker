# Expense Tracker

A multi-user personal finance system with an optional AI assistant.

**MVP complete.** The whole finance app works without any AI.

The app works when the AI is down. The LLM explains results; it is never
the source of truth.

## Stack

- **Frontend:** React 19 + TypeScript + Tailwind CSS + Vite ✅
- **Backend:** Python 3.13 + FastAPI ✅
- **Database:** PostgreSQL 18 + pgvector (Docker)
- **ORM / migrations:** SQLAlchemy 2.x (sync) + Alembic + psycopg 3
- **Auth:** JWT (PyJWT) + Argon2 (pwdlib)
- **AI:** LLM provider TBD + RAG via pgvector — Phase 18+
- **Testing:** pytest (90 backend tests) + Vitest (57 frontend tests)

## Architecture rule

    React  ->  FastAPI  ->  services  ->  SQLAlchemy  ->  PostgreSQL

- **Routers** validate input and call services.
- **Services** hold business logic and talk to the database through models.
- **AI tools** call services only, never SQL.

## Project structure

    expense-tracker/
    |-- docs/          decisions, project log
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
    |-- frontend/      React app (MVP complete)
    |   |-- src/
    |   |   |-- api/       HTTP client + API modules
    |   |   |-- components/Layout, ProtectedRoute
    |   |   |-- context/   AuthContext
    |   |   |-- pages/     All screens
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

## Features

### Authentication

- Register with email + password (Argon2 hashing)
- Login with JWT access token
- Change password
- 401 auto-logout with session-expired message

### Finance

- **Accounts** — bank accounts, cash, credit cards, wallets
- **Categories** — income and expense, 12 default categories
  seeded on registration
- **Transactions** — income/expense with filters, pagination,
  safe atomic balance updates
- **Budgets** — monthly limit per category, live usage tracking
- **Dashboard** — total balance, monthly income/expense/net,
  top categories, recent transactions, 6-month trend

## API endpoints

All protected endpoints require: `Authorization: Bearer <jwt>`.

### Auth
| Method | Path                          |
|--------|-------------------------------|
| POST   | /api/v1/auth/register         |
| POST   | /api/v1/auth/login            |
| GET    | /api/v1/auth/me               |
| POST   | /api/v1/auth/change-password  |

### Accounts / Categories / Transactions

- `GET/POST /api/v1/{accounts,categories,transactions}`
- `GET/PATCH/DELETE /api/v1/{accounts,categories,transactions}/{id}`

Transaction list supports: `account_id`, `category_id`, `kind`,
`from_date`, `to_date`, `limit`, `offset`.

### Budgets / Recurring

- `GET/POST /api/v1/budgets` + `GET/PATCH/DELETE /api/v1/budgets/{id}`
- `GET/POST /api/v1/recurring` + `GET/PATCH/DELETE /api/v1/recurring/{id}`
- `POST /api/v1/recurring/{id}/generate`

### Dashboard

- `GET /api/v1/dashboard/overview` (all sections in one call)
- Also: `/summary`, `/by-category`, `/trend`, `/recent`

### Meta

- `GET /health`

## Progress

| Phase | Scope                             | Status |
|-------|-----------------------------------|--------|
| 0-11  | Backend MVP                       | Done ✅|
| 12-13 | React + auth UI                   | Done ✅|
| 14-15 | All frontend pages (MVP)          | Done ✅|
| 16-17 | Analytics, uploads, notifications | Next   |
| 18-20 | AI: RAG, chat, agent tools        |        |
| 21    | Testing and security sweep        |        |
| 22    | Dockerization and deployment      |        |
| 23    | Final QA and docs                 |        |

**MVP checkpoint complete.** 147 tests passing
(90 backend + 57 frontend). Tagged `v0.1.0-mvp`.

See `docs/PROJECT_LOG.md` for the full phase-by-phase record.

## Notes

- Money is stored as `NUMERIC(12,2)` and handled as `Decimal`.
- One currency per user in the MVP (defaults to `PKR`).
- JWT is short-lived; server-side revocation is on the hardening list.
- Docker container is `expense_db` on host port **5433**.
- Every new user automatically gets 12 default categories.
- Transaction `amount` is always positive; sign comes from `kind`.
- Account balance is updated in the same DB transaction as the row.
- Budget usage is computed live from transactions.
- Recurring rules are generated on demand; `end_date` inclusive.