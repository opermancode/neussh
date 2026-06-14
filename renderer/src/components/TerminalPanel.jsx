import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { Minus, Plus } from 'lucide-react';
import 'xterm/css/xterm.css';

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

const TerminalPanel = ({ connectionId, profile, onDisconnect }) => {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const cleanupRef = useRef(null);
  const [fontSize, setFontSize] = useState(14);
  const [duration, setDuration] = useState(0);
  const startTimeRef = useRef(Date.now());

  // Session timer
  useEffect(() => {
    startTimeRef.current = Date.now();
    const timer = setInterval(() => {
      setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [connectionId]);

  // Initialize terminal
  useEffect(() => {
    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize,
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

    // Store cleanup
    cleanupRef.current = () => {
      cleanupData();
      resizeObserver.disconnect();
      term.dispose();
    };

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
    // Re-create terminal when fontSize changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionId, fontSize]);

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

  const adjustFontSize = useCallback((delta) => {
    setFontSize(prev => Math.max(10, Math.min(28, prev + delta)));
  }, []);

  return (
    <div className="h-full flex flex-col bg-[#0c0c0c] animate-fade-in">
      {/* Terminal Toolbar */}
      <div className="h-9 bg-dark-900 border-b border-dark-800 flex items-center px-3 justify-between shrink-0">
        <div className="flex items-center gap-3 text-xs min-w-0">
          <span className="text-dark-400 font-mono truncate max-w-[200px]">{profile.username}@{profile.host}</span>
          <span className="text-dark-700 hidden sm:inline">|</span>
          <span className="text-dark-500 hidden sm:inline">Port {profile.port || 22}</span>
          <span className="text-dark-700 hidden sm:inline">|</span>
          <span className="text-emerald-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="hidden sm:inline">Connected</span>
          </span>
          <span className="text-dark-700 hidden sm:inline">|</span>
          <span className="text-dark-500 font-mono">{formatDuration(duration)}</span>
        </div>
        <div className="flex items-center gap-1">
          {/* Font size controls */}
          <div className="flex items-center gap-0.5 mr-1">
            <button
              onClick={() => adjustFontSize(-1)}
              className="p-1 hover:bg-dark-800 rounded text-dark-500 hover:text-dark-300 transition-colors"
              title="Decrease font size"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="text-xs text-dark-500 w-6 text-center font-mono">{fontSize}</span>
            <button
              onClick={() => adjustFontSize(1)}
              className="p-1 hover:bg-dark-800 rounded text-dark-500 hover:text-dark-300 transition-colors"
              title="Increase font size"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
          <div className="w-px h-4 bg-dark-700 mx-1" />
          <button
            onClick={handleCopy}
            className="text-xs px-2 py-1 hover:bg-dark-800 rounded text-dark-400 transition-colors"
            title="Copy (Ctrl+C)"
          >
            Copy
          </button>
          <button
            onClick={handlePaste}
            className="text-xs px-2 py-1 hover:bg-dark-800 rounded text-dark-400 transition-colors"
            title="Paste (Ctrl+V)"
          >
            Paste
          </button>
          <button
            onClick={handleSelectAll}
            className="text-xs px-2 py-1 hover:bg-dark-800 rounded text-dark-400 transition-colors hidden sm:inline"
            title="Select All (Ctrl+A)"
          >
            Select All
          </button>
          <div className="w-px h-4 bg-dark-700 mx-1" />
          <button
            onClick={onDisconnect}
            className="text-xs px-2 py-1 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded transition-colors"
            title="Disconnect (Ctrl+D)"
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
