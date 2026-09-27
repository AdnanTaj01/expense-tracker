from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.ai.llm.client import LLMUnavailableError
from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.chat import ChatRequest, ChatResponse
from app.services import chat_service

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
def ask_chat(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ChatResponse:
    try:
        return chat_service.ask(
            db,
            user_id=current_user.id,
            message=payload.message,
            document_id=payload.document_id,
        )
    except LLMUnavailableError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"AI assistant is currently unavailable: {exc}",
        ) from exc