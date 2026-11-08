// Long-lived API token stays here; clients receive only expiring ICE credentials.
export function cloudflareTurn(env = process.env, fetchImpl = fetch) {
  const key = env.VOICE_CLOUDFLARE_KEY_ID;
  const token = env.VOICE_CLOUDFLARE_API_TOKEN;
  if (!key && !token) return null;
  if (!/^[a-f0-9]{32}$/i.test(key || '') || !token || /\s/.test(token)) {
    throw new Error('Cloudflare TURN requires a valid key ID and API token.');
  }
  return async () => {
    const response = await fetchImpl(`https://rtc.live.cloudflare.com/v1/turn/keys/${key}/credentials/generate-ice-servers`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ttl: 86400 }),
      signal: AbortSignal.timeout(8000),
      redirect: 'error',
    });
    if (!response.ok) throw new Error('Cloudflare TURN unavailable.');
    const { iceServers } = await response.json();
    if (!Array.isArray(iceServers) || !iceServers.length || iceServers.length > 8) throw new Error('Invalid TURN response.');
    const result = iceServers.map(({ urls, username, credential }) => {
      urls = typeof urls === 'string' ? [urls] : urls;
      if (!Array.isArray(urls) || !urls.length || urls.length > 16 || urls.some((url) =>
        typeof url !== 'string' || !/^(stun|turn|turns):(stun|turn)\.cloudflare\.com:\d+(\?transport=(udp|tcp))?$/.test(url))) {
        throw new Error('Invalid TURN URLs.');
      }
      if (!urls.some((url) => /^turns?:/.test(url))) return { urls };
      if (typeof username !== 'string' || !username || username.length > 2048 ||
          typeof credential !== 'string' || !credential || credential.length > 2048 || credential === token) {
        throw new Error('Invalid TURN credentials.');
      }
      return { urls, username, credential };
    });
    if (!result.some((server) => server.credential)) throw new Error('Missing TURN relay.');
    return result;
  };
}
