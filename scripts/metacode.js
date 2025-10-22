const HISTORY_KEY = 'metacodeBlueprints';

const moduleLibrary = {
    memory: {
        label: 'Memory Vault',
        blueprint: 'Сохраняем инсайты пользователя и создаём кластеры опыта для следующих диалогов.',
        synergy: 'Memory Vault ↔ Knowledge Links: перенаправляем ключевые фрагменты в ответы AKSI.'
    },
    knowledge: {
        label: 'Knowledge Links',
        blueprint: 'Активируем интернет-оркестратор, агрегируем источники и готовим выдержки.',
        synergy: 'Knowledge Links усиливают ответы фактами и подключают free tier движок Milana.'
    },
    creativity: {
        label: 'Creative Pulse',
        blueprint: 'Генерируем креативные концепции, формируем вариации и визуальные подсказки.',
        synergy: 'Creative Pulse вводит режим дивергентного мышления и добавляет визуальные подсказки.'
    },
    automation: {
        label: 'Action Sequencer',
        blueprint: 'Оркестрируем автоматические шаги, проверки и последующие уведомления.',
        synergy: 'Action Sequencer связывает готовые действия с выбранными каналами Milana.'
    },
    guardian: {
        label: 'Guardian Loop',
        blueprint: 'Контролируем риски, аудит и финальное подтверждение перед выдачей.',
        synergy: 'Guardian Loop защищает протокол и фиксирует условия отката.'
    }
};

const safeParseHistory = () => {
    try {
        const raw = localStorage.getItem(HISTORY_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.warn('[metacode] Не удалось прочитать историю:', error);
        return [];
    }
};

const persistHistory = (entries) => {
    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, 6)));
    } catch (error) {
        console.warn('[metacode] Не удалось сохранить историю:', error);
    }
};

const buildBlueprint = (goal, modules) => {
    const moduleLines = modules.map((moduleId) => {
        const meta = moduleLibrary[moduleId];
        if (!meta) {
            return `• ${moduleId}`;
        }
        return `• ${meta.label}: ${meta.blueprint}`;
    }).join('\n');

    const synergies = [];
    modules.forEach((moduleId) => {
        const meta = moduleLibrary[moduleId];
        if (meta?.synergy) {
            synergies.push(meta.synergy);
        }
    });

    if (modules.includes('memory') && modules.includes('knowledge')) {
        synergies.push('Memory Vault + Knowledge Links: Milana извлекает прошлые диалоги и усиливает их свежими фактами.');
    }
    if (modules.includes('automation') && modules.includes('guardian')) {
        synergies.push('Action Sequencer + Guardian Loop: автоматизация проходит через контроль рисков перед запуском.');
    }
    if (!synergies.length) {
        synergies.push('Базовый маршрут: ядро AKSI синхронизирует чат Milana и фиксирует контекст для памяти.');
    }

    const scenario = (() => {
        if (modules.includes('automation')) {
            return 'Запускаем Action Sequencer и выдаём пользователю чек-лист действий.';
        }
        if (modules.includes('creativity')) {
            return 'Открываем режим Creative Pulse и генерируем три варианта концепции.';
        }
        if (modules.includes('guardian')) {
            return 'Перед выдачей ответа запускаем Guardian Loop и сверяем критерии качества.';
        }
        return 'Стартуем аналитический ответ Milana и фиксируем ключевые инсайты в память.';
    })();

    const sections = [
        `🧭 Фокус: ${goal}`,
        '🧬 Метакод ядра AKSI:\n• Нейроядро синхронизирует память, интернет-данные и чат Milana.\n• Контекст пользователя обновляется в реальном времени.',
        `📦 Модули:\n${moduleLines}`,
        `🔗 Согласование потоков:\n${synergies.join('\n')}`,
        `🚀 Стартовый протокол: ${scenario}`
    ];

    return sections.join('\n\n');
};

const renderHistory = (container) => {
    if (!container) return;
    const entries = safeParseHistory();
    container.innerHTML = '';

    if (!entries.length) {
        const empty = document.createElement('p');
        empty.className = 'note';
        empty.textContent = 'Архив метакода появится после первой генерации.';
        container.appendChild(empty);
        return;
    }

    entries.forEach((entry) => {
        const card = document.createElement('div');
        card.className = 'metacode-history-entry';

        const timestamp = document.createElement('strong');
        const stamp = entry.timestamp ? new Date(entry.timestamp) : new Date();
        timestamp.textContent = stamp.toLocaleString('ru-RU', {
            dateStyle: 'short',
            timeStyle: 'short'
        });

        const goal = document.createElement('p');
        goal.textContent = entry.goal || 'Без описания цели';

        card.appendChild(timestamp);
        card.appendChild(goal);

        if (Array.isArray(entry.modules) && entry.modules.length) {
            const tags = document.createElement('div');
            tags.className = 'metacode-history-tags';
            entry.modules.forEach((moduleId) => {
                const tag = document.createElement('span');
                tag.textContent = moduleLibrary[moduleId]?.label || moduleId;
                tags.appendChild(tag);
            });
            card.appendChild(tags);
        }

        container.appendChild(card);
    });
};

export const initMetacodeStudio = () => {
    const generateButton = document.getElementById('metacodeGenerate');
    if (!generateButton) return;

    const goalField = document.getElementById('metacodeGoal');
    const statusField = document.getElementById('metacodeStatus');
    const outputField = document.getElementById('metacodeOutput');
    const historyContainer = document.getElementById('metacodeHistory');

    const setStatus = (message, isError = false) => {
        if (!statusField) return;
        statusField.textContent = message;
        statusField.style.color = isError ? '#ff8fb7' : '#d4c7ff';
    };

    renderHistory(historyContainer);

    generateButton.addEventListener('click', () => {
        const goal = goalField?.value.trim();
        if (!goal) {
            setStatus('Добавьте цель или гипотезу, чтобы собрать метакод.', true);
            return;
        }

        const selectedModules = Array.from(document.querySelectorAll('input[name="metacodeModule"]:checked'))
            .map((input) => input.value);

        if (!selectedModules.length) {
            setStatus('Выберите хотя бы один модуль AKSI — так blueprint станет осмысленным.', true);
            return;
        }

        const blueprint = buildBlueprint(goal, selectedModules);
        if (outputField) {
            outputField.textContent = blueprint;
            outputField.scrollTop = 0;
        }

        const history = safeParseHistory();
        history.unshift({
            goal,
            modules: selectedModules,
            blueprint,
            timestamp: new Date().toISOString()
        });
        persistHistory(history);
        renderHistory(historyContainer);
        setStatus('Blueprint AKSI сохранён в архив. Можно переносить в рабочий сценарий.', false);
    });
};
