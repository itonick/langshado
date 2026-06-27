// 類似度スコア（§4.3）。DTW で参照とユーザーのセミトーン列を時間整合し、0–100 にする。
import { D_MAX, RESAMPLE_N } from '../lib/config';
import type { PitchPoint } from './pitch';

/**
 * ピッチ列を tNorm に沿って等間隔 n 点へ線形補間リサンプルする。
 * DTW 前にやることで密度の差をならし、距離計算を安定させる。
 */
export function resample(points: PitchPoint[], n = RESAMPLE_N): number[] {
  if (points.length === 0) return [];
  if (points.length === 1) return new Array(n).fill(points[0].st);
  const out: number[] = new Array(n);
  let j = 0;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    while (j < points.length - 2 && points[j + 1].tNorm < t) j++;
    const a = points[j];
    const b = points[j + 1];
    const denom = b.tNorm - a.tNorm;
    const frac = denom <= 1e-9 ? 0 : (t - a.tNorm) / denom;
    out[i] = a.st + (b.st - a.st) * Math.min(1, Math.max(0, frac));
  }
  return out;
}

/**
 * DTW（動的時間伸縮）による正規化距離。
 * 経路長で割るため「1 ステップあたりの平均セミトーン差」になる。
 */
export function dtwDistance(a: number[], b: number[]): number {
  const n = a.length;
  const m = b.length;
  if (n === 0 || m === 0) return Infinity;

  // メモリ節約のため 2 行ローリング。経路長を別行列で持つ。
  let prev = new Float64Array(m + 1).fill(Infinity);
  let prevLen = new Float64Array(m + 1).fill(0);
  let curr = new Float64Array(m + 1);
  let currLen = new Float64Array(m + 1);
  prev[0] = 0;

  for (let i = 1; i <= n; i++) {
    curr.fill(Infinity);
    curr[0] = Infinity;
    currLen.fill(0);
    for (let j = 1; j <= m; j++) {
      const cost = Math.abs(a[i - 1] - b[j - 1]);
      // 3 方向のうち最小の累積コストを選ぶ。
      const diag = prev[j - 1];
      const up = prev[j];
      const left = curr[j - 1];
      let best = diag;
      let bestLen = prevLen[j - 1];
      if (up < best) {
        best = up;
        bestLen = prevLen[j];
      }
      if (left < best) {
        best = left;
        bestLen = currLen[j - 1];
      }
      curr[j] = cost + best;
      currLen[j] = bestLen + 1;
    }
    [prev, curr] = [curr, prev];
    [prevLen, currLen] = [currLen, prevLen];
  }

  const total = prev[m];
  const len = prevLen[m] || 1;
  return total / len;
}

/** 参照とユーザーのピッチ列から 0–100 のスコアを返す。 */
export function pitchScore(ref: PitchPoint[], usr: PitchPoint[]): number {
  if (ref.length < 2 || usr.length < 2) return 0;
  const r = resample(ref);
  const u = resample(usr);
  const d = dtwDistance(r, u);
  const score = Math.round(100 * (1 - d / D_MAX));
  return Math.min(100, Math.max(0, score));
}

/** スコアの色分け（§4.5）。 */
export function scoreColor(score: number): string {
  if (score >= 75) return '#22c55e'; // 緑
  if (score >= 50) return '#eab308'; // 黄
  return '#ef4444'; // 赤
}
