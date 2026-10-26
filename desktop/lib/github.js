// Small GitHub REST client for the app (uses global fetch).
const { encryptSecret } = require('./sealed');

class GitHub {
  constructor(token, repo) { this.token = token; this.repo = repo; }

  async api(path, opts = {}) {
    const r = await fetch(path.startsWith('http') ? path : `https://api.github.com${path}`, {
      method: opts.method || 'GET',
      headers: {
        Authorization: `Bearer ${this.token}`, Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'video-autopilot',
        ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      redirect: opts.redirect || 'follow',
    });
    if (opts.raw) return r;
    const text = await r.text();
    const data = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;
    if (!r.ok && !(opts.ok404 && r.status === 404)) {
      const msg = (data && data.message) || r.statusText;
      const e = new Error(`GitHub: ${msg} (${r.status})`); e.status = r.status; throw e;
    }
    return r.status === 404 ? null : data;
  }

  user() { return this.api('/user'); }

  async scopes() {
    const r = await this.api('/user', { raw: true });
    if (!r.ok) throw new Error('That GitHub token did not work. Make a new one and paste it again.');
    return (r.headers.get('x-oauth-scopes') || '').split(',').map(s => s.trim()).filter(Boolean);
  }

  getRepo(full) { return this.api(`/repos/${full}`, { ok404: true }); }

  async createFromTemplate(template, owner, name) {
    return this.api(`/repos/${template}/generate`, {
      method: 'POST', body: { owner, name, private: false, include_all_branches: false,
        description: 'My Video Autopilot (made with the Video Autopilot app)' },
    });
  }

  // --- secrets ---
  async setSecret(name, value) {
    if (!this._pk) this._pk = await this.api(`/repos/${this.repo}/actions/secrets/public-key`);
    await this.api(`/repos/${this.repo}/actions/secrets/${name}`, {
      method: 'PUT', body: { encrypted_value: encryptSecret(this._pk.key, value), key_id: this._pk.key_id },
    });
  }
  async secretNames() {
    const d = await this.api(`/repos/${this.repo}/actions/secrets?per_page=100`);
    return d.secrets.map(s => s.name);
  }
  deleteSecret(name) { return this.api(`/repos/${this.repo}/actions/secrets/${name}`, { method: 'DELETE', ok404: true }); }

  // --- variables ---
  async getVars() {
    const d = await this.api(`/repos/${this.repo}/actions/variables?per_page=100`);
    return Object.fromEntries(d.variables.map(v => [v.name, v.value]));
  }
  async setVar(name, value) {
    const r = await this.api(`/repos/${this.repo}/actions/variables/${name}`, { raw: true });
    if (r.ok) await this.api(`/repos/${this.repo}/actions/variables/${name}`, { method: 'PATCH', body: { name, value } });
    else await this.api(`/repos/${this.repo}/actions/variables`, { method: 'POST', body: { name, value } });
  }

  // --- files ---
  async readFile(path) {
    const d = await this.api(`/repos/${this.repo}/contents/${path}`, { ok404: true });
    if (!d) return { text: '', sha: null };
    return { text: Buffer.from(d.content, 'base64').toString('utf8'), sha: d.sha };
  }
  async writeFile(path, text, message) {
    const cur = await this.readFile(path);
    return this.api(`/repos/${this.repo}/contents/${path}`, {
      method: 'PUT', body: { message, content: Buffer.from(text, 'utf8').toString('base64'), ...(cur.sha ? { sha: cur.sha } : {}) },
    });
  }

  // --- actions ---
  async enableActions() {
    try { await this.api(`/repos/${this.repo}/actions/permissions`, { method: 'PUT', body: { enabled: true, allowed_actions: 'all' } }); } catch { /* not fatal */ }
    try { await this.api(`/repos/${this.repo}/actions/workflows/make-videos.yml/enable`, { method: 'PUT' }); } catch { /* not fatal */ }
  }
  runVideo(inputs) {
    return this.api(`/repos/${this.repo}/actions/workflows/make-videos.yml/dispatches`, {
      method: 'POST', body: { ref: 'main', inputs },
    });
  }
  async runs() {
    const d = await this.api(`/repos/${this.repo}/actions/workflows/make-videos.yml/runs?per_page=15`, { ok404: true });
    return d ? d.workflow_runs : [];
  }
  async runArtifacts(runId) {
    const d = await this.api(`/repos/${this.repo}/actions/runs/${runId}/artifacts`);
    return d.artifacts;
  }
  async downloadArtifact(id) {
    const r = await this.api(`/repos/${this.repo}/actions/artifacts/${id}/zip`, { raw: true });
    if (!r.ok) throw new Error(`Could not download the video (${r.status})`);
    return Buffer.from(await r.arrayBuffer());
  }
}

module.exports = { GitHub };
