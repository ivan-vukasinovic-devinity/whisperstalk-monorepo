from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Nudge(Base):
    """Ephemeral 'wants to chat' signal. One row per sender→recipient pair."""

    __tablename__ = "nudges"
    __table_args__ = (UniqueConstraint("sender_id", "recipient_id", name="uq_nudge_pair"),)

    sender_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), primary_key=True)
    recipient_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
