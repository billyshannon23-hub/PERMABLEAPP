/* Video Autopilot: screens. window.va.* calls the main process. */
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const app = $('#app');
let S = {};          // app state from main
let D = null;        // dashboard data
let view = 'welcome';

function toast(msg, ms = 3200) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), ms);
}
async function busy(btn, fn, okMsg) {
  const label = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spin"></span> Working…';
  const errEl = btn.closest('.card')?.querySelector('.err'); if (errEl) errEl.textContent = '';
  try { const r = await fn(); if (okMsg) toast(okMsg); return r; }
  catch (e) { if (errEl) errEl.textContent = e.message; else toast(e.message, 6000); throw e; }
  finally { btn.disabled = false; btn.innerHTML = label; }
}
const open = (url) => window.va.openExternal({ url });
const PLAT = {
  youtube: { name: 'YouTube Shorts', ico: 'YT' },
  instagram: { name: 'Instagram Reels', ico: 'IG' },
  tiktok: { name: 'TikTok', ico: 'TT' },
};

// ================= SETUP =================
const SETUP = ['welcome', 'github', 'claude', 'accounts', 'topic', 'ready'];
const SETUP_LABEL = { welcome: 'Welcome', github: 'Your copy', claude: 'Claude', accounts: 'Accounts', topic: 'Video topic', ready: 'Done' };
const stepDone = (k) => ({ github: S.github, claude: !!S.accounts.claude, accounts: Object.keys(PLAT).some(p => S.accounts[p]), topic: !!S.topicSet }[k]);

function setupShell(inner) {
  const i = SETUP.indexOf(view);
  app.innerHTML = `<div class="shell">
    <aside class="side">
      <div class="brand"><img class="logo" src="../build/icon.png" alt="">Video<br>Autopilot</div>
      ${SETUP.map((k, n) => `<button class="nav ${k === view ? 'on' : ''} ${stepDone(k) ? 'done' : ''}" data-go="${k}" ${n > i && !canGo(k) ? 'disabled style="opacity:.45"' : ''}>
        <span class="n">${stepDone(k) ? '✓' : n + 1}</span>${SETUP_LABEL[k]}</button>`).join('')}
      <div class="grow"></div><small>Set up once. After that, videos make themselves.</small>
    </aside>
    <main class="main"><div class="wrap">${inner}</div></main></div>`;
  app.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { if (!b.disabled) go(b.dataset.go); });
}
const canGo = (k) => k === 'welcome' || (k === 'github') || (S.github && (!['topic', 'ready'].includes(k) || S.accounts.claude));

function go(v) { view = v; render(); }

function renderWelcome() {
  setupShell(`<div class="hero">
    <img class="logo" src="../build/icon.png" alt="">
    <h1>Video Autopilot</h1>
    <p>Makes <b>3 narrated videos a day</b> with the Permeable Framework and posts them to YouTube Shorts, Instagram Reels and TikTok, even while your computer is off.</p>
    <p class="muted">Setup takes about 5 minutes. You'll need: a free GitHub account, a Claude key, and your social accounts.</p>
    <div class="row" style="justify-content:center;margin-top:24px">
      <button class="btn big" id="start">Let's set it up</button>
    </div>
    <p class="muted" style="margin-top:28px">Got a <b>team keys file</b> from whoever runs this at work? <button class="link" id="imp">Import it now</button> and connecting accounts becomes one click.</p>
  </div>`);
  $('#start').onclick = () => go('github');
  $('#imp').onclick = async () => { const k = await window.va.importTeamKeys(); if (k) { S.teamKeys = k; toast('Team keys imported ✓'); } };
}

