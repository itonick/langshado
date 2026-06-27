// 練習ループ画面。§7 PracticeView
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PitchPoint } from '../audio/pitch';
import { loadAndAnalyze } from '../audio/pitch';
import { AudioPlayer } from '../audio/player';
import { LivePitchRecorder } from '../audio/recorder';
import { pitchScore, scoreColor } from '../audio/score';
import { getPhrase } from '../data/phrases';
import { PASS_COUNT, PASS_SCORE, useStore } from '../store';
import PitchOverlay from './PitchOverlay';
import Player from './Player';
import SyllablePanel from './SyllablePanel';
import SyllableText from './SyllableText';

interface Props {
  phraseId: string;
  onBack: () => void;
}

function audioUrl(id: string): string {
  return `${import.meta.env.BASE_URL}audio/${id}.mp3`;
}

export default function PracticeView({ phraseId, onBack }: Props) {
  const phrase = getPhrase(phraseId);
  const { meta, progress, recordAttempt, isBookmarked, toggleBookmark, updateSettings } = useStore();

  const playerRef = useRef<AudioPlayer | null>(null);
  if (!playerRef.current) playerRef.current = new AudioPlayer();
  const player = playerRef.current;

  const recorderRef = useRef<LivePitchRecorder | null>(null);
  if (!recorderRef.current) recorderRef.current = new LivePitchRecorder();
  const recorder = recorderRef.current;

  const [refPitch, setRefPitch] = useState<PitchPoint[] | null>(null);
  const [hasAudio, setHasAudio] = useState(false);
  const [userPitch, setUserPitch] = useState<PitchPoint[] | null>(null);
  const [livePitch, setLivePitch] = useState<{ t: number; st: number }[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const [recBlob, setRecBlob] = useState<Blob | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [rate, setRate] = useState(meta?.settings.playbackRate ?? 1);
  const [showText, setShowText] = useState(true);
  const [showTranslation, setShowTranslation] = useState(false);
  const [showRuby, setShowRuby] = useState(meta?.settings.showMeaningRuby ?? false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  // お手本のロード＆参照ピッチ解析（mp3 をブラウザ内で decode → YIN）。
  useEffect(() => {
    if (!phrase) return;
    let cancelled = false;
    const url = audioUrl(phrase.id);
    player.loadUrl(url);
    setRefPitch(null);
    setHasAudio(false);
    void loadAndAnalyze(url).then((pts) => {
      if (cancelled) return;
      if (pts && pts.length >= 2) {
        setRefPitch(pts);
        setHasAudio(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [phrase, player]);

  // アンマウント時のリソース解放
  useEffect(() => {
    return () => {
      player.destroy();
      recorder.cleanup();
    };
  }, [player, recorder]);

  const liveNormalized = useMemo<PitchPoint[]>(() => {
    if (livePitch.length < 2) return [];
    const maxT = livePitch[livePitch.length - 1].t || 1;
    return livePitch.map((p) => ({ tNorm: p.t / maxT, st: p.st }));
  }, [livePitch]);

  const startRecording = useCallback(async () => {
    setUserPitch(null);
    setScore(null);
    setRecBlob(null);
    setLivePitch([]);
    setLastResult(null);
    try {
      await recorder.start(({ st, elapsedMs }) => {
        if (st != null) {
          setLivePitch((prev) => [...prev, { t: elapsedMs / 1000, st }]);
        }
      });
      setIsRecording(true);
    } catch (err) {
      setLastResult(
        'マイクにアクセスできませんでした。ブラウザのマイク許可を確認してください（' +
          (err instanceof Error ? err.message : String(err)) +
          '）',
      );
    }
  }, [recorder]);

  const stopRecording = useCallback(async () => {
    const result = await recorder.stop();
    setIsRecording(false);
    setUserPitch(result.pitch);
    setRecBlob(result.blob);

    if (refPitch && result.pitch.length >= 2) {
      const s = pitchScore(refPitch, result.pitch);
      setScore(s);
      const { becameMastered } = await recordAttempt(phraseId, s, result.blob);
      if (becameMastered) setLastResult('🎉 mastered になりました！この段が揃えば次段が解放されます。');
      else if (s >= PASS_SCORE) setLastResult('✅ 合格スコア！習熟カウントが進みました。');
      else setLastResult('もう一度。声調の「形」をお手本に近づけましょう。');
    } else if (!refPitch) {
      setLastResult('お手本音源が無いためスコアは出せません（自分のピッチのみ表示）。');
    } else {
      setLastResult('声が検出できませんでした。イヤホンを使い、もう一度はっきり発話してください。');
    }
  }, [recorder, refPitch, recordAttempt, phraseId]);

  const playUser = useCallback(() => {
    if (recBlob) {
      player.loadBlob(recBlob);
      void player.play();
    }
  }, [player, recBlob]);

  const playReference = useCallback(() => {
    if (phrase) {
      player.loadUrl(audioUrl(phrase.id));
      void player.play();
    }
  }, [player, phrase]);

  const playSyllable = useCallback(
    (index: number) => {
      const dur = player.duration;
      const n = phrase?.syllables.length ?? 0;
      if (!hasAudio || dur <= 0 || n <= 0) return;
      // 音節タイミングは持たないので総尺の等分で近似する（§4.4 player）。
      const start = (index / n) * dur;
      const end = ((index + 1) / n) * dur;
      void player.playRegionOnce(start, end);
    },
    [player, phrase, hasAudio],
  );

  if (!phrase) {
    return (
      <div className="p-6">
        <button onClick={onBack} className="text-blue-400 hover:underline">
          ← 戻る
        </button>
        <p className="mt-4">フレーズが見つかりません: {phraseId}</p>
      </div>
    );
  }

  const prog = progress.get(phraseId);
  const passCount = prog?.passCount ?? 0;
  const phraseBookmarked = isBookmarked('phrase', phraseId);
  const canPlaySyllable = hasAudio && player.duration > 0;

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-blue-400 hover:underline">
          ← 一覧へ
        </button>
        <div className="flex items-center gap-2 text-sm">
          {prog?.status === 'mastered' && (
            <span className="rounded-full bg-green-600 px-2 py-0.5 text-xs font-medium">mastered</span>
          )}
          <span className="text-slate-400">
            合格 {passCount}/{PASS_COUNT}
          </span>
          <button
            onClick={() => void toggleBookmark('phrase', phraseId)}
            className={`rounded-md px-2 py-1 text-xs font-medium ${
              phraseBookmarked
                ? 'bg-amber-500 text-slate-900'
                : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
            }`}
          >
            {phraseBookmarked ? '★ 登録済' : '☆ フレーズ登録'}
          </button>
        </div>
      </div>

      {/* スクリプト表示トグル */}
      <div className="flex flex-wrap gap-3 text-xs text-slate-300">
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={showText} onChange={(e) => setShowText(e.target.checked)} />
          テキスト
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={showTranslation}
            onChange={(e) => setShowTranslation(e.target.checked)}
          />
          和訳
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={showRuby}
            onChange={(e) => {
              setShowRuby(e.target.checked);
              void updateSettings({ showMeaningRuby: e.target.checked });
            }}
          />
          意味ルビ
        </label>
      </div>

      <div className="rounded-lg bg-slate-800/50 p-4 ring-1 ring-slate-700">
        <SyllableText
          syllables={phrase.syllables}
          showRuby={showRuby}
          showText={showText}
          activeIndex={selected}
          onTap={(i) => setSelected(i)}
        />
        {showTranslation && <p className="mt-3 text-slate-300">＝ {phrase.meaning}</p>}
        {phrase.note && <p className="mt-1 text-xs text-slate-500">{phrase.note}</p>}
      </div>

      {selected != null && (
        <SyllablePanel
          syllable={phrase.syllables[selected]}
          onPlay={() => playSyllable(selected)}
          canPlay={canPlaySyllable}
          onClose={() => setSelected(null)}
        />
      )}

      <Player player={player} hasAudio={hasAudio} rate={rate} onRateChange={(r) => {
        setRate(r);
        void updateSettings({ playbackRate: r });
      }} />

      <PitchOverlay
        reference={refPitch}
        user={userPitch}
        live={isRecording ? liveNormalized : null}
        score={score}
        syllableCount={phrase.syllables.length}
      />

      <div className="flex flex-wrap items-center gap-2">
        {!isRecording ? (
          <button
            onClick={() => void startRecording()}
            className="rounded-md bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-500"
          >
            ● 録音開始
          </button>
        ) : (
          <button
            onClick={() => void stopRecording()}
            className="animate-pulse rounded-md bg-red-700 px-4 py-2 font-medium text-white"
          >
            ■ 停止
          </button>
        )}
        <button
          onClick={playReference}
          disabled={!hasAudio}
          className="rounded-md bg-slate-700 px-3 py-2 text-sm enabled:hover:bg-slate-600 disabled:opacity-40"
        >
          ▶ お手本
        </button>
        <button
          onClick={playUser}
          disabled={!recBlob}
          className="rounded-md bg-slate-700 px-3 py-2 text-sm enabled:hover:bg-slate-600 disabled:opacity-40"
        >
          ▶ 自分の録音
        </button>
        {score != null && (
          <span className="ml-auto text-lg font-bold" style={{ color: scoreColor(score) }}>
            スコア {score}
          </span>
        )}
      </div>

      {lastResult && <p className="text-sm text-slate-300">{lastResult}</p>}
    </div>
  );
}
