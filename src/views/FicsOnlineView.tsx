import React, { useState, useEffect } from 'react';
import { getFicsAdapter } from '../services/online/fics/FicsAdapter';
import type { FicsLoginMode, FicsSeekRequest, FicsLoginStatus, FicsChallenge, FicsGameState, Style12Data, FicsGameRow, FicsSeekRow } from '../services/online/fics/FicsTypes';
import FicsBoardPreview from './FicsBoardPreview';

const adapter = getFicsAdapter();
const FICS_REGISTER_URL = 'https://www.freechess.org/Register/';

const inputStyle: React.CSSProperties = {
  padding: '6px 8px',
  fontSize: '0.8rem',
  background: 'rgba(15, 23, 42, 0.72)',
  color: '#dbeafe',
  border: '1px solid rgba(148, 163, 184, 0.24)',
  borderRadius: 6,
  width: '100%',
  boxSizing: 'border-box'
};

const btnStyle = (active = false, disabled = false): React.CSSProperties => ({
  padding: '7px 12px',
  borderRadius: 7,
  border: active ? '1px solid rgba(56, 189, 248, 0.72)' : '1px solid rgba(148, 163, 184, 0.22)',
  background: active ? 'rgba(14, 47, 72, 0.88)' : 'rgba(15, 23, 42, 0.64)',
  color: disabled ? '#64748b' : '#dbeafe',
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontSize: '0.8rem',
  opacity: disabled ? 0.6 : 1
});

const smBtn = (color = '#94a3b8'): React.CSSProperties => ({
  padding: '3px 8px', fontSize: '0.68rem', borderRadius: 5,
  border: '1px solid rgba(148,163,184,0.18)',
  background: 'rgba(15,23,42,0.72)', color, cursor: 'pointer'
});

const sectionStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 8,
  padding: '10px 12px', borderRadius: 8,
  border: '1px solid rgba(148, 163, 184, 0.14)',
  background: 'rgba(8, 18, 34, 0.72)'
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.68rem', color: '#94a3b8',
  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2
};

const loginStatusColor: Record<FicsLoginStatus, string> = {
  disconnected: '#94a3b8',
  connecting: '#fbbf24',
  'awaiting-login': '#fbbf24',
  'logging-in': '#fbbf24',
  'logged-in': '#86efac',
  'login-failed': '#fca5a5',
  error: '#fca5a5'
};

const loginStatusLabel: Record<FicsLoginStatus, string> = {
  disconnected: 'Disconnected',
  connecting: 'Connecting…',
  'awaiting-login': 'Awaiting login…',
  'logging-in': 'Logging in…',
  'logged-in': 'Logged in',
  'login-failed': 'Login failed',
  error: 'Error'
};

