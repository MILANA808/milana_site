import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { createGptIntegration } from '../scripts/gpt.js';

const createDom = () => {
  document.body.innerHTML = `
    <div>
      <input id="gptApiKey" />
      <button id="gptSaveKey"></button>
      <button id="gptTestKey"></button>
      <button id="gptClearKey"></button>
      <p id="gptKeyStatus"></p>
    </div>
  `;

  return {
    keyField: document.getElementById('gptApiKey'),
    saveButton: document.getElementById('gptSaveKey'),
    testButton: document.getElementById('gptTestKey'),
    clearButton: document.getElementById('gptClearKey'),
    statusField: document.getElementById('gptKeyStatus')
  };
};

const createStorage = (initial = {}) => {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key) => store.get(key) || '',
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
    snapshot: () => Object.fromEntries(store)
  };
};

const createFetchSuccess = (content = 'готово') => {
  const responses = Array.isArray(content) ? content : [content];
  let callIndex = 0;
  return vi.fn(async () => ({
    ok: true,
    json: async () => ({
      choices: [
        { message: { content: responses[Math.min(callIndex++, responses.length - 1)] } }
      ]
    })
  }));
};

const createFetchFailure = (status = 401, message = 'некорректный ключ') => vi.fn(async () => ({
  ok: false,
  status,
  json: async () => ({
    error: { message }
  })
}));

describe('createGptIntegration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-02-14T10:15:00.000Z'));
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('загружает ключ из хранилища и показывает статус готовности', () => {
    const storage = createStorage({ gptApiKey: 'sk-stored' });
    const fetchMock = createFetchSuccess();
    const elements = createDom();

    createGptIntegration({
      ...elements,
      storage,
      fetchImpl: fetchMock,
      autoApplyQuery: false
    });

    expect(elements.keyField.value).toBe('sk-stored');
    expect(elements.statusField.textContent).toContain('готов к работе');
  });

  it('выдаёт понятную ошибку если ключ не задан перед запросом', async () => {
    const storage = createStorage();
    const fetchMock = createFetchSuccess();
    const elements = createDom();

    const integration = createGptIntegration({
      ...elements,
      storage,
      fetchImpl: fetchMock,
      autoApplyQuery: false
    });

    await expect(integration.query([
      { role: 'user', content: 'ping' }
    ])).rejects.toMatchObject({ code: 'NO_KEY' });
    expect(elements.statusField.textContent).toContain('Введите ключ');
  });

  it('успешно проверяет ключ и включает кнопки обратно', async () => {
    const storage = createStorage();
    const fetchMock = createFetchSuccess(['готово', 'Отметка времени: 2025-02-14T10:15:00.000Z']);
    const elements = createDom();

    const integration = createGptIntegration({
      ...elements,
      storage,
      fetchImpl: fetchMock,
      autoApplyQuery: false
    });

    elements.keyField.value = 'sk-check';

    const result = await integration.testKey();

    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(elements.statusField.textContent).toContain('Интеграция активна');
    expect(elements.statusField.textContent).toContain('2025-02-14T10:15:00.000Z');
    expect(elements.saveButton.disabled).toBe(false);
    expect(elements.testButton.disabled).toBe(false);
    expect(storage.snapshot().gptApiKey).toBe('sk-check');
  });

  it('показывает текст ошибки если проверка завершается неудачно', async () => {
    const storage = createStorage();
    const fetchMock = createFetchFailure(401, 'invalid key');
    const elements = createDom();

    const integration = createGptIntegration({
      ...elements,
      storage,
      fetchImpl: fetchMock,
      autoApplyQuery: false
    });

    elements.keyField.value = 'sk-bad';

    const result = await integration.testKey();

    expect(result).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(elements.statusField.textContent).toContain('Ошибка GPT: invalid key');
  });

  it('применяет ключ из URL и сразу проводит проверку', async () => {
    const storage = createStorage();
    const fetchMock = createFetchSuccess(['готово', 'Подтверждаю время 2025-02-14T10:15:00.000Z']);
    const elements = createDom();

    const integration = createGptIntegration({
      ...elements,
      storage,
      fetchImpl: fetchMock,
      locationHref: 'https://example.com/?sk=sk-url',
      autoApplyQuery: true
    });

    await integration.ready;

    expect(storage.snapshot().gptApiKey).toBe('sk-url');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(elements.statusField.textContent).toContain('2025-02-14T10:15:00.000Z');
  });

  it('использует бесплатный движок если ключ не задан, но разрешён free tier', async () => {
    const storage = createStorage();
    const fetchMock = vi.fn(() => {
      throw new Error('fetch не должен вызываться в бесплатном режиме');
    });
    const elements = createDom();
    const freeTier = {
      respond: vi.fn(async () => 'ответ free tier')
    };

    const integration = createGptIntegration({
      ...elements,
      storage,
      fetchImpl: fetchMock,
      autoApplyQuery: false,
      freeTier
    });

    expect(elements.statusField.textContent).toContain('Бесплатный режим');

    const reply = await integration.query([
      { role: 'user', content: 'привет' }
    ], { useFreeTier: true });

    expect(reply).toBe('ответ free tier');
    expect(freeTier.respond).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
