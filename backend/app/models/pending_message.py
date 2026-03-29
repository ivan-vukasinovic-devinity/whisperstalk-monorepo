import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class PendingMessage(Base):
    __tablename__ = "pending_messages"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    sender_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    recipient_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    payload: Mapped[str] = mapped_column(Text, nullable=False)
    encrypted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
