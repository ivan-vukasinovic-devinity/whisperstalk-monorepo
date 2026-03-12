from datetime import datetime, timezone

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.nudge import Nudge


def send_nudge(db: Session, sender_id: str, recipient_id: str) -> None:
    """Upsert a nudge row — idempotent, just refreshes the timestamp."""
    existing = (
        db.query(Nudge)
        .filter(Nudge.sender_id == sender_id, Nudge.recipient_id == recipient_id)
        .first()
    )
    if existing:
        existing.created_at = datetime.now(timezone.utc)
        db.commit()
        return

    nudge = Nudge(sender_id=sender_id, recipient_id=recipient_id)
    db.add(nudge)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()


def consume_nudges(db: Session, recipient_id: str) -> list[str]:
    """Return sender IDs of all nudges for this recipient, then delete them."""
    rows = db.query(Nudge).filter(Nudge.recipient_id == recipient_id).all()
    sender_ids = [row.sender_id for row in rows]
    if rows:
        for row in rows:
            db.delete(row)
        db.commit()
    return sender_ids


def clear_nudge(db: Session, sender_id: str, recipient_id: str) -> None:
    """Remove a specific nudge (e.g. when both users are now in the chat)."""
    db.query(Nudge).filter(
        Nudge.sender_id == sender_id, Nudge.recipient_id == recipient_id
    ).delete()
    db.commit()
