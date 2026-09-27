"""Semantic search over document chunks (Phase 18D).

Embeds the user's query and finds the most similar chunks using
pgvector's cosine distance operator, scoped to that user's own
documents.
"""
from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.ai.rag.embeddings import embed_one
from app.core.config import settings
from app.models.document_chunk import DocumentChunk


@dataclass
class SearchResult:
    chunk_id: int
    document_id: int
    chunk_index: int
    content: str
    distance: float  # lower is more similar (cosine distance)


def search_chunks(
    db: Session,
    user_id: int,
    query: str,
    top_k: int | None = None,
    document_id: int | None = None,
) -> list[SearchResult]:
    """Return the most semantically relevant chunks for a query.

    Scoped to the given user's documents. Optionally narrowed to a
    single document_id.
    """
    cleaned = query.strip()
    if not cleaned:
        return []

    k = top_k if top_k is not None else settings.RAG_TOP_K
    query_vector = embed_one(cleaned)

    distance = DocumentChunk.embedding.cosine_distance(query_vector)
    q = (
        db.query(DocumentChunk, distance.label("distance"))
        .filter(DocumentChunk.user_id == user_id)
    )
    if document_id is not None:
        q = q.filter(DocumentChunk.document_id == document_id)

    rows = q.order_by(distance).limit(k).all()

    return [
        SearchResult(
            chunk_id=chunk.id,
            document_id=chunk.document_id,
            chunk_index=chunk.chunk_index,
            content=chunk.content,
            distance=float(dist),
        )
        for chunk, dist in rows
    ]