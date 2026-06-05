from functools import lru_cache
from typing import Annotated
from typing import List

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


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
    database_pool_size: int = 5
    database_max_overflow: int = 5
    database_pool_timeout: int = 30
    database_pool_recycle_seconds: int = 1800
    cors_origins: Annotated[List[str], NoDecode] = Field(
        default_factory=lambda: ["http://localhost:3000", "http://127.0.0.1:3000"]
    )
    default_user_email: str = "demo@vtalk.example.com"
    default_user_password: str = "demo12345"
    inference_provider: str = "mock"
    model_path: str = ""
    model_labels: Annotated[List[str], NoDecode] = Field(
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

    @model_validator(mode="after")
    def require_safe_production_secrets(self) -> "Settings":
        if self.app_env.lower() != "production":
            return self
        if self.secret_key == "change-this-secret-key":
            raise ValueError("SECRET_KEY must be set to a secure random value in production")
        if self.default_user_password == "demo12345":
            raise ValueError("DEFAULT_USER_PASSWORD must be changed in production")
        if self.database_url.lower().startswith("sqlite"):
            raise ValueError("DATABASE_URL must point to Supabase/PostgreSQL in production")
        if not self.database_url.lower().startswith(("postgres://", "postgresql://", "postgresql+psycopg2://")):
            raise ValueError("DATABASE_URL must use a PostgreSQL-compatible Supabase connection string")
        if any("your-vtalk-frontend.vercel.app" in origin for origin in self.cors_origins):
            raise ValueError("CORS_ORIGINS must use your real Vercel frontend URL in production")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
