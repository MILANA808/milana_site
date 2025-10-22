import pytest

from milana_site.metacode import MetacodeStudio, Module


@pytest.fixture()
def studio():
    return MetacodeStudio()


def test_parse_modules_with_various_formats(studio):
    raw = """
    Инсайт | Быстрый сбор сигналов | aether
    Маяк | Настройка канала
    Каденция
    """
    modules = studio.parse_modules(raw)
    assert len(modules) == 3
    assert modules[0].channel == "aether"
    assert modules[1].channel == "core"
    assert modules[2].description == "описание отсутствует"


def test_create_blueprint_enforces_validation(studio):
    modules = [Module(name="Модуль", description="описание", channel="core")]
    blueprint = studio.create_blueprint(
        title="Aurora",
        objective="синхронизировать эмпатию",
        modules=modules,
        tags=["empathy", "focus", "empathy"],
    )
    assert blueprint.tags == ("empathy", "focus")
    assert "Цель" in blueprint.synopsis()

    with pytest.raises(ValueError):
        studio.create_blueprint(" ", "цель", modules)

    with pytest.raises(ValueError):
        studio.create_blueprint("Название", "", modules)

    with pytest.raises(ValueError):
        studio.create_blueprint("Название", "цель", [])
