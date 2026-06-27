// 音節タップ可能なフレーズ表示。§7 PracticeView 3
import type { Syllable } from '../data/phrases';
import { lookupDict } from '../data/dict';
import { detectTone, toneInfo } from '../lib/tone';

interface Props {
  syllables: Syllable[];
  /** 意味ルビ on/off（シャドーイング中は消す／復習時は出す） */
  showRuby: boolean;
  /** テキスト表示 on/off */
  showText: boolean;
  activeIndex?: number | null;
  onTap: (index: number) => void;
}

function meaningOf(syl: Syllable): string | undefined {
  return syl.meaning ?? lookupDict(syl.text)?.meaning_ja;
}

export default function SyllableText({ syllables, showRuby, showText, activeIndex, onTap }: Props) {
  if (!showText) {
    return (
      <div className="flex min-h-[3rem] items-center justify-center text-sm text-slate-500">
        （テキスト非表示中 — 耳で聞き取って発話）
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-end gap-x-1.5 gap-y-3">
      {syllables.map((syl, i) => {
        const tone = detectTone(syl.text);
        const info = toneInfo(tone);
        const meaning = meaningOf(syl);
        const isActive = activeIndex === i;
        return (
          <button
            key={i}
            onClick={() => onTap(i)}
            title={`${info.label}（${info.shape}）`}
            className={`group flex flex-col items-center rounded px-1 pb-0.5 transition ${
              isActive ? 'bg-slate-700' : 'hover:bg-slate-800'
            }`}
          >
            {showRuby && meaning && (
              <span className="max-w-[8rem] truncate text-[10px] leading-tight text-slate-400">
                {meaning}
              </span>
            )}
            <span className="text-2xl font-semibold">{syl.text}</span>
            <span
              className="mt-0.5 h-1 w-full rounded-full"
              style={{ background: info.color }}
              aria-hidden
            />
          </button>
        );
      })}
    </div>
  );
}
