"""
shared/config.py

Single source of truth for all configuration.
Everything is read from environment variables (via .env in development).

Usage:
    from shared.config import settings

    db_url = settings.database_url
    debug  = settings.debug
"""

from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# Named rather than written inline so the API can recognise it and say so, and so
# nobody has to grep for the literal to find out where it comes from.
DEV_API_KEY = "sk_standiq_dev_26108"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ------------------------------------------------------------------
    # Application
    # ------------------------------------------------------------------
    enable_bis_sync: bool = Field(default=True)
    app_env: str = Field(default="development")
    app_debug: bool = Field(default=True)
    app_port: int = Field(default=8000)
    # Development default only. It is committed to this repository, and the
    # frontend falls back to the same literal, so it is public by construction —
    # set API_KEY in the environment for any deployment that matters. The API
    # boots either way; kartikey/api/main.py logs a warning when this value is
    # still in use under a production APP_ENV.
    api_key: str = Field(default=DEV_API_KEY)
    allowed_origins: str = Field(default="*")

    # ------------------------------------------------------------------
    # Database
    # ------------------------------------------------------------------
    database_url: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/sih26108"
    )

    # ------------------------------------------------------------------
    # Document storage
    # ------------------------------------------------------------------
    upload_dir: str = Field(default="./uploads")
    analysis_database_path: str = Field(default="./data/sih26108.db")

    # ------------------------------------------------------------------
    # LLM / AI
    # ------------------------------------------------------------------
    openai_api_key: str = Field(default="")
    google_api_key: str = Field(default="")        # Gemini
    # Optional extra Gemini keys. GeminiClient rotates across whichever of these
    # are set, so the team's free-tier quotas add up instead of one key carrying
    # every request. Declared as real fields rather than read with os.getenv:
    # pydantic-settings parses .env itself and never exports it to os.environ, so
    # os.getenv could only ever see them when they were exported by hand.
    google_api_key_2: str = Field(default="")
    google_api_key_3: str = Field(default="")
    # Default Gemini model. Override via GEMINI_MODEL if Google changes model
    # availability — verify the new name against `client.models.list()` first.
    gemini_model: str = Field(default="gemini-2.5-flash")
    qdrant_url: str = Field(default="")
    qdrant_api_key: str = Field(default="")
    aiml_service_url: str = Field(default="")      # if ML team runs as HTTP service
    aiml_timeout_seconds: float = Field(default=120.0)
    semantic_retrieval_enabled: bool = Field(default=False)
    # Full URL of the ai-engine /recommend endpoint, e.g.
    # "https://standiq-ai-engine.onrender.com/recommend". When set, _step_retrieve
    # ranks candidates with the ai-engine's hybrid FAISS+BM25+RRF retriever
    # (measured 93% R@5) and resolves the results back to this service's own
    # StandardsStore records. Empty = keep using the local retrieval service.
    #
    # This is deliberately NOT semantic_retrieval_enabled: that flag controls the
    # in-process bge-small + VectorStore path in knowledge_registry.py, which is a
    # different retriever with different assets. The two are independent.
    aiml_recommend_url: str = Field(default="")
    # Gemini final pass. When enabled (and google_api_key is set), the analysis
    # step explains each requirement with Gemini instead of the deterministic
    # mock engine. Set GEMINI_FINAL_PASS_ENABLED=false to force the deterministic
    # path — useful for offline demos, for conserving quota, or to isolate
    # whether a bad finding came from the LLM or from the compliance rules.
    #
    # An explicit aiml_service_url still wins: if the ML team is running their
    # own analysis service, that is the intended engine.
    gemini_final_pass_enabled: bool = Field(default=True)

    # ------------------------------------------------------------------
    # Bhashini (low priority — wire in later)
    # ------------------------------------------------------------------
    bhashini_api_key: str = Field(default="")
    bhashini_user_id: str = Field(default="")

    # ------------------------------------------------------------------
    # Reports & Webhooks
    # ------------------------------------------------------------------
    n8n_report_webhook_url: str = Field(default="")

    @property
    def is_development(self) -> bool:
        return self.app_env == "development"

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def aiml_is_http_service(self) -> bool:
        """True if AI/ML team runs as a separate HTTP service."""
        return bool(self.aiml_service_url)

    @property
    def aiml_recommend_enabled(self) -> bool:
        """True if _step_retrieve should rank via the ai-engine /recommend endpoint."""
        return bool(self.aiml_recommend_url)

    @property
    def gemini_final_pass_available(self) -> bool:
        """True if the analysis step can use the Gemini final pass."""
        return self.gemini_final_pass_enabled and bool(self.google_api_key)


@lru_cache
def get_settings() -> Settings:
    """
    Return the singleton Settings instance.
    Cached after first call — safe to import anywhere.
    """
    return Settings()


# Convenience alias — most code just does `from shared.config import settings`
settings: Settings = get_settings()
