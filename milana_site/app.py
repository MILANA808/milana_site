"""Flask-приложение Milana."""

from __future__ import annotations

import os
from dataclasses import asdict
from typing import Iterable, List

from flask import Flask, flash, redirect, render_template, request, session, url_for

from .aksi import ResonanceConsole, ResonanceInput, ResonanceReport
from .chat import ChatEngine, ChatMessage
from .memory import MemoryStore
from .metacode import Blueprint, MetacodeStudio, Module
from .security import sanitize_text


def _blueprint_to_dict(blueprint: Blueprint) -> dict:
    return {
        "title": blueprint.title,
        "objective": blueprint.objective,
        "modules": [asdict(module) for module in blueprint.modules],
        "tags": list(blueprint.tags),
    }


def _dict_to_blueprint(payload: dict, studio: MetacodeStudio) -> Blueprint:
    modules = [Module(**module_dict) for module_dict in payload.get("modules", [])]
    return studio.create_blueprint(
        title=payload.get("title", ""),
        objective=payload.get("objective", ""),
        modules=modules,
        tags=payload.get("tags", []),
    )


def _resonance_to_dict(report: ResonanceReport) -> dict:
    return {
        "alignment": report.alignment,
        "cadence": report.cadence,
        "caution": report.caution,
    }


def _dict_to_resonance(payload: dict) -> ResonanceReport:
    return ResonanceReport(
        alignment=payload.get("alignment", ""),
        cadence=payload.get("cadence", ""),
        caution=payload.get("caution", ""),
    )


def _messages_to_dict(history: Iterable[ChatMessage]) -> List[dict]:
    return [asdict(message) for message in history]


def _dicts_to_messages(history: Iterable[dict]) -> List[ChatMessage]:
    return [ChatMessage(**message) for message in history]


def create_app() -> Flask:
    app = Flask(__name__)
    app.config["SECRET_KEY"] = os.environ.get("MILANA_SECRET_KEY", "dev-secret")

    memory = MemoryStore()
    studio = MetacodeStudio()
    console = ResonanceConsole()
    chat_engine = ChatEngine(memory)

    def _get_history() -> List[ChatMessage]:
        return _dicts_to_messages(session.get("chat_history", []))

    def _save_history(history: List[ChatMessage]) -> None:
        session["chat_history"] = _messages_to_dict(history)
        session.modified = True

    def _get_blueprints() -> List[Blueprint]:
        saved = session.get("blueprints", [])
        blueprints: List[Blueprint] = []
        for payload in saved:
            try:
                blueprints.append(_dict_to_blueprint(payload, studio))
            except ValueError:
                continue
        return blueprints

    def _append_blueprint(blueprint: Blueprint) -> None:
        saved = session.get("blueprints", [])
        saved.append(_blueprint_to_dict(blueprint))
        session["blueprints"] = saved
        session.modified = True

    def _get_resonances() -> List[ResonanceReport]:
        saved = session.get("resonances", [])
        return [_dict_to_resonance(payload) for payload in saved]

    def _append_resonance(report: ResonanceReport) -> None:
        saved = session.get("resonances", [])
        saved.append(_resonance_to_dict(report))
        session["resonances"] = saved
        session.modified = True

    def _latest_blueprint() -> Blueprint | None:
        blueprints = _get_blueprints()
        return blueprints[-1] if blueprints else None

    def _latest_resonance() -> ResonanceReport | None:
        resonances = _get_resonances()
        return resonances[-1] if resonances else None

    @app.route("/")
    def index():
        return render_template(
            "index.html",
            chat_history=_get_history(),
            blueprints=_get_blueprints(),
            resonances=_get_resonances(),
        )

    @app.post("/chat")
    def chat():
        message = sanitize_text(request.form.get("message", ""))
        history = _get_history()
        try:
            reply = chat_engine.reply(history, message, _latest_blueprint(), _latest_resonance())
        except ValueError as error:
            flash(str(error), "error")
        else:
            history.append(ChatMessage(role="user", content=message))
            history.append(reply)
            _save_history(history)
            flash("Milana обновила ответ", "success")
        return redirect(url_for("index"))

    @app.post("/metacode")
    def metacode():
        title = sanitize_text(request.form.get("title", ""))
        objective = sanitize_text(request.form.get("objective", ""))
        modules_raw = sanitize_text(request.form.get("modules", ""))
        tags_raw = sanitize_text(request.form.get("tags", ""))
        modules = studio.parse_modules(modules_raw)
        tags: list[str] = []
        for raw_tag in tags_raw.split(","):
            cleaned = sanitize_text(raw_tag)
            if cleaned:
                tags.append(cleaned)
        try:
            blueprint = studio.create_blueprint(title, objective, modules, tags)
        except ValueError as error:
            flash(str(error), "error")
        else:
            _append_blueprint(blueprint)
            flash("Blueprint сохранён", "success")
        return redirect(url_for("index"))

    @app.post("/resonance")
    def resonance():
        def _as_int(name: str) -> int:
            raw_value = request.form.get(name, "0").strip()
            return int(raw_value or 0)

        payload = ResonanceInput(
            empathy=_as_int("empathy"),
            focus=_as_int("focus"),
            risk=_as_int("risk"),
            channel=sanitize_text(request.form.get("channel", "core")),
            mantra=sanitize_text(request.form.get("mantra", "")),
        )
        report = console.analyze(payload)
        _append_resonance(report)
        flash("Резонанс пересчитан", "success")
        return redirect(url_for("index"))

    @app.post("/reset")
    def reset():
        session.pop("chat_history", None)
        session.pop("blueprints", None)
        session.pop("resonances", None)
        flash("Сессия очищена", "info")
        return redirect(url_for("index"))

    return app


app = create_app()

__all__ = ["create_app", "app"]
