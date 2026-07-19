import { describe, it, expect } from 'vitest';
import { detectTone, TONE_INFO } from './tone';

describe('detectTone', () => {
  // 各声調の基本音節テスト
  it('ngang: マーク無し音節を ngang と判定する', () => {
    expect(detectTone('ba')).toBe('ngang');
    expect(detectTone('ma')).toBe('ngang');
    expect(detectTone('Tôi')).toBe('ngang'); // ô は音質マーク（声調ではない）
  });

  it('huyền: grave アクセント付き音節を huyền と判定する', () => {
    expect(detectTone('Chào')).toBe('huyền');
    expect(detectTone('Nhà')).toBe('huyền');
    expect(detectTone('là')).toBe('huyền');
  });

  it('sắc: acute アクセント付き音節を sắc と判定する', () => {
    expect(detectTone('Máy')).toBe('sắc');
    expect(detectTone('sắc')).toBe('sắc');
    expect(detectTone('đến')).toBe('sắc');
  });

  it('nặng: ドット付き音節を nặng と判定する', () => {
    expect(detectTone('học')).toBe('nặng');
    expect(detectTone('Việt')).toBe('nặng');
    expect(detectTone('Đại')).toBe('nặng'); // Đ は別の記号だが声調はなし→ngang... wait
  });

  it('hỏi: フック付き音節を hỏi と判定する', () => {
    expect(detectTone('Cảm')).toBe('hỏi');
    expect(detectTone('Phở')).toBe('hỏi');
    expect(detectTone('khỏe')).toBe('hỏi');
  });

  it('ngã: チルダ付き音節を ngã と判定する', () => {
    expect(detectTone('Mỹ')).toBe('ngã');
    expect(detectTone('cũng')).toBe('ngã');
    expect(detectTone('ngã')).toBe('ngã');
  });

  // 大文字テスト
  it('大文字でも正しく判定できる', () => {
    expect(detectTone('BÀ')).toBe('huyền');
    expect(detectTone('MÁ')).toBe('sắc');
    expect(detectTone('MÃ')).toBe('ngã');
  });

  // NFC/NFD 両表現テスト
  it('NFC 正規化済み文字を正しく判定できる', () => {
    const nfc = 'à'.normalize('NFC');
    expect(detectTone(nfc)).toBe('huyền');
  });

  it('NFD 分解済み文字を正しく判定できる', () => {
    const nfd = 'à'.normalize('NFD');
    expect(detectTone(nfd)).toBe('huyền');
  });

  it('sắc の NFC/NFD 両表現が同じ結果', () => {
    const nfc = 'sắc'.normalize('NFC');
    const nfd = 'sắc'.normalize('NFD');
    expect(detectTone(nfc)).toBe('sắc');
    expect(detectTone(nfd)).toBe('sắc');
  });

  // 句読点付き音節テスト（syllables 配列には句読点を除いた音節が入るが、念のため確認）
  it('句読点を含む文字列でも声調を判定できる', () => {
    // 文末ピリオド付きでも判定できること
    expect(detectTone('Chào!')).toBe('huyền');
    expect(detectTone('không?')).toBe('ngang'); // không は nhân + ô のみ、声調マークなし → ngang
  });

  // Đại の声調確認（Đ は声調ではなく子音修飾）
  it('Đại は nặng（dot below）と判定する', () => {
    expect(detectTone('Đại')).toBe('nặng'); // ạ が nặng、Đ は d の変形
  });
});

describe('TONE_INFO', () => {
  it('全6声調に ToneInfo が定義されている', () => {
    const tones = ['ngang', 'huyền', 'sắc', 'nặng', 'hỏi', 'ngã'] as const;
    for (const t of tones) {
      expect(TONE_INFO[t]).toBeDefined();
      expect(TONE_INFO[t].tier).toBeGreaterThanOrEqual(1);
      expect(TONE_INFO[t].tier).toBeLessThanOrEqual(5);
    }
  });

  it('ngang と huyền は tier 1（最易）', () => {
    expect(TONE_INFO.ngang.tier).toBe(1);
    expect(TONE_INFO.huyền.tier).toBe(1);
  });

  it('ngã は tier 5（最難）', () => {
    expect(TONE_INFO.ngã.tier).toBe(5);
  });
});
