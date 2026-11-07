export const VOICE = Object.freeze({ fullDistance: 3, hearDistance: 18, disconnectDistance: 22, maxPeers: 6 });

export function voiceVolume(distance) {
  if (!Number.isFinite(distance)) return 0;
  return Math.max(0, Math.min(1, (VOICE.hearDistance - distance) / (VOICE.hearDistance - VOICE.fullDistance)));
}
