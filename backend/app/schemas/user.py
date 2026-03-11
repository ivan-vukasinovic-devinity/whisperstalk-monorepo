from datetime import datetime

from pydantic import BaseModel, Field


class UserSignupRequest(BaseModel):
    username: str = Field(min_length=3, max_length=80)
    password: str = Field(min_length=8, max_length=120)


class UserLoginRequest(BaseModel):
    username: str = Field(min_length=3, max_length=80)
    password: str = Field(min_length=8, max_length=120)


class UserResponse(BaseModel):
    id: str
    username: str
    display_name: str
    public_key: str
    device_label: str
    qr_token: str
    created_at: datetime

    model_config = {"from_attributes": True}
