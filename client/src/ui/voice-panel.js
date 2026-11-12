import { h, store } from './dom.js';

export function voicePanel(voice) {
  const toggle = h('button', { type: 'button', class: 'icon-btn', 'aria-pressed': 'false' }, 'Bật voice');
  const mode = h('select', { 'aria-label': 'Chế độ mic' },
    h('option', { value: 'ptt' }, 'Giữ để nói'), h('option', { value: 'open' }, 'Mic mở'));
  const talk = h('button', { type: 'button', class: 'icon-btn voice-talk', 'aria-pressed': 'false' }, 'Giữ để nói · V');
  const deafen = h('button', { type: 'button', class: 'icon-btn', 'aria-pressed': 'false' }, 'Tắt nghe');
  const volume = h('input', { type: 'range', min: 0, max: 100, value: voice.volume * 100, 'aria-label': 'Âm lượng voice' });
  const status = h('p', { class: 'voice-status', role: 'status' }, 'Voice tắt · nghe người trong 18 m');
  const test = h('button', { type: 'button', class: 'icon-btn', title: 'Thu 3 giây rồi nghe lại trên máy bạn' }, 'Thử mic');
  const controls = h('div', { class: 'voice-controls', hidden: true }, mode, talk, deafen,
    h('label', {}, 'Tiếng ', volume));
  const slash = h('span', { class: 'voice-slash' });
  const mic = h('button', { type: 'button', class: 'voice-mic', 'aria-label': 'Bật mic', 'aria-pressed': 'false', title: 'Bật mic' },
    h('span', { class: 'voice-glyph', 'aria-hidden': 'true' }, slash));
  const speakers = h('div', { class: 'voice-speakers', role: 'status', 'aria-live': 'polite', hidden: true });
  const trigger = h('summary', { class: 'voice-trigger', 'aria-label': 'Cài đặt voice', title: 'Cài đặt voice' }, '⋯');
  const settings = h('div', { class: 'voice-settings' }, toggle, test, controls, voice.micTest.audio, status);
  const details = h('details', { class: 'voice-details' }, trigger, settings);
  const panel = h('div', { id: 'voicePanel', 'aria-label': 'Trò chuyện bằng mic' }, speakers, mic, details);
  // Keep the off switch accessible while a minigame hides the main HUD.
  document.body.append(panel);
  panel.hidden = true;
  document.addEventListener('pointerdown', (e) => { if (!panel.contains(e.target)) details.open = false; });
  panel.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && details.open) { e.stopPropagation(); details.open = false; trigger.focus(); }
  });
  mic.addEventListener('click', async () => {
    if (voice.starting || voice.micTest.busy) return;
    if (!voice.active) await voice.start();
    if (!voice.active) return;
    voice.micMuted = !voice.micMuted;
    voice.mode = 'open';
    mode.value = 'open';
    voice.holding = false;
    voice.update();
  });
  toggle.addEventListener('click', () => voice.active || voice.starting ? voice.stop() : voice.start());
  test.addEventListener('click', () => voice.micTest.start());
  mode.addEventListener('change', () => { voice.mode = mode.value; voice.holding = false; voice.update(); });
  deafen.addEventListener('click', () => { voice.deafened = !voice.deafened; voice.update(); });
  volume.addEventListener('input', () => {
    voice.volume = Number(volume.value) / 100;
    store.set('voiceVolume', String(voice.volume));
  });
  talk.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    talk.setPointerCapture(e.pointerId);
    voice.holding = true;
    voice.update();
  });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) talk.addEventListener(event, () => { voice.holding = false; voice.update(); });
  talk.addEventListener('keydown', (e) => {
    if (['Space', 'Enter'].includes(e.code)) { e.preventDefault(); voice.holding = true; voice.update(); }
  });
  talk.addEventListener('keyup', (e) => {
    if (['Space', 'Enter'].includes(e.code)) { e.preventDefault(); voice.holding = false; voice.update(); }
  });
  talk.addEventListener('blur', () => { voice.holding = false; voice.update(); });
  return {
    panel,
    render(message, speaking = []) {
      panel.classList.toggle('voice-on', voice.active);
      panel.classList.toggle('voice-transmitting', voice.transmitting);
      slash.hidden = voice.active && !voice.micMuted && !voice.deafened || voice.micTest.busy;
      mic.disabled = voice.starting || voice.micTest.busy;
      mic.setAttribute('aria-pressed', String(voice.active && !voice.micMuted));
      mic.setAttribute('aria-label', voice.active && !voice.micMuted ? 'Tắt mic' : 'Bật mic');
      mic.title = voice.active && !voice.micMuted ? 'Tắt mic' : 'Bật mic';
      const speakerText = speaking.length ? `Đang nói: ${speaking.join(', ')}` : '';
      if (speakers.textContent !== speakerText) speakers.textContent = speakerText;
      speakers.hidden = !speakerText;
      toggle.disabled = voice.micTest.busy;
      test.textContent = voice.micTest.busy ? 'Hủy thử mic' : 'Thử mic';
      test.disabled = voice.starting;
      toggle.textContent = voice.starting ? 'Hủy mở mic' : voice.active ? 'Tắt voice' : 'Bật voice';
      toggle.setAttribute('aria-pressed', String(voice.active));
      controls.hidden = !voice.active;
      talk.hidden = voice.mode !== 'ptt';
      talk.disabled = voice.blocked || voice.deafened;
      talk.setAttribute('aria-pressed', String(voice.transmitting));
      deafen.textContent = voice.deafened ? 'Bật nghe' : 'Tắt nghe';
      deafen.setAttribute('aria-pressed', String(voice.deafened));
      if (status.textContent !== message) status.textContent = message;
    },
  };
}
