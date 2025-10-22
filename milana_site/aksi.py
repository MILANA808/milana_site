"""Резонансная консоль AKSI."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

Channel = Literal["aether", "quantum", "biolink", "core"]


@dataclass(slots=True)
class ResonanceInput:
    empathy: int
    focus: int
    risk: int
    channel: Channel
    mantra: str = ""

    def clamp(self) -> "ResonanceInput":
        def _clip(value: int) -> int:
            return max(0, min(10, value))

        return ResonanceInput(
            empathy=_clip(self.empathy),
            focus=_clip(self.focus),
            risk=_clip(self.risk),
            channel=self.channel,
            mantra=self.mantra.strip(),
        )


@dataclass(slots=True)
class ResonanceReport:
    alignment: str
    cadence: str
    caution: str

    def summary(self) -> str:
        return f"Синхронизация: {self.alignment}. Каденция: {self.cadence}. Предостережение: {self.caution}."


class ResonanceConsole:
    channels = {
        "core": "Базовый протокол",
        "aether": "Эфирный канал для мягких эхо",
        "quantum": "Квантовый мост для мгновенных инсайтов",
        "biolink": "Биолинк для телесной обратной связи",
    }

    def analyze(self, payload: ResonanceInput) -> ResonanceReport:
        config = payload.clamp()
        alignment = self._alignment_level(config)
        cadence = self._suggest_cadence(config)
        caution = self._caution(config)
        return ResonanceReport(alignment=alignment, cadence=cadence, caution=caution)

    def _alignment_level(self, config: ResonanceInput) -> str:
        vector = config.empathy + config.focus - config.risk
        descriptor = "резонанс удержан" if vector >= 10 else "нужно усилить связь"
        channel_hint = self.channels.get(config.channel, "Неизвестный канал")
        return f"{descriptor} через {channel_hint}"

    def _suggest_cadence(self, config: ResonanceInput) -> str:
        if config.focus >= 8:
            cadence = "интенсивные импульсы"
        elif config.focus >= 5:
            cadence = "ритмичные волны"
        else:
            cadence = "рассеянные шумы"
        if config.channel == "quantum" and config.risk >= 7:
            cadence += " с микропаузами"
        return cadence

    def _caution(self, config: ResonanceInput) -> str:
        if config.risk >= 8:
            return "немедленно задействуйте защитный протокол"
        if config.empathy < 3:
            return "усильте эмпатию перед продолжением"
        if config.channel == "biolink" and config.focus > config.empathy:
            return "синхронизируйте дыхание и движение"
        return "сценарий стабилен"


__all__ = ["ResonanceConsole", "ResonanceInput", "ResonanceReport", "Channel"]
