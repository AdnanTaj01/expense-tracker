from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import UploadFile
from pypdf import PdfReader
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.document import Document

ALLOWED_EXTENSIONS = {".pdf", ".txt", ".md", ".markdown"}


def _documents_dir() -> Path:
    path = Path(settings.UPLOAD_DIR) / "documents"
    path.mkdir(parents=True, exist_ok=True)
    return path


def _extract_pdf(path: Path) -> tuple[str, int]:
    reader = PdfReader(str(path))
    pages = [page.extract_text() or "" for page in reader.pages]
    return "\n\n".join(pages), len(reader.pages)


def _extract_plain_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def create_document(db: Session, user_id: int, file: UploadFile) -> Document:
    original_name = file.filename or "untitled"
    ext = Path(original_name).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Unsupported file type: {ext or 'unknown'}")

    contents = file.file.read()
    size_bytes = len(contents)
    max_bytes = settings.DOCUMENT_MAX_SIZE_MB * 1024 * 1024
    if size_bytes > max_bytes:
        raise ValueError(
            f"File too large ({size_bytes} bytes). Max {settings.DOCUMENT_MAX_SIZE_MB} MB."
        )
    if size_bytes == 0:
        raise ValueError("Uploaded file is empty.")

    stored_name = f"{uuid.uuid4().hex}{ext}"
    dest = _documents_dir() / stored_name
    dest.write_bytes(contents)

    document = Document(
        user_id=user_id,
        stored_name=stored_name,
        original_name=original_name,
        content_type=file.content_type or "application/octet-stream",
        size_bytes=size_bytes,
        status="pending",
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    _process_document(db, document, dest, ext)
    return document


def _process_document(db: Session, document: Document, path: Path, ext: str) -> None:
    try:
        if ext == ".pdf":
            text, page_count = _extract_pdf(path)
        else:
            text = _extract_plain_text(path)
            page_count = None
        document.text_content = text
        document.page_count = page_count
        document.status = "ready"
        document.error_message = None
    except Exception as exc:  # noqa: BLE001
        document.status = "failed"
        document.error_message = str(exc)[:500]
    db.add(document)
    db.commit()
    db.refresh(document)


def list_documents(db: Session, user_id: int) -> list[Document]:
    return (
        db.query(Document)
        .filter(Document.user_id == user_id)
        .order_by(Document.created_at.desc())
        .all()
    )


def get_document(db: Session, user_id: int, document_id: int) -> Document | None:
    return (
        db.query(Document)
        .filter(Document.id == document_id, Document.user_id == user_id)
        .first()
    )


def get_document_path(document: Document) -> Path:
    return _documents_dir() / document.stored_name


def delete_document(db: Session, document: Document) -> None:
    path = get_document_path(document)
    if path.exists():
        path.unlink()
    db.delete(document)
    db.commit()