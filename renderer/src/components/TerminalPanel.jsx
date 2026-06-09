import React, { useEffect, useRef, useCallback } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';

const TerminalPanel = ({ connectionId, profile, onDisconnect }) => {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);
  const resizeObserverRef = useRef(null);

  // Initialize terminal
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
      allowProposedApi: true,
      screenReaderMode: false,
      convertEol: true
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

    // Setup SSH data listener
    const cleanupData = window.neusshAPI.onSSHData(connectionId, (data) => {
      try {
        term.write(data);
      } catch (e) {
        console.error('Error writing to terminal:', e);
      }
    });

    // Handle terminal input
    const onDataHandler = (data) => {
      try {
        window.neusshAPI.sendSSH(connectionId, data);
      } catch (e) {
        console.error('Error sending SSH data:', e);
      }
    };
    term.onData(onDataHandler);

    // Handle resize with ResizeObserver
    const resizeObserver = new ResizeObserver(() => {
      if (fitAddonRef.current && xtermRef.current) {
        try {
          fitAddonRef.current.fit();
          const { cols, rows } = xtermRef.current;
          window.neusshAPI.resizeSSH(connectionId, cols, rows);
        } catch (e) {
          console.error('Error resizing terminal:', e);
        }
      }
    });
    
    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current);
    }
    resizeObserverRef.current = resizeObserver;

    // Initial resize
    setTimeout(() => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
      }
    }, 100);

    return () => {
      cleanupData();
      resizeObserver.disconnect();
      term.dispose();
    };
  }, [connectionId]);

  // Handle copy/paste
  useEffect(() => {
    const term = xtermRef.current;
    if (!term) return;

    const handleKey = (e) => {
      // Copy: Ctrl+C (with selection)
      if (e.ctrlKey && e.key === 'c' && term.hasSelection()) {
        e.preventDefault();
        const selection = term.getSelection();
        navigator.clipboard.writeText(selection).catch(err => {
          console.error('Copy failed:', err);
        });
      }
      
      // Paste: Ctrl+V
      if (e.ctrlKey && e.key === 'v') {
        e.preventDefault();
        navigator.clipboard.readText().then(text => {
          if (text) {
            window.neusshAPI.sendSSH(connectionId, text);
          }
        }).catch(err => {
          console.error('Paste failed:', err);
        });
      }
      
      // Select All: Ctrl+A
      if (e.ctrlKey && e.key === 'a') {
        e.preventDefault();
        term.selectAll();
      }
    };

    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [connectionId]);

  // Handle selection for copy
  const handleCopy = useCallback(() => {
    const term = xtermRef.current;
    if (term && term.hasSelection()) {
      navigator.clipboard.writeText(term.getSelection()).catch(err => {
        console.error('Copy failed:', err);
      });
    }
  }, []);

  const handlePaste = useCallback(() => {
    navigator.clipboard.readText().then(text => {
      if (text) {
        window.neusshAPI.sendSSH(connectionId, text);
      }
    }).catch(err => {
      console.error('Paste failed:', err);
    });
  }, [connectionId]);

  const handleSelectAll = useCallback(() => {
    const term = xtermRef.current;
    if (term) {
      term.selectAll();
    }
  }, []);

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
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="text-xs px-2 py-1 hover:bg-dark-800 rounded text-dark-400 transition-colors"
            title="Copy"
          >
            Copy
          </button>
          <button
            onClick={handlePaste}
            className="text-xs px-2 py-1 hover:bg-dark-800 rounded text-dark-400 transition-colors"
            title="Paste"
          >
            Paste
          </button>
          <button
            onClick={handleSelectAll}
            className="text-xs px-2 py-1 hover:bg-dark-800 rounded text-dark-400 transition-colors"
            title="Select All"
          >
            Select All
          </button>
          <div className="w-px h-4 bg-dark-700 mx-1" />
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
