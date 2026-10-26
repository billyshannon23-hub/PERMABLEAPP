// Video Autopilot desktop app: main process.
const { app, BrowserWindow, ipcMain, shell, dialog, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { GitHub } = require('./lib/github');
const platforms = require('./lib/platforms');
const { unzip } = require('./lib/unzip');

const DEFAULT_TEMPLATE = 'billyshannon23-hub/PERMABLEAPP';
const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
let win;

// ---------- settings (tokens encrypted with the OS keychain when available) ----------
const cfgPath = () => path.join(app.getPath('userData'), 'settings.json');
function loadCfg() {
  try {
    const raw = fs.readFileSync(cfgPath());
    const txt = raw[0] === 0x7b ? raw.toString() : safeStorage.decryptString(raw);
    return JSON.parse(txt);
  } catch { return {}; }
}
function saveCfg(c) {
  const txt = JSON.stringify(c);
  fs.mkdirSync(path.dirname(cfgPath()), { recursive: true });
  fs.writeFileSync(cfgPath(), safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(txt) : txt);
}
let cfg = {};
const gh = () => {
  if (!cfg.githubToken || !cfg.repo) throw new Error('Not connected to GitHub yet.');
  return new GitHub(cfg.githubToken, cfg.repo);
};

// ---------- sign-in helpers ----------
function openAuth(url, redirectPrefix) {
  return new Promise((resolve, reject) => {
    const w = new BrowserWindow({ width: 520, height: 760, parent: win, modal: true, title: 'Sign in',
      webPreferences: { partition: `auth-${Date.now()}` } });
    w.webContents.setUserAgent(CHROME_UA);
    let done = false;
    const check = (e, u) => {
      if (u && u.startsWith(redirectPrefix)) {
        if (e) e.preventDefault();
        done = true; resolve(u); w.close();
      }
    };
    w.webContents.on('will-redirect', check);
    w.webContents.on('will-navigate', check);
    w.webContents.on('did-navigate', (e, u) => check(null, u));
    w.on('closed', () => { if (!done) reject(new Error('Sign-in window was closed.')); });
    w.loadURL(url);
  });
}

function openBrowserLoopback(buildUrl) {
  return new Promise((resolve, reject) => {
    const srv = http.createServer((req, res) => {
      const u = new URL(req.url, 'http://127.0.0.1');
      const code = u.searchParams.get('code'), err = u.searchParams.get('error');
      if (!code && !err) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`<body style="font-family:sans-serif;text-align:center;padding:60px;background:#f4ecd8">
        <h2>${code ? 'Connected! You can close this tab and go back to Video Autopilot.' : 'Sign-in cancelled.'}</h2></body>`);
      srv.close(); clearTimeout(timer);
      if (code) resolve({ code, redirect }); else reject(new Error(err));
      win.focus();
    });
    let redirect;
    const timer = setTimeout(() => { srv.close(); reject(new Error('Sign-in timed out.')); }, 5 * 60 * 1000);
    srv.listen(0, '127.0.0.1', () => {
      redirect = `http://127.0.0.1:${srv.address().port}`;
      shell.openExternal(buildUrl(redirect));
    });
  });
}

