"""Простое хранилище воспоминаний Milana."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, List, Sequence


@dataclass(slots=True)
class MemoryEntry:
    """Отдельный факт, сохранённый Milana."""

    topic: str
    insight: str
    sentiment: str = "neutral"

    def serialize(self) -> dict:
        return {
            "topic": self.topic,
            "insight": self.insight,
            "sentiment": self.sentiment,
        }


class MemoryStore:
    """Минималистичное in-memory хранилище воспоминаний."""

    def __init__(self) -> None:
        self._entries: List[MemoryEntry] = []

    def remember(self, topic: str, insight: str, sentiment: str = "neutral") -> MemoryEntry:
        topic = topic.strip()
        insight = insight.strip()
        if not topic:
            raise ValueError("topic must not be empty")
        if not insight:
            raise ValueError("insight must not be empty")
        entry = MemoryEntry(topic=topic, insight=insight, sentiment=sentiment or "neutral")
        self._entries.append(entry)
        return entry

    def recall(self, topic: str | None = None) -> Sequence[MemoryEntry]:
        if topic is None:
            return tuple(self._entries)
        topic = topic.strip()
        return tuple(entry for entry in self._entries if entry.topic == topic)

    def summarize(self, limit: int = 5) -> str:
        """Собрать короткое описание памяти."""

        if limit <= 0:
            raise ValueError("limit must be positive")
        if not self._entries:
            return "память пуста"
        clipped: Iterable[MemoryEntry] = self._entries[-limit:]
        snippets = [f"[{entry.topic}] {entry.insight}" for entry in clipped]
        return "; ".join(snippets)

    def clear(self) -> None:
        self._entries.clear()


__all__ = ["MemoryEntry", "MemoryStore"]
