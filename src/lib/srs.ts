// SM-2 スケジューラ（§5 歯車3）。
// quality 0–5（5=完璧, 3=なんとか正解, <3=不正解）で復習間隔を更新する。
import type { SrsItem } from './db';

const DAY_MS = 24 * 60 * 60 * 1000;

export function newSrsItem(itemId: string, type: SrsItem['type']): SrsItem {
  return {
    itemId,
    type,
    ease: 2.5,
    interval: 0,
    dueDate: Date.now(), // すぐ復習対象
    reps: 0,
  };
}

/**
 * SM-2 本体。
 * - quality < 3 で失敗扱い：reps を 0 に戻し interval=1 日。
 * - quality >= 3 で成功：reps に応じて 1→6→interval*ease と伸ばす。
 * ease は SM-2 の公式に従って更新（下限 1.3）。
 */
export function reviewSrs(item: SrsItem, quality: number, now = Date.now()): SrsItem {
  const q = Math.min(5, Math.max(0, Math.round(quality)));
  let { ease, interval, reps } = item;

  if (q < 3) {
    reps = 0;
    interval = 1;
  } else {
    reps += 1;
    if (reps === 1) interval = 1;
    else if (reps === 2) interval = 6;
    else interval = Math.round(interval * ease);
  }

  ease = ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (ease < 1.3) ease = 1.3;

  return {
    ...item,
    ease,
    interval,
    reps,
    dueDate: now + interval * DAY_MS,
  };
}

/** 練習スコア(0–100) を SM-2 の quality(0–5) に写像する。 */
export function scoreToQuality(score: number): number {
  if (score >= 90) return 5;
  if (score >= 80) return 4;
  if (score >= 70) return 3;
  if (score >= 50) return 2;
  if (score >= 30) return 1;
  return 0;
}
