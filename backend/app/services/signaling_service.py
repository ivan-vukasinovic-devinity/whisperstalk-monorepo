from sqlalchemy.orm import Session

from app.models.signaling import SignalingMessage, SignalingType
from app.services.user_service import get_user_or_404


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

    query = db.query(SignalingMessage).filter(
        SignalingMessage.recipient_id == recipient_id, SignalingMessage.consumed.is_(False)
    )
    if sender_id:
        query = query.filter(SignalingMessage.sender_id == sender_id)

    items = query.order_by(SignalingMessage.created_at.asc()).all()
    for item in items:
        item.consumed = True
        db.add(item)
    db.commit()
    return items
