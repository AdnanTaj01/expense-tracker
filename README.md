# Expense Tracker

A multi-user personal finance system with an AI assistant that can answer
questions about your uploaded documents (RAG).

**MVP complete + post-MVP features + AI document assistant.** The whole
finance app works without any AI.

The app works when the AI is down. The LLM explains results; it is never
the source of truth.

## Stack

- **Frontend:** React 19 + TypeScript + Tailwind CSS + Vite ✅
- **Backend:** Python 3.13 + FastAPI ✅
- **Database:** PostgreSQL 18 + pgvector (Docker)
- **ORM / migrations:** SQLAlchemy 2.x (sync) + Alembic + psycopg 3
- **Auth:** JWT (PyJWT) + Argon2 (pwdlib)
- **Charts:** Recharts (Phase 16)
- **AI:** Groq (LLM) + sentence-transformers (local embeddings) +
  pgvector (semantic search / RAG) — Phase 18
- **Testing:** pytest (135 backend tests) + Vitest (62 frontend tests)

## Architecture rule

    React  ->  FastAPI  ->  services  ->  SQLAlchemy  ->  PostgreSQL

- **Routers** validate input and call services.
- **Services** hold business logic and talk to the database through models.
- **AI tools** call services only, never SQL.

## Project structure

    expense-tracker/
    |-- docs/          decisions, project log
    |-- backend/       FastAPI app
    |   |-- app/
    |   |   |-- ai/        AI / RAG layer (Phase 18)
    |   |   |   |-- llm/       Groq client wrapper (client.py)
    |   |   |   |-- rag/       chunking.py, embeddings.py, search.py
    |   |   |-- api/       routers, deps
    |   |   |   |-- v1/        accounts, ..., documents.py, chat.py
    |   |   |-- core/      config, security
    |   |   |-- db/        base, session
    |   |   |-- models/    SQLAlchemy tables (incl. document,
    |   |   |              document_chunk)
    |   |   |-- schemas/   Pydantic request/response (incl. document,
    |   |   |              chat)
    |   |   |-- services/  business logic (incl. document_service,
    |   |   |              chat_service)
    |   |-- alembic/       migrations
    |   |-- scripts/       seed_demo_data.py (seeds a demo user via
    |   |                  the running API for manual testing)
    |   |-- tests/         pytest suite (135 tests)
    |   |-- uploads/       receipts + documents stored here (gitignored)
    |   |-- requirements.txt
    |-- frontend/      React app
    |   |-- src/
    |   |   |-- api/       HTTP client + API modules (incl. documents.ts,
    |   |   |              chat.ts)
    |   |   |-- components/Layout, ProtectedRoute, PasswordInput,
    |   |   |              ExportButton
    |   |   |-- context/   AuthContext, ThemeContext
    |   |   |-- pages/     All screens (incl. DocumentsPage, ChatPage)
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
- A free [Groq API key](https://console.groq.com/keys) (for the AI
  assistant — the rest of the app works without it)

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
    FRONTEND_URL=http://localhost:5173
    DEBUG_RESET_LINKS=true

    # Document uploads (for AI / RAG)
    UPLOAD_DIR=uploads
    DOCUMENT_MAX_SIZE_MB=20

    # LLM (Groq)
    GROQ_API_KEY=<your Groq API key>
    GROQ_MODEL=openai/gpt-oss-120b

    # Embeddings (local, sentence-transformers)
    EMBEDDING_MODEL=BAAI/bge-small-en-v1.5
    EMBEDDING_DIM=384

    # RAG tuning
    RAG_CHUNK_SIZE=800
    RAG_CHUNK_OVERLAP=100
    RAG_TOP_K=5

**Important:** in `DATABASE_URL`, encode these characters:
`@` -> `%40`, `:` -> `%3A`, `/` -> `%2F`, `#` -> `%23`, `%` -> `%25`.

`DEBUG_RESET_LINKS=true` prints password reset links to the backend
console (dev only). Set to `false` in production and add SMTP.

If `GROQ_API_KEY` is left blank or invalid, every other feature keeps
working — only `/api/v1/chat` returns a `503` explaining the AI
assistant is unavailable.

Frontend `.env` (in `frontend/`) — optional:

    VITE_API_BASE_URL=http://localhost:8000

The `.env` files are git-ignored. Use `.env.example` as a template.

### 3. Start PostgreSQL

The Postgres image is `pgvector/pgvector`, which ships the `vector`
extension needed for semantic search.

    docker compose up -d
    docker compose ps    # wait for "healthy"

### 4. Backend

    cd backend
    py -3.13 -m venv .venv
    .venv\Scripts\Activate.ps1
    pip install -r requirements.txt
    alembic upgrade head
    uvicorn app.main:app --reload --port 8000

The first document you upload triggers a one-time download of the
local embedding model (a few hundred MB, cached afterwards).

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

Create the test database once (also needs the `vector` extension,
which `tests/conftest.py` enables automatically on first run):

    docker compose exec db psql -U expense_user -d expense_tracker -c "CREATE DATABASE expense_tracker_test OWNER expense_user;"

## Features

### Authentication

- Register with email + password (Argon2 hashing)
- Login with JWT access token
- Forgot password — reset link, 15-minute expiry, single-use
- 401 auto-logout with session-expired message
- Show/hide password toggle on all password fields

### Finance

- **Accounts** — bank accounts, cash, credit cards, wallets
- **Categories** — income and expense, 12 default categories
  seeded on registration
- **Transactions** — income/expense with filters, pagination,
  safe atomic balance updates
- **Budgets** — monthly limit per category, live usage tracking
- **Dashboard** — total balance, monthly income/expense/net,
  top categories, recent transactions, 6-month trend

### Analytics & Reports

- **Analytics** — month-over-month comparison, category trends,
  weekday heatmap, top accounts (Recharts)
- **CSV exports** — transactions, accounts, budgets (one click)
- **Receipts** — upload images/PDF (5 MB max), attach to a transaction,
  download, delete

### AI Assistant (Phase 18)

- **Documents** — upload PDF, TXT, Markdown, CSV, JSON, XML, or HTML
  files (20 MB max); text is extracted automatically on upload
- **Chunking + embeddings** — extracted text is split into overlapping
  chunks and embedded locally (sentence-transformers), stored in
  Postgres via pgvector
- **AI chat (RAG)** — ask questions in plain English about your
  uploaded documents; the assistant retrieves the most relevant
  chunks by semantic similarity and answers using only that context,
  citing which document(s) it used
- Every document and chat response is scoped to the logged-in user

### UX

- **Dark mode** toggle (persists in localStorage, respects
  system preference on first visit)
- **Responsive** — mobile hamburger menu, scrollable tables,
  adaptive modals

## API endpoints

All protected endpoints require: `Authorization: Bearer <jwt>`.

### Auth
| Method | Path                          |
|--------|-------------------------------|
| POST   | /api/v1/auth/register         |
| POST   | /api/v1/auth/login            |
| GET    | /api/v1/auth/me               |
| POST   | /api/v1/auth/change-password  |
| POST   | /api/v1/auth/forgot-password  |
| POST   | /api/v1/auth/reset-password   |

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

### Analytics

- `GET /api/v1/analytics/month-comparison`
- `GET /api/v1/analytics/category-trend?category_id=X&months=6`
- `GET /api/v1/analytics/top-accounts?months=3`
- `GET /api/v1/analytics/weekday-heatmap?months=3`

### Exports (CSV downloads)

- `GET /api/v1/exports/transactions.csv`
- `GET /api/v1/exports/accounts.csv`
- `GET /api/v1/exports/budgets.csv?year=YYYY&month=M`

### Receipts

- `GET /api/v1/receipts`
- `POST /api/v1/receipts` (multipart: file, transaction_id)
- `GET /api/v1/receipts/{id}`
- `GET /api/v1/receipts/{id}/download`
- `DELETE /api/v1/receipts/{id}`

### Documents (AI)

- `GET /api/v1/documents`
- `POST /api/v1/documents` (multipart: file)
- `GET /api/v1/documents/{id}`
- `GET /api/v1/documents/{id}/download`
- `DELETE /api/v1/documents/{id}`

### Chat (AI, RAG)

- `POST /api/v1/chat` — body: `{ "message": "...", "document_id": null }`
  (`document_id` optional, narrows the search to one document).
  Returns `{ "answer": "...", "sources": [...] }`. Returns `503` if
  the LLM is unavailable (e.g. no `GROQ_API_KEY`).

### Meta

- `GET /health`

## CLI helpers (backend)

Reset a user's password from the command line (fallback):

    cd backend
    .venv\Scripts\Activate.ps1
    python -m app.scripts.reset_password user@example.com NewPass123!

List all registered users:

    python -m app.scripts.list_users

Seed a demo user with realistic data (accounts, categories,
~4 months of transactions, budgets) for manual UI testing — run this
against a running backend server:

    uvicorn app.main:app --reload --port 8000   # in one terminal
    python scripts\seed_demo_data.py            # in another terminal

Prints the demo login (`demo@example.com` / `DemoPass123!`) when done.
Safe to re-run — it reuses the existing demo user instead of duplicating it.

## Progress

| Phase    | Scope                                    | Status |
|----------|------------------------------------------|--------|
| 0-11     | Backend MVP                              | Done ✅|
| 12-13    | React + auth UI                          | Done ✅|
| 14-15    | All frontend pages (MVP)                 | Done ✅|
| Post-MVP | Forgot password, dark mode, responsive   | Done ✅|
| 16-17    | Analytics, exports, receipts             | Done ✅|
| 18       | AI: documents, RAG, chat                 | Done ✅|
| 19-20    | Agent tools, AI over finance data         | Next   |
| 21       | Testing and security sweep               |        |
| 22       | Dockerization and deployment             |        |
| 23       | Final QA and docs                        |        |

**197 tests passing** (135 backend + 62 frontend).

Tags:
- `v0.1.0-mvp`
- `v0.1.1-forgot-password`
- `v0.2.0-analytics-receipts`

See `docs/PROJECT_LOG.md` for the full phase-by-phase record,
decisions, troubleshooting, and command reference.

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
- Forgot password in dev prints the reset link to backend console
  (`DEBUG_RESET_LINKS=true`). In production this becomes an email send.
- Password reset tokens: SHA-256 hashed, 15-min expiry, single-use,
  one active per user.
- Receipt files live in `backend/uploads/receipts/` (gitignored);
  document files live in `backend/uploads/documents/` (gitignored).
  In production both become object storage (Phase 22).
- Document text is stored as plain text alongside the file; it is
  chunked and embedded (pgvector) immediately after extraction so
  chat can search it right away.
- The AI assistant only answers from retrieved document chunks — it
  is told to say "I don't have enough information" rather than
  invent facts, and every answer lists which document(s) it used.