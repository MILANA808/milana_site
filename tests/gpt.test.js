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
      <input id="gptApiBase" />
      <input id="gptProjectId" />
      <button id="gptSaveEndpoint"></button>
      <p id="gptEndpointStatus"></p>
    </div>
  `;

  return {
    keyField: document.getElementById('gptApiKey'),
    saveButton: document.getElementById('gptSaveKey'),
    testButton: document.getElementById('gptTestKey'),
    clearButton: document.getElementById('gptClearKey'),
    statusField: document.getElementById('gptKeyStatus'),
    apiBaseField: document.getElementById('gptApiBase'),
    projectField: document.getElementById('gptProjectId'),
    endpointSaveButton: document.getElementById('gptSaveEndpoint'),
    endpointStatusField: document.getElementById('gptEndpointStatus')
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
  return vi.fn(async (url) => {
    const text = responses[Math.min(callIndex++, responses.length - 1)];
    if (typeof url === 'string' && url.includes('/responses')) {
      return {
        ok: true,
        json: async () => ({
          output: [
            {
              content: [
                { type: 'output_text', text }
              ]
            }
          ],
          output_text: text
        })
      };
    }
    return {
      ok: true,
      json: async () => ({
        choices: [
          { message: { content: text } }
        ]
      })
    };
  });
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

    const integration = createGptIntegration({
      ...elements,
      storage,
      fetchImpl: fetchMock,
      autoApplyQuery: false
    });

    expect(elements.keyField.value).toBe('sk-stored');
    expect(elements.statusField.textContent).toContain('готов к работе');
    expect(elements.endpointStatusField.textContent).toContain('https://api.openai.com/v1');
    expect(integration.apiBase).toBe('https://api.openai.com/v1');
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
    expect(elements.statusField.textContent).toContain('OpenAI отклонил запрос (invalid key)');
  });

  it('сохраняет базовый URL и project id из расширенных настроек', () => {
    const storage = createStorage();
    const fetchMock = createFetchSuccess();
    const elements = createDom();

    const integration = createGptIntegration({
      ...elements,
      storage,
      fetchImpl: fetchMock,
      autoApplyQuery: false
    });

    elements.apiBaseField.value = 'https://proxy.example.com/openai';
    elements.projectField.value = 'proj_test';

    integration.persistApiBase(elements.apiBaseField.value);
    integration.persistProjectId(elements.projectField.value);

    expect(storage.snapshot().gptApiBase).toBe('https://proxy.example.com/openai');
    expect(storage.snapshot().gptProjectId).toBe('proj_test');
    expect(integration.apiBase).toBe('https://proxy.example.com/openai');
    expect(integration.project).toBe('proj_test');
    expect(elements.endpointStatusField.textContent).toContain('proxy.example.com');
    expect(elements.endpointStatusField.textContent).toContain('proj_test');
  });

  it('использует endpoint responses когда chat completions недоступен', async () => {
    const storage = createStorage({ gptApiKey: 'sk-fallback' });
    const fetchMock = vi.fn(async (url) => {
      if (url.includes('/chat/completions')) {
        return {
          ok: false,
          status: 404,
          json: async () => ({ error: { message: 'not found' } })
        };
      }
      return {
        ok: true,
        json: async () => ({
          output: [
            { content: [{ type: 'output_text', text: 'готово' }] }
          ],
          output_text: 'готово'
        })
      };
    });
    const elements = createDom();

    const integration = createGptIntegration({
      ...elements,
      storage,
      fetchImpl: fetchMock,
      autoApplyQuery: false
    });

    const answer = await integration.query([
      { role: 'user', content: 'ping' }
    ]);

    expect(answer).toBe('готово');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(elements.endpointStatusField.textContent).toContain('использую /responses');
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