function renderGitHub() {
  setupShell(`<h1>Step 1 · Your own copy</h1>
  <p>Your videos are made by a free robot on GitHub, so nothing has to stay running on your computer. This step makes your own private copy of it.</p>
  <div class="card">
    ${S.github ? `<div class="row between"><div><span class="pill good">Connected</span> &nbsp;<b>${esc(S.login)}</b> · copy: <span class="muted">${esc(S.repo)}</span></div>
      <button class="btn" id="next">Next</button></div>` : `
    <ol class="steps">
      <li>No GitHub account? <button class="link" data-url="https://github.com/signup">Make one free</button>, then come back.</li>
      <li>Click <b>Open GitHub</b>. The page that opens already has the right boxes ticked.</li>
      <li>Set <b>Expiration</b> to <b>No expiration</b>, scroll to the bottom and click <b>Generate token</b>.</li>
      <li>Copy the code that starts with <b>ghp_</b> and paste it here.</li>
    </ol>
    <div class="row" style="margin-bottom:14px"><button class="btn ghost" data-url="https://github.com/settings/tokens/new?scopes=repo,workflow&description=Video%20Autopilot">Open GitHub</button></div>
    <label class="f" for="tok">Paste your GitHub token</label>
    <input type="password" id="tok" placeholder="ghp_…" autocomplete="off">
    <div class="row" style="margin-top:14px"><button class="btn" id="conn">Connect</button></div>
    <div class="err"></div>`}
  </div>
  <details><summary>Advanced: which system to copy</summary>
    <p class="muted" style="margin-top:8px">Copies <b>${esc(S.template)}</b>. Only change this if your team uses a different one.</p>
    <div class="row"><input type="text" id="tpl" value="${esc(S.template)}" style="flex:1"><button class="btn ghost small" id="tplsave">Save</button></div>
  </details>`);
  bindUrls();
  if (S.github) { $('#next').onclick = () => go('claude'); }
  else $('#conn').onclick = (e) => busy(e.currentTarget, async () => {
    const tok = $('#tok').value; if (!tok.trim()) throw new Error('Paste your token first.');
    toast('Making your copy… this can take 30 seconds', 8000);
    await window.va.connectGitHub({ token: tok }); await refresh(); go('claude');
  }, 'GitHub connected ✓');
  $('#tplsave').onclick = async () => { await window.va.setTemplate({ template: $('#tpl').value }); await refresh(); toast('Saved'); };
}

