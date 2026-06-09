import React, { useState, useEffect, useCallback } from 'react';
import { X, Key, Lock, Shield, FolderOpen, Eye, EyeOff, Server, Check } from 'lucide-react';

const ProfileModal = ({ profile, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    host: '',
    port: '22',
    username: '',
    authType: 'key',
    keyPath: '',
    keyPassphrase: '',
    password: '',
    description: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    if (profile) {
      setFormData({
        ...profile,
        port: String(profile.port || 22)
      });
    }
  }, [profile]);

  const validate = useCallback(() => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
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
    
    setIsSubmitting(true);
    try {
      await onSave({
        ...formData,
        port: parseInt(formData.port) || 22,
        id: profile?.id
      });
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, profile, onSave, validate]);

  const browseKeyFile = useCallback(async () => {
    try {
      const path = await window.neusshAPI.selectKeyFile();
      if (path) {
        setFormData(prev => ({ ...prev, keyPath: path }));
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

  const testConnection = useCallback(async () => {
    if (!validate()) return;
    
    setTestResult({ status: 'testing', message: 'Testing connection...' });
    
    try {
      const testProfile = {
        ...formData,
        port: parseInt(formData.port) || 22,
        name: 'Test Connection'
      };
      
      const result = await window.neusshAPI.connectSSH(testProfile);
      
      if (result.success) {
        setTestResult({ status: 'success', message: 'Connection successful!' });
        // Disconnect test connection
        await window.neusshAPI.disconnectSSH(result.connectionId);
      } else {
        setTestResult({ status: 'error', message: result.error });
      }
    } catch (err) {
      setTestResult({ status: 'error', message: err.message });
    }
  }, [formData, validate]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-dark-900 border border-dark-700 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-dark-800">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-neussh-400" />
            <h2 className="text-lg font-semibold text-dark-100">
              {profile ? 'Edit Server' : 'Add Server'}
            </h2>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 hover:bg-dark-800 rounded-lg transition-colors"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5 text-dark-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">
              Server Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="e.g., Production Server"
              disabled={isSubmitting}
              className={`w-full bg-dark-950 border rounded-lg px-3 py-2 text-sm text-dark-200 placeholder-dark-600 focus:outline-none focus:border-neussh-500 transition-colors disabled:opacity-50 ${
                errors.name ? 'border-red-500' : 'border-dark-800'
              }`}
            />
            {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
          </div>

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
                placeholder="192.168.1.1 or example.com"
                disabled={isSubmitting}
                className={`w-full bg-dark-950 border rounded-lg px-3 py-2 text-sm text-dark-200 placeholder-dark-600 focus:outline-none focus:border-neussh-500 transition-colors disabled:opacity-50 ${
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
                disabled={isSubmitting}
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
              placeholder="root, ubuntu, ec2-user..."
              disabled={isSubmitting}
              className={`w-full bg-dark-950 border rounded-lg px-3 py-2 text-sm text-dark-200 placeholder-dark-600 focus:outline-none focus:border-neussh-500 transition-colors disabled:opacity-50 ${
                errors.username ? 'border-red-500' : 'border-dark-800'
              }`}
            />
            {errors.username && <p className="text-xs text-red-400 mt-1">{errors.username}</p>}
          </div>

          {/* Auth Type */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Authentication</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'key', label: 'SSH Key', icon: Key },
                { id: 'password', label: 'Password', icon: Lock },
                { id: 'agent', label: 'SSH Agent', icon: Shield }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => updateField('authType', id)}
                  disabled={isSubmitting}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all disabled:opacity-50 ${
                    formData.authType === id
                      ? 'border-neussh-500 bg-neussh-500/10 text-neussh-400'
                      : 'border-dark-800 bg-dark-950 text-dark-500 hover:border-dark-700'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Key File */}
          {formData.authType === 'key' && (
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">
                Private Key File <span className="text-red-400">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.keyPath}
                  readOnly
                  placeholder="Click browse to select .pem, .ppk, or .key file"
                  className={`flex-1 bg-dark-950 border rounded-lg px-3 py-2 text-sm text-dark-200 placeholder-dark-600 focus:outline-none transition-colors ${
                    errors.keyPath ? 'border-red-500' : 'border-dark-800'
                  }`}
                />
                <button
                  type="button"
                  onClick={browseKeyFile}
                  disabled={isSubmitting}
                  className="px-3 py-2 bg-dark-800 hover:bg-dark-700 border border-dark-700 rounded-lg text-dark-300 transition-colors disabled:opacity-50"
                >
                  <FolderOpen className="w-4 h-4" />
                </button>
              </div>
              {errors.keyPath && <p className="text-xs text-red-400 mt-1">{errors.keyPath}</p>}
              <p className="text-xs text-dark-600 mt-1">
                Supports .pem, .ppk (PuTTY), .key, .rsa, .ed25519 formats
              </p>
              
              {/* Key Passphrase */}
              <div className="mt-3">
                <label className="block text-sm font-medium text-dark-300 mb-1">
                  Key Passphrase (optional)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.keyPassphrase}
                    onChange={(e) => updateField('keyPassphrase', e.target.value)}
                    placeholder="If your key is encrypted"
                    disabled={isSubmitting}
                    className="w-full bg-dark-950 border border-dark-800 rounded-lg px-3 py-2 pr-10 text-sm text-dark-200 placeholder-dark-600 focus:outline-none focus:border-neussh-500 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Password */}
          {formData.authType === 'password' && (
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">
                Password <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  disabled={isSubmitting}
                  className={`w-full bg-dark-950 border rounded-lg px-3 py-2 pr-10 text-sm text-dark-200 focus:outline-none focus:border-neussh-500 transition-colors disabled:opacity-50 ${
                    errors.password ? 'border-red-500' : 'border-dark-800'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password}</p>}
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Description (optional)</label>
            <textarea
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={2}
              placeholder="Notes about this server..."
              disabled={isSubmitting}
              className="w-full bg-dark-950 border border-dark-800 rounded-lg px-3 py-2 text-sm text-dark-200 placeholder-dark-600 focus:outline-none focus:border-neussh-500 resize-none disabled:opacity-50"
            />
          </div>

          {/* Test Result */}
          {testResult && (
            <div className={`p-3 rounded-lg text-sm ${
              testResult.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' :
              testResult.status === 'error' ? 'bg-red-500/10 text-red-400' :
              'bg-amber-500/10 text-amber-400'
            }`}>
              <div className="flex items-center gap-2">
                {testResult.status === 'success' && <Check className="w-4 h-4" />}
                <span>{testResult.message}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t border-dark-800">
            <button
              type="button"
              onClick={testConnection}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm bg-dark-800 hover:bg-dark-700 text-dark-300 rounded-lg transition-colors disabled:opacity-50"
            >
              Test Connection
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm text-dark-300 hover:bg-dark-800 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm bg-neussh-600 hover:bg-neussh-500 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {profile ? 'Save Changes' : 'Add Server'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileModal;
