// Deploy production trên máy chạy Docker (pc-chinh). Workflow .github/workflows/deploy.yml gọi script
// này từ self-hosted runner, trong thư mục đã checkout đúng commit cần deploy.
//
//   node scripts/deploy.mjs                    build, test, chạy candidate, cutover
//   node scripts/deploy.mjs --candidate-only   dừng sau khi candidate đạt, không đụng production
//
// Chỉ dùng thư viện có sẵn của Node để chạy được cả khi chưa `npm ci`.
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync } from 'node:fs';

const PROD = 'hth-tu-vien-ben-cang';
const VOLUME = 'hth-tu-vien-ben-cang-data';
const NETWORK = 'hth-net';
// Hai biến HTH_* chỉ để diễn tập trên máy khác; production dùng giá trị mặc định.
const PROD_PORT = Number(process.env.HTH_PROD_PORT || 3000);
const LOCAL_URL = `http://127.0.0.1:${PROD_PORT}`;
const PUBLIC_URL = process.env.HTH_PUBLIC_URL || 'https://game.hthlogistics.top';
const ROLLBACK_PREFIX = 'hth-rollback-';
const KEEP_ROLLBACKS = 3;
const LABEL = 'hth.deploy=workflow';
// Mọi lần tạo lại container phải truyền lại đủ các cờ này (docker update không lưu sang container mới).
const LIMITS = [
  '--memory', '768m', '--memory-swap', '1536m', '--pids-limit', '256',
  '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '-e', 'TRUST_PROXY=1',
];

const candidateOnly = process.argv.includes('--candidate-only');
const commit = headCommit();
const tag = `${stamp()}-${commit.slice(0, 7)}`;
const image = `hth:${tag}`;
const candidate = `hth-candidate-${tag}`;
const rollbackName = `${ROLLBACK_PREFIX}${tag}`;
const summary = [`## Deploy \`${image}\``, '', `- Commit: \`${commit}\``];

function log(msg) {
  console.log(`\n▶ ${msg}`);
}

// Bản giải nén từ `git archive` không có .git: khi đó lấy commit từ HTH_COMMIT.
function headCommit() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    if (/^[0-9a-f]{7,40}$/.test(process.env.HTH_COMMIT || '')) return process.env.HTH_COMMIT;
    throw new Error('Không biết commit: chạy trong git checkout hoặc đặt HTH_COMMIT=<sha>');
  }
}

// Chạy docker, trả về stdout. `input` đưa vào stdin; `stream` in thẳng ra log của job.
function docker(args, { input, stream = false, allowFail = false } = {}) {
  const r = spawnSync('docker', args, {
    input,
    encoding: 'utf8',
    stdio: stream ? ['ignore', 'inherit', 'inherit'] : ['pipe', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024,
  });
  if (r.status !== 0 && !allowFail) {
    throw new Error(`docker ${args[0]} lỗi (${r.status}): ${(r.stderr || '').trim()}`);
  }
  return (r.stdout || '').trim();
}

// Giờ Việt Nam dạng YYMMDD-HHMM, giống cách đặt tên các bản release trước.
function stamp() {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh', year: '2-digit', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date()).map((x) => [x.type, x.value]),
  );
  return `${p.year}${p.month}${p.day}-${p.hour}${p.minute}`;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000), cache: 'no-store' });
  return { status: res.status, body: Buffer.from(await res.arrayBuffer()) };
}

async function waitHealthy(base, seconds) {
  let last = '';
  for (let i = 0; i < seconds; i++) {
    try {
      const r = await get(`${base}/api/health`);
      if (r.status === 200 && JSON.parse(r.body).ok === true) return;
      last = `HTTP ${r.status}`;
    } catch (e) {
      last = e.cause?.code || e.message;
    }
    await sleep(1000);
  }
  throw new Error(`${base} không healthy sau ${seconds}s (${last})`);
}

// Trang chủ, bundle JS và bắt tay Socket.IO. Trả về đường dẫn và SHA256 của bundle để so giữa các bước.
async function checkSite(base) {
  const page = await get(`${base}/`);
  if (page.status !== 200) throw new Error(`${base}/ trả HTTP ${page.status}`);
  const bundle = page.body.toString('utf8').match(/\/assets\/index-[\w-]+\.js/)?.[0];
  if (!bundle) throw new Error(`${base}/ không có bundle /assets/index-*.js`);
  const js = await get(`${base}${bundle}`);
  if (js.status !== 200 || js.body.length < 1000) throw new Error(`${bundle} trả HTTP ${js.status}`);
  const sock = await get(`${base}/socket.io/?EIO=4&transport=polling`);
  if (sock.status !== 200 || !sock.body.toString('utf8').startsWith('0{')) {
    throw new Error(`Socket.IO handshake lỗi: HTTP ${sock.status}`);
  }
  return { bundle, sha256: createHash('sha256').update(js.body).digest('hex') };
}

