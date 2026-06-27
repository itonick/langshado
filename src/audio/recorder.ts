// 録音とライブ F0 取得（§4.4）。
// MediaRecorder で再生用 blob を取りつつ、同じ mic stream を AnalyserNode でタップして
// 録音中に F0 フレームを逐次蓄積する（blob の再デコード不要）。
import { HOP_MS, MAX_F0, MIN_F0 } from '../lib/config';
import { makeYinDetector, normalizePitch, type F0Frame, type PitchPoint } from './pitch';

export interface RecorderResult {
  blob: Blob;
  pitch: PitchPoint[]; // 正規化済み
  rawFrames: F0Frame[]; // 生 F0（必要なら再解析用）
  durationMs: number;
}

type LiveCallback = (latest: { st: number | null; elapsedMs: number }) => void;

export class LivePitchRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private chunks: Blob[] = [];
  private frames: F0Frame[] = [];
  private timer: number | null = null;
  private startTime = 0;
  private detect: ((frame: Float32Array) => number | null) | null = null;
  private buf: Float32Array<ArrayBuffer> | null = null;
  private median = 0;

  /** マイク権限を取り、録音と F0 蓄積を開始する。 */
  async start(onLive?: LiveCallback): Promise<void> {
    this.chunks = [];
    this.frames = [];
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: false,
      },
    });

    // ---- blob 用 ----
    const mime = pickMimeType();
    this.mediaRecorder = new MediaRecorder(this.stream, mime ? { mimeType: mime } : undefined);
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.mediaRecorder.start();

    // ---- ライブ F0 用 ----
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.audioCtx = new Ctor();
    this.source = this.audioCtx.createMediaStreamSource(this.stream);
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.source.connect(this.analyser);
    this.detect = makeYinDetector(this.audioCtx.sampleRate);
    this.buf = new Float32Array(this.analyser.fftSize);
    this.startTime = performance.now();

    const tick = () => {
      if (!this.analyser || !this.detect || !this.buf) return;
      this.analyser.getFloatTimeDomainData(this.buf);
      const f0 = this.detect(this.buf);
      const elapsedMs = performance.now() - this.startTime;
      const valid = f0 != null && f0 >= MIN_F0 && f0 <= MAX_F0;
      this.frames.push({ t: elapsedMs / 1000, f0: valid ? f0 : null });
      if (onLive) {
        // 暫定の中央値（直近の有声）でセミトーン換算してライブ表示。
        const st = valid && this.median > 0 ? 12 * Math.log2((f0 as number) / this.median) : null;
        onLive({ st, elapsedMs });
        if (valid) this.updateRunningMedian(f0 as number);
      }
    };
    this.timer = window.setInterval(tick, HOP_MS);
  }

  /** ライブ表示のための簡易ランニング中央値。停止時は全フレームで再計算する。 */
  private medianSamples: number[] = [];
  private updateRunningMedian(f0: number) {
    this.medianSamples.push(f0);
    if (this.medianSamples.length > 200) this.medianSamples.shift();
    const s = [...this.medianSamples].sort((a, b) => a - b);
    this.median = s[Math.floor(s.length / 2)];
  }

  /** 録音停止。blob と正規化ピッチ列を返す。 */
  async stop(): Promise<RecorderResult> {
    if (this.timer != null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    const durationMs = performance.now() - this.startTime;

    const blob = await new Promise<Blob>((resolve) => {
      if (!this.mediaRecorder) {
        resolve(new Blob());
        return;
      }
      this.mediaRecorder.onstop = () => {
        resolve(new Blob(this.chunks, { type: this.mediaRecorder?.mimeType || 'audio/webm' }));
      };
      this.mediaRecorder.stop();
    });

    this.cleanup();

    const pitch = normalizePitch(this.frames);
    return { blob, pitch, rawFrames: this.frames, durationMs };
  }

  /** リソース解放（マイクの停止）。 */
  cleanup(): void {
    if (this.timer != null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.stream?.getTracks().forEach((t) => t.stop());
    this.source?.disconnect();
    this.analyser?.disconnect();
    this.audioCtx?.close().catch(() => {});
    this.stream = null;
    this.source = null;
    this.analyser = null;
    this.audioCtx = null;
    this.mediaRecorder = null;
    this.medianSamples = [];
    this.median = 0;
  }

  get isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }
}

function pickMimeType(): string | null {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
  if (typeof MediaRecorder === 'undefined') return null;
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return null;
}
