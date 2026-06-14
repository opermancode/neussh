import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Sidebar from './components/Sidebar';
import TerminalPanel from './components/TerminalPanel';
import ProfileModal from './components/ProfileModal';
import QuickConnectModal from './components/QuickConnectModal';
import SettingsModal from './components/SettingsModal';
import NeuSSHLogo from './components/NeuSSHLogo';
import { Plus, Zap, Settings, Github, AlertCircle, X } from 'lucide-react';

const App = () => {
  const [profiles, setProfiles] = useState([]);
  const [connections, setConnections] = useState(new Map()); // Map<<connectionId, connection>
  const [activeConnectionId, setActiveConnectionId] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showQuickConnect, setShowQuickConnect] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [version, setVersion] = useState('');
  const [appName, setAppName] = useState('NeuSSH');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const connectionsOrderRef = useRef([]);

  // Load profiles on mount
  useEffect(() => {
    loadProfiles();
    window.neusshAPI.getVersion().then(setVersion);
    window.neusshAPI.getAppName().then(setAppName);
  }, []);

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      const connArray = Array.from(connections.values());
      if (connArray.length === 0) return;

      // Ctrl+D — disconnect active connection
      if (e.ctrlKey && e.key === 'd' && activeConnectionId) {
        e.preventDefault();
        handleDisconnect(activeConnectionId);
        return;
      }

      // Ctrl+Tab — next tab
      if (e.ctrlKey && e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        const currentIndex = connArray.findIndex(c => c.id === activeConnectionId);
        const nextIndex = (currentIndex + 1) % connArray.length;
        const nextConn = connArray[nextIndex];
        if (nextConn) {
          setActiveConnectionId(nextConn.id);
          setSelectedProfile(nextConn.profile);
        }
        return;
      }

      // Ctrl+Shift+Tab — previous tab
      if (e.ctrlKey && e.key === 'Tab' && e.shiftKey) {
        e.preventDefault();
        const currentIndex = connArray.findIndex(c => c.id === activeConnectionId);
        const prevIndex = (currentIndex - 1 + connArray.length) % connArray.length;
        const prevConn = connArray[prevIndex];
        if (prevConn) {
          setActiveConnectionId(prevConn.id);
          setSelectedProfile(prevConn.profile);
        }
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [connections, activeConnectionId, handleDisconnect]);

  const loadProfiles = async () => {
    try {
      setIsLoading(true);
      const data = await window.neusshAPI.getProfiles();
      setProfiles(data || []);
    } catch (err) {
      console.error('Failed to load profiles:', err);
      setError('Failed to load profiles');
    } finally {
      setIsLoading(false);
    }
  };

  // Connect to server or switch to existing connection
  const handleConnect = useCallback(async (profile) => {
    // Check if already connected to this profile
    const existingConnection = Array.from(connections.values()).find(
      conn => conn.profile.id === profile.id
    );

    if (existingConnection) {
      // Switch to existing connection
      setActiveConnectionId(existingConnection.id);
      setSelectedProfile(profile);
      return;
    }

    // Create new connection
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await window.neusshAPI.connectSSH(profile);
      
      if (result.success) {
        const newConnection = {
          id: result.connectionId,
          profile,
          startTime: new Date(),
          status: 'connected'
        };
        
        setConnections(prev => new Map(prev).set(result.connectionId, newConnection));
        connectionsOrderRef.current = [...connectionsOrderRef.current, result.connectionId];
        setActiveConnectionId(result.connectionId);
        setSelectedProfile(profile);
        
        // Setup close listener
        window.neusshAPI.onSSHClose(result.connectionId, () => {
          setConnections(prev => {
            const newMap = new Map(prev);
            newMap.delete(result.connectionId);
            return newMap;
          });
          if (activeConnectionId === result.connectionId) {
            setActiveConnectionId(null);
          }
        });
      } else {
        setError(`Connection failed: ${result.error}`);
      }
    } catch (err) {
      setError(`Connection error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [connections, activeConnectionId]);

  // Disconnect specific connection
  const handleDisconnect = useCallback(async (connectionId) => {
    const connection = connections.get(connectionId);
    if (!connection) return;

    try {
      await window.neusshAPI.disconnectSSH(connectionId);
      
      connectionsOrderRef.current = connectionsOrderRef.current.filter(id => id !== connectionId);
      
      setConnections(prev => {
        const newMap = new Map(prev);
        newMap.delete(connectionId);
        return newMap;
      });
      
      if (activeConnectionId === connectionId) {
        const remainingOrder = connectionsOrderRef.current;
        if (remainingOrder.length > 0) {
          const nextId = remainingOrder[0];
          const nextConn = connections.get(nextId);
          if (nextConn) {
            setActiveConnectionId(nextId);
            setSelectedProfile(nextConn.profile);
          }
        } else {
          setActiveConnectionId(null);
          setSelectedProfile(null);
        }
      }
    } catch (err) {
      console.error('Error disconnecting:', err);
      setError('Failed to disconnect');
    }
  }, [connections, activeConnectionId]);

  // Disconnect all connections
  const handleDisconnectAll = useCallback(async () => {
    for (const [id] of connections) {
      try {
        await window.neusshAPI.disconnectSSH(id);
      } catch (err) {
        console.error(`Error disconnecting ${id}:`, err);
      }
    }
    connectionsOrderRef.current = [];
    setConnections(new Map());
    setActiveConnectionId(null);
    setSelectedProfile(null);
  }, [connections]);

  // Switch to connection tab
  const handleSwitchTab = useCallback((connectionId) => {
    const connection = connections.get(connectionId);
    if (connection) {
      setActiveConnectionId(connectionId);
      setSelectedProfile(connection.profile);
    }
  }, [connections]);

  // Close tab (disconnect)
  const handleCloseTab = useCallback(async (connectionId, e) => {
    e.stopPropagation();
    await handleDisconnect(connectionId);
  }, [handleDisconnect]);

  const handleSaveProfile = useCallback(async (profile) => {
    try {
      const result = await window.neusshAPI.saveProfile(profile);
      if (result.success) {
        await loadProfiles();
        setShowProfileModal(false);
        setEditingProfile(null);
      } else {
        setError(`Failed to save: ${result.error}`);
      }
    } catch (err) {
      console.error('Error saving profile:', err);
      setError('Failed to save profile');
    }
  }, []);

  const handleDeleteProfile = useCallback(async (id) => {
    if (!confirm('Delete this server profile?')) return;
    
    try {
      const result = await window.neusshAPI.deleteProfile(id);
      if (result.success) {
        await loadProfiles();
        if (selectedProfile?.id === id) {
          setSelectedProfile(null);
        }
      } else {
        setError(`Failed to delete: ${result.error}`);
      }
    } catch (err) {
      console.error('Error deleting profile:', err);
      setError('Failed to delete profile');
    }
  }, [selectedProfile]);

  const handleEditProfile = useCallback((profile) => {
    setEditingProfile(profile);
    setShowProfileModal(true);
  }, []);

  const handleImportProfiles = useCallback(async () => {
    try {
      const filePath = await window.neusshAPI.importProfilesDialog();
      if (filePath) {
        const result = await window.neusshAPI.importProfiles(filePath);
        if (result.success) {
          await loadProfiles();
          setError(`Imported ${result.count} profiles`);
        } else {
          setError(`Import failed: ${result.error}`);
        }
      }
    } catch (err) {
      console.error('Error importing:', err);
      setError('Failed to import profiles');
    }
  }, []);

  const handleExportProfiles = useCallback(async () => {
    try {
      const filePath = await window.neusshAPI.exportProfilesDialog();
      if (filePath) {
        const result = await window.neusshAPI.exportProfiles(filePath);
        if (result.success) {
          setError('Profiles exported successfully');
        } else {
          setError(`Export failed: ${result.error}`);
        }
      }
    } catch (err) {
      console.error('Error exporting:', err);
      setError('Failed to export profiles');
    }
  }, []);

  const filteredProfiles = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return profiles.filter(p => 
      p.name?.toLowerCase().includes(query) ||
      p.host?.toLowerCase().includes(query) ||
      p.username?.toLowerCase().includes(query)
    );
  }, [profiles, searchQuery]);

  const activeConnection = activeConnectionId ? connections.get(activeConnectionId) : null;

  return (
    <div className="h-screen w-screen flex bg-dark-950 text-dark-100 overflow-hidden">
      {/* Error Toast */}
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
          <div className="bg-red-500/90 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-3 backdrop-blur-sm border border-red-400/20">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="text-sm font-medium">{error}</span>
            <button 
              onClick={() => setError(null)} 
              className="ml-1 p-0.5 hover:bg-white/20 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <Sidebar
        profiles={filteredProfiles}
        selectedProfile={selectedProfile}
        onSelectProfile={setSelectedProfile}
        onConnect={handleConnect}
        onEdit={handleEditProfile}
        onDelete={handleDeleteProfile}
        onAdd={() => { setEditingProfile(null); setShowProfileModal(true); }}
        onQuickConnect={() => setShowQuickConnect(true)}
        onImport={handleImportProfiles}
        onExport={handleExportProfiles}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        connections={connections}
        activeConnectionId={activeConnectionId}
        isLoading={isLoading}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 bg-dark-900 border-b border-dark-800 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <NeuSSHLogo size="small" />
              <span className="font-bold text-lg tracking-tight text-white">
                {appName}
              </span>
            </div>
            <span className="text-dark-700">|</span>
            <span className="text-sm text-dark-400">
              {activeConnection ? activeConnection.profile.name : 'Ready'}
            </span>
            {activeConnection && (
              <span className="status-dot connected" />
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {connections.size > 0 && (
              <button
                onClick={handleDisconnectAll}
                className="px-3 py-1.5 text-sm bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
              >
                Disconnect All ({connections.size})
              </button>
            )}
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 hover:bg-dark-800 rounded-lg transition-colors text-dark-400"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={() => window.neusshAPI.openExternal('https://github.com/neussh/neussh')}
              className="p-2 hover:bg-dark-800 rounded-lg transition-colors text-dark-400"
              title="GitHub"
            >
              <Github className="w-4 h-4" />
            </button>
            <span className="text-xs text-dark-600 ml-1">v{version}</span>
          </div>
        </header>

        {/* Connection Tabs */}
        {connections.size > 0 && (
          <div className="flex bg-dark-900 border-b border-dark-800 overflow-x-auto tab-scroll">
            {Array.from(connections.values()).map(connection => {
              const isActive = activeConnectionId === connection.id;
              return (
                <button
                  key={connection.id}
                  onClick={() => handleSwitchTab(connection.id)}
                  className={`group flex items-center gap-2 px-4 py-2 text-sm border-r border-dark-800 transition-all min-w-0 shrink-0 ${
                    isActive
                      ? 'bg-dark-800 text-dark-100 shadow-[inset_0_-2px_0_0] shadow-neussh-500'
                      : 'text-dark-500 hover:bg-dark-800/50 hover:text-dark-300'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-emerald-400' : 'bg-emerald-600'}`} />
                  <span className="truncate max-w-[130px]">{connection.profile.name}</span>
                  <span
                    onClick={(e) => handleCloseTab(connection.id, e)}
                    className={`ml-auto p-0.5 rounded transition-colors ${
                      isActive 
                        ? 'opacity-60 hover:opacity-100 hover:bg-dark-700' 
                        : 'opacity-0 group-hover:opacity-60 hover:opacity-100 hover:bg-dark-700'
                    }`}
                  >
                    <X className="w-3 h-3" />
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Terminal Area */}
        <div className="flex-1 relative">
          {activeConnection ? (
            <TerminalPanel
              connectionId={activeConnection.id}
              profile={activeConnection.profile}
              onDisconnect={() => handleDisconnect(activeConnection.id)}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-dark-500">
              <div className="mb-6 animate-fade-in">
                <div className="flex justify-center">
                  <NeuSSHLogo size="xl" />
                </div>
                <p className="text-xl font-semibold text-dark-300 mb-2 text-center mt-4">
                  {isLoading ? 'Loading...' : 'No Active Connection'}
                </p>
                <p className="text-sm text-dark-600 text-center max-w-md">
                  {isLoading 
                    ? 'Loading your server profiles...'
                    : connections.size > 0
                      ? 'Select a connection tab or click a server to connect'
                      : 'Select a saved server from the sidebar or use Quick Connect to start an SSH session'
                  }
                </p>
              </div>
              {!isLoading && connections.size === 0 && (
                <div className="flex gap-3 animate-slide-up">
                  <button
                    onClick={() => setShowProfileModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-neussh-600 hover:bg-neussh-500 text-white rounded-xl transition-all shadow-lg shadow-neussh-900/20 hover:shadow-neussh-900/40 hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <Plus className="w-4 h-4" />
                    Add Server
                  </button>
                  <button
                    onClick={() => setShowQuickConnect(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-dark-800 hover:bg-dark-700 text-dark-200 rounded-xl transition-all border border-dark-700 hover:border-dark-600 hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <Zap className="w-4 h-4 text-amber-400" />
                    Quick Connect
                  </button>
                </div>
              )}
              {!isLoading && connections.size > 0 && (
                <div className="mt-6 text-xs text-dark-600 animate-fade-in">
                  <span className="bg-dark-800 px-2 py-1 rounded-md font-mono">Ctrl+Tab</span>
                  <span className="mx-2">Switch tabs</span>
                  <span className="bg-dark-800 px-2 py-1 rounded-md font-mono ml-3">Ctrl+D</span>
                  <span className="ml-2">Disconnect</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showProfileModal && (
        <ProfileModal
          profile={editingProfile}
          onSave={handleSaveProfile}
          onClose={() => { setShowProfileModal(false); setEditingProfile(null); }}
        />
      )}

      {showQuickConnect && (
        <QuickConnectModal
          onConnect={handleConnect}
          onClose={() => setShowQuickConnect(false)}
        />
      )}

      {showSettings && (
        <SettingsModal
          onImport={handleImportProfiles}
          onExport={handleExportProfiles}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
};

export default App;
