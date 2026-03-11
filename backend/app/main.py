from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.db import Base, engine
from app.routes.auth import router as auth_router
from app.routes.contacts import router as contacts_router
from app.routes.signaling import router as signaling_router
from app.routes.users import router as users_router
from app.utils.error_handlers import register_exception_handlers

settings = get_settings()
app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
register_exception_handlers(app)

Base.metadata.create_all(bind=engine)

app.include_router(auth_router, prefix=settings.api_v1_prefix)
app.include_router(users_router, prefix=settings.api_v1_prefix)
app.include_router(contacts_router, prefix=settings.api_v1_prefix)
app.include_router(signaling_router, prefix=settings.api_v1_prefix)


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "Whispers backend running"}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
