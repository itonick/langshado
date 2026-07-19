// 漢越語辞書（§3.2）。
// キーは音節（小文字・声調込みの綴り）。同じ綴りでも声調が違えば別キー。
// seed として数十語だけ入れておき、運用しながら追加する想定。
// 入手元・ライセンスは未確定なので、本番運用前に出典を確認すること（§10-2）。

export interface DictEntry {
  kanji?: string; // 対応漢字。なければ純ベトナム語
  meaning_ja: string; // 日本語の意味（複数語義は読点区切り）
}

export type Dict = Record<string, DictEntry>;

export const DICT: Dict = {
  tôi: { meaning_ja: '私（一人称）' },
  là: { meaning_ja: '〜です（コピュラ）' },
  sinh: { kanji: '生', meaning_ja: '生まれる、生' },
  viên: { kanji: '員', meaning_ja: '〜員（人）' },
  chào: { meaning_ja: 'あいさつする、やあ' },
  nhà: { meaning_ja: '家' },
  máy: { meaning_ja: '機械' },
  bay: { meaning_ja: '飛ぶ' },
  uống: { meaning_ja: '飲む' },
  cà: { meaning_ja: '（cà phê＝コーヒー）' },
  phê: { meaning_ja: '（cà phê＝コーヒー）' },
  đại: { kanji: '大', meaning_ja: '大きい' },
  học: { kanji: '学', meaning_ja: '学ぶ' },
  tiếng: { meaning_ja: '音、言語、声' },
  việt: { kanji: '越', meaning_ja: 'ベトナム（越）' },
  nam: { kanji: '南', meaning_ja: '南' },
  cảm: { kanji: '感', meaning_ja: '感じる' },
  ơn: { kanji: '恩', meaning_ja: '恩、恵み' },
  khỏe: { meaning_ja: '健康な、元気な' },
  không: { meaning_ja: '〜か（疑問）／ない、ゼロ' },
  bạn: { meaning_ja: '友だち、あなた' },
  phở: { meaning_ja: 'フォー（米麺の料理）' },
  cũng: { meaning_ja: '〜も、同じく' },
  vậy: { meaning_ja: 'そう、そのように' },
  nước: { meaning_ja: '水、国' },
  mỹ: { kanji: '美', meaning_ja: 'アメリカ（美）、美しい' },
  gia: { kanji: '家', meaning_ja: '家、〜家' },
  đình: { kanji: '庭', meaning_ja: '（gia đình＝家庭）' },
  // ---- 運用追加用の一般語 ----
  ăn: { meaning_ja: '食べる' },
  cơm: { meaning_ja: 'ご飯' },
  người: { meaning_ja: '人' },
  nói: { meaning_ja: '話す' },
  yêu: { meaning_ja: '愛する' },
  quốc: { kanji: '国', meaning_ja: '国' },
  thành: { kanji: '城', meaning_ja: '成る、（thành phố＝都市）' },
  phố: { meaning_ja: '街、通り' },
  // ---- 例文由来の追加音節（Issue #5） ----
  đến: { meaning_ja: '来る、到着する、〜へ' },
  từ: { meaning_ja: '〜から' },
  nhật: { kanji: '日', meaning_ja: '日（Nhật Bản＝日本）' },
  bản: { kanji: '本', meaning_ja: '本、版（Nhật Bản＝日本）' },
  tên: { meaning_ja: '名前' },
  buổi: { meaning_ja: '（時間帯を表す）〜のとき（buổi sáng＝朝）' },
  sáng: { meaning_ja: '明るい、朝（buổi sáng＝朝）' },
  tạm: { kanji: '暫', meaning_ja: '一時的な、仮の（tạm biệt＝さようなら）' },
  biệt: { kanji: '別', meaning_ja: '別れる（tạm biệt＝さようなら）' },
  ở: { meaning_ja: '〜に（いる、ある）、住む' },
  đâu: { meaning_ja: 'どこ' },
  có: { meaning_ja: 'ある、持つ、いる' },
  bốn: { meaning_ja: '四（4）' },
  năm: { meaning_ja: '年、五（5）' },
  nhất: { kanji: '一', meaning_ja: '一、第一の（năm nhất＝1年生）' },
  đi: { meaning_ja: '行く' },
  bằng: { meaning_ja: '〜で（手段）、〜によって' },
  vé: { meaning_ja: 'チケット、切符' },
  bao: { meaning_ja: '（bao nhiêu＝いくら、どれだけ）' },
  nhiêu: { meaning_ja: '（bao nhiêu＝いくら、どれだけ）' },
  tiền: { kanji: '銭', meaning_ja: 'お金' },
  cho: { meaning_ja: '与える、〜に、〜ください' },
  một: { meaning_ja: '一（1）' },
  sữa: { meaning_ja: 'ミルク、乳' },
  trường: { kanji: '場', meaning_ja: '学校（trường học＝学校）' },
  muốn: { meaning_ja: '〜したい、欲する' },
  mỗi: { meaning_ja: '各、〜ごと（mỗi ngày＝毎日）' },
  ngày: { meaning_ja: '日（にち）' },
  rất: { meaning_ja: 'とても、非常に' },
  nhiều: { meaning_ja: '多い、たくさん（rất nhiều＝たくさん）' },
  gì: { meaning_ja: '何' },
  đây: { meaning_ja: 'ここ、これ' },
  ngon: { meaning_ja: 'おいしい' },
  lắm: { meaning_ja: 'とても、非常に' },
  anh: { meaning_ja: '兄、あなた（年上の男性。anh ấy＝彼）' },
  ấy: { meaning_ja: 'その、あの（anh ấy＝彼）' },
  sống: { meaning_ja: '生きる、住む' },
  nghĩ: { meaning_ja: '思う、考える' },
};

/**
 * 音節から辞書エントリを引く。末尾の句読点を落として小文字化し、
 * NFC 正規化してキーと突き合わせる。
 */
export function lookupDict(syllable: string): DictEntry | undefined {
  const key = syllable
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:"'…）)（(]/g, '')
    .normalize('NFC');
  return DICT[key];
}
