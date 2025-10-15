const getStorageAPI = (storage) => {
    if (!storage) {
        return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {}
        };
    }
    return storage;
};

const sanitiseQuery = (query) => {
    if (!query) return '';
    return String(query).trim().slice(0, 160);
};

const mapSettled = (results, handlers) => results.map((result, index) => {
    if (result.status === 'fulfilled') {
        return handlers.fulfilled(result.value, index);
    }
    return handlers.rejected(result.reason, index);
});

const buildWikipediaConnector = () => ({
    id: 'wikipedia',
    label: 'Википедия',
    description: 'Энциклопедические сведения из открытых источников.',
    defaultEnabled: true,
    async fetch(query, { fetchImpl }) {
        const topic = sanitiseQuery(query).replace(/[\s]+/g, '_');
        if (!topic) {
            throw new Error('Нет темы для поиска на Википедии.');
        }
        const url = `https://ru.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`;
        const response = await fetchImpl(url, {
            headers: { 'Accept': 'application/json' }
        });
        if (!response.ok) {
            throw new Error('Википедия не нашла подходящий материал.');
        }
        const data = await response.json();
        const summary = data.extract || data.description || '';
        if (!summary) {
            throw new Error('Википедия вернула пустой ответ.');
        }
        return summary.slice(0, 700);
    }
});

const buildHackerNewsConnector = () => ({
    id: 'hackernews',
    label: 'Hacker News',
    description: 'Тренды сообщества разработчиков и стартапов.',
    defaultEnabled: true,
    async fetch(query, { fetchImpl, limit = 3 }) {
        const topic = sanitiseQuery(query);
        if (!topic) {
            throw new Error('Нет темы для поиска на Hacker News.');
        }
        const url = new URL('https://hn.algolia.com/api/v1/search');
        url.searchParams.set('query', topic);
        url.searchParams.set('tags', 'story');
        url.searchParams.set('hitsPerPage', String(limit));
        const response = await fetchImpl(url.toString(), { headers: { 'Accept': 'application/json' } });
        if (!response.ok) {
            throw new Error('Hacker News недоступен.');
        }
        const data = await response.json();
        const hits = Array.isArray(data.hits) ? data.hits.slice(0, limit) : [];
        if (!hits.length) {
            throw new Error('На Hacker News нет подходящих тем.');
        }
        return hits.map((hit, index) => {
            const title = hit?.title || hit?.story_title || 'Без названия';
            const urlValue = hit?.url || hit?.story_url || '';
            return `${index + 1}. ${title}${urlValue ? ` — ${urlValue}` : ''}`;
        }).join('\n');
    }
});

const buildOpenLibraryConnector = () => ({
    id: 'openlibrary',
    label: 'Open Library',
    description: 'Каталог книг и исследований из открытой библиотеки Internet Archive.',
    defaultEnabled: false,
    async fetch(query, { fetchImpl, limit = 3 }) {
        const topic = sanitiseQuery(query);
        if (!topic) {
            throw new Error('Нет темы для поиска книг в Open Library.');
        }
        const url = new URL('https://openlibrary.org/search.json');
        url.searchParams.set('q', topic);
        url.searchParams.set('limit', String(limit));
        const response = await fetchImpl(url.toString(), { headers: { 'Accept': 'application/json' } });
        if (!response.ok) {
            throw new Error('Open Library недоступна.');
        }
        const data = await response.json();
        const docs = Array.isArray(data.docs) ? data.docs.slice(0, limit) : [];
        if (!docs.length) {
            throw new Error('Open Library не нашла подходящих изданий.');
        }
        return docs.map((doc, index) => {
            const title = doc?.title || 'Без названия';
            const year = doc?.first_publish_year ? ` (${doc.first_publish_year})` : '';
            const author = Array.isArray(doc?.author_name) && doc.author_name.length
                ? ` — ${doc.author_name[0]}`
                : '';
            return `${index + 1}. ${title}${author}${year}`;
        }).join('\n');
    }
});

const defaultConnectors = [
    buildWikipediaConnector(),
    buildHackerNewsConnector(),
    buildOpenLibraryConnector()
];

const STORAGE_KEY = 'gptKnowledgeHub';

export function createKnowledgeHub({
    storage = typeof window !== 'undefined' ? window.localStorage : undefined,
    fetchImpl = typeof window !== 'undefined' ? window.fetch.bind(window) : undefined,
    connectors = defaultConnectors
} = {}) {
    if (!fetchImpl) {
        throw new Error('Не найдена функция fetch для доступа к интернет-источникам.');
    }

    const storageAPI = getStorageAPI(storage);
    const listeners = new Set();

    const safeParse = (value) => {
        if (!value) return {};
        try {
            return JSON.parse(value);
        } catch (error) {
            return {};
        }
    };

    const loadState = () => safeParse(storageAPI.getItem(STORAGE_KEY));
    const saveState = (state) => {
        storageAPI.setItem(STORAGE_KEY, JSON.stringify(state));
        listeners.forEach((listener) => {
            try {
                listener();
            } catch (error) {
                console.error('KnowledgeHub listener error', error); // eslint-disable-line no-console
            }
        });
    };

    const state = loadState();
    if (!state.enabled) {
        state.enabled = {};
    }

    const getConnectors = () => connectors.map((connector) => ({
        ...connector,
        enabled: state.enabled[connector.id] ?? connector.defaultEnabled !== false
    }));

    const setConnectorEnabled = (id, enabled) => {
        state.enabled[id] = !!enabled;
        saveState(state);
    };

    const subscribe = (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
    };

    const gather = async (query, { limit = 3 } = {}) => {
        const topic = sanitiseQuery(query);
        const active = getConnectors().filter((connector) => connector.enabled);
        if (!active.length || !topic) {
            return { entries: [], combinedText: '', errors: topic ? [] : ['Не задан запрос для агрегации данных.'] };
        }

        const requests = active.map(async (connector) => {
            const content = await connector.fetch(topic, { fetchImpl, limit });
            return { id: connector.id, label: connector.label, content };
        });

        const settled = await Promise.allSettled(requests);
        const entries = mapSettled(settled, {
            fulfilled: (value) => value,
            rejected: (reason, index) => ({
                id: active[index].id,
                label: active[index].label,
                error: reason instanceof Error ? reason.message : String(reason)
            })
        });

        const successful = entries.filter((entry) => !entry.error);
        const combinedText = successful.map((entry) => `${entry.label}: ${entry.content}`).join('\n\n');
        const errors = entries.filter((entry) => entry.error).map((entry) => `${entry.label}: ${entry.error}`);

        return { entries, combinedText, errors };
    };

    return {
        getConnectors,
        setConnectorEnabled,
        subscribe,
        gather
    };
}
