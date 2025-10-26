const requiredElement = (element, name) => {
    if (!element) {
        throw new Error(`Не найден элемент ${name} для интеграции с GPT.`);
    }
    return element;
};

const getStorageAPI = (storage) => {
    if (!storage) {
        return {
            getItem: () => '',
            setItem: () => {},
            removeItem: () => {}
        };
    }
    return storage;
};

const coerceUrl = (href) => {
    if (!href) return null;
    try {
        return new URL(href);
    } catch (error) {
        return null;
    }
};

const ensureErrorWithCode = (error, defaultCode, defaultMessage) => {
    if (error instanceof Error) {
        if (!error.code) {
            error.code = defaultCode;
        }
        return error;
    }
    const wrapped = new Error(defaultMessage ?? String(error));
    wrapped.code = defaultCode;
    return wrapped;
};

const extractChatMessage = (payload) => payload?.choices?.[0]?.message?.content?.trim();

export const DEFAULT_GPT_MODEL = 'gpt-4o-mini';

export function createGptIntegration({
    keyField,
    saveButton,
    testButton,
    clearButton,
    statusField,
    storage = typeof window !== 'undefined' ? window.localStorage : undefined,
    fetchImpl = typeof window !== 'undefined' ? window.fetch.bind(window) : undefined,
    locationHref = typeof window !== 'undefined' ? window.location?.href : undefined,
    historyAPI = typeof window !== 'undefined' ? window.history : undefined,
    autoApplyQuery = true,
    freeTier,
    proxyChat = typeof window !== 'undefined' ? window?.AKSI?.chat : undefined
} = {}) {
    keyField = requiredElement(keyField, 'ввода ключа');
    statusField = requiredElement(statusField, 'статуса ключа');

    const storageAPI = getStorageAPI(storage);

    if (!fetchImpl) {
        throw new Error('Не найдена функция fetch для интеграции с GPT.');
    }

    let gptApiKey = '';
    let busy = false;

    const getProxyChat = () => {
        if (typeof proxyChat === 'function') {
            return proxyChat;
        }
        if (typeof window !== 'undefined' && window?.AKSI && typeof window.AKSI.chat === 'function') {
            return window.AKSI.chat;
        }
        return undefined;
    };

    const hasProxy = () => typeof getProxyChat() === 'function';

    const callProxy = async (messages, { model = DEFAULT_GPT_MODEL, temperature } = {}) => {
        const proxy = getProxyChat();
        if (!proxy) {
            const error = new Error('Защищённый прокси недоступен.');
            error.code = 'PROXY_UNAVAILABLE';
            throw error;
        }
        try {
            const response = await proxy(messages, { model, temperature });
            const text = extractChatMessage(response);
            if (!text) {
                const error = new Error('Прокси вернул пустой ответ.');
                error.code = 'PROXY_EMPTY';
                throw error;
            }
            return text;
        } catch (error) {
            throw ensureErrorWithCode(error, 'PROXY_ERROR', 'Ошибка прокси');
        }
    };

    const hasFreeTier = () => freeTier && typeof freeTier.respond === 'function';

    const setStatus = (message, { error = false } = {}) => {
        statusField.textContent = message || '';
        statusField.style.color = error ? '#ff8fb7' : '#d4c7ff';
    };

    const syncField = (value) => {
        if (!keyField) return;
        keyField.value = value || '';
    };

    const persistKey = (value, { silent = false, message } = {}) => {
        const inputValue = typeof value === 'string' ? value.trim() : '';
        const fieldValue = keyField.value.trim();
        const resolved = inputValue || fieldValue;

        if (!resolved) {
            return '';
        }

        if (resolved !== gptApiKey) {
            gptApiKey = resolved;
            storageAPI.setItem('gptApiKey', gptApiKey);
        }

        if (keyField.value !== gptApiKey) {
            syncField(gptApiKey);
        }

        if (!silent) {
            setStatus(message || 'Ключ сохранён в локальном хранилище браузера.');
        }

        return gptApiKey;
    };

    const toggleBusy = (value) => {
        busy = Boolean(value);
        [saveButton, testButton].forEach((button) => {
            if (button) {
                button.disabled = busy;
            }
        });
    };

    const loadFromStorage = () => {
        gptApiKey = storageAPI.getItem('gptApiKey') || '';
        syncField(gptApiKey);
        if (gptApiKey) {
            setStatus('Ключ загружен и готов к работе.');
        } else if (hasProxy()) {
            setStatus('Подключено через защищённый прокси AKSI. Ключ хранится на сервере.');
        } else if (hasFreeTier()) {
            setStatus('Бесплатный режим Milana Super GPT активен. Добавьте ключ, чтобы подключить облачные модели.');
        } else {
            setStatus('Введите ключ, чтобы активировать GPT.');
        }
        return gptApiKey;
    };

    const clearKey = () => {
        gptApiKey = '';
        storageAPI.removeItem('gptApiKey');
        syncField('');
        if (hasProxy()) {
            setStatus('Ключ удалён из браузера. Прокси AKSI остаётся активным.');
        } else if (hasFreeTier()) {
            setStatus('Ключ удалён. Доступен бесплатный режим Super GPT без облачных моделей.');
        } else {
            setStatus('Ключ удалён из этого браузера.');
        }
        return gptApiKey;
    };

    const ensureKey = () => {
        if (hasProxy()) {
            return gptApiKey;
        }
        if (!gptApiKey) {
            persistKey('', { silent: true });
        }
        if (!gptApiKey) {
            const error = new Error('Добавьте ключ OpenAI API на панели выше.');
            error.code = 'NO_KEY';
            throw error;
        }
        return gptApiKey;
    };

    const formatError = (error) => {
        if (!error) return 'Неизвестная ошибка GPT.';
        if (error.code === 'NO_KEY') {
            return 'Добавьте ключ OpenAI API в блоке «Интеграция с GPT».\u00A0Ключ хранится только в вашем браузере.';
        }
        if (error.code === 'FREE_TIER_EMPTY') {
            return 'Бесплатный режим Super GPT не смог подготовить ответ. Уточните запрос или добавьте ключ для облачных моделей.';
        }
        if (error.code === 'FREE_TIER_FAILED') {
            return `Бесплатный режим Super GPT вернул ошибку: ${error.message}`;
        }
        if (error.code === 'PROXY_UNAVAILABLE') {
            return 'Защищённый прокси AKSI недоступен. Проверьте, что сервер запущен.';
        }
        if (error.code === 'PROXY_EMPTY') {
            return 'Прокси AKSI ответил пустым сообщением. Попробуйте повторить запрос.';
        }
        if (error.code === 'PROXY_ERROR') {
            return `Ошибка прокси AKSI: ${error.message}`;
        }
        return `Ошибка GPT: ${error.message}`;
    };

    const query = async (messages, {
        temperature = 0.7,
        model = DEFAULT_GPT_MODEL,
        useFreeTier = false
    } = {}) => {
        if (hasProxy()) {
            return callProxy(messages, { model, temperature });
        }

        if (gptApiKey) {
            const key = ensureKey();
            const response = await fetchImpl('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${key}`
                },
                body: JSON.stringify({
                    model,
                    messages,
                    temperature
                })
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                const error = new Error(data?.error?.message || `Ошибка API (${response.status})`);
                error.code = 'API_ERROR';
                throw error;
            }

            const text = extractChatMessage(data);
            if (!text) {
                const error = new Error('GPT вернул пустой ответ.');
                error.code = 'EMPTY_RESPONSE';
                throw error;
            }
            return text;
        }

        if (useFreeTier && hasFreeTier()) {
            try {
                const answer = await freeTier.respond(messages, { temperature, model });
                const text = typeof answer === 'string' ? answer.trim() : '';
                if (!text) {
                    const error = new Error('Бесплатный движок не вернул ответ.');
                    error.code = 'FREE_TIER_EMPTY';
                    throw error;
                }
                return text;
            } catch (error) {
                if (error && typeof error === 'object' && 'code' in error) {
                    throw error;
                }
                const wrapped = new Error(error instanceof Error ? error.message : String(error));
                wrapped.code = 'FREE_TIER_FAILED';
                throw wrapped;
            }
        }

        ensureKey();
    };

    const buildDateTimeProbe = () => {
        const now = new Date();
        const isoStamp = now.toISOString();
        const humanStamp = now.toLocaleString('ru-RU', {
            dateStyle: 'long',
            timeStyle: 'medium'
        });

        const messages = [
            {
                role: 'system',
                content: 'Ты проверяешь интеграцию Milana Superintelligence с API OpenAI. Следуй инструкциям пользователя буквально.'
            },
            {
                role: 'user',
                content: [
                    'Мы фиксируем текущее время в браузере.',
                    `ISO-временная метка: ${isoStamp}.`,
                    `В человеческом формате: ${humanStamp}.`,
                    'Подтверди интеграцию, повторив ISO-метку и добавив короткое воодушевляющее сообщение на русском языке.'
                ].join(' ')
            }
        ];

        return { messages, isoStamp, humanStamp };
    };

    const runDateTimeProbe = async () => {
        const { messages, isoStamp } = buildDateTimeProbe();
        const answer = await query(messages, { temperature: 0 });
        return { answer, isoStamp };
    };

    const testKey = async ({ candidate, message } = {}) => {
        const candidateValue = typeof candidate === 'string' ? candidate.trim() : '';
        const resolvedCandidate = candidateValue || keyField.value.trim();
        const proxyAvailable = hasProxy();

        if (!resolvedCandidate && !gptApiKey && proxyAvailable) {
            setStatus('Ключ не требуется. Проверяю подключение через защищённый прокси...', { error: false });
            toggleBusy(true);
            try {
                const confirmation = await callProxy([
                    { role: 'system', content: 'Ты лаконичный проверочный бот.' },
                    { role: 'user', content: 'Ответь одним словом «готово».' }
                ], { temperature: 0 });
                setStatus(`Прокси активен. GPT ответил: ${confirmation}. Запрашиваю дату и время...`);
                try {
                    const { answer, isoStamp } = await runDateTimeProbe();
                    setStatus(`Прокси готов. GPT подтвердил время ${isoStamp}. Ответ: ${answer}`);
                    return true;
                } catch (error) {
                    setStatus(`Прокси доступен, но проверка времени не удалась. ${formatError(error)}`, { error: true });
                    return false;
                }
            } catch (error) {
                setStatus(formatError(error), { error: true });
                return false;
            } finally {
                toggleBusy(false);
            }
        }

        if (!resolvedCandidate && !gptApiKey) {
            setStatus('Введите ключ перед проверкой.', { error: true });
            keyField.focus();
            return false;
        }

        const previousKey = gptApiKey;
        const persisted = persistKey(resolvedCandidate, { silent: true });
        const isNewCandidate = persisted && persisted !== previousKey;
        const statusMessage = message || (isNewCandidate
            ? 'Ключ сохранён, запускаю проверку...'
            : 'Запускаю проверку ключа...');
        setStatus(statusMessage);

        toggleBusy(true);
        try {
            const confirmation = await query([
                { role: 'system', content: 'Ты лаконичный проверочный бот.' },
                { role: 'user', content: 'Ответь одним словом «готово».' }
            ], { temperature: 0 });
            setStatus(`Ключ подтверждён. GPT ответил: ${confirmation}. Запрашиваю дату и время...`);
            try {
                const { answer, isoStamp } = await runDateTimeProbe();
                setStatus(`Интеграция активна. GPT подтвердил время ${isoStamp}. Ответ: ${answer}`);
                return true;
            } catch (error) {
                setStatus(`Ключ подтверждён, но проверка времени не удалась. ${formatError(error)}`, { error: true });
                return false;
            }
        } catch (error) {
            setStatus(formatError(error), { error: true });
            return false;
        } finally {
            toggleBusy(false);
        }
    };

    const applyKeyFromQuery = async () => {
        const url = coerceUrl(locationHref);
        if (!url) return;
        const keyFromQuery = (url.searchParams.get('sk') || '').trim();
        if (!keyFromQuery) return;

        url.searchParams.delete('sk');
        const sanitisedHref = url.toString();
        if (historyAPI && typeof historyAPI.replaceState === 'function') {
            try {
                historyAPI.replaceState(historyAPI.state ?? null, '', sanitisedHref);
            } catch (error) {
                console.warn('Не удалось очистить URL от ключа API:', error);
            }
        }
        locationHref = sanitisedHref;

        persistKey(keyFromQuery, { silent: true });
        const prefix = 'Ключ из ссылки сохранён.';
        const success = await testKey({
            candidate: keyFromQuery,
            message: `${prefix} Проверяю доступ...`
        });
        if (!success) {
            const previousMessage = statusField.textContent || '';
            const combined = previousMessage
                ? `${prefix} ${previousMessage}`
                : `${prefix} Проверьте корректность или повторите попытку.`;
            setStatus(combined, { error: true });
        }
    };

    const attachHandlers = () => {
        if (saveButton) {
            saveButton.addEventListener('click', async () => {
                const savedKey = persistKey('', { silent: true });
                if (!savedKey) {
                    setStatus(hasProxy()
                        ? 'Ключ не введён. Прокси AKSI продолжает работать без ключа.'
                        : 'Введите ключ перед сохранением.', { error: !hasProxy() });
                    return;
                }
                await testKey({
                    candidate: savedKey,
                    message: 'Ключ сохранён, проверяю доступ...'
                });
            });
        }

        if (clearButton) {
            clearButton.addEventListener('click', () => {
                clearKey();
            });
        }

        if (keyField) {
            keyField.addEventListener('change', () => {
                persistKey('', { silent: true });
            });
            keyField.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    if (saveButton && !saveButton.disabled) {
                        saveButton.click();
                    } else {
                        testButton?.click?.();
                    }
                }
            });
        }

        if (testButton) {
            testButton.addEventListener('click', () => {
                testKey();
            });
        }
    };

    const initialise = () => {
        loadFromStorage();
        attachHandlers();
    };

    initialise();

    const ready = autoApplyQuery ? applyKeyFromQuery() : Promise.resolve();

    return {
        get key() {
            return gptApiKey;
        },
        isBusy: () => busy,
        persistKey,
        clearKey,
        loadFromStorage,
        applyKeyFromQuery,
        query,
        testKey,
        formatError,
        runDateTimeProbe,
        ready
    };
}
