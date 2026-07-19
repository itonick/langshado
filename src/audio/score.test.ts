import { describe, it, expect } from 'vitest';
import { resample, dtwDistance, pitchScore } from './score';
import type { PitchPoint } from './pitch';

// ピッチ点を作るヘルパー（tNorm: 0–1, st: セミトーン）
function pts(values: number[]): PitchPoint[] {
  return values.map((st, i) => ({
    tNorm: values.length === 1 ? 0 : i / (values.length - 1),
    st,
  }));
}

describe('resample', () => {
  it('空配列は空配列を返す', () => {
    expect(resample([])).toEqual([]);
  });

  it('単一点は n 点すべてその値になる', () => {
    const result = resample([{ tNorm: 0, st: 3 }], 5);
    expect(result).toHaveLength(5);
    expect(result.every((v) => v === 3)).toBe(true);
  });

  it('等間隔 2 点を n=5 にリサンプルすると線形補間される', () => {
    const points: PitchPoint[] = [
      { tNorm: 0, st: 0 },
      { tNorm: 1, st: 4 },
    ];
    const result = resample(points, 5);
    expect(result).toHaveLength(5);
    expect(result[0]).toBeCloseTo(0);
    expect(result[4]).toBeCloseTo(4);
    expect(result[2]).toBeCloseTo(2); // 中間は線形
  });

  it('デフォルト n=RESAMPLE_N(100) で 100 点を返す', () => {
    const result = resample(pts([0, 1, 2]));
    expect(result).toHaveLength(100);
  });
});

describe('dtwDistance', () => {
  it('空配列同士は Infinity', () => {
    expect(dtwDistance([], [])).toBe(Infinity);
  });

  it('片方が空配列は Infinity', () => {
    expect(dtwDistance([1, 2, 3], [])).toBe(Infinity);
    expect(dtwDistance([], [1, 2, 3])).toBe(Infinity);
  });

  it('同一列の距離は 0', () => {
    const seq = [0, 1, 2, 3, 4];
    expect(dtwDistance(seq, seq)).toBe(0);
  });

  it('定数シフト（全要素に同じオフセット）でも距離は差の絶対値', () => {
    const a = [0, 0, 0, 0];
    const b = [3, 3, 3, 3];
    expect(dtwDistance(a, b)).toBe(3);
  });

  it('全く異なる列は距離が大きい', () => {
    const flat = new Array(10).fill(0);
    const high = new Array(10).fill(12); // 1オクターブ差
    expect(dtwDistance(flat, high)).toBeGreaterThan(5);
  });

  it('長さが異なる列でも計算できる', () => {
    const a = [0, 1, 2];
    const b = [0, 0.5, 1, 1.5, 2];
    const d = dtwDistance(a, b);
    expect(d).toBeGreaterThanOrEqual(0);
    expect(isFinite(d)).toBe(true);
  });
});

describe('pitchScore', () => {
  it('同一ピッチ列は 100 点付近', () => {
    const pitch = pts([0, 1, 2, 1, 0]);
    const score = pitchScore(pitch, pitch);
    expect(score).toBeGreaterThanOrEqual(95); // 完全一致なので最高点
  });

  it('全く異なる列（平坦 vs 急上昇）では低スコア', () => {
    const flat = pts(new Array(20).fill(0));
    const steep = pts([0, 2, 4, 6, 8, 10, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12]);
    const score = pitchScore(flat, steep);
    expect(score).toBeLessThan(50);
  });

  it('小さな時間シフトへの DTW の頑健性（スコアが高い）', () => {
    // 同じ形状で時間軸がずれたもの → DTW は時間伸縮するため高スコアになるはず
    const ref: PitchPoint[] = [
      { tNorm: 0.0, st: 0 },
      { tNorm: 0.3, st: 2 },
      { tNorm: 0.6, st: 4 },
      { tNorm: 1.0, st: 2 },
    ];
    const shifted: PitchPoint[] = [
      { tNorm: 0.0, st: 0 },
      { tNorm: 0.4, st: 2 },   // 少し遅れてピーク
      { tNorm: 0.7, st: 4 },
      { tNorm: 1.0, st: 2 },
    ];
    const score = pitchScore(ref, shifted);
    // DTW のおかげで時間シフトに寛容 → 高スコア
    expect(score).toBeGreaterThan(70);
  });

  it('空入力（片方が 0–1 点）は 0 を返す', () => {
    const pitch = pts([0, 1, 2]);
    expect(pitchScore([], pitch)).toBe(0);
    expect(pitchScore(pitch, [])).toBe(0);
    // 1 点は length < 2 なので 0
    expect(pitchScore([{ tNorm: 0, st: 0 }], pitch)).toBe(0);
    expect(pitchScore(pitch, [{ tNorm: 0, st: 0 }])).toBe(0);
  });

  it('スコアは常に 0–100 の範囲内', () => {
    const a = pts([0, 5, 10, 5, 0]);
    const b = pts([-10, -5, 0, 5, 10]);
    const score = pitchScore(a, b);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});
