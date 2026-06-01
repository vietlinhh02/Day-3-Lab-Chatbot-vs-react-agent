from typing import Any

from app.telemetry.logger import logger


class PerformanceTracker:
    def __init__(self):
        self.session_metrics: list[dict] = []

    def track_request(
        self,
        provider: str,
        model: str,
        usage: dict[str, int],
        latency_ms: int,
    ):
        metric = {
            "provider": provider,
            "model": model,
            "prompt_tokens": usage.get("prompt_tokens", 0),
            "completion_tokens": usage.get("completion_tokens", 0),
            "total_tokens": usage.get("total_tokens", 0),
            "latency_ms": latency_ms,
        }
        self.session_metrics.append(metric)
        logger.log_event("LLM_METRIC", metric)


tracker = PerformanceTracker()
