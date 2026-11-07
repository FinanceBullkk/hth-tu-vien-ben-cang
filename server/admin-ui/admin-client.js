// Logic trang admin. Mọi chuỗi người dùng đều gán qua textContent để chống XSS.
(() => {
  const key = new URLSearchParams(location.search).get('key') || '';
  // Ẩn khoá khỏi thanh địa chỉ sau khi đã đọc, tránh lộ khi chia sẻ màn hình.
  history.replaceState(null, '', '/admin');

  const $ = (id) => document.getElementById(id);
  const statusEl = $('status');
  let statusTimer;

  function say(msg) {
    statusEl.textContent = msg;
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => { statusEl.textContent = ''; }, 4000);
  }

  async function api(path, method = 'GET', body) {
    const res = await fetch(`/admin/api${path}`, {
      method,
      headers: { 'x-admin-key': key, ...(body ? { 'content-type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Lỗi ${res.status}`);
    return data;
  }

  const run = (fn) => async (...args) => {
    try {
      await fn(...args);
    } catch (err) {
      say(err.message);
    }
  };

  function el(tag, props = {}, ...children) {
    const node = document.createElement(tag);
    Object.assign(node, props);
    for (const c of children) node.append(c);
    return node;
  }

  const lines = (v) => v.split('\n').map((s) => s.trim()).filter(Boolean);

  // Thống kê + online
  function renderStats(s) {
    const items = [
      ['Đang online', s.online], ['Lượt vào hôm nay', s.visitsToday], ['Lời ước hôm nay', s.wishesToday],
      ['Tổng lời ước', s.wishesTotal], ['Lần chuông hôm nay', s.bellsToday], ['CPU server', `${s.cpuPercent}%`],
    ];
    $('stats').replaceChildren(...items.map(([label, value]) => el('div', {}, el('b', { textContent: value }), label)));
  }

  function renderOnline(list) {
    const table = $('online');
    if (!list.length) {
      table.replaceChildren(el('tr', {}, el('td', { textContent: 'Chưa có ai trên tu viện.' })));
      return;
    }
    table.replaceChildren(...list.map((p) => {
      const btn = el('button', { textContent: 'Kích' });
      btn.onclick = run(async () => {
        if (!confirm(`Ngắt kết nối ${p.name}?`)) return;
        await api('/kick', 'POST', { playerId: p.playerId });
        say(`Đã ngắt ${p.name}.`);
        await refresh();
      });
      return el('tr', {},
        el('td', { textContent: p.name }),
        el('td', { textContent: p.connected ? 'đang kết nối' : 'mất kết nối' }),
        el('td', {}, btn));
    }));
  }

  // Lịch chuông
  let schedule = [];

  function renderSchedule() {
    const table = $('schedule');
    const head = el('tr', {}, ...['Giờ', 'Lặp', 'Ngày', 'Câu thông báo', 'Bật', ''].map((t) => el('th', { textContent: t })));
    table.replaceChildren(head, ...schedule.map((item, i) => {
      const time = el('input', { type: 'time', value: item.time || '' });
      time.oninput = () => { item.time = time.value; };
      const date = el('input', { type: 'date', value: item.date || '' });
      date.oninput = () => { item.date = date.value; };
      if (item.repeat === 'daily') date.style.display = 'none';
      const msg = el('input', { value: item.message || '', maxLength: 160, style: 'width:100%' });
      msg.oninput = () => { item.message = msg.value; };
      const enabled = el('input', { type: 'checkbox', checked: item.enabled !== false });
      enabled.onchange = () => { item.enabled = enabled.checked; };
      const del = el('button', { textContent: 'Xoá' });
      del.onclick = () => { schedule.splice(i, 1); renderSchedule(); };
      return el('tr', {},
        el('td', {}, time),
        el('td', { textContent: item.repeat === 'daily' ? 'Hằng ngày' : 'Một lần' }),
        el('td', {}, date),
        el('td', {}, msg),
        el('td', {}, enabled),
        el('td', {}, del));
    }));
  }

  const defaultMessage = '{time} cả nhà cùng thỉnh chuông — ra gác chuông nhé';
  $('addDaily').onclick = () => {
    schedule.push({ time: '12:00', repeat: 'daily', message: defaultMessage, enabled: true });
    renderSchedule();
  };
  $('addOnce').onclick = () => {
    schedule.push({ time: '17:30', repeat: 'once', date: new Date().toISOString().slice(0, 10), message: defaultMessage, enabled: true });
    renderSchedule();
  };
  $('saveSchedule').onclick = run(async () => {
    const res = await api('/schedule', 'PUT', { bellSchedule: schedule });
    schedule = res.bellSchedule;
    renderSchedule();
    say('Đã lưu lịch chuông.');
  });
  $('ringNow').onclick = run(async () => {
    const res = await api('/ring-now', 'POST', { message: $('ringMessage').value });
    say(res.ok ? `Chuông sẽ mở sau ${res.leadMs / 1000} giây.` : res.error);
  });

  // Lời ước
  const placeName = { tree: 'Cây bồ đề', pond: 'Hồ sen', container: 'Container' };

  const loadWishes = run(async () => {
    const q = encodeURIComponent($('wishQuery').value.trim());
    const { items } = await api(`/wishes?q=${q}`);
    const table = $('wishes');
    if (!items.length) {
      table.replaceChildren(el('tr', {}, el('td', { textContent: 'Không có lời ước nào.' })));
      return;
    }
    table.replaceChildren(...items.map((w) => {
      const btn = el('button', { textContent: w.hidden ? 'Bỏ ẩn' : 'Ẩn' });
      btn.onclick = run(async () => {
        await api(`/wishes/${w.id}/hidden`, 'POST', { hidden: !w.hidden });
        await loadWishes();
      });
      return el('tr', { className: w.hidden ? 'hidden-row' : '' },
        el('td', { textContent: w.author }),
        el('td', { textContent: w.text }),
        el('td', { textContent: placeName[w.place] || w.place }),
        el('td', { textContent: `❤ ${w.likes}` }),
        el('td', { textContent: new Date(w.created_at).toLocaleString('vi-VN') }),
        el('td', {}, btn));
    }));
  });
  $('wishSearch').onclick = loadWishes;
  $('wishQuery').onkeydown = (e) => { if (e.key === 'Enter') loadWishes(); };

  // Từ lọc + nội dung
  $('saveBanned').onclick = run(async () => {
    const res = await api('/banned-words', 'PUT', { bannedWords: lines($('banned').value) });
    say(`Đã lưu ${res.count} từ lọc, có hiệu lực ngay.`);
  });
  // Câu đố: mỗi dòng "câu hỏi | đáp án 1; đáp án 2 | gợi ý | bậc".
  const parseRiddles = (text) => lines(text).map((line) => {
    const [q, answers, hint, tier] = line.split('|').map((s) => s.trim());
    return {
      q,
      a: (answers || '').split(';').map((s) => s.trim()).filter(Boolean),
      hint: hint || '',
      tier: Math.min(3, Math.max(1, Number(tier) || 1)),
    };
  }).filter((r) => r.q && r.a.length);
  const formatRiddles = (list) => (list || []).map((r) => [r.q, (r.a || []).join('; '), r.hint || '', r.tier || 1].join(' | ')).join('\n');
  $('saveContent').onclick = run(async () => {
    await api('/content', 'PUT', {
      welcomeMessage: $('welcome').value,
      fortunes: lines($('fortunes').value),
      meditationPhrases: { high: lines($('medHigh').value), mid: lines($('medMid').value), low: lines($('medLow').value) },
      riddles: parseRiddles($('riddles').value),
    });
    say('Đã lưu nội dung.');
  });

  let formsFilled = false;

  async function refresh() {
    const s = await api('/state');
    renderStats(s.stats);
    renderOnline(s.online);
    if (!formsFilled) {
      formsFilled = true;
      schedule = s.bellSchedule || [];
      renderSchedule();
      $('banned').value = (s.bannedWords || []).join('\n');
      $('welcome').value = s.welcomeMessage || '';
      $('fortunes').value = (s.fortunes || []).join('\n');
      $('medHigh').value = (s.meditationPhrases?.high || []).join('\n');
      $('medMid').value = (s.meditationPhrases?.mid || []).join('\n');
      $('medLow').value = (s.meditationPhrases?.low || []).join('\n');
      $('riddles').value = formatRiddles(s.riddles);
    }
  }

  run(refresh)();
  loadWishes();
  setInterval(run(refresh), 5000);
})();
