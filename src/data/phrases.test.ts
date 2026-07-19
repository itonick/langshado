import { describe, it, expect } from 'vitest';
import { PHRASES, EXAMPLE_SENTENCES } from './phrases';
import { TIERS } from '../lib/progression';

const ALL_ITEMS = [...PHRASES, ...EXAMPLE_SENTENCES];

describe('データ整合性: id 重複なし', () => {
  it('PHRASES 内に id の重複がない', () => {
    const ids = PHRASES.map((p) => p.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('EXAMPLE_SENTENCES 内に id の重複がない', () => {
    const ids = EXAMPLE_SENTENCES.map((e) => e.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('PHRASES と EXAMPLE_SENTENCES の間で id が重複しない', () => {
    const phraseIds = new Set(PHRASES.map((p) => p.id));
    const exampleIds = EXAMPLE_SENTENCES.map((e) => e.id);
    for (const id of exampleIds) {
      expect(phraseIds.has(id), `id "${id}" が PHRASES と EXAMPLE_SENTENCES の両方に存在する`).toBe(false);
    }
  });
});

describe('データ整合性: ExampleSentence.parentId が実在する', () => {
  it('全 ExampleSentence の parentId が PHRASES の id に存在する', () => {
    const phraseIds = new Set(PHRASES.map((p) => p.id));
    for (const ex of EXAMPLE_SENTENCES) {
      expect(
        phraseIds.has(ex.parentId),
        `ExampleSentence "${ex.id}" の parentId "${ex.parentId}" が PHRASES に存在しない`,
      ).toBe(true);
    }
  });
});

describe('データ整合性: tier 明示値が TIERS の level 範囲内', () => {
  const validLevels = new Set(TIERS.map((t) => t.level));

  it('PHRASES の tier 明示値はすべて有効な level である', () => {
    for (const p of PHRASES) {
      if (p.tier != null) {
        expect(
          validLevels.has(p.tier),
          `PHRASES["${p.id}"].tier=${p.tier} は TIERS の level 範囲外`,
        ).toBe(true);
      }
    }
  });

  it('EXAMPLE_SENTENCES の tier 明示値はすべて有効な level である', () => {
    for (const ex of EXAMPLE_SENTENCES) {
      if (ex.tier != null) {
        expect(
          validLevels.has(ex.tier),
          `EXAMPLE_SENTENCES["${ex.id}"].tier=${ex.tier} は TIERS の level 範囲外`,
        ).toBe(true);
      }
    }
  });
});

describe('データ整合性: syllables が空でない', () => {
  it('PHRASES の全フレーズは syllables が空でない', () => {
    for (const p of PHRASES) {
      expect(
        p.syllables.length,
        `PHRASES["${p.id}"].syllables が空`,
      ).toBeGreaterThan(0);
    }
  });

  it('EXAMPLE_SENTENCES の全例文は syllables が空でない', () => {
    for (const ex of EXAMPLE_SENTENCES) {
      expect(
        ex.syllables.length,
        `EXAMPLE_SENTENCES["${ex.id}"].syllables が空`,
      ).toBeGreaterThan(0);
    }
  });

  it('すべての syllable の text が空文字でない', () => {
    for (const item of ALL_ITEMS) {
      for (const syl of item.syllables) {
        expect(
          syl.text.length,
          `${item.id} の syllable.text が空文字`,
        ).toBeGreaterThan(0);
      }
    }
  });
});

describe('データ整合性: 基本構造の健全性', () => {
  it('PHRASES は 1 件以上ある', () => {
    expect(PHRASES.length).toBeGreaterThan(0);
  });

  it('EXAMPLE_SENTENCES は 1 件以上ある', () => {
    expect(EXAMPLE_SENTENCES.length).toBeGreaterThan(0);
  });

  it('全フレーズに id・text・meaning が存在する', () => {
    for (const item of ALL_ITEMS) {
      expect(item.id, `id が空`).toBeTruthy();
      expect(item.text, `${item.id}: text が空`).toBeTruthy();
      expect(item.meaning, `${item.id}: meaning が空`).toBeTruthy();
    }
  });
});
