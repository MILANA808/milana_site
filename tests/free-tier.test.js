import { describe, expect, it, beforeEach, vi } from 'vitest';
import { createFreeTierEngine } from '../scripts/free-tier.js';

describe('createFreeTierEngine', () => {
  let gatherMock;
  let recallMock;
  let knowledgeHub;
  let memoryVault;
  const fixedClock = () => new Date('2025-05-01T12:30:00.000Z');

  beforeEach(() => {
    gatherMock = vi.fn(async () => ({
      combinedText: 'Свежие данные из сети.',
      entries: [],
      errors: []
    }));
    recallMock = vi.fn(() => '');
    knowledgeHub = { gather: gatherMock };
    memoryVault = { recall: recallMock };
  });

  it('использует сохранённую агрегацию без дополнительных запросов', async () => {
    const engine = createFreeTierEngine({ knowledgeHub, memoryVault, clock: fixedClock });
    engine.recordAggregation({
      topic: 'квантовые компьютеры',
      combinedText: 'Ключевые факты о квантовых вычислениях.',
      errors: []
    });

    const answer = await engine.respond([
      { role: 'user', content: 'квантовые компьютеры' }
    ]);

    expect(gatherMock).not.toHaveBeenCalled();
    expect(answer.toLowerCase()).toContain('free tier');
    expect(answer).toContain('квантовые компьютеры');
    expect(answer).toContain('Интернет-досье');
  });

  it('обращается к knowledgeHub если кэш пуст и добавляет данные в ответ', async () => {
    const engine = createFreeTierEngine({ knowledgeHub, memoryVault, clock: fixedClock });

    const answer = await engine.respond([
      { role: 'user', content: 'Новости ИИ' }
    ]);

    expect(gatherMock).toHaveBeenCalledWith('Новости ИИ', { limit: 4 });
    expect(answer).toContain('Новости ИИ');
    expect(answer).toContain('Интернет-досье');
  });

  it('встраивает сохранённую память пользователя в ответ бесплатного режима', async () => {
    recallMock = vi.fn(() => 'Ранее мы планировали запуск продукта Milana.');
    memoryVault = { recall: recallMock };
    const engine = createFreeTierEngine({ knowledgeHub, memoryVault, clock: fixedClock });
    engine.recordAggregation({ topic: 'стратегия', combinedText: '', errors: [] });

    const answer = await engine.respond([
      { role: 'user', content: 'Обнови стратегию' }
    ]);

    expect(answer).toContain('Ранее мы планировали запуск продукта Milana.');
    expect(answer).toContain('План действий');
  });
});
