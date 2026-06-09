const { contextBridge, ipcRenderer } = require('electron');

// ============================================================
// NeuSSH Preload Script - Secure IPC Bridge
// ============================================================

// Validation helpers
const validateString = (value, name) => {
  if (typeof value !== 'string') {
    throw new TypeError(`${name} must be a string`);
  }
  return value;
};

const validateObject = (value, name) => {
  if (!value || typeof value !== 'object') {
    throw new TypeError(`${name} must be an object`);
  }
  return value;
};

const validateFunction = (value, name) => {
  if (typeof value !== 'function') {
    throw new TypeError(`${name} must be a function`);
  }
  return value;
};

// Expose protected APIs to renderer
contextBridge.exposeInMainWorld('neusshAPI', {
  // Profile management
  getProfiles: () => ipcRenderer.invoke('profile:getAll'),
  
  saveProfile: (profile) => {
    validateObject(profile, 'profile');
    return ipcRenderer.invoke('profile:save', profile);
  },
  
  deleteProfile: (id) => {
    validateString(id, 'id');
    return ipcRenderer.invoke('profile:delete', id);
  },
  
  reorderProfiles: (ids) => {
    if (!Array.isArray(ids)) {
      throw new TypeError('ids must be an array');
    }
    return ipcRenderer.invoke('profile:reorder', ids);
  },
  
  importProfiles: (filePath) => {
    validateString(filePath, 'filePath');
    return ipcRenderer.invoke('profile:import', filePath);
  },
  
  exportProfiles: (filePath) => {
    validateString(filePath, 'filePath');
    return ipcRenderer.invoke('profile:export', filePath);
  },
  
  // SSH operations
  connectSSH: (profile) => {
    validateObject(profile, 'profile');
    return ipcRenderer.invoke('ssh:connect', profile);
  },
  
  sendSSH: (connectionId, data) => {
    validateString(connectionId, 'connectionId');
    validateString(data, 'data');
    return ipcRenderer.invoke('ssh:send', { connectionId, data });
  },
  
  resizeSSH: (connectionId, cols, rows) => {
    validateString(connectionId, 'connectionId');
    return ipcRenderer.invoke('ssh:resize', { connectionId, cols, rows });
  },
  
  disconnectSSH: (connectionId) => {
    validateString(connectionId, 'connectionId');
    return ipcRenderer.invoke('ssh:disconnect', connectionId);
  },
  
  // SSH event listeners with automatic cleanup
  onSSHData: (connectionId, callback) => {
    validateString(connectionId, 'connectionId');
    validateFunction(callback, 'callback');
    
    const handler = (event, data) => callback(data);
    const channel = `ssh:data:${connectionId}`;
    ipcRenderer.on(channel, handler);
    
    // Return cleanup function
    return () => {
      ipcRenderer.removeListener(channel, handler);
    };
  },
  
  onSSHClose: (connectionId, callback) => {
    validateString(connectionId, 'connectionId');
    validateFunction(callback, 'callback');
    
    const handler = () => callback();
    const channel = `ssh:close:${connectionId}`;
    ipcRenderer.on(channel, handler);
    
    // Return cleanup function
    return () => {
      ipcRenderer.removeListener(channel, handler);
    };
  },
  
  // Dialogs
  selectKeyFile: () => ipcRenderer.invoke('dialog:selectKey'),
  selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
  exportProfilesDialog: () => ipcRenderer.invoke('dialog:exportProfiles'),
  importProfilesDialog: () => ipcRenderer.invoke('dialog:importProfiles'),
  
  // System
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getAppName: () => ipcRenderer.invoke('app:getName'),
  openExternal: (url) => {
    validateString(url, 'url');
    return ipcRenderer.invoke('shell:openExternal', url);
  }
});

// Log preload success
console.log('[NeuSSH] Preload script loaded successfully');
