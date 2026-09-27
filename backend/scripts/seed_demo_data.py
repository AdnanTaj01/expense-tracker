"""Seed the running API with realistic demo data for manual testing.

Creates (or reuses) a demo user, then populates accounts, categories,
transactions across the last 4 months, and budgets — so every page
in the app has data to show without manual entry.

Usage (with the backend server already running on port 8000):
    python scripts/seed_demo_data.py
"""
from __future__ import annotations

import random
from datetime import date, timedelta
from decimal import Decimal

import httpx

BASE_URL = "http://127.0.0.1:8000"
DEMO_EMAIL = "demo@example.com"
DEMO_PASSWORD = "DemoPass123!"

random.seed(42)


def register_or_login(client: httpx.Client) -> str:
    resp = client.post(
        f"{BASE_URL}/api/v1/auth/register",
        json={
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD,
            "full_name": "Demo User",
            "currency": "PKR",
        },
    )
    if resp.status_code == 201:
        print(f"Created demo user: {DEMO_EMAIL}")
    elif resp.status_code == 409:
        print(f"Demo user already exists, reusing: {DEMO_EMAIL}")
    else:
        resp.raise_for_status()

    login = client.post(
        f"{BASE_URL}/api/v1/auth/login",
        data={"username": DEMO_EMAIL, "password": DEMO_PASSWORD},
    )
    login.raise_for_status()
    return login.json()["access_token"]


def seed_accounts(client: httpx.Client, headers: dict) -> list[dict]:
    accounts_to_create = [
        {"name": "Meezan Checking", "type": "checking", "currency": "PKR", "balance": "50000.00"},
        {"name": "Savings", "type": "savings", "currency": "PKR", "balance": "150000.00"},
        {"name": "Cash Wallet", "type": "cash", "currency": "PKR", "balance": "5000.00"},
        {"name": "Credit Card", "type": "credit_card", "currency": "PKR", "balance": "0.00"},
    ]
    created = []
    for payload in accounts_to_create:
        resp = client.post(f"{BASE_URL}/api/v1/accounts", headers=headers, json=payload)
        if resp.status_code == 201:
            created.append(resp.json())
    existing = client.get(f"{BASE_URL}/api/v1/accounts", headers=headers).json()
    print(f"Accounts ready: {len(existing)}")
    return existing


def seed_extra_categories(client: httpx.Client, headers: dict) -> list[dict]:
    extra = [
        {"name": "Streaming Services", "kind": "expense"},
        {"name": "Gym Membership", "kind": "expense"},
        {"name": "Freelance Income", "kind": "income"},
    ]
    for payload in extra:
        client.post(f"{BASE_URL}/api/v1/categories", headers=headers, json=payload)
    existing = client.get(f"{BASE_URL}/api/v1/categories", headers=headers).json()
    print(f"Categories ready: {len(existing)}")
    return existing


def seed_transactions(
    client: httpx.Client, headers: dict, accounts: list[dict], categories: list[dict]
) -> int:
    expense_categories = [c for c in categories if c["kind"] == "expense"]
    income_categories = [c for c in categories if c["kind"] == "income"]
    expense_notes = [
        "Grocery run", "Restaurant dinner", "Uber ride", "Electricity bill",
        "Internet bill", "Coffee", "Movie night", "Fuel", "Pharmacy",
        "Online shopping", None,
    ]
    income_notes = ["Monthly salary", "Freelance project", "Bonus", None]

    today = date.today()
    start = today - timedelta(days=120)

    count = 0
    day = start
    while day <= today:
        # 1-3 transactions per day, skip some days entirely
        if random.random() < 0.55:
            day += timedelta(days=1)
            continue
        for _ in range(random.randint(1, 2)):
            account = random.choice(accounts)
            is_income = random.random() < 0.12
            if is_income and income_categories:
                category = random.choice(income_categories)
                amount = f"{random.randint(30000, 80000)}.00"
                note = random.choice(income_notes)
                kind = "income"
            else:
                category = random.choice(expense_categories) if expense_categories else None
                amount = f"{random.randint(200, 8000)}.00"
                note = random.choice(expense_notes)
                kind = "expense"

            payload = {
                "account_id": account["id"],
                "category_id": category["id"] if category else None,
                "kind": kind,
                "amount": amount,
                "note": note,
                "occurred_at": day.isoformat(),
            }
            resp = client.post(f"{BASE_URL}/api/v1/transactions", headers=headers, json=payload)
            if resp.status_code == 201:
                count += 1
        day += timedelta(days=1)

    print(f"Transactions created: {count}")
    return count


def seed_budgets(client: httpx.Client, headers: dict, categories: list[dict]) -> int:
    expense_categories = [c for c in categories if c["kind"] == "expense"][:5]
    today = date.today()
    count = 0
    for category in expense_categories:
        payload = {
            "category_id": category["id"],
            "year": today.year,
            "month": today.month,
            "limit_amount": f"{random.randint(5000, 20000)}.00",
        }
        resp = client.post(f"{BASE_URL}/api/v1/budgets", headers=headers, json=payload)
        if resp.status_code == 201:
            count += 1
    print(f"Budgets created: {count}")
    return count


def main() -> None:
    with httpx.Client(timeout=30.0) as client:
        token = register_or_login(client)
        headers = {"Authorization": f"Bearer {token}"}

        accounts = seed_accounts(client, headers)
        categories = seed_extra_categories(client, headers)
        seed_transactions(client, headers, accounts, categories)
        seed_budgets(client, headers, categories)

        print("\nDone! Log in with:")
        print(f"  Email:    {DEMO_EMAIL}")
        print(f"  Password: {DEMO_PASSWORD}")


if __name__ == "__main__":
    main()