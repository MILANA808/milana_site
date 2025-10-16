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

const DEFAULT_API_BASE = 'https://api.openai.com/v1';

const sanitiseBaseUrl = (value) => {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    if (!trimmed) {
        return DEFAULT_API_BASE;
    }

    let candidate = trimmed;
    if (!/^https?:\/\//i.test(candidate)) {
        candidate = `https://${candidate.replace(/^\/+/, '')}`;
    }

    try {
        const url = new URL(candidate);
        const normalisedPath = url.pathname.replace(/\/+$/, '');
        return `${url.origin}${normalisedPath || ''}`;
    } catch (error) {
        return null;
    }
};

const sanitiseRelayEndpoint = (value, locationHref) => {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    if (!trimmed) {
        return '';
    }

    if (/^https?:\/\//i.test(trimmed)) {
        try {
            const url = new URL(trimmed);
            url.hash = '';
            return url.toString().replace(/\/+$/, '');
        } catch (error) {
            return null;
        }
    }

    if (trimmed.startsWith('/')) {
        if (!locationHref) {
            return trimmed.replace(/\/+$/, '');
        }
        try {
            const origin = new URL(locationHref).origin;
            return `${origin}${trimmed}`.replace(/\/+$/, '');
        } catch (error) {
            return trimmed.replace(/\/+$/, '');
        }
    }

    if (!locationHref) {
        return null;
    }

    try {
        const base = new URL(locationHref);
        const url = new URL(trimmed, base);
        url.hash = '';
        return url.toString().replace(/\/+$/, '');
    } catch (error) {
        return null;
    }
};

const normaliseMessagesForResponses = (messages = []) => {
    if (!Array.isArray(messages)) return [];
    return messages.map((message = {}) => {
        const role = message?.role || 'user';
        const content = message?.content;
        if (Array.isArray(content)) {
            const normalised = content.map((part) => {
                if (part && typeof part === 'object' && 'type' in part && part.type === 'text') {
                    return { type: 'text', text: part.text ?? '' };
                }
                if (typeof part === 'string') {
                    return { type: 'text', text: part };
                }
                if (part && typeof part === 'object' && 'text' in part) {
                    return { type: 'text', text: String(part.text ?? '') };
                }
                return { type: 'text', text: JSON.stringify(part ?? '') };
            });
            return { role, content: normalised };
        }

        if (typeof content === 'string') {
            return { role, content: [{ type: 'text', text: content }] };
        }

        if (content && typeof content === 'object' && 'text' in content) {
            return { role, content: [{ type: 'text', text: String(content.text ?? '') }] };
        }

        const fallback = content == null ? '' : JSON.stringify(content);
        return { role, content: [{ type: 'text', text: fallback }] };
    });
};

const extractTextFromResponses = (payload) => {
    if (!payload || typeof payload !== 'object') return '';

    const segments = [];
    const seen = new Set();
    const pushText = (value) => {
        if (typeof value !== 'string') return;
        const trimmed = value.trim();
        if (!trimmed || seen.has(trimmed)) {
            return;
        }
        seen.add(trimmed);
        segments.push(trimmed);
    };

    const exploreContent = (content = []) => {
        if (!Array.isArray(content)) return;
        content.forEach((piece) => {
            if (!piece) return;
            if (typeof piece === 'string') {
                pushText(piece);
                return;
            }
            if (piece.text) {
                pushText(piece.text);
                return;
            }
            if (piece.value) {
                pushText(piece.value);
                return;
            }
            if (piece.output_text) {
                pushText(piece.output_text);
            }
        });
    };

    if (Array.isArray(payload.output)) {
        payload.output.forEach((entry) => {
            if (entry?.content) {
                exploreContent(entry.content);
            }
        });
    }

    if (Array.isArray(payload.content)) {
        exploreContent(payload.content);
    }

    if (typeof payload.output_text === 'string') {
        pushText(payload.output_text);
    }

    return segments.join('').trim();
};

const safeJson = async (response) => {
    try {
        return await response.json();
    } catch (error) {
        return {};
    }
};

export const DEFAULT_GPT_MODEL = 'gpt-4o-mini';

export function createGptIntegration({
    keyField,
    saveButton,
    testButton,
    clearButton,
    statusField,
    apiBaseField,
    projectField,
    relayField,
    relaySaveButton,
    relayClearButton,
    relayStatusField,
    endpointSaveButton,
    endpointStatusField,
    diagnosticsButton,
    diagnosticsLog,
    storage = typeof window !== 'undefined' ? window.localStorage : undefined,
    fetchImpl = typeof window !== 'undefined' ? window.fetch.bind(window) : undefined,
    locationHref = typeof window !== 'undefined' ? window.location?.href : undefined,
    autoApplyQuery = true,
    freeTier
} = {}) {
    keyField = requiredElement(keyField, 'ввода ключа');
    statusField = requiredElement(statusField, 'статуса ключа');

    const storageAPI = getStorageAPI(storage);

    if (!fetchImpl) {
        throw new Error('Не найдена функция fetch для интеграции с GPT.');
    }

    let gptApiKey = '';
    let busy = false;
    let apiBase = DEFAULT_API_BASE;
    let projectId = '';
    let relayEndpoint = '';

    const DIAGNOSTICS_LIMIT = 30;
    const diagnosticsHistory = [];

    if (diagnosticsLog) {
        diagnosticsLog.dataset.state = 'info';
    }

    const updateDiagnosticsView = ({ error = false } = {}) => {
        if (!diagnosticsLog) return;
        diagnosticsLog.textContent = diagnosticsHistory.length
            ? diagnosticsHistory.join('\n')
            : 'История диагностики появится после первой проверки.';
        diagnosticsLog.dataset.state = error ? 'error' : 'info';
    };

    const recordDiagnostic = (message, { error = false } = {}) => {
        if (!message) {
            updateDiagnosticsView({ error });
            return;
        }
        const stamp = new Date().toLocaleTimeString('ru-RU', { hour12: false });
        const entry = `${stamp} — ${message}`;
        diagnosticsHistory.push(entry);
        if (diagnosticsHistory.length > DIAGNOSTICS_LIMIT) {
            diagnosticsHistory.splice(0, diagnosticsHistory.length - DIAGNOSTICS_LIMIT);
        }
        updateDiagnosticsView({ error });
    };

    const hasFreeTier = () => freeTier && typeof freeTier.respond === 'function';

    const setStatus = (message, { error = false } = {}) => {
        statusField.textContent = message || '';
        statusField.style.color = error ? '#ff8fb7' : '#d4c7ff';
        if (message) {
            recordDiagnostic(`Статус ключа: ${message}`, { error });
        }
    };

    const updateEndpointStatus = (message, { error = false } = {}) => {
        if (!endpointStatusField) return;
        endpointStatusField.textContent = message || '';
        endpointStatusField.style.color = error ? '#ff8fb7' : '#d4c7ff';
        if (message) {
            recordDiagnostic(`Статус API: ${message}`, { error });
        }
    };

    const setRelayStatus = (message, { error = false } = {}) => {
        if (!relayStatusField) return;
        relayStatusField.textContent = message || '';
        relayStatusField.style.color = error ? '#ff8fb7' : '#d4c7ff';
        if (message) {
            recordDiagnostic(`Статус ретранслятора: ${message}`, { error });
        }
    };

    const describeEndpoint = () => {
        const parts = [`Базовый URL: ${apiBase || DEFAULT_API_BASE}.`];
        parts.push(projectId ? `Project ID: ${projectId}.` : 'Project ID не задан.');
        parts.push('Настройте прокси или проектные ключи в расширенном блоке при необходимости.');
        return parts.join(' ');
    };

    const describeRelay = () => relayEndpoint
        ? `Ретранслятор активен: ${relayEndpoint}.`
        : 'Ретранслятор не настроен. Запросы идут напрямую.';

    const syncField = (value) => {
        if (!keyField) return;
        keyField.value = value || '';
    };

    const syncApiBaseField = (value) => {
        if (!apiBaseField) return;
        apiBaseField.value = value || '';
    };

    const syncProjectField = (value) => {
        if (!projectField) return;
        projectField.value = value || '';
    };

    const syncRelayField = (value) => {
        if (!relayField) return;
        relayField.value = value || '';
    };

    const persistApiBase = (value, { silent = false } = {}) => {
        const sanitised = sanitiseBaseUrl(value);
        if (!sanitised) {
            if (!silent) {
                updateEndpointStatus('Некорректный URL API. Используйте полный адрес, например https://api.openai.com/v1.', { error: true });
            } else {
                updateEndpointStatus(describeEndpoint());
            }
            syncApiBaseField(apiBase);
            return apiBase;
        }

        apiBase = sanitised;
        storageAPI.setItem('gptApiBase', apiBase);
        syncApiBaseField(apiBase);
        if (!silent) {
            updateEndpointStatus(`API базовый URL сохранён. ${describeEndpoint()}`);
        } else {
            updateEndpointStatus(describeEndpoint());
        }
        return apiBase;
    };

    const persistProjectId = (value, { silent = false } = {}) => {
        const trimmed = typeof value === 'string' ? value.trim() : '';
        projectId = trimmed;
        if (trimmed) {
            storageAPI.setItem('gptProjectId', projectId);
        } else {
            storageAPI.removeItem('gptProjectId');
        }
        syncProjectField(projectId);
        if (!silent) {
            const prefix = projectId ? 'Project ID сохранён.' : 'Project ID очищен.';
            updateEndpointStatus(`${prefix} ${describeEndpoint()}`);
        } else {
            updateEndpointStatus(describeEndpoint());
        }
        return projectId;
    };

    const persistRelayEndpoint = (value, { silent = false } = {}) => {
        const sanitised = sanitiseRelayEndpoint(value, locationHref);
        if (sanitised === '') {
            relayEndpoint = '';
            storageAPI.removeItem('gptRelayEndpoint');
            syncRelayField('');
            if (!silent) {
                setRelayStatus('Ретранслятор отключён. Запросы пойдут напрямую.');
            } else {
                setRelayStatus(describeRelay());
            }
            return relayEndpoint;
        }

        if (!sanitised) {
            if (!silent) {
                setRelayStatus('Некорректный адрес ретранслятора. Укажите полный URL или относительный путь.', { error: true });
            }
            syncRelayField(relayEndpoint);
            return relayEndpoint;
        }

        relayEndpoint = sanitised;
        storageAPI.setItem('gptRelayEndpoint', relayEndpoint);
        syncRelayField(relayEndpoint);
        if (!silent) {
            setRelayStatus('Ретранслятор сохранён. Запросы будут отправляться через него.');
        } else {
            setRelayStatus(describeRelay());
        }
        return relayEndpoint;
    };

    const clearRelayEndpoint = ({ silent = false } = {}) => persistRelayEndpoint('', { silent });

    const loadEndpointSettings = ({ silent = false } = {}) => {
        const storedBase = storageAPI.getItem('gptApiBase');
        const storedProject = storageAPI.getItem('gptProjectId');
        const storedRelay = storageAPI.getItem('gptRelayEndpoint');

        const resolvedBase = sanitiseBaseUrl(storedBase) || DEFAULT_API_BASE;
        apiBase = resolvedBase;
        syncApiBaseField(apiBase);

        const resolvedProject = typeof storedProject === 'string' ? storedProject.trim() : '';
        projectId = resolvedProject;
        if (resolvedProject) {
            storageAPI.setItem('gptProjectId', resolvedProject);
        } else {
            storageAPI.removeItem('gptProjectId');
        }
        syncProjectField(projectId);

        if (typeof storedRelay === 'string') {
            persistRelayEndpoint(storedRelay, { silent: true });
        } else {
            clearRelayEndpoint({ silent: true });
        }

        if (silent) {
            updateEndpointStatus(describeEndpoint());
            setRelayStatus(describeRelay());
        } else {
            updateEndpointStatus(`Настройки API загружены. ${describeEndpoint()}`);
            setRelayStatus(describeRelay());
        }

        return { apiBase, projectId, relayEndpoint };
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
        [saveButton, testButton, endpointSaveButton, diagnosticsButton, relaySaveButton, relayClearButton].forEach((button) => {
            if (button) {
                button.disabled = busy;
            }
        });
    };

    const loadFromStorage = ({ silent = false } = {}) => {
        const { relayEndpoint: currentRelay } = loadEndpointSettings({ silent });
        gptApiKey = storageAPI.getItem('gptApiKey') || '';
        syncField(gptApiKey);
        if (gptApiKey) {
            setStatus('Ключ загружен и готов к работе.');
        } else if (currentRelay) {
            setStatus('Ретранслятор активен. Запросы будут выполняться через сервер.');
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
        if (relayEndpoint) {
            setStatus('Ключ удалён. Запросы продолжат идти через настроенный ретранслятор.');
        } else if (hasFreeTier()) {
            setStatus('Ключ удалён. Доступен бесплатный режим Super GPT без облачных моделей.');
        } else {
            setStatus('Ключ удалён из этого браузера.');
        }
        return gptApiKey;
    };

    const ensureKey = () => {
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
            return 'Добавьте ключ OpenAI API в блоке «Интеграция с GPT». Ключ хранится только в вашем браузере.';
        }
        if (error.code === 'NETWORK_ERROR') {
            return 'Не удалось подключиться к OpenAI. Проверьте интернет, HTTPS-доступ к базовому URL и настройки CORS либо используйте собственный прокси.';
        }
        if (error.code === 'RELAY_ERROR') {
            return `Ретранслятор вернул ошибку: ${error.message}. Проверьте адрес сервера или его логи.`;
        }
        if (error.code === 'RELAY_DISABLED') {
            return 'Ретранслятор не настроен. Укажите URL сервера или добавьте ключ API.';
        }
        if (error.code === 'FREE_TIER_EMPTY') {
            return 'Бесплатный режим Super GPT не смог подготовить ответ. Уточните запрос или добавьте ключ для облачных моделей.';
        }
        if (error.code === 'FREE_TIER_FAILED') {
            return `Бесплатный режим Super GPT вернул ошибку: ${error.message}`;
        }
        if (error.code === 'API_ERROR' && error.status === 401) {
            const note = error.message ? ` (${error.message})` : '';
            return `OpenAI отклонил запрос${note}: проверьте корректность ключа и ID проекта.`;
        }
        if (error.code === 'API_ERROR' && error.status === 404) {
            const hint = error.message ? ` (${error.message})` : '';
            return `Endpoint OpenAI не найден${hint}. Убедитесь, что базовый URL верный или настройте прокси, поддерживающий /chat/completions или /responses.`;
        }
        if (error.code === 'EMPTY_RESPONSE') {
            return 'GPT вернул пустой ответ. Попробуйте отправить запрос повторно.';
        }
        if (error.code === 'NO_ROUTE') {
            return 'Нет доступного пути до GPT. Добавьте ключ, настройте ретранслятор или включите бесплатный режим.';
        }
        return `Ошибка GPT: ${error.message}`;
    };

    const baseForFetch = () => (apiBase || DEFAULT_API_BASE).replace(/\/+$/, '');

    const buildHeaders = () => {
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${ensureKey()}`
        };
        if (projectId) {
            headers['OpenAI-Project'] = projectId;
        }
        return headers;
    };

    const safeFetchCall = async (url, options) => {
        try {
            const response = await fetchImpl(url, options);
            const method = options?.method || 'GET';
            const status = typeof response?.status === 'number' ? response.status : 'нет статуса';
            recordDiagnostic(`HTTP ${method} ${url} → статус ${status}`);
            return response;
        } catch (error) {
            const networkError = new Error(error instanceof Error ? error.message : String(error));
            networkError.code = 'NETWORK_ERROR';
            recordDiagnostic(`Сетевая ошибка при обращении к ${url}: ${networkError.message}`, { error: true });
            throw networkError;
        }
    };

    const callChatCompletions = async ({ messages, temperature, model }) => {
        const url = `${baseForFetch()}/chat/completions`;
        const response = await safeFetchCall(url, {
            method: 'POST',
            headers: buildHeaders(),
            body: JSON.stringify({ model, messages, temperature }),
            cache: 'no-store',
            mode: 'cors'
        });

        const data = await safeJson(response);
        if (!response.ok) {
            const error = new Error(data?.error?.message || `Ошибка API (${response.status})`);
            error.code = response.status === 404 ? 'UNSUPPORTED_ROUTE' : 'API_ERROR';
            error.status = response.status;
            error.details = data;
            recordDiagnostic(`Chat Completions ошибка ${response.status}: ${error.message}`, { error: true });
            throw error;
        }

        const text = data?.choices?.[0]?.message?.content?.trim();
        if (!text) {
            const error = new Error('GPT вернул пустой ответ.');
            error.code = 'EMPTY_RESPONSE';
            throw error;
        }
        return text;
    };

    const callResponsesEndpoint = async ({ messages, temperature, model }) => {
        const url = `${baseForFetch()}/responses`;
        const headers = buildHeaders();
        headers['OpenAI-Beta'] = 'assistants=v1';
        const response = await safeFetchCall(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                model,
                input: normaliseMessagesForResponses(messages),
                temperature
            }),
            cache: 'no-store',
            mode: 'cors'
        });

        const data = await safeJson(response);
        if (!response.ok) {
            const error = new Error(data?.error?.message || `Ошибка API (${response.status})`);
            error.code = 'API_ERROR';
            error.status = response.status;
            error.details = data;
            recordDiagnostic(`/responses ошибка ${response.status}: ${error.message}`, { error: true });
            throw error;
        }

        const text = extractTextFromResponses(data);
        if (!text) {
            const error = new Error('GPT вернул пустой ответ через endpoint /responses.');
            error.code = 'EMPTY_RESPONSE';
            throw error;
        }
        return text;
    };

    const callRelayEndpoint = async ({ messages, temperature, model }) => {
        if (!relayEndpoint) {
            const error = new Error('Ретранслятор не настроен.');
            error.code = 'RELAY_DISABLED';
            throw error;
        }

        const response = await safeFetchCall(relayEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                mode: 'chat',
                messages,
                temperature,
                model
            }),
            cache: 'no-store',
            mode: 'cors'
        });

        const data = await safeJson(response);
        if (!response.ok) {
            const message = data?.error?.message || `Ошибка ретранслятора (${response.status})`;
            const error = new Error(message);
            error.code = 'RELAY_ERROR';
            error.status = response.status;
            error.details = data;
            recordDiagnostic(`Ретранслятор ответил ошибкой ${response.status}: ${message}`, { error: true });
            throw error;
        }

        if (Array.isArray(data?.log)) {
            data.log.forEach((entry) => {
                if (entry) {
                    recordDiagnostic(`Relay log: ${entry}`);
                }
            });
        }

        const route = typeof data?.route === 'string' ? data.route : '';
        if (route) {
            recordDiagnostic(`Ретранслятор использовал маршрут ${route}.`);
        }

        const text = typeof data?.text === 'string' ? data.text.trim() : '';
        if (!text) {
            const error = new Error('Ретранслятор вернул пустой ответ.');
            error.code = 'EMPTY_RESPONSE';
            throw error;
        }

        return text;
    };

    const pingRelay = async () => {
        if (!relayEndpoint) return null;

        const response = await safeFetchCall(relayEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ mode: 'ping' }),
            cache: 'no-store',
            mode: 'cors'
        });

        const data = await safeJson(response);
        if (!response.ok) {
            const message = data?.error?.message || `Ретранслятор ответил статусом ${response.status}`;
            const error = new Error(message);
            error.code = 'RELAY_ERROR';
            error.status = response.status;
            error.details = data;
            throw error;
        }

        return data;
    };

    const query = async (messages, {
        temperature = 0.7,
        model = DEFAULT_GPT_MODEL,
        useFreeTier = false
    } = {}) => {
        const attempts = [];

        if (relayEndpoint) {
            attempts.push(async () => {
                recordDiagnostic('Пробую отправить запрос через ретранслятор.');
                return await callRelayEndpoint({ messages, temperature, model });
            });
        }

        if (gptApiKey) {
            attempts.push(async () => {
                recordDiagnostic('Отправляю запрос в OpenAI /chat/completions.');
                return await callChatCompletions({ messages, temperature, model });
            });
            attempts.push(async () => {
                recordDiagnostic('Отправляю запрос в OpenAI /responses.');
                const reply = await callResponsesEndpoint({ messages, temperature, model });
                updateEndpointStatus(`Использован endpoint /responses. ${describeEndpoint()}`);
                return reply;
            });
        }

        if (useFreeTier && hasFreeTier()) {
            attempts.push(async () => {
                recordDiagnostic('Активирую бесплатный режим Super GPT.');
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
            });
        }

        if (!attempts.length) {
            if (!gptApiKey && !relayEndpoint) {
                const error = new Error('Добавьте ключ OpenAI API или настройте ретранслятор, чтобы выполнить запрос.');
                error.code = 'NO_KEY';
                throw error;
            }
            const error = new Error('Нет доступных маршрутов для запроса к GPT.');
            error.code = 'NO_ROUTE';
            throw error;
        }

        let lastError = null;
        for (const attempt of attempts) {
            try {
                const result = await attempt();
                if (typeof result === 'string' && result.trim()) {
                    return result.trim();
                }
            } catch (error) {
                const normalized = error instanceof Error ? error : new Error(String(error));
                lastError = normalized;
                recordDiagnostic(`Попытка запроса завершилась ошибкой: ${normalized.message}`, { error: true });
                if (normalized.code === 'UNSUPPORTED_ROUTE') {
                    continue;
                }
            }
        }

        if (lastError) {
            throw lastError;
        }

        const fallbackError = new Error('GPT вернул пустой ответ.');
        fallbackError.code = 'EMPTY_RESPONSE';
        throw fallbackError;
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

    const runDiagnostics = async () => {
        recordDiagnostic('Диагностика: старт.');
        toggleBusy(true);
        try {
            if (relayEndpoint) {
                recordDiagnostic(`Ретранслятор активен (${relayEndpoint}). Проверяю отклик...`);
                try {
                    const relayResponse = await pingRelay();
                    const summary = relayResponse?.message || 'Ретранслятор ответил успешно.';
                    recordDiagnostic(`Relay ping: ${summary}`);
                    setRelayStatus(`Ретранслятор отвечает. ${summary}`);
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    recordDiagnostic(`Ретранслятор не ответил: ${message}`, { error: true });
                    setRelayStatus(`Ретранслятор не отвечает: ${message}`, { error: true });
                }
            } else {
                setRelayStatus(describeRelay());
            }

            const base = baseForFetch();
            const endpointSummary = projectId
                ? `Текущий endpoint ${base}, проект ${projectId}.`
                : `Текущий endpoint ${base}.`;
            recordDiagnostic(endpointSummary);

            try {
                const pingResponse = await safeFetchCall(base, {
                    method: 'GET',
                    mode: 'cors',
                    cache: 'no-store'
                });
                const status = typeof pingResponse?.status === 'number' ? pingResponse.status : 'нет статуса';
                recordDiagnostic(`Проверка базового URL завершена со статусом ${status}.`, {
                    error: typeof status === 'number' && status >= 500
                });
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                recordDiagnostic(`Не удалось обратиться к базовому URL: ${message}`, { error: true });
                setStatus('Не удалось связаться с базовым URL OpenAI. Проверьте интернет или CORS.', { error: true });
                return false;
            }

            if (gptApiKey) {
                recordDiagnostic('Ключ найден. Запускаю контрольный запрос к OpenAI.');
                const success = await testKey({ message: 'Диагностика: проверяю ключ...' });
                recordDiagnostic(success ? 'Диагностика завершена успешно.' : 'Проверка ключа завершилась с ошибками.', {
                    error: !success
                });
                return success;
            }

            if (relayEndpoint) {
                recordDiagnostic('Ключ отсутствует, проверяю ретранслятор запросом к GPT.');
                try {
                    const confirmation = await query([
                        { role: 'system', content: 'Диагностика ретранслятора Milana Super GPT.' },
                        { role: 'user', content: 'Ответь фразой «relay-ok».' }
                    ]);
                    const short = confirmation.length > 90 ? `${confirmation.slice(0, 90)}…` : confirmation;
                    setStatus(`Ретранслятор активен. Ответ: ${short}`);
                    recordDiagnostic(`Ретранслятор вернул ответ: ${short}`);
                    return true;
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    recordDiagnostic(`Ретранслятор не прошёл проверку: ${message}`, { error: true });
                    setStatus(formatError(error), { error: true });
                    return false;
                }
            }

            if (hasFreeTier()) {
                recordDiagnostic('Ключ не найден. Проверяю бесплатный движок Milana Super GPT.');
                try {
                    const reply = await query([
                        { role: 'system', content: 'Диагностический запрос бесплатного режима.' },
                        { role: 'user', content: 'Ответь коротко словом «готово».' }
                    ], { useFreeTier: true });
                    const trimmed = typeof reply === 'string' ? reply.trim() : '';
                    if (trimmed) {
                        const short = trimmed.length > 90 ? `${trimmed.slice(0, 90)}…` : trimmed;
                        recordDiagnostic(`Free tier ответил: ${short}`);
                    }
                    setStatus('Диагностика бесплатного режима завершена. Добавьте ключ, чтобы подключить облачные модели.', {
                        error: false
                    });
                    return true;
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    recordDiagnostic(`Бесплатный режим вернул ошибку: ${message}`, { error: true });
                    setStatus(formatError(error), { error: true });
                    return false;
                }
            }

            recordDiagnostic('Ключ не задан. Добавьте ключ OpenAI API для диагностики облачного соединения.', { error: true });
            setStatus('Добавьте ключ OpenAI API, чтобы пройти диагностику облачного соединения.', { error: true });
            return false;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            recordDiagnostic(`Диагностика завершилась исключением: ${message}`, { error: true });
            setStatus(formatError(error), { error: true });
            return false;
        } finally {
            toggleBusy(false);
        }
    };

    const testKey = async ({ candidate, message } = {}) => {
        const candidateValue = typeof candidate === 'string' ? candidate.trim() : '';
        const previousKey = gptApiKey;
        let persisted = gptApiKey;

        if (candidateValue) {
            persisted = persistKey(candidateValue, { silent: true });
        } else if (gptApiKey) {
            persisted = gptApiKey;
            syncField(gptApiKey);
        } else if (keyField.value.trim()) {
            persisted = persistKey(keyField.value.trim(), { silent: true });
        }

        if (!persisted && !relayEndpoint) {
            setStatus('Введите ключ перед проверкой.', { error: true });
            keyField.focus();
            return false;
        }

        const isNewCandidate = Boolean(persisted && persisted !== previousKey);
        const statusMessage = message || (persisted
            ? (isNewCandidate ? 'Ключ сохранён, запускаю проверку...' : 'Запускаю проверку ключа...')
            : 'Ключ не задан. Проверяю ретранслятор...');
        setStatus(statusMessage);

        toggleBusy(true);
        try {
            const confirmation = await query([
                { role: 'system', content: 'Ты лаконичный проверочный бот.' },
                { role: 'user', content: 'Ответь одним словом «готово».' }
            ], { temperature: 0 });
            if (persisted) {
                setStatus(`Ключ подтверждён. GPT ответил: ${confirmation}. Запрашиваю дату и время...`);
            } else {
                setStatus(`Ретранслятор активен. GPT ответил: ${confirmation}. Запрашиваю дату и время...`);
            }
            try {
                const { answer, isoStamp } = await runDateTimeProbe();
                if (persisted) {
                    setStatus(`Интеграция активна. GPT подтвердил время ${isoStamp}. Ответ: ${answer}`);
                } else {
                    setStatus(`Ретранслятор подтверждён. GPT повторил время ${isoStamp}. Ответ: ${answer}`);
                }
                return true;
            } catch (error) {
                const prefix = persisted
                    ? 'Ключ подтверждён, но проверка времени не удалась.'
                    : 'Ретранслятор ответил, но проверка времени не удалась.';
                setStatus(`${prefix} ${formatError(error)}`, { error: true });
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
                    setStatus('Введите ключ перед сохранением.', { error: true });
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

        if (diagnosticsButton) {
            diagnosticsButton.addEventListener('click', () => {
                runDiagnostics();
            });
        }

        if (endpointSaveButton) {
            endpointSaveButton.addEventListener('click', () => {
                const baseCandidate = apiBaseField?.value;
                const projectCandidate = projectField?.value;
                persistApiBase(baseCandidate, { silent: true });
                persistProjectId(projectCandidate, { silent: true });
                updateEndpointStatus(`Настройки API сохранены. ${describeEndpoint()}`);
            });
        }

        if (relaySaveButton) {
            relaySaveButton.addEventListener('click', () => {
                const relayCandidate = relayField?.value;
                persistRelayEndpoint(relayCandidate);
            });
        }

        if (relayClearButton) {
            relayClearButton.addEventListener('click', () => {
                clearRelayEndpoint();
            });
        }

        if (apiBaseField) {
            apiBaseField.addEventListener('blur', () => {
                persistApiBase(apiBaseField.value);
            });
            apiBaseField.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    persistApiBase(apiBaseField.value);
                }
            });
        }

        if (projectField) {
            projectField.addEventListener('blur', () => {
                persistProjectId(projectField.value);
            });
            projectField.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    persistProjectId(projectField.value);
                }
            });
        }

        if (relayField) {
            relayField.addEventListener('blur', () => {
                persistRelayEndpoint(relayField.value);
            });
            relayField.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    persistRelayEndpoint(relayField.value);
                }
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
        get apiBase() {
            return apiBase;
        },
        get project() {
            return projectId;
        },
        get relay() {
            return relayEndpoint;
        },
        isBusy: () => busy,
        persistKey,
        persistApiBase,
        persistProjectId,
        persistRelayEndpoint,
        clearRelayEndpoint,
        clearKey,
        loadFromStorage,
        loadEndpointSettings,
        applyKeyFromQuery,
        query,
        testKey,
        runDiagnostics,
        formatError,
        runDateTimeProbe,
        ready
    };
}
