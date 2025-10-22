"""Утилиты безопасности для очистки пользовательских данных."""

from __future__ import annotations

import bleach


def sanitize_text(value: str) -> str:
    """Удаляет HTML/JS и нормализует пользовательский ввод."""

    if not isinstance(value, str):
        return ""
    cleaned = bleach.clean(value, tags=[], attributes={}, strip=True)
    return cleaned.strip()


__all__ = ["sanitize_text"]
