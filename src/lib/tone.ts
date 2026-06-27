// 声調の自動判定（§4.1）。
// 声調は母音上の発音区別符号で一意に決まる。NFD 正規化して結合文字（声調マーク）を探すのが堅牢。
// 母音の音質マーク（circumflex, breve, horn）は声調ではないので無視する。

export type Tone = 'ngang' | 'huyền' | 'sắc' | 'hỏi' | 'ngã' | 'nặng';

const TONE_MARKS: Record<string, Tone> = {
  '̀': 'huyền', // grave   à
  '́': 'sắc', //   acute   á
  '̃': 'ngã', //   tilde   ã
  '̉': 'hỏi', //   hook    ả
  '̣': 'nặng', //  dot     ạ
};

export function detectTone(syllable: string): Tone {
  for (const ch of syllable.normalize('NFD')) {
    if (ch in TONE_MARKS) return TONE_MARKS[ch];
  }
  return 'ngang'; // マークなし＝平らな中音
}

export interface ToneInfo {
  tone: Tone;
  /** 日本語名 */
  label: string;
  /** 形のイメージ */
  shape: string;
  /** 表示色 */
  color: string;
  /** 難易度ラダーの段（1 が最易、5 が最難）。§5 歯車1 */
  tier: number;
}

export const TONE_INFO: Record<Tone, ToneInfo> = {
  ngang: { tone: 'ngang', label: '平声 (ngang)', shape: '平らな中音', color: '#94a3b8', tier: 1 },
  huyền: { tone: 'huyền', label: '玄声 (huyền)', shape: '低く下がる', color: '#60a5fa', tier: 1 },
  sắc: { tone: 'sắc', label: '鋭声 (sắc)', shape: '高く上がる', color: '#34d399', tier: 2 },
  nặng: { tone: 'nặng', label: '重声 (nặng)', shape: '短く詰まる', color: '#f59e0b', tier: 3 },
  hỏi: { tone: 'hỏi', label: '問声 (hỏi)', shape: '低く沈んで戻る', color: '#a78bfa', tier: 4 },
  ngã: { tone: 'ngã', label: '跳声 (ngã)', shape: 'きしんで上がる', color: '#f472b6', tier: 5 },
};

export function toneInfo(tone: Tone): ToneInfo {
  return TONE_INFO[tone];
}
