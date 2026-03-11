import uuid
from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import JSON, DateTime, Enum as SqlEnum, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class SignalingType(str, Enum):
    offer = "offer"
    answer = "answer"
    candidate = "candidate"


class SignalingMessage(Base):
    __tablename__ = "signaling_messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    sender_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    recipient_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    message_type: Mapped[SignalingType] = mapped_column(SqlEnum(SignalingType), nullable=False)
    payload: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    consumed: Mapped[bool] = mapped_column(default=False, nullable=False, index=True)
