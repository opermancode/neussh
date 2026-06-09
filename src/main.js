const { app, BrowserWindow, ipcMain, dialog, shell, session } = require('electron');
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
const IS_DEV = !app.isPackaged;

// Initialize secure storage with encryption
const store = new Store({
  name: STORE_NAME,
  encryptionKey: 'neussh-secure-storage-v1-2024',
  clearInvalidConfig: true
});

// State management
let mainWindow = null;
const activeConnections = new Map();
const connectionListeners = new Map();

// ============================================================
// Window Management
// ============================================================

function createWindow() {
  if (mainWindow) {
    mainWindow.focus();
    return;
  }

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
      preload: path.join(__dirname, 'preload.js'),
      sandbox: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false
    },
    show: false,
    backgroundColor: '#0f172a'
  });

  // Load renderer
  if (IS_DEV) {
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
    cleanupAllConnections();
    mainWindow = null;
  });

  // Security: Prevent new window creation
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// ============================================================
// Connection Management
// ============================================================

function cleanupConnection(connectionId) {
  const conn = activeConnections.get(connectionId);
  if (conn) {
    try {
      conn.end();
    } catch (e) {
      console.error(`Error closing connection ${connectionId}:`, e.message);
    }
    activeConnections.delete(connectionId);
  }
  
  // Cleanup listeners
  const listeners = connectionListeners.get(connectionId);
  if (listeners) {
    listeners.forEach(cleanup => cleanup());
    connectionListeners.delete(connectionId);
  }
}

function cleanupAllConnections() {
  activeConnections.forEach((conn, id) => {
    cleanupConnection(id);
  });
}

// ============================================================
// IPC Handlers - Profile Management
// ============================================================

ipcMain.handle('profile:getAll', () => {
  try {
    return store.get('profiles', []);
  } catch (err) {
    console.error('Error getting profiles:', err);
    return [];
  }
});

