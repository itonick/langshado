// 音節の意味・漢字・単独再生パネル。§7 PracticeView 3
import type { Syllable } from '../data/phrases';
import { lookupDict } from '../data/dict';
import { detectTone, toneInfo } from '../lib/tone';
import { useStore } from '../store';

interface Props {
  syllable: Syllable;
  /** その音節だけ再生 */
  onPlay: () => void;
  canPlay: boolean;
  onClose: () => void;
}

export default function SyllablePanel({ syllable, onPlay, canPlay, onClose }: Props) {
  const { isBookmarked, toggleBookmark } = useStore();
  const tone = detectTone(syllable.text);
  const info = toneInfo(tone);
  const dict = lookupDict(syllable.text);
  const kanji = syllable.kanji ?? dict?.kanji;
  const meaning = syllable.meaning ?? dict?.meaning_ja ?? '（辞書未登録）';
  const refId = syllable.text.normalize('NFC');
  const bookmarked = isBookmarked('syllable', refId);

  return (
    <div className="rounded-lg bg-slate-800 p-4 ring-1 ring-slate-600">
      <div className="flex items-start justify-between">
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-bold">{syllable.text}</span>
          {kanji && <span className="text-2xl text-amber-300">〔{kanji}〕</span>}
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-200" aria-label="閉じる">
          ✕
        </button>
      </div>

      <div className="mt-2 flex items-center gap-2 text-sm">
        <span
          className="rounded-full px-2 py-0.5 text-xs font-medium text-slate-900"
          style={{ background: info.color }}
        >
          {info.label}
        </span>
        <span className="text-slate-400">{info.shape}</span>
      </div>

      <p className="mt-3 text-slate-200">{meaning}</p>

      <div className="mt-4 flex gap-2">
        <button
          onClick={onPlay}
          disabled={!canPlay}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white enabled:hover:bg-blue-500 disabled:opacity-40"
        >
          ▶ この音節だけ再生
        </button>
        <button
          onClick={() => void toggleBookmark('syllable', refId)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            bookmarked ? 'bg-amber-500 text-slate-900' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
          }`}
        >
          {bookmarked ? '★ ブックマーク済' : '☆ 音節をブックマーク'}
        </button>
      </div>
      {!canPlay && (
        <p className="mt-2 text-xs text-slate-500">
          ※ お手本音源が無い、または音節タイミングが推定できないため単独再生は無効です。
        </p>
      )}
    </div>
  );
}
