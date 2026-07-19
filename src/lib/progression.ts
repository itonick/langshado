// 声調の難易度ラダーと解放判定（§5 歯車1・歯車2）。
import type { Phrase } from '../data/phrases';
import type { Progress, ProgressStatus } from './db';
import { detectTone, type Tone } from './tone';

export interface Tier {
  level: number;
  /** この段で新たに導入する声調 */
  introduces: Tone[];
  title: string;
  hint: string;
}

export const TIERS: Tier[] = [
  // ステップ 1–5：単語
  { level: 1, introduces: ['ngang', 'huyền'], title: 'ステップ1：平音＋低く下がる', hint: '単語（ngang / huyền）' },
  { level: 2, introduces: ['sắc'],            title: 'ステップ2：高く上がる',         hint: '単語（+ sắc）' },
  { level: 3, introduces: ['nặng'],           title: 'ステップ3：短く詰まる',         hint: '単語（+ nặng）' },
  { level: 4, introduces: ['hỏi'],            title: 'ステップ4：低く沈んで戻る',     hint: '単語（+ hỏi）' },
  { level: 5, introduces: ['ngã'],            title: 'ステップ5：きしんで上がる',     hint: '単語（+ ngã）' },
  // ステップ 6–10：文
  { level: 6,  introduces: [], title: 'ステップ6：文①',  hint: '文（平声のみ）' },
  { level: 7,  introduces: [], title: 'ステップ7：文②',  hint: '文（+ sắc）' },
  { level: 8,  introduces: [], title: 'ステップ8：文③',  hint: '文（+ nặng）' },
  { level: 9,  introduces: [], title: 'ステップ9：文④',  hint: '文（+ hỏi）' },
  { level: 10, introduces: [], title: 'ステップ10：文⑤', hint: '文（+ ngã）' },
];

/** 声調 → 段。TIERS から逆引き。 */
const TONE_TIER: Record<Tone, number> = (() => {
  const map = {} as Record<Tone, number>;
  for (const t of TIERS) for (const tone of t.introduces) map[tone] = t.level;
  return map;
})();

export function toneTier(tone: Tone): number {
  return TONE_TIER[tone] ?? 1;
}

/** フレーズ難易度 = phrase.tier 明示値があればそれを使い、なければ声調の自動判定。 */
export function phraseTier(phrase: Phrase): number {
  if (phrase.tier != null) return phrase.tier;
  let max = 1;
  for (const syl of phrase.syllables) {
    const t = toneTier(detectTone(syl.text));
    if (t > max) max = t;
  }
  return max;
}

export interface TierState {
  level: number;
  tier: Tier;
  phrases: Phrase[];
  unlocked: boolean;
  masteredCount: number;
  total: number;
  cleared: boolean; // 全フレーズ mastered
}

/**
 * 各段の解放状況を計算する。
 * 段は前段が「クリア（全フレーズ mastered）」になると解放。段1は常に解放。
 */
export function computeTierStates(
  phrases: Phrase[],
  progressById: Map<string, Progress>,
): TierState[] {
  const states: TierState[] = [];
  let prevCleared = true; // 段1の前提（常に true）
  for (const tier of TIERS) {
    const tierPhrases = phrases.filter((p) => phraseTier(p) === tier.level);
    const masteredCount = tierPhrases.filter(
      (p) => progressById.get(p.id)?.status === 'mastered',
    ).length;
    const total = tierPhrases.length;
    const cleared = total > 0 && masteredCount === total;
    const unlocked = tier.level === 1 || prevCleared;
    states.push({ level: tier.level, tier, phrases: tierPhrases, unlocked, masteredCount, total, cleared });
    // 次段の解放条件は「この段がクリア」。空の段はスキップ扱いで通す。
    prevCleared = cleared || total === 0;
  }
  return states;
}

/** フレーズ単位の表示用ステータス（locked を考慮）。 */
export function effectiveStatus(
  phrase: Phrase,
  tierStates: TierState[],
  progressById: Map<string, Progress>,
): ProgressStatus {
  const tierState = tierStates.find((t) => t.level === phraseTier(phrase));
  if (!tierState || !tierState.unlocked) return 'locked';
  const p = progressById.get(phrase.id);
  if (!p) return 'available';
  return p.status === 'locked' ? 'available' : p.status;
}
