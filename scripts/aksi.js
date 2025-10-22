const channelLabels = {
    voice: 'Голосовой стрим',
    vision: 'Визуальные подсказки',
    automation: 'Автоматизация действий'
};

const scenarioTemplates = {
    research: {
        label: 'Исследование и аналитика',
        opening: 'AKSI раскрывает режим разведки знаний и собирает доказательную базу.',
        steps: [
            'Сканируем Memory Vault и выносим ключевые хроники.',
            'Подключаем Knowledge Links, формируем таблицу фактов и сравнения.',
            'Собираем набор гипотез и возможных экспериментов.'
        ],
        closing: 'Запросите дополнительный источник — AKSI расширит обзор или углубит анализ.',
        signal: '🔍 Аналитический режим активирован — приоритет фактам и источникам.'
    },
    strategy: {
        label: 'Стратегическая сессия',
        opening: 'AKSI выстраивает стратегический коридор с учётом ограничений и ресурсов.',
        steps: [
            'Формируем карту целей и критериев успеха.',
            'Связываем контекст с предыдущими решениями из памяти.',
            'Готовим сценарии развития и контрольные точки.'
        ],
        closing: 'Определите следующий контрольный замер — Milana добавит мониторинг и напоминания.',
        signal: '🧭 Стратегический режим: фиксируем контрольные точки и KPI.'
    },
    support: {
        label: 'Эмпатическая поддержка',
        opening: 'AKSI переключается в режим тёплой поддержки и отслеживает эмоциональные маркеры.',
        steps: [
            'Формируем безопасное пространство и уточняем состояние пользователя.',
            'Находим ресурсы и практики, которые помогут стабилизировать эмоции.',
            'Предлагаем план мягких действий и точки обратной связи.'
        ],
        closing: 'При необходимости запросите дополнительные практики — Акси сформирует расширенный список.',
        signal: '🤝 Поддержка активна — язык ответов становится мягким и заботливым.'
    }
};

const buildSignals = ({ empathy, focus, risk }, channels, scenarioId) => {
    const signals = [];

    if (empathy >= 70) {
        signals.push('💜 Высокая эмпатия: Акси усиливает поддержку и расширяет эмоциональный словарь.');
    } else if (empathy <= 30) {
        signals.push('🧊 Эмпатия снижена: ответы будут максимально структурными и прямыми.');
    }

    if (focus >= 70) {
        signals.push('🎯 Фокус повышен: Milana фиксирует чёткие deliverables и дедлайны.');
    } else if (focus <= 40) {
        signals.push('🌌 Фокус мягкий: допускаем свободное исследование и креативные развилки.');
    }

    if (risk >= 70) {
        signals.push('🛡️ Риск высокий: Guardian Loop активирует двойной аудит перед ответом.');
    } else if (risk <= 30) {
        signals.push('💨 Риск низкий: допускаем быстрые эксперименты и смелые гипотезы.');
    }

    if (channels.length) {
        const channelText = channels
            .map((channel) => channelLabels[channel] || channel)
            .join(', ');
        signals.push(`📡 Каналы: ${channelText}.`);
    } else {
        signals.push('📡 Каналы: активен только текстовый интерфейс Milana.');
    }

    const scenarioSignal = scenarioTemplates[scenarioId]?.signal
        || '🪐 Режим универсальный: Milana подстраивает ответы под контекст.';
    signals.push(scenarioSignal);

    return signals;
};

const composePlan = (template, context, { empathy, focus, risk }, channels) => {
    const steps = [...template.steps];

    if (empathy >= 70) {
        steps.push('Добавляем слой эмпатической обратной связи и мягкие формулировки.');
    } else if (empathy <= 30) {
        steps.push('Закрепляем лаконичный тон и прямые рекомендации.');
    }

    if (focus >= 70) {
        steps.push('Фиксируем конкретные deliverables и дедлайны.');
    }

    if (risk >= 70) {
        steps.push('Guardian Loop проводит аудит перед выдачей финального ответа.');
    }

    if (channels.includes('automation')) {
        steps.push('Action Sequencer активирует автоматические задачи и уведомления.');
    }

    const channelLine = channels.length
        ? `📡 Каналы: ${channels.map((channel) => channelLabels[channel] || channel).join(', ')}.`
        : '📡 Каналы: текстовый интерфейс Milana.';

    const planSegments = [
        `🎯 Сценарий: ${template.label}`,
        `🪐 Контекст: ${context}`,
        template.opening,
        `🔧 Параметры: эмпатия ${empathy}%, фокус ${focus}%, риск ${risk}%`,
        `🚦 План действий:\n${steps.map((step, index) => `${index + 1}. ${step}`).join('\n')}`,
        channelLine,
        template.closing
    ];

    return planSegments.join('\n\n');
};

export const initAksiConsole = () => {
    const composeButton = document.getElementById('aksiComposeButton');
    if (!composeButton) return;

    const scenarioField = document.getElementById('aksiScenario');
    const contextField = document.getElementById('aksiContext');
    const empathyField = document.getElementById('aksiEmpathy');
    const focusField = document.getElementById('aksiFocus');
    const riskField = document.getElementById('aksiRisk');
    const planField = document.getElementById('aksiPlan');
    const signalsList = document.getElementById('aksiSignals');
    const statusField = document.getElementById('aksiStatus');
    const empathyValue = document.getElementById('aksiEmpathyValue');
    const focusValue = document.getElementById('aksiFocusValue');
    const riskValue = document.getElementById('aksiRiskValue');

    const updateSliderValue = (input, target) => {
        if (!input || !target) return;
        target.textContent = `${input.value}%`;
    };

    updateSliderValue(empathyField, empathyValue);
    updateSliderValue(focusField, focusValue);
    updateSliderValue(riskField, riskValue);

    [
        [empathyField, empathyValue],
        [focusField, focusValue],
        [riskField, riskValue]
    ].forEach(([input, target]) => {
        if (!input || !target) return;
        input.addEventListener('input', () => updateSliderValue(input, target));
    });

    const setStatus = (message, isError = false) => {
        if (!statusField) return;
        statusField.textContent = message;
        statusField.style.color = isError ? '#ff8fb7' : '#d4c7ff';
    };

    composeButton.addEventListener('click', () => {
        const context = contextField?.value.trim();
        if (!context) {
            setStatus('Опишите контекст или запрос, чтобы синхронизировать Акси.', true);
            return;
        }

        const scenarioId = scenarioField?.value || 'research';
        const template = scenarioTemplates[scenarioId] || scenarioTemplates.research;
        const empathy = Number(empathyField?.value ?? 0);
        const focus = Number(focusField?.value ?? 0);
        const risk = Number(riskField?.value ?? 0);
        const channels = Array.from(document.querySelectorAll('input[name="aksiChannel"]:checked'))
            .map((input) => input.value);

        const plan = composePlan(template, context, { empathy, focus, risk }, channels);
        if (planField) {
            planField.textContent = plan;
            planField.scrollTop = 0;
        }

        if (signalsList) {
            signalsList.innerHTML = '';
            buildSignals({ empathy, focus, risk }, channels, scenarioId).forEach((signal) => {
                const item = document.createElement('li');
                item.textContent = signal;
                signalsList.appendChild(item);
            });
        }

        setStatus('Протокол синхронизирован. Milana готова к запуску метасценария.', false);
    });
};
