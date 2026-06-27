#!/usr/bin/env node
// TTS 生成スクリプト（§8）。
// phrases.ts の各フレーズについて、未生成なら vi-VN 音声を作り public/audio/{id}.mp3 に保存する。
//
// 使い方:
//   1) npm install @google-cloud/text-to-speech   （build-time のみ・任意の依存）
//   2) GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json node scripts/generate-tts.mjs
//
// 認証情報はフロントには絶対に埋めない（環境変数で渡す）。
// 既に存在するファイルはスキップ（差分生成）。
//
// 代替: ネイティブ録音の {id}.mp3 を public/audio/ に直接置けばスクリプト不要でそのまま動く。

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PHRASES_PATH = resolve(ROOT, 'src/data/phrases.ts');
const OUT_DIR = resolve(ROOT, 'public/audio');

/** phrases.ts から { id, text } を素朴に抽出する（id の直後に text が来る前提）。 */
function extractPhrases(source) {
  const re = /id:\s*'([^']+)'[\s\S]*?text:\s*'([^']+)'/g;
  const out = [];
  let m;
  while ((m = re.exec(source)) !== null) {
    out.push({ id: m[1], text: m[2] });
  }
  return out;
}

async function loadTtsClient() {
  try {
    const mod = await import('@google-cloud/text-to-speech');
    return new mod.TextToSpeechClient();
  } catch (err) {
    console.error(
      '\n@google-cloud/text-to-speech が見つかりません。\n' +
        '  npm install @google-cloud/text-to-speech\n' +
        'を実行し、GOOGLE_APPLICATION_CREDENTIALS を設定してください。\n',
    );
    throw err;
  }
}

/** vi-VN の Wavenet / Neural2 系から音声を 1 つ選ぶ（利用可能名は変わるので実行時に取得）。 */
async function pickVietnameseVoice(client) {
  const [{ voices }] = await client.listVoices({ languageCode: 'vi-VN' });
  if (!voices || voices.length === 0) {
    throw new Error('vi-VN の音声が利用できません。');
  }
  const score = (name) => {
    if (/Neural2/i.test(name)) return 3;
    if (/Wavenet/i.test(name)) return 2;
    if (/Standard/i.test(name)) return 1;
    return 0;
  };
  const sorted = [...voices].sort((a, b) => score(b.name) - score(a.name));
  const chosen = sorted[0];
  console.log(`使用する音声: ${chosen.name} (${chosen.ssmlGender})`);
  return chosen.name;
}

async function main() {
  if (!existsSync(PHRASES_PATH)) {
    console.error(`phrases.ts が見つかりません: ${PHRASES_PATH}`);
    process.exit(1);
  }
  mkdirSync(OUT_DIR, { recursive: true });

  const phrases = extractPhrases(readFileSync(PHRASES_PATH, 'utf8'));
  const missing = phrases.filter((p) => !existsSync(resolve(OUT_DIR, `${p.id}.mp3`)));

  console.log(`フレーズ ${phrases.length} 件 / 未生成 ${missing.length} 件`);
  if (missing.length === 0) {
    console.log('生成するものはありません。');
    return;
  }

  const client = await loadTtsClient();
  const voiceName = await pickVietnameseVoice(client);

  for (const p of missing) {
    const [res] = await client.synthesizeSpeech({
      input: { text: p.text },
      voice: { languageCode: 'vi-VN', name: voiceName },
      audioConfig: { audioEncoding: 'MP3' },
    });
    const outPath = resolve(OUT_DIR, `${p.id}.mp3`);
    writeFileSync(outPath, res.audioContent, 'binary');
    console.log(`✓ ${p.id}.mp3  「${p.text}」`);
  }
  console.log('完了。');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
