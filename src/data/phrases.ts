// 教材（フレーズ）seed データ（§3.1）。
// 著者の入力負担は「全文・音節ごとの意味/漢字（任意）・全文の意味」だけ。
// 声調と難易度は text から自動計算（detectTone / phraseTier）。音源は {id}.mp3 を自動生成。
//
// 音節の meaning / kanji は任意。未指定なら dict.ts から補完される（SyllablePanel 参照）。
// ここでは dict と重複させず、複合語の語義は phrase.meaning に持たせている。

export interface Syllable {
  text: string; // 例: "đại"（綴りに声調が含まれる）
  meaning?: string; // 日本語の意味（辞書から補完。任意）
  kanji?: string; // 漢越語なら対応漢字。純ベトナム語は undefined
}

export interface Phrase {
  id: string; // 音声ファイル名にも使う（{id}.mp3）
  text: string; // フレーズ全文
  syllables: Syllable[]; // スペース区切りの音節（句読点は除く）
  meaning: string; // フレーズ全体の意味（máy bay 等の複合語はここで担保）
  note?: string; // 補足メモ（任意）
}

/** スペース区切りの本文から、句読点を除いた音節配列を作るヘルパー。 */
function syl(...texts: string[]): Syllable[] {
  return texts.map((t) => ({ text: t }));
}

export const PHRASES: Phrase[] = [
  // ===== 段1: ngang / huyền =====
  {
    id: 'toi',
    text: 'Tôi',
    syllables: syl('Tôi'),
    meaning: '私（一人称）',
    note: '平声（ngang）の練習。平らに保つ。',
  },
  {
    id: 'chao',
    text: 'Chào',
    syllables: syl('Chào'),
    meaning: 'やあ／こんにちは（あいさつ）',
    note: '玄声（huyền）の練習。低く下げる。',
  },
  {
    id: 'nha',
    text: 'Nhà',
    syllables: syl('Nhà'),
    meaning: '家',
  },
  {
    id: 'gia-dinh',
    text: 'Gia đình',
    syllables: syl('Gia', 'đình'),
    meaning: '家庭（漢越：家庭）',
  },
  {
    id: 'toi-la-sinh-vien',
    text: 'Tôi là sinh viên.',
    syllables: syl('Tôi', 'là', 'sinh', 'viên'),
    meaning: '私は学生です。（sinh viên＝学生／生員）',
  },

  // ===== 段2: + sắc =====
  {
    id: 'may-bay',
    text: 'Máy bay',
    syllables: syl('Máy', 'bay'),
    meaning: '飛行機（直訳：飛ぶ機械）',
    note: '鋭声（sắc）máy は高く上がる。',
  },
  {
    id: 'ca-phe',
    text: 'Tôi uống cà phê.',
    syllables: syl('Tôi', 'uống', 'cà', 'phê'),
    meaning: '私はコーヒーを飲みます。（cà phê＝コーヒー）',
  },

  // ===== 段3: + nặng =====
  {
    id: 'dai-hoc',
    text: 'Đại học',
    syllables: syl('Đại', 'học'),
    meaning: '大学（漢越：大学）',
    note: '重声（nặng）は短く詰まる。',
  },
  {
    id: 'viet-nam',
    text: 'Việt Nam',
    syllables: syl('Việt', 'Nam'),
    meaning: 'ベトナム（漢越：越南）',
  },
  {
    id: 'hoc-tieng-viet',
    text: 'Tôi học tiếng Việt.',
    syllables: syl('Tôi', 'học', 'tiếng', 'Việt'),
    meaning: '私はベトナム語を勉強します。',
  },

  // ===== 段4: + hỏi =====
  {
    id: 'cam-on',
    text: 'Cảm ơn.',
    syllables: syl('Cảm', 'ơn'),
    meaning: 'ありがとう。（漢越：感恩）',
    note: '問声（hỏi）cảm は低く沈んで戻る。',
  },
  {
    id: 'pho',
    text: 'Phở',
    syllables: syl('Phở'),
    meaning: 'フォー（米麺の料理）',
  },
  {
    id: 'ban-khoe-khong',
    text: 'Bạn khỏe không?',
    syllables: syl('Bạn', 'khỏe', 'không'),
    meaning: 'お元気ですか？',
  },

  // ===== 段5: + ngã =====
  {
    id: 'nuoc-my',
    text: 'Nước Mỹ',
    syllables: syl('Nước', 'Mỹ'),
    meaning: 'アメリカ（合衆国。Mỹ＝美）',
    note: '跳声（ngã）Mỹ はきしんで上がる（最難）。',
  },
  {
    id: 'toi-cung-vay',
    text: 'Tôi cũng vậy.',
    syllables: syl('Tôi', 'cũng', 'vậy'),
    meaning: '私も同じです。',
  },
];

export function getPhrase(id: string): Phrase | undefined {
  return PHRASES.find((p) => p.id === id);
}