function renderClaude(inDash) {
  const has = S.accounts.claude;
  (inDash === true ? dashShell : setupShell)(`<h1>Step 2 · Connect Claude</h1>
  <p>Claude writes, draws and checks every video. It uses your own Claude account.</p>
  <div class="card">
    ${has ? `<div class="row between"><div><span class="pill good">Connected</span> &nbsp;${esc(has)}</div><button class="btn" id="next">Next</button></div><div style="margin-top:12px"><button class="link" id="change">Use a different key</button></div>` : `
    <h3>Claude API key</h3>
    <ol class="steps">
      <li>Click <b>Open Claude Console</b> and sign in (same login as Claude).</li>
      <li>Add a few dollars of credit under <b>Billing</b> if you haven't. Videos cost roughly $1–4 each.</li>
      <li>Click <b>Create Key</b>, name it "Video Autopilot", copy it and paste it here.</li>
    </ol>
    <div class="row" style="margin-bottom:14px"><button class="btn ghost" data-url="https://console.anthropic.com/settings/keys">Open Claude Console</button></div>
    <label class="f" for="key">Paste your Claude key</label>
    <input type="password" id="key" placeholder="sk-ant-…" autocomplete="off">
    <div class="row" style="margin-top:14px"><button class="btn" id="conn">Connect</button></div>
    <div class="err"></div>
    <details><summary>I have a Claude Pro/Max subscription token instead</summary>
      <p class="muted" style="margin-top:8px">A subscription token (starts with <b>sk-ant-oat</b>) uses your plan's limits instead of paying per video. Paste it in the same box above.</p></details>`}
  </div>`);
  bindUrls();
  const nextView = inDash === true ? 'accounts-d' : 'accounts';
  if (has) { $('#next').onclick = () => go(nextView); $('#change').onclick = () => { S.accounts.claude = null; render(); }; }
  else $('#conn').onclick = (e) => busy(e.currentTarget, async () => {
    const k = $('#key').value; if (!k.trim()) throw new Error('Paste your key first.');
    await window.va.connectClaude({ key: k }); await refresh(); go(nextView);
  }, 'Claude connected ✓');
}

function platCard(p, compact) {
  const acct = S.accounts[p], keys = S.teamKeys[p];
  return `<div class="card plat-card" data-p="${p}">
    <div class="plat"><div class="ico">${PLAT[p].ico}</div>
      <div class="grow"><b>${PLAT[p].name}</b><br>
        ${acct ? `<span class="pill good">${esc(acct)}</span>` : keys ? `<span class="muted">Ready to connect</span>` : `<span class="pill warn">Needs team keys</span>`}</div>
      ${acct ? `<button class="btn ghost small" data-dis="${p}">Disconnect</button>` :
        keys ? `<button class="btn" data-con="${p}">Connect</button>` : `<button class="btn ghost small" data-keys="${p}">Add keys</button>`}
    </div>
    <div class="err"></div>
    ${!compact && p === 'tiktok' && acct ? `<p class="muted" style="margin:10px 0 0">Until TikTok approves your team's app, videos arrive in your TikTok <b>inbox as drafts</b>. Open TikTok and tap Post.</p>` : ''}
  </div>`;
}
function bindPlat(root = app) {
  root.querySelectorAll('[data-con]').forEach(b => b.onclick = () => busy(b, async () => {
    const p = b.dataset.con;
    toast(p === 'youtube' ? 'Sign in with Google in your browser…' : 'Sign in to the window that opens…', 6000);
    await window.va.connectPlatform({ name: p });
    if (p === 'tiktok') await window.va.setVar({ name: 'TIKTOK_MODE', value: 'inbox' }).catch(() => {});
    await refresh(); render();
  }, 'Connected ✓'));
  root.querySelectorAll('[data-dis]').forEach(b => b.onclick = () => busy(b, async () => {
    await window.va.disconnect({ name: b.dataset.dis }); await refresh(); render();
  }, 'Disconnected'));
  root.querySelectorAll('[data-keys]').forEach(b => b.onclick = () => { view = 'teamkeys'; teamKeysFocus = b.dataset.keys; render(); });
}

function renderAccounts() {
  const anyKeys = Object.values(S.teamKeys).some(Boolean);
  setupShell(`<h1>Step 3 · Where to post</h1>
  <p>Connect any accounts you want. You can skip this and add them later. Videos are still made, just not posted.</p>
  ${anyKeys ? '' : `<div class="note"><b>First, import your team keys file.</b> The person who set this up at work has a file called <b>team-keys.json</b>. Ask them for it, then click Import. (Setting it up yourself? <button class="link" id="adv">Add keys by hand</button>.)
    <div style="margin-top:10px"><button class="btn small" id="imp">Import team keys</button></div></div>`}
  ${Object.keys(PLAT).map(p => platCard(p)).join('')}
  <div class="row" style="margin-top:20px"><button class="btn big" id="next">${Object.keys(PLAT).some(p => S.accounts[p]) ? 'Next' : 'Skip for now'}</button></div>`);
  bindPlat();
  $('#next').onclick = () => go('topic');
  if ($('#imp')) $('#imp').onclick = async () => { const k = await window.va.importTeamKeys(); if (k) { S.teamKeys = k; render(); toast('Team keys imported ✓'); } };
  if ($('#adv')) $('#adv').onclick = () => { view = 'teamkeys'; render(); };
}

// ================= VIDEO TOPIC =================
const PRESETS = [
  ['Educational stories', `Educational storytelling, with safety built in. Each video tells a short, true, gripping story or answers a question people actually wonder about, and the viewer walks away knowing something useful.

Mix three kinds of video:
1. How your body works: everyday mysteries explained plainly (what hiccups are, why we yawn, what goosebumps do), with a practical takeaway.
2. True stories from history and science, like Ötzi the Iceman, the 5,300-year-old man hikers found frozen in the Alps.
3. Staying safe: real risks explained calmly, like how people get scammed or approached by strangers on games like Roblox, how to spot it, and what to do (block, report, tell a trusted adult).

Audience: curious teens and adults.`],
  ['Safety for kids & parents', `Safety videos for kids, teens and parents. Online safety (scams, strangers in games like Roblox, sharing personal info, cyberbullying), home safety, outdoor and weather safety, and first-aid basics. Calm, practical and never scary: always end with clear steps to take. Family-friendly.`],
  ['Science explainers', `Short science explainers: one question a viewer would actually ask (why is the sky blue, how do vaccines work, what is a black hole), answered plainly with a clear mechanism and a surprising fact.`],
  ['History mysteries', `True stories from history and archaeology told like mysteries: famous discoveries, lost cities, preserved bodies like Ötzi the Iceman, shipwrecks. Hook, mystery, what scientists found out. Accurate and respectful.`],
  ['Zombies & scary stories', `Second-person survival stories ("You were sitting in seat 23C when…"), like a zombie outbreak on a plane, a cruise ship or an oil rig, or an alien invasion. Run them as series: each part continues the last and ends on a cliffhanger. Every survival detail (water, food, injuries, physics) follows real science. Scary and intense, PG-13.`],
];
const FOCUS_RE = /<!-- FOCUS START -->[\s\S]*?<!-- FOCUS END -->/;
const RATING_RE = /<!-- RATING START -->[\s\S]*?<!-- RATING END -->/;
const RATINGS = {
  pg13: `- Content rating: **PG-13**. Scary, intense, dark or mature themes are fine, like a TV drama or a horror movie
  trailer, as long as it stays within TikTok and YouTube community guidelines. Nothing R-rated: no graphic gore
  or close-up injuries, no sexual content, no strong swearing, nothing that glorifies self-harm or real violence.`,
  family: `- Content rating: **Family-friendly**. Safe for kids to watch: nothing gory, graphic or frightening for young children,
  no swearing. Tension comes from the story, not violence.`,
};
async function renderTopic(inDash) {
  const shell = inDash ? dashShell : setupShell;
  shell(`<h1>Video topic</h1><p class="muted"><span class="spin"></span> Loading…</p>`);
  let brief = '';
  try { brief = await window.va.readFile({ path: 'autopilot/channel.md' }); } catch (e) { toast(e.message, 6000); }
  if (!['topic', 'channel'].includes(view)) return;
  const m = brief.match(FOCUS_RE);
  const rating = /RATING START -->\s*- Content rating: \*\*Family/.test(brief) ? 'family' : 'pg13';
  const current = m ? m[0].replace(/<!-- FOCUS (START|END) -->/g, '').replace(/^\s*## What this channel is about\s*/, '').trim() : PRESETS[0][1];
  shell(`<h1>${inDash ? 'Video topic' : 'Step 4 · What to make'}</h1>
    <p>Tell Claude what your videos should be about. Pick a starting point or write your own, like <i>"make content about zombies and scary stories"</i>. You can change it any time.</p>
    <div class="card">
      <label class="f">Start from</label>
      <div class="row" style="margin-bottom:14px">${PRESETS.map(([n], i) => `<button class="btn ghost small" data-pre="${i}">${esc(n)}</button>`).join('')}</div>
      <label class="f" for="focus">What should your videos be about?</label>
      <textarea id="focus" style="min-height:220px;font-family:var(--sans);font-size:15px">${esc(current)}</textarea>
      <label class="f" style="margin-top:16px">Content rating</label>
      <div class="row" id="rating">
        <label class="switch"><input type="radio" name="rt" value="pg13" ${rating === 'pg13' ? 'checked' : ''}><span class="t"></span><span><b>PG-13</b>: scary, intense and mature themes OK. Nothing R-rated.</span></label>
        <label class="switch"><input type="radio" name="rt" value="family" ${rating === 'family' ? 'checked' : ''}><span class="t"></span><span><b>Family-friendly</b>: safe for kids to watch</span></label>
      </div>
      <label class="switch" style="margin-top:12px"><input type="checkbox" id="clr"><span class="t"></span>Also clear my list of upcoming video ideas (so Claude starts fresh on this topic)</label>
      <div class="row" style="margin-top:14px"><button class="btn" id="save">${inDash ? 'Save' : 'Save and continue'}</button>
        ${inDash ? `<button class="link" id="raw">Edit the full brief and safety rules</button>` : ''}</div>
      <div class="err"></div>
    </div>
    <p class="muted">Facts are always checked, and videos always stay within TikTok and YouTube rules.</p>`);
  app.querySelectorAll('[data-pre]').forEach(b => b.onclick = () => { $('#focus').value = PRESETS[+b.dataset.pre][1]; $('#clr').checked = true; });
  $('#focus').oninput = () => { $('#clr').checked = true; };
  if ($('#raw')) $('#raw').onclick = () => go('channel-raw');
  $('#save').onclick = (e) => busy(e.currentTarget, async () => {
    const text = $('#focus').value.trim(); if (!text) throw new Error('Write a sentence about what to make.');
    const block = `<!-- FOCUS START -->\n## What this channel is about\n${text}\n<!-- FOCUS END -->`;
    let next = FOCUS_RE.test(brief) ? brief.replace(FOCUS_RE, () => block) : `# Channel brief\n\n${block}\n\n${brief}`;
    const rt = app.querySelector('input[name=rt]:checked')?.value || 'pg13';
    const rblock = `<!-- RATING START -->\n${RATINGS[rt]}\n<!-- RATING END -->`;
    next = RATING_RE.test(next) ? next.replace(RATING_RE, () => rblock) : next.replace('## Rules (always apply)\n', () => `## Rules (always apply)\n${rblock}\n`);
    await window.va.writeFile({ path: 'autopilot/channel.md', text: next });
    if ($('#clr').checked) await window.va.writeFile({ path: 'autopilot/topics.txt',
      text: '# One video idea per line. The autopilot takes the top line each run and deletes it.\n# When this list is empty, Claude picks its own ideas from your video topic.\n' });
    S.topicSet = true; brief = next;
    if (!inDash) go('ready');
  }, 'Saved. The next video follows this ✓');
}

