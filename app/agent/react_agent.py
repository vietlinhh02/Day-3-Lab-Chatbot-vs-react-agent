import json
import time
from typing import Any

from langchain.agents import AgentExecutor, create_react_agent
from langchain.prompts import PromptTemplate
from langchain.tools import Tool
from langchain_core.callbacks.manager import CallbackManagerForLLMRun
from langchain_core.language_models.llms import LLM
from pydantic import PrivateAttr

from app.core.llm_provider import LLMProvider
from app.telemetry.logger import logger


WRITE_TOOLS = {
    "Create_Leave_Request",
    "Update_Leave_Request",
    "Cancel_Leave_Request",
    "Create_Employee",
    "Update_Employee",
    "Deactivate_Employee",
    "Activate_Employee",
    "Update_Leave_Balance",
}

HR_ADMIN_TOOLS = {
    "Create_Employee",
    "Update_Employee",
    "Deactivate_Employee",
    "Activate_Employee",
    "Update_Leave_Balance",
}

CONFIRMATION_WORDS = {
    "co",
    "có",
    "xac nhan",
    "xác nhận",
    "dong y",
    "đồng ý",
    "dung roi",
    "đúng rồi",
    "tao di",
    "tạo đi",
    "huy di",
    "hủy đi",
    "sua di",
    "sửa đi",
}


class ProviderLangChainLLM(LLM):
    _provider: LLMProvider = PrivateAttr()
    _system_prompt: str = PrivateAttr(default="")

    def __init__(self, provider: LLMProvider, system_prompt: str):
        super().__init__()
        self._provider = provider
        self._system_prompt = system_prompt

    @property
    def _llm_type(self) -> str:
        return f"provider_{self._provider.__class__.__name__.lower()}"

    @property
    def model_name(self) -> str:
        return self._provider.model_name

    def _call(
        self,
        prompt: str,
        stop: list[str] | None = None,
        run_manager: CallbackManagerForLLMRun | None = None,
        **kwargs: Any,
    ) -> str:
        if stop:
            prompt = f"{prompt}\nStop tokens: {', '.join(stop)}"
        result = self._provider.generate(prompt, system_prompt=self._system_prompt)
        return result["content"]


