import pytest

from milana_site.aksi import ResonanceConsole, ResonanceInput
from milana_site.chat import ChatEngine, ChatMessage
from milana_site.memory import MemoryStore
from milana_site.metacode import MetacodeStudio, Module


def build_blueprint():
    studio = MetacodeStudio()
    modules = [
        Module(name="Сканер", description="определяет тон", channel="aether"),
        Module(name="Якорь", description="укрепляет внимание", channel="core"),
    ]
    return studio.create_blueprint(
        title="Aurora",
        objective="поддерживать эмпатию",
        modules=modules,
        tags=["empathy"],
    )


def build_resonance():
    console = ResonanceConsole()
    payload = ResonanceInput(empathy=7, focus=6, risk=1, channel="core")
    return console.analyze(payload)


def test_chat_reply_includes_context_and_updates_memory():
    memory = MemoryStore()
    engine = ChatEngine(memory)
    history = [ChatMessage(role="user", content="Как ты сегодня?"), ChatMessage(role="assistant", content="Я в резонансе")]
    blueprint = build_blueprint()
    resonance = build_resonance()

    reply = engine.reply(history, "Подскажи следующий шаг", blueprint, resonance)
    assert "Активный метакод" in reply.content
    assert "Резонанс" in reply.content
    assert "Вопрос пользователя" in reply.content
    assert memory.recall()


def test_chat_rejects_empty_message():
    memory = MemoryStore()
    engine = ChatEngine(memory)
    with pytest.raises(ValueError):
        engine.reply([], " ")
