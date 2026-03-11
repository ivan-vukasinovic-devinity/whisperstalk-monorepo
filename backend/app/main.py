import asyncio
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.config import get_settings
from app.db import Base, engine
from app.routes.auth import router as auth_router
from app.routes.contacts import router as contacts_router
from app.routes.presence import router as presence_router
from app.routes.signaling import router as signaling_router
from app.routes.users import router as users_router
from app.utils.error_handlers import register_exception_handlers

settings = get_settings()
app = FastAPI(title=settings.app_name)
logger = logging.getLogger(__name__)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
register_exception_handlers(app)

app.include_router(auth_router, prefix=settings.api_v1_prefix)
app.include_router(users_router, prefix=settings.api_v1_prefix)
app.include_router(contacts_router, prefix=settings.api_v1_prefix)
app.include_router(presence_router, prefix=settings.api_v1_prefix)
app.include_router(signaling_router, prefix=settings.api_v1_prefix)


@app.on_event("startup")
async def initialize_database() -> None:
    max_attempts = 8
    for attempt in range(1, max_attempts + 1):
        try:
            with engine.begin() as connection:
                connection.execute(text("SELECT 1"))
            Base.metadata.create_all(bind=engine)
            logger.info("Database is ready and schema initialized.")
            return
        except SQLAlchemyError as exc:
            if attempt == max_attempts:
                logger.exception("Database initialization failed after retries.")
                raise
            wait_seconds = 2
            logger.warning(
                "Database not ready (attempt %s/%s): %s. Retrying in %ss.",
                attempt,
                max_attempts,
                exc,
                wait_seconds,
            )
            await asyncio.sleep(wait_seconds)


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "Whispers backend running"}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
