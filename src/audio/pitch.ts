// F0 抽出（pitchfinder/YIN）＋ セミトーン正規化（§4.2）。
//
// 参照（お手本mp3）とユーザー（マイク）で処理経路を 1 本に統一する。
// 「F0 列 → 有声フレーム抽出 → 自分の中央値基準でセミトーン化 → 時間を0–1正規化」。
import Pitchfinder from 'pitchfinder';
import { FRAME_SIZE, HOP_MS, MAX_F0, MIN_F0 } from '../lib/config';

/** 正規化後のピッチ点。tNorm: 0–1 の時間、st: 中央値基準のセミトーン。 */
export interface PitchPoint {
  tNorm: number;
  st: number;
}

/** 時刻つきの生 F0 サンプル（無声は f0=null）。 */
export interface F0Frame {
  t: number; // 秒
  f0: number | null;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * AudioBuffer を一定ホップでフレーム分割し、各フレームの F0 を YIN で求める。
 * お手本 mp3 をデコードしたバッファに対して使う。
 * 一定フレームごとに setTimeout(0) で制御を返し、メインスレッドのフリーズを防ぐ。
 */
export async function extractF0Frames(buffer: AudioBuffer, hopMs = HOP_MS): Promise<F0Frame[]> {
  const sampleRate = buffer.sampleRate;
  const channel = buffer.getChannelData(0);
  const detectPitch = Pitchfinder.YIN({ sampleRate, threshold: 0.1 });
  const hop = Math.max(1, Math.round((hopMs / 1000) * sampleRate));
  const frames: F0Frame[] = [];
  const YIELD_EVERY = 5; // 約5フレーム（75ms分）ごとにブラウザへ制御を返す
  let i = 0;
  for (let start = 0; start + FRAME_SIZE <= channel.length; start += hop) {
    const frame = channel.subarray(start, start + FRAME_SIZE);
    const f0 = detectPitch(frame);
    frames.push({ t: start / sampleRate, f0: f0 ?? null });
    if (++i % YIELD_EVERY === 0) {
      await new Promise<void>((r) => setTimeout(r, 0));
    }
  }
  return frames;
}

/**
 * 生 F0 フレーム列 → 正規化済みピッチ列。
 * 1) 有声フレームのみ残す（MIN_F0–MAX_F0）
 * 2) その発話自身の中央値を基準にセミトーン化（話者の絶対音高に依存しない）
 * 3) 時間を 0–1 に正規化
 */
export function normalizePitch(frames: F0Frame[]): PitchPoint[] {
  const voiced = frames.filter(
    (f): f is { t: number; f0: number } => f.f0 != null && f.f0 >= MIN_F0 && f.f0 <= MAX_F0,
  );
  if (voiced.length < 2) return [];

  const med = median(voiced.map((v) => v.f0));
  if (med <= 0) return [];

  const tMin = voiced[0].t;
  const tMax = voiced[voiced.length - 1].t;
  const span = Math.max(1e-6, tMax - tMin);

  return voiced.map((v) => ({
    tNorm: (v.t - tMin) / span,
    st: 12 * Math.log2(v.f0 / med),
  }));
}

/** お手本 mp3（AudioBuffer）→ 正規化ピッチ列。参照・ユーザー共通の入口。 */
export async function analyzeBuffer(buffer: AudioBuffer): Promise<PitchPoint[]> {
  return normalizePitch(await extractF0Frames(buffer));
}

let sharedCtx: AudioContext | null = null;
function getCtx(): AudioContext {
  if (!sharedCtx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    sharedCtx = new Ctor();
  }
  return sharedCtx;
}

/** mp3 等の ArrayBuffer をデコードして AudioBuffer にする。 */
export async function decodeAudio(data: ArrayBuffer): Promise<AudioBuffer> {
  const ctx = getCtx();
  // decodeAudioData は引数を破壊する実装があるためコピーを渡す。
  return await ctx.decodeAudioData(data.slice(0));
}

/** URL から音声を取得しデコードする。404 等は null を返す（音源未生成に耐える）。 */
export async function loadAndAnalyze(url: string): Promise<PitchPoint[] | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const audio = await decodeAudio(buf);
    return await analyzeBuffer(audio);
  } catch {
    return null;
  }
}

/** 単一フレーム（Float32）から F0 を返す。ライブ表示用（recorder から呼ぶ）。 */
export function makeYinDetector(sampleRate: number): (frame: Float32Array) => number | null {
  const detect = Pitchfinder.YIN({ sampleRate, threshold: 0.1 });
  return (frame: Float32Array) => detect(frame) ?? null;
}
