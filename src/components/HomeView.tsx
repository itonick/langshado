// 声調ラダー・ストリーク・デイリーゴール。§7 HomeView
import { getPhrase } from '../data/phrases';
import type { Phrase } from '../data/phrases';
import type { ProgressStatus } from '../lib/db';
import { effectiveStatus } from '../lib/progression';
import { useStore } from '../store';

interface Props {
  onSelectPhrase: (id: string) => void;
  onGoReview: () => void;
}

const STATUS_LABEL: Record<ProgressStatus, string> = {
  locked: '未解放',
  available: '未着手',
  learning: '学習中',
  mastered: '習得',
};

const STATUS_STYLE: Record<ProgressStatus, string> = {
  locked: 'bg-slate-800 text-slate-500',
  available: 'bg-slate-700 text-slate-200 hover:bg-slate-600',
  learning: 'bg-blue-900/60 text-blue-100 hover:bg-blue-800/60',
  mastered: 'bg-green-800/70 text-green-100 hover:bg-green-700/70',
};

export default function HomeView({ onSelectPhrase, onGoReview }: Props) {
  const { meta, progress, tierStates, dueSrs } = useStore();

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const dailyDone = meta?.dailyCounts[todayKey] ?? 0;
  const dailyGoal = meta?.settings.dailyGoal ?? 10;

  const renderPhrase = (phrase: Phrase, locked: boolean) => {
    const status = effectiveStatus(phrase, tierStates, progress);
    const p = progress.get(phrase.id);
    return (
      <button
        key={phrase.id}
        disabled={locked}
        onClick={() => onSelectPhrase(phrase.id)}
        className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition ${STATUS_STYLE[status]} ${locked ? 'cursor-not-allowed' : ''}`}
      >
        <span className="flex flex-col">
          <span className="font-medium">{locked ? '🔒 ' : ''}{phrase.text}</span>
          <span className="text-xs opacity-70">{phrase.meaning}</span>
        </span>
        <span className="ml-2 shrink-0 text-xs">
          {STATUS_LABEL[status]}
          {p && p.bestScore > 0 && status !== 'locked' ? ` · 最高${p.bestScore}` : ''}
        </span>
      </button>
    );
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4">
      {/* サマリー */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-slate-800/70 p-3 text-center ring-1 ring-slate-700">
          <div className="text-2xl font-bold text-orange-400">{meta?.streak.current ?? 0}</div>
          <div className="text-xs text-slate-400">連続日数（最長 {meta?.streak.longest ?? 0}）</div>
        </div>
        <div className="rounded-lg bg-slate-800/70 p-3 text-center ring-1 ring-slate-700">
          <div className="text-2xl font-bold text-blue-400">
            {dailyDone}
            <span className="text-sm text-slate-400">/{dailyGoal}</span>
          </div>
          <div className="text-xs text-slate-400">今日の練習</div>
        </div>
        <button
          onClick={onGoReview}
          className="rounded-lg bg-slate-800/70 p-3 text-center ring-1 ring-slate-700 hover:bg-slate-700/70"
        >
          <div className="text-2xl font-bold text-amber-400">{dueSrs.length}</div>
          <div className="text-xs text-slate-400">今日のSRS期限</div>
        </button>
      </div>

      {/* デイリーゴール進捗バー */}
      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full bg-blue-500 transition-all"
          style={{ width: `${Math.min(100, (dailyDone / Math.max(1, dailyGoal)) * 100)}%` }}
        />
      </div>

      {/* 声調ラダー */}
      <div className="space-y-4">
        {tierStates.map((ts) => (
          <section
            key={ts.level}
            className={`rounded-lg p-3 ring-1 ${
              ts.unlocked ? 'bg-slate-800/40 ring-slate-700' : 'bg-slate-900/40 ring-slate-800'
            }`}
          >
            <header className="mb-2 flex items-center justify-between">
              <div>
                <h2 className="font-semibold">
                  {!ts.unlocked && '🔒 '}
                  {ts.tier.title}
                </h2>
                <p className="text-xs text-slate-400">{ts.tier.hint}</p>
              </div>
              <div className="text-right text-xs">
                {ts.cleared ? (
                  <span className="rounded-full bg-green-700 px-2 py-0.5 font-medium">クリア</span>
                ) : (
                  <span className="text-slate-400">
                    {ts.masteredCount}/{ts.total} 習得
                  </span>
                )}
              </div>
            </header>
            <div className="space-y-1.5">
              {ts.phrases.length === 0 ? (
                <p className="text-xs text-slate-500">（この段の教材は未登録）</p>
              ) : (
                ts.phrases.map((p) => renderPhrase(getPhrase(p.id)!, !ts.unlocked))
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
