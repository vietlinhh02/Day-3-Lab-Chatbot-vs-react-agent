from typing import Any

from app.agent.react_agent import ReActAgent
from app.core.llm_provider import LLMProvider


class FakeProvider(LLMProvider):
    def __init__(self, responses: list[str]):
        super().__init__("fake-model")
        self._responses = responses
        self.prompts: list[str] = []

    def generate(self, prompt: str, system_prompt: str | None = None) -> dict[str, Any]:
        self.prompts.append(prompt)
        if not self._responses:
            raise AssertionError("No fake response left for generate()")
        return {
            "content": self._responses.pop(0),
            "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
            "latency_ms": 0,
            "provider": "fake",
        }

    def stream(self, prompt: str, system_prompt: str | None = None):
        yield prompt


class FakeTool:
    def __init__(self, name: str, observation: dict[str, Any]):
        self.name = name
        self.description = f"Fake tool {name}"
        self._observation = observation
        self.calls: list[dict[str, Any]] = []

    def invoke(self, args: dict[str, Any]) -> dict[str, Any]:
        self.calls.append(args)
        return self._observation


def test_react_agent_finishes_after_tool_observation():
    provider = FakeProvider(
        [
            'Thought: Cần kiểm tra phép.\nAction: Check_Leave_Balance\n'
            'Action Input: {"employee_id": "E001"}',
            "Thought: Đã đủ dữ liệu.\nFinal Answer: Bạn còn 4 ngày phép năm và 5 ngày phép ốm.",
        ]
    )
    tool = FakeTool(
        "Check_Leave_Balance",
        {
            "ok": True,
            "employee_id": "E001",
            "annual_leave_remaining": 4,
            "sick_leave_remaining": 5,
        },
    )
    agent = ReActAgent(llm=provider, tools=[tool], max_steps=3)

    result = agent.run("Kiểm tra số ngày phép còn lại", session_state={}, employee_id="E001")

    assert result["content"] == "Bạn còn 4 ngày phép năm và 5 ngày phép ốm."
    assert tool.calls == [{"employee_id": "E001"}]
    assert len(provider.prompts) == 2
    assert '"annual_leave_remaining": 4' in provider.prompts[1]
    assert result["trace"][0]["tool"] == "Check_Leave_Balance"
    assert result["trace"][0]["observation"]["annual_leave_remaining"] == 4


def test_react_agent_returns_confirmation_message_for_write_tools():
    provider = FakeProvider(
        [
            'Thought: Cần tạo đơn nghỉ.\nAction: Create_Leave_Request\n'
            'Action Input: {"employee_id": "E001", "type": "annual_leave", '
            '"start_date": "2026-06-02", "end_date": "2026-06-02", "reason": "Việc riêng"}'
        ]
    )
    tool = FakeTool("Create_Leave_Request", {"ok": True})
    session_state: dict[str, Any] = {}
    agent = ReActAgent(llm=provider, tools=[tool], max_steps=2)

    result = agent.run("Tạo đơn nghỉ ngày mai", session_state=session_state, employee_id="E001")

    assert result["requires_confirmation"] is True
    assert result["content"] == "Tạo đơn nghỉ: annual_leave từ 2026-06-02 đến 2026-06-02. Xác nhận?"
    assert session_state["pending_action"]["tool"] == "Create_Leave_Request"
    assert tool.calls == []


def test_execute_pending_action_returns_tool_error_message():
    provider = FakeProvider([])
    tool = FakeTool(
        "Create_Employee",
        {
            "ok": False,
            "trace_id": "trace-test",
            "error_code": "EMPLOYEE_NOT_FOUND",
            "message": "Employee not found: 001",
        },
    )
    session_state: dict[str, Any] = {
        "pending_action": {
            "tool": "Create_Employee",
            "args": {
                "actor_employee_id": "HR001",
                "full_name": "Viết Linh",
                "email": "nvlinhh@gmail.com",
                "role": "manager",
                "department": "an",
                "position": "sếp",
                "manager_id": "001",
                "annual_leave_remaining": 5,
                "sick_leave_remaining": 3,
                "confirmed": True,
            },
        }
    }
    agent = ReActAgent(llm=provider, tools=[tool], max_steps=2)

    result = agent.run("xác nhận", session_state=session_state, employee_id="HR001", role="hr_admin")

    assert result["content"] == "Employee not found: 001"
    assert session_state == {}
    assert result["trace"][0]["confirmed"] is True
