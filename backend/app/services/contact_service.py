from datetime import datetime, timezone

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.contact import Contact
from app.models.contact_request import ContactRequest, ContactRequestStatus
from app.models.user import User
from app.services.user_service import get_user_by_qr_token_or_404, get_user_or_404
from app.utils.exceptions import AppError


def create_contact_request(db: Session, requester_id: str, target_qr_token: str) -> ContactRequest:
    requester = get_user_or_404(db, requester_id)
    target = get_user_by_qr_token_or_404(db, target_qr_token)

    if requester.id == target.id:
        raise AppError("You cannot add yourself", status_code=400, code="invalid_self_add")

    existing_contact = (
        db.query(Contact).filter(Contact.user_id == requester.id, Contact.contact_user_id == target.id).first()
    )
    if existing_contact:
        raise AppError("Contact already exists", status_code=409, code="contact_exists")

    request = ContactRequest(requester_id=requester.id, target_id=target.id, status=ContactRequestStatus.pending)
    db.add(request)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        existing_request = (
            db.query(ContactRequest)
            .filter(ContactRequest.requester_id == requester.id, ContactRequest.target_id == target.id)
            .first()
        )
        if existing_request and existing_request.status == ContactRequestStatus.pending:
            raise AppError("Contact request already pending", status_code=409, code="request_pending")
        raise

    db.refresh(request)
    return request


def accept_contact_request(db: Session, request_id: str, user_id: str) -> ContactRequest:
    request = db.query(ContactRequest).filter(ContactRequest.id == request_id).first()
    if not request:
        raise AppError("Contact request not found", status_code=404, code="request_not_found")
    if request.target_id != user_id:
        raise AppError("Only request target can accept this request", status_code=403, code="request_forbidden")
    if request.status != ContactRequestStatus.pending:
        raise AppError("Contact request is not pending", status_code=409, code="request_not_pending")

    request.status = ContactRequestStatus.accepted
    request.responded_at = datetime.now(timezone.utc)
    db.add(request)

    db.add(Contact(user_id=request.requester_id, contact_user_id=request.target_id))
    db.add(Contact(user_id=request.target_id, contact_user_id=request.requester_id))
    db.commit()
    db.refresh(request)
    return request


def list_contacts_for_user(db: Session, user_id: str) -> list[dict]:
    get_user_or_404(db, user_id)
    rows = (
        db.query(Contact, User)
        .join(User, User.id == Contact.contact_user_id)
        .filter(Contact.user_id == user_id)
        .order_by(User.display_name.asc())
        .all()
    )
    return [
        {"contact_user_id": contact.contact_user_id, "display_name": user.display_name, "alias": contact.alias}
        for contact, user in rows
    ]


def list_pending_requests_for_user(db: Session, user_id: str) -> list[ContactRequest]:
    get_user_or_404(db, user_id)
    return (
        db.query(ContactRequest)
        .filter(ContactRequest.target_id == user_id, ContactRequest.status == ContactRequestStatus.pending)
        .order_by(ContactRequest.created_at.asc())
        .all()
    )
