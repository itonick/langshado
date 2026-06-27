# ベトナム語シャドーイング Web アプリ（shadowing-vi）

覚えたいベトナム語のフレーズを **TTS で音声化し、お手本のピッチ（声調）に自分の声を重ねて練習する** シャドーイングアプリ。
北部（ハノイ）方言・6 声調。発音練習と同時に、各音節の **意味・漢越語（Hán-Việt）の対応漢字** を確認でき、ブックマークと SRS で復習を回す。

**目玉機能＝声調ピッチの重ね表示。** ここが技術的な核であり、レベルアップの合否判定にも使う。

> 設計の大前提：単一ユーザー・認証なし・サーバーなし（例外：ビルド時に音声を生成する Node スクリプトのみ）。
> 音声処理・ピッチ検出はすべてブラウザ内（Web Audio API）で完結し、データは IndexedDB にローカル保存される。
> **イヤホン必須**（スピーカー音をマイクが拾うとピッチ検出が乱れるため）。

---

## クイックスタート

```bash
npm install
npm run dev        # 開発サーバ（http://localhost:5173）
npm run build      # 型チェック＋本番ビルド（dist/）
npm run preview    # ビルド結果をプレビュー
```

ブラウザで開いたら、フレーズを選び **録音 → 停止** で、お手本と自分のピッチが重ねて表示されスコアが出ます。
**マイクとイヤホンが必要です。** 初回はマイク許可を求められます。

### お手本音源の用意（重要）

スコア比較には各フレーズの **お手本音源 `public/audio/{phraseId}.mp3`** が必要です。2 通り：

1. **TTS で自動生成（§8）**
   ```bash
   npm install @google-cloud/text-to-speech            # build-time のみの任意依存
   export GOOGLE_APPLICATION_CREDENTIALS=/path/key.json # 認証はフロントに埋めない
   npm run tts                                          # 未生成のフレーズだけ vi-VN で生成
   ```
2. **自前録音**：ネイティブ等が録音した `{phraseId}.mp3` を `public/audio/` に直接置く（音質は最良）。

音源が無いフレーズでも、録音と自分のピッチ表示は動きます（重ね比較・スコアのみお手本が必要）。

---

## 仕組み（コアロジック）

| 機能 | 実装 | 概要 |
|---|---|---|
| 声調の自動判定 | `src/lib/tone.ts` | 綴りを NFD 正規化し結合文字（声調マーク）を検出。難易度は持たず `text` から自動計算。 |
| ピッチ抽出・正規化 | `src/audio/pitch.ts` | pitchfinder(YIN) で F0 → 有声フレーム抽出 → **自分の中央値基準でセミトーン化**（話者の絶対音高に非依存）→ 時間 0–1 正規化。お手本 mp3 もブラウザ内で同じ関数にかける。 |
| 類似度スコア | `src/audio/score.ts` | リサンプル → **DTW（動的時間伸縮）** で時間整合 → 0–100。`D_MAX` で感度調整。 |
| 録音・ライブ F0 | `src/audio/recorder.ts` | `MediaRecorder` で blob、同じ stream を `AnalyserNode`＋YIN でタップして録音中に F0 を逐次蓄積。 |
| 再生 | `src/audio/player.ts` | 速度変更（0.5–1.5×）・A/B 区間ループ・音節の単独再生（総尺の等分で近似）。 |
| ピッチ重ね描画 | `src/components/PitchOverlay.tsx` | canvas にお手本＝実線・自分＝破線、x＝時間/ y＝セミトーン、音節の縦補助線、スコアを色分け表示。 |

> **割り切り**：スコアは **声調・抑揚の輪郭** を見るもので、子音・母音の正しさは見ない。
> 「声調の形が合っている」という物差し（ベトナム語では声調が勝負の大部分）。

## レベルアップ（独立した 3 つの歯車）

1. **声調の難易度ラダー** (`src/lib/progression.ts`)：北部 6 声調を段階導入。フレーズ難易度＝含む音節の声調のうち最も後段。前段クリアで次段解放。
   段1 `ngang/huyền` → 段2 `+sắc` → 段3 `+nặng` → 段4 `+hỏi` → 段5 `+ngã`（hỏi/ngã の聞き分けが最難なので最後）。
2. **習熟ゲート**：ピッチ一致 `score >= PASS_SCORE`(75) を `PASS_COUNT`(3) 回満たすと `mastered`。段の全フレーズが mastered で次段解放。
3. **SRS** (`src/lib/srs.ts`)：SM-2。mastered フレーズ／ブックマークした音節を復習キュー（`ReviewView`）に提示。

定数は `src/lib/config.ts`（`PASS_SCORE` / `PASS_COUNT` / `D_MAX` など）で一括調整。

## ブックマークと SRS の住み分け（§6）
- **SRS**＝「いつ復習するか」を自動提示。
- **ブックマーク**＝「今すぐ見たいもの」を手で印付け（フレーズ＝また練習／音節＝語を覚え直す）。
- 別物として保持し、同一視しない。

## 画面
- **HomeView**：声調ラダー（ロック/解放/習得）、ストリーク、デイリーゴール、今日の SRS 期限。
- **PracticeView**：お手本再生（速度/A-B ループ）→ 表示トグル（テキスト/和訳/意味ルビ）→ 音節タップで意味・漢字・声調・単独再生 → 録音 → ピッチ重ね＋スコア → 比較再生 → ブックマーク。
- **ReviewView**：SRS 期限一覧＋ブックマーク（フレーズ/音節）。

---

## データの追加

- **フレーズ**：`src/data/phrases.ts` の `PHRASES` に追記（全文・音節・全文の意味だけ。声調と難易度は自動計算）。追加後 `npm run tts` で音源生成。
- **漢越語辞書**：`src/data/dict.ts` の `DICT` に追記（キーは声調込みの音節綴り・小文字）。
  出典・ライセンスは運用前に要確認。

## ローカル保存（IndexedDB）
`recordings` / `progress` / `bookmarks` / `srs` / `meta` を `src/lib/db.ts`（idb）で管理。
リロードしても録音・進捗・ブックマーク・ストリークは保持されます。

## 技術スタック
Vite + React + TypeScript / Tailwind CSS / Web Audio API / pitchfinder(YIN) / 自前 DTW / idb（IndexedDB） /
Google Cloud TTS（ビルド時・任意）。

## プロジェクト構成
```
src/
  audio/   pitch.ts score.ts recorder.ts player.ts
  lib/     tone.ts db.ts srs.ts progression.ts config.ts
  data/    phrases.ts dict.ts
  components/ PitchOverlay.tsx Player.tsx SyllableText.tsx SyllablePanel.tsx
              PracticeView.tsx ReviewView.tsx HomeView.tsx
  store.tsx App.tsx main.tsx
scripts/   generate-tts.mjs
public/audio/   {phraseId}.mp3
```
