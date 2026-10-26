const { contextBridge, ipcRenderer } = require('electron');

// Every call returns the data or throws an Error with a friendly message.
contextBridge.exposeInMainWorld('va', new Proxy({}, {
  get: (_t, name) => async (arg) => {
    const r = await ipcRenderer.invoke(name, arg);
    if (!r.ok) throw new Error(r.error);
    return r.data;
  },
}));
