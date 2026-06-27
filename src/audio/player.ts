// 再生・速度変更・区間ループ（§4.4 / Player）。
// HTMLAudioElement の薄いラッパー。お手本 mp3 / 自分の録音 blob のどちらも再生できる。

export class AudioPlayer {
  readonly el: HTMLAudioElement;
  private loopRegion: { start: number; end: number } | null = null;
  private objectUrl: string | null = null;
  private rafId: number | null = null;

  constructor() {
    this.el = new Audio();
    this.el.preload = 'auto';
  }

  /** URL（public/audio/*.mp3 など）を読み込む。 */
  loadUrl(url: string): void {
    this.revoke();
    this.el.src = url;
    this.el.load();
  }

  /** 録音 blob を読み込む。 */
  loadBlob(blob: Blob): void {
    this.revoke();
    this.objectUrl = URL.createObjectURL(blob);
    this.el.src = this.objectUrl;
    this.el.load();
  }

  setRate(rate: number): void {
    this.el.playbackRate = rate;
  }

  async play(): Promise<void> {
    try {
      await this.el.play();
    } catch {
      /* ユーザー操作前などは無視 */
    }
  }

  pause(): void {
    this.el.pause();
  }

  stop(): void {
    this.el.pause();
    this.el.currentTime = 0;
    this.clearLoop();
  }

  get duration(): number {
    return Number.isFinite(this.el.duration) ? this.el.duration : 0;
  }

  /**
   * 区間 A/B ループを設定。start/end は秒。null でループ解除。
   * timeupdate だけでは粒度が粗いので requestAnimationFrame で監視する。
   */
  setLoop(start: number | null, end: number | null): void {
    if (start == null || end == null || end <= start) {
      this.clearLoop();
      return;
    }
    this.loopRegion = { start, end };
    this.el.currentTime = start;
    if (this.rafId == null) {
      const watch = () => {
        if (this.loopRegion && this.el.currentTime >= this.loopRegion.end) {
          this.el.currentTime = this.loopRegion.start;
        }
        this.rafId = requestAnimationFrame(watch);
      };
      this.rafId = requestAnimationFrame(watch);
    }
  }

  clearLoop(): void {
    this.loopRegion = null;
    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /**
   * 区間を 1 回だけ再生（音節の単独再生に使う）。
   * 音節タイミングが無いため、PracticeView 側で総尺の等分から start/end を渡す想定。
   */
  async playRegionOnce(startSec: number, endSec: number): Promise<void> {
    this.clearLoop();
    this.el.currentTime = startSec;
    const onTime = () => {
      if (this.el.currentTime >= endSec) {
        this.el.pause();
        this.el.removeEventListener('timeupdate', onTime);
      }
    };
    this.el.addEventListener('timeupdate', onTime);
    await this.play();
  }

  private revoke(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }

  destroy(): void {
    this.clearLoop();
    this.el.pause();
    this.revoke();
  }
}
