"""Structured (JSON) log formatter — stdlib only.

Enabled by ``LOG_JSON`` (see settings); the human-readable ``verbose`` formatter
is used otherwise.
"""

import json
import logging

_SKIP = {
    "args", "created", "exc_info", "exc_text", "filename", "funcName",
    "levelname", "levelno", "lineno", "module", "msecs", "message", "msg",
    "name", "pathname", "process", "processName", "relativeCreated",
    "stack_info", "thread", "threadName", "taskName",
}


class JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "ts": self.formatTime(record, "%Y-%m-%dT%H:%M:%S%z"),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)
        request = getattr(record, "request", None)
        if request is not None:
            payload["method"] = getattr(request, "method", None)
            payload["path"] = getattr(request, "path", None)
        for key, value in record.__dict__.items():
            if key not in _SKIP and key != "request" and not key.startswith("_"):
                payload.setdefault(key, value)
        return json.dumps(payload, default=str)
