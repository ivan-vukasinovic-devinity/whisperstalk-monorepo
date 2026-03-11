from datetime import datetime

from pydantic import BaseModel, Field

from app.models.contact_request import ContactRequestStatus


class ContactRequestCreate(BaseModel):
    requester_id: str
    target_qr_token: str = Field(min_length=4, max_length=32)


class ContactRequestRespond(BaseModel):
    user_id: str


class ContactRequestResponse(BaseModel):
    id: str
    requester_id: str
    target_id: str
    status: ContactRequestStatus
    created_at: datetime
    responded_at: datetime | None

    model_config = {"from_attributes": True}


class ContactResponse(BaseModel):
    contact_user_id: str
    display_name: str
    alias: str | None

