from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ReceiptRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    transaction_id: int | None
    original_name: str
    content_type: str
    size_bytes: int
    created_at: datetime