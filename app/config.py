from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4o"
    OPENAI_BASE_URL: Optional[str] = None

    OLLAMA_BASE_URL: str = "https://admission-vintage-ghz-orbit.trycloudflare.com"
    OLLAMA_MODEL: str = "qwen3.5:2b"

    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/ai_lab"

    DEFAULT_PROVIDER: str = "deepseek"
    LOG_LEVEL: str = "INFO"
    MAX_AGENT_STEPS: int = 8

    # DeepSeek
    DEEPSEEK_API_KEY: str = "sk-0qtXMVgb3910M65wG3H6D18CJugsGDNzD9enF7cf30k07j1ocJs0wut1cqar74H3"
    DEEPSEEK_MODEL: str = "deepseek-v4-flash"
    DEEPSEEK_BASE_URL: str = "https://opencode.ai/zen/go/v1"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


settings = Settings()
