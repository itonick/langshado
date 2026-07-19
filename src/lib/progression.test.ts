import { describe, it, expect } from 'vitest';
import { phraseTier, computeTierStates, effectiveStatus, TIERS, toneTier } from './progression';
import type { Phrase } from '../data/phrases';
import type { Progress } from './db';

// テスト用フレーズヘルパー
function makePhrase(id: string, text: string, syllables: string[], tier?: number): Phrase {
  return {
    id,
    text,
    syllables: syllables.map((t) => ({ text: t })),
    meaning: 'test',
    tier,
  };
}

function makeProgress(phraseId: string, status: Progress['status']): Progress {
  return { phraseId, status, bestScore: 0, attempts: 0, passCount: 0 };
}

describe('toneTier', () => {
  it('ngang は tier 1', () => expect(toneTier('ngang')).toBe(1));
  it('huyền は tier 1', () => expect(toneTier('huyền')).toBe(1));
  it('sắc は tier 2', () => expect(toneTier('sắc')).toBe(2));
  it('nặng は tier 3', () => expect(toneTier('nặng')).toBe(3));
  it('hỏi は tier 4', () => expect(toneTier('hỏi')).toBe(4));
  it('ngã は tier 5', () => expect(toneTier('ngã')).toBe(5));
});

describe('phraseTier', () => {
  it('tier 明示値がある場合はそれを返す', () => {
    const p = makePhrase('t1', 'Tôi là sinh viên.', ['Tôi', 'là', 'sinh', 'viên'], 6);
    expect(phraseTier(p)).toBe(6);
  });

  it('tier が 0 のときも明示値を優先する（falsy だが null/undefined ではない）', () => {
    // tier=0 は TIERS の level 範囲外だが、明示値として扱う
    const p = makePhrase('t0', 'ba', ['ba'], 0);
    expect(phraseTier(p)).toBe(0);
  });

  it('tier 未指定時は声調から自動判定（ngang のみ → 1）', () => {
    const p = makePhrase('p1', 'ba', ['ba']);
    expect(phraseTier(p)).toBe(1);
  });

  it('tier 未指定時は声調から自動判定（huyền → 1）', () => {
    const p = makePhrase('p2', 'Chào', ['Chào']);
    expect(phraseTier(p)).toBe(1);
  });

  it('tier 未指定時は声調から自動判定（sắc → 2）', () => {
    const p = makePhrase('p3', 'Máy', ['Máy']);
    expect(phraseTier(p)).toBe(2);
  });

  it('tier 未指定時は複数音節の最大声調 tier を返す（huyền + ngã → 5）', () => {
    const p = makePhrase('p4', 'Chào Mỹ', ['Chào', 'Mỹ']);
    expect(phraseTier(p)).toBe(5);
  });

  it('tier 未指定時は nặng → tier 3', () => {
    const p = makePhrase('p5', 'học', ['học']);
    expect(phraseTier(p)).toBe(3);
  });

  it('tier 未指定時は hỏi → tier 4', () => {
    const p = makePhrase('p6', 'Phở', ['Phở']);
    expect(phraseTier(p)).toBe(4);
  });
});

