from datetime import datetime

from pydantic import BaseModel

from app.models.signaling import SignalingType


class SignalingMessageCreate(BaseModel):
    sender_id: str
    recipient_id: str
    message_type: SignalingType
    payload: dict


class SignalingMessageResponse(BaseModel):
    id: str
    sender_id: str
    recipient_id: str
    message_type: SignalingType
    payload: dict
    created_at: datetime

    model_config = {"from_attributes": True}
