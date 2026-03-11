from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.user import UserLoginRequest, UserResponse, UserSignupRequest
from app.services.user_service import create_user, login_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=UserResponse)
def signup(payload: UserSignupRequest, db: Session = Depends(get_db)) -> UserResponse:
    return create_user(db=db, username=payload.username, password=payload.password, device_label="Web")


@router.post("/login", response_model=UserResponse)
def login(payload: UserLoginRequest, db: Session = Depends(get_db)) -> UserResponse:
    return login_user(db=db, username=payload.username, password=payload.password)
