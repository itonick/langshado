import { useState } from 'react';
import HomeView from './components/HomeView';
import PracticeView from './components/PracticeView';
import ReviewView from './components/ReviewView';
import { StoreProvider, useStore } from './store';

type View = { name: 'home' } | { name: 'practice'; phraseId: string } | { name: 'review' };

function EarphoneNotice() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="bg-amber-900/40 px-4 py-2 text-center text-xs text-amber-100">
      🎧 イヤホン必須：スピーカー音をマイクが拾うとピッチ検出が乱れます。
      <button onClick={() => setDismissed(true)} className="ml-3 underline">
        閉じる
      </button>
    </div>
  );
}

function Shell() {
  const { loading } = useStore();
  const [view, setView] = useState<View>({ name: 'home' });

  const goPractice = (phraseId: string) => setView({ name: 'practice', phraseId });
  const goHome = () => setView({ name: 'home' });
  const goReview = () => setView({ name: 'review' });

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <button onClick={goHome} className="text-base font-bold tracking-tight">
            🇻🇳 ベトナム語シャドーイング
          </button>
          <nav className="flex gap-1 text-sm">
            <button
              onClick={goHome}
              className={`rounded px-3 py-1 ${view.name === 'home' ? 'bg-slate-700' : 'hover:bg-slate-800'}`}
            >
              ホーム
            </button>
            <button
              onClick={goReview}
              className={`rounded px-3 py-1 ${view.name === 'review' ? 'bg-slate-700' : 'hover:bg-slate-800'}`}
            >
              復習
            </button>
          </nav>
        </div>
      </header>

      <EarphoneNotice />

      {loading ? (
        <div className="p-10 text-center text-slate-500">読み込み中…</div>
      ) : view.name === 'home' ? (
        <HomeView onSelectPhrase={goPractice} onGoReview={goReview} />
      ) : view.name === 'practice' ? (
        <PracticeView key={view.phraseId} phraseId={view.phraseId} onBack={goHome} />
      ) : (
        <ReviewView onSelectPhrase={goPractice} onBack={goHome} />
      )}

      <footer className="mx-auto max-w-3xl px-4 py-8 text-center text-xs text-slate-600">
        個人利用・完全クライアント完結（認証なし／サーバーなし）。録音と進捗はブラウザ内（IndexedDB）に保存されます。
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
