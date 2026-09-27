from __future__ import annotations

from sqlalchemy.orm import Session

from app.ai.llm.client import ChatMessage, chat as llm_chat
from app.ai.rag.search import search_chunks
from app.models.document import Document
from app.schemas.chat import ChatResponse, ChatSource

SYSTEM_PROMPT = (
    "You are a helpful assistant for a personal expense-tracker app. "
    "Answer the user's question using ONLY the document excerpts provided "
    "as context. If the excerpts don't contain the answer, say you don't "
    "have enough information in the uploaded documents — do not make "
    "anything up. Be concise."
)


def ask(
    db: Session,
    user_id: int,
    message: str,
    document_id: int | None = None,
) -> ChatResponse:
    results = search_chunks(db, user_id=user_id, query=message, document_id=document_id)

    if not results:
        return ChatResponse(
            answer=(
                "I couldn't find anything relevant in your uploaded documents. "
                "Try uploading a document first, or rephrase your question."
            ),
            sources=[],
        )

    # Fetch document names for the chunks we retrieved.
    doc_ids = {r.document_id for r in results}
    documents = {
        d.id: d.original_name
        for d in db.query(Document).filter(Document.id.in_(doc_ids)).all()
    }

    context_blocks = []
    for i, r in enumerate(results, start=1):
        doc_name = documents.get(r.document_id, "unknown document")
        context_blocks.append(f"[{i}] From \"{doc_name}\":\n{r.content}")
    context = "\n\n".join(context_blocks)

    user_prompt = (
        f"Context from the user's documents:\n\n{context}\n\n"
        f"Question: {message}"
    )

    answer = llm_chat(
        [
            ChatMessage(role="system", content=SYSTEM_PROMPT),
            ChatMessage(role="user", content=user_prompt),
        ]
    )

    sources = [
        ChatSource(
            document_id=r.document_id,
            document_name=documents.get(r.document_id, "unknown document"),
            chunk_index=r.chunk_index,
            excerpt=r.content[:200],
        )
        for r in results
    ]

    return ChatResponse(answer=answer, sources=sources)