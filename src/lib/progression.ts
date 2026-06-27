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
  { level: 1, introduces: ['ngang', 'huyền'], title: '段1：平音＋低く下がる', hint: '土台（ngang / huyền）' },
  { level: 2, introduces: ['sắc'], title: '段2：高く上がる', hint: '+ sắc' },
  { level: 3, introduces: ['nặng'], title: '段3：短く詰まる', hint: '+ nặng' },
  { level: 4, introduces: ['hỏi'], title: '段4：低く沈んで戻る（難）', hint: '+ hỏi' },
  { level: 5, introduces: ['ngã'], title: '段5：きしんで上がる（最難）', hint: '+ ngã' },
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

/** フレーズ難易度 = 含まれる音節の声調のうち最も後段のもの。 */
export function phraseTier(phrase: Phrase): number {
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
