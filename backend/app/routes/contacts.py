import logging

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.routes.ws import send_to_user
from app.schemas.contact import (
    ContactRequestCreate,
    ContactRequestCreateByIdentifier,
    ContactRequestEnrichedResponse,
    ContactRequestRespond,
    ContactRequestResponse,
    ContactResponse,
)
from app.schemas.common import ApiMessage
from app.services.contact_service import (
    accept_contact_request,
    create_contact_request,
    create_contact_request_by_identifier,
    list_contacts_for_user,
    list_pending_requests_for_user,
    reject_contact_request,
)

router = APIRouter(prefix="/contacts", tags=["contacts"])
_logger = logging.getLogger(__name__)


async def _notify_ws(user_id: str) -> None:
    try:
        await send_to_user(user_id, {"type": "contact_update"})
    except Exception:
        _logger.debug("WS notify failed for %s (offline)", user_id)


@router.post("/requests", response_model=ContactRequestResponse)
async def create_request(
    payload: ContactRequestCreate, db: Session = Depends(get_db)
) -> ContactRequestResponse:
    result = create_contact_request(db, payload.requester_id, payload.target_qr_token)
    await _notify_ws(result.target_id)
    return result


@router.post("/requests/by-identifier", response_model=ContactRequestResponse)
async def create_request_by_identifier(
    payload: ContactRequestCreateByIdentifier, db: Session = Depends(get_db)
) -> ContactRequestResponse:
    """Create a contact request using a username or user ID."""
    result = create_contact_request_by_identifier(db, payload.requester_id, payload.identifier)
    await _notify_ws(result.target_id)
    return result


@router.post("/requests/{request_id}/accept", response_model=ContactRequestResponse)
async def accept_request(
    request_id: str, payload: ContactRequestRespond, db: Session = Depends(get_db)
) -> ContactRequestResponse:
    result = accept_contact_request(db, request_id=request_id, user_id=payload.user_id)
    await _notify_ws(result.requester_id)
    return result


@router.post("/requests/{request_id}/reject", response_model=ContactRequestResponse)
async def reject_request(
    request_id: str, payload: ContactRequestRespond, db: Session = Depends(get_db)
) -> ContactRequestResponse:
    return reject_contact_request(db, request_id=request_id, user_id=payload.user_id)


@router.get("/{user_id}", response_model=list[ContactResponse])
def list_contacts(user_id: str, db: Session = Depends(get_db)) -> list[ContactResponse]:
    return list_contacts_for_user(db, user_id)


@router.get("/requests/pending/{user_id}", response_model=list[ContactRequestEnrichedResponse])
def list_pending_requests(
    user_id: str, db: Session = Depends(get_db)
) -> list[ContactRequestEnrichedResponse]:
    return list_pending_requests_for_user(db, user_id)


@router.get("/health", response_model=ApiMessage)
def contacts_health() -> ApiMessage:
    return ApiMessage(message="contacts_ok")
