from datetime import datetime, timedelta, timezone

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.signaling import SignalingMessage, SignalingType
from app.services.user_service import get_user_or_404

SIGNAL_TTL_SECONDS = 30


def create_signal(
    db: Session, sender_id: str, recipient_id: str, message_type: SignalingType, payload: dict
) -> SignalingMessage:
    get_user_or_404(db, sender_id)
    get_user_or_404(db, recipient_id)
    message = SignalingMessage(
        sender_id=sender_id, recipient_id=recipient_id, message_type=message_type, payload=payload
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


def consume_inbox(db: Session, recipient_id: str, sender_id: str | None = None) -> list[SignalingMessage]:
    get_user_or_404(db, recipient_id)

    cutoff = datetime.now(timezone.utc) - timedelta(seconds=SIGNAL_TTL_SECONDS)

    query = db.query(SignalingMessage).filter(
        SignalingMessage.recipient_id == recipient_id,
        SignalingMessage.consumed.is_(False),
        SignalingMessage.created_at >= cutoff,
    )
    if sender_id:
        query = query.filter(SignalingMessage.sender_id == sender_id)

    items = query.order_by(SignalingMessage.created_at.asc()).all()
    for item in items:
        item.consumed = True
        db.add(item)
    db.commit()
    return items


def flush_pair(db: Session, user_id: str, peer_id: str) -> int:
    """Hard-delete all signaling messages (consumed or not) between two users."""
    count = (
        db.query(SignalingMessage)
        .filter(
            or_(
                (SignalingMessage.sender_id == user_id) & (SignalingMessage.recipient_id == peer_id),
                (SignalingMessage.sender_id == peer_id) & (SignalingMessage.recipient_id == user_id),
            )
        )
        .delete(synchronize_session="fetch")
    )
    db.commit()
    return count
