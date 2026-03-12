from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.common import ApiMessage
from app.schemas.presence import PresenceHeartbeatRequest, PresenceStatusResponse
from app.services.presence_service import get_statuses, heartbeat

router = APIRouter(prefix="/presence", tags=["presence"])


@router.post("/heartbeat", response_model=ApiMessage)
def post_heartbeat(payload: PresenceHeartbeatRequest, db: Session = Depends(get_db)) -> ApiMessage:
    heartbeat(db, payload.user_id, active_chat_with=payload.active_chat_with)
    return ApiMessage(message="ok")


@router.get("/statuses", response_model=list[PresenceStatusResponse])
def list_statuses(
    user_ids: str = Query(default=""),
    db: Session = Depends(get_db),
) -> list[PresenceStatusResponse]:
    ids = [item.strip() for item in user_ids.split(",") if item.strip()]
    if not ids:
        return []
    return get_statuses(db, ids)
