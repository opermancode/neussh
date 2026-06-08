# neussh

neussh/
├── .github/workflows/build.yml   # CI/CD for auto-building releases
├── src/
│   ├── main.js                   # Electron main + ssh2 engine
│   └── preload.js                # Secure IPC bridge (neusshAPI)
├── renderer/
│   ├── src/
│   │   ├── App.jsx               # Main React app
│   │   ├── components/
│   │   │   ├── Sidebar.jsx       # Server list with search
│   │   │   ├── TerminalPanel.jsx # xterm.js terminal
│   │   │   ├── ProfileModal.jsx   # Add/Edit server
│   │   │   ├── QuickConnectModal.jsx
│   │   │   └── SettingsModal.jsx  # Import/Export/About
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   └── tailwind.config.js
├── build/                        # App icons
├── package.json                  # electron-builder config
├── README.md
├── LICENSE (MIT)
├── CONTRIBUTING.md
└── .gitignore