// ---------- IPC ----------
const handlers = {
  async state() {
    return { github: !!cfg.githubToken, login: cfg.login, repo: cfg.repo, template: cfg.template || DEFAULT_TEMPLATE,
      teamKeys: summarizeKeys(cfg.teamKeys), accounts: cfg.accounts || {}, setupDone: !!cfg.setupDone };
  },

  async connectGitHub({ token }) {
    token = token.trim();
    const g = new GitHub(token);
    const scopes = await g.scopes();
    const fine = scopes.length === 0; // fine-grained tokens report no scopes
    if (!fine && !(scopes.includes('repo') && scopes.includes('workflow'))) {
      throw new Error('This token is missing permissions. Make a new one with "repo" and "workflow" ticked.');
    }
    const me = await g.user();
    const template = cfg.template || DEFAULT_TEMPLATE;
    let repo;
    if (template.toLowerCase().startsWith(me.login.toLowerCase() + '/')) {
      repo = template; // the person who owns the template uses it directly
    } else {
      repo = `${me.login}/video-autopilot`;
      if (!(await g.getRepo(repo))) {
        try {
          await g.createFromTemplate(template, me.login, 'video-autopilot');
        } catch (e) {
          if (e.status === 422 || e.status === 404) {
            throw new Error(`Couldn't copy ${template}. Ask its owner to tick "Template repository" in its GitHub settings.`);
          }
          throw e;
        }
        for (let i = 0; i < 20; i++) { // wait until GitHub has finished copying
          await new Promise(r => setTimeout(r, 1500));
          const c = await new GitHub(token, repo).readFile('.github/workflows/make-videos.yml').catch(() => null);
          if (c && c.text) break;
        }
      }
    }
    cfg = { ...cfg, githubToken: token, login: me.login, repo };
    saveCfg(cfg);
    const g2 = gh();
    await g2.enableActions();
    await g2.setSecret('GH_ADMIN_TOKEN', token).catch(() => {}); // lets the robot refresh social tokens itself
    return { login: me.login, repo };
  },

  async connectClaude({ key }) {
    key = key.trim();
    const { secret, label } = await platforms.checkClaudeKey(key);
    const g = gh();
    await g.setSecret(secret, key);
    const other = secret === 'ANTHROPIC_API_KEY' ? 'CLAUDE_CODE_OAUTH_TOKEN' : 'ANTHROPIC_API_KEY';
    await g.deleteSecret(other).catch(() => {});
    cfg.accounts = { ...(cfg.accounts || {}), claude: label }; saveCfg(cfg);
    return label;
  },

  async connectPlatform({ name }) {
    const keys = (cfg.teamKeys || {})[name] || {};
    const res = await platforms[name](keys, { openAuth, openBrowserLoopback });
    const g = gh();
    for (const [k, v] of Object.entries(res.secrets)) await g.setSecret(k, v);
    cfg.accounts = { ...(cfg.accounts || {}), [name]: res.account }; saveCfg(cfg);
    return res.account;
  },

  async disconnect({ name }) {
    const g = gh();
    for (const s of platforms.SECRETS[name] || []) await g.deleteSecret(s).catch(() => {});
    if (cfg.accounts) delete cfg.accounts[name];
    saveCfg(cfg);
  },

  async importTeamKeys() {
    const r = await dialog.showOpenDialog(win, { title: 'Open team keys file', filters: [{ name: 'Team keys', extensions: ['json', 'vakeys'] }], properties: ['openFile'] });
    if (r.canceled) return null;
    const k = JSON.parse(fs.readFileSync(r.filePaths[0], 'utf8'));
    cfg.teamKeys = { ...(cfg.teamKeys || {}), ...k };
    if (k.template && !cfg.repo) cfg.template = k.template;
    saveCfg(cfg);
    return summarizeKeys(cfg.teamKeys);
  },

  async saveTeamKeys({ keys }) {
    cfg.teamKeys = { ...(cfg.teamKeys || {}), ...keys }; saveCfg(cfg);
    return summarizeKeys(cfg.teamKeys);
  },

  async exportTeamKeys() {
    const r = await dialog.showSaveDialog(win, { title: 'Save team keys for your co-workers', defaultPath: 'team-keys.json' });
    if (r.canceled) return false;
    const out = { ...(cfg.teamKeys || {}), template: cfg.template || DEFAULT_TEMPLATE };
    fs.writeFileSync(r.filePath, JSON.stringify(out, null, 2));
    return true;
  },

  async setTemplate({ template }) { cfg.template = template.trim(); saveCfg(cfg); },
  async finishSetup() { cfg.setupDone = true; saveCfg(cfg); },
  async reopenSetup() { cfg.setupDone = false; saveCfg(cfg); },
  async signOut() { cfg = {}; saveCfg(cfg); },

  // ---- dashboard ----
  async dashboard() {
    const g = gh();
    const [vars, secrets, runs, hist] = await Promise.all([
      g.getVars().catch(() => ({})), g.secretNames().catch(() => []), g.runs().catch(() => []),
      g.readFile('autopilot/history.jsonl').catch(() => ({ text: '' })),
    ]);
    const history = hist.text.split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean).reverse();
    return {
      paused: vars.AUTOPILOT_PAUSED === 'true', testMode: vars.DRY_RUN === 'true', tiktokMode: vars.TIKTOK_MODE || 'direct',
      connected: Object.fromEntries(Object.entries(platforms.SECRETS).map(([k, list]) =>
        [k, k === 'claude' ? list.some(s => secrets.includes(s)) : list.every(s => secrets.includes(s))])),
      accounts: cfg.accounts || {},
      runs: runs.map(r => ({ id: r.id, status: r.status, conclusion: r.conclusion, created: r.created_at,
        event: r.event, url: r.html_url, title: r.display_title })),
      history, repo: cfg.repo,
    };
  },
  async setVar({ name, value }) { await gh().setVar(name, String(value)); },
  async makeVideo({ topic, test }) {
    await gh().runVideo({ topic: topic || '', dry_run: test ? 'true' : 'false', post_to: '' });
  },
  async readFile({ path: p }) { return (await gh().readFile(p)).text; },
  async writeFile({ path: p, text }) { await gh().writeFile(p, text, `Update ${p} from the Video Autopilot app`); },

  async getSchedule() {
    const t = (await gh().readFile('.github/workflows/make-videos.yml')).text;
    return [...t.matchAll(/- cron: "(\d+) (\d+) \* \* \*"/g)].map(m => ({ m: +m[1], h: +m[2] }));
  },
  async setSchedule({ times }) { // times are UTC {h,m}
    const g = gh();
    const f = await g.readFile('.github/workflows/make-videos.yml');
    const lines = times.map(t => `    - cron: "${t.m} ${t.h} * * *"`).join('\n');
    const text = f.text.replace(/(  schedule:\n(?:    #.*\n)*)(?:    - cron: ".*"\n)+/, `$1${lines}\n`);
    await g.writeFile('.github/workflows/make-videos.yml', text, 'Change video schedule from the Video Autopilot app');
  },

  async getVideo({ runId }) {
    const g = gh();
    const arts = await g.runArtifacts(runId);
    const a = arts.find(x => x.name.startsWith('video-'));
    if (!a) throw new Error('This run has no video (it may have failed before finishing).');
    if (a.expired) throw new Error('This video is older than 30 days and has been deleted by GitHub.');
    const files = unzip(await g.downloadArtifact(a.id));
    const dir = path.join(app.getPath('videos') || app.getPath('downloads'), 'Video Autopilot');
    fs.mkdirSync(dir, { recursive: true });
    let mp4, post = null, sheet;
    for (const [name, data] of Object.entries(files)) {
      const base = path.basename(name);
      if (base.endsWith('.mp4')) { mp4 = path.join(dir, base); fs.writeFileSync(mp4, data); }
      else if (base.endsWith('_sheet.png')) { sheet = path.join(dir, base); fs.writeFileSync(sheet, data); }
      else if (base === 'post.json') post = JSON.parse(data.toString());
    }
    return { mp4, sheet, post, dir };
  },
  async openPath({ p }) { return shell.openPath(p); },
  async showInFolder({ p }) { shell.showItemInFolder(p); },
  async openExternal({ url }) {
    if (/^https:\/\//.test(url)) await shell.openExternal(url);
  },
};

function summarizeKeys(k = {}) {
  return {
    youtube: !!(k.youtube && k.youtube.client_id && k.youtube.client_secret),
    instagram: !!(k.instagram && k.instagram.app_id && k.instagram.app_secret && k.instagram.redirect_uri),
    tiktok: !!(k.tiktok && k.tiktok.client_key && k.tiktok.client_secret && k.tiktok.redirect_uri),
  };
}

for (const [name, fn] of Object.entries(handlers)) {
  ipcMain.handle(name, async (_e, arg) => {
    try { return { ok: true, data: await fn(arg || {}) }; } catch (e) { return { ok: false, error: e.message }; }
  });
}

app.whenReady().then(() => {
  cfg = loadCfg();
  win = new BrowserWindow({
    width: 1100, height: 780, minWidth: 760, minHeight: 600, title: 'Video Autopilot',
    backgroundColor: '#f4ecd8', icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  win.setMenuBarVisibility(false);
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https:\/\//.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
});
app.on('window-all-closed', () => app.quit());
