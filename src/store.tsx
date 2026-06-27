// アプリ全体の状態（IndexedDB をバックエンドにした薄い store）。
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { PASS_COUNT, PASS_SCORE } from './lib/config';
import {
  addBookmark,
  addRecording,
  findBookmark,
  getAllBookmarks,
  getAllProgress,
  getDueSrs,
  getMeta,
  getProgress,
  getSrsItem,
  putMeta,
  putProgress,
  putSrsItem,
  removeBookmark,
  type Bookmark,
  type Meta,
  type Progress,
  type SrsItem,
} from './lib/db';
import { computeTierStates, type TierState } from './lib/progression';
import { newSrsItem, reviewSrs, scoreToQuality } from './lib/srs';
import { PHRASES } from './data/phrases';

function todayStr(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00');
  const db = new Date(b + 'T00:00:00');
  return Math.round((db.getTime() - da.getTime()) / (24 * 60 * 60 * 1000));
}

interface StoreValue {
  loading: boolean;
  meta: Meta | null;
  progress: Map<string, Progress>;
  tierStates: TierState[];
  bookmarks: Bookmark[];
  dueSrs: SrsItem[];
  refreshAll: () => Promise<void>;
  recordAttempt: (
    phraseId: string,
    score: number,
    blob: Blob,
  ) => Promise<{ progress: Progress; becameMastered: boolean }>;
  isBookmarked: (type: Bookmark['type'], refId: string) => boolean;
  toggleBookmark: (type: Bookmark['type'], refId: string) => Promise<void>;
  updateSettings: (partial: Partial<Meta['settings']>) => Promise<void>;
  reviewSrsItem: (itemId: string, quality: number) => Promise<void>;
}

const StoreCtx = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [progress, setProgress] = useState<Map<string, Progress>>(new Map());
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [dueSrs, setDueSrs] = useState<SrsItem[]>([]);

  const refreshAll = useCallback(async () => {
    const [m, progList, bms, due] = await Promise.all([
      getMeta(),
      getAllProgress(),
      getAllBookmarks(),
      getDueSrs(),
    ]);
    setMeta(m);
    setProgress(new Map(progList.map((p) => [p.phraseId, p])));
    setBookmarks(bms);
    setDueSrs(due);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const tierStates = useMemo(() => computeTierStates(PHRASES, progress), [progress]);

  const recordAttempt = useCallback(
    async (phraseId: string, score: number, blob: Blob) => {
      const existing =
        (await getProgress(phraseId)) ??
        ({ phraseId, status: 'available', bestScore: 0, attempts: 0, passCount: 0 } as Progress);

      const wasMastered = existing.status === 'mastered';
      const passCount = existing.passCount + (score >= PASS_SCORE ? 1 : 0);
      const next: Progress = {
        phraseId,
        attempts: existing.attempts + 1,
        bestScore: Math.max(existing.bestScore, score),
        passCount,
        status: passCount >= PASS_COUNT ? 'mastered' : 'learning',
      };
      await putProgress(next);

      await addRecording({
        id: `${phraseId}-${Date.now()}`,
        phraseId,
        blob,
        score,
        createdAt: Date.now(),
      });

      const becameMastered = !wasMastered && next.status === 'mastered';
      const existingSrs = await getSrsItem(phraseId);
      if (becameMastered && !existingSrs) {
        // mastered になったら SRS に載せる（初回スケジュール）。
        await putSrsItem(newSrsItem(phraseId, 'phrase'));
      } else if (existingSrs) {
        // 既に SRS 対象なら、今回のスコアを quality に写像して間隔を更新（復習を兼ねる）。
        await putSrsItem(reviewSrs(existingSrs, scoreToQuality(score)));
      }

      // ストリーク・デイリーゴール更新
      const m = await getMeta();
      const today = todayStr();
      const last = m.streak.lastStudyDate;
      let current = m.streak.current;
      if (last !== today) {
        if (last && daysBetween(last, today) === 1) current += 1;
        else current = 1;
      }
      const longest = Math.max(m.streak.longest, current);
      const dailyCounts = { ...m.dailyCounts, [today]: (m.dailyCounts[today] ?? 0) + 1 };
      const updatedMeta: Meta = {
        ...m,
        streak: { ...m.streak, current, longest, lastStudyDate: today },
        dailyCounts,
      };
      await putMeta(updatedMeta);

      await refreshAll();
      return { progress: next, becameMastered };
    },
    [refreshAll],
  );

  const isBookmarked = useCallback(
    (type: Bookmark['type'], refId: string) =>
      bookmarks.some((b) => b.type === type && b.refId === refId),
    [bookmarks],
  );

  const toggleBookmark = useCallback(
    async (type: Bookmark['type'], refId: string) => {
      const existing = await findBookmark(type, refId);
      if (existing) {
        await removeBookmark(existing.id);
        // 音節ブックマークを外したら、対応する SRS も作らない（SRS とは別物：§6）
      } else {
        await addBookmark({
          id: `${type}:${refId}`,
          type,
          refId,
          createdAt: Date.now(),
        });
        // ブックマークした音節は SRS に載せる（語を覚え直す導線）
        if (type === 'syllable') {
          const srs = (await getSrsItem(refId)) ?? newSrsItem(refId, 'syllable');
          await putSrsItem(srs);
        }
      }
      await refreshAll();
    },
    [refreshAll],
  );

  const updateSettings = useCallback(
    async (partial: Partial<Meta['settings']>) => {
      const m = await getMeta();
      const updated: Meta = { ...m, settings: { ...m.settings, ...partial } };
      await putMeta(updated);
      setMeta(updated);
    },
    [],
  );

  const reviewSrsItem = useCallback(
    async (itemId: string, quality: number) => {
      const item = await getSrsItem(itemId);
      if (!item) return;
      await putSrsItem(reviewSrs(item, quality));
      await refreshAll();
    },
    [refreshAll],
  );

  const value: StoreValue = {
    loading,
    meta,
    progress,
    tierStates,
    bookmarks,
    dueSrs,
    refreshAll,
    recordAttempt,
    isBookmarked,
    toggleBookmark,
    updateSettings,
    reviewSrsItem,
  };

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

export { PASS_COUNT, PASS_SCORE };