function renderReady() {
  setupShell(`<div class="hero"><img class="logo" src="../build/icon.png" alt="">
    <h1>You're all set</h1>
    <p>Your autopilot will make <b>3 videos a day</b>. Before it posts anything, make one <b>test video</b> to see how it looks. It takes about 15–30 minutes and won't be posted.</p>
    <div class="row" style="justify-content:center;margin-top:20px">
      <button class="btn big" id="test">Make a test video</button>
      <button class="btn ghost big" id="dash">Go to dashboard</button>
    </div></div>`);
  $('#test').onclick = (e) => busy(e.currentTarget, async () => {
    await window.va.finishSetup(); await window.va.makeVideo({ topic: '', test: true }); S.setupDone = true; go('home');
  }, 'Test video started. Check back in ~20 minutes');
  $('#dash').onclick = async () => { await window.va.finishSetup(); S.setupDone = true; go('home'); };
}

// ================= TEAM KEYS =================
let teamKeysFocus = null;
const KEY_FIELDS = {
  youtube: [['client_id', 'Client ID'], ['client_secret', 'Client secret']],
  instagram: [['app_id', 'Instagram app ID'], ['app_secret', 'Instagram app secret'], ['redirect_uri', 'Redirect URL (https)']],
  tiktok: [['client_key', 'Client key'], ['client_secret', 'Client secret'], ['redirect_uri', 'Redirect URI (https)']],
};
const KEY_HELP = {
  youtube: `<ol class="steps"><li>Open <button class="link" data-url="https://console.cloud.google.com/projectcreate">Google Cloud</button> and create a project.</li>
    <li>Enable <button class="link" data-url="https://console.cloud.google.com/apis/library/youtube.googleapis.com">YouTube Data API v3</button>.</li>
    <li>On the <button class="link" data-url="https://console.cloud.google.com/auth/overview">OAuth consent screen</button>: External, then <b>Publish app</b> (so logins don't expire weekly).</li>
    <li><button class="link" data-url="https://console.cloud.google.com/auth/clients/create">Create an OAuth client</button> of type <b>Desktop app</b>. Copy the ID and secret here.</li>
    <li>Optional: apply for an <button class="link" data-url="https://support.google.com/youtube/contact/yt_api_form">API audit</button> so uploads can be public (until then they may be private).</li></ol>`,
  instagram: `<ol class="steps"><li>Each person's Instagram must be a <b>Professional</b> account (Instagram app → Settings → Account type).</li>
    <li>At <button class="link" data-url="https://developers.facebook.com/apps/creation/">Meta for Developers</button>, create an app and add <b>Instagram</b> → "API setup with Instagram login".</li>
    <li>Add a redirect URL. Any https page works, e.g. your GitHub repo's page. Paste the exact same one here.</li>
    <li>Under <b>Roles</b>, add each co-worker's Instagram as an <b>Instagram Tester</b>. They accept in Instagram → Settings → Website permissions.</li>
    <li>Copy the <b>Instagram app ID</b> and <b>secret</b> here.</li></ol>`,
  tiktok: `<ol class="steps"><li>At <button class="link" data-url="https://developers.tiktok.com/apps/">TikTok for Developers</button>, create an app.</li>
    <li>Add <b>Login Kit</b> and <b>Content Posting API</b>. Add the scopes <b>video.upload</b> and <b>video.publish</b>.</li>
    <li>Add a redirect URI (any https page, e.g. your GitHub repo page) and paste the same one here.</li>
    <li>Submit for review. Until it's approved, videos go to each person's TikTok inbox as drafts.</li></ol>`,
};
function renderTeamKeys() {
  const body = `<h1>Team keys</h1>
    <p>Each social network needs one "developer app" for your whole team. <b>One person</b> makes these once, then clicks <b>Share with co-workers</b> to save a file everyone else imports. Co-workers never need this page.</p>
    <div class="row" style="margin-bottom:18px"><button class="btn ghost" id="imp">Import team keys file</button><button class="btn ghost" id="exp">Share with co-workers</button></div>
    ${Object.keys(KEY_FIELDS).map(p => `<details class="card" ${teamKeysFocus === p ? 'open' : ''} data-k="${p}"><summary>${PLAT[p].name} ${S.teamKeys[p] ? '✓' : ''}</summary>
      <div style="margin-top:12px">${KEY_HELP[p]}
      ${KEY_FIELDS[p].map(([k, l]) => `<label class="f">${l}</label><input type="text" data-f="${k}" style="margin-bottom:10px" autocomplete="off">`).join('')}
      <button class="btn small" data-save="${p}">Save ${PLAT[p].name} keys</button><div class="err"></div></div></details>`).join('')}
    <div class="row"><button class="btn" id="back">Back</button></div>`;
  if (S.setupDone) dashShell(body); else setupShell(body);
  bindUrls();
  $('#imp').onclick = async () => { const k = await window.va.importTeamKeys(); if (k) { S.teamKeys = k; render(); toast('Team keys imported ✓'); } };
  $('#exp').onclick = async () => { if (await window.va.exportTeamKeys()) toast('Saved. Send that file to your co-workers privately (not in a public place)', 6000); };
  app.querySelectorAll('[data-save]').forEach(b => b.onclick = () => busy(b, async () => {
    const p = b.dataset.save, box = b.closest('details'), keys = {};
    box.querySelectorAll('[data-f]').forEach(i => { if (i.value.trim()) keys[i.dataset.f] = i.value.trim(); });
    if (Object.keys(keys).length < KEY_FIELDS[p].length) throw new Error('Fill in every box.');
    S.teamKeys = await window.va.saveTeamKeys({ keys: { [p]: keys } }); render();
  }, 'Keys saved ✓'));
  $('#back').onclick = () => go(S.setupDone ? 'accounts-d' : 'accounts');
}

