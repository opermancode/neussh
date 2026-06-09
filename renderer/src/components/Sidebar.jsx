import React, { useMemo } from 'react';
import { 
  Search, Plus, Zap, Server, Edit2, Trash2, 
  Key, Lock, Shield, Globe, ChevronRight, 
  Download, Upload, Loader2
} from 'lucide-react';
import NeuSSHLogo from './NeuSSHLogo';

const Sidebar = ({ 
  profiles, selectedProfile, onSelectProfile, onConnect, 
  onEdit, onDelete, onAdd, onQuickConnect, onImport, onExport,
  searchQuery, onSearchChange, connectionStatus, activeConnection,
  isLoading
}) => {
  // Memoize auth icon renderer
  const getAuthIcon = useMemo(() => (profile) => {
    if (profile.authType === 'password') return <Lock className="w-3.5 h-3.5 text-amber-400" />;
    if (profile.authType === 'agent') return <Shield className="w-3.5 h-3.5 text-emerald-400" />;
    return <Key className="w-3.5 h-3.5 text-neussh-400" />;
  }, []);

  // Memoize auth label renderer
  const getAuthLabel = useMemo(() => (profile) => {
    if (profile.authType === 'password') return 'Password';
    if (profile.authType === 'agent') return 'SSH Agent';
    const ext = profile.keyPath?.split('.').pop()?.toUpperCase();
    return ext ? `${ext} Key` : 'Key';
  }, []);

  // Memoize sorted profiles (connected first, then alphabetical)
  const sortedProfiles = useMemo(() => {
    return [...profiles].sort((a, b) => {
      const aConnected = activeConnection?.profile?.id === a.id ? 1 : 0;
      const bConnected = activeConnection?.profile?.id === b.id ? 1 : 0;
      if (aConnected !== bConnected) return bConnected - aConnected;
      return a.name?.localeCompare(b.name) || 0;
    });
  }, [profiles, activeConnection]);

  return (
    <div className="w-80 bg-dark-900 border-r border-dark-800 flex flex-col shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-dark-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <NeuSSHLogo size="small" />
            <div>
              <span className="font-bold text-dark-100 text-sm">NeuSSH</span>
              <span className="text-xs text-dark-500 ml-2">
                {isLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin inline" />
                ) : (
                  `${profiles.length} servers`
                )}
              </span>
            </div>
          </div>
          <button
            onClick={onAdd}
            className="p-1.5 hover:bg-dark-800 rounded-lg transition-colors"
            title="Add Server"
            disabled={isLoading}
          >
            <Plus className="w-4 h-4 text-neussh-400" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search servers..."
            disabled={isLoading}
            className="w-full bg-dark-950 border border-dark-800 rounded-lg pl-9 pr-3 py-2 text-sm text-dark-200 placeholder-dark-600 focus:outline-none focus:border-neussh-500 transition-colors disabled:opacity-50"
          />
        </div>
      </div>

      {/* Server List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-8 h-8 text-dark-600 animate-spin mx-auto mb-3" />
            <p className="text-sm text-dark-500">Loading servers...</p>
          </div>
        ) : profiles.length === 0 ? (
          <div className="p-8 text-center">
            <Server className="w-10 h-10 text-dark-700 mx-auto mb-3" />
            <p className="text-sm text-dark-500 mb-1">No servers saved</p>
            <p className="text-xs text-dark-600">Add your first SSH server</p>
          </div>
        ) : sortedProfiles.length === 0 ? (
          <div className="p-8 text-center">
            <Search className="w-8 h-8 text-dark-700 mx-auto mb-3" />
            <p className="text-sm text-dark-500">No servers match your search</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {sortedProfiles.map((profile) => {
              const isActive = selectedProfile?.id === profile.id;
              const isConnected = activeConnection?.profile?.id === profile.id;
              
              return (
                <div
                  key={profile.id}
                  onClick={() => onSelectProfile(profile)}
                  className={`group relative p-3 rounded-xl cursor-pointer transition-all ${
                    isActive 
                      ? 'bg-neussh-500/10 border border-neussh-500/30' 
                      : 'hover:bg-dark-800 border border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-sm text-dark-200 truncate">
                          {profile.name}
                        </h3>
                        {isConnected && (
                          <span className="status-dot connected shrink-0" title="Connected" />
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1.5 text-xs text-dark-500 mb-1">
                        <Globe className="w-3 h-3" />
                        <span className="truncate">{profile.host}:{profile.port || 22}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-xs text-dark-600">
                          {getAuthIcon(profile)}
                          <span>{getAuthLabel(profile)}</span>
                        </div>
                        <span className="text-dark-700">•</span>
                        <span className="text-xs text-dark-600">{profile.username}</span>
                      </div>
                    </div>

                    <div className={`flex flex-col gap-1 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                      <button
                        onClick={(e) => { e.stopPropagation(); onConnect(profile); }}
                        className="p-1 hover:bg-neussh-500/20 rounded-lg text-neussh-400"
                        title="Connect"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onEdit(profile); }}
                        className="p-1 hover:bg-dark-700 rounded-lg text-dark-400"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDelete(profile.id); }}
                        className="p-1 hover:bg-red-500/20 rounded-lg text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-3 border-t border-dark-800 space-y-2">
        <button
          onClick={onQuickConnect}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-dark-800 hover:bg-dark-700 text-dark-300 rounded-xl text-sm transition-colors disabled:opacity-50"
        >
          <Zap className="w-4 h-4 text-amber-400" />
          Quick Connect
        </button>
        <div className="flex gap-2">
          <button
            onClick={onImport}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 bg-dark-950 hover:bg-dark-800 text-dark-500 rounded-lg text-xs transition-colors disabled:opacity-50"
            title="Import Profiles"
          >
            <Upload className="w-3.5 h-3.5" />
            Import
          </button>
          <button
            onClick={onExport}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 bg-dark-950 hover:bg-dark-800 text-dark-500 rounded-lg text-xs transition-colors disabled:opacity-50"
            title="Export Profiles"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