// Đọc DB trong container qua stdin (tránh lỗi trích dẫn tham số trên Windows). In JSON một dòng.
const DB_PROBE = `
const fs = require('fs'), path = require('path');
let cfg = {};
try { cfg = JSON.parse(fs.readFileSync(process.env.HTH_CONFIG, 'utf8')); } catch {}
const file = path.resolve('/app', process.env.DB_PATH || cfg.dbPath || 'data/hth.db');
const db = new (require('better-sqlite3'))(file, { readonly: true, fileMustExist: true });
const n = (t) => db.prepare('SELECT count(*) AS n FROM ' + t).get().n;
console.log(JSON.stringify({ check: db.pragma('quick_check', { simple: true }), players: n('players'), wishes: n('wishes'), fish: n('fish_caught') }));
`;

function probeDb(container) {
  const out = JSON.parse(docker(['exec', '-i', '-w', '/app', container, 'node', '-'], { input: DB_PROBE }));
  if (out.check !== 'ok') throw new Error(`${container}: quick_check = ${out.check}`);
  return out;
}

// Sao lưu DB bằng backup API của SQLite (an toàn khi server đang ghi) cùng config, vào trong volume.
const BACKUP = (dir) => `
const fs = require('fs'), path = require('path');
const cfgFile = process.env.HTH_CONFIG;
let cfg = {};
try { cfg = JSON.parse(fs.readFileSync(cfgFile, 'utf8')); } catch {}
const file = path.resolve('/app', process.env.DB_PATH || cfg.dbPath || 'data/hth.db');
const dir = ${JSON.stringify(dir)};
fs.mkdirSync(dir, { recursive: true });
if (fs.existsSync(cfgFile)) fs.copyFileSync(cfgFile, path.join(dir, 'config.json'));
const db = new (require('better-sqlite3'))(file, { readonly: true, fileMustExist: true });
db.backup(path.join(dir, path.basename(file))).then(() => console.log('ok'), (e) => { console.error(e); process.exit(1); });
`;

function containerExists(name) {
  return docker(['ps', '-a', '--filter', `name=^/${name}$`, '--format', '{{.Names}}']) === name;
}

function removeCandidate() {
  docker(['rm', '-f', candidate], { allowFail: true });
  docker(['volume', 'rm', '-f', candidate], { allowFail: true });
}

function runProd(img) {
  docker([
    'run', '-d', '--name', PROD, '--network', NETWORK, '-p', `127.0.0.1:${PROD_PORT}:3000`,
    '-v', `${VOLUME}:/app/data`, '--restart', 'unless-stopped', ...LIMITS, img,
  ]);
}

async function rollback() {
  log(`Rollback về ${rollbackName}`);
  docker(['rm', '-f', PROD], { allowFail: true });
  docker(['rename', rollbackName, PROD]);
  docker(['update', '--restart', 'unless-stopped', PROD]);
  docker(['start', PROD]);
  await waitHealthy(LOCAL_URL, 60);
  console.log('Đã quay về bản cũ, production healthy.');
}

// Chỉ dọn những gì workflow tự tạo: container hth-rollback-* và image có nhãn hth.deploy=workflow.
function prune() {
  const rollbacks = docker(['ps', '-a', '--filter', `name=^/${ROLLBACK_PREFIX}`, '--format', '{{.Names}}'])
    .split('\n').filter(Boolean).sort().reverse();
  for (const name of rollbacks.slice(KEEP_ROLLBACKS)) docker(['rm', name], { allowFail: true });
  const images = docker(['images', 'hth', '--filter', `label=${LABEL}`, '--format', '{{.Tag}}'])
    .split('\n').filter((t) => t && t !== 'latest' && t !== '<none>').sort().reverse();
  // Image còn container dùng thì docker từ chối xoá, nên bản đang chạy và các rollback được giữ lại.
  for (const t of images.slice(KEEP_ROLLBACKS + 1)) docker(['image', 'rm', `hth:${t}`], { allowFail: true });
}

