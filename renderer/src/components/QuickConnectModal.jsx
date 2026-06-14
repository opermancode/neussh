import React, { useState, useCallback } from 'react';
import { X, Zap, Key, Lock, FolderOpen, Eye, EyeOff, Loader2 } from 'lucide-react';

const QuickConnectModal = ({ onConnect, onClose }) => {
  const [formData, setFormData] = useState({
    host: '',
    port: '22',
    username: '',
    authType: 'key',
    keyPath: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isConnecting, setIsConnecting] = useState(false);
  const [keyDisplayName, setKeyDisplayName] = useState('');

  const validate = useCallback(() => {
    const newErrors = {};
    if (!formData.host.trim()) newErrors.host = 'Host is required';
    if (!formData.username.trim()) newErrors.username = 'Username is required';
    if (formData.authType === 'key' && !formData.keyPath) {
      newErrors.keyPath = 'Key file is required';
    }
    if (formData.authType === 'password' && !formData.password) {
      newErrors.password = 'Password is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsConnecting(true);
    try {
      await onConnect({
        ...formData,
        name: `Quick: ${formData.host}`,
        port: parseInt(formData.port) || 22
      });
      onClose();
    } catch (err) {
      console.error('Quick connect failed:', err);
    } finally {
      setIsConnecting(false);
    }
  }, [formData, onConnect, onClose, validate]);

  const browseKeyFile = useCallback(async () => {
    try {
      const result = await window.neusshAPI.selectKeyFile();
      if (result) {
        if (typeof result === 'object' && result.token) {
          setFormData(prev => ({ ...prev, keyPath: result.token }));
          setKeyDisplayName(result.display || 'Key file selected');
        } else if (typeof result === 'string') {
          setFormData(prev => ({ ...prev, keyPath: result }));
          setKeyDisplayName(result);
        }
        setErrors(prev => ({ ...prev, keyPath: null }));
      }
    } catch (err) {
      console.error('Error selecting key file:', err);
    }
  }, []);

  const updateField = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  }, [errors]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-dark-900 border border-dark-700 rounded-2xl shadow-2xl w-full max-w-md animate-scale-in">
        <div className="flex items-center justify-between p-5 border-b border-dark-800">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-dark-100">Quick Connect</h2>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 hover:bg-dark-800 rounded-lg transition-colors"
            disabled={isConnecting}
          >
            <X className="w-5 h-5 text-dark-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Host & Port */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-dark-300 mb-1">
                Host <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.host}
                onChange={(e) => updateField('host', e.target.value)}
                placeholder="IP or hostname"
                disabled={isConnecting}
                className={`w-full bg-dark-950 border rounded-lg px-3 py-2 text-sm text-dark-200 placeholder-dark-600 focus:outline-none focus:border-neussh-500 disabled:opacity-50 ${
                  errors.host ? 'border-red-500' : 'border-dark-800'
                }`}
              />
              {errors.host && <p className="text-xs text-red-400 mt-1">{errors.host}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">Port</label>
              <input
                type="number"
                value={formData.port}
                onChange={(e) => updateField('port', e.target.value)}
                disabled={isConnecting}
                className="w-full bg-dark-950 border border-dark-800 rounded-lg px-3 py-2 text-sm text-dark-200 focus:outline-none focus:border-neussh-500 disabled:opacity-50"
              />
            </div>
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">
              Username <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => updateField('username', e.target.value)}
              placeholder="root, ubuntu..."
              disabled={isConnecting}
              className={`w-full bg-dark-950 border rounded-lg px-3 py-2 text-sm text-dark-200 placeholder-dark-600 focus:outline-none focus:border-neussh-500 disabled:opacity-50 ${
                errors.username ? 'border-red-500' : 'border-dark-800'
              }`}
            />
            {errors.username && <p className="text-xs text-red-400 mt-1">{errors.username}</p>}
          </div>

          {/* Auth Type */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => updateField('authType', 'key')}
              disabled={isConnecting}
              className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-sm transition-all disabled:opacity-50 ${
                formData.authType === 'key' ? 'border-neussh-500 bg-neussh-500/10 text-neussh-400' : 'border-dark-800 text-dark-500'
              }`}
            >
              <Key className="w-4 h-4" /> SSH Key
            </button>
            <button
              type="button"
              onClick={() => updateField('authType', 'password')}
              disabled={isConnecting}
              className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-sm transition-all disabled:opacity-50 ${
                formData.authType === 'password' ? 'border-neussh-500 bg-neussh-500/10 text-neussh-400' : 'border-dark-800 text-dark-500'
              }`}
            >
              <Lock className="w-4 h-4" /> Password
            </button>
          </div>

          {/* Key File */}
          {formData.authType === 'key' && (
            <div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={keyDisplayName || formData.keyPath || ''}
                  readOnly
                  placeholder="Select key file"
                  className={`flex-1 bg-dark-950 border rounded-lg px-3 py-2 text-sm text-dark-200 placeholder-dark-600 ${
                    errors.keyPath ? 'border-red-500' : 'border-dark-800'
                  }`}
                />
                <button
                  type="button"
                  onClick={browseKeyFile}
                  disabled={isConnecting}
                  className="px-3 py-2 bg-dark-800 hover:bg-dark-700 border border-dark-700 rounded-lg text-dark-300 transition-colors disabled:opacity-50"
                >
                  <FolderOpen className="w-4 h-4" />
                </button>
              </div>
              {errors.keyPath && <p className="text-xs text-red-400 mt-1">{errors.keyPath}</p>}
            </div>
          )}

          {/* Password */}
          {formData.authType === 'password' && (
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => updateField('password', e.target.value)}
                placeholder="Password"
                disabled={isConnecting}
                className={`w-full bg-dark-950 border rounded-lg px-3 py-2 pr-10 text-sm text-dark-200 placeholder-dark-600 disabled:opacity-50 ${
                  errors.password ? 'border-red-500' : 'border-dark-800'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-dark-500"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password}</p>}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isConnecting}
              className="px-4 py-2 text-sm text-dark-300 hover:bg-dark-800 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isConnecting}
              className="px-4 py-2 text-sm bg-amber-500 hover:bg-amber-600 text-dark-950 font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Connect Now
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuickConnectModal;
