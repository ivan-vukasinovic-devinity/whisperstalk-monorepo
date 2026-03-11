from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.signaling import SignalingMessageCreate, SignalingMessageResponse
from app.services.signaling_service import consume_inbox, create_signal

router = APIRouter(prefix="/signaling", tags=["signaling"])


@router.post("", response_model=SignalingMessageResponse)
def create_signaling_message(
    payload: SignalingMessageCreate, db: Session = Depends(get_db)
) -> SignalingMessageResponse:
    return create_signal(
        db=db,
        sender_id=payload.sender_id,
        recipient_id=payload.recipient_id,
        message_type=payload.message_type,
        payload=payload.payload,
    )


@router.get("/inbox/{recipient_id}", response_model=list[SignalingMessageResponse])
def get_signaling_inbox(
    recipient_id: str,
    sender_id: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[SignalingMessageResponse]:
    return consume_inbox(db=db, recipient_id=recipient_id, sender_id=sender_id)