ipcMain.handle('profile:save', (event, profile) => {
  try {
    const profiles = store.get('profiles', []);
    const now = new Date().toISOString();
    
    if (profile.id) {
      const index = profiles.findIndex(p => p.id === profile.id);
      if (index !== -1) {
        profiles[index] = { 
          ...profile, 
          updatedAt: now 
        };
      } else {
        return { success: false, error: 'Profile not found' };
      }
    } else {
      profile.id = uuidv4();
      profile.createdAt = now;
      profile.updatedAt = now;
      profiles.push(profile);
    }
    
    store.set('profiles', profiles);
    return { success: true, profile };
  } catch (err) {
    console.error('Error saving profile:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('profile:delete', (event, id) => {
  try {
    const profiles = store.get('profiles', []);
    const filtered = profiles.filter(p => p.id !== id);
    store.set('profiles', filtered);
    return { success: true };
  } catch (err) {
    console.error('Error deleting profile:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('profile:reorder', (event, orderedIds) => {
  try {
    const profiles = store.get('profiles', []);
    const reordered = orderedIds.map(id => profiles.find(p => p.id === id)).filter(Boolean);
    store.set('profiles', reordered);
    return { success: true };
  } catch (err) {
    console.error('Error reordering profiles:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('profile:import', async (event, filePath) => {
  try {
    const data = require('fs').readFileSync(filePath, 'utf8');
    const imported = JSON.parse(data);
    
    if (!Array.isArray(imported)) {
      return { success: false, error: 'Invalid file format: expected array' };
    }
    
    const profiles = store.get('profiles', []);
    let added = 0;
    
    imported.forEach(profile => {
      if (profile && typeof profile === 'object' && !profiles.find(p => p.id === profile.id)) {
        profiles.push({ 
          ...profile, 
          id: uuidv4(), 
          importedAt: new Date().toISOString() 
        });
        added++;
      }
    });
    
    store.set('profiles', profiles);
    return { success: true, count: added };
  } catch (err) {
    console.error('Error importing profiles:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('profile:export', async (event, filePath) => {
  try {
    const profiles = store.get('profiles', []);
    require('fs').writeFileSync(filePath, JSON.stringify(profiles, null, 2));
    return { success: true };
  } catch (err) {
    console.error('Error exporting profiles:', err);
    return { success: false, error: err.message };
  }
});

// ============================================================
// IPC Handlers - SSH Connection
// ============================================================

ipcMain.handle('ssh:connect', async (event, profile) => {
  return new Promise((resolve, reject) => {
    try {
      const conn = new Client();
      const connectionId = uuidv4();
      
      // Connection timeout
      const timeout = setTimeout(() => {
        cleanupConnection(connectionId);
        reject({ success: false, error: 'Connection timeout' });
      }, 30000);
      
      conn.on('ready', () => {
        clearTimeout(timeout);
        activeConnections.set(connectionId, conn);
        
        conn.shell((err, stream) => {
          if (err) {
            cleanupConnection(connectionId);
            reject({ success: false, error: err.message });
            return;
          }
          
          // Store stream reference
          conn._stream = stream;
          
          // Setup data listener - CHECK IF WINDOW EXISTS
          const onData = (data) => {
            try {
              // Check if sender window still exists and is not destroyed
              if (event.sender && !event.sender.isDestroyed()) {
                event.sender.send(`ssh:data:${connectionId}`, data.toString('utf-8'));
              }
            } catch (e) {
              // Window destroyed, ignore error
              console.log(`Window destroyed for connection ${connectionId}, stopping data stream`);
              stream.close();
            }
          };
          stream.on('data', onData);
          
          // Setup close listener
          const onClose = () => {
            try {
              if (event.sender && !event.sender.isDestroyed()) {
                event.sender.send(`ssh:close:${connectionId}`);
              }
            } catch (e) {
              // Window may be closed
            }
            cleanupConnection(connectionId);
          };
          stream.on('close', onClose);
          
          // Store cleanup function
          connectionListeners.set(connectionId, [
            () => stream.removeListener('data', onData),
            () => stream.removeListener('close', onClose)
          ]);
          
          resolve({ 
            success: true, 
            connectionId,
            message: `Connected to ${profile.host}` 
          });
        });
      });
      
      conn.on('error', (err) => {
        clearTimeout(timeout);
        cleanupConnection(connectionId);
        reject({ success: false, error: err.message });
      });
      
      conn.on('end', () => {
        cleanupConnection(connectionId);
      });
      
      // Build connection config
      const config = {
        host: profile.host,
        port: parseInt(profile.port) || 22,
        username: profile.username,
        readyTimeout: 20000,
        keepaliveInterval: 10000
      };
      
      // Handle authentication
      if (profile.authType === 'password') {
        config.password = profile.password;
      } else if (profile.authType === 'key' && profile.keyPath) {
        try {
          config.privateKey = readFileSync(profile.keyPath);
          if (profile.keyPassphrase) {
            config.passphrase = profile.keyPassphrase;
          }
        } catch (err) {
          clearTimeout(timeout);
          reject({ success: false, error: `Cannot read key file: ${err.message}` });
          return;
        }
      } else if (profile.authType === 'agent') {
        config.agent = process.env.SSH_AUTH_SOCK;
      }
      
      conn.connect(config);
    } catch (err) {
      reject({ success: false, error: err.message });
    }
  });
});

ipcMain.handle('ssh:send', (event, { connectionId, data }) => {
  try {
    const conn = activeConnections.get(connectionId);
    if (conn && conn._stream && !conn._stream.destroyed) {
      conn._stream.write(data);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Error sending SSH data:', err);
    return false;
  }
});

ipcMain.handle('ssh:resize', (event, { connectionId, cols, rows }) => {
  try {
    const conn = activeConnections.get(connectionId);
    if (conn && conn._stream && !conn._stream.destroyed) {
      conn._stream.setWindow(rows, cols, 0, 0);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Error resizing SSH:', err);
    return false;
  }
});

ipcMain.handle('ssh:disconnect', (event, connectionId) => {
  try {
    cleanupConnection(connectionId);
    return true;
  } catch (err) {
    console.error('Error disconnecting SSH:', err);
    return false;
  }
});

// ============================================================
// IPC Handlers - File Dialogs & System
// ============================================================

ipcMain.handle('dialog:selectKey', async () => {
  try {
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
  } catch (err) {
    console.error('Error selecting key:', err);
    return null;
  }
});

ipcMain.handle('dialog:selectFolder', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Folder - NeuSSH',
      properties: ['openDirectory']
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  } catch (err) {
    console.error('Error selecting folder:', err);
    return null;
  }
});

ipcMain.handle('dialog:exportProfiles', async () => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export NeuSSH Profiles',
      defaultPath: 'neussh-profiles.json',
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    return result.canceled ? null : result.filePath;
  } catch (err) {
    console.error('Error exporting profiles:', err);
    return null;
  }
});

ipcMain.handle('dialog:importProfiles', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Import NeuSSH Profiles',
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  } catch (err) {
    console.error('Error importing profiles:', err);
    return null;
  }
});

ipcMain.handle('shell:openExternal', (event, url) => {
  try {
    // Validate URL to prevent security issues
    const allowedProtocols = ['http:', 'https:'];
    const urlObj = new URL(url);
    if (allowedProtocols.includes(urlObj.protocol)) {
      shell.openExternal(url);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Error opening external URL:', err);
    return false;
  }
});

ipcMain.handle('app:getVersion', () => {
  return app.getVersion();
});

ipcMain.handle('app:getName', () => {
  return APP_NAME;
});

// ============================================================
// App Lifecycle - FIXED & IMPROVED
// ============================================================

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.log('Another instance is already running. Quitting...');
  app.quit();
} else {
  // Second instance handler
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    console.log('Second instance detected, focusing existing window...');
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    } else {
      createWindow();
    }
  });

  // App ready - create window
  app.whenReady().then(() => {
    console.log('App ready, creating window...');
    createWindow();
    
    // Security: Set CSP headers
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self'; img-src 'self' data:;"
          ]
        }
      });
    });
  }).catch(err => {
    console.error('Failed to initialize app:', err);
    app.quit();
  });

  // Window management
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

  // Security: Prevent new window creation
  app.on('web-contents-created', (event, contents) => {
    contents.on('new-window', (event, navigationUrl) => {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    });
  });

  // Handle uncaught errors
  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });
}
