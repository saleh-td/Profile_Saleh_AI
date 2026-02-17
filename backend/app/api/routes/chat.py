from fastapi import APIRouter, status

from app.schemas.chat import ChatRequest, ChatResponse

router = APIRouter(tags=["chat"])


@router.post("/chat", response_model=ChatResponse, status_code=status.HTTP_200_OK)
def chat(_: ChatRequest) -> ChatResponse:
    """Chat endpoint placeholder.

    Intentionally empty for now: the goal is to reserve a stable API contract
    that will later host LLM/RAG orchestration.
    """

    return ChatResponse(message="Not implemented yet")
