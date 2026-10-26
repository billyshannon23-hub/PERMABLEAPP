// Opens the real app and checks the first screen draws. Run in CI with: xvfb-run node test/smoke.js
const { _electron: electron } = require('playwright-core');
const path = require('path');

(async () => {
  const app = await electron.launch({
    args: [path.join(__dirname, '..'), '--no-sandbox'],
    env: { ...process.env, ELECTRON_ENABLE_LOGGING: '1' },
  });
  const win = await app.firstWindow();
  const errors = [];
  win.on('pageerror', (e) => errors.push(e.message));
  win.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await win.waitForSelector('h1', { timeout: 20000 });
  const title = await win.textContent('h1');
  await win.screenshot({ path: path.join(__dirname, '..', 'dist', 'smoke.png') });
  const hasApi = await win.evaluate(() => typeof window.va?.state === 'function');
  await app.close();
  console.log('first screen:', title, '| api ok:', hasApi, '| errors:', errors);
  if (!hasApi || !/video autopilot/i.test(title) || errors.length) process.exit(1);
})().catch((e) => { console.error(e); process.exit(1); });
