// Sanity checks run before every installer build: `npm test`.
const fs = require('fs');
const path = require('path');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

const main = read('main.js'), preload = read('preload.js'), app = read('renderer/app.js');
const handlers = [...main.match(/const handlers = \{([\s\S]*?)\n\};/)[1].matchAll(/^  (?:async )?(\w+)\(/gm)].map(m => m[1]);
const exposed = JSON.parse(preload.match(/const CALLS = (\[[\s\S]*?\]);/)[1].replace(/'/g, '"'));
const used = [...new Set([...app.matchAll(/window\.va\.(\w+)/g)].map(m => m[1]))];

let bad = 0;
for (const u of used) if (!exposed.includes(u)) { console.error(`app.js uses va.${u} but preload doesn't expose it`); bad++; }
for (const e of exposed) if (!handlers.includes(e)) { console.error(`preload exposes ${e} but main.js has no handler`); bad++; }
for (const h of handlers) if (!exposed.includes(h)) { console.error(`main.js handler ${h} isn't exposed in preload`); bad++; }
for (const f of ['main.js', 'preload.js', 'renderer/app.js', 'lib/github.js', 'lib/platforms.js', 'lib/sealed.js', 'lib/unzip.js']) {
  try { new Function(read(f).replace(/^#!.*/, '')); } catch (e) { if (!/import|export/.test(e.message)) { console.error(f, e.message); bad++; } }
}
if (bad) process.exit(1);
console.log(`ok: ${used.length} calls used, ${exposed.length} exposed, ${handlers.length} handlers`);
