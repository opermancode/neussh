import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/Sidebar';
import TerminalPanel from './components/TerminalPanel';
import ProfileModal from './components/ProfileModal';
import QuickConnectModal from './components/QuickConnectModal';
import SettingsModal from './components/SettingsModal';
import NeuSSHLogo from './components/NeuSSHLogo';
import { Terminal, Plus, Zap, Settings, Github, AlertCircle } from 'lucide-react';

const App = () => {
  const [profiles, setProfiles] = useState([]);
  const [activeConnection, setActiveConnection] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showQuickConnect, setShowQuickConnect] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [searchQuery, setSearchQuery] = useState('');
  const [version, setVersion] = useState('');
  const [appName, setAppName] = useState('NeuSSH');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

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

  const handleConnect = useCallback(async (profile) => {
    // Disconnect existing connection
    if (activeConnection) {
      try {
        await window.neusshAPI.disconnectSSH(activeConnection.id);
      } catch (err) {
        console.error('Error disconnecting:', err);
      }
    }
    
    setConnectionStatus('connecting');
    setSelectedProfile(profile);
    setError(null);
    
    try {
      const result = await window.neusshAPI.connectSSH(profile);
      
      if (result.success) {
        setActiveConnection({
          id: result.connectionId,
          profile,
          startTime: new Date()
        });
        setConnectionStatus('connected');
        
        // Setup close listener with cleanup
        const cleanup = window.neusshAPI.onSSHClose(result.connectionId, () => {
          setActiveConnection(null);
          setConnectionStatus('disconnected');
        });
        
        // Store cleanup for later
        return () => cleanup();
      } else {
        setConnectionStatus('disconnected');
        setError(`Connection failed: ${result.error}`);
      }
    } catch (err) {
      setConnectionStatus('disconnected');
      setError(`Connection error: ${err.message}`);
    }
  }, [activeConnection]);

  const handleDisconnect = useCallback(async () => {
    if (activeConnection) {
      try {
        await window.neusshAPI.disconnectSSH(activeConnection.id);
        setActiveConnection(null);
        setConnectionStatus('disconnected');
      } catch (err) {
        console.error('Error disconnecting:', err);
        setError('Failed to disconnect');
      }
    }
  }, [activeConnection]);

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

  return (
    <div className="h-screen w-screen flex bg-dark-950 text-dark-100 overflow-hidden">
      {/* Error Toast */}
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-500/90 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="ml-2 hover:text-red-200">
            ×
          </button>
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
        connectionStatus={connectionStatus}
        activeConnection={activeConnection}
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
              <span className={`status-dot ${connectionStatus}`} />
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {activeConnection && (
              <button
                onClick={handleDisconnect}
                className="px-3 py-1.5 text-sm bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
              >
                Disconnect
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

        {/* Terminal Area */}
        <div className="flex-1 relative">
          {activeConnection ? (
            <TerminalPanel
              connectionId={activeConnection.id}
              profile={activeConnection.profile}
              onDisconnect={handleDisconnect}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-dark-500">
              <div className="mb-6">
                <NeuSSHLogo size="xl" />
                <p className="text-xl font-semibold text-dark-300 mb-2 text-center mt-4">
                  {isLoading ? 'Loading...' : 'No Active Connection'}
                </p>
                <p className="text-sm text-dark-600 text-center max-w-md">
                  {isLoading 
                    ? 'Loading your server profiles...'
                    : 'Select a saved server from the sidebar or use Quick Connect to start an SSH session'
                  }
                </p>
              </div>
              {!isLoading && (
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowProfileModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-neussh-600 hover:bg-neussh-500 text-white rounded-xl transition-all shadow-lg shadow-neussh-900/20"
                  >
                    <Plus className="w-4 h-4" />
                    Add Server
                  </button>
                  <button
                    onClick={() => setShowQuickConnect(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-dark-800 hover:bg-dark-700 text-dark-200 rounded-xl transition-all border border-dark-700"
                  >
                    <Zap className="w-4 h-4 text-amber-400" />
                    Quick Connect
                  </button>
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