// ================= DASHBOARD =================
const DASH = [['home', 'Home'], ['ideas', 'Video ideas'], ['channel', 'Video topic'], ['accounts-d', 'Accounts'], ['settings', 'Settings']];
function dashShell(inner) {
  app.innerHTML = `<div class="shell">
    <aside class="side">
      <div class="brand"><img class="logo" src="../build/icon.png" alt="">Video<br>Autopilot</div>
      ${DASH.map(([k, l]) => `<button class="nav ${k === view ? 'on' : ''}" data-go="${k}">${l}</button>`).join('')}
      <div class="grow"></div><small>${esc(S.login || '')}</small>
    </aside>
    <main class="main"><div class="wrap">${inner}</div></main></div>`;
  app.querySelectorAll('[data-go]').forEach(b => b.onclick = () => go(b.dataset.go));
}
const fmt = (iso) => new Date(iso).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
function runPill(r) {
  if (r.status !== 'completed') return `<span class="pill warn"><span class="spin" style="width:10px;height:10px"></span> Making</span>`;
  return r.conclusion === 'success' ? '<span class="pill good">Done</span>' : '<span class="pill bad">Failed</span>';
}
async function loadDash() {
  try { D = await window.va.dashboard(); } catch (e) { D = { error: e.message }; }
}

