&lt;div align="center"&gt;

&lt;img src="https://raw.githubusercontent.com/neussh/neussh/main/build/icon.png" width="120" height="120" alt="NeuSSH Logo"&gt;

# 🔐 NeuSSH

**Modern SSH Connection Manager for macOS & Windows**

[![Version](https://img.shields.io/github/v/release/neussh/neussh?style=flat-square)](https://github.com/neussh/neussh/releases)
[![macOS](https://img.shields.io/badge/macOS-Universal-000000?style=flat-square&logo=apple)](https://github.com/neussh/neussh/releases)
[![Windows](https://img.shields.io/badge/Windows-x64%20%7C%20x86-0078D6?style=flat-square&logo=windows)](https://github.com/neussh/neussh/releases)
[![License](https://img.shields.io/github/license/neussh/neussh?style=flat-square)](LICENSE)

[🚀 Download](https://github.com/neussh/neussh/releases) • [📖 Docs](https://neussh.dev) • [🐛 Issues](https://github.com/neussh/neussh/issues)

&lt;/div&gt;

---

## ✨ Why NeuSSH?

| Feature | PuTTY | Terminal.app | NeuSSH |
|---------|-------|--------------|--------|
| 🖥️ **Modern Terminal** | Basic | Basic | xterm.js with 256 colors, links, copy/paste |
| 🔑 **Key Support** | Only `.ppk` | Limited | `.pem`, `.ppk`, `.key`, `.rsa`, `.ed25519`, password, agent |
| 💾 **Save Servers** | Registry | None | Encrypted JSON, import/export |
| ⚡ **Connect** | Multi-click | Manual | One-click or double-click |
| 🔍 **Search** | None | None | Real-time filter by name/host/user |
| 🌙 **UI** | Windows 95 | Basic | Modern dark theme with Tailwind |
| 🍎 **macOS** | ❌ | Native | ✅ Native + Universal binary |
| 🪟 **Windows** | ✅ | ❌ | ✅ Installer + Portable |

---

## 🚀 Quick Start

### Download Pre-built Binaries

| Platform | Download | Size | Architecture |
|----------|----------|------|--------------|
| **macOS** | [`NeuSSH-1.0.0.dmg`](https://github.com/neussh/neussh/releases/latest) | ~85 MB | Intel + Apple Silicon |
| **Windows** | [`NeuSSH-Setup-1.0.0.exe`](https://github.com/neussh/neussh/releases/latest) | ~80 MB | x64, x86 |
| **Windows Portable** | [`NeuSSH-Portable-1.0.0.exe`](https://github.com/neussh/neussh/releases/latest) | ~80 MB | x64 |

### macOS Installation

1. Download `NeuSSH-1.0.0.dmg`
2. Open the DMG and drag **NeuSSH** to **Applications**
3. On first launch, right-click the app → **Open** (bypass Gatekeeper)
4. The app is a **Universal binary** — works on both Intel and Apple Silicon Macs

### Windows Installation

1. Download `NeuSSH-Setup-1.0.0.exe` (installer) or `NeuSSH-Portable-1.0.0.exe` (no install)
2. Run the installer and follow the setup wizard
3. Launch from Desktop shortcut or Start Menu

### Build from Source

```bash
# Clone
git clone https://github.com/neussh/neussh.git
cd neussh

# Install
npm install

# Run dev mode
npm run dev

# Build for current platform
npm run build
