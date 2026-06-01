import ast
import json
import re
import time
from typing import Any

from app.core.llm_provider import LLMProvider
from app.telemetry.logger import logger


WRITE_TOOLS = {
    "Create_Leave_Request", "Update_Leave_Request", "Cancel_Leave_Request",
    "Create_Employee", "Update_Employee", "Deactivate_Employee",
    "Activate_Employee", "Update_Leave_Balance", "Create_Task", "Update_Task", "Delete_Task",
}

HR_ADMIN_TOOLS = {
    "Create_Employee", "Update_Employee", "Deactivate_Employee",
    "Activate_Employee", "Update_Leave_Balance",
}

CONFIRMATION_WORDS = {
    "co", "có", "xac nhan", "xác nhận", "dong y", "đồng ý",
    "dung roi", "đúng rồi", "tao di", "tạo đi", "huy di", "hủy đi",
    "sua di", "sửa đi", "ok", "duoc", "được", "chap nhan", "chấp nhận",
}

TOOL_DESCRIPTIONS = {
    "Search_HR_Policy": "Tìm chính sách HR. Input: {\"query\": string}",
    "Check_Leave_Balance": "Xem ngày phép còn lại. Input: {\"employee_id\": string}",
    "Calculate_Leave_Days": "Tính số ngày nghỉ. Input: {\"employee_id\": string, \"start_date\": string, \"end_date\": string}",
    "Create_Leave_Request": "Tạo đơn nghỉ (cần xác nhận). Input: {\"employee_id\": string, \"type\": string, \"start_date\": string, \"end_date\": string, \"reason\": string, \"confirmed\": true}",
    "Get_Leave_Request": "Xem chi tiết đơn. Input: {\"request_id\": string}",
    "List_Leave_Requests": "Liệt kê đơn nghỉ. Input: {\"employee_id\": string, \"status\": string}",
    "Update_Leave_Request": "Sửa đơn (cần xác nhận). Input: {\"request_id\": string, \"patch\": object, \"confirmed\": true}",
    "Cancel_Leave_Request": "Hủy đơn (cần xác nhận). Input: {\"request_id\": string, \"reason\": string, \"confirmed\": true}",
    "Create_Employee": "Tạo nhân viên (HR only). Input: {\"actor_employee_id\": string, \"full_name\": string, \"email\": string, \"role\": string, \"department\": string, \"position\": string, \"manager_id\": string, \"annual_leave_remaining\": int, \"sick_leave_remaining\": int, \"confirmed\": true}",
    "Get_Employee": "Xem hồ sơ nhân viên. Input: {\"actor_employee_id\": string, \"employee_id\": string}",
    "Search_Employees": "Tìm nhân viên (manager/HR). Input: {\"actor_employee_id\": string, \"query\": string}",
    "Update_Employee": "Sửa hồ sơ (HR only). Input: {\"actor_employee_id\": string, \"employee_id\": string, \"patch\": object, \"confirmed\": true}",
    "Deactivate_Employee": "Khóa TK (HR only). Input: {\"actor_employee_id\": string, \"employee_id\": string, \"reason\": string, \"confirmed\": true}",
    "Activate_Employee": "Mở khóa TK (HR only). Input: {\"actor_employee_id\": string, \"employee_id\": string, \"reason\": string, \"confirmed\": true}",
    "Update_Leave_Balance": "Cập nhật phép (HR only). Input: {\"actor_employee_id\": string, \"employee_id\": string, \"annual_leave_remaining\": int, \"sick_leave_remaining\": int, \"reason\": string, \"confirmed\": true}",
    "Create_Task": "Tạo task (cần xác nhận). Input: {\"actor_employee_id\": string, \"title\": string, \"assignee_id\": string, \"due_date\": string, \"confirmed\": true}",
    "Get_Task": "Xem chi tiết task. Input: {\"task_id\": string}",
    "List_Tasks": "Liệt kê task. Input: {\"assignee_id\": string, \"status\": string}",
    "Update_Task": "Sửa task (cần xác nhận). Input: {\"task_id\": string, \"patch\": object, \"actor_employee_id\": string, \"confirmed\": true}",
    "Delete_Task": "Xóa task (cần xác nhận). Input: {\"task_id\": string, \"reason\": string, \"actor_employee_id\": string, \"confirmed\": true}",
    "Search_Tasks": "Tìm task. Input: {\"query\": string}",
}


