import time
from typing import Any, Generator, Optional

from openai import OpenAI
from openai.types.chat import ChatCompletionMessageParam

from app.core.llm_provider import LLMProvider


class OpenAIProvider(LLMProvider):
    def __init__(self, model_name: str = "gpt-4o", api_key: Optional[str] = None):
        super().__init__(model_name)
        self.client = OpenAI(api_key=api_key)

    def generate(
        self, prompt: str, system_prompt: Optional[str] = None
    ) -> dict[str, Any]:
        start = time.time()
        messages = self._build_messages(prompt, system_prompt)

        response = self.client.chat.completions.create(
            model=self.model_name, messages=messages
        )
        latency_ms = int((time.time() - start) * 1000)
        usage = response.usage

        return {
            "content": response.choices[0].message.content or "",
            "usage": {
                "prompt_tokens": usage.prompt_tokens if usage else 0,
                "completion_tokens": usage.completion_tokens if usage else 0,
                "total_tokens": usage.total_tokens if usage else 0,
            },
            "latency_ms": latency_ms,
            "provider": "openai",
        }

    def stream(
        self, prompt: str, system_prompt: Optional[str] = None
    ) -> Generator[str, None, None]:
        messages = self._build_messages(prompt, system_prompt)

        stream = self.client.chat.completions.create(
            model=self.model_name, messages=messages, stream=True
        )
        for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    def _build_messages(
        self, prompt: str, system_prompt: Optional[str] = None
    ) -> list[ChatCompletionMessageParam]:
        messages: list[ChatCompletionMessageParam] = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        return messages
