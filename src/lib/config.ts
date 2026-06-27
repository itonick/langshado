// アプリ全体で使うチューニング定数。後から調整できるよう一箇所に集約する。

/** 合格とみなすスコア閾値（0–100）。§4.3 */
export const PASS_SCORE = 75;

/** mastered にするために必要な合格回数。§5 歯車2 */
export const PASS_COUNT = 3;

/** DTW 正規化距離をスコア化するときの最大距離（セミトーン平均）。0 で満点、これ以上で 0 点。§4.3 */
export const D_MAX = 4;

/** 有声と判定する F0 の下限・上限(Hz)。§4.2 */
export const MIN_F0 = 70;
export const MAX_F0 = 400;

/** ピッチ抽出のフレーム長（サンプル）。低い声(70Hz)でも 2 周期以上入るサイズ。 */
export const FRAME_SIZE = 2048;

/** ピッチ抽出のホップ間隔(ms)。§4.2（約10–20ms） */
export const HOP_MS = 15;

/** スコア計算前にピッチ列をリサンプルする点数。 */
export const RESAMPLE_N = 100;

/** デフォルト設定値。 */
export const DEFAULT_SETTINGS = {
  dailyGoal: 10,
  playbackRate: 1.0,
  showMeaningRuby: false,
};
