from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # Database
    DATABASE_URL: str

    # JWT (Phase 7)
    JWT_SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # CORS — comma-separated list of allowed origins
    CORS_ORIGINS: str = "http://localhost:5173"

    # Frontend URL — used for building password reset links
    FRONTEND_URL: str = "http://localhost:5173"

    # Dev-only: print password reset links to the console instead of
    # sending email. Set to False in production.
    DEBUG_RESET_LINKS: bool = True

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()