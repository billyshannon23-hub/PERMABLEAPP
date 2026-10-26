const { contextBridge, ipcRenderer } = require('electron');

// contextBridge copies plain objects only (a Proxy arrives empty), so every call is listed here.
// Keep in sync with `handlers` in main.js; `npm test` checks this.
const CALLS = ['state', 'connectGitHub', 'connectClaude', 'connectPlatform', 'disconnect', 'importTeamKeys',
  'saveTeamKeys', 'exportTeamKeys', 'setTemplate', 'finishSetup', 'reopenSetup', 'signOut', 'dashboard', 'setVar',
  'makeVideo', 'readFile', 'writeFile', 'getSchedule', 'setSchedule', 'getVideo', 'openPath', 'showInFolder', 'openExternal'];

const api = {};
for (const name of CALLS) {
  api[name] = async (arg) => {
    const r = await ipcRenderer.invoke(name, arg);
    if (!r.ok) throw new Error(r.error);
    return r.data;
  };
}
contextBridge.exposeInMainWorld('va', api);
