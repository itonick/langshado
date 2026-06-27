// IndexedDB ラッパー（§3.3）。録音 blob・進捗・ブックマーク・SRS・メタを保存する。
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { DEFAULT_SETTINGS } from './config';

export interface Recording {
  id: string;
  phraseId: string;
  blob: Blob;
  score: number;
  createdAt: number;
}

export type ProgressStatus = 'locked' | 'available' | 'learning' | 'mastered';

export interface Progress {
  phraseId: string;
  status: ProgressStatus;
  bestScore: number;
  attempts: number;
  passCount: number; // 合格閾値を超えた回数（習熟ゲート用）
}

export interface Bookmark {
  id: string;
  type: 'phrase' | 'syllable';
  refId: string;
  createdAt: number;
}

export interface SrsItem {
  itemId: string;
  type: 'phrase' | 'syllable';
  ease: number;
  interval: number; // 日
  dueDate: number; // epoch ms
  reps: number;
}

export interface Meta {
  id: 'meta';
  settings: { dailyGoal: number; playbackRate: number; showMeaningRuby: boolean };
  streak: { current: number; longest: number; lastStudyDate: string; freezes: number };
  /** 日付(YYYY-MM-DD) -> その日の練習回数。デイリーゴール用。 */
  dailyCounts: Record<string, number>;
}

interface ShadowingDB extends DBSchema {
  recordings: { key: string; value: Recording; indexes: { byPhrase: string } };
  progress: { key: string; value: Progress };
  bookmarks: { key: string; value: Bookmark; indexes: { byRef: string } };
  srs: { key: string; value: SrsItem };
  meta: { key: string; value: Meta };
}

const DB_NAME = 'shadowing-vi';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<ShadowingDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<ShadowingDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ShadowingDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const rec = db.createObjectStore('recordings', { keyPath: 'id' });
        rec.createIndex('byPhrase', 'phraseId');
        db.createObjectStore('progress', { keyPath: 'phraseId' });
        const bm = db.createObjectStore('bookmarks', { keyPath: 'id' });
        bm.createIndex('byRef', 'refId');
        db.createObjectStore('srs', { keyPath: 'itemId' });
        db.createObjectStore('meta', { keyPath: 'id' });
      },
    });
  }
  return dbPromise;
}

// ---------- recordings ----------
export async function addRecording(r: Recording): Promise<void> {
  const db = await getDB();
  await db.put('recordings', r);
}
export async function getRecordingsByPhrase(phraseId: string): Promise<Recording[]> {
  const db = await getDB();
  return db.getAllFromIndex('recordings', 'byPhrase', phraseId);
}
export async function getLatestRecording(phraseId: string): Promise<Recording | undefined> {
  const all = await getRecordingsByPhrase(phraseId);
  return all.sort((a, b) => b.createdAt - a.createdAt)[0];
}

// ---------- progress ----------
export async function getProgress(phraseId: string): Promise<Progress | undefined> {
  const db = await getDB();
  return db.get('progress', phraseId);
}
export async function getAllProgress(): Promise<Progress[]> {
  const db = await getDB();
  return db.getAll('progress');
}
export async function putProgress(p: Progress): Promise<void> {
  const db = await getDB();
  await db.put('progress', p);
}

// ---------- bookmarks ----------
export async function addBookmark(b: Bookmark): Promise<void> {
  const db = await getDB();
  await db.put('bookmarks', b);
}
export async function removeBookmark(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('bookmarks', id);
}
export async function getAllBookmarks(): Promise<Bookmark[]> {
  const db = await getDB();
  return db.getAll('bookmarks');
}
export async function findBookmark(
  type: Bookmark['type'],
  refId: string,
): Promise<Bookmark | undefined> {
  const all = await getAllBookmarks();
  return all.find((b) => b.type === type && b.refId === refId);
}

// ---------- srs ----------
export async function getSrsItem(itemId: string): Promise<SrsItem | undefined> {
  const db = await getDB();
  return db.get('srs', itemId);
}
export async function putSrsItem(item: SrsItem): Promise<void> {
  const db = await getDB();
  await db.put('srs', item);
}
export async function getAllSrs(): Promise<SrsItem[]> {
  const db = await getDB();
  return db.getAll('srs');
}
export async function getDueSrs(now = Date.now()): Promise<SrsItem[]> {
  const all = await getAllSrs();
  return all.filter((s) => s.dueDate <= now).sort((a, b) => a.dueDate - b.dueDate);
}

// ---------- meta ----------
export async function getMeta(): Promise<Meta> {
  const db = await getDB();
  const existing = await db.get('meta', 'meta');
  if (existing) return existing;
  const fresh: Meta = {
    id: 'meta',
    settings: { ...DEFAULT_SETTINGS },
    streak: { current: 0, longest: 0, lastStudyDate: '', freezes: 0 },
    dailyCounts: {},
  };
  await db.put('meta', fresh);
  return fresh;
}
export async function putMeta(meta: Meta): Promise<void> {
  const db = await getDB();
  await db.put('meta', meta);
}
