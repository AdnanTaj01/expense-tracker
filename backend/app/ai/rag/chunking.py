"""Text chunking for RAG (Phase 18C).

Splits extracted document text into overlapping chunks sized for
embedding. Chunk boundaries snap to whitespace where possible so
words aren't cut in half.
"""
from __future__ import annotations

from app.core.config import settings


def chunk_text(
    text: str,
    chunk_size: int | None = None,
    chunk_overlap: int | None = None,
) -> list[str]:
    """Split text into overlapping chunks. Returns [] for blank input."""
    size = chunk_size if chunk_size is not None else settings.RAG_CHUNK_SIZE
    overlap = chunk_overlap if chunk_overlap is not None else settings.RAG_CHUNK_OVERLAP

    cleaned = text.strip()
    if not cleaned:
        return []

    if size <= 0:
        raise ValueError("chunk_size must be positive")
    if overlap < 0 or overlap >= size:
        raise ValueError("chunk_overlap must be >= 0 and < chunk_size")

    chunks: list[str] = []
    start = 0
    length = len(cleaned)

    while start < length:
        end = min(start + size, length)
        if end < length:
            snap = cleaned.rfind(" ", start, end)
            if snap > start:
                end = snap
        chunk = cleaned[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end >= length:
            break
        start = max(end - overlap, start + 1)

    return chunks