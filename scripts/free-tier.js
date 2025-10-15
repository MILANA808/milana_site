const normaliseTopic = (text) => {
    if (!text) return '';
    return String(text).toLowerCase().replace(/\s+/g, ' ').trim();
};

const toArray = (value) => Array.isArray(value) ? value : [];

const limitText = (text, maxLength = 900) => {
    if (!text) return '';
    const content = String(text);
    return content.length > maxLength ? `${content.slice(0, maxLength)}…` : content;
};

export function createFreeTierEngine({
    knowledgeHub,
    memoryVault,
    clock = () => new Date(),
    cacheTtl = 60_000
} = {}) {
    if (!knowledgeHub || typeof knowledgeHub.gather !== 'function') {
        throw new Error('Для бесплатного движка требуется knowledgeHub с методом gather.');
    }
    if (!memoryVault || typeof memoryVault.recall !== 'function') {
        throw new Error('Для бесплатного движка требуется memoryVault с методом recall.');
    }

    let aggregation = {
        topic: '',
        originalTopic: '',
        combinedText: '',
        entries: [],
        errors: [],
        timestamp: 0
    };

    const recordAggregation = ({ topic, combinedText = '', entries = [], errors = [] } = {}) => {
        aggregation = {
            topic: normaliseTopic(topic),
            originalTopic: topic || '',
            combinedText: combinedText || '',
            entries: toArray(entries),
            errors: toArray(errors),
            timestamp: Date.now()
        };
    };

    const ensureAggregation = async (topicText) => {
        const normalised = normaliseTopic(topicText);
        const isCached = normalised
            && aggregation.topic === normalised
            && Date.now() - aggregation.timestamp < cacheTtl;

        if (isCached) {
            return aggregation;
        }

        if (!normalised) {
            aggregation = {
                topic: '',
                originalTopic: '',
                combinedText: '',
                entries: [],
                errors: ['Пока нет запроса для бесплатного движка.'],
                timestamp: Date.now()
            };
            return aggregation;
        }

        try {
            const result = await knowledgeHub.gather(topicText, { limit: 4 });
            aggregation = {
                topic: normalised,
                originalTopic: topicText,
                combinedText: result?.combinedText || '',
                entries: toArray(result?.entries),
                errors: toArray(result?.errors),
                timestamp: Date.now()
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            aggregation = {
                topic: normalised,
                originalTopic: topicText,
                combinedText: '',
                entries: [],
                errors: [message],
                timestamp: Date.now()
            };
        }

        return aggregation;
    };

    const buildKnowledgeBlock = (data) => {
        if (!data) {
            return '🌐 Ожидаю сигнал от интернет-источников.';
        }
        if (data.combinedText) {
            return `📚 Интернет-досье:\n${limitText(data.combinedText, 900)}`;
        }
        if (data.errors.length) {
            return `🌐 Источники временно недоступны: ${data.errors[0]}`;
        }
        return '🌐 Источники пока не задействованы — при необходимости обновите данные.';
    };

    const buildPlan = (topic, knowledge, memorySummary) => {
        const steps = [];
        if (topic) {
            steps.push(`1. Формулирую задачу: ${topic}.`);
        } else {
            steps.push('1. Жду формулировку задачи, чтобы сфокусировать стратегию.');
        }

        if (knowledge?.combinedText) {
            steps.push('2. Извлекаю ключевые факты из подключённых источников.');
        } else if (knowledge?.errors?.length) {
            steps.push('2. Интернет-источники сигнализируют о сбое, но стратегию всё равно построю.');
        } else {
            steps.push('2. Готова подключить интернет-источники по первому требованию.');
        }

        if (memorySummary) {
            steps.push('3. Учитываю сохранённые инсайты и усиливаю ответ персональными нюансами.');
        } else {
            steps.push('3. Создаю свежую стратегию и начну фиксировать важные детали для памяти.');
        }

        steps.push('4. Сформулируйте следующее действие или уточнение — продолжу без задержек.');

        return `🚀 План действий:\n${steps.join('\n')}`;
    };

    const respond = async (messages = []) => {
        const now = clock();
        const iso = now.toISOString();
        const humanTime = now.toLocaleString('ru-RU', {
            dateStyle: 'long',
            timeStyle: 'medium'
        });

        const reversed = Array.isArray(messages) ? [...messages].reverse() : [];
        const lastUserMessage = reversed.find((entry) => entry?.role === 'user');
        const topic = lastUserMessage?.content?.trim() || '';
        const data = await ensureAggregation(topic || aggregation.originalTopic);
        const memorySummary = memoryVault.recall({ limit: 6, maxLength: 900 }) || '';

        const intro = topic
            ? `📝 Запрос: ${topic}`
            : '📝 Жду ваш первый вопрос или инструкцию, чтобы запустить сверхрежим.';

        const memoryBlock = memorySummary
            ? `🧠 Из памяти Milana: ${limitText(memorySummary, 420)}`
            : '🧠 Пока нет сохранённых инсайтов — мы начинаем с чистого листа.';

        return [
            `⚡ Режим Milana Super GPTb (free tier). Сейчас ${humanTime} (ISO: ${iso}).`,
            intro,
            buildKnowledgeBlock(data),
            memoryBlock,
            buildPlan(topic, data, memorySummary),
            'Продолжайте — бесплатный режим уже отвечает без ключа. Для доступа к облачным моделям добавьте ключ в панели выше.'
        ].join('\n\n');
    };

    return {
        respond,
        recordAggregation
    };
}
