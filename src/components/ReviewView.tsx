// ブックマーク ＋ SRS期限の復習画面。§7 ReviewView / §6 住み分け
import { getPhrase } from '../data/phrases';
import { lookupDict } from '../data/dict';
import type { SrsItem } from '../lib/db';
import { detectTone, toneInfo } from '../lib/tone';
import { useStore } from '../store';

interface Props {
  onSelectPhrase: (id: string) => void;
  onBack: () => void;
}

export default function ReviewView({ onSelectPhrase, onBack }: Props) {
  const { bookmarks, dueSrs, toggleBookmark, reviewSrsItem } = useStore();

  const phraseBookmarks = bookmarks.filter((b) => b.type === 'phrase');
  const syllableBookmarks = bookmarks.filter((b) => b.type === 'syllable');

  const renderSrs = (item: SrsItem) => {
    if (item.type === 'phrase') {
      const phrase = getPhrase(item.itemId);
      if (!phrase) return null;
      return (
        <div
          key={item.itemId}
          className="flex items-center justify-between rounded-md bg-slate-800/70 px-3 py-2 ring-1 ring-slate-700"
        >
          <div>
            <div className="font-medium">{phrase.text}</div>
            <div className="text-xs text-slate-400">{phrase.meaning}</div>
          </div>
          <button
            onClick={() => onSelectPhrase(phrase.id)}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500"
          >
            練習する
          </button>
        </div>
      );
    }
    // 音節 SRS：意味・声調を確認して自己採点
    const tone = detectTone(item.itemId);
    const info = toneInfo(tone);
    const dict = lookupDict(item.itemId);
    return (
      <div
        key={item.itemId}
        className="rounded-md bg-slate-800/70 px-3 py-2 ring-1 ring-slate-700"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold">{item.itemId}</span>
          {dict?.kanji && <span className="text-amber-300">〔{dict.kanji}〕</span>}
          <span
            className="rounded-full px-2 py-0.5 text-[10px] text-slate-900"
            style={{ background: info.color }}
          >
            {info.label}
          </span>
          <span className="text-xs text-slate-400">{dict?.meaning_ja ?? '（辞書未登録）'}</span>
        </div>
        <div className="mt-2 flex gap-1.5 text-xs">
          {[
            { label: 'もう一度', q: 1, cls: 'bg-red-700 hover:bg-red-600' },
            { label: '難しい', q: 3, cls: 'bg-amber-700 hover:bg-amber-600' },
            { label: '普通', q: 4, cls: 'bg-blue-700 hover:bg-blue-600' },
            { label: '簡単', q: 5, cls: 'bg-green-700 hover:bg-green-600' },
          ].map((b) => (
            <button
              key={b.q}
              onClick={() => void reviewSrsItem(item.itemId, b.q)}
              className={`rounded px-2 py-1 text-white ${b.cls}`}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-blue-400 hover:underline">
          ← ホーム
        </button>
        <h1 className="text-lg font-semibold">復習</h1>
        <span className="w-16" />
      </div>

      {/* SRS 期限 */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-300">
          今日のSRS期限（{dueSrs.length}）
        </h2>
        <p className="mb-2 text-xs text-slate-500">
          SRS＝「いつ復習するか」を自動提示。フレーズは練習スコア、音節は自己採点で間隔が伸びます。
        </p>
        {dueSrs.length === 0 ? (
          <p className="text-sm text-slate-500">期限のものはありません。</p>
        ) : (
          <div className="space-y-2">{dueSrs.map(renderSrs)}</div>
        )}
      </section>

      {/* ブックマーク（フレーズ） */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-300">
          ブックマーク：フレーズ（{phraseBookmarks.length}）
        </h2>
        <p className="mb-2 text-xs text-slate-500">手で印を付けた「また練習したい」フレーズ。</p>
        {phraseBookmarks.length === 0 ? (
          <p className="text-sm text-slate-500">なし。</p>
        ) : (
          <div className="space-y-2">
            {phraseBookmarks.map((b) => {
              const phrase = getPhrase(b.refId);
              if (!phrase) return null;
              return (
                <div
                  key={b.id}
                  className="flex items-center justify-between rounded-md bg-slate-800/70 px-3 py-2 ring-1 ring-slate-700"
                >
                  <div>
                    <div className="font-medium">{phrase.text}</div>
                    <div className="text-xs text-slate-400">{phrase.meaning}</div>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => onSelectPhrase(phrase.id)}
                      className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500"
                    >
                      練習
                    </button>
                    <button
                      onClick={() => void toggleBookmark('phrase', b.refId)}
                      className="rounded bg-slate-700 px-2 py-1.5 text-sm hover:bg-slate-600"
                      aria-label="ブックマーク解除"
                    >
                      ★
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ブックマーク（音節） */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-300">
          ブックマーク：音節（{syllableBookmarks.length}）
        </h2>
        <p className="mb-2 text-xs text-slate-500">語を覚え直すための音節。意味＋声調をその場で確認。</p>
        {syllableBookmarks.length === 0 ? (
          <p className="text-sm text-slate-500">なし。</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {syllableBookmarks.map((b) => {
              const tone = detectTone(b.refId);
              const info = toneInfo(tone);
              const dict = lookupDict(b.refId);
              return (
                <div
                  key={b.id}
                  className="flex items-center justify-between rounded-md bg-slate-800/70 px-3 py-2 ring-1 ring-slate-700"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold">{b.refId}</span>
                    {dict?.kanji && <span className="text-amber-300">〔{dict.kanji}〕</span>}
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] text-slate-900"
                      style={{ background: info.color }}
                    >
                      {info.label}
                    </span>
                    <span className="text-xs text-slate-400">{dict?.meaning_ja ?? '—'}</span>
                  </div>
                  <button
                    onClick={() => void toggleBookmark('syllable', b.refId)}
                    className="rounded bg-slate-700 px-2 py-1.5 text-sm hover:bg-slate-600"
                    aria-label="ブックマーク解除"
                  >
                    ★
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
