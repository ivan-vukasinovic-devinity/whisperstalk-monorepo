import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.utils.exceptions import AppError

logger = logging.getLogger(__name__)


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def app_error_handler(_: Request, exc: AppError) -> JSONResponse:
        logger.warning("Application error: %s (%s)", exc.message, exc.code)
        return JSONResponse(status_code=exc.status_code, content={"error": exc.code, "message": exc.message})

    @app.exception_handler(Exception)
    async def unhandled_error_handler(_: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled server exception: %s", str(exc))
        return JSONResponse(status_code=500, content={"error": "internal_server_error", "message": "Unexpected error"})
