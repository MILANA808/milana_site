from milana_site.app import create_app


def test_index_renders_successfully():
    app = create_app()
    with app.test_client() as client:
        response = client.get("/")
        assert response.status_code == 200
        body = response.get_data(as_text=True)
        assert "Milana Superintelligence Hub" in body


def test_full_interaction_flow():
    app = create_app()
    with app.test_client() as client:
        response = client.post(
            "/metacode",
            data={
                "title": "Aurora",
                "objective": "синхронизация",
                "modules": "Сканер | анализ | aether",
                "tags": "empathy, focus",
            },
            follow_redirects=True,
        )
        assert "Blueprint сохранён" in response.get_data(as_text=True)

        response = client.post(
            "/resonance",
            data={
                "empathy": "7",
                "focus": "6",
                "risk": "2",
                "channel": "core",
                "mantra": "доброта",
            },
            follow_redirects=True,
        )
        assert "Резонанс пересчитан" in response.get_data(as_text=True)

        response = client.post(
            "/chat",
            data={"message": "Как активировать протокол?"},
            follow_redirects=True,
        )
        body = response.get_data(as_text=True)
        assert "Milana обновила ответ" in body
        assert "Диалог" in body

        with client.session_transaction() as session:
            assert session["chat_history"], "ожидалась сохранённая история"
            assert session["blueprints"], "ожидался сохранённый blueprint"
            assert session["resonances"], "ожидалась сохранённая запись резонанса"


def test_inputs_are_sanitized():
    app = create_app()
    with app.test_client() as client:
        client.post(
            "/metacode",
            data={
                "title": "<b>Nova</b>",
                "objective": "<script>alert('x')</script> исследование",
                "modules": "Модуль <img src=x onerror=1> | тест | core",
                "tags": "<u>tag</u>, clean",
            },
        )
        client.post(
            "/chat",
            data={"message": "<img src=x onerror=1> Привет"},
        )
        with client.session_transaction() as session:
            user_message = session["chat_history"][0]["content"]
            assert "<" not in user_message
            blueprint = session["blueprints"][0]
            assert "<" not in blueprint["title"]
            assert "<" not in blueprint["objective"]
            for module in blueprint["modules"]:
                assert "<" not in module["name"]
                assert "<" not in module["description"]
            assert all("<" not in tag for tag in blueprint["tags"])
