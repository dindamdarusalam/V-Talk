from functools import lru_cache
from typing import List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "V-Talk Backend"
    app_env: str = "development"
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    secret_key: str = "change-this-secret-key"
    access_token_expire_minutes: int = 1440
    database_url: str = "sqlite:///./vtalk.db"
    cors_origins: List[str] = Field(
        default_factory=lambda: ["http://localhost:3000", "http://127.0.0.1:3000"]
    )
    default_user_email: str = "demo@vtalk.example.com"
    default_user_password: str = "demo12345"
    inference_provider: str = "mock"
    model_path: str = ""
    model_labels: List[str] = Field(
        default_factory=lambda: list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | List[str]) -> List[str]:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    @field_validator("model_labels", mode="before")
    @classmethod
    def parse_model_labels(cls, value: str | List[str]) -> List[str]:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
