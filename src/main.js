const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { Client } = require('ssh2');
const { readFileSync } = require('fs');
const { v4: uuidv4 } = require('uuid');

// ============================================================
// NeuSSH - Modern SSH Connection Manager
// https://github.com/neussh/neussh
// ============================================================

const APP_NAME = 'NeuSSH';
const STORE_NAME = 'neussh-profiles';

// Initialize secure storage with encryption
const store = new Store({
  name: STORE_NAME,
  encryptionKey: 'neussh-secure-storage-v1-2024'
});

let mainWindow;
let activeConnections = new Map();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    title: APP_NAME,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false,
    backgroundColor: '#0f172a'
  });

  // Load renderer
  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on('closed', () => {
    // Clean up all SSH connections gracefully
    activeConnections.forEach((conn, id) => {
      try { conn.end(); } catch (e) {}
    });
    activeConnections.clear();
    mainWindow = null;
  });
}

// ============================================================
// IPC Handlers - Profile Management
// ============================================================

ipcMain.handle('profile:getAll', () => {
  return store.get('profiles', []);
});

ipcMain.handle('profile:save', (event, profile) => {
  const profiles = store.get('profiles', []);
  
  if (profile.id) {
    const index = profiles.findIndex(p => p.id === profile.id);
    if (index !== -1) {
      profiles[index] = { 
        ...profile, 
        updatedAt: new Date().toISOString() 
      };
    }
  } else {
    profile.id = uuidv4();
    profile.createdAt = new Date().toISOString();
    profile.updatedAt = profile.createdAt;
    profiles.push(profile);
  }
  
  store.set('profiles', profiles);
  return profile;
});

ipcMain.handle('profile:delete', (event, id) => {
  const profiles = store.get('profiles', []);
  const filtered = profiles.filter(p => p.id !== id);
  store.set('profiles', filtered);
  return true;
});

ipcMain.handle('profile:reorder', (event, orderedIds) => {
  const profiles = store.get('profiles', []);
  const reordered = orderedIds.map(id => profiles.find(p => p.id === id)).filter(Boolean);
  store.set('profiles', reordered);
  return true;
});

ipcMain.handle('profile:import', async (event, filePath) => {
  try {
    const data = require('fs').readFileSync(filePath, 'utf8');
    const imported = JSON.parse(data);
    const profiles = store.get('profiles', []);
    
    imported.forEach(profile => {
      if (!profiles.find(p => p.id === profile.id)) {
        profiles.push({ ...profile, id: uuidv4(), importedAt: new Date().toISOString() });
      }
    });
    
    store.set('profiles', profiles);
    return { success: true, count: imported.length };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('profile:export', async (event, filePath) => {
  try {
    const profiles = store.get('profiles', []);
    require('fs').writeFileSync(filePath, JSON.stringify(profiles, null, 2));
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ============================================================
// IPC Handlers - SSH Connection
// ============================================================

ipcMain.handle('ssh:connect', async (event, profile) => {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    const connectionId = uuidv4();
    
    conn.on('ready', () => {
      activeConnections.set(connectionId, conn);
      
      conn.shell((err, stream) => {
        if (err) {
          reject({ success: false, error: err.message });
          return;
        }
        
        stream.on('data', (data) => {
          event.sender.send(`ssh:data:${connectionId}`, data.toString('utf-8'));
        });
        
        stream.on('close', () => {
          event.sender.send(`ssh:close:${connectionId}`);
          activeConnections.delete(connectionId);
        });
        
        conn._stream = stream;
        
        resolve({ 
          success: true, 
          connectionId,
          message: `Connected to ${profile.host}` 
        });
      });
    });
    
    conn.on('error', (err) => {
      reject({ success: false, error: err.message });
    });
    
    conn.on('end', () => {
      activeConnections.delete(connectionId);
    });
    
    const config = {
      host: profile.host,
      port: parseInt(profile.port) || 22,
      username: profile.username,
      readyTimeout: 20000,
      keepaliveInterval: 10000
    };
    
    if (profile.authType === 'password') {
      config.password = profile.password;
    } else if (profile.authType === 'key' && profile.keyPath) {
      try {
        config.privateKey = readFileSync(profile.keyPath);
        if (profile.keyPassphrase) {
          config.passphrase = profile.keyPassphrase;
        }
      } catch (err) {
        reject({ success: false, error: `Cannot read key file: ${err.message}` });
        return;
      }
    } else if (profile.authType === 'agent') {
      config.agent = process.env.SSH_AUTH_SOCK;
    }
    
    conn.connect(config);
  });
});

ipcMain.handle('ssh:send', (event, { connectionId, data }) => {
  const conn = activeConnections.get(connectionId);
  if (conn && conn._stream) {
    conn._stream.write(data);
    return true;
  }
  return false;
});

ipcMain.handle('ssh:resize', (event, { connectionId, cols, rows }) => {
  const conn = activeConnections.get(connectionId);
  if (conn && conn._stream) {
    conn._stream.setWindow(rows, cols, 0, 0);
    return true;
  }
  return false;
});

ipcMain.handle('ssh:disconnect', (event, connectionId) => {
  const conn = activeConnections.get(connectionId);
  if (conn) {
    try { conn.end(); } catch (e) {}
    activeConnections.delete(connectionId);
  }
  return true;
});

// ============================================================
// IPC Handlers - File Dialogs & System
// ============================================================

ipcMain.handle('dialog:selectKey', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select SSH Private Key - NeuSSH',
    properties: ['openFile'],
    filters: [
      { name: 'SSH Keys', extensions: ['pem', 'ppk', 'key', 'rsa', 'ed25519'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('dialog:selectFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Folder - NeuSSH',
    properties: ['openDirectory']
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('dialog:exportProfiles', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export NeuSSH Profiles',
    defaultPath: 'neussh-profiles.json',
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  return result.canceled ? null : result.filePath;
});

ipcMain.handle('dialog:importProfiles', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Import NeuSSH Profiles',
    properties: ['openFile'],
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('shell:openExternal', (event, url) => {
  shell.openExternal(url);
});

ipcMain.handle('app:getVersion', () => {
  return app.getVersion();
});

ipcMain.handle('app:getName', () => {
  return APP_NAME;
});

// ============================================================
// App Lifecycle - FIXED
// ============================================================

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  // Create window when app is ready
  app.whenReady().then(() => {
    createWindow();
  }).catch(err => {
    console.error('Failed to create window:', err);
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  app.on('web-contents-created', (event, contents) => {
    contents.on('new-window', (event, navigationUrl) => {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    });
  });
}
