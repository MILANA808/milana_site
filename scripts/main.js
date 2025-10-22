import { createGptIntegration } from './gpt.js';
import { createKnowledgeHub } from './knowledge.js';
import { createMemoryVault } from './memory.js';
import { createFreeTierEngine } from './free-tier.js';
import { initMetacodeStudio } from './metacode.js';
import { initAksiConsole } from './aksi.js';
import { initChat } from './chat.js';
import { initAppWidgets } from './widgets.js';

document.addEventListener('DOMContentLoaded', () => {
    const sections = document.querySelectorAll('.app-section');
    const navButtons = document.querySelectorAll('#sidebar button[data-target]');
    const newChatButton = document.getElementById('newChatButton');
    const launchAksichat = document.getElementById('launchAksichat');

    const highlightNewChat = (isActive) => {
        if (newChatButton) {
            newChatButton.classList.toggle('active', Boolean(isActive));
        }
    };

    const showSection = (id) => {
        if (!id) return;
        let found = false;
        sections.forEach((section) => {
            const match = section.id === id;
            section.style.display = match ? 'block' : 'none';
            if (match) found = true;
        });
        if (!found) return;
        navButtons.forEach((button) => {
            button.classList.toggle('active', button.dataset.target === id);
        });
        highlightNewChat(id === 'aksichat');
    };

    window.showSection = showSection;

    navButtons.forEach((button) => {
        button.addEventListener('click', () => showSection(button.dataset.target));
    });

    if (navButtons.length) {
        showSection(navButtons[0].dataset.target);
    }

    const knowledgeHub = createKnowledgeHub();
    const memoryVault = createMemoryVault();
    const freeTierEngine = createFreeTierEngine({ knowledgeHub, memoryVault });

    const gptIntegration = createGptIntegration({
        keyField: document.getElementById('gptApiKey'),
        saveButton: document.getElementById('gptSaveKey'),
        testButton: document.getElementById('gptTestKey'),
        clearButton: document.getElementById('gptClearKey'),
        statusField: document.getElementById('gptKeyStatus'),
        freeTier: freeTierEngine,
        historyAPI: window.history
    });

    const queryGPT = (...args) => gptIntegration.query(...args);
    const formatGptError = (error) => gptIntegration.formatError(error);

    const knowledgeSourcesList = document.getElementById('knowledgeSourcesList');
    const knowledgePreview = document.getElementById('knowledgePreview');
    const knowledgeStatus = document.getElementById('knowledgeStatus');
    const knowledgeRefreshButton = document.getElementById('knowledgeRefreshButton');
    const memoryStatus = document.getElementById('memoryStatus');
    const memoryClearButton = document.getElementById('memoryClearButton');

    const setKnowledgeStatus = (message, isError = false) => {
        if (!knowledgeStatus) return;
        knowledgeStatus.textContent = message || '';
        knowledgeStatus.style.color = isError ? '#ff8fb7' : '#d4c7ff';
    };

    const updateMemoryStatus = () => {
        if (!memoryStatus) return;
        const summary = memoryVault.recall({ limit: 6, maxLength: 900 });
        memoryStatus.textContent = summary
            ? `Долгосрочная память Milana GPTb:\n${summary}`
            : 'Память пуста. Начните диалог, и Milana сохранит ключевые инсайты.';
    };

    const renderKnowledgeSources = () => {
        if (!knowledgeSourcesList) return;
        knowledgeSourcesList.innerHTML = '';
        knowledgeHub.getConnectors().forEach((connector) => {
            const item = document.createElement('li');
            item.className = 'knowledge-source';

            const label = document.createElement('label');
            label.className = 'knowledge-source-label';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = connector.enabled;
            checkbox.addEventListener('change', () => {
                knowledgeHub.setConnectorEnabled(connector.id, checkbox.checked);
            });

            const textContainer = document.createElement('div');
            textContainer.className = 'knowledge-source-text';

            const title = document.createElement('span');
            title.className = 'knowledge-source-title';
            title.textContent = connector.label;

            const description = document.createElement('span');
            description.className = 'knowledge-source-description';
            description.textContent = connector.description;

            textContainer.appendChild(title);
            textContainer.appendChild(description);
            label.appendChild(checkbox);
            label.appendChild(textContainer);
            item.appendChild(label);
            knowledgeSourcesList.appendChild(item);
        });
    };

    knowledgeHub.subscribe(renderKnowledgeSources);
    renderKnowledgeSources();
    updateMemoryStatus();

    const formatKnowledgeEntries = (entries) => {
        if (!entries.length) {
            return 'Активируйте источники или уточните запрос, чтобы получить внешние данные.';
        }
        return entries
            .map((entry) => (entry.error ? `⚠️ ${entry.label}: ${entry.error}` : `# ${entry.label}\n${entry.content}`))
            .join('\n\n');
    };

    const refreshKnowledgePreview = async (query) => {
        if (!knowledgePreview) {
            return { combinedText: '', entries: [], errors: [] };
        }
        knowledgePreview.textContent = 'Подключаем интернет-источники...';
        try {
            const result = await knowledgeHub.gather(query, { limit: 5 });
            freeTierEngine.recordAggregation({
                topic: query,
                combinedText: result.combinedText,
                entries: result.entries,
                errors: result.errors
            });
            knowledgePreview.textContent = formatKnowledgeEntries(result.entries);
            if (result.errors.length) {
                setKnowledgeStatus(result.errors[0], true);
            } else if (result.entries.length) {
                setKnowledgeStatus('Интернет-данные синхронизированы.', false);
            } else {
                setKnowledgeStatus('Источники активны, но не нашли совпадений.', false);
            }
            return result;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            knowledgePreview.textContent = `Ошибка агрегации данных: ${message}`;
            setKnowledgeStatus(message, true);
            freeTierEngine.recordAggregation({
                topic: query,
                combinedText: '',
                entries: [],
                errors: [message]
            });
            return { combinedText: '', entries: [], errors: [message] };
        }
    };

    if (knowledgeRefreshButton) {
        knowledgeRefreshButton.addEventListener('click', async () => {
            const defaultQuery = 'искусственный интеллект';
            const input = document.getElementById('chatInput');
            const query = input?.value?.trim() || defaultQuery;
            await refreshKnowledgePreview(query);
        });
    }

    if (memoryClearButton) {
        memoryClearButton.addEventListener('click', () => {
            memoryVault.clear();
            updateMemoryStatus();
        });
    }

    refreshKnowledgePreview('искусственный интеллект');

    const { resetChat, input: chatInput } = initChat({
        queryGPT,
        formatGptError,
        memoryVault,
        refreshKnowledgePreview,
        updateMemoryStatus,
        showSection,
        launchButton: launchAksichat
    });

    if (newChatButton) {
        newChatButton.addEventListener('click', () => {
            showSection('aksichat');
            resetChat({ greet: true });
            chatInput?.focus();
            newChatButton.blur();
        });
    }

    initMetacodeStudio();
    initAksiConsole();
    initAppWidgets({ queryGPT, formatGptError, refreshKnowledgePreview });
});
