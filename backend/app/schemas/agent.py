from __future__ import annotations

from pydantic import BaseModel, Field


class AgentChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)


class AgentToolCallLog(BaseModel):
    tool: str
    arguments: dict
    result: dict


class PendingAction(BaseModel):
    """A write action the AI wants to take, awaiting user confirmation."""

    tool: str
    arguments: dict
    description: str


class AgentChatResponse(BaseModel):
    answer: str
    tool_calls: list[AgentToolCallLog]
    pending_action: PendingAction | None = None


class AgentConfirmRequest(BaseModel):
    tool: str
    arguments: dict


class AgentConfirmResponse(BaseModel):
    result: dict