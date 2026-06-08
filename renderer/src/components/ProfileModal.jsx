import React, { useState, useEffect } from 'react';
import { X, Key, Lock, Shield, FolderOpen, Eye, EyeOff, Server } from 'lucide-react';

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

  useEffect(() => {
    if (profile) {
      setFormData({
        ...profile,
        port: String(profile.port || 22)
      });
    }
  }, [profile]);

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.host.trim()) newErrors.host = 'Host is required';
    if (!formData.username.trim()) newErrors.username = 'Username is required';
    if (formData.authType === 'key' && !formData.keyPath) newErrors.keyPath = 'Key file required';
    if (formData.authType === 'password' && !formData.password) newErrors.password = 'Password required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSave({
        ...formData,
        port: parseInt(formData.port) || 22,
        id: profile?.id
      });
    }
  };

  const browseKeyFile = async () => {
    const path = await window.neusshAPI.selectKeyFile();
    if (path) {
      setFormData(prev => ({ ...prev, keyPath: path }));
      setErrors(prev => ({ ...prev, keyPath: null }));
    }
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

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
          <button onClick={onClose} className="p-1 hover:bg-dark-800 rounded-lg transition-colors">
            <X className="w-5 h-5 text-dark-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Server Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="e.g., Production Server"
              className={`w-full bg-dark-950 border rounded-lg px-3 py-2 text-sm text-dark-200 placeholder-dark-600 focus:outline-none focus:border-neussh-500 transition-colors ${errors.name ? 'border-red-500' : 'border-dark-800'}`}
            />
            {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-dark-300 mb-1">Host</label>
              <input
                type="text"
                value={formData.host}
                onChange={(e) => updateField('host', e.target.value)}
                placeholder="192.168.1.1 or example.com"
                className={`w-full bg-dark-950 border rounded-lg px-3 py-2 text-sm text-dark-200 placeholder-dark-600 focus:outline-none focus:border-neussh-500 transition-colors ${errors.host ? 'border-red-500' : 'border-dark-800'}`}
              />
              {errors.host && <p className="text-xs text-red-400 mt-1">{errors.host}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">Port</label>
              <input
                type="number"
                value={formData.port}
                onChange={(e) => updateField('port', e.target.value)}
                className="w-full bg-dark-950 border border-dark-800 rounded-lg px-3 py-2 text-sm text-dark-200 focus:outline-none focus:border-neussh-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Username</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => updateField('username', e.target.value)}
              placeholder="root, ubuntu, ec2-user..."
              className={`w-full bg-dark-950 border rounded-lg px-3 py-2 text-sm text-dark-200 placeholder-dark-600 focus:outline-none focus:border-neussh-500 transition-colors ${errors.username ? 'border-red-500' : 'border-dark-800'}`}
            />
            {errors.username && <p className="text-xs text-red-400 mt-1">{errors.username}</p>}
          </div>

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
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
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

          {formData.authType === 'key' && (
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">Private Key File</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.keyPath}
                  readOnly
                  placeholder="Click browse to select .pem, .ppk, or .key file"
                  className={`flex-1 bg-dark-950 border rounded-lg px-3 py-2 text-sm text-dark-200 placeholder-dark-600 focus:outline-none transition-colors ${errors.keyPath ? 'border-red-500' : 'border-dark-800'}`}
                />
                <button
                  type="button"
                  onClick={browseKeyFile}
                  className="px-3 py-2 bg-dark-800 hover:bg-dark-700 border border-dark-700 rounded-lg text-dark-300 transition-colors"
                >
                  <FolderOpen className="w-4 h-4" />
                </button>
              </div>
              {errors.keyPath && <p className="text-xs text-red-400 mt-1">{errors.keyPath}</p>}
              <p className="text-xs text-dark-600 mt-1">
                Supports .pem, .ppk (PuTTY), .key, .rsa, .ed25519 formats
              </p>
              
              <div className="mt-3">
                <label className="block text-sm font-medium text-dark-300 mb-1">Key Passphrase (optional)</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.keyPassphrase}
                    onChange={(e) => updateField('keyPassphrase', e.target.value)}
                    placeholder="If your key is encrypted"
                    className="w-full bg-dark-950 border border-dark-800 rounded-lg px-3 py-2 pr-10 text-sm text-dark-200 placeholder-dark-600 focus:outline-none focus:border-neussh-500"
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

          {formData.authType === 'password' && (
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  className={`w-full bg-dark-950 border rounded-lg px-3 py-2 pr-10 text-sm text-dark-200 focus:outline-none focus:border-neussh-500 transition-colors ${errors.password ? 'border-red-500' : 'border-dark-800'}`}
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

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Description (optional)</label>
            <textarea
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={2}
              placeholder="Notes about this server..."
              className="w-full bg-dark-950 border border-dark-800 rounded-lg px-3 py-2 text-sm text-dark-200 placeholder-dark-600 focus:outline-none focus:border-neussh-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-dark-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-dark-300 hover:bg-dark-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm bg-neussh-600 hover:bg-neussh-500 text-white rounded-lg transition-colors"
            >
              {profile ? 'Save Changes' : 'Add Server'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileModal;