async function renderHome() {
  dashShell(`<h1>Home</h1><p class="muted"><span class="spin"></span> Loading…</p>`);
  await loadDash();
  if (view !== 'home') return;
  if (D.error) { dashShell(`<h1>Home</h1><div class="card"><p class="err">${esc(D.error)}</p><button class="btn" id="retry">Try again</button></div>`); $('#retry').onclick = render; return; }
  const on = !D.paused, live = D.runs.find(r => r.status !== 'completed');
  const posting = Object.keys(PLAT).filter(p => D.connected[p]);
  dashShell(`<h1>Home</h1>
  <div class="card"><div class="big-status"><div class="dot ${on ? 'on' : ''}"></div>
    <div style="flex:1"><h2 style="margin:0">${on ? 'Autopilot is on' : 'Autopilot is paused'}</h2>
    <p style="margin:0">${on ? `Making 3 videos a day${D.testMode ? ' in <b>test mode</b> (not posting)' : posting.length ? ` and posting to ${posting.map(p => PLAT[p].name).join(', ')}` : ', <b>not posting</b> (no accounts connected)'}.` : 'No videos will be made until you turn it back on.'}</p></div>
    <label class="switch"><input type="checkbox" id="onoff" ${on ? 'checked' : ''}><span class="t"></span></label></div>
    ${!D.connected.claude ? `<p class="err">Claude isn't connected, so videos can't be made. <button class="link" id="fixc">Fix</button></p>` : ''}
  </div>
  <div class="card"><h2>Make a video now</h2>
    <label class="f" for="topic">Topic (optional)</label>
    <input type="text" id="topic" placeholder="Leave blank to use the next idea on your list, e.g. “Zombie plane, part 4”">
    <div class="row between" style="margin-top:12px">
      <label class="switch"><input type="checkbox" id="test"><span class="t"></span>Test only (don't post)</label>
      <button class="btn" id="make" ${live ? 'disabled' : ''}>${live ? 'One is already being made' : 'Make it'}</button></div>
    <div class="err"></div></div>
  <div class="card"><div class="row between"><h2 style="margin:0">Recent videos</h2><button class="btn ghost small" id="ref">Refresh</button></div>
    ${D.runs.length ? `<ul class="runs" style="margin-top:8px">${D.runs.map(r => `<li>
      <span class="when">${fmt(r.created)}</span>${runPill(r)}
      <span class="what">${esc(titleFor(r))}</span>
      ${r.status === 'completed' && r.conclusion === 'success' ? `<button class="btn small" data-watch="${r.id}">Watch</button>` :
        r.status === 'completed' ? `<button class="btn ghost small" data-url="${esc(r.url)}">Details</button>` : ''}</li>`).join('')}</ul>`
      : `<p class="muted" style="margin-top:8px">No videos yet. The first one starts at the next scheduled time, or press <b>Make it</b>.</p>`}
  </div>`);
  bindUrls();
  $('#onoff').onchange = async (e) => { await window.va.setVar({ name: 'AUTOPILOT_PAUSED', value: e.target.checked ? 'false' : 'true' }); toast(e.target.checked ? 'Autopilot on' : 'Autopilot paused'); renderHome(); };
  if ($('#fixc')) $('#fixc').onclick = () => go('accounts-d');
  $('#make').onclick = (e) => busy(e.currentTarget, async () => {
    await window.va.makeVideo({ topic: $('#topic').value.trim(), test: $('#test').checked });
    setTimeout(renderHome, 4000);
  }, 'Started! It takes about 15–30 minutes');
  $('#ref').onclick = renderHome;
  app.querySelectorAll('[data-watch]').forEach(b => b.onclick = () => watch(b, +b.dataset.watch));
  clearTimeout(renderHome.t);
  if (live) renderHome.t = setTimeout(() => { if (view === 'home') renderHome(); }, 60000);
}
function titleFor(r) {
  if (r.status === 'completed' && r.conclusion !== 'success') return r.event === 'schedule' ? 'Scheduled video' : 'Video';
  const h = D.history.find(x => Math.abs(new Date(x.date) - new Date(r.created)) < 100 * 60 * 1000 && new Date(x.date) >= new Date(r.created));
  if (h) return h.title || h.topic || 'Video';
  return r.event === 'schedule' ? 'Scheduled video' : 'Video';
}

