from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.user import AuthResponse, UserLoginRequest, UserSignupRequest
from app.services.user_service import create_user, login_user
from app.utils.security import create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=AuthResponse)
def signup(payload: UserSignupRequest, db: Session = Depends(get_db)) -> AuthResponse:
    user = create_user(db=db, username=payload.username, password=payload.password, device_label="Web")
    token = create_access_token(user.id, user.username)
    return AuthResponse(user=user, token=token)


@router.post("/login", response_model=AuthResponse)
def login(payload: UserLoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    user = login_user(db=db, username=payload.username, password=payload.password)
    token = create_access_token(user.id, user.username)
    return AuthResponse(user=user, token=token)
