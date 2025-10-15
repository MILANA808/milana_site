import { describe, expect, it } from 'vitest';
import { createMemoryVault } from '../scripts/memory.js';

const createStorage = () => {
  const store = new Map();
  return {
    getItem: (key) => store.has(key) ? store.get(key) : null,
    setItem: (key, value) => { store.set(key, value); },
    removeItem: (key) => { store.delete(key); },
    snapshot: () => Object.fromEntries(store)
  };
};

describe('createMemoryVault', () => {
  it('сохраняет и возвращает ограниченный набор записей', () => {
    const storage = createStorage();
    const vault = createMemoryVault({ storage, maxEntries: 2 });

    vault.remember({ user: 'Первый вопрос', assistant: 'Первый ответ', timestamp: '2025-01-01T10:00:00.000Z' });
    vault.remember({ user: 'Второй вопрос', assistant: 'Второй ответ', timestamp: '2025-01-02T10:00:00.000Z' });
    vault.remember({ user: 'Третий вопрос', assistant: 'Третий ответ', timestamp: '2025-01-03T10:00:00.000Z' });

    const all = vault.exportAll();
    expect(all).toHaveLength(2);
    expect(all[0].user).toContain('Второй вопрос');
    expect(all[1].assistant).toContain('Третий ответ');

    const summary = vault.recall({ limit: 2 });
    expect(summary).toContain('Второй вопрос');
    expect(summary).toContain('Третий вопрос');
  });

  it('очищает память и игнорирует пустые записи', () => {
    const storage = createStorage();
    const vault = createMemoryVault({ storage });

    vault.remember({ user: '', assistant: '' });
    expect(vault.exportAll()).toEqual([]);

    vault.remember({ user: 'Привет', assistant: 'Ответ' });
    expect(vault.exportAll()).toHaveLength(1);

    vault.clear();
    expect(vault.exportAll()).toEqual([]);
    expect(storage.snapshot()).toEqual({});
  });
});
