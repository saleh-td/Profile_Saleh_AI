from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Central place for runtime configuration.
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_NAME: str = "AI Architect Backend"
    APP_VERSION: str = "0.1.0"

    # Frontend integration (local dev by default).
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # Groq
    GROQ_API_KEY: str | None = None
    GROQ_MODEL: str = "llama-3.1-8b-instant"
    GROQ_TEMPERATURE: float = 0.25
    GROQ_MAX_TOKENS: int = 420
    GROQ_TIMEOUT_SECONDS: float = 20.0

    # Minimal abuse guardrails
    CHAT_MAX_MESSAGE_CHARS: int = 1200


settings = Settings()
