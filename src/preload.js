const { contextBridge, ipcRenderer } = require('electron');

// ============================================================
// NeuSSH Preload Script
// Secure IPC bridge between main and renderer processes
// ============================================================

contextBridge.exposeInMainWorld('neusshAPI', {
  // Profile management
  getProfiles: () => ipcRenderer.invoke('profile:getAll'),
  saveProfile: (profile) => ipcRenderer.invoke('profile:save', profile),
  deleteProfile: (id) => ipcRenderer.invoke('profile:delete', id),
  reorderProfiles: (ids) => ipcRenderer.invoke('profile:reorder', ids),
  importProfiles: (filePath) => ipcRenderer.invoke('profile:import', filePath),
  exportProfiles: (filePath) => ipcRenderer.invoke('profile:export', filePath),
  
  // SSH operations
  connectSSH: (profile) => ipcRenderer.invoke('ssh:connect', profile),
  sendSSH: (connectionId, data) => ipcRenderer.invoke('ssh:send', { connectionId, data }),
  resizeSSH: (connectionId, cols, rows) => ipcRenderer.invoke('ssh:resize', { connectionId, cols, rows }),
  disconnectSSH: (connectionId) => ipcRenderer.invoke('ssh:disconnect', connectionId),
  
  // SSH event listeners
  onSSHData: (connectionId, callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on(`ssh:data:${connectionId}`, handler);
    return () => ipcRenderer.removeListener(`ssh:data:${connectionId}`, handler);
  },
  onSSHClose: (connectionId, callback) => {
    const handler = () => callback();
    ipcRenderer.on(`ssh:close:${connectionId}`, handler);
    return () => ipcRenderer.removeListener(`ssh:close:${connectionId}`, handler);
  },
  
  // Dialogs
  selectKeyFile: () => ipcRenderer.invoke('dialog:selectKey'),
  selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
  exportProfilesDialog: () => ipcRenderer.invoke('dialog:exportProfiles'),
  importProfilesDialog: () => ipcRenderer.invoke('dialog:importProfiles'),
  
  // System
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getAppName: () => ipcRenderer.invoke('app:getName'),
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url)
});
