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

const STORAGE_KEY = 'gptLongTermMemory';

const sanitise = (value) => {
    if (!value) return '';
    return String(value).replace(/[\s\n]+/g, ' ').trim();
};

const truncate = (text, maxLength) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength - 1)}…`;
};

export function createMemoryVault({
    storage = typeof window !== 'undefined' ? window.localStorage : undefined,
    maxEntries = 40
} = {}) {
    const storageAPI = getStorageAPI(storage);

    const read = () => {
        try {
            const stored = storageAPI.getItem(STORAGE_KEY);
            if (!stored) return [];
            const parsed = JSON.parse(stored);
            if (!Array.isArray(parsed)) return [];
            return parsed;
        } catch (error) {
            return [];
        }
    };

    const write = (entries) => {
        try {
            storageAPI.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-maxEntries)));
        } catch (error) {
            // storage может быть недоступен, просто игнорируем
        }
    };

    const remember = ({ user, assistant, timestamp = new Date().toISOString() }) => {
        const cleanUser = sanitise(user);
        const cleanAssistant = sanitise(assistant);
        if (!cleanUser && !cleanAssistant) {
            return;
        }
        const entries = read();
        entries.push({ user: cleanUser, assistant: cleanAssistant, timestamp });
        write(entries);
    };

    const clear = () => {
        try {
            storageAPI.removeItem(STORAGE_KEY);
        } catch (error) {
            // ignore
        }
    };

    const formatEntry = (entry, index) => {
        const date = entry.timestamp ? new Date(entry.timestamp).toLocaleString('ru-RU') : `Запись ${index + 1}`;
        const user = truncate(entry.user || 'Вопрос без текста', 140);
        const assistant = truncate(entry.assistant || 'Ответ отсутствует', 180);
        return `${date}: ${user} → ${assistant}`;
    };

    const recall = ({ limit = 4, maxLength = 900 } = {}) => {
        const entries = read();
        if (!entries.length) return '';
        const latest = entries.slice(-limit);
        const formatted = latest.map(formatEntry);
        return truncate(formatted.join('\n'), maxLength);
    };

    const exportAll = () => read();

    return {
        remember,
        recall,
        clear,
        exportAll
    };
}
