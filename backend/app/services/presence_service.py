from datetime import datetime, timedelta, timezone

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.presence import Presence
from app.services.user_service import get_user_or_404

ONLINE_WINDOW_SECONDS = 12


def heartbeat(db: Session, user_id: str, active_chat_with: str | None = None) -> Presence:
    get_user_or_404(db, user_id)
    item = db.query(Presence).filter(Presence.user_id == user_id).first()
    now = datetime.now(timezone.utc)
    if item:
        item.last_seen_at = now
        item.active_chat_with = active_chat_with
        db.commit()
        db.refresh(item)
        return item

    item = Presence(user_id=user_id, last_seen_at=now, active_chat_with=active_chat_with)
    db.add(item)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        item = db.query(Presence).filter(Presence.user_id == user_id).first()
        if item:
            item.last_seen_at = now
            item.active_chat_with = active_chat_with
            db.add(item)
            db.commit()
        else:
            raise
    db.refresh(item)
    return item


def get_statuses(db: Session, user_ids: list[str]) -> list[dict]:
    now = datetime.now(timezone.utc)
    online_cutoff = now - timedelta(seconds=ONLINE_WINDOW_SECONDS)
    rows = db.query(Presence).filter(Presence.user_id.in_(user_ids)).all()
    by_user_id = {row.user_id: row for row in rows}

    result: list[dict] = []
    for user_id in user_ids:
        item = by_user_id.get(user_id)
        is_online = bool(item and item.last_seen_at >= online_cutoff)
        active_chat = item.active_chat_with if (item and is_online) else None
        result.append({
            "user_id": user_id,
            "is_online": is_online,
            "last_seen_at": item.last_seen_at if item else None,
            "active_chat_with": active_chat,
        })
    return result
