import re
from typing import Any

from app.core.llm_provider import LLMProvider
from app.telemetry.logger import logger


class ReActAgent:
    def __init__(
        self, llm: LLMProvider, tools: list[dict[str, Any]], max_steps: int = 5
    ):
        self.llm = llm
        self.tools = tools
        self.max_steps = max_steps
        self.history: list[dict] = []

    def get_system_prompt(self) -> str:
        tool_descriptions = "\n".join(
            [f"- {t['name']}: {t['description']}" for t in self.tools]
        )
        return f"""You are an intelligent assistant with access to these tools:
{tool_descriptions}

Use this format:
Thought: your reasoning
Action: tool_name(arguments)
Observation: result of the tool call
... (repeat as needed)
Final Answer: your final response"""

    def run(self, user_input: str) -> str:
        logger.log_event(
            "AGENT_START", {"input": user_input, "model": self.llm.model_name}
        )

        current_prompt = user_input
        steps = 0

        while steps < self.max_steps:
            result = self.llm.generate(
                current_prompt, system_prompt=self.get_system_prompt()
            )
            content = result["content"]

            final_match = re.search(
                r"Final Answer:\s*(.+)", content, re.DOTALL
            )
            if final_match:
                answer = final_match.group(1).strip()
                logger.log_event("AGENT_END", {"steps": steps, "answer": answer})
                return answer

            action_match = re.search(r"Action:\s*(\w+)\((.+?)\)", content)
            if action_match:
                tool_name = action_match.group(1)
                tool_args = action_match.group(2)
                observation = self._execute_tool(tool_name, tool_args)
                current_prompt = f"{content}\nObservation: {observation}"
            else:
                logger.log_event("AGENT_END", {"steps": steps})
                return content

            steps += 1

        logger.log_event("AGENT_END", {"steps": steps, "max_reached": True})
        return "Max steps reached without a final answer."

    def _execute_tool(self, tool_name: str, args: str) -> str:
        for tool in self.tools:
            if tool["name"] == tool_name:
                return tool["function"](args)
        return f"Tool '{tool_name}' not found."
