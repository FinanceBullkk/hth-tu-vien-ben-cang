// Lọc từ thô tiếng Việt, có phân biệt dấu để không chặn nhầm "lớn", "các", "lon bia".
//
// Nguyên tắc: từ cấm có dấu chỉ khớp đúng từ có dấu đó; từ cấm không dấu chỉ khớp
// tiếng không dấu trong câu. Vì vậy "lớn" không bao giờ bị coi là "lon".

const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't' };

/** Chuẩn hoá: chữ thường, NFC. Chữ có dấu giữ nguyên. */
function normalize(text) {
  return String(text).normalize('NFC').toLowerCase();
}

/** Biến thể đổi số thành chữ, chỉ dùng cho câu người chơi gõ: "fvck" giữ nguyên, "sh1t" -> "shit". */
function unleet(tok) {
  return tok.replace(/[013457]/g, (c) => LEET[c]);
}

/** Tách từ theo chữ cái Unicode, ghép các chữ cái đơn lẻ liền nhau ("d.m", "v c l"). */
function tokenize(text) {
  const raw = normalize(text).match(/[\p{L}\p{N}]+/gu) || [];
  const out = [];
  let glue = '';
  for (const tok of raw) {
    if ([...tok].length === 1) {
      glue += tok;
      continue;
    }
    if (glue) {
      out.push(glue);
      glue = '';
    }
    out.push(tok);
  }
  if (glue) out.push(glue);
  return out;
}

/** Gộp chữ lặp: "dmmm" -> "dm", "đụụụ" -> "đụ". */
function collapse(tok) {
  return tok.replace(/(\p{L})\1+/gu, '$1');
}

export class WordFilter {
  constructor(words = []) {
    this.setWords(words);
  }

  setWords(words) {
    this.single = new Set();
    this.phrases = [];
    for (const w of words) {
      const toks = normalize(w).match(/[\p{L}\p{N}]+/gu);
      if (!toks) continue;
      if (toks.length === 1) this.single.add(toks[0]);
      else this.phrases.push(toks);
    }
  }

  /** Trả về true nếu chuỗi chứa từ cấm. */
  isBad(text) {
    const toks = tokenize(text);
    const variants = (t) => [t, collapse(t), unleet(t), collapse(unleet(t))];
    if (toks.some((t) => variants(t).some((v) => this.single.has(v)))) return true;
    for (const phrase of this.phrases) {
      for (let i = 0; i + phrase.length <= toks.length; i++) {
        let hit = true;
        for (let j = 0; j < phrase.length; j++) {
          if (!variants(toks[i + j]).includes(phrase[j])) {
            hit = false;
            break;
          }
        }
        if (hit) return true;
      }
    }
    return false;
  }
}

/** Làm sạch chuỗi người dùng: bỏ ký tự điều khiển, gộp khoảng trắng. */
export function cleanText(value, max) {
  if (typeof value !== 'string') return '';
  const s = value
    .normalize('NFC')
    .replace(/[\u0000-\u001F\u007F​-‏‪-‮⁦-⁩]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return [...s].slice(0, max).join('').trim();
}
