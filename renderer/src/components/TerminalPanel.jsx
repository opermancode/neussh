import React, { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';

const TerminalPanel = ({ connectionId, profile, onDisconnect }) => {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);

  useEffect(() => {
    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 14,
      fontFamily: '"JetBrains Mono", "Fira Code", Consolas, monospace',
      theme: {
        background: '#0c0c0c',
        foreground: '#cccccc',
        cursor: '#ffffff',
        selectionBackground: '#264f78',
        black: '#0c0c0c',
        red: '#c50f1f',
        green: '#13a10e',
        yellow: '#c19c00',
        blue: '#0037da',
        magenta: '#881798',
        cyan: '#3a96dd',
        white: '#cccccc',
        brightBlack: '#767676',
        brightRed: '#e74856',
        brightGreen: '#16c60c',
        brightYellow: '#f9f1a5',
        brightBlue: '#3b78ff',
        brightMagenta: '#b4009e',
        brightCyan: '#61d6d6',
        brightWhite: '#f2f2f2'
      },
      scrollback: 10000,
      allowProposedApi: true
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    
    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    
    if (terminalRef.current) {
      term.open(terminalRef.current);
      fitAddon.fit();
    }

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    const cleanup = window.neusshAPI.onSSHData(connectionId, (data) => {
      term.write(data);
    });

    term.onData((data) => {
      window.neusshAPI.sendSSH(connectionId, data);
    });

    const handleResize = () => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
        const { cols, rows } = term;
        window.neusshAPI.resizeSSH(connectionId, cols, rows);
      }
    };

    window.addEventListener('resize', handleResize);
    setTimeout(handleResize, 100);

    return () => {
      cleanup();
      window.removeEventListener('resize', handleResize);
      term.dispose();
    };
  }, [connectionId]);

  useEffect(() => {
    const term = xtermRef.current;
    if (!term) return;

    const handleKey = (e) => {
      if (e.ctrlKey && e.key === 'c' && term.hasSelection()) {
        e.preventDefault();
        navigator.clipboard.writeText(term.getSelection());
      }
      if (e.ctrlKey && e.key === 'v') {
        e.preventDefault();
        navigator.clipboard.readText().then(text => {
          window.neusshAPI.sendSSH(connectionId, text);
        });
      }
    };

    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [connectionId]);

  return (
    <div className="h-full flex flex-col bg-[#0c0c0c]">
      {/* Terminal Toolbar */}
      <div className="h-9 bg-dark-900 border-b border-dark-800 flex items-center px-3 justify-between shrink-0">
        <div className="flex items-center gap-3 text-xs">
          <span className="text-dark-400 font-mono">{profile.username}@{profile.host}</span>
          <span className="text-dark-700">|</span>
          <span className="text-dark-500">Port {profile.port || 22}</span>
          <span className="text-dark-700">|</span>
          <span className="text-emerald-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Connected
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const term = xtermRef.current;
              if (term) navigator.clipboard.writeText(term.getSelection());
            }}
            className="text-xs px-2 py-1 hover:bg-dark-800 rounded text-dark-400 transition-colors"
          >
            Copy
          </button>
          <button
            onClick={() => {
              navigator.clipboard.readText().then(text => {
                window.neusshAPI.sendSSH(connectionId, text);
              });
            }}
            className="text-xs px-2 py-1 hover:bg-dark-800 rounded text-dark-400 transition-colors"
          >
            Paste
          </button>
          <button
            onClick={onDisconnect}
            className="text-xs px-2 py-1 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded transition-colors"
          >
            Disconnect
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden terminal-container">
        <div ref={terminalRef} className="h-full w-full" />
      </div>
    </div>
  );
};

export default TerminalPanel;
