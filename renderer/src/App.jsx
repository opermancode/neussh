import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import TerminalPanel from './components/TerminalPanel';
import ProfileModal from './components/ProfileModal';
import QuickConnectModal from './components/QuickConnectModal';
import SettingsModal from './components/SettingsModal';
import { Terminal, Plus, Zap, Settings, Github } from 'lucide-react';

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

  useEffect(() => {
    loadProfiles();
    window.neusshAPI.getVersion().then(setVersion);
    window.neusshAPI.getAppName().then(setAppName);
  }, []);

  const loadProfiles = async () => {
    const data = await window.neusshAPI.getProfiles();
    setProfiles(data);
  };

  const handleConnect = useCallback(async (profile) => {
    if (activeConnection) {
      await window.neusshAPI.disconnectSSH(activeConnection.id);
    }
    
    setConnectionStatus('connecting');
    setSelectedProfile(profile);
    
    try {
      const result = await window.neusshAPI.connectSSH(profile);
      
      if (result.success) {
        setActiveConnection({
          id: result.connectionId,
          profile,
          startTime: new Date()
        });
        setConnectionStatus('connected');
        
        window.neusshAPI.onSSHClose(result.connectionId, () => {
          setActiveConnection(null);
          setConnectionStatus('disconnected');
        });
      } else {
        setConnectionStatus('disconnected');
        alert(`Connection failed: ${result.error}`);
      }
    } catch (err) {
      setConnectionStatus('disconnected');
      alert(`Connection error: ${err.message}`);
    }
  }, [activeConnection]);

  const handleDisconnect = async () => {
    if (activeConnection) {
      await window.neusshAPI.disconnectSSH(activeConnection.id);
      setActiveConnection(null);
      setConnectionStatus('disconnected');
    }
  };

  const handleSaveProfile = async (profile) => {
    await window.neusshAPI.saveProfile(profile);
    await loadProfiles();
    setShowProfileModal(false);
    setEditingProfile(null);
  };

  const handleDeleteProfile = async (id) => {
    if (confirm('Delete this server profile?')) {
      await window.neusshAPI.deleteProfile(id);
      await loadProfiles();
      if (selectedProfile?.id === id) {
        setSelectedProfile(null);
      }
    }
  };

  const handleEditProfile = (profile) => {
    setEditingProfile(profile);
    setShowProfileModal(true);
  };

  const handleImportProfiles = async () => {
    const filePath = await window.neusshAPI.importProfilesDialog();
    if (filePath) {
      const result = await window.neusshAPI.importProfiles(filePath);
      if (result.success) {
        alert(`Imported ${result.count} profiles`);
        await loadProfiles();
      } else {
        alert(`Import failed: ${result.error}`);
      }
    }
  };

  const handleExportProfiles = async () => {
    const filePath = await window.neusshAPI.exportProfilesDialog();
    if (filePath) {
      const result = await window.neusshAPI.exportProfiles(filePath);
      if (result.success) {
        alert('Profiles exported successfully');
      } else {
        alert(`Export failed: ${result.error}`);
      }
    }
  };

  const filteredProfiles = profiles.filter(p => 
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.host?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-screen w-screen flex bg-dark-950 text-dark-100 overflow-hidden">
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
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 bg-dark-900 border-b border-dark-800 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-neussh-400" />
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
                <div className="w-20 h-20 bg-dark-800 rounded-2xl flex items-center justify-center mb-4 mx-auto">
                  <Terminal className="w-10 h-10 text-neussh-500 opacity-60" />
                </div>
                <p className="text-xl font-semibold text-dark-300 mb-2 text-center">No Active Connection</p>
                <p className="text-sm text-dark-600 text-center max-w-md">
                  Select a saved server from the sidebar or use Quick Connect to start an SSH session
                </p>
              </div>
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
