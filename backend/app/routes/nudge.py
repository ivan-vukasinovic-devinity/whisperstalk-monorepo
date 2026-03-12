from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.common import ApiMessage
from app.services.nudge_service import clear_nudge, consume_nudges, send_nudge

router = APIRouter(prefix="/nudge", tags=["nudge"])


class NudgeRequest(BaseModel):
    sender_id: str
    recipient_id: str


@router.post("", response_model=ApiMessage)
def post_nudge(payload: NudgeRequest, db: Session = Depends(get_db)) -> ApiMessage:
    """Signal that sender wants to chat with recipient."""
    send_nudge(db, payload.sender_id, payload.recipient_id)
    return ApiMessage(message="ok")


@router.get("/{recipient_id}")
def get_nudges(recipient_id: str, db: Session = Depends(get_db)) -> list[str]:
    """Consume and return all sender IDs that nudged this recipient."""
    return consume_nudges(db, recipient_id)


@router.delete("")
def delete_nudge(payload: NudgeRequest, db: Session = Depends(get_db)) -> ApiMessage:
    """Clear a specific nudge after both users are in the chat."""
    clear_nudge(db, payload.sender_id, payload.recipient_id)
    return ApiMessage(message="ok")
