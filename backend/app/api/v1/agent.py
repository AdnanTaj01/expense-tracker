from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.ai.llm.client import LLMUnavailableError
from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.agent import (
    AgentChatRequest,
    AgentChatResponse,
    AgentConfirmRequest,
    AgentConfirmResponse,
)
from app.services import agent_service

router = APIRouter(prefix="/agent", tags=["agent"])


@router.post("/chat", response_model=AgentChatResponse)
def agent_chat(
    payload: AgentChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AgentChatResponse:
    try:
        return agent_service.ask(db, current_user, payload.message)
    except LLMUnavailableError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"AI assistant is currently unavailable: {exc}",
        ) from exc


@router.post("/confirm", response_model=AgentConfirmResponse)
def agent_confirm(
    payload: AgentConfirmRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AgentConfirmResponse:
    return agent_service.confirm(db, current_user, payload.tool, payload.arguments)