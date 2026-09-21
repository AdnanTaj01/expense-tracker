from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import api_router
from app.core.config import settings

app = FastAPI(
    title="Expense Tracker API",
    version="0.1.0",
    description="Multi-user personal finance system with AI assistant.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/health", tags=["meta"])
def health_check() -> dict[str, str]:
    """Liveness check. The app must respond even when the AI is down."""
    return {"status": "ok"}