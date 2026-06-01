from abc import ABC, abstractmethod
from typing import Any, Generator, Optional


class LLMProvider(ABC):
    def __init__(self, model_name: str):
        self.model_name = model_name

    @abstractmethod
    def generate(
        self, prompt: str, system_prompt: Optional[str] = None
    ) -> dict[str, Any]:
        pass

    @abstractmethod
    def stream(
        self, prompt: str, system_prompt: Optional[str] = None
    ) -> Generator[str, None, None]:
        pass
