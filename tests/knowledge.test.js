import { describe, expect, it, beforeEach, vi } from 'vitest';
import { createKnowledgeHub } from '../scripts/knowledge.js';

const createStorage = (initial = {}) => {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key) => store.has(key) ? store.get(key) : null,
    setItem: (key, value) => { store.set(key, value); },
    removeItem: (key) => { store.delete(key); },
    snapshot: () => Object.fromEntries(store)
  };
};

describe('createKnowledgeHub', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn(async (url) => {
      if (url.includes('wikipedia')) {
        return {
          ok: true,
          json: async () => ({ extract: 'Краткое описание из Википедии.' })
        };
      }
      if (url.includes('hn.algolia.com')) {
        return {
          ok: true,
          json: async () => ({
            hits: [
              { title: 'Первая новость', url: 'https://example.com/news' },
              { title: 'Вторая новость', url: 'https://example.com/second' }
            ]
          })
        };
      }
      if (url.includes('openlibrary')) {
        return {
          ok: true,
          json: async () => ({
            docs: [
              { title: 'Книга по ИИ', author_name: ['AKSI'], first_publish_year: 2024 }
            ]
          })
        };
      }
      return {
        ok: false,
        json: async () => ({})
      };
    });
  });

  it('возвращает активные источники и позволяет собирать данные', async () => {
    const storage = createStorage();
    const hub = createKnowledgeHub({ storage, fetchImpl: fetchMock });

    expect(hub.getConnectors().map((c) => c.enabled)).toEqual([true, true, false]);

    hub.setConnectorEnabled('openlibrary', true);
    const result = await hub.gather('машинное обучение', { limit: 2 });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.entries).toHaveLength(3);
    expect(result.errors).toHaveLength(0);
    expect(result.combinedText).toContain('Википедия');
    expect(result.combinedText).toContain('Hacker News');
    expect(result.combinedText).toContain('Open Library');
    expect(storage.snapshot().gptKnowledgeHub).toBeDefined();
  });

  it('фиксирует ошибки источников и сообщает об этом', async () => {
    const errorFetch = vi.fn(async (url) => {
      if (url.includes('wikipedia')) {
        return { ok: false, json: async () => ({}) };
      }
      return {
        ok: true,
        json: async () => ({ hits: [], docs: [] })
      };
    });

    const hub = createKnowledgeHub({ storage: createStorage(), fetchImpl: errorFetch });
    const result = await hub.gather('данные');

    expect(result.entries.some((entry) => entry.error)).toBe(true);
    expect(result.errors[0]).toContain('Википедия');
    expect(result.combinedText).toBe('');
  });

  it('возвращает пустой результат если запрос не задан', async () => {
    const hub = createKnowledgeHub({ storage: createStorage(), fetchImpl: fetchMock });
    const result = await hub.gather('');

    expect(result.entries).toEqual([]);
    expect(result.combinedText).toBe('');
    expect(result.errors).toContain('Не задан запрос для агрегации данных.');
  });
});
