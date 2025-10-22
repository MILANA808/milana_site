"""Серверная логика суперчата Milana."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, List, Sequence

from .memory import MemoryStore
from .metacode import Blueprint
from .aksi import ResonanceReport


@dataclass(slots=True)
class ChatMessage:
    role: str
    content: str


class ChatEngine:
    """Формирование ответов Milana без внешнего API."""

    def __init__(self, memory: MemoryStore) -> None:
        self.memory = memory

    def reply(
        self,
        history: Sequence[ChatMessage],
        message: str,
        blueprint: Blueprint | None = None,
        resonance: ResonanceReport | None = None,
    ) -> ChatMessage:
        prompt = message.strip()
        if not prompt:
            raise ValueError("Сообщение не может быть пустым")
        context = self._compose_context(history, blueprint, resonance)
        response = self._generate_answer(prompt, context, blueprint, resonance)
        self.memory.remember("chat", response, sentiment="positive")
        return ChatMessage(role="assistant", content=response)

    def _compose_context(
        self,
        history: Sequence[ChatMessage],
        blueprint: Blueprint | None,
        resonance: ResonanceReport | None,
    ) -> List[str]:
        context: List[str] = []
        if history:
            last_user_messages = [msg.content for msg in history if msg.role == "user"]
            if last_user_messages:
                context.append(f"Последние запросы: {' | '.join(last_user_messages[-3:])}")
        if blueprint is not None:
            context.append(blueprint.synopsis())
        if resonance is not None:
            context.append(resonance.summary())
        context.append(f"Память: {self.memory.summarize(limit=3)}")
        return context

    def _generate_answer(
        self,
        prompt: str,
        context: Iterable[str],
        blueprint: Blueprint | None,
        resonance: ResonanceReport | None,
    ) -> str:
        lines: List[str] = ["Milana отвечает на основе текущих протоколов."]
        if blueprint is not None:
            lines.append(f"Активный метакод — {blueprint.title}: {blueprint.objective}.")
        if resonance is not None:
            lines.append(f"Резонанс: {resonance.alignment.lower()} | {resonance.cadence}.")
        lines.append(f"Вопрос пользователя: {prompt}")
        for element in context:
            lines.append(f"→ {element}")
        lines.append("Рекомендация: продолжайте исследование с добротой и ясностью.")
        return "\n".join(lines)


__all__ = ["ChatEngine", "ChatMessage"]
