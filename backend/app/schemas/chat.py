from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="User message")
    session_id: str | None = Field(
        default=None,
        description="Optional client session identifier for short conversation memory",
    )
    locale: str | None = Field(
        default=None,
        description="Optional UI locale hint (e.g. 'fr', 'en')",
    )


class ChatResponse(BaseModel):
    response: str
