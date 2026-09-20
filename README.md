# Expense Tracker

A multi-user personal finance system with an AI assistant.

## Stack

- **Frontend:** React + TypeScript + Tailwind CSS (Vite)
- **Backend:** Python 3.13 + FastAPI
- **Database:** PostgreSQL 18 + pgvector (Docker)
- **ORM:** SQLAlchemy 2.x (sync) + Alembic
- **Auth:** JWT (PyJWT) + Argon2 (pwdlib)
- **AI:** LLM provider TBD + RAG via pgvector

## Architecture rule

React → FastAPI → services → SQLAlchemy → PostgreSQL

The AI layer sits **beside** this flow and can only reach data through
approved tools that call the same services. The app must work when the
AI is down.

## Project structure
