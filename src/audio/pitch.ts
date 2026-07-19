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

/** 解析の進捗通知（0–1）。UI の「解析中…」表示に % を出すための口。 */
export type ProgressCallback = (progress: number) => void;

// ---- Web Worker 経由の抽出 ----
// Worker はモジュールスコープで 1 個を使い回し、リクエストは id で対応付ける。
// 生成・実行に失敗した環境ではメインスレッド実装へフォールバックする。
type WorkerResponse =
  | { id: number; type: 'progress'; progress: number }
  | { id: number; type: 'done'; frames: F0Frame[] };

interface PendingRequest {
  resolve: (frames: F0Frame[]) => void;
  reject: (err: unknown) => void;
  onProgress?: ProgressCallback;
}

let worker: Worker | null = null;
let workerFailed = false;
let nextRequestId = 0;
const pending = new Map<number, PendingRequest>();

function failAllPending(err: unknown): void {
  for (const req of pending.values()) req.reject(err);
  pending.clear();
}

function getWorker(): Worker | null {
  if (workerFailed) return null;
  if (!worker) {
    try {
      worker = new Worker(new URL('./pitch.worker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
        const req = pending.get(e.data.id);
        if (!req) return;
        if (e.data.type === 'progress') {
          req.onProgress?.(e.data.progress);
        } else {
          pending.delete(e.data.id);
          req.resolve(e.data.frames);
        }
      };
      // モジュール読み込み失敗等は非同期に onerror へ来る。以後はフォールバックに切り替える。
      worker.onerror = (e) => {
        workerFailed = true;
        worker?.terminate();
        worker = null;
        failAllPending(e);
      };
    } catch {
      workerFailed = true;
      worker = null;
    }
  }
  return worker;
}

function extractInWorker(
  w: Worker,
  channel: Float32Array,
  sampleRate: number,
  hopMs: number,
  onProgress?: ProgressCallback,
): Promise<F0Frame[]> {
  return new Promise<F0Frame[]>((resolve, reject) => {
    const id = nextRequestId++;
    pending.set(id, { resolve, reject, onProgress });
    // AudioBuffer 由来の Float32Array を transfer すると元バッファが detach されるためコピーを渡す。
    const copy = channel.slice();
    w.postMessage({ id, channel: copy, sampleRate, hopMs }, [copy.buffer]);
  });
}

/** メインスレッド実装（フォールバック）。setTimeout(0) で制御を返しつつ解析する。 */
async function extractF0FramesMain(
  channel: Float32Array,
  sampleRate: number,
  hopMs: number,
  onProgress?: ProgressCallback,
): Promise<F0Frame[]> {
  const detectPitch = Pitchfinder.YIN({ sampleRate, threshold: 0.1 });
  const hop = Math.max(1, Math.round((hopMs / 1000) * sampleRate));
  const total = Math.max(1, Math.floor((channel.length - FRAME_SIZE) / hop) + 1);
  const frames: F0Frame[] = [];
  const YIELD_EVERY = 5; // 約5フレーム（75ms分）ごとにブラウザへ制御を返す
  let i = 0;
  for (let start = 0; start + FRAME_SIZE <= channel.length; start += hop) {
    const frame = channel.subarray(start, start + FRAME_SIZE);
    const f0 = detectPitch(frame);
    frames.push({ t: start / sampleRate, f0: f0 ?? null });
    if (++i % YIELD_EVERY === 0) {
      onProgress?.(i / total);
      await new Promise<void>((r) => setTimeout(r, 0));
    }
  }
  return frames;
}

/**
 * AudioBuffer を一定ホップでフレーム分割し、各フレームの F0 を YIN で求める。
 * お手本 mp3 をデコードしたバッファに対して使う。
 * 解析は Web Worker で行い、メインスレッドをブロックしない。
 * Worker が使えない環境では従来のメインスレッド実装にフォールバックする。
 */
export async function extractF0Frames(
  buffer: AudioBuffer,
  hopMs = HOP_MS,
  onProgress?: ProgressCallback,
): Promise<F0Frame[]> {
  const sampleRate = buffer.sampleRate;
  const channel = buffer.getChannelData(0);
  const w = getWorker();
  if (w) {
    try {
      return await extractInWorker(w, channel, sampleRate, hopMs, onProgress);
    } catch {
      // Worker が途中で落ちた場合もメインスレッドで解析し直す。
      workerFailed = true;
    }
  }
  return extractF0FramesMain(channel, sampleRate, hopMs, onProgress);
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
export async function analyzeBuffer(
  buffer: AudioBuffer,
  onProgress?: ProgressCallback,
): Promise<PitchPoint[]> {
  return normalizePitch(await extractF0Frames(buffer, HOP_MS, onProgress));
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
export async function loadAndAnalyze(
  url: string,
  onProgress?: ProgressCallback,
): Promise<PitchPoint[] | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const audio = await decodeAudio(buf);
    return await analyzeBuffer(audio, onProgress);
  } catch {
    return null;
  }
}

/** 単一フレーム（Float32）から F0 を返す。ライブ表示用（recorder から呼ぶ）。 */
export function makeYinDetector(sampleRate: number): (frame: Float32Array) => number | null {
  const detect = Pitchfinder.YIN({ sampleRate, threshold: 0.1 });
  return (frame: Float32Array) => detect(frame) ?? null;
}