async function watch(btn, runId) {
  const v = await busy(btn, () => window.va.getVideo({ runId }));
  const p = v.post || {};
  dashShell(`<button class="link" id="back">← Back</button>
    <h1 style="margin-top:10px">${esc(p.title || 'Your video')}</h1>
    <div class="video-view">
      <div><video src="file://${encodeURI(v.mp4.replace(/\\/g, '/'))}" controls></video>
        <div class="row" style="margin-top:10px"><button class="btn small ghost" id="folder">Show file</button></div></div>
      <div>
        ${p.tiktok_caption ? `<label class="f">TikTok caption</label><div class="cap">${esc(p.tiktok_caption)}<button class="btn small" data-copy="tiktok_caption">Copy</button></div>` : ''}
        ${p.youtube_title ? `<label class="f">YouTube title</label><div class="cap">${esc(p.youtube_title)}<button class="btn small" data-copy="youtube_title">Copy</button></div>` : ''}
        ${p.youtube_description ? `<label class="f">YouTube description</label><div class="cap">${esc(p.youtube_description)}<button class="btn small" data-copy="youtube_description">Copy</button></div>` : ''}
        ${p.instagram_caption ? `<label class="f">Instagram caption</label><div class="cap">${esc(p.instagram_caption)}<button class="btn small" data-copy="instagram_caption">Copy</button></div>` : ''}
      </div></div>`);
  $('#back').onclick = () => go('home');
  $('#folder').onclick = () => window.va.showInFolder({ p: v.mp4 });
  app.querySelectorAll('[data-copy]').forEach(b => b.onclick = () => { navigator.clipboard.writeText(p[b.dataset.copy]); toast('Copied'); });
}

async function renderFileEditor(title, help, file, placeholder) {
  dashShell(`<h1>${title}</h1><p class="muted"><span class="spin"></span> Loading…</p>`);
  let text = '';
  try { text = await window.va.readFile({ path: file }); } catch (e) { toast(e.message, 6000); }
  if (!['ideas', 'channel-raw'].includes(view)) return;
  dashShell(`<h1>${title}</h1><p>${help}</p>
    <div class="card"><textarea id="ed" placeholder="${esc(placeholder)}">${esc(text)}</textarea>
    <div class="row" style="margin-top:12px"><button class="btn" id="save">Save</button></div><div class="err"></div></div>`);
  $('#save').onclick = (e) => busy(e.currentTarget, () => window.va.writeFile({ path: file, text: $('#ed').value }), 'Saved ✓');
}

function renderAccountsDash() {
  dashShell(`<h1>Accounts</h1>
    <div class="card"><div class="plat"><div class="ico">AI</div><div class="grow"><b>Claude</b><br>
      ${S.accounts.claude ? `<span class="pill good">${esc(S.accounts.claude)}</span>` : '<span class="pill bad">Not connected</span>'}</div>
      <button class="btn ghost small" id="cl">Change</button></div></div>
    ${Object.keys(PLAT).map(p => platCard(p)).join('')}
    <p class="muted">Missing keys? <button class="link" id="tk">Team keys</button></p>`);
  bindPlat();
  $('#cl').onclick = () => { S.accounts.claude = null; go('claude-d'); };
  $('#tk').onclick = () => go('teamkeys');
}
function renderClaudeDash() { renderClaude(true); }