describe('computeTierStates', () => {
  // tier 1 のフレーズのみがある最小構成
  const tier1Phrases = [
    makePhrase('a', 'ba', ['ba']),
    makePhrase('b', 'Nhà', ['Nhà']),
  ];

  it('段1は常に unlocked', () => {
    const states = computeTierStates(tier1Phrases, new Map());
    const s1 = states.find((s) => s.level === 1)!;
    expect(s1.unlocked).toBe(true);
  });

  it('段2は段1がクリアされるまで locked', () => {
    const phrases = [
      ...tier1Phrases,
      makePhrase('c', 'Máy', ['Máy']),
    ];
    const states = computeTierStates(phrases, new Map());
    const s2 = states.find((s) => s.level === 2)!;
    expect(s2.unlocked).toBe(false);
  });

  it('段1が全 mastered になると段2が解放される', () => {
    const phrases = [
      ...tier1Phrases,
      makePhrase('c', 'Máy', ['Máy']),
    ];
    const progress = new Map<string, Progress>([
      ['a', makeProgress('a', 'mastered')],
      ['b', makeProgress('b', 'mastered')],
    ]);
    const states = computeTierStates(phrases, progress);
    const s1 = states.find((s) => s.level === 1)!;
    const s2 = states.find((s) => s.level === 2)!;
    expect(s1.cleared).toBe(true);
    expect(s2.unlocked).toBe(true);
  });

  it('空の段（フレーズなし）はスキップ扱いで次段を解放する', () => {
    // tier 1 のフレーズのみ、tier 2 は空
    const phrases = [
      ...tier1Phrases,
      makePhrase('d', 'học', ['học']), // tier 3
    ];
    const progress = new Map<string, Progress>([
      ['a', makeProgress('a', 'mastered')],
      ['b', makeProgress('b', 'mastered')],
    ]);
    const states = computeTierStates(phrases, progress);
    const s2 = states.find((s) => s.level === 2)!;
    const s3 = states.find((s) => s.level === 3)!;
    // tier 2 は空（total=0）なのでクリア扱い
    expect(s2.total).toBe(0);
    // tier 1 がクリア → tier 2 が unlocked（空なので cleared=true のようにスキップ）
    expect(s2.unlocked).toBe(true);
    // tier 2 がスキップ扱い → tier 3 が unlocked
    expect(s3.unlocked).toBe(true);
  });

  it('全フレーズ mastered でクリア判定', () => {
    const progress = new Map<string, Progress>([
      ['a', makeProgress('a', 'mastered')],
      ['b', makeProgress('b', 'mastered')],
    ]);
    const states = computeTierStates(tier1Phrases, progress);
    const s1 = states.find((s) => s.level === 1)!;
    expect(s1.cleared).toBe(true);
    expect(s1.masteredCount).toBe(2);
    expect(s1.total).toBe(2);
  });

  it('一部のみ mastered ではクリアにならない', () => {
    const progress = new Map<string, Progress>([
      ['a', makeProgress('a', 'mastered')],
    ]);
    const states = computeTierStates(tier1Phrases, progress);
    const s1 = states.find((s) => s.level === 1)!;
    expect(s1.cleared).toBe(false);
    expect(s1.masteredCount).toBe(1);
  });

  it('全 TIERS 分の TierState が返る', () => {
    const states = computeTierStates([], new Map());
    expect(states).toHaveLength(TIERS.length);
  });
});

describe('effectiveStatus', () => {
  const phraseT1 = makePhrase('p1', 'ba', ['ba']); // tier 1
  const phraseT2 = makePhrase('p2', 'Máy', ['Máy']); // tier 2

  it('段が locked の場合 effectiveStatus は locked', () => {
    const phrases = [phraseT1, phraseT2];
    const states = computeTierStates(phrases, new Map());
    // tier 2 は段1未クリアなので locked
    const status = effectiveStatus(phraseT2, states, new Map());
    expect(status).toBe('locked');
  });

  it('段が unlocked で progress がない場合 available', () => {
    const states = computeTierStates([phraseT1], new Map());
    const status = effectiveStatus(phraseT1, states, new Map());
    expect(status).toBe('available');
  });

  it('progress が locked のとき available を返す（DB の古いデータへの対応）', () => {
    const progress = new Map<string, Progress>([
      ['p1', makeProgress('p1', 'locked')],
    ]);
    const states = computeTierStates([phraseT1], progress);
    const status = effectiveStatus(phraseT1, states, progress);
    expect(status).toBe('available');
  });

  it('progress が learning のとき learning を返す', () => {
    const progress = new Map<string, Progress>([
      ['p1', makeProgress('p1', 'learning')],
    ]);
    const states = computeTierStates([phraseT1], progress);
    const status = effectiveStatus(phraseT1, states, progress);
    expect(status).toBe('learning');
  });

  it('progress が mastered のとき mastered を返す', () => {
    const progress = new Map<string, Progress>([
      ['p1', makeProgress('p1', 'mastered')],
    ]);
    const states = computeTierStates([phraseT1], progress);
    const status = effectiveStatus(phraseT1, states, progress);
    expect(status).toBe('mastered');
  });
});
