import uuid

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.user import User
from app.utils.exceptions import AppError
from app.utils.security import hash_password, verify_password


def create_user(db: Session, username: str, password: str, device_label: str = "Web") -> User:
    user = User(
        username=username.strip(),
        password_hash=hash_password(password),
        display_name=username.strip(),
        public_key=f"pub_{uuid.uuid4().hex}",
        device_label=device_label,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise AppError("Username already exists", status_code=409, code="username_exists")
    db.refresh(user)
    return user


def login_user(db: Session, username: str, password: str) -> User:
    user = db.query(User).filter(User.username == username.strip()).first()
    if not user:
        raise AppError("Invalid username or password", status_code=401, code="invalid_credentials")
    if not verify_password(password, user.password_hash):
        raise AppError("Invalid username or password", status_code=401, code="invalid_credentials")
    return user


def get_user_or_404(db: Session, user_id: str) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise AppError("User not found", status_code=404, code="user_not_found")
    return user


def get_user_by_qr_token_or_404(db: Session, qr_token: str) -> User:
    user = db.query(User).filter(User.qr_token == qr_token).first()
    if not user:
        raise AppError("QR token is invalid", status_code=404, code="invalid_qr_token")
    return user
