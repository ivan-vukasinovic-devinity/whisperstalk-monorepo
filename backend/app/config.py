from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Whispers Backend"
    api_v1_prefix: str = "/api/v1"
    database_url: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/whispers"
    cors_origins: str = (
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000"
    )

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        if not isinstance(value, str):
            return value
        cleaned = value.strip()
        if (cleaned.startswith("'") and cleaned.endswith("'")) or (
            cleaned.startswith('"') and cleaned.endswith('"')
        ):
            cleaned = cleaned[1:-1].strip()
        if cleaned.startswith("postgres://"):
            return cleaned.replace("postgres://", "postgresql+psycopg2://", 1)
        if cleaned.startswith("postgresql://"):
            return cleaned.replace("postgresql://", "postgresql+psycopg2://", 1)
        return cleaned

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
