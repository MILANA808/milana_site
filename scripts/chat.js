export const initChat = ({
    queryGPT,
    formatGptError,
    memoryVault,
    refreshKnowledgePreview,
    updateMemoryStatus,
    showSection,
    launchButton
}) => {
    const sendButton = document.getElementById('chatSendButton');
    const input = document.getElementById('chatInput');
    const box = document.getElementById('chatBox');
    const chatStatus = document.getElementById('chatStatus');

    if (!sendButton || !input || !box) {
        return { resetChat: () => {}, input: null };
    }

    const introMessage = 'Привет! Я Милана Hyper AI. Помогаю мыслить стратегически, создавать код и воплощать идеи лучше любых стандартных моделей.';
    const chatHistory = [
        { role: 'system', content: 'Ты — Милана, сверхинтеллект AKSI. Отвечай по-русски, вдохновляюще и по делу. Предлагай стратегии, идеи и конкретные шаги, оставаясь доброжелательной и уверенной.' }
    ];

    const appendMessage = (role, text) => {
        const block = document.createElement('div');
        block.className = `chat-message ${role === 'user' ? 'from-user' : 'from-assistant'}`;

        const avatar = document.createElement('div');
        avatar.className = 'chat-avatar';
        avatar.textContent = role === 'user' ? 'Вы' : 'AI';

        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble';
        bubble.textContent = text;

        block.appendChild(avatar);
        block.appendChild(bubble);
        box.appendChild(block);
        box.scrollTop = box.scrollHeight;
    };

    const setChatStatus = (message, isError = false) => {
        if (!chatStatus) return;
        chatStatus.textContent = message || '';
        chatStatus.style.color = isError ? '#ff8fb7' : '#d4c7ff';
    };

    const resetChat = ({ greet = false } = {}) => {
        chatHistory.splice(1);
        box.innerHTML = '';
        if (greet) {
            appendMessage('assistant', introMessage);
            chatHistory.push({ role: 'assistant', content: introMessage });
            setChatStatus('Я на связи для нового диалога.');
        } else {
            setChatStatus('');
        }
        sendButton.disabled = false;
        updateMemoryStatus();
    };

    const sendMessage = async () => {
        const text = input.value.trim();
        if (!text) return;
        appendMessage('user', text);
        input.value = '';
        sendButton.disabled = true;
        setChatStatus('Синхронизирую память и интернет-данные...');

        try {
            const { combinedText } = await refreshKnowledgePreview(text);
            const runtimeMessages = [...chatHistory];
            const memoryContext = memoryVault.recall({ limit: 6, maxLength: 900 });
            if (memoryContext) {
                runtimeMessages.push({
                    role: 'system',
                    content: `Долгосрочная память Milana GPTb:\n${memoryContext}`
                });
            }
            if (combinedText) {
                runtimeMessages.push({
                    role: 'system',
                    content: `Свежие внешние данные:\n${combinedText}`
                });
            }

            const userMessage = { role: 'user', content: text };
            runtimeMessages.push(userMessage);
            chatHistory.push(userMessage);

            setChatStatus('Запрашиваем ответ у Milana Hyper AI...');
            const reply = await queryGPT(runtimeMessages, { useFreeTier: true });
            chatHistory.push({ role: 'assistant', content: reply });
            appendMessage('assistant', reply);
            memoryVault.remember({ user: text, assistant: reply });
            updateMemoryStatus();
            setChatStatus('Готово.');
        } catch (error) {
            const message = formatGptError(error);
            setChatStatus(message, true);
            const fallback = error?.code === 'NO_KEY'
                ? 'Добавьте ключ OpenAI API в блоке выше, чтобы я смог отвечать.'
                : 'Не удалось получить ответ от GPT. Попробуйте ещё раз.';
            appendMessage('assistant', fallback);
            chatHistory.push({ role: 'assistant', content: fallback });
        } finally {
            sendButton.disabled = false;
            input.focus();
        }
    };

    sendButton.addEventListener('click', sendMessage);
    input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });

    if (launchButton) {
        launchButton.addEventListener('click', () => {
            showSection?.('aksichat');
            input.focus();
        });
    }

    resetChat({ greet: true });

    return { resetChat, input };
};
