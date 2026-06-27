// 再生コントロール（速度・A/Bループ・リピート）。§7 PracticeView 1
import { useEffect, useRef, useState } from 'react';
import type { AudioPlayer } from '../audio/player';

interface Props {
  player: AudioPlayer;
  hasAudio: boolean;
  rate: number;
  onRateChange: (rate: number) => void;
}

export default function Player({ player, hasAudio, rate, onRateChange }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [pointA, setPointA] = useState<number | null>(null);
  const [pointB, setPointB] = useState<number | null>(null);
  const [repeat, setRepeat] = useState(false);
  const repeatRef = useRef(repeat);
  repeatRef.current = repeat;

  useEffect(() => {
    const el = player.el;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTime = () => setCurrent(el.currentTime);
    const onMeta = () => setDuration(player.duration);
    const onEnded = () => {
      if (repeatRef.current) void player.play();
      else setIsPlaying(false);
    };
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('durationchange', onMeta);
    el.addEventListener('ended', onEnded);
    setDuration(player.duration);
    return () => {
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('loadedmetadata', onMeta);
      el.removeEventListener('durationchange', onMeta);
      el.removeEventListener('ended', onEnded);
    };
  }, [player]);

  useEffect(() => {
    player.setRate(rate);
  }, [player, rate]);

  const togglePlay = () => {
    if (isPlaying) player.pause();
    else void player.play();
  };

  const setA = () => {
    const a = player.el.currentTime;
    setPointA(a);
    if (pointB != null && a < pointB) player.setLoop(a, pointB);
  };
  const setB = () => {
    const b = player.el.currentTime;
    setPointB(b);
    if (pointA != null && pointA < b) player.setLoop(pointA, b);
  };
  const clearAB = () => {
    setPointA(null);
    setPointB(null);
    player.clearLoop();
  };

  const fmt = (s: number) => `${s.toFixed(1)}s`;

  return (
    <div className="rounded-lg bg-slate-800/70 p-3 ring-1 ring-slate-700">
      {!hasAudio && (
        <p className="mb-2 rounded bg-amber-900/40 px-2 py-1 text-xs text-amber-200">
          お手本音源が見つかりません（public/audio/{'{id}'}.mp3）。録音と自分のピッチ表示は利用できますが、
          重ね比較・スコアにはお手本が必要です。§8 の generate-tts か自前録音を配置してください。
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={togglePlay}
          disabled={!hasAudio}
          className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white enabled:hover:bg-blue-500 disabled:opacity-40"
        >
          {isPlaying ? '⏸ 一時停止' : '▶ お手本再生'}
        </button>
        <span className="text-xs tabular-nums text-slate-400">
          {fmt(current)} / {fmt(duration)}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <label className="flex items-center gap-1 text-xs text-slate-300">
            速度
            <input
              type="range"
              min={0.5}
              max={1.5}
              step={0.1}
              value={rate}
              onChange={(e) => onRateChange(Number(e.target.value))}
              className="w-24"
            />
            <span className="w-8 tabular-nums">{rate.toFixed(1)}×</span>
          </label>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-400">区間ループ:</span>
        <button
          onClick={setA}
          disabled={!hasAudio}
          className="rounded bg-slate-700 px-2 py-1 enabled:hover:bg-slate-600 disabled:opacity-40"
        >
          A設定 {pointA != null && `(${fmt(pointA)})`}
        </button>
        <button
          onClick={setB}
          disabled={!hasAudio}
          className="rounded bg-slate-700 px-2 py-1 enabled:hover:bg-slate-600 disabled:opacity-40"
        >
          B設定 {pointB != null && `(${fmt(pointB)})`}
        </button>
        <button
          onClick={clearAB}
          disabled={pointA == null && pointB == null}
          className="rounded bg-slate-700 px-2 py-1 enabled:hover:bg-slate-600 disabled:opacity-40"
        >
          解除
        </button>
        <label className="ml-2 flex items-center gap-1 text-slate-300">
          <input type="checkbox" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} />
          リピート
        </label>
      </div>
    </div>
  );
}