async function renderSettings() {
  dashShell(`<h1>Settings</h1><p class="muted"><span class="spin"></span> Loading…</p>`);
  let times = [], d = D;
  try { [times, d] = await Promise.all([window.va.getSchedule(), D ? D : window.va.dashboard()]); D = d; } catch (e) { toast(e.message, 6000); }
  if (view !== 'settings') return;
  const toLocal = (t) => { const x = new Date(); x.setUTCHours(t.h, t.m, 0, 0); return `${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`; };
  dashShell(`<h1>Settings</h1>
  <div class="card"><h2>Posting times</h2><p>Your local time. One video is made at each time (it goes live about 20 minutes later).</p>
    <div class="grid3">${(times.length ? times : [{ h: 15, m: 17 }, { h: 19, m: 17 }, { h: 0, m: 17 }]).map((t, i) => `<input type="time" class="tm" value="${toLocal(t)}">`).join('')}</div>
    <div class="row" style="margin-top:12px"><button class="btn" id="savet">Save times</button></div><div class="err"></div></div>
  <div class="card stack"><h2>Options</h2>
    <label class="switch"><input type="checkbox" id="tm" ${d && d.testMode ? 'checked' : ''}><span class="t"></span><span><b>Test mode</b>: make videos but never post them</span></label>
    <label class="switch"><input type="checkbox" id="tt" ${d && d.tiktokMode === 'inbox' ? 'checked' : ''}><span class="t"></span><span><b>TikTok drafts</b>: send to your TikTok inbox instead of posting (needed until TikTok approves the app)</span></label>
  </div>
  <div class="card stack"><h2>Team</h2>
    <p>Share your team keys so co-workers can connect with one click. Send the file privately.</p>
    <div class="row"><button class="btn ghost" id="tk">Team keys</button><button class="btn ghost" id="share">Share with co-workers</button></div>
    <p class="muted" style="margin:0">Co-workers download this same app, choose <b>Import team keys</b>, and follow the steps. Each person gets their own copy, Claude and accounts.</p></div>
  <div class="card stack"><h2>Your copy</h2>
    <p style="margin:0">${esc(S.repo)} · <button class="link" data-url="https://github.com/${esc(S.repo)}">Open on GitHub</button></p>
    <div class="row"><button class="btn ghost small" id="setup">Run setup again</button><button class="btn ghost small" id="out">Sign out of this app</button></div></div>`);
  bindUrls();
  $('#savet').onclick = (e) => busy(e.currentTarget, async () => {
    const ts = [...app.querySelectorAll('.tm')].map(i => i.value).filter(Boolean).map(v => {
      const [h, m] = v.split(':').map(Number); const x = new Date(); x.setHours(h, m, 0, 0); return { h: x.getUTCHours(), m: x.getUTCMinutes() };
    });
    if (!ts.length) throw new Error('Pick at least one time.');
    await window.va.setSchedule({ times: ts });
  }, 'Times saved ✓');
  $('#tm').onchange = async (e) => { await window.va.setVar({ name: 'DRY_RUN', value: e.target.checked ? 'true' : 'false' }); D.testMode = e.target.checked; toast('Saved'); };
  $('#tt').onchange = async (e) => { await window.va.setVar({ name: 'TIKTOK_MODE', value: e.target.checked ? 'inbox' : 'direct' }); D.tiktokMode = e.target.checked ? 'inbox' : 'direct'; toast('Saved'); };
  $('#tk').onclick = () => go('teamkeys');
  $('#share').onclick = async () => { if (await window.va.exportTeamKeys()) toast('Saved. Send it to co-workers privately', 5000); };
  $('#setup').onclick = async () => { await window.va.reopenSetup(); S.setupDone = false; go('welcome'); };
  $('#out').onclick = async () => { if (confirm('Sign out? Your videos keep being made on GitHub. You can sign back in with a new token.')) { await window.va.signOut(); await refresh(); go('welcome'); } };
}

// ================= wiring =================
function bindUrls() { app.querySelectorAll('[data-url]').forEach(b => b.onclick = () => open(b.dataset.url)); }
async function refresh() { S = await window.va.state(); }
function render() {
  const map = {
    welcome: renderWelcome, github: renderGitHub, claude: () => renderClaude(false), accounts: renderAccounts, ready: renderReady,
    teamkeys: renderTeamKeys, home: renderHome, 'accounts-d': renderAccountsDash, settings: renderSettings, 'claude-d': renderClaudeDash,
    ideas: () => renderFileEditor('Video ideas', 'One idea per line. The autopilot uses them from the top and crosses each one off. When the list is empty, Claude picks ideas itself, continuing your series.', 'autopilot/topics.txt', 'Zombie plane, part 4\nWhy do cats purr?'),
    channel: () => renderTopic(true), topic: () => renderTopic(false),
    'channel-raw': () => renderFileEditor('Full channel brief', 'Everything Claude reads before each video, including the safety rules. Most people only need the simple box on the previous page.', 'autopilot/channel.md', '# My channel…'),
  };
  (map[view] || renderWelcome)();
}
(async () => {
  await refresh();
  view = S.setupDone && S.github ? 'home' : S.github ? (S.accounts.claude ? 'accounts' : 'claude') : 'welcome';
  render();
})();
