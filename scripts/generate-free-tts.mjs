#!/usr/bin/env node
// 無料 TTS 生成スクリプト（Google 翻訳 TTS 非公式エンドポイント使用）。
// APIキー・認証情報は不要。Node 18 以上の fetch で動く。
//
// 使い方:
//   node scripts/generate-free-tts.mjs          # 未生成のみ
//   node scripts/generate-free-tts.mjs --force  # 既存も上書き
//
// ⚠ 非公式 API のため将来変更される可能性がある。
//   品質は Google Cloud TTS（generate-tts.mjs）より低いが認証不要。
//   商用利用・大量リクエストには generate-tts.mjs を使うこと。

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PHRASES_PATH = resolve(ROOT, 'src/data/phrases.ts');
const OUT_DIR = resolve(ROOT, 'public/audio');
const FORCE = process.argv.includes('--force');

/** phrases.ts から { id, text } を抽出する。 */
function extractPhrases(source) {
  const re = /id:\s*'([^']+)'[\s\S]*?text:\s*'([^']+)'/g;
  const out = [];
  let m;
  while ((m = re.exec(source)) !== null) {
    out.push({ id: m[1], text: m[2] });
  }
  return out;
}

/**
 * Google 翻訳 TTS エンドポイントから vi-VN の音声 MP3 を取得する。
 * client=gtx は公開ページ（translate.google.com）が使う非公式パラメータ。
 * 句読点込みテキストをそのまま渡してよい。
 */
async function fetchTts(text) {
  const url =
    'https://translate.googleapis.com/translate_tts' +
    '?ie=UTF-8' +
    `&q=${encodeURIComponent(text)}` +
    '&tl=vi' +
    '&client=gtx' +
    '&ttsspeed=0.9'; // 0.5–1.0。0.9 は自然なスピード

  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Referer: 'https://translate.google.com/',
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} (${text})`);
  }

  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('audio')) {
    throw new Error(`予期しない Content-Type: ${contentType}`);
  }

  return Buffer.from(await res.arrayBuffer());
}

/** ms ミリ秒待つ。レートリミット対策。 */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  if (!existsSync(PHRASES_PATH)) {
    console.error(`phrases.ts が見つかりません: ${PHRASES_PATH}`);
    process.exit(1);
  }
  mkdirSync(OUT_DIR, { recursive: true });

  const phrases = extractPhrases(readFileSync(PHRASES_PATH, 'utf8'));
  const targets = phrases.filter((p) => FORCE || !existsSync(resolve(OUT_DIR, `${p.id}.mp3`)));

  console.log(`フレーズ ${phrases.length} 件 / 生成対象 ${targets.length} 件`);
  if (targets.length === 0) {
    console.log('生成するものはありません。--force で上書きできます。');
    return;
  }

  let ok = 0;
  let ng = 0;

  for (const p of targets) {
    try {
      const audio = await fetchTts(p.text);
      const outPath = resolve(OUT_DIR, `${p.id}.mp3`);
      writeFileSync(outPath, audio);
      console.log(`✓ ${p.id}.mp3  「${p.text}」（${audio.length} bytes）`);
      ok++;
    } catch (err) {
      console.error(`✗ ${p.id}  ${err.message}`);
      ng++;
    }
    // レートリミット対策：各リクエストの間に少し待つ
    if (targets.indexOf(p) < targets.length - 1) await sleep(600);
  }

  console.log(`\n完了: 成功 ${ok} / 失敗 ${ng} / 全 ${phrases.length} 件`);
  if (ng > 0) {
    console.log('失敗したフレーズは再度実行するか、手動で mp3 を配置してください。');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
