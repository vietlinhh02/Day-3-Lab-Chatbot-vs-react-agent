import time
from typing import Any, Generator, Optional

import httpx

from app.core.llm_provider import LLMProvider


class OllamaProvider(LLMProvider):
    def __init__(
        self,
        model_name: str = "llama3",
        base_url: str = "http://localhost:11434",
    ):
        super().__init__(model_name)
        self.base_url = base_url.rstrip("/")

    def generate(
        self, prompt: str, system_prompt: Optional[str] = None
    ) -> dict[str, Any]:
        start = time.time()
        payload = self._build_payload(prompt, system_prompt, stream=False)

        with httpx.Client(timeout=120) as client:
            resp = client.post(f"{self.base_url}/api/generate", json=payload)
            resp.raise_for_status()
            data = resp.json()

        latency_ms = int((time.time() - start) * 1000)

        return {
            "content": data.get("response", ""),
            "usage": {
                "prompt_tokens": data.get("prompt_eval_count", 0),
                "completion_tokens": data.get("eval_count", 0),
                "total_tokens": data.get("prompt_eval_count", 0)
                + data.get("eval_count", 0),
            },
            "latency_ms": latency_ms,
            "provider": "ollama",
        }

    def stream(
        self, prompt: str, system_prompt: Optional[str] = None
    ) -> Generator[str, None, None]:
        payload = self._build_payload(prompt, system_prompt, stream=True)

        with httpx.Client(timeout=120) as client:
            with client.stream(
                "POST", f"{self.base_url}/api/generate", json=payload
            ) as resp:
                resp.raise_for_status()
                for line in resp.iter_lines():
                    if line:
                        import json

                        chunk = json.loads(line)
                        text = chunk.get("response", "")
                        if text:
                            yield text

    def _build_payload(
        self, prompt: str, system_prompt: Optional[str] = None, stream: bool = False
    ) -> dict:
        payload = {
            "model": self.model_name,
            "prompt": prompt,
            "stream": stream,
            "think": False,  # Disable thinking mode for faster responses
            "options": {
                "num_predict": 512,  # Limit response length
                "temperature": 0.7,
            },
        }
        if system_prompt:
            payload["system"] = system_prompt
        return payload
