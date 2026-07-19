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
  tier?: number; // ステップ番号の明示値（省略時は声調から自動判定）
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
    tier: 6,
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
    tier: 7,
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
    tier: 8,
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
    tier: 9,
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
    tier: 10,
  },
];

/** 関連例文。parentId でどのフレーズに紐付くかを示す。 */
export interface ExampleSentence extends Phrase {
  parentId: string;
}

export const EXAMPLE_SENTENCES: ExampleSentence[] = [
  // ===== toi =====
  {
    id: 'toi-ex1',
    parentId: 'toi',
    text: 'Tôi đến từ Nhật Bản.',
    syllables: syl('Tôi', 'đến', 'từ', 'Nhật', 'Bản'),
    meaning: '私は日本から来ました。',
  },
  {
    id: 'toi-ex2',
    parentId: 'toi',
    text: 'Tên tôi là Hana.',
    syllables: syl('Tên', 'tôi', 'là', 'Hana'),
    meaning: '私の名前はHanaです。',
  },

  // ===== chao =====
  {
    id: 'chao-ex1',
    parentId: 'chao',
    text: 'Chào buổi sáng!',
    syllables: syl('Chào', 'buổi', 'sáng'),
    meaning: 'おはようございます！',
  },
  {
    id: 'chao-ex2',
    parentId: 'chao',
    text: 'Chào tạm biệt!',
    syllables: syl('Chào', 'tạm', 'biệt'),
    meaning: 'さようなら！',
  },

  // ===== nha =====
  {
    id: 'nha-ex1',
    parentId: 'nha',
    text: 'Nhà bạn ở đâu?',
    syllables: syl('Nhà', 'bạn', 'ở', 'đâu'),
    meaning: 'あなたの家はどこですか？',
  },

  // ===== gia-dinh =====
  {
    id: 'gia-dinh-ex1',
    parentId: 'gia-dinh',
    text: 'Gia đình tôi có bốn người.',
    syllables: syl('Gia', 'đình', 'tôi', 'có', 'bốn', 'người'),
    meaning: '私の家族は4人です。',
  },

  // ===== toi-la-sinh-vien =====
  {
    id: 'toi-la-sinh-vien-ex1',
    parentId: 'toi-la-sinh-vien',
    text: 'Tôi là sinh viên năm nhất.',
    syllables: syl('Tôi', 'là', 'sinh', 'viên', 'năm', 'nhất'),
    meaning: '私は1年生です。',
  },

  // ===== may-bay =====
  {
    id: 'may-bay-ex1',
    parentId: 'may-bay',
    text: 'Tôi đi bằng máy bay.',
    syllables: syl('Tôi', 'đi', 'bằng', 'máy', 'bay'),
    meaning: '私は飛行機で行きます。',
  },
  {
    id: 'may-bay-ex2',
    parentId: 'may-bay',
    text: 'Vé máy bay bao nhiêu tiền?',
    syllables: syl('Vé', 'máy', 'bay', 'bao', 'nhiêu', 'tiền'),
    meaning: '飛行機のチケットはいくらですか？',
  },

  // ===== ca-phe =====
  {
    id: 'ca-phe-ex1',
    parentId: 'ca-phe',
    text: 'Cho tôi một cà phê sữa.',
    syllables: syl('Cho', 'tôi', 'một', 'cà', 'phê', 'sữa'),
    meaning: 'カフェオレを一杯ください。',
  },

  // ===== dai-hoc =====
  {
    id: 'dai-hoc-ex1',
    parentId: 'dai-hoc',
    text: 'Trường đại học ở đâu?',
    syllables: syl('Trường', 'đại', 'học', 'ở', 'đâu'),
    meaning: '大学はどこですか？',
  },

  // ===== viet-nam =====
  {
    id: 'viet-nam-ex1',
    parentId: 'viet-nam',
    text: 'Tôi muốn đến Việt Nam.',
    syllables: syl('Tôi', 'muốn', 'đến', 'Việt', 'Nam'),
    meaning: '私はベトナムに行きたいです。',
  },

  // ===== hoc-tieng-viet =====
  {
    id: 'hoc-tieng-viet-ex1',
    parentId: 'hoc-tieng-viet',
    text: 'Tôi học tiếng Việt mỗi ngày.',
    syllables: syl('Tôi', 'học', 'tiếng', 'Việt', 'mỗi', 'ngày'),
    meaning: '私は毎日ベトナム語を勉強します。',
  },

  // ===== cam-on =====
  {
    id: 'cam-on-ex1',
    parentId: 'cam-on',
    text: 'Cảm ơn rất nhiều!',
    syllables: syl('Cảm', 'ơn', 'rất', 'nhiều'),
    meaning: 'どうもありがとうございます！',
  },
  {
    id: 'cam-on-ex2',
    parentId: 'cam-on',
    text: 'Không có gì.',
    syllables: syl('Không', 'có', 'gì'),
    meaning: 'どういたしまして。（直訳：何もない）',
  },

  // ===== pho =====
  {
    id: 'pho-ex1',
    parentId: 'pho',
    text: 'Tôi muốn ăn phở.',
    syllables: syl('Tôi', 'muốn', 'ăn', 'phở'),
    meaning: '私はフォーを食べたいです。',
  },
  {
    id: 'pho-ex2',
    parentId: 'pho',
    text: 'Phở ở đây ngon lắm!',
    syllables: syl('Phở', 'ở', 'đây', 'ngon', 'lắm'),
    meaning: 'ここのフォーはとても美味しい！',
  },

  // ===== ban-khoe-khong =====
  {
    id: 'ban-khoe-khong-ex1',
    parentId: 'ban-khoe-khong',
    text: 'Tôi khỏe, cảm ơn bạn.',
    syllables: syl('Tôi', 'khỏe', 'cảm', 'ơn', 'bạn'),
    meaning: '元気です、ありがとう。',
  },

  // ===== nuoc-my =====
  {
    id: 'nuoc-my-ex1',
    parentId: 'nuoc-my',
    text: 'Anh ấy sống ở Nước Mỹ.',
    syllables: syl('Anh', 'ấy', 'sống', 'ở', 'Nước', 'Mỹ'),
    meaning: '彼はアメリカに住んでいます。',
  },

  // ===== toi-cung-vay =====
  {
    id: 'toi-cung-vay-ex1',
    parentId: 'toi-cung-vay',
    text: 'Tôi cũng nghĩ vậy.',
    syllables: syl('Tôi', 'cũng', 'nghĩ', 'vậy'),
    meaning: '私もそう思います。',
  },
];

export function getPhrase(id: string): Phrase | undefined {
  return PHRASES.find((p) => p.id === id) ?? EXAMPLE_SENTENCES.find((e) => e.id === id);
}

export function getExamples(phraseId: string): ExampleSentence[] {
  return EXAMPLE_SENTENCES.filter((e) => e.parentId === phraseId);
}
