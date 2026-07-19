import { describe, it, expect } from 'vitest';
import { reviewSrs, scoreToQuality, newSrsItem } from './srs';
import type { SrsItem } from './db';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = 1_700_000_000_000; // 固定エポック時刻

function freshItem(): SrsItem {
  return newSrsItem('test-id', 'phrase');
}

describe('newSrsItem', () => {
  it('初期値が正しく設定されている', () => {
    const item = newSrsItem('abc', 'phrase');
    expect(item.itemId).toBe('abc');
    expect(item.type).toBe('phrase');
    expect(item.ease).toBe(2.5);
    expect(item.interval).toBe(0);
    expect(item.reps).toBe(0);
  });
});

describe('reviewSrs – 失敗（quality < 3）', () => {
  it('quality 0: reps がリセットされ interval=1 になる', () => {
    const item = { ...freshItem(), reps: 5, interval: 20, ease: 2.5 };
    const result = reviewSrs(item, 0, NOW);
    expect(result.reps).toBe(0);
    expect(result.interval).toBe(1);
  });

  it('quality 0: ease が下がる（最低値 1.3 まで）', () => {
    const item = { ...freshItem(), ease: 1.4 };
    const result = reviewSrs(item, 0, NOW);
    // ease = 1.4 + (0.1 - 5*(0.08+5*0.02)) = 1.4 + (0.1 - 5*0.18) = 1.4 + (0.1 - 0.9) = 1.4 - 0.8 = 0.6 → 下限 1.3
    expect(result.ease).toBe(1.3);
  });

  it('quality 2（失敗）: interval=1, reps=0', () => {
    const item = { ...freshItem(), reps: 3, interval: 10 };
    const result = reviewSrs(item, 2, NOW);
    expect(result.reps).toBe(0);
    expect(result.interval).toBe(1);
  });

  it('失敗後の dueDate は 1 日後', () => {
    const result = reviewSrs(freshItem(), 0, NOW);
    expect(result.dueDate).toBe(NOW + DAY_MS);
  });
});

describe('reviewSrs – 成功（quality >= 3）', () => {
  it('quality 3, reps=0 → reps=1, interval=1（1 日後）', () => {
    const item = freshItem();
    const result = reviewSrs(item, 3, NOW);
    expect(result.reps).toBe(1);
    expect(result.interval).toBe(1);
    expect(result.dueDate).toBe(NOW + DAY_MS);
  });

  it('quality 3, reps=1 → reps=2, interval=6（6 日後）', () => {
    const item = { ...freshItem(), reps: 1, interval: 1 };
    const result = reviewSrs(item, 3, NOW);
    expect(result.reps).toBe(2);
    expect(result.interval).toBe(6);
    expect(result.dueDate).toBe(NOW + 6 * DAY_MS);
  });

  it('quality 5, reps=2 → reps=3, interval=Math.round(6*2.5)=15', () => {
    const item = { ...freshItem(), reps: 2, interval: 6, ease: 2.5 };
    const result = reviewSrs(item, 5, NOW);
    expect(result.reps).toBe(3);
    expect(result.interval).toBe(Math.round(6 * 2.5)); // 15
    expect(result.dueDate).toBe(NOW + 15 * DAY_MS);
  });

  it('quality 5: ease が上がる', () => {
    const item = { ...freshItem(), ease: 2.5 };
    const result = reviewSrs(item, 5, NOW);
    // ease = 2.5 + (0.1 - 0*(0.08+0*0.02)) = 2.5 + 0.1 = 2.6
    expect(result.ease).toBeCloseTo(2.6, 5);
  });

  it('quality 3: ease がほぼ変わらない（-0.02 の微減）', () => {
    const item = { ...freshItem(), ease: 2.5 };
    const result = reviewSrs(item, 3, NOW);
    // ease = 2.5 + (0.1 - 2*(0.08+2*0.02)) = 2.5 + (0.1 - 2*0.12) = 2.5 + (0.1 - 0.24) = 2.5 - 0.14 = 2.36
    expect(result.ease).toBeCloseTo(2.36, 5);
  });

  it('ease は 1.3 を下回らない（下限チェック）', () => {
    const item = { ...freshItem(), ease: 1.31 };
    const result = reviewSrs(item, 0, NOW); // quality=0 で大幅減少
    expect(result.ease).toBeGreaterThanOrEqual(1.3);
  });

  it('quality を 0–5 の範囲外に渡しても clamp される', () => {
    // quality > 5 → 5 として処理
    const item = freshItem();
    const r5 = reviewSrs(item, 5, NOW);
    const r10 = reviewSrs(item, 10, NOW);
    expect(r5.ease).toBeCloseTo(r10.ease, 5);
    // quality < 0 → 0 として処理
    const r0 = reviewSrs(item, 0, NOW);
    const rNeg = reviewSrs(item, -3, NOW);
    expect(r0.ease).toBeCloseTo(rNeg.ease, 5);
  });
});

describe('scoreToQuality – 境界値', () => {
  it('score 100 → quality 5', () => expect(scoreToQuality(100)).toBe(5));
  it('score 90 → quality 5', () => expect(scoreToQuality(90)).toBe(5));
  it('score 89 → quality 4', () => expect(scoreToQuality(89)).toBe(4));
  it('score 80 → quality 4', () => expect(scoreToQuality(80)).toBe(4));
  it('score 79 → quality 3', () => expect(scoreToQuality(79)).toBe(3));
  it('score 70 → quality 3', () => expect(scoreToQuality(70)).toBe(3));
  it('score 69 → quality 2', () => expect(scoreToQuality(69)).toBe(2));
  it('score 50 → quality 2', () => expect(scoreToQuality(50)).toBe(2));
  it('score 49 → quality 1', () => expect(scoreToQuality(49)).toBe(1));
  it('score 30 → quality 1', () => expect(scoreToQuality(30)).toBe(1));
  it('score 29 → quality 0', () => expect(scoreToQuality(29)).toBe(0));
  it('score 0 → quality 0', () => expect(scoreToQuality(0)).toBe(0));
});