function writeSummary() {
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary.join('\n')}\n`);
}

async function main() {
  log(`Kiểm tra Docker và production (${candidateOnly ? 'chỉ candidate' : 'deploy đầy đủ'})`);
  docker(['info', '--format', '{{.ServerVersion}}']);
  docker(['volume', 'inspect', VOLUME]);
  docker(['network', 'inspect', NETWORK]);
  if (!containerExists(PROD)) throw new Error(`Không thấy container ${PROD}; dựng tay theo docs/deployment.md trước.`);
  const prodImage = docker(['inspect', '--format', '{{.Config.Image}}', PROD]);
  summary.push(`- Bản trước: \`${prodImage}\``);
  const before = probeDb(PROD);

  log('Build và chạy test trong image (stage test)');
  docker(['build', '--target', 'test', '.'], { stream: true });

  log(`Build ${image}`);
  docker(['build', '--label', LABEL, '--label', `hth.commit=${commit}`, '-t', image, '.'], { stream: true });

  log('Chạy candidate trên bản sao dữ liệu');
  removeCandidate();
  docker(['volume', 'create', '--label', LABEL, candidate]);
  // Chép dữ liệu production (bỏ thư mục backups) sang volume riêng của candidate.
  docker([
    'run', '--rm', '--user', '0', '--entrypoint', 'sh', '-v', `${VOLUME}:/from:ro`, '-v', `${candidate}:/to`, image,
    '-c', 'cd /from && tar --exclude=./backups -cf - . | tar -xpf - -C /to',
  ]);
  let site;
  try {
    docker([
      'run', '-d', '--name', candidate, '--label', LABEL, '-p', '127.0.0.1::3000',
      '-v', `${candidate}:/app/data`, ...LIMITS, image,
    ]);
    // Cổng do Docker tự chọn nên không đụng container nào khác đang giữ cổng cố định.
    const port = docker(['port', candidate, '3000/tcp']).match(/127\.0\.0\.1:(\d+)/)?.[1];
    if (!port) throw new Error('Không đọc được cổng của candidate');
    const base = `http://127.0.0.1:${port}`;
    console.log(`Candidate ở ${base}`);
    await waitHealthy(base, 60);
    site = await checkSite(base);
    const db = probeDb(candidate);
    if (db.players < before.players) throw new Error(`Candidate mất người chơi: ${db.players} < ${before.players}`);
    console.log(`Candidate đạt: bundle ${site.bundle}, DB ${JSON.stringify(db)}`);
    summary.push(`- Candidate: health, trang, bundle, Socket.IO và DB đạt (${db.players} người chơi, ${db.wishes} điều ước)`);
  } catch (e) {
    console.log(docker(['logs', '--tail', '40', candidate], { allowFail: true }));
    throw e;
  } finally {
    removeCandidate();
  }

  if (candidateOnly) {
    summary.push('- Chỉ chạy candidate, production không đổi.', `- Image \`${image}\` giữ lại để deploy sau.`);
    return;
  }

  log('Sao lưu DB và config trước cutover');
  docker(['exec', '-i', '-w', '/app', PROD, 'node', '-'], { input: BACKUP(`/app/data/backups/cutover-${tag}`) });

  log(`Cutover: ${prodImage} → ${image}`);
  docker(['stop', '-t', '10', PROD]);
  try {
    docker(['rename', PROD, rollbackName]);
  } catch (e) {
    docker(['start', PROD]);
    throw e;
  }
  try {
    docker(['update', '--restart', 'no', rollbackName]);
    runProd(image);
    await waitHealthy(LOCAL_URL, 60);
    const local = await checkSite(LOCAL_URL);
    if (local.sha256 !== site.sha256) throw new Error('Bundle trên production khác candidate');
    // Tunnel trỏ theo tên container trên hth-net nên tự nối lại; chờ một chút cho chắc.
    let pub;
    for (let i = 0; i < 6 && !pub; i++) {
      try {
        await waitHealthy(PUBLIC_URL, 10);
        pub = await checkSite(PUBLIC_URL);
      } catch (e) {
        if (i === 5) throw new Error(`Bản public chưa lên: ${e.message}`);
      }
    }
    if (pub.sha256 !== site.sha256) throw new Error('Bundle public khác bản vừa deploy');
    const after = probeDb(PROD);
    summary.push(
      `- Production: health, trang, Socket.IO và bundle \`${pub.bundle}\` đạt ở cả localhost và ${PUBLIC_URL}`,
      `- Bundle SHA256: \`${pub.sha256}\``,
      `- DB quick_check ok: ${after.players} người chơi, ${after.wishes} điều ước, ${after.fish} cá`,
    );
  } catch (e) {
    console.error(`Cutover lỗi: ${e.message}`);
    console.log(docker(['logs', '--tail', '40', PROD], { allowFail: true }));
    await rollback();
    summary.push(`- **Cutover lỗi, đã rollback về \`${prodImage}\`:** ${e.message}`);
    throw e;
  }

  docker(['tag', image, 'hth:latest']);
  summary.push(
    `- Rollback: container \`${rollbackName}\` (dừng, restart=no), backup trong volume \`backups/cutover-${tag}/\``,
  );
  log('Dọn rollback và image cũ do workflow tạo');
  prune();
}

try {
  await main();
  console.log(`\n✔ Xong: ${image}`);
} catch (e) {
  console.error(`\n✖ ${e.message}`);
  process.exitCode = 1;
} finally {
  writeSummary();
}
