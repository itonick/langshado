// YIN による F0 抽出を Web Worker で実行する（§4.2）。
// メインスレッドから channel データ（Float32Array・transferable）を受け取り、
// F0Frame[] を返す。進捗は一定間隔で progress メッセージとして通知する。
import Pitchfinder from 'pitchfinder';
import { FRAME_SIZE } from '../lib/config';
import type { F0Frame } from './pitch';

export interface ExtractRequest {
  id: number;
  channel: Float32Array;
  sampleRate: number;
  hopMs: number;
}

export type ExtractResponse =
  | { id: number; type: 'progress'; progress: number }
  | { id: number; type: 'done'; frames: F0Frame[] };

const PROGRESS_EVERY = 20; // フレーム数。約 0.3 秒分の解析ごとに進捗を通知。

self.onmessage = (e: MessageEvent<ExtractRequest>) => {
  const { id, channel, sampleRate, hopMs } = e.data;
  const detectPitch = Pitchfinder.YIN({ sampleRate, threshold: 0.1 });
  const hop = Math.max(1, Math.round((hopMs / 1000) * sampleRate));
  const total = Math.max(1, Math.floor((channel.length - FRAME_SIZE) / hop) + 1);
  const frames: F0Frame[] = [];
  let i = 0;
  for (let start = 0; start + FRAME_SIZE <= channel.length; start += hop) {
    const frame = channel.subarray(start, start + FRAME_SIZE);
    const f0 = detectPitch(frame);
    frames.push({ t: start / sampleRate, f0: f0 ?? null });
    if (++i % PROGRESS_EVERY === 0) {
      self.postMessage({ id, type: 'progress', progress: i / total } satisfies ExtractResponse);
    }
  }
  self.postMessage({ id, type: 'done', frames } satisfies ExtractResponse);
};