const FicsOnlineView: React.FC = () => {
  const [loginStatus, setLoginStatus] = useState<FicsLoginStatus>(adapter.loginStatus);
  const [handle, setHandle] = useState<string | null>(adapter.handle);
  const [challenges, setChallenges] = useState<FicsChallenge[]>(adapter.challenges);
  const [gameState, setGameState] = useState<FicsGameState | null>(adapter.gameState);
  const [latestStyle12, setLatestStyle12] = useState<Style12Data | null>(adapter.latestStyle12);
  const [observedGameId, setObservedGameId] = useState<string | null>(adapter.observedGameId);
  const [gameRows, setGameRows] = useState<FicsGameRow[]>(adapter.gameRows);
  const [seekRows, setSeekRows] = useState<FicsSeekRow[]>(adapter.seekRows);
  const [errorMsg, setErrorMsg] = useState('');

  const [loginMode, setLoginMode] = useState<FicsLoginMode>('guest');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [seekTime, setSeekTime] = useState(5);
  const [seekInc, setSeekInc] = useState(0);
  const [seekRated, setSeekRated] = useState(false);
  const [seekColor, setSeekColor] = useState<FicsSeekRequest['color']>('auto');
  const [seeking, setSeeking] = useState(false);

  const [observeInput, setObserveInput] = useState('');

  const [matchHandle, setMatchHandle] = useState('');
  const [matchTime, setMatchTime] = useState(5);
  const [matchInc, setMatchInc] = useState(0);
  const [matchRated, setMatchRated] = useState(false);

  const [moveInput, setMoveInput] = useState('');
  const [chatInput, setChatInput] = useState('');

  const isLoggedIn = loginStatus === 'logged-in';
  const canConnect = loginStatus === 'disconnected' || loginStatus === 'login-failed' || loginStatus === 'error';
  const isPlaying = Math.abs(adapter.myRelation) === 1;
  const myTurn = isPlaying && latestStyle12
    ? (adapter.myRelation === 1 && latestStyle12.turn === 'white') || (adapter.myRelation === -1 && latestStyle12.turn === 'black')
    : false;

  useEffect(() => {
    const unsubs = [
      adapter.onLoginStatus(s => {
        setLoginStatus(s);
        setHandle(adapter.handle);
        if (s === 'login-failed') setErrorMsg('Login failed. Check credentials.');
        if (s === 'logged-in') { setErrorMsg(''); setSeeking(false); }
        if (s === 'disconnected' || s === 'error') {
          setSeeking(false);
          setChallenges([]);
          setGameState(null);
          setLatestStyle12(null);
          setObservedGameId(null);
          setGameRows([]);
          setSeekRows([]);
        }
      }),
      adapter.onChallenges(list => setChallenges(list)),
      adapter.onGameState(state => setGameState(state)),
      adapter.onStyle12(s12 => setLatestStyle12(s12)),
      adapter.onObserveChange(id => setObservedGameId(id)),
      adapter.onGamesUpdated(rows => setGameRows(rows)),
      adapter.onSoughtUpdated(rows => setSeekRows(rows))
    ];
    return () => unsubs.forEach(fn => fn());
  }, []);

  const handleConnect = async () => {
    setErrorMsg('');
    try {
      await adapter.connect({ mode: loginMode, username: loginMode === 'account' ? username : undefined, password: loginMode === 'account' ? password : undefined });
    } catch (e) {
      setErrorMsg((e as Error).message);
    }
  };

  const handleDisconnect = async () => {
    await adapter.disconnect();
    setErrorMsg('');
  };

  const openFicsRegistration = () => {
    window.open(FICS_REGISTER_URL, '_blank', 'noopener,noreferrer');
  };

  const handleSeek = () => {
    adapter.seekGame({ timeMinutes: seekTime, incrementSeconds: seekInc, rated: seekRated, color: seekColor });
    setSeeking(true);
  };

  const handleCancelSeek = () => {
    adapter.cancelSeek();
    setSeeking(false);
  };

  const handleSendMove = () => {
    const m = moveInput.trim();
    if (!m) return;
    adapter.sendMove(m);
    setMoveInput('');
  };

  const handleMatch = () => {
    const h = matchHandle.trim();
    if (!h) return;
    adapter.matchPlayer(h, matchTime, matchInc, matchRated);
  };

  const handleChat = () => {
    if (!chatInput.trim()) return;
    adapter.sendChat(chatInput.trim());
    setChatInput('');
  };

  return (
    <div className="view-container" style={{ color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* Status banner */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 7, background: 'rgba(15, 23, 42, 0.82)', border: '1px solid rgba(148, 163, 184, 0.14)' }}>
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: loginStatusColor[loginStatus], flexShrink: 0, display: 'inline-block' }} />
        <span style={{ fontSize: '0.78rem', color: loginStatusColor[loginStatus], fontWeight: 600 }}>
          {loginStatusLabel[loginStatus]}{handle ? ` as ${handle}` : ''}
        </span>
        <span style={{ fontSize: '0.68rem', color: '#64748b', marginLeft: 'auto' }}>
          {adapter.style12Requested ? (adapter.style12Active ? 'Style 12 ✓' : 'Style 12 pending') : ''}
        </span>
        <span style={{ fontSize: '0.72rem', color: '#475569' }}>freechess.org:5000</span>
      </div>

      {errorMsg && (
        <div style={{ padding: '7px 10px', borderRadius: 6, background: 'rgba(127, 29, 29, 0.38)', border: '1px solid rgba(252, 165, 165, 0.28)', fontSize: '0.75rem', color: '#fca5a5' }}>
          {errorMsg}
        </div>
      )}

      {!adapter.bridgeAvailable && (
        <div style={{ padding: '6px 10px', borderRadius: 6, background: 'rgba(120, 53, 15, 0.22)', border: '1px solid rgba(251, 191, 36, 0.22)', fontSize: '0.72rem', color: '#fbbf24' }}>
          ⚠ Electron bridge unavailable. Run in Electron for live TCP connection.
        </div>
      )}

      {/* Connection */}
      <section style={sectionStyle}>
        <div style={labelStyle}>Connection</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={btnStyle(loginMode === 'guest')} onClick={() => setLoginMode('guest')} disabled={!canConnect}>Guest</button>
          <button style={btnStyle(loginMode === 'account')} onClick={() => setLoginMode('account')} disabled={!canConnect}>Account</button>
        </div>
        {loginMode === 'account' && canConnect && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div><div style={labelStyle}>Username</div>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="FICS handle" style={inputStyle} autoComplete="username" />
            </div>
            <div><div style={labelStyle}>Password</div>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="FICS password" style={inputStyle} autoComplete="current-password" />
            </div>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '7px 8px', borderRadius: 6, background: 'rgba(15, 23, 42, 0.42)', border: '1px solid rgba(148, 163, 184, 0.12)' }}>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.35 }}>
            Need a permanent FICS handle? Register on the official FICS site, then return here and log in with Account. Chess Unleashed does not store registration details.
          </div>
          <button
            type="button"
            onClick={openFicsRegistration}
            style={{ ...btnStyle(false, false), alignSelf: 'flex-start', padding: '5px 10px', fontSize: '0.72rem', color: '#93c5fd' }}
          >
            Register on FICS ↗
          </button>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            style={{ ...btnStyle(false, !canConnect), flex: 1, background: 'rgba(14, 47, 72, 0.88)', border: '1px solid rgba(56, 189, 248, 0.38)' }}
            onClick={handleConnect} disabled={!canConnect}
          >
            {loginStatus === 'connecting' ? 'Connecting…' : loginStatus === 'awaiting-login' ? 'Awaiting login…' : loginStatus === 'logging-in' ? 'Logging in…' : 'Connect'}
          </button>
          <button style={{ ...btnStyle(false, canConnect), flex: 1 }} onClick={handleDisconnect} disabled={canConnect}>
            Disconnect
          </button>
        </div>
      </section>

      {isLoggedIn && (
        <div style={{ padding: '7px 10px', borderRadius: 6, background: 'rgba(20, 83, 45, 0.16)', border: '1px solid rgba(74, 222, 128, 0.18)', fontSize: '0.72rem', color: '#86efac' }}>
          Logged in as {handle ?? 'guest'}. Use Seek Game, Open Seeks, Match Player, or Observe Game below. Disconnect to switch Guest/Account login.
        </div>
      )}

      {/* Quick seek */}
      <section style={{ ...sectionStyle, opacity: isLoggedIn ? 1 : 0.5 }}>
        <div style={labelStyle}>Play: Seek Game</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <div><div style={labelStyle}>Time (min)</div>
            <input type="number" min={1} max={60} value={seekTime} onChange={e => setSeekTime(Number(e.target.value))} style={inputStyle} disabled={!isLoggedIn} />
          </div>
          <div><div style={labelStyle}>Increment (s)</div>
            <input type="number" min={0} max={60} value={seekInc} onChange={e => setSeekInc(Number(e.target.value))} style={inputStyle} disabled={!isLoggedIn} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={btnStyle(!seekRated, !isLoggedIn)} onClick={() => setSeekRated(false)} disabled={!isLoggedIn}>Unrated</button>
          <button style={btnStyle(seekRated, !isLoggedIn)} onClick={() => setSeekRated(true)} disabled={!isLoggedIn}>Rated</button>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['auto', 'white', 'black'] as const).map(c => (
            <button key={c} style={{ ...btnStyle(seekColor === c, !isLoggedIn), flex: 1 }} onClick={() => setSeekColor(c)} disabled={!isLoggedIn}>
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            style={{ ...btnStyle(false, !isLoggedIn || seeking), flex: 1, background: 'rgba(14, 47, 72, 0.88)', border: '1px solid rgba(56, 189, 248, 0.38)' }}
            onClick={handleSeek} disabled={!isLoggedIn || seeking}
          >
            {seeking ? 'Seeking…' : 'Seek Game'}
          </button>
          <button style={btnStyle(false, !seeking)} onClick={handleCancelSeek} disabled={!seeking}>Cancel</button>
        </div>
      </section>

      {/* Seeks list */}
      <section style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={labelStyle}>Play: Open Seeks {seekRows.length > 0 && `(${seekRows.length})`}</div>
          <button style={smBtn('#93c5fd')} onClick={() => adapter.requestSought()} disabled={!isLoggedIn}>Refresh</button>
        </div>
        {seekRows.length === 0 ? (
          <div style={{ fontSize: '0.72rem', color: '#475569', fontStyle: 'italic' }}>
            {isLoggedIn ? 'Click Refresh to fetch open seeks.' : 'Log in to see seeks.'}
          </div>
        ) : (
          <div style={{ maxHeight: 160, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
            {seekRows.map(row => (
              <div key={row.seekId} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 6px', borderRadius: 5, background: 'rgba(15,23,42,0.72)', fontSize: '0.7rem' }}>
                <span style={{ color: '#475569', flexShrink: 0, width: 20, textAlign: 'right' }}>{row.seekId}</span>
                <span style={{ flex: 1, color: '#dbeafe', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {row.player} ({row.rating})
                </span>
                <span style={{ color: '#64748b', flexShrink: 0 }}>{row.timeMinutes}+{row.incrementSeconds}</span>
                <span style={{ color: row.rated ? '#86efac' : '#64748b', flexShrink: 0, width: 40 }}>{row.rated ? 'rated' : 'unrated'}</span>
                <button
                  style={smBtn('#86efac')}
                  onClick={() => adapter.playSeek(row.seekId)}
                  disabled={!isLoggedIn}
                >
                  Play
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Match player */}
      <section style={{ ...sectionStyle, opacity: isLoggedIn ? 1 : 0.5 }}>
        <div style={labelStyle}>Play: Match Player</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            type="text"
            value={matchHandle}
            onChange={e => setMatchHandle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleMatch(); }}
            placeholder="Player handle"
            style={{ ...inputStyle, flex: 1 }}
            disabled={!isLoggedIn}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <div><div style={labelStyle}>Time (min)</div>
            <input type="number" min={1} max={60} value={matchTime} onChange={e => setMatchTime(Number(e.target.value))} style={inputStyle} disabled={!isLoggedIn} />
          </div>
          <div><div style={labelStyle}>Increment (s)</div>
            <input type="number" min={0} max={60} value={matchInc} onChange={e => setMatchInc(Number(e.target.value))} style={inputStyle} disabled={!isLoggedIn} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={btnStyle(!matchRated, !isLoggedIn)} onClick={() => setMatchRated(false)} disabled={!isLoggedIn}>Unrated</button>
          <button style={btnStyle(matchRated, !isLoggedIn)} onClick={() => setMatchRated(true)} disabled={!isLoggedIn}>Rated</button>
        </div>
        <button
          style={{ ...btnStyle(false, !isLoggedIn || !matchHandle.trim()), background: 'rgba(14,47,72,0.88)', border: '1px solid rgba(56,189,248,0.38)' }}
          onClick={handleMatch}
          disabled={!isLoggedIn || !matchHandle.trim()}
        >
          Challenge
        </button>
      </section>

      {/* Live games list */}
      <section style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={labelStyle}>Observe: Live Games {gameRows.length > 0 && `(${gameRows.length})`}</div>
          <button style={smBtn('#93c5fd')} onClick={() => adapter.requestGames()} disabled={!isLoggedIn}>Refresh</button>
        </div>
        {gameRows.length === 0 ? (
          <div style={{ fontSize: '0.72rem', color: '#475569', fontStyle: 'italic' }}>
            {isLoggedIn ? 'Click Refresh to fetch live games.' : 'Log in to see live games.'}
          </div>
        ) : (
          <div style={{ maxHeight: 160, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
            {gameRows.map(row => (
              <div key={row.gameId} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 6px', borderRadius: 5, background: 'rgba(15,23,42,0.72)', fontSize: '0.7rem' }}>
                <span style={{ color: '#475569', flexShrink: 0, width: 24, textAlign: 'right' }}>#{row.gameId}</span>
                <span style={{ flex: 1, color: '#dbeafe', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {row.white} ({row.whiteRating}) vs {row.black} ({row.blackRating})
                </span>
                <span style={{ color: '#64748b', flexShrink: 0 }}>{row.timeMinutes}+{row.incrementSeconds}</span>
                <span style={{ color: row.rated ? '#86efac' : '#64748b', flexShrink: 0, width: 40 }}>{row.rated ? 'rated' : 'unrated'}</span>
                <button style={smBtn('#93c5fd')} onClick={() => { adapter.observeGame(String(row.gameId)); }} disabled={!isLoggedIn}>
                  Observe
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Observe game */}
      <section style={sectionStyle}>
        <div style={labelStyle}>Observe: Game ID / Player</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            type="text"
            value={observeInput}
            onChange={e => setObserveInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && observeInput.trim()) { adapter.observeGame(observeInput); } }}
            placeholder="Game ID or player name"
            style={{ ...inputStyle, flex: 1, fontFamily: 'monospace' }}
            disabled={!isLoggedIn}
          />
          <button
            style={btnStyle(false, !isLoggedIn || !observeInput.trim())}
            onClick={() => { if (observeInput.trim()) adapter.observeGame(observeInput); }}
            disabled={!isLoggedIn || !observeInput.trim()}
          >
            Observe
          </button>
          <button
            style={btnStyle(false, !observedGameId)}
            onClick={() => adapter.unobserveGame()}
            disabled={!observedGameId}
          >
            Unobserve
          </button>
        </div>
        <div style={{ fontSize: '0.72rem', color: observedGameId ? '#86efac' : '#475569' }}>
          {observedGameId
            ? `Observing game #${observedGameId}${latestStyle12 ? '' : ' — awaiting Style 12…'}`
            : 'Not observing.'}
        </div>
      </section>

      {/* Board preview — shown whenever Style 12/game state data is available */}
      {(latestStyle12 || gameState) && (
        <section style={sectionStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={labelStyle}>
              {isPlaying ? 'Your Game' : 'Board Preview'}
            </div>
            {isPlaying && (
              <span style={{ fontSize: '0.66rem', color: myTurn ? '#86efac' : '#64748b' }}>
                {myTurn ? 'Your turn' : "Opponent's turn"}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <FicsBoardPreview
              style12={latestStyle12}
              onMove={isPlaying ? (uci) => { adapter.sendMove(uci); } : undefined}
            />
          </div>
          {isPlaying && (
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type="text"
                value={moveInput}
                onChange={e => setMoveInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSendMove(); }}
                placeholder="Move (e.g. e2e4)"
                style={{ ...inputStyle, flex: 1, fontFamily: 'monospace' }}
              />
              <button
                style={{ ...btnStyle(false, !moveInput.trim() || !myTurn), padding: '7px 14px' }}
                onClick={handleSendMove}
                disabled={!moveInput.trim() || !myTurn}
              >
                Send
              </button>
            </div>
          )}
        </section>
      )}

      {/* Current game controls */}
      <section style={{ ...sectionStyle, opacity: isLoggedIn ? 1 : 0.5 }}>
        <div style={labelStyle}>Current Game</div>
        {gameState ? (
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.6 }}>
            <div>Game #{gameState.gameId} · {gameState.whitePlayer} vs {gameState.blackPlayer}</div>
            <div>Move {gameState.moveNumber} · {gameState.turn === 'white' ? 'White' : 'Black'} to move</div>
          </div>
        ) : (
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>No active game.</div>
        )}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(['resign', 'draw', 'abort'] as const).map(action => (
            <button key={action} style={btnStyle(false, !isLoggedIn || !gameState)} onClick={() => adapter.sendGameControl(action)} disabled={!isLoggedIn || !gameState}>
              {action.charAt(0).toUpperCase() + action.slice(1)}
            </button>
          ))}
          <button style={btnStyle(false, !isLoggedIn || !!gameState)} onClick={() => adapter.rematch()} disabled={!isLoggedIn || !!gameState}>
            Rematch
          </button>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleChat(); }}
            placeholder="say…" style={{ ...inputStyle, flex: 1 }} disabled={!isLoggedIn}
          />
          <button style={btnStyle(false, !isLoggedIn || !chatInput.trim())} onClick={handleChat} disabled={!isLoggedIn || !chatInput.trim()}>Say</button>
        </div>
      </section>

      {/* Incoming challenges */}
      <section style={sectionStyle}>
        <div style={labelStyle}>Incoming Challenges {challenges.length > 0 && `(${challenges.length})`}</div>
        {challenges.length === 0 ? (
          <div style={{ fontSize: '0.75rem', color: '#475569', fontStyle: 'italic' }}>
            {!isLoggedIn ? 'Connect and log in to receive challenges.' : 'No pending challenges.'}
          </div>
        ) : (
          challenges.map(ch => (
            <div key={ch.id} style={{ padding: '7px 10px', borderRadius: 6, background: 'rgba(15, 23, 42, 0.72)', border: '1px solid rgba(148, 163, 184, 0.18)', fontSize: '0.78rem' }}>
              <div style={{ marginBottom: 4 }}>
                <strong style={{ color: '#93c5fd' }}>{ch.fromUser}</strong>
                {ch.parsedReliably && (
                  <span style={{ color: '#94a3b8', marginLeft: 8 }}>
                    {ch.timeMinutes}+{ch.incrementSeconds} {ch.rated ? 'rated' : 'unrated'}
                  </span>
                )}
              </div>
              {ch.parsedReliably ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => adapter.acceptChallenge(ch.fromUser)} style={{ ...btnStyle(false, false), padding: '4px 10px', fontSize: '0.74rem', background: 'rgba(14, 47, 72, 0.88)', border: '1px solid rgba(56, 189, 248, 0.38)' }}>
                    Accept
                  </button>
                  <button onClick={() => adapter.declineChallenge(ch.fromUser)} style={{ ...btnStyle(false, false), padding: '4px 10px', fontSize: '0.74rem', color: '#fca5a5' }}>
                    Decline
                  </button>
                </div>
              ) : (
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontStyle: 'italic' }}>
                  {ch.rawText} — reply manually in console
                </div>
              )}
            </div>
          ))
        )}
      </section>
    </div>
  );
};

export default FicsOnlineView;
