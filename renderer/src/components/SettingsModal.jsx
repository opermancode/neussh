import React, { useState, useCallback } from 'react';
import { X, Upload, Download, Github, Globe, Heart, Check, AlertCircle } from 'lucide-react';
import NeuSSHLogo from './NeuSSHLogo';

const SettingsModal = ({ onImport, onExport, onClose }) => {
  const [importResult, setImportResult] = useState(null);
  const [exportResult, setExportResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleImport = useCallback(async () => {
    setIsLoading(true);
    setImportResult(null);
    setExportResult(null);
    
    try {
      const result = await onImport();
      if (result) {
        setImportResult({
          success: result.success,
          message: result.success 
            ? `Successfully imported ${result.count} profiles`
            : `Import failed: ${result.error}`
        });
      }
    } catch (err) {
      setImportResult({
        success: false,
        message: 'Import failed: Unexpected error'
      });
    } finally {
      setIsLoading(false);
    }
  }, [onImport]);

  const handleExport = useCallback(async () => {
    setIsLoading(true);
    setImportResult(null);
    setExportResult(null);
    
    try {
      const result = await onExport();
      if (result) {
        setExportResult({
          success: result.success,
          message: result.success 
            ? 'Profiles exported successfully'
            : `Export failed: ${result.error}`
        });
      }
    } catch (err) {
      setExportResult({
        success: false,
        message: 'Export failed: Unexpected error'
      });
    } finally {
      setIsLoading(false);
    }
  }, [onExport]);

  const clearResults = useCallback(() => {
    setImportResult(null);
    setExportResult(null);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-dark-900 border border-dark-700 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-dark-800">
          <h2 className="text-lg font-semibold text-dark-100">Settings</h2>
          <button 
            onClick={onClose} 
            className="p-1 hover:bg-dark-800 rounded-lg transition-colors"
            disabled={isLoading}
          >
            <X className="w-5 h-5 text-dark-400" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Data Management */}
          <div>
            <h3 className="text-sm font-medium text-dark-300 mb-3">Data Management</h3>
            
            {/* Result Messages */}
            {(importResult || exportResult) && (
              <div 
                onClick={clearResults}
                className={`mb-3 p-3 rounded-lg text-sm cursor-pointer ${
                  (importResult?.success || exportResult?.success)
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-red-500/10 text-red-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  {(importResult?.success || exportResult?.success) ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  <span>{importResult?.message || exportResult?.message}</span>
                  <span className="text-xs opacity-50 ml-auto">(click to dismiss)</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <button
                onClick={handleImport}
                disabled={isLoading}
                className="w-full flex items-center gap-3 px-4 py-3 bg-dark-800 hover:bg-dark-700 rounded-xl text-dark-200 transition-colors disabled:opacity-50"
              >
                <Upload className="w-5 h-5 text-neussh-400" />
                <div className="text-left">
                  <div className="text-sm font-medium">Import Profiles</div>
                  <div className="text-xs text-dark-500">Load servers from JSON file</div>
                </div>
                {isLoading && <span className="ml-auto w-4 h-4 border-2 border-dark-600 border-t-neussh-400 rounded-full animate-spin" />}
              </button>
              <button
                onClick={handleExport}
                disabled={isLoading}
                className="w-full flex items-center gap-3 px-4 py-3 bg-dark-800 hover:bg-dark-700 rounded-xl text-dark-200 transition-colors disabled:opacity-50"
              >
                <Download className="w-5 h-5 text-neussh-400" />
                <div className="text-left">
                  <div className="text-sm font-medium">Export Profiles</div>
                  <div className="text-xs text-dark-500">Save servers to JSON file</div>
                </div>
                {isLoading && <span className="ml-auto w-4 h-4 border-2 border-dark-600 border-t-neussh-400 rounded-full animate-spin" />}
              </button>
            </div>
          </div>

          {/* About */}
          <div>
            <h3 className="text-sm font-medium text-dark-300 mb-3">About NeuSSH</h3>
            <div className="bg-dark-800 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <NeuSSHLogo size="large" />
                <div>
                  <div className="font-semibold text-dark-100">NeuSSH</div>
                  <div className="text-xs text-dark-500">Modern SSH Connection Manager</div>
                </div>
              </div>
              <p className="text-xs text-dark-500 mb-3">
                A modern, cross-platform SSH client built with Electron. 
                Better than PuTTY with profile management, universal key support, and a beautiful terminal.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => window.neusshAPI.openExternal('https://github.com/neussh/neussh')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-950 hover:bg-dark-900 rounded-lg text-xs text-dark-400 transition-colors"
                >
                  <Github className="w-3.5 h-3.5" />
                  GitHub
                </button>
                <button
                  onClick={() => window.neusshAPI.openExternal('https://neussh.dev')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-950 hover:bg-dark-900 rounded-lg text-xs text-dark-400 transition-colors"
                >
                  <Globe className="w-3.5 h-3.5" />
                  Website
                </button>
              </div>
            </div>
          </div>

          {/* Credits */}
          <div className="text-center">
            <p className="text-xs text-dark-600 flex items-center justify-center gap-1">
              Made with <Heart className="w-3 h-3 text-red-400" /> by the NeuSSH Team
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
