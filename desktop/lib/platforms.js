// Sign-in flows for YouTube, Instagram and TikTok. Each returns the GitHub secrets to save.
// `openAuth(url, redirectPrefix)` is supplied by main.js and resolves with the full redirect URL.
// `openBrowserLoopback(buildUrl)` opens the system browser with a local callback server (Google requires this).

const form = (o) => new URLSearchParams(o).toString();
const codeFrom = (u) => {
  const q = new URL(u).searchParams;
  if (q.get('error')) throw new Error(q.get('error_description') || q.get('error'));
  const c = q.get('code');
  if (!c) throw new Error('Sign-in was cancelled.');
  return c.replace(/#_$/, '');
};

async function postForm(url, body) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form(body) });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, j };
}

async function youtube(keys, { openBrowserLoopback }) {
  const { client_id, client_secret } = keys;
  if (!client_id || !client_secret) throw new Error('YouTube keys are missing. Add team keys first.');
  const { code, redirect } = await openBrowserLoopback((redirect) =>
    'https://accounts.google.com/o/oauth2/v2/auth?' + form({
      client_id, redirect_uri: redirect, response_type: 'code', access_type: 'offline', prompt: 'consent',
      scope: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly',
    }));
  const { j } = await postForm('https://oauth2.googleapis.com/token', {
    code, client_id, client_secret, redirect_uri: redirect, grant_type: 'authorization_code',
  });
  if (!j.refresh_token) throw new Error('Google: ' + (j.error_description || j.error || 'no refresh token'));
  let account = 'YouTube';
  try {
    const ch = await (await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
      { headers: { Authorization: `Bearer ${j.access_token}` } })).json();
    account = ch.items?.[0]?.snippet?.title || account;
  } catch { /* name is optional */ }
  return { account, secrets: { YOUTUBE_CLIENT_ID: client_id, YOUTUBE_CLIENT_SECRET: client_secret, YOUTUBE_REFRESH_TOKEN: j.refresh_token } };
}

async function instagram(keys, { openAuth }) {
  const { app_id, app_secret, redirect_uri } = keys;
  if (!app_id || !app_secret || !redirect_uri) throw new Error('Instagram keys are missing. Add team keys first.');
  const back = await openAuth('https://www.instagram.com/oauth/authorize?' + form({
    client_id: app_id, redirect_uri, response_type: 'code',
    scope: 'instagram_business_basic,instagram_business_content_publish',
  }), redirect_uri);
  const code = codeFrom(back);
  const s = await postForm('https://api.instagram.com/oauth/access_token', {
    client_id: app_id, client_secret: app_secret, grant_type: 'authorization_code', redirect_uri, code,
  });
  if (!s.j.access_token) throw new Error('Instagram: ' + (s.j.error_message || JSON.stringify(s.j)));
  const l = await (await fetch('https://graph.instagram.com/access_token?' + form({
    grant_type: 'ig_exchange_token', client_secret: app_secret, access_token: s.j.access_token }))).json();
  if (!l.access_token) throw new Error('Instagram: ' + JSON.stringify(l.error || l));
  const me = await (await fetch('https://graph.instagram.com/me?' + form({ fields: 'user_id,username', access_token: l.access_token }))).json();
  return { account: me.username ? '@' + me.username : 'Instagram',
    secrets: { INSTAGRAM_USER_ID: String(me.user_id || s.j.user_id), INSTAGRAM_TOKEN: l.access_token } };
}

async function tiktok(keys, { openAuth }) {
  const { client_key, client_secret, redirect_uri } = keys;
  if (!client_key || !client_secret || !redirect_uri) throw new Error('TikTok keys are missing. Add team keys first.');
  const back = await openAuth('https://www.tiktok.com/v2/auth/authorize/?' + form({
    client_key, redirect_uri, response_type: 'code', state: Math.random().toString(36).slice(2),
    scope: 'user.info.basic,video.publish,video.upload',
  }), redirect_uri);
  const code = decodeURIComponent(codeFrom(back));
  const { j } = await postForm('https://open.tiktokapis.com/v2/oauth/token/', {
    client_key, client_secret, code, grant_type: 'authorization_code', redirect_uri,
  });
  if (!j.refresh_token) throw new Error('TikTok: ' + (j.error_description || j.error || JSON.stringify(j)));
  let account = 'TikTok';
  try {
    const u = await (await fetch('https://open.tiktokapis.com/v2/user/info/?fields=display_name',
      { headers: { Authorization: `Bearer ${j.access_token}` } })).json();
    account = u.data?.user?.display_name || account;
  } catch { /* optional */ }
  return { account, secrets: { TIKTOK_CLIENT_KEY: client_key, TIKTOK_CLIENT_SECRET: client_secret, TIKTOK_REFRESH_TOKEN: j.refresh_token } };
}

async function checkClaudeKey(key) {
  if (key.startsWith('sk-ant-oat')) return { secret: 'CLAUDE_CODE_OAUTH_TOKEN', label: 'Claude subscription' };
  if (!key.startsWith('sk-ant-')) throw new Error("That doesn't look like a Claude key. It should start with sk-ant-");
  const r = await fetch('https://api.anthropic.com/v1/models?limit=1', {
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' } });
  if (r.status === 401) throw new Error('Claude says that key is not valid. Copy it again from the Console.');
  return { secret: 'ANTHROPIC_API_KEY', label: 'Claude API key' };
}

const SECRETS = {
  claude: ['ANTHROPIC_API_KEY', 'CLAUDE_CODE_OAUTH_TOKEN'],
  youtube: ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'YOUTUBE_REFRESH_TOKEN'],
  instagram: ['INSTAGRAM_USER_ID', 'INSTAGRAM_TOKEN'],
  tiktok: ['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET', 'TIKTOK_REFRESH_TOKEN'],
};

module.exports = { youtube, instagram, tiktok, checkClaudeKey, codeFrom, SECRETS };
