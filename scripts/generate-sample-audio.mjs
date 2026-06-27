#!/usr/bin/env node
// 動作確認用の「擬似お手本音源」を生成する（依存なし・オフライン）。
//
// 目的: TTS の鍵やネイティブ録音が無くても、ピッチ重ね表示・スコア・進行管理を
//       すぐ試せるようにする。各フレーズの各音節の声調から、北部方言を簡略化した
//       ピッチ輪郭を合成して public/audio/{id}.mp3（中身は WAV）に出力する。
//
//   ⚠ これは合成音であり「発音のお手本」ではない。声調の“形”だけを近似したもの。
//      実運用では scripts/generate-tts.mjs か自前録音の mp3 に差し替えること。
//
// 使い方:
//   node scripts/generate-sample-audio.mjs          # 未生成のみ
//   node scripts/generate-sample-audio.mjs --force  # 既存も上書き

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PHRASES_PATH = resolve(ROOT, 'src/data/phrases.ts');
const OUT_DIR = resolve(ROOT, 'public/audio');
const FORCE = process.argv.includes('--force');

const SAMPLE_RATE = 44100;
const BASE_F0 = 130; // 基準周波数（正規化されるので絶対値は重要でない）

// 声調 → セミトーン輪郭（0–1 の正規化時間での制御点）。tone.ts と対応。
const TONE_MARKS = { '̀': 'huyen', '́': 'sac', '̃': 'nga', '̉': 'hoi', '̣': 'nang' };
const CONTOURS = {
  ngang: [[0, 0], [1, 0.3]], // 平らな中音
  huyen: [[0, -2], [1, -5]], // 低く下がる
  sac: [[0, 0], [1, 5]], // 高く上がる
  nang: [[0, -2], [0.6, -6]], // 短く詰まる（短め）
  hoi: [[0, 0], [0.5, -4], [1, -1]], // 低く沈んで戻る
  nga: [[0, -1], [0.45, -4], [0.55, -1], [1, 5]], // きしんで上がる
};
const DURATION = { ngang: 0.45, huyen: 0.5, sac: 0.45, nang: 0.3, hoi: 0.55, nga: 0.55 };

function detectTone(syllable) {
  for (const ch of syllable.normalize('NFD')) if (ch in TONE_MARKS) return TONE_MARKS[ch];
  return 'ngang';
}

function extractPhrases(source) {
  // 各フレーズの { id, syllables: [...] } を抽出する。
  const blocks = source.split(/\bid:\s*'/).slice(1);
  const out = [];
  for (const b of blocks) {
    const id = b.slice(0, b.indexOf("'"));
    const sylMatch = b.match(/syl\(([^)]*)\)/);
    if (!sylMatch) continue;
    const syllables = [...sylMatch[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
    if (id && syllables.length) out.push({ id, syllables });
  }
  return out;
}

function interpST(contour, t) {
  for (let i = 0; i < contour.length - 1; i++) {
    const [t0, v0] = contour[i];
    const [t1, v1] = contour[i + 1];
    if (t <= t1) {
      const f = t1 === t0 ? 0 : (t - t0) / (t1 - t0);
      return v0 + (v1 - v0) * f;
    }
  }
  return contour[contour.length - 1][1];
}

function synthPhrase(syllables) {
  const gap = 0.08;
  const samples = [];
  let phase = 0;
  for (let s = 0; s < syllables.length; s++) {
    const tone = detectTone(syllables[s]);
    const dur = DURATION[tone] ?? 0.45;
    const contour = CONTOURS[tone] ?? CONTOURS.ngang;
    const n = Math.floor(SAMPLE_RATE * dur);
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const st = interpST(contour, t);
      const freq = BASE_F0 * Math.pow(2, st / 12);
      phase += (2 * Math.PI * freq) / SAMPLE_RATE;
      const env = Math.min(1, t * 8) * Math.min(1, (1 - t) * 8);
      samples.push(0.55 * env * Math.sin(phase));
    }
    if (s < syllables.length - 1) for (let i = 0; i < Math.floor(SAMPLE_RATE * gap); i++) samples.push(0);
  }
  return Float32Array.from(samples);
}

function toWav(samples) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(SAMPLE_RATE, 24);
  buf.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE((v * 32767) | 0, 44 + i * 2);
  }
  return buf;
}

function main() {
  if (!existsSync(PHRASES_PATH)) {
    console.error(`phrases.ts が見つかりません: ${PHRASES_PATH}`);
    process.exit(1);
  }
  mkdirSync(OUT_DIR, { recursive: true });
  const phrases = extractPhrases(readFileSync(PHRASES_PATH, 'utf8'));
  let wrote = 0;
  for (const p of phrases) {
    const out = resolve(OUT_DIR, `${p.id}.mp3`);
    if (!FORCE && existsSync(out)) continue;
    writeFileSync(out, toWav(synthPhrase(p.syllables)));
    wrote++;
    console.log(`✓ ${p.id}.mp3  [${p.syllables.map((s) => `${s}:${detectTone(s)}`).join(' ')}]`);
  }
  console.log(`\n生成 ${wrote} 件 / 全 ${phrases.length} 件。`);
  console.log('⚠ これは声調の形だけを近似した合成音です。発音の手本ではありません。');
}

main();
