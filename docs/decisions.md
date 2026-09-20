# Project Decisions

Confirmed on: 2026-09-20

1. Backend first (Days 4–16), then frontend (17–21). Per-feature order:
   model → migration → schema → service → endpoint → test → commit.
2. Money: NUMERIC(12,2) + Python Decimal. One currency per user.
   No multi-currency in MVP.
3. Account balance updated in the same DB transaction as the transaction
   row. Test recomputes balance from transactions.
4. JWT: short-lived access token in MVP. Logout = client discards.
   Refresh tokens (httpOnly cookie, server-side revocation) in hardening.
5. Auth libraries: pwdlib (Argon2) + PyJWT. Not passlib, not python-jose.
6. DB access: sync SQLAlchemy 2.x + psycopg 3.
7. Recurring transactions: manual trigger in dev. Phase 2 scope.
8. LLM provider + embedding model: decided before Phase 18.
9. Receipts: local uploads/ folder (Docker volume).
10. Frontend: Vite + React Router + TypeScript + Tailwind.
    Optional: TanStack Query, React Hook Form.
11. Project location: D:\dev\expense-tracker
12. Python: 3.13.15
13. Node: 24 LTS
14. PostgreSQL: 18 (Docker only — no Windows install)
15. Layering: router → service → DB. AI tools call services, never SQL.
16. AI is optional: the app keeps working when the AI is down.