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


settings = Settings()
