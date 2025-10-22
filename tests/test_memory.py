from milana_site.memory import MemoryStore


def test_memory_remember_and_recall():
    store = MemoryStore()
    store.remember("vision", "создан образ доверия")
    store.remember("vision", "зафиксирован новый маяк", sentiment="hopeful")
    store.remember("safety", "порог риска снижен")

    recall = store.recall("vision")
    assert len(recall) == 2
    assert all(entry.topic == "vision" for entry in recall)


def test_memory_summary_limit_and_validation():
    store = MemoryStore()
    assert store.summarize() == "память пуста"

    store.remember("focus", "гармония достигнута")
    summary = store.summarize(limit=1)
    assert "[focus]" in summary


def test_memory_rejects_empty_values():
    store = MemoryStore()
    try:
        store.remember("", "insight")
    except ValueError:
        pass
    else:
        raise AssertionError("ожидалась ошибка при пустой теме")

    try:
        store.remember("topic", " ")
    except ValueError:
        pass
    else:
        raise AssertionError("ожидалась ошибка при пустом инсайте")

    try:
        store.summarize(limit=0)
    except ValueError:
        pass
    else:
        raise AssertionError("ожидалась ошибка при нулевом лимите")