class ReActAgent:
    def __init__(
        self,
        llm: LLMProvider,
        tools: list[Any],
        max_steps: int = 6,
    ):
        self.llm = llm
        self.raw_tools = {tool.name: tool for tool in tools}
        self.max_steps = max_steps

    def run(
        self,
        user_input: str,
        session_state: dict[str, Any],
        employee_id: str = "current_user",
        role: str = "employee",
        history: list[dict[str, str]] | None = None,
    ) -> dict[str, Any]:
        logger.log_event("AGENT_START", {"input": user_input, "model": self.llm.model_name})
        trace: list[dict[str, Any]] = []
        start = time.time()

        if self._is_confirmation(user_input) and session_state.get("pending_action"):
            answer = self._execute_pending_action(session_state, trace)
            return self._build_result(answer, trace, start)

        system_prompt = self._system_prompt(employee_id=employee_id, role=role)
        lc_llm = ProviderLangChainLLM(self.llm, system_prompt)
        lc_tools = self._build_langchain_tools(session_state, role, trace)
        agent = create_react_agent(lc_llm, lc_tools, self._prompt_template())
        executor = AgentExecutor(
            agent=agent,
            tools=lc_tools,
            max_iterations=self.max_steps,
            handle_parsing_errors=True,
            return_intermediate_steps=True,
            verbose=False,
        )

        result = executor.invoke(
            {
                "input": self._build_user_prompt(user_input, employee_id, history),
                "chat_history": self._format_history(history),
            }
        )
        for action, observation in result.get("intermediate_steps", []):
            trace.append(
                {
                    "tool": action.tool,
                    "args": action.tool_input,
                    "observation": observation,
                }
            )
        answer = result.get("output", "")
        requires_confirmation = bool(session_state.get("pending_action"))

        logger.log_event(
            "AGENT_END",
            {"answer": answer, "requires_confirmation": requires_confirmation},
        )
        return self._build_result(answer, trace, start, requires_confirmation)

    def _build_langchain_tools(
        self,
        session_state: dict[str, Any],
        role: str,
        trace: list[dict[str, Any]],
    ) -> list[Tool]:
        tools = []
        for tool_name, raw_tool in self.raw_tools.items():
            tools.append(
                Tool.from_function(
                    name=tool_name,
                    description=(
                        f"{raw_tool.description} Input must be a JSON object string."
                    ),
                    func=self._tool_runner(tool_name, session_state, role, trace),
                )
            )
        return tools

    def _tool_runner(
        self,
        tool_name: str,
        session_state: dict[str, Any],
        role: str,
        trace: list[dict[str, Any]],
    ):
        def run(tool_input: str) -> str:
            args = self._parse_tool_input(tool_input)
            if tool_name in HR_ADMIN_TOOLS and role != "hr_admin":
                observation = {
                    "error": "FORBIDDEN",
                    "message": "Bạn cần quyền hr_admin để thực hiện thao tác này.",
                }
                trace.append({"tool": tool_name, "blocked": "FORBIDDEN", "args": args})
                return json.dumps(observation, ensure_ascii=False)

            if tool_name in WRITE_TOOLS:
                session_state["pending_action"] = {"tool": tool_name, "args": args}
                observation = {
                    "requires_confirmation": True,
                    "message": self._confirmation_message(tool_name, args),
                }
                trace.append(
                    {
                        "tool": tool_name,
                        "pending_confirmation": True,
                        "args": args,
                    }
                )
                logger.log_event("AGENT_WAITING_CONFIRMATION", session_state["pending_action"])
                return json.dumps(observation, ensure_ascii=False)

            observation = self.raw_tools[tool_name].invoke(args)
            logger.log_event(
                "AGENT_TOOL",
                {"tool": tool_name, "args": args, "observation": observation},
            )
            return json.dumps(observation, ensure_ascii=False)

        return run

    def _execute_pending_action(
        self,
        session_state: dict[str, Any],
        trace: list[dict[str, Any]],
    ) -> str:
        pending = session_state.pop("pending_action")
        observation = self.raw_tools[pending["tool"]].invoke(pending["args"])
        trace.append(
            {
                "tool": pending["tool"],
                "args": pending["args"],
                "observation": observation,
                "confirmed": True,
            }
        )
        logger.log_event("AGENT_TOOL", trace[-1])
        if isinstance(observation, dict) and observation.get("error"):
            return observation.get("message", "Thao tác không thành công.")
        if pending["tool"] == "Create_Leave_Request":
            return (
                f"Mình đã tạo xong đơn xin nghỉ cho bạn (Mã đơn: "
                f"{observation.get('request_id')}). Trạng thái: {observation.get('status')}."
            )
        if pending["tool"] == "Cancel_Leave_Request":
            return f"Mình đã hủy đơn {observation.get('request_id')}."
        if pending["tool"] == "Update_Leave_Request":
            return f"Mình đã cập nhật đơn {observation.get('request_id')}."
        if pending["tool"] == "Create_Employee":
            return f"Mình đã tạo hồ sơ nhân viên {observation.get('employee_id')}."
        return "Mình đã thực hiện xong thay đổi theo xác nhận của bạn."

    def _prompt_template(self) -> PromptTemplate:
        return PromptTemplate.from_template(
            """Answer in Vietnamese. You have access to these tools:

{tools}

Use this format:

Question: the input question
Thought: what you should do next
Action: one of [{tool_names}]
Action Input: a JSON object string
Observation: the result of the action
... repeat Thought/Action/Action Input/Observation as needed
Thought: I now know the final answer
Final Answer: the final answer in Vietnamese

Important:
- If an Observation says requires_confirmation=true, return that message as the Final Answer.
- Do not call write tools again after a confirmation-required Observation.

Previous conversation:
{chat_history}

Question: {input}
Thought:{agent_scratchpad}"""
        )

    def _system_prompt(self, employee_id: str, role: str) -> str:
        return f"""You are Proactive HR & Workflow Agent.
Current employee_id: {employee_id}
Current role: {role}

Rules:
- Do not invent HR policy, employee profile, leave balance, or leave-request status.
- Use tools when the answer depends on HR policy, employee profile, leave balance,
  or leave-request workflow.
- Ask for explicit confirmation before creating, updating, or cancelling a leave
  request or employee profile.
- Only hr_admin can create, update, deactivate, activate employees, or update leave balances.
- If the user confirms a previously proposed write action, reuse pending action details.
- Return Final Answer when no more tool calls are needed."""

    def _build_user_prompt(
        self,
        user_input: str,
        employee_id: str,
        history: list[dict[str, str]] | None,
    ) -> str:
        return f"User employee_id: {employee_id}\nUser message: {user_input}"

    def _format_history(self, history: list[dict[str, str]] | None) -> str:
        if not history:
            return ""
        return "\n".join(
            f"User: {item['user']}\nAssistant: {item['assistant']}" for item in history[-6:]
        )

    def _parse_tool_input(self, tool_input: str) -> dict[str, Any]:
        if isinstance(tool_input, dict):
            return tool_input
        try:
            return json.loads(tool_input)
        except json.JSONDecodeError:
            return {}

    def _confirmation_message(self, tool_name: str, args: dict[str, Any]) -> str:
        payload = json.dumps(args, ensure_ascii=False)
        if tool_name == "Create_Leave_Request":
            return (
                "Mình sẽ tạo đơn xin nghỉ với thông tin "
                f"{payload}. Bạn xác nhận tạo đơn này không?"
            )
        if tool_name == "Update_Leave_Request":
            return f"Mình sẽ cập nhật đơn xin nghỉ với thông tin {payload}. Bạn xác nhận không?"
        if tool_name == "Cancel_Leave_Request":
            return f"Mình sẽ hủy đơn xin nghỉ với thông tin {payload}. Bạn xác nhận không?"
        return f"Mình sẽ thực hiện thao tác {tool_name} với thông tin {payload}. Bạn xác nhận không?"

    def _is_confirmation(self, user_input: str) -> bool:
        normalized = user_input.strip().lower()
        return any(word in normalized for word in CONFIRMATION_WORDS)

    def _build_result(
        self,
        answer: str,
        trace: list[dict[str, Any]],
        start: float,
        requires_confirmation: bool = False,
    ) -> dict[str, Any]:
        latency_ms = int((time.time() - start) * 1000)
        return {
            "content": answer,
            "trace": trace,
            "requires_confirmation": requires_confirmation,
            "latency_ms": latency_ms,
            "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
            "provider": self.llm.__class__.__name__.replace("Provider", "").lower(),
        }
