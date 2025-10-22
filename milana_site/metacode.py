"""Модели и фабрика blueprint-ов Metacode Studio."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, List, Sequence


@dataclass(slots=True)
class Module:
    name: str
    description: str
    channel: str = "core"

    def narrative(self) -> str:
        return f"{self.name} через канал {self.channel}: {self.description}"


@dataclass(slots=True)
class Blueprint:
    title: str
    objective: str
    modules: Sequence[Module]
    tags: Sequence[str]

    def synopsis(self) -> str:
        core = "; ".join(module.narrative() for module in self.modules)
        tags = ", ".join(self.tags) if self.tags else "без тегов"
        return f"Цель: {self.objective}. Модули: {core}. Теги: {tags}."


class MetacodeStudio:
    """Создание и валидация blueprint-ов."""

    def create_blueprint(
        self,
        title: str,
        objective: str,
        modules: Iterable[Module],
        tags: Iterable[str] | None = None,
    ) -> Blueprint:
        title = title.strip()
        objective = objective.strip()
        modules_list: List[Module] = [self._validate_module(module) for module in modules]
        if not title:
            raise ValueError("Название blueprint'а не может быть пустым")
        if not objective:
            raise ValueError("Цель должна быть заполнена")
        if not modules_list:
            raise ValueError("Нужно указать хотя бы один модуль")
        unique_tags = self._normalize_tags(tags)
        return Blueprint(title=title, objective=objective, modules=tuple(modules_list), tags=unique_tags)

    def parse_modules(self, raw_text: str) -> List[Module]:
        """Разбор модулей из текстовой формы."""

        modules: List[Module] = []
        for line in raw_text.splitlines():
            line = line.strip()
            if not line:
                continue
            parts = [part.strip() for part in line.split("|") if part.strip()]
            if len(parts) == 1:
                name, description, channel = parts[0], "", "core"
            elif len(parts) == 2:
                name, description = parts
                channel = "core"
            else:
                name, description, channel = parts[:3]
            if not description:
                description = "описание отсутствует"
            modules.append(Module(name=name, description=description, channel=channel or "core"))
        return modules

    def _normalize_tags(self, tags: Iterable[str] | None) -> Sequence[str]:
        if not tags:
            return ()
        cleaned: List[str] = []
        for tag in tags:
            tag = tag.strip()
            if tag and tag not in cleaned:
                cleaned.append(tag)
        return tuple(cleaned)

    def _validate_module(self, module: Module) -> Module:
        if not module.name.strip():
            raise ValueError("Модуль должен иметь название")
        if not module.description.strip():
            raise ValueError("Модуль должен иметь описание")
        channel = module.channel.strip() or "core"
        return Module(name=module.name.strip(), description=module.description.strip(), channel=channel)


__all__ = ["Module", "Blueprint", "MetacodeStudio"]