class ReActAgent:
    def __init__(self, llm: LLMProvider, tools: list[Any], max_steps: int = 6):
        self.llm = llm
        self.raw_tools = {tool.name: tool for tool in tools}
        self.max_steps = max_steps

    def run(self, user_input: str, session_state: dict[str, Any],
            employee_id: str = "current_user", role: str = "employee",
            history: list[dict[str, str]] | None = None) -> dict[str, Any]:
        logger.log_event("AGENT_START", {"input": user_input, "model": self.llm.model_name})
        trace: list[dict[str, Any]] = []
        start = time.time()

        if self._is_confirmation(user_input) and session_state.get("pending_action"):
            answer = self._execute_pending_action(session_state, trace)
            return self._build_result(answer, trace, start)

        if self._is_simple_greeting(user_input):
            answer = self._generate_simple_response(user_input, employee_id)
            return self._build_result(answer, trace, start)

        answer = self._run_react_loop(
            user_input=user_input,
            session_state=session_state,
            employee_id=employee_id,
            role=role,
            history=history,
            trace=trace,
        )
        requires_confirmation = bool(session_state.get("pending_action"))

        logger.log_event("AGENT_END", {"answer": answer, "requires_confirmation": requires_confirmation})
        return self._build_result(answer, trace, start, requires_confirmation)

    def _run_react_loop(
        self,
        user_input: str,
        session_state: dict[str, Any],
        employee_id: str,
        role: str,
        history: list[dict[str, str]] | None,
        trace: list[dict[str, Any]],
    ) -> str:
        scratchpad = ""
        for step in range(1, self.max_steps + 1):
            prompt = self._build_react_prompt(
                user_input=user_input,
                employee_id=employee_id,
                history=history,
                scratchpad=scratchpad,
            )
            result = self.llm.generate(
                prompt,
                system_prompt=self._system_prompt(employee_id=employee_id, role=role),
            )
            content = (result.get("content") or "").strip()
            logger.log_event("AGENT_LLM", {"step": step, "content": content})

            parsed = self._parse_react_output(content)
            if parsed["final_answer"]:
                return parsed["final_answer"]

            if not parsed["action"]:
                scratchpad += (
                    "Thought: Tôi cần trả lời đúng format.\n"
                    "Observation: Sai format. Hãy trả lời bằng 'Action' hoặc 'Final Answer'.\n"
                )
                continue

            tool_name = parsed["action"]
            if tool_name not in self.raw_tools:
                scratchpad += (
                    f"Thought: Tool {tool_name} không hợp lệ.\n"
                    "Observation: Tool không tồn tại. Chọn tool trong danh sách.\n"
                )
                continue

            observation = self._tool_runner(tool_name, session_state, role, trace)(parsed["action_input"])
            scratchpad += self._format_scratchpad_step(parsed["thought"], tool_name, parsed["action_input"], observation)

            if session_state.get("pending_action"):
                payload = json.loads(observation)
                return payload.get("message", "Vui lòng xác nhận trước khi thực hiện.")

        return (
            "Tôi chưa thể hoàn tất yêu cầu vì model không kết thúc đúng vòng ReAct. "
            "Vui lòng thử lại."
        )

    def _tool_runner(self, tool_name: str, session_state: dict[str, Any],
                     role: str, trace: list[dict[str, Any]]):
        def run(tool_input: str) -> str:
            args = self._parse_tool_input(tool_input)
            if tool_name in HR_ADMIN_TOOLS and role != "hr_admin":
                observation = {"error": "FORBIDDEN", "message": "Bạn cần quyền hr_admin."}
                trace.append({"tool": tool_name, "blocked": "FORBIDDEN", "args": args})
                return json.dumps(observation, ensure_ascii=False)

            if tool_name in WRITE_TOOLS:
                session_state["pending_action"] = {"tool": tool_name, "args": args}
                observation = {"requires_confirmation": True, "message": self._confirmation_message(tool_name, args)}
                trace.append({"tool": tool_name, "pending_confirmation": True, "args": args})
                logger.log_event("AGENT_WAITING_CONFIRMATION", session_state["pending_action"])
                return json.dumps(observation, ensure_ascii=False)

            try:
                observation = self.raw_tools[tool_name].invoke(args)
            except Exception as e:
                observation = {"error": "TOOL_ERROR", "message": str(e)}
            trace.append({"tool": tool_name, "args": args, "observation": observation})
            logger.log_event("AGENT_TOOL", {"tool": tool_name, "args": args, "observation": observation})
            return json.dumps(observation, ensure_ascii=False)
        return run

    def _execute_pending_action(self, session_state: dict[str, Any], trace: list[dict[str, Any]]) -> str:
        pending = session_state.pop("pending_action")
        try:
            observation = self.raw_tools[pending["tool"]].invoke(pending["args"])
        except Exception as e:
            observation = {"error": "TOOL_ERROR", "message": str(e)}
        trace.append({"tool": pending["tool"], "args": pending["args"], "observation": observation, "confirmed": True})
        logger.log_event("AGENT_TOOL", trace[-1])

        if self._is_failed_observation(observation):
            return observation.get("message", "Thao tác không thành công.")

        tool = pending["tool"]
        if tool == "Create_Leave_Request":
            return f"Đã tạo đơn {observation.get('request_id')}. Trạng thái: {observation.get('status')}."
        if tool == "Cancel_Leave_Request":
            return f"Đã hủy đơn {observation.get('request_id')}."
        if tool == "Update_Leave_Request":
            return f"Đã cập nhật đơn {observation.get('request_id')}."
        if tool == "Create_Employee":
            return f"Đã tạo nhân viên {observation.get('employee_id')}."
        if tool == "Update_Employee":
            return f"Đã cập nhật nhân viên {observation.get('employee_id')}."
        if tool == "Deactivate_Employee":
            return f"Đã khóa TK nhân viên {observation.get('employee_id')}."
        if tool == "Activate_Employee":
            return f"Đã mở khóa TK nhân viên {observation.get('employee_id')}."
        if tool == "Update_Leave_Balance":
            return f"Đã cập nhật phép cho {observation.get('employee_id')}."
        if tool == "Create_Task":
            item = observation.get("item", {}) if isinstance(observation, dict) else {}
            return f"Đã tạo task {item.get('task_id', '')}: {item.get('title', '')}."
        if tool == "Update_Task":
            return f"Đã cập nhật task {observation.get('task_id', '') if isinstance(observation, dict) else ''}."
        if tool == "Delete_Task":
            return f"Đã xóa task {observation.get('task_id')}."
        return "Đã thực hiện xong."

    def _build_react_prompt(
        self,
        user_input: str,
        employee_id: str,
        history: list[dict[str, str]] | None,
        scratchpad: str,
    ) -> str:
        tool_lines = [
            f"- {tool_name}: {TOOL_DESCRIPTIONS.get(tool_name, raw_tool.description)}"
            for tool_name, raw_tool in self.raw_tools.items()
        ]
        return (
            "Bạn phải trả lời đúng một trong hai format dưới đây.\n\n"
            "Format 1:\n"
            "Thought: <lý do>\n"
            "Action: <tool_name>\n"
            "Action Input: <JSON object>\n\n"
            "Format 2:\n"
            "Thought: <lý do>\n"
            "Final Answer: <câu trả lời tiếng Việt>\n\n"
            "Tools:\n"
            f"{chr(10).join(tool_lines)}\n\n"
            "Quy tắc:\n"
            "- Sau khi đã có Observation đủ dùng, phải trả Final Answer.\n"
            "- Không được tự bịa dữ liệu HR, nhân viên, phép, task.\n"
            "- Nếu Observation có requires_confirmation=true, Final Answer phải chính là message đó.\n"
            "- Không được tạo Observation giả.\n\n"
            f"Chat history:\n{self._format_history(history) or '(trống)'}\n\n"
            f"Question:\n{self._build_user_prompt(user_input, employee_id, history)}\n\n"
            f"{scratchpad}"
        )

    def _system_prompt(self, employee_id: str, role: str) -> str:
        return f"""Bạn là trợ lý HR AI. NV: {employee_id}, Role: {role}.

Nhiệm vụ: Trả lời chính sách HR, kiểm tra phép, quản lý đơn nghỉ, nhân viên, task.

Rules:
- KHÔNG tự bịa thông tin. PHẢI dùng tools.
- PHẢI hỏi xác nhận trước khi ghi.
- Chỉ hr_admin mới quản lý nhân viên.
- Nếu không tìm thấy, nói rõ."""

    def _build_user_prompt(self, user_input: str, employee_id: str,
                           history: list[dict[str, str]] | None) -> str:
        return f"NV: {employee_id}\nTin nhắn: {user_input}"

    def _format_history(self, history: list[dict[str, str]] | None) -> str:
        if not history:
            return ""
        return "\n".join(f"User: {h['user']}\nAI: {h['assistant']}" for h in history[-4:])

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

    def _parse_react_output(self, content: str) -> dict[str, str]:
        thought_match = re.search(r"Thought:\s*(.*?)(?=\n(?:Action|Final Answer):|\Z)", content, re.DOTALL)
        action_match = re.search(r"Action:\s*([A-Za-z_][A-Za-z0-9_]*)", content)
        action_input_match = re.search(r"Action Input:\s*(\{.*\})", content, re.DOTALL)
        final_match = re.search(r"Final Answer:\s*(.*)", content, re.DOTALL)
        return {
            "thought": thought_match.group(1).strip() if thought_match else "",
            "action": action_match.group(1).strip() if action_match else "",
            "action_input": action_input_match.group(1).strip() if action_input_match else "{}",
            "final_answer": final_match.group(1).strip() if final_match else "",
        }

    def _is_failed_observation(self, observation: Any) -> bool:
        if not isinstance(observation, dict):
            return False
        if observation.get("error"):
            return True
        return observation.get("ok") is False

    def _format_scratchpad_step(
        self,
        thought: str,
        tool_name: str,
        action_input: str,
        observation: str,
    ) -> str:
        thought_text = thought or "Tôi cần dùng tool để lấy dữ liệu."
        return (
            f"Thought: {thought_text}\n"
            f"Action: {tool_name}\n"
            f"Action Input: {action_input}\n"
            f"Observation: {observation}\n\n"
        )

    def _confirmation_message(self, tool_name: str, args: dict[str, Any]) -> str:
        if tool_name == "Create_Leave_Request":
            return f"Tạo đơn nghỉ: {args.get('type')} từ {args.get('start_date')} đến {args.get('end_date')}. Xác nhận?"
        if tool_name == "Cancel_Leave_Request":
            return f"Hủy đơn {args.get('request_id')}. Xác nhận?"
        if tool_name == "Create_Task":
            return f"Tạo task: {args.get('title')}. Xác nhận?"
        if tool_name == "Delete_Task":
            return f"Xóa task {args.get('task_id')}. Xác nhận?"
        return f"Thực hiện {tool_name}. Xác nhận?"

    def _is_simple_greeting(self, user_input: str) -> bool:
        greetings = {"hi", "hello", "hey", "xin chào", "chào", "chào bạn", "alo", "yo"}
        return user_input.strip().lower() in greetings

    def _generate_simple_response(self, user_input: str, employee_id: str) -> str:
        system = "Bạn là trợ lý HR AI. Trả lời ngắn gọn bằng tiếng Việt."
        prompt = f"Người dùng (NV: {employee_id}) nói: {user_input}\nChào lại và hỏi cần gì."
        result = self.llm.generate(prompt, system_prompt=system)
        return result["content"]

    def _is_confirmation(self, user_input: str) -> bool:
        normalized = user_input.strip().lower()
        return any(word in normalized for word in CONFIRMATION_WORDS)

    def _build_result(self, answer: str, trace: list[dict[str, Any]], start: float,
                      requires_confirmation: bool = False) -> dict[str, Any]:
        latency_ms = int((time.time() - start) * 1000)
        return {
            "content": answer, "trace": trace,
            "requires_confirmation": requires_confirmation,
            "latency_ms": latency_ms,
            "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
            "provider": self.llm.__class__.__name__.replace("Provider", "").lower(),
        }
