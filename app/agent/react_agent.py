import json
import ast
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
    "Create_Task",
    "Update_Task",
    "Delete_Task",
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
    "ok",
    "duoc",
    "được",
    "chap nhan",
    "chấp nhận",
}


TOOL_DESCRIPTIONS = {
    "Search_HR_Policy": (
        "Tìm kiếm chính sách nhân sự trong sổ tay công ty. "
        "Sử dụng khi người dùng hỏi về quy định, chính sách, quy trình HR. "
        "Input: {\"query\": \"câu hỏi về chính sách\", \"top_k\": 3}"
    ),
    "Check_Leave_Balance": (
        "Kiểm tra số ngày phép còn lại của nhân viên (phép năm, phép ốm). "
        "Sử dụng khi người dùng hỏi về ngày phép hoặc trước khi tạo đơn xin nghỉ. "
        "Input: {\"employee_id\": \"E001\" hoặc \"current_user\"}"
    ),
    "Calculate_Leave_Days": (
        "Tính số ngày nghỉ (bao gồm ngày làm việc, cuối tuần) cho một khoảng thời gian. "
        "Sử dụng trước khi tạo đơn để thông báo số ngày thực tế. "
        "Input: {\"employee_id\": \"E001\", \"start_date\": \"2026-06-08\", \"end_date\": \"2026-06-09\"}"
    ),
    "Create_Leave_Request": (
        "Tạo đơn xin nghỉ phép mới. PHẢI hỏi xác nhận trước khi gọi. "
        "Các loại nghỉ: sick_leave (ốm), annual_leave (phép năm), unpaid_leave (không lương). "
        "Input: {\"employee_id\": \"E001\", \"type\": \"sick_leave\", "
        "\"start_date\": \"2026-06-08\", \"end_date\": \"2026-06-09\", "
        "\"reason\": \"Sốt cao\", \"confirmed\": true}"
    ),
    "Get_Leave_Request": (
        "Xem chi tiết một đơn xin nghỉ theo mã đơn. "
        "Input: {\"request_id\": \"LR-1024\"}"
    ),
    "List_Leave_Requests": (
        "Liệt kê danh sách đơn xin nghỉ của nhân viên, có thể lọc theo trạng thái. "
        "Trạng thái: draft, submitted, approved, rejected, cancelled, all. "
        "Input: {\"employee_id\": \"E001\", \"status\": \"all\"}"
    ),
    "Update_Leave_Request": (
        "Cập nhật đơn xin nghỉ (ngày, lý do, loại nghỉ). "
        "Chỉ sửa được đơn ở trạng thái draft hoặc submitted. PHẢI hỏi xác nhận. "
        "Input: {\"request_id\": \"LR-1024\", \"patch\": {\"end_date\": \"2026-06-10\"}, \"confirmed\": true}"
    ),
    "Cancel_Leave_Request": (
        "Hủy đơn xin nghỉ phép. Chỉ hủy được đơn ở trạng thái draft hoặc submitted. PHẢI hỏi xác nhận. "
        "Input: {\"request_id\": \"LR-1024\", \"reason\": \"Đã khỏi bệnh\", \"confirmed\": true}"
    ),
    "Create_Employee": (
        "Tạo hồ sơ nhân viên mới. Chỉ HR admin được phép. PHẢI hỏi xác nhận. "
        "Input: {\"actor_employee_id\": \"HR001\", \"full_name\": \"Nguyễn Văn An\", "
        "\"email\": \"an@example.com\", \"role\": \"employee\", "
        "\"department\": \"Engineering\", \"position\": \"Backend Developer\", "
        "\"manager_id\": \"M001\", \"annual_leave_remaining\": 12, "
        "\"sick_leave_remaining\": 5, \"confirmed\": true}"
    ),
    "Get_Employee": (
        "Xem hồ sơ nhân viên. Nhân viên chỉ xem được hồ sơ của mình, "
        "manager xem được nhân viên trong team, HR xem được tất cả. "
        "Input: {\"actor_employee_id\": \"current_user\", \"employee_id\": \"E001\"}"
    ),
    "Search_Employees": (
        "Tìm kiếm nhân viên theo tên, email, phòng ban hoặc trạng thái. "
        "Chỉ manager và HR admin được phép. "
        "Input: {\"actor_employee_id\": \"HR001\", \"query\": \"An\", "
        "\"department\": \"Engineering\", \"status\": \"active\"}"
    ),
    "Update_Employee": (
        "Cập nhật hồ sơ nhân viên (tên, email, role, phòng ban, vị trí, quản lý). "
        "Chỉ HR admin được phép. PHẢI hỏi xác nhận. "
        "Input: {\"actor_employee_id\": \"HR001\", \"employee_id\": \"E001\", "
        "\"patch\": {\"position\": \"Senior Developer\"}, \"confirmed\": true}"
    ),
    "Deactivate_Employee": (
        "Khóa tài khoản nhân viên (chuyển trạng thái inactive). "
        "Chỉ HR admin được phép. PHẢI hỏi xác nhận. "
        "Input: {\"actor_employee_id\": \"HR001\", \"employee_id\": \"E001\", "
        "\"reason\": \"Nghỉ việc\", \"confirmed\": true}"
    ),
    "Activate_Employee": (
        "Mở khóa tài khoản nhân viên (chuyển trạng thái active). "
        "Chỉ HR admin được phép. PHẢI hỏi xác nhận. "
        "Input: {\"actor_employee_id\": \"HR001\", \"employee_id\": \"E001\", "
        "\"reason\": \"Quay lại làm việc\", \"confirmed\": true}"
    ),
    "Update_Leave_Balance": (
        "Cập nhật số ngày phép năm và phép ốm của nhân viên. "
        "Chỉ HR admin được phép. PHẢI hỏi xác nhận. "
        "Input: {\"actor_employee_id\": \"HR001\", \"employee_id\": \"E001\", "
        "\"annual_leave_remaining\": 10, \"sick_leave_remaining\": 5, "
        "\"reason\": \"Điều chỉnh theo hợp đồng mới\", \"confirmed\": true}"
    ),
    "Create_Task": (
        "Tạo công việc mới. PHẢI hỏi xác nhận. "
        "Input: {\"actor_employee_id\": \"E001\", \"title\": \"Cập nhật chính sách\", "
        "\"description\": \"Mô tả chi tiết\", \"priority\": \"high\", "
        "\"assignee_id\": \"E002\", \"due_date\": \"2026-06-15\", "
        "\"tags\": [\"HR\", \"Chính sách\"], \"confirmed\": true}"
    ),
    "Get_Task": (
        "Xem chi tiết công việc theo mã. "
        "Input: {\"task_id\": \"T-001\"}"
    ),
    "List_Tasks": (
        "Liệt kê công việc, lọc theo người phụ trách hoặc trạng thái. "
        "Trạng thái: todo, in_progress, review, done, all. "
        "Input: {\"assignee_id\": \"E001\", \"status\": \"all\", \"limit\": 50}"
    ),
    "Update_Task": (
        "Cập nhật công việc (tiêu đề, trạng thái, ưu tiên, người phụ trách, hạn). "
        "Chỉ sửa được công việc chưa hoàn thành. PHẢI hỏi xác nhận. "
        "Input: {\"task_id\": \"T-001\", \"patch\": {\"status\": \"in_progress\", \"priority\": \"high\"}, "
        "\"actor_employee_id\": \"E001\", \"confirmed\": true}"
    ),
    "Delete_Task": (
        "Xóa công việc. PHẢI hỏi xác nhận. "
        "Input: {\"task_id\": \"T-001\", \"reason\": \"Không cần thiết nữa\", "
        "\"actor_employee_id\": \"E001\", \"confirmed\": true}"
    ),
    "Search_Tasks": (
        "Tìm kiếm công việc theo từ khóa, trạng thái, ưu tiên, người phụ trách. "
        "Input: {\"query\": \"chính sách\", \"status\": \"all\", \"priority\": \"high\", "
        "\"assignee_id\": \"\", \"limit\": 50}"
    ),
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

        # Handle simple greetings directly without agent loop
        if self._is_simple_greeting(user_input):
            answer = self._generate_simple_response(user_input, employee_id)
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
            description = TOOL_DESCRIPTIONS.get(tool_name, raw_tool.description)
            tools.append(
                Tool.from_function(
                    name=tool_name,
                    description=description,
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
                f"Mình đã tạo xong đơn xin nghỉ cho bạn.\n\n"
                f"**Mã đơn:** {observation.get('request_id')}\n"
                f"**Trạng thái:** {observation.get('status')}\n"
                f"**Số ngày làm việc:** {observation.get('working_days')}\n\n"
                f"Đơn đã được gửi đến quản lý trực tiếp."
            )
        if pending["tool"] == "Cancel_Leave_Request":
            return f"Mình đã hủy đơn {observation.get('request_id')} thành công."
        if pending["tool"] == "Update_Leave_Request":
            fields = observation.get("updated_fields", [])
            return (
                f"Mình đã cập nhật đơn {observation.get('request_id')}.\n"
                f"**Các trường đã sửa:** {', '.join(fields)}"
            )
        if pending["tool"] == "Create_Employee":
            emp = observation.get("item", {})
            return (
                f"Mình đã tạo hồ sơ nhân viên mới.\n\n"
                f"**Mã nhân viên:** {observation.get('employee_id')}\n"
                f"**Họ tên:** {emp.get('full_name')}\n"
                f"**Phòng ban:** {emp.get('department')}\n"
                f"**Vị trí:** {emp.get('position')}"
            )
        if pending["tool"] == "Update_Employee":
            fields = observation.get("updated_fields", [])
            return (
                f"Mình đã cập nhật hồ sơ nhân viên {observation.get('employee_id')}.\n"
                f"**Các trường đã sửa:** {', '.join(fields)}"
            )
        if pending["tool"] == "Deactivate_Employee":
            return f"Đã khóa tài khoản nhân viên {observation.get('employee_id')}."
        if pending["tool"] == "Activate_Employee":
            return f"Đã mở khóa tài khoản nhân viên {observation.get('employee_id')}."
        if pending["tool"] == "Update_Leave_Balance":
            return (
                f"Đã cập nhật ngày phép cho nhân viên {observation.get('employee_id')}.\n"
                f"**Phép năm:** {observation.get('annual_leave_remaining')}\n"
                f"**Phép ốm:** {observation.get('sick_leave_remaining')}"
            )
        if pending["tool"] == "Create_Task":
            item = observation.get("item", {})
            return (
                f"Mình đã tạo công việc mới.\n\n"
                f"**Mã công việc:** {item.get('task_id')}\n"
                f"**Tiêu đề:** {item.get('title')}\n"
                f"**Người phụ trách:** {item.get('assignee_id')}\n"
                f"**Hạn:** {item.get('due_date')}\n"
                f"**Trạng thái:** {item.get('status')}"
            )
        if pending["tool"] == "Update_Task":
            fields = observation.get("updated_fields", [])
            return (
                f"Mình đã cập nhật công việc {observation.get('task_id')}.\n"
                f"**Các trường đã sửa:** {', '.join(fields)}"
            )
        if pending["tool"] == "Delete_Task":
            return f"Mình đã xóa công việc {observation.get('task_id')} thành công."
        return "Mình đã thực hiện xong thay đổi theo xác nhận của bạn."

    def _prompt_template(self) -> PromptTemplate:
        return PromptTemplate.from_template(
            """Bạn là trợ lý HR AI. Trả lời bằng tiếng Việt có dấu.

Bạn có các công cụ sau:
{tools}

Định dạng bắt buộc:

Question: câu hỏi của người dùng
Thought: suy nghĩ về bước tiếp theo
Action: một trong [{tool_names}]
Action Input: chuỗi JSON
Observation: kết quả từ công cụ
... lặp lại Thought/Action/Action Input/Observation nếu cần
Thought: Tôi đã có đủ thông tin để trả lời
Final Answer: câu trả lời cuối cùng bằng tiếng Việt

Quy tắc quan trọng:
- Nếu Observation có requires_confirmation=true, trả về message đó làm Final Answer.
- Không gọi công cụ ghi sau khi nhận được yêu cầu xác nhận.
- Luôn sử dụng tools khi câu hỏi liên quan đến chính sách, nhân viên, phép nghỉ.
- Không tự suy đoán thông tin, phải dùng tools để lấy dữ liệu thực.
- Khi người dùng xác nhận (có, đồng ý, ok...), thực hiện pending_action đã lưu.

Cuộc trò chuyện trước:
{chat_history}

Question: {input}
Thought:{agent_scratchpad}"""
        )

    def _system_prompt(self, employee_id: str, role: str) -> str:
        return f"""Bạn là Proactive HR & Workflow Agent - trợ lý AI quản lý nhân sự.

Thông tin người dùng hiện tại:
- Mã nhân viên: {employee_id}
- Vai trò: {role}

Nhiệm vụ:
1. Trả lời câu hỏi về chính sách nhân sự (nghỉ phép, quy định, quy trình)
2. Kiểm tra và thông báo số ngày phép còn lại
3. Tạo, xem, sửa, hủy đơn xin nghỉ phép
4. Quản lý hồ sơ nhân viên (tạo, xem, tìm kiếm, cập nhật, khóa/mở khóa)
5. Cập nhật số ngày phép cho nhân viên

Quy tắc bắt buộc:
- KHÔNG tự bịa thông tin về chính sách, hồ sơ nhân viên, ngày phép hoặc trạng thái đơn.
- PHẢI dùng tools khi câu hỏi liên quan đến dữ liệu nhân sự.
- PHẢI hỏi xác nhận trước khi thực hiện thao tác ghi (tạo, sửa, hủy).
- Chỉ hr_admin mới được tạo, sửa, khóa/mở khóa nhân viên và cập nhật ngày phép.
- Nếu người dùng xác nhận thao tác trước đó, thực hiện pending_action đã lưu.
- Trả lời Final Answer khi không cần gọi thêm tools nào nữa.
- Nếu RAG không tìm thấy chính sách, nói rõ không tìm thấy thay vì tự suy đoán.

Phát hiện xác nhận:
Các từ xác nhận: có, đồng ý, đúng rồi, tạo đi, hủy đi, sửa đi, ok, được, chấp nhận."""

    def _build_user_prompt(
        self,
        user_input: str,
        employee_id: str,
        history: list[dict[str, str]] | None,
    ) -> str:
        return f"Mã nhân viên: {employee_id}\nTin nhắn: {user_input}"

    def _format_history(self, history: list[dict[str, str]] | None) -> str:
        if not history:
            return ""
        return "\n".join(
            f"Người dùng: {item['user']}\nTrợ lý: {item['assistant']}" for item in history[-6:]
        )

    def _parse_tool_input(self, tool_input: str) -> dict[str, Any]:
        if isinstance(tool_input, dict):
            return tool_input
        try:
            return json.loads(tool_input)
        except json.JSONDecodeError:
            try:
                parsed = ast.literal_eval(tool_input)
            except (ValueError, SyntaxError):
                return {}
            return parsed if isinstance(parsed, dict) else {}

    def _confirmation_message(self, tool_name: str, args: dict[str, Any]) -> str:
        if tool_name == "Create_Leave_Request":
            return (
                f"Mình sẽ tạo đơn xin nghỉ với thông tin:\n"
                f"- Loại nghỉ: {args.get('type', '')}\n"
                f"- Từ ngày: {args.get('start_date', '')}\n"
                f"- Đến ngày: {args.get('end_date', '')}\n"
                f"- Lý do: {args.get('reason', '')}\n\n"
                f"Bạn xác nhận tạo đơn này không?"
            )
        if tool_name == "Update_Leave_Request":
            patch = args.get("patch", {})
            changes = "\n".join(f"- {k}: {v}" for k, v in patch.items())
            return f"Mình sẽ cập nhật đơn {args.get('request_id', '')}:\n{changes}\n\nBạn xác nhận không?"
        if tool_name == "Cancel_Leave_Request":
            return (
                f"Mình sẽ hủy đơn {args.get('request_id', '')}.\n"
                f"Lý do: {args.get('reason', '')}\n\n"
                f"Bạn xác nhận hủy đơn này không?"
            )
        if tool_name == "Create_Employee":
            return (
                f"Mình sẽ tạo hồ sơ nhân viên mới:\n"
                f"- Họ tên: {args.get('full_name', '')}\n"
                f"- Email: {args.get('email', '')}\n"
                f"- Phòng ban: {args.get('department', '')}\n"
                f"- Vị trí: {args.get('position', '')}\n"
                f"- Quản lý: {args.get('manager_id', 'Không có')}\n\n"
                f"Bạn xác nhận tạo hồ sơ này không?"
            )
        if tool_name == "Update_Employee":
            patch = args.get("patch", {})
            changes = "\n".join(f"- {k}: {v}" for k, v in patch.items())
            return f"Mình sẽ cập nhật hồ sơ nhân viên {args.get('employee_id', '')}:\n{changes}\n\nBạn xác nhận không?"
        if tool_name == "Deactivate_Employee":
            return (
                f"Mình sẽ khóa tài khoản nhân viên {args.get('employee_id', '')}.\n"
                f"Lý do: {args.get('reason', '')}\n\n"
                f"Bạn xác nhận khóa tài khoản này không?"
            )
        if tool_name == "Activate_Employee":
            return (
                f"Mình sẽ mở khóa tài khoản nhân viên {args.get('employee_id', '')}.\n"
                f"Lý do: {args.get('reason', '')}\n\n"
                f"Bạn xác nhận mở khóa tài khoản này không?"
            )
        if tool_name == "Update_Leave_Balance":
            return (
                f"Mình sẽ cập nhật ngày phép cho nhân viên {args.get('employee_id', '')}:\n"
                f"- Phép năm: {args.get('annual_leave_remaining', '')}\n"
                f"- Phép ốm: {args.get('sick_leave_remaining', '')}\n"
                f"- Lý do: {args.get('reason', '')}\n\n"
                f"Bạn xác nhận cập nhật không?"
            )
        if tool_name == "Create_Task":
            return (
                f"Mình sẽ tạo công việc mới:\n"
                f"- Tiêu đề: {args.get('title', '')}\n"
                f"- Mô tả: {args.get('description', 'Không có')}\n"
                f"- Ưu tiên: {args.get('priority', '')}\n"
                f"- Người phụ trách: {args.get('assignee_id', '')}\n"
                f"- Hạn: {args.get('due_date', '')}\n"
                f"- Nhãn: {', '.join(args.get('tags', []))}\n\n"
                f"Bạn xác nhận tạo công việc này không?"
            )
        if tool_name == "Update_Task":
            patch = args.get("patch", {})
            changes = "\n".join(f"- {k}: {v}" for k, v in patch.items())
            return f"Mình sẽ cập nhật công việc {args.get('task_id', '')}:\n{changes}\n\nBạn xác nhận không?"
        if tool_name == "Delete_Task":
            return (
                f"Mình sẽ xóa công việc {args.get('task_id', '')}.\n"
                f"Lý do: {args.get('reason', '')}\n\n"
                f"Bạn xác nhận xóa công việc này không?"
            )
        payload = json.dumps(args, ensure_ascii=False)
        return f"Mình sẽ thực hiện thao tác {tool_name} với thông tin {payload}. Bạn xác nhận không?"

    def _is_simple_greeting(self, user_input: str) -> bool:
        greetings = {"hi", "hello", "hey", "xin chào", "chào", "chào bạn", "alo", "yo", "hế lô"}
        normalized = user_input.strip().lower()
        return normalized in greetings

    def _generate_simple_response(self, user_input: str, employee_id: str) -> str:
        system = "Bạn là trợ lý HR AI. Trả lời ngắn gọn bằng tiếng Việt có dấu."
        prompt = f"Người dùng (mã NV: {employee_id}) nói: {user_input}\n\nHãy chào lại và hỏi bạn có thể giúp gì."
        result = self.llm.generate(prompt, system_prompt=system)
        return result["content"]

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
