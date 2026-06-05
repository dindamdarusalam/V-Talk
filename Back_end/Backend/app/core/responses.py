from typing import Any


def success_response(data: Any, message: str = "OK", meta: dict[str, Any] | None = None) -> dict[str, Any]:
    return {
        "success": True,
        "message": message,
        "data": data,
        "error": None,
        "meta": meta or {},
    }


def error_response(message: str, code: str, details: Any = None) -> dict[str, Any]:
    return {
        "success": False,
        "message": message,
        "data": None,
        "error": {"code": code, "details": details},
        "meta": {},
    }
