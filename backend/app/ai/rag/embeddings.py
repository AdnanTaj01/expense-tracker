"""Local embeddings via sentence-transformers.

Runs on CPU. Model is downloaded once on first use and cached in
the user's Hugging Face cache folder.
"""
from __future__ import annotations

from functools import lru_cache

from sentence_transformers import SentenceTransformer

from app.core.config import settings


class EmbeddingUnavailableError(RuntimeError):
    """Raised when the embedding model cannot be loaded."""


@lru_cache(maxsize=1)
def _get_model() -> SentenceTransformer:
    try:
        return SentenceTransformer(settings.EMBEDDING_MODEL)
    except Exception as exc:  # noqa: BLE001
        raise EmbeddingUnavailableError(str(exc)) from exc


def embed(texts: list[str]) -> list[list[float]]:
    """Embed a batch of texts. Returns one 384-dim vector per text."""
    if not texts:
        return []
    model = _get_model()
    vectors = model.encode(
        texts,
        normalize_embeddings=True,
        convert_to_numpy=True,
        show_progress_bar=False,
    )
    return [v.tolist() for v in vectors]


def embed_one(text: str) -> list[float]:
    return embed([text])[0]


def dimension() -> int:
    return settings.EMBEDDING_DIM