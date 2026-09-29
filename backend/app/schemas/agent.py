from __future__ import annotations

from pydantic import BaseModel, Field


class AgentChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)


class AgentToolCallLog(BaseModel):
    tool: str
    arguments: dict
    result: dict


class AgentChatResponse(BaseModel):
    answer: str
    tool_calls: list[AgentToolCallLog]