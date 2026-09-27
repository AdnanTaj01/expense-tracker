from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    document_id: int | None = None


class ChatSource(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    document_id: int
    document_name: str
    chunk_index: int
    excerpt: str


class ChatResponse(BaseModel):
    answer: str
    sources: list[ChatSource]