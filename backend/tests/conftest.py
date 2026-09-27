import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from sqlalchemy import text as sa_text

# Use a dedicated test database before importing app code.
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+psycopg://expense_user:Madnantaj17%40160@localhost:5433/expense_tracker_test",
)
os.environ.setdefault("JWT_SECRET_KEY", "test_secret_key_for_pytest_only")

# Import package + models first so tables register on Base.metadata.
import app.models  # noqa: E402, F401
from app.db.base import Base  # noqa: E402
from app.db.session import get_db  # noqa: E402
from app.main import app as fastapi_app  # noqa: E402

engine = create_engine(os.environ["DATABASE_URL"], pool_pre_ping=True)
TestingSessionLocal = sessionmaker(
    bind=engine, autocommit=False, autoflush=False, expire_on_commit=False
)


@pytest.fixture(scope="session", autouse=True)
def _setup_test_db():
    """Create all tables once per test session; drop them at the end."""
    with engine.begin() as conn:
        conn.execute(sa_text("CREATE EXTENSION IF NOT EXISTS vector"))
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(autouse=True)
def _clean_tables():
    """Truncate all tables between tests."""
    yield
    with engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(table.delete())


@pytest.fixture
def db_session():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    fastapi_app.dependency_overrides[get_db] = override_get_db
    with TestClient(fastapi_app) as test_client:
        yield test_client
    fastapi_app.dependency_overrides.clear()