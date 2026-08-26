from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── LLM ──────────────────────────────────────────────────────
    groq_api_key: str = ""
    groq_model: str = "openai/gpt-oss-120b"

    # ── Database ──────────────────────────────────────────────────
    postgres_user: str = "research"
    postgres_password: str = "research_pass"
    postgres_db: str = "research_helper"
    postgres_host: str = "localhost"
    postgres_port: int = 5432

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def sync_database_url(self) -> str:
        """Used only by Alembic (needs sync driver)."""
        return (
            f"postgresql+psycopg2://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    # ── App ───────────────────────────────────────────────────────
    app_env: str = "development"
    log_level: str = "INFO"

    # ── CORS ─────────────────────────────────────────────────────
    cors_origins: str = "http://localhost:8000,http://127.0.0.1:5500"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    # ── Agent ─────────────────────────────────────────────────────
    max_search_loops: int = 3
    max_steps: int = 5          # max sub-questions the planner may generate
    search_results_per_step: int = 3

    # ── JWT Auth ──────────────────────────────────────────────────
    jwt_secret_key: str = "change-me-in-production-please"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 10080   # 7 days

    # ── Brevo Email / OTP ─────────────────────────────────────────
    smtp_host: str = "smtp-relay.brevo.com"
    smtp_port: int = 587
    smtp_user: str = "b341a8001@smtp-brevo.com"
    smtp_password: str = ""
    brevo_api_key: str = ""
    brevo_sender_email: str = "support@mychatbot.codes"
    brevo_sender_name: str = "AI Research Assistant"
    otp_expire_minutes: int = 10
    otp_resend_cooldown_seconds: int = 60


@lru_cache
def get_settings() -> Settings:
    return Settings()
