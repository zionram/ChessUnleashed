import React, { useState, useRef, useEffect } from 'react';
import { getFicsAdapter } from '../services/online/fics/FicsAdapter';
import { FicsProtocolParser } from '../services/online/fics/FicsProtocolParser';
import type { FicsServerMessage, FicsLoginStatus, FicsGameState, FicsGameRow, FicsSeekRow } from '../services/online/fics/FicsTypes';
import type { ConnectionStatus } from '../services/online/OnlineServiceAdapter';

const adapter = getFicsAdapter();
const localParser = new FicsProtocolParser(); // for inject buttons only

const metaColor: Record<FicsServerMessage['type'], string> = {
  login: '#fbbf24',
  game: '#86efac',
  seek: '#93c5fd',
  challenge: '#f9a8d4',
  chat: '#c4b5fd',
  error: '#fca5a5',
  system: '#94a3b8',
  unknown: '#475569'
};

const loginStatusColor: Record<FicsLoginStatus, string> = {
  disconnected: '#64748b',
  connecting: '#fbbf24',
  'awaiting-login': '#fbbf24',
  'logging-in': '#fbbf24',
  'logged-in': '#86efac',
  'login-failed': '#fca5a5',
  error: '#fca5a5'
};

const inputStyle: React.CSSProperties = {
  padding: '6px 8px', fontSize: '0.76rem',
  background: 'rgba(2, 6, 23, 0.82)', color: '#86efac',
  border: '1px solid rgba(148, 163, 184, 0.18)', borderRadius: 6,
  fontFamily: 'monospace', boxSizing: 'border-box', flex: 1
};

const qbtnStyle: React.CSSProperties = {
  padding: '4px 9px', fontSize: '0.7rem', borderRadius: 5,
  border: '1px solid rgba(148, 163, 184, 0.16)',
  background: 'rgba(15, 23, 42, 0.72)', color: '#94a3b8', cursor: 'pointer'
};

const QUICK_CMDS: { label: string; cmd: string }[] = [
  { label: 'guest', cmd: 'guest' },
  { label: 'style 12', cmd: 'set style 12' },
  { label: 'seek 5 0', cmd: 'seek 5 0 unrated' },
  { label: 'sought', cmd: 'sought' },
  { label: 'games', cmd: 'games' },
  { label: 'who', cmd: 'who' },
  { label: 'players', cmd: 'players' },
  { label: 'unseek', cmd: 'unseek' }
];

const FicsConsoleView: React.FC = () => {
  const [log, setLog] = useState<FicsServerMessage[]>([]);
  const [cmdInput, setCmdInput] = useState('');
  const [obsInput, setObsInput] = useState('');
  const [tcpStatus, setTcpStatus] = useState<ConnectionStatus>(adapter.status);
  const [loginStatus, setLoginStatus] = useState<FicsLoginStatus>(adapter.loginStatus);
  const [handle, setHandle] = useState<string | null>(adapter.handle);
  const [gameState, setGameState] = useState<FicsGameState | null>(adapter.gameState);
  const [gameRows, setGameRows] = useState<FicsGameRow[]>(adapter.gameRows);
  const [seekRows, setSeekRows] = useState<FicsSeekRow[]>(adapter.seekRows);
  const logEndRef = useRef<HTMLDivElement>(null);

  const isConnected = tcpStatus === 'connected';
  const hasElectron = adapter.bridgeAvailable;

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log]);

  useEffect(() => {
    const unsubs = [
      adapter.onData(msg => setLog(prev => [...prev.slice(-499), msg])),
      adapter.onStatusChange(s => setTcpStatus(s)),
      adapter.onLoginStatus(s => { setLoginStatus(s); setHandle(adapter.handle); }),
      adapter.onGameState(g => setGameState(g)),
      adapter.onGamesUpdated(rows => setGameRows(rows)),
      adapter.onSoughtUpdated(rows => setSeekRows(rows))
    ];
    return () => unsubs.forEach(fn => fn());
  }, []);

  const appendInject = (raw: string) => {
    setLog(prev => [...prev.slice(-499), localParser.parse(raw)]);
  };

  const sendCmd = (cmd: string) => {
    if (!isConnected) return;
    if (cmd === 'games') {
      adapter.requestGames();
    } else if (cmd === 'sought') {
      adapter.requestSought();
    } else {
      adapter.sendRaw(cmd);
    }
    appendInject(`[→ sent] ${cmd}`);
  };

  const handleSend = () => {
    const cmd = cmdInput.trim();
    if (!cmd || !isConnected) return;
    sendCmd(cmd);
    setCmdInput('');
  };

  return (
    <div className="view-container" style={{ color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: 8 }}>

      {/* Status summary */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '7px 10px', borderRadius: 7, background: 'rgba(2, 6, 23, 0.72)', border: '1px solid rgba(148, 163, 184, 0.14)', fontSize: '0.7rem' }}>
        <span>TCP: <strong style={{ color: tcpStatus === 'connected' ? '#86efac' : tcpStatus === 'connecting' ? '#fbbf24' : tcpStatus === 'error' ? '#fca5a5' : '#94a3b8' }}>{tcpStatus}</strong></span>
        <span style={{ color: '#334155' }}>|</span>
        <span>Login: <strong style={{ color: loginStatusColor[loginStatus] }}>{loginStatus}</strong></span>
        <span style={{ color: '#334155' }}>|</span>
        <span>Handle: <strong style={{ color: handle ? '#93c5fd' : '#475569' }}>{handle ?? '—'}</strong></span>
        <span style={{ color: '#334155' }}>|</span>
        <span>Game: <strong style={{ color: gameState ? '#86efac' : '#475569' }}>{gameState?.gameId ?? '—'}</strong></span>
        <span style={{ color: '#334155' }}>|</span>
        <span>S12: <strong style={{ color: adapter.style12Active ? '#86efac' : adapter.style12Requested ? '#fbbf24' : '#475569' }}>{adapter.style12Active ? 'active' : adapter.style12Requested ? 'requested' : 'off'}</strong></span>
        <span style={{ color: '#334155' }}>|</span>
        <span>Bridge: <strong style={{ color: hasElectron ? '#86efac' : '#ef4444' }}>{hasElectron ? 'electron' : 'none'}</strong></span>
      </div>

      {!hasElectron && (
        <div style={{ padding: '5px 10px', borderRadius: 6, background: 'rgba(120, 53, 15, 0.18)', border: '1px solid rgba(251, 191, 36, 0.18)', fontSize: '0.68rem', color: '#fbbf24' }}>
          ⚠ Electron bridge unavailable — commands are no-ops.
        </div>
      )}

      {/* Quick commands */}
      <div>
        <div style={{ fontSize: '0.62rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Quick Commands</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {QUICK_CMDS.map(({ label, cmd }) => (
            <button key={cmd} style={{ ...qbtnStyle, opacity: isConnected ? 1 : 0.45 }} onClick={() => sendCmd(cmd)} disabled={!isConnected} title={cmd}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Observe row */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <input
          type="text"
          value={obsInput}
          onChange={e => setObsInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && obsInput.trim()) { adapter.observeGame(obsInput); appendInject(`[→ sent] observe ${obsInput}`); } }}
          placeholder="Game ID to observe"
          style={{ ...inputStyle, flex: 1, fontSize: '0.7rem', height: 26, padding: '3px 7px', color: '#93c5fd' }}
          disabled={loginStatus !== 'logged-in'}
        />
        <button
          style={{ ...qbtnStyle, opacity: loginStatus === 'logged-in' && obsInput.trim() ? 1 : 0.45, color: '#93c5fd' }}
          onClick={() => { if (obsInput.trim()) { adapter.observeGame(obsInput); appendInject(`[→ sent] observe ${obsInput}`); } }}
          disabled={loginStatus !== 'logged-in' || !obsInput.trim()}
          title={`observe ${obsInput || '<id>'}`}
        >
          observe
        </button>
        <button
          style={{ ...qbtnStyle, opacity: isConnected ? 1 : 0.45 }}
          onClick={() => { adapter.unobserveGame(); appendInject('[→ sent] unobserve'); }}
          disabled={!isConnected}
          title="unobserve"
        >
          unobserve
        </button>
      </div>

      {(gameRows.length > 0 || seekRows.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={{ border: '1px solid rgba(148,163,184,0.12)', borderRadius: 6, padding: 6, background: 'rgba(8,18,34,0.42)', minHeight: 40 }}>
            <div style={{ fontSize: '0.62rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Games ({gameRows.length})</div>
            {gameRows.slice(0, 6).map(row => (
              <div key={row.gameId} style={{ display: 'flex', gap: 5, alignItems: 'center', fontSize: '0.66rem', color: '#94a3b8', marginBottom: 3 }}>
                <span style={{ color: '#475569' }}>#{row.gameId}</span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.white} vs {row.black}</span>
                <button style={{ ...qbtnStyle, padding: '2px 6px', fontSize: '0.62rem', color: '#93c5fd' }} onClick={() => { adapter.observeGame(String(row.gameId)); appendInject(`[→ sent] observe ${row.gameId}`); }}>observe</button>
              </div>
            ))}
          </div>
          <div style={{ border: '1px solid rgba(148,163,184,0.12)', borderRadius: 6, padding: 6, background: 'rgba(8,18,34,0.42)', minHeight: 40 }}>
            <div style={{ fontSize: '0.62rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Seeks ({seekRows.length})</div>
            {seekRows.slice(0, 6).map(row => (
              <div key={row.seekId} style={{ display: 'flex', gap: 5, alignItems: 'center', fontSize: '0.66rem', color: '#94a3b8', marginBottom: 3 }}>
                <span style={{ color: '#475569' }}>{row.seekId}</span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.player} {row.timeMinutes}+{row.incrementSeconds}</span>
                <button style={{ ...qbtnStyle, padding: '2px 6px', fontSize: '0.62rem', color: '#86efac' }} onClick={() => { adapter.playSeek(row.seekId); appendInject(`[→ sent] play ${row.seekId}`); }}>play</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Raw server log */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div style={{ fontSize: '0.62rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Server Log ({log.length})
        </div>
        <div style={{ height: 220, overflowY: 'auto', background: 'rgba(2, 6, 23, 0.88)', border: '1px solid rgba(148, 163, 184, 0.14)', borderRadius: 6, padding: '8px', fontFamily: 'monospace', fontSize: '0.72rem', lineHeight: 1.5 }}>
          {log.length === 0 ? (
            <span style={{ color: '#334155', fontStyle: 'italic' }}>
              {isConnected ? 'Connected — waiting for server data…' : 'Not connected.'}
            </span>
          ) : (
            log.map((msg, i) => (
              <div key={i} style={{ color: metaColor[msg.type] }}>
                <span style={{ color: '#334155', marginRight: 5 }}>{new Date(msg.timestamp).toISOString().slice(11, 23)}</span>
                <span style={{ color: '#475569', marginRight: 5 }}>[{msg.type}]</span>
                <span style={{ wordBreak: 'break-all' }}>{msg.raw}</span>
                {msg.style12 && (
                  <span style={{ color: '#64748b', marginLeft: 6 }}>
                    [S12 #{msg.style12.gameId} {msg.style12.whiteName} vs {msg.style12.blackName} mv{msg.style12.moveNumber}]
                  </span>
                )}
              </div>
            ))
          )}
          <div ref={logEndRef} />
        </div>
      </div>

      {/* Command input */}
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          style={inputStyle}
          type="text" value={cmdInput}
          onChange={e => setCmdInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
          placeholder={isConnected ? 'Enter FICS command…' : 'Connect via FICS Online first…'}
        />
        <button
          onClick={handleSend} disabled={!isConnected || !cmdInput.trim()}
          style={{ padding: '6px 12px', fontSize: '0.78rem', borderRadius: 6, border: '1px solid rgba(148, 163, 184, 0.18)', background: isConnected ? 'rgba(14, 47, 72, 0.88)' : 'rgba(15, 23, 42, 0.64)', color: isConnected ? '#86efac' : '#64748b', cursor: isConnected ? 'pointer' : 'not-allowed' }}
        >
          Send
        </button>
      </div>

      {/* Dev inject */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        <button onClick={() => appendInject('login: freechess.org FICS stub.')} style={qbtnStyle}>+ login stub</button>
        <button onClick={() => appendInject('<12> rnbqkbnr pppppppp -------- -------- -------- -------- PPPPPPPP RNBQKBNR W -1 1 1 1 1 0 42 GuestABC GuestXYZ -1 5 0 39 39 300 300 1 none (0:00) none 0 0 0')} style={qbtnStyle}>+ style12 stub</button>
        <button onClick={() => appendInject('Challenge: GuestXXXX (----) GuestYYYY (----) unrated blitz 5 0.')} style={qbtnStyle}>+ challenge stub</button>
        <button onClick={() => setLog([])} style={{ ...qbtnStyle, marginLeft: 'auto', color: '#64748b' }}>Clear</button>
      </div>
    </div>
  );
};

export default FicsConsoleView;
