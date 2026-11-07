// Tiện ích giờ theo múi giờ cấu hình: ngày địa phương, đổi HH:MM sang timestamp.

const fmtCache = new Map();

function formatter(tz) {
  let f = fmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
    fmtCache.set(tz, f);
  }
  return f;
}

function parts(ts, tz) {
  const out = {};
  for (const p of formatter(tz).formatToParts(new Date(ts))) out[p.type] = p.value;
  return out;
}

/** Ngày địa phương dạng YYYY-MM-DD. */
export function localDate(ts, tz) {
  const p = parts(ts, tz);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Thứ Hai của tuần chứa ts (theo ngày địa phương), dạng YYYY-MM-DD — mốc bảng tuần. */
export function localWeekStart(ts, tz) {
  const p = parts(ts, tz);
  const weekday = (new Date(Date.UTC(+p.year, +p.month - 1, +p.day)).getUTCDay() + 6) % 7;
  const monday = new Date(Date.UTC(+p.year, +p.month - 1, +p.day - weekday));
  const iso = monday.toISOString().slice(0, 10);
  return iso;
}

export function localHour(ts, tz) {
  return Number(parts(ts, tz).hour);
}

/** Đổi ngày + HH:MM địa phương thành timestamp UTC. */
export function zonedToTs(dateStr, hm, tz) {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const [h, mi] = hm.split(':').map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const p = parts(guess, tz);
  const asIfUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return guess - (asIfUtc - guess);
}

/** Buổi trong ngày, dùng cho câu kết quả sự kiện chuông. */
export function partOfDay(ts, tz) {
  const h = localHour(ts, tz);
  if (h < 11) return 'sáng nay';
  if (h < 14) return 'trưa nay';
  if (h < 18) return 'chiều nay';
  return 'tối nay';
}
