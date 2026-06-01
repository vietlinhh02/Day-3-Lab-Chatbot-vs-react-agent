from typing import Optional
from openai import OpenAI
from app.core.openai_provider import OpenAIProvider


class DeepSeekProvider(OpenAIProvider):
    def __init__(
        self,
        model_name: str = "deepseek-v4-flash",
        api_key: str = "",
        base_url: str = "https://opencode.ai/zen/go/v1",
    ):
        super().__init__(model_name=model_name, api_key=api_key)
        self.client = OpenAI(api_key=api_key, base_url=base_url)

    def generate(self, prompt: str, system_prompt: Optional[str] = None):
        result = super().generate(prompt, system_prompt)
        result["provider"] = "deepseek"
        return result
