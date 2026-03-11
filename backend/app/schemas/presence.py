from datetime import datetime

from pydantic import BaseModel


class PresenceHeartbeatRequest(BaseModel):
    user_id: str


class PresenceStatusResponse(BaseModel):
    user_id: str
    is_online: bool
    last_seen_at: datetime | None
