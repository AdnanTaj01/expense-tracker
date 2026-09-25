import uuid
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import Receipt, Transaction, User

ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "application/pdf",
}

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".pdf"}


def _receipts_dir() -> Path:
    base = Path(settings.UPLOAD_DIR) / "receipts"
    base.mkdir(parents=True, exist_ok=True)
    return base


def _safe_stored_name(original_name: str) -> str:
    ext = Path(original_name).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        ext = ""
    return f"{uuid.uuid4().hex}{ext}"


def list_receipts(db: Session, user: User) -> list[Receipt]:
    stmt = (
        select(Receipt)
        .where(Receipt.user_id == user.id)
        .order_by(Receipt.created_at.desc())
    )
    return list(db.execute(stmt).scalars().all())


def get_receipt(db: Session, user: User, receipt_id: int) -> Receipt | None:
    stmt = select(Receipt).where(
        Receipt.id == receipt_id, Receipt.user_id == user.id
    )
    return db.execute(stmt).scalar_one_or_none()


def save_receipt(
    db: Session,
    user: User,
    *,
    original_name: str,
    content_type: str,
    content: bytes,
    transaction_id: int | None,
) -> Receipt:
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise ValueError(
            f"Unsupported file type: {content_type}. Allowed: "
            f"{', '.join(sorted(ALLOWED_CONTENT_TYPES))}"
        )

    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise ValueError(
            f"File too large. Max {settings.MAX_UPLOAD_SIZE_MB} MB."
        )
    if len(content) == 0:
        raise ValueError("File is empty.")

    if transaction_id is not None:
        tx = db.execute(
            select(Transaction).where(
                Transaction.id == transaction_id,
                Transaction.user_id == user.id,
            )
        ).scalar_one_or_none()
        if tx is None:
            raise ValueError("Transaction not found or not owned by user")

    stored_name = _safe_stored_name(original_name)
    path = _receipts_dir() / stored_name
    path.write_bytes(content)

    receipt = Receipt(
        user_id=user.id,
        transaction_id=transaction_id,
        stored_name=stored_name,
        original_name=original_name[:255],
        content_type=content_type,
        size_bytes=len(content),
    )
    db.add(receipt)
    db.commit()
    db.refresh(receipt)
    return receipt


def receipt_file_path(receipt: Receipt) -> Path:
    return _receipts_dir() / receipt.stored_name


def delete_receipt(db: Session, user: User, receipt_id: int) -> bool:
    receipt = get_receipt(db, user, receipt_id)
    if receipt is None:
        return False
    try:
        p = receipt_file_path(receipt)
        if p.exists():
            p.unlink()
    except OSError:
        pass
    db.delete(receipt)
    db.commit()
    return True