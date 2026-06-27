// ★お手本と自分のピッチを重ねて描画（§4.5）。
// x軸＝正規化時間(0–1)、y軸＝セミトーン（中央0付近）。お手本＝実線、自分＝破線。
import { useEffect, useRef } from 'react';
import type { PitchPoint } from '../audio/pitch';
import { scoreColor } from '../audio/score';

interface Props {
  reference: PitchPoint[] | null;
  user: PitchPoint[] | null;
  /** 録音中のライブ点（tNorm は経過時間ベースの暫定値） */
  live?: PitchPoint[] | null;
  score: number | null;
  /** 音節数（>0 で縦の補助線を引く） */
  syllableCount?: number;
  height?: number;
}

const REF_COLOR = '#60a5fa'; // お手本＝青
const USR_COLOR = '#f97316'; // 自分＝橙
const ST_RANGE = 12; // ±12 セミトーン（1オクターブ）を表示範囲に

export default function PitchOverlay({
  reference,
  user,
  live,
  score,
  syllableCount = 0,
  height = 220,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    const cssW = parent ? parent.clientWidth : 600;
    const cssH = height;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, cssW, cssH);

    const padL = 36;
    const padR = 10;
    const padT = 10;
    const padB = 18;
    const plotW = cssW - padL - padR;
    const plotH = cssH - padT - padB;

    const xOf = (tNorm: number) => padL + tNorm * plotW;
    const yOf = (st: number) => {
      const clamped = Math.max(-ST_RANGE, Math.min(ST_RANGE, st));
      return padT + plotH / 2 - (clamped / ST_RANGE) * (plotH / 2);
    };

    // ---- 背景グリッド ----
    ctx.strokeStyle = 'rgba(148,163,184,0.15)';
    ctx.lineWidth = 1;
    ctx.fillStyle = 'rgba(148,163,184,0.7)';
    ctx.font = '10px system-ui, sans-serif';
    for (let st = -ST_RANGE; st <= ST_RANGE; st += 6) {
      const y = yOf(st);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(cssW - padR, y);
      ctx.stroke();
      ctx.fillText(`${st > 0 ? '+' : ''}${st}`, 4, y + 3);
    }
    // 中央線を強調（0 セミトーン＝発話の中央値）
    ctx.strokeStyle = 'rgba(148,163,184,0.4)';
    ctx.beginPath();
    ctx.moveTo(padL, yOf(0));
    ctx.lineTo(cssW - padR, yOf(0));
    ctx.stroke();

    // ---- 音節の縦補助線 ----
    if (syllableCount > 1) {
      ctx.strokeStyle = 'rgba(148,163,184,0.18)';
      ctx.setLineDash([2, 4]);
      for (let i = 1; i < syllableCount; i++) {
        const x = xOf(i / syllableCount);
        ctx.beginPath();
        ctx.moveTo(x, padT);
        ctx.lineTo(x, cssH - padB);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    const drawCurve = (points: PitchPoint[], color: string, dashed: boolean) => {
      if (points.length < 2) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.setLineDash(dashed ? [6, 5] : []);
      ctx.beginPath();
      let started = false;
      let prevT = -1;
      for (const p of points) {
        // 時間が大きく飛ぶ（無声区間）ところは線を切る
        if (started && p.tNorm - prevT > 0.08) {
          ctx.stroke();
          ctx.beginPath();
          started = false;
        }
        const x = xOf(p.tNorm);
        const y = yOf(p.st);
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
        prevT = p.tNorm;
      }
      ctx.stroke();
      ctx.setLineDash([]);
    };

    if (reference) drawCurve(reference, REF_COLOR, false);
    if (user) drawCurve(user, USR_COLOR, true);
    if (live && !user) drawCurve(live, USR_COLOR, true);
  }, [reference, user, live, syllableCount, height]);

  return (
    <div className="w-full">
      <div className="relative rounded-lg bg-slate-900/60 ring-1 ring-slate-700">
        <canvas ref={canvasRef} />
        {score != null && (
          <div
            className="absolute right-3 top-2 rounded-md px-2 py-1 text-2xl font-bold tabular-nums"
            style={{ color: scoreColor(score) }}
          >
            {score}
          </div>
        )}
      </div>
      <div className="mt-2 flex items-center gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1">
          <span className="inline-block h-0.5 w-5" style={{ background: REF_COLOR }} />
          お手本
        </span>
        <span className="flex items-center gap-1">
          <span
            className="inline-block h-0 w-5 border-t-2 border-dashed"
            style={{ borderColor: USR_COLOR }}
          />
          自分
        </span>
        <span className="ml-auto">縦軸＝声調の高さ（セミトーン）／横軸＝時間</span>
      </div>
    </div>
  );
}
