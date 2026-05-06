import React, { useState, useEffect } from "react";
import { getFicsAdapter } from "../services/online/fics/FicsAdapter";
import type {
  FicsLoginMode,
  FicsSeekRequest,
  FicsLoginStatus,
  FicsChallenge,
  FicsGameState,
  Style12Data,
  FicsGameRow,
  FicsSeekRow,
} from "../services/online/fics/FicsTypes";

const adapter = getFicsAdapter();
const FICS_REGISTER_URL = "https://www.freechess.org/Register/";

type FicsOnlineTab = "playable" | "watch" | "friend";
type RefreshInterval = 0 | 15 | 30 | 60;

const inputStyle: React.CSSProperties = {
  padding: "9px 10px",
  fontSize: "0.92rem",
  background: "rgba(15, 23, 42, 0.72)",
  color: "#dbeafe",
  border: "1px solid rgba(148, 163, 184, 0.24)",
  borderRadius: 7,
  width: "100%",
  boxSizing: "border-box",
};

const btnStyle = (active = false, disabled = false): React.CSSProperties => ({
  padding: "8px 13px",
  borderRadius: 8,
  border: active
    ? "1px solid rgba(56, 189, 248, 0.95)"
    : "1px solid rgba(148, 163, 184, 0.22)",
  background: active ? "rgba(14, 116, 144, 0.90)" : "rgba(15, 23, 42, 0.64)",
  color: disabled ? "#64748b" : active ? "#f0fdfa" : "#dbeafe",
  cursor: disabled ? "not-allowed" : "pointer",
  fontSize: "0.9rem",
  opacity: disabled ? 0.6 : 1,
  fontWeight: active ? 900 : 750,
  boxShadow: active
    ? "inset 0 0 0 1px rgba(255,255,255,0.08), 0 0 14px rgba(56,189,248,0.18)"
    : undefined,
});

const smBtn = (color = "#94a3b8"): React.CSSProperties => ({
  padding: "5px 9px",
  fontSize: "0.78rem",
  borderRadius: 6,
  border: "1px solid rgba(148,163,184,0.18)",
  background: "rgba(15,23,42,0.72)",
  color,
  cursor: "pointer",
});

const sectionStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
  padding: "12px",
  borderRadius: 10,
  border: "1px solid rgba(148, 163, 184, 0.14)",
  background: "rgba(8, 18, 34, 0.72)",
};

const labelStyle: React.CSSProperties = {
  fontSize: "0.74rem",
  color: "#94a3b8",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: 3,
  fontWeight: 850,
};

const loginStatusColor: Record<FicsLoginStatus, string> = {
  disconnected: "#94a3b8",
  connecting: "#fbbf24",
  "awaiting-login": "#fbbf24",
  "logging-in": "#fbbf24",
  "logged-in": "#86efac",
  "login-failed": "#fca5a5",
  error: "#fca5a5",
};

const loginStatusLabel: Record<FicsLoginStatus, string> = {
  disconnected: "Disconnected",
  connecting: "Connecting…",
  "awaiting-login": "Awaiting login…",
  "logging-in": "Logging in…",
  "logged-in": "Logged in",
  "login-failed": "Login failed",
  error: "Error",
};

const tabLabels: Array<{ id: FicsOnlineTab; label: string; icon: string }> = [
  { id: "playable", label: "Playable Games", icon: "⚔" },
  { id: "watch", label: "Watch Match", icon: "👁" },
  { id: "friend", label: "Friend Match", icon: "🤝" },
];

const FicsOnlineView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<FicsOnlineTab>("playable");
  const [autoRefresh, setAutoRefresh] = useState<RefreshInterval>(30);
  const [loginStatus, setLoginStatus] = useState<FicsLoginStatus>(
    adapter.loginStatus,
  );
  const [handle, setHandle] = useState<string | null>(adapter.handle);
  const [challenges, setChallenges] = useState<FicsChallenge[]>(
    adapter.challenges,
  );
  const [gameState, setGameState] = useState<FicsGameState | null>(
    adapter.gameState,
  );
  const [latestStyle12, setLatestStyle12] = useState<Style12Data | null>(
    adapter.latestStyle12,
  );
  const [observedGameId, setObservedGameId] = useState<string | null>(
    adapter.observedGameId,
  );
  const [gameRows, setGameRows] = useState<FicsGameRow[]>(adapter.gameRows);
  const [seekRows, setSeekRows] = useState<FicsSeekRow[]>(adapter.seekRows);
  const [errorMsg, setErrorMsg] = useState("");

  const [loginMode, setLoginMode] = useState<FicsLoginMode>("guest");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [seekTime, setSeekTime] = useState(5);
  const [seekInc, setSeekInc] = useState(0);
  const [seekRated, setSeekRated] = useState(false);
  const [seekColor, setSeekColor] = useState<FicsSeekRequest["color"]>("auto");
  const [seeking, setSeeking] = useState(false);
  const [selectedSeekId, setSelectedSeekId] = useState<number | null>(null);
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);

  const [observeInput, setObserveInput] = useState("");
  const [matchHandle, setMatchHandle] = useState("");
  const [matchTime, setMatchTime] = useState(5);
  const [matchInc, setMatchInc] = useState(0);
  const [matchRated, setMatchRated] = useState(false);
  const [moveInput, setMoveInput] = useState("");
  const [chatInput, setChatInput] = useState("");

  const isLoggedIn = loginStatus === "logged-in";
  const canConnect =
    loginStatus === "disconnected" ||
    loginStatus === "login-failed" ||
    loginStatus === "error";
  const isPlaying = Math.abs(adapter.myRelation) === 1;
  const myTurn =
    isPlaying && latestStyle12
      ? (adapter.myRelation === 1 && latestStyle12.turn === "white") ||
        (adapter.myRelation === -1 && latestStyle12.turn === "black")
      : false;
  const activeVariant = gameState?.variant ?? "standard";
  const activeVariantSupported = gameState?.supportedVariant !== false;

  useEffect(() => {
    const unsubs = [
      adapter.onLoginStatus((s) => {
        setLoginStatus(s);
        setHandle(adapter.handle);
        if (s === "login-failed")
          setErrorMsg("Login failed. Check credentials.");
        if (s === "logged-in") {
          setErrorMsg("");
          setSeeking(false);
          setActiveTab("playable");
          adapter.requestSought();
          adapter.requestGames();
        }
        if (s === "disconnected" || s === "error") {
          setSeeking(false);
          setChallenges([]);
          setGameState(null);
          setLatestStyle12(null);
          setObservedGameId(null);
          setGameRows([]);
          setSeekRows([]);
          setSelectedSeekId(null);
          setSelectedGameId(null);
          setActiveTab("playable");
        }
      }),
      adapter.onChallenges((list) => setChallenges(list)),
      adapter.onGameState((state) => setGameState(state)),
      adapter.onStyle12((s12) => setLatestStyle12(s12)),
      adapter.onObserveChange((id) => setObservedGameId(id)),
      adapter.onGamesUpdated((rows) => setGameRows(rows)),
      adapter.onSoughtUpdated((rows) => setSeekRows(rows)),
    ];
    return () => unsubs.forEach((fn) => fn());
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    if (seekRows.length === 0) adapter.requestSought();
    if (gameRows.length === 0) adapter.requestGames();
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn || autoRefresh === 0) return;
    const refresh = () => {
      adapter.requestSought();
      adapter.requestGames();
    };
    const id = window.setInterval(refresh, autoRefresh * 1000);
    return () => window.clearInterval(id);
  }, [autoRefresh, isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) return;
    if (activeTab === "playable" && seekRows.length === 0)
      adapter.requestSought();
    if (activeTab === "watch" && gameRows.length === 0) adapter.requestGames();
  }, [activeTab, isLoggedIn, seekRows.length, gameRows.length]);

  const handleConnect = async () => {
    setErrorMsg("");
    try {
      await adapter.connect({
        mode: loginMode,
        username: loginMode === "account" ? username : undefined,
        password: loginMode === "account" ? password : undefined,
      });
    } catch (e) {
      setErrorMsg((e as Error).message);
    }
  };

  const handleSeek = () => {
    adapter.seekGame({
      timeMinutes: seekTime,
      incrementSeconds: seekInc,
      rated: seekRated,
      color: seekColor,
    });
    setSelectedSeekId(null);
    setSeeking(true);
  };

  const handleSendMove = () => {
    const m = moveInput.trim();
    if (!m) return;
    adapter.sendMove(m);
    setMoveInput("");
  };

  const handleMatch = () => {
    const h = matchHandle.trim();
    if (!h) return;
    adapter.matchPlayer(h, matchTime, matchInc, matchRated);
  };

  const handleChat = () => {
    if (!chatInput.trim()) return;
    adapter.sendChat(chatInput.trim());
    setChatInput("");
  };

  const ActiveTabButton = ({ tab }: { tab: (typeof tabLabels)[number] }) => (
    <button
      type="button"
      onClick={() => setActiveTab(tab.id)}
      style={{
        ...btnStyle(activeTab === tab.id),
        flex: "1 1 150px",
        justifyContent: "center",
      }}
      aria-pressed={activeTab === tab.id}
    >
      {activeTab === tab.id ? "✓ " : ""}
      {tab.icon} {tab.label}
    </button>
  );

  const refreshControl = (target: "playable" | "watch") => (
    <div className="cu-control-row" style={{ gap: 8, flexWrap: "wrap" }}>
      <button
        style={smBtn("#93c5fd")}
        onClick={() =>
          target === "playable"
            ? adapter.requestSought()
            : adapter.requestGames()
        }
        disabled={!isLoggedIn}
      >
        Refresh now
      </button>
      <label style={{ ...labelStyle, marginBottom: 0 }}>Auto</label>
      <select
        value={autoRefresh}
        onChange={(e) =>
          setAutoRefresh(Number(e.target.value) as RefreshInterval)
        }
        style={{
          ...inputStyle,
          width: 110,
          padding: "6px 8px",
          fontSize: "0.82rem",
        }}
        disabled={!isLoggedIn}
      >
        <option value={0}>Off</option>
        <option value={15}>15s</option>
        <option value={30}>30s</option>
        <option value={60}>60s</option>
      </select>
    </div>
  );

  const renderConnect = () => (
    <>
      <section className="cu-panel-card" style={sectionStyle}>
        <div className="cu-section-label" style={labelStyle}>
          Login Mode
        </div>
        <div className="cu-control-row" style={{ gap: 8, flexWrap: "wrap" }}>
          <button
            style={btnStyle(loginMode === "guest")}
            onClick={() => setLoginMode("guest")}
            disabled={!canConnect}
          >
            {loginMode === "guest" ? "✓ Guest" : "Guest"}
          </button>
          <button
            style={btnStyle(loginMode === "account")}
            onClick={() => setLoginMode("account")}
            disabled={!canConnect}
          >
            {loginMode === "account" ? "✓ Account" : "Account"}
          </button>
        </div>
        {loginMode === "account" && canConnect && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div>
              <div style={labelStyle}>Username</div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="FICS handle"
                style={inputStyle}
                autoComplete="username"
              />
            </div>
            <div>
              <div style={labelStyle}>Password</div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="FICS password"
                style={inputStyle}
                autoComplete="current-password"
              />
            </div>
          </div>
        )}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 7,
            padding: "9px 10px",
            borderRadius: 8,
            background: "rgba(15, 23, 42, 0.42)",
            border: "1px solid rgba(148, 163, 184, 0.12)",
            fontSize: "0.85rem",
            color: "#b8c7d8",
            lineHeight: 1.4,
          }}
        >
          <div>
            Need a permanent FICS handle? Register on the official FICS site,
            then return here and log in with Account. Chess Unleashed does not
            store registration details.
          </div>
          <button
            style={{ ...btnStyle(false, false), alignSelf: "flex-start" }}
            onClick={() =>
              window.open(FICS_REGISTER_URL, "_blank", "noopener,noreferrer")
            }
          >
            Register on FICS
          </button>
        </div>
        <div className="cu-control-row" style={{ gap: 8, flexWrap: "wrap" }}>
          <button
            style={{
              ...btnStyle(false, !canConnect),
              background: "rgba(14, 47, 72, 0.88)",
              border: "1px solid rgba(56,189,248,0.38)",
            }}
            onClick={handleConnect}
            disabled={!canConnect}
          >
            {loginMode === "guest" ? "Connect as Guest" : "Connect Account"}
          </button>
          <button
            style={btnStyle(false, loginStatus === "disconnected")}
            onClick={() => adapter.disconnect()}
            disabled={loginStatus === "disconnected"}
          >
            Disconnect
          </button>
        </div>
      </section>
    </>
  );

  const renderPlayable = () => (
    <>
      <section
        className="cu-panel-card"
        style={{ ...sectionStyle, opacity: isLoggedIn ? 1 : 0.55 }}
      >
        <div className="cu-section-label" style={labelStyle}>
          Seek Game
        </div>
        <div
          className="cu-control-grid"
          style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}
        >
          <div>
            <div style={labelStyle}>Time</div>
            <input
              type="number"
              min={1}
              max={60}
              value={seekTime}
              onChange={(e) => setSeekTime(Number(e.target.value))}
              style={inputStyle}
              disabled={!isLoggedIn}
            />
          </div>
          <div>
            <div style={labelStyle}>Increment</div>
            <input
              type="number"
              min={0}
              max={60}
              value={seekInc}
              onChange={(e) => setSeekInc(Number(e.target.value))}
              style={inputStyle}
              disabled={!isLoggedIn}
            />
          </div>
        </div>
        <div className="cu-control-row" style={{ gap: 8, flexWrap: "wrap" }}>
          {(["auto", "white", "black"] as const).map((color) => (
            <button
              key={color}
              style={btnStyle(seekColor === color, !isLoggedIn)}
              onClick={() => setSeekColor(color)}
              disabled={!isLoggedIn}
            >
              {seekColor === color ? "✓ " : ""}
              {color[0].toUpperCase() + color.slice(1)}
            </button>
          ))}
        </div>
        <div className="cu-control-row" style={{ gap: 8, flexWrap: "wrap" }}>
          <button
            style={btnStyle(!seekRated, !isLoggedIn)}
            onClick={() => setSeekRated(false)}
            disabled={!isLoggedIn}
          >
            Unrated
          </button>
          <button
            style={btnStyle(seekRated, !isLoggedIn)}
            onClick={() => setSeekRated(true)}
            disabled={!isLoggedIn}
          >
            Rated
          </button>
        </div>
        <div className="cu-control-row" style={{ gap: 8, flexWrap: "wrap" }}>
          <button
            style={{
              ...btnStyle(false, !isLoggedIn),
              background: seeking
                ? "rgba(20,83,45,0.55)"
                : "rgba(14,47,72,0.88)",
              border: "1px solid rgba(56,189,248,0.38)",
            }}
            onClick={handleSeek}
            disabled={!isLoggedIn}
          >
            {seeking ? "Seeking…" : "Seek Game"}
          </button>
          <button
            style={btnStyle(false, !isLoggedIn || !seeking)}
            onClick={() => {
              adapter.cancelSeek();
              setSeeking(false);
            }}
            disabled={!isLoggedIn || !seeking}
          >
            Cancel Seek
          </button>
        </div>
      </section>

      <section className="cu-panel-card" style={sectionStyle}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <div className="cu-section-label" style={labelStyle}>
            Playable Games {seekRows.length > 0 && `(${seekRows.length})`}
          </div>
          {refreshControl("playable")}
        </div>
        {seekRows.length === 0 ? (
          <div
            style={{
              fontSize: "0.86rem",
              color: "#64748b",
              fontStyle: "italic",
            }}
          >
            {isLoggedIn ? "No seeks loaded yet." : "Log in to see seeks."}
          </div>
        ) : (
          <div
            className="cu-scroll-area"
            style={{
              maxHeight: 260,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 5,
            }}
          >
            {seekRows.map((row) => {
              const selected = selectedSeekId === row.seekId;
              const unsupported = row.supported === false;
              return (
                <div
                  key={row.seekId}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "42px 1fr auto auto",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 9px",
                    borderRadius: 8,
                    background: selected
                      ? "rgba(14,116,144,0.42)"
                      : "rgba(15,23,42,0.72)",
                    border: selected
                      ? "1px solid rgba(56,189,248,0.58)"
                      : "1px solid rgba(148,163,184,0.10)",
                    fontSize: "0.86rem",
                  }}
                >
                  <span
                    style={{
                      color: selected ? "#bae6fd" : "#64748b",
                      textAlign: "right",
                    }}
                  >
                    #{row.seekId}
                  </span>
                  <span
                    style={{
                      color: "#dbeafe",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {selected ? "✓ " : ""}
                    {row.player} ({row.rating}) · {row.timeMinutes}+
                    {row.incrementSeconds} · {row.rated ? "rated" : "unrated"}
                  </span>
                  <span style={{ color: unsupported ? "#fca5a5" : "#93c5fd" }}>
                    {unsupported ? `${row.variant} ⚠` : row.variant}
                  </span>
                  <button
                    style={smBtn(unsupported ? "#fca5a5" : "#93c5fd")}
                    onClick={() => {
                      setSelectedSeekId(row.seekId);
                      if (unsupported) {
                        setErrorMsg(
                          `${row.variant} is not supported on the main Chess Unleashed board yet.`,
                        );
                        return;
                      }
                      setErrorMsg("");
                      adapter.playSeek(row.seekId);
                    }}
                    disabled={!isLoggedIn}
                  >
                    {unsupported ? "Blocked" : selected ? "Selected" : "Play"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
      {renderCurrentGame()}
    </>
  );

  const renderWatch = () => (
    <>
      <section className="cu-panel-card" style={sectionStyle}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <div className="cu-section-label" style={labelStyle}>
            Watch Match {gameRows.length > 0 && `(${gameRows.length})`}
          </div>
          {refreshControl("watch")}
        </div>
        {gameRows.length === 0 ? (
          <div
            style={{
              fontSize: "0.86rem",
              color: "#64748b",
              fontStyle: "italic",
            }}
          >
            {isLoggedIn ? "No games loaded yet." : "Log in to see live games."}
          </div>
        ) : (
          <div
            className="cu-scroll-area"
            style={{
              maxHeight: 280,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 5,
            }}
          >
            {gameRows.map((row) => {
              const selected =
                selectedGameId === row.gameId ||
                observedGameId === String(row.gameId);
              const unsupported = row.supported === false;
              return (
                <div
                  key={row.gameId}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "42px 1fr auto auto",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 9px",
                    borderRadius: 8,
                    background: selected
                      ? "rgba(14,116,144,0.42)"
                      : "rgba(15,23,42,0.72)",
                    border: selected
                      ? "1px solid rgba(56,189,248,0.58)"
                      : "1px solid rgba(148,163,184,0.10)",
                    fontSize: "0.86rem",
                  }}
                >
                  <span
                    style={{
                      color: selected ? "#bae6fd" : "#64748b",
                      textAlign: "right",
                    }}
                  >
                    #{row.gameId}
                  </span>
                  <span
                    style={{
                      color: "#dbeafe",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {selected ? "✓ " : ""}
                    {row.white} ({row.whiteRating}) vs {row.black} (
                    {row.blackRating}) · {row.timeMinutes}+
                    {row.incrementSeconds}
                  </span>
                  <span style={{ color: unsupported ? "#fca5a5" : "#93c5fd" }}>
                    {unsupported ? `${row.variant} ⚠` : row.variant}
                  </span>
                  <button
                    style={smBtn(unsupported ? "#fca5a5" : "#93c5fd")}
                    onClick={() => {
                      setSelectedGameId(row.gameId);
                      if (unsupported) {
                        setErrorMsg(
                          `${row.variant} is not supported on the main Chess Unleashed board yet.`,
                        );
                        return;
                      }
                      setErrorMsg("");
                      adapter.observeGame(String(row.gameId));
                    }}
                    disabled={!isLoggedIn}
                  >
                    {unsupported
                      ? "Blocked"
                      : selected
                        ? "Observing"
                        : "Observe"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
      <section className="cu-panel-card" style={sectionStyle}>
        <div className="cu-section-label" style={labelStyle}>
          Observe by Game ID / Player
        </div>
        <div className="cu-control-row" style={{ gap: 8, flexWrap: "wrap" }}>
          <input
            type="text"
            value={observeInput}
            onChange={(e) => setObserveInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && observeInput.trim())
                adapter.observeGame(observeInput);
            }}
            placeholder="Game ID or player name"
            style={{
              ...inputStyle,
              flex: "1 1 180px",
              fontFamily: "monospace",
            }}
            disabled={!isLoggedIn}
          />
          <button
            style={btnStyle(false, !isLoggedIn || !observeInput.trim())}
            onClick={() =>
              observeInput.trim() && adapter.observeGame(observeInput)
            }
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
        <div
          style={{
            fontSize: "0.85rem",
            color: observedGameId ? "#86efac" : "#64748b",
          }}
        >
          {observedGameId ? `Observing #${observedGameId}` : "Not observing."}
        </div>
      </section>
    </>
  );

  const renderFriend = () => (
    <>
      <section
        className="cu-panel-card"
        style={{ ...sectionStyle, opacity: isLoggedIn ? 1 : 0.55 }}
      >
        <div className="cu-section-label" style={labelStyle}>
          Friend Match / Challenge Player
        </div>
        <input
          type="text"
          value={matchHandle}
          onChange={(e) => setMatchHandle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleMatch();
          }}
          placeholder="Player handle"
          style={inputStyle}
          disabled={!isLoggedIn}
        />
        <div
          className="cu-control-grid"
          style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}
        >
          <div>
            <div style={labelStyle}>Time</div>
            <input
              type="number"
              min={1}
              max={60}
              value={matchTime}
              onChange={(e) => setMatchTime(Number(e.target.value))}
              style={inputStyle}
              disabled={!isLoggedIn}
            />
          </div>
          <div>
            <div style={labelStyle}>Increment</div>
            <input
              type="number"
              min={0}
              max={60}
              value={matchInc}
              onChange={(e) => setMatchInc(Number(e.target.value))}
              style={inputStyle}
              disabled={!isLoggedIn}
            />
          </div>
        </div>
        <div className="cu-control-row" style={{ gap: 8 }}>
          <button
            style={btnStyle(!matchRated, !isLoggedIn)}
            onClick={() => setMatchRated(false)}
            disabled={!isLoggedIn}
          >
            Unrated
          </button>
          <button
            style={btnStyle(matchRated, !isLoggedIn)}
            onClick={() => setMatchRated(true)}
            disabled={!isLoggedIn}
          >
            Rated
          </button>
        </div>
        <button
          style={{
            ...btnStyle(false, !isLoggedIn || !matchHandle.trim()),
            background: "rgba(14,47,72,0.88)",
            border: "1px solid rgba(56,189,248,0.38)",
          }}
          onClick={handleMatch}
          disabled={!isLoggedIn || !matchHandle.trim()}
        >
          Challenge
        </button>
      </section>
      <section className="cu-panel-card" style={sectionStyle}>
        <div className="cu-section-label" style={labelStyle}>
          Notify / Friends
        </div>
        <div
          style={{ fontSize: "0.86rem", color: "#94a3b8", lineHeight: 1.45 }}
        >
          FICS uses notify lists instead of friends. Registered users can type{" "}
          <code>=notify</code>, <code>znotify</code>,{" "}
          <code>+notify handle</code>, or <code>-notify handle</code> in the
          Console tab.
        </div>
      </section>
      <section className="cu-panel-card" style={sectionStyle}>
        <div className="cu-section-label" style={labelStyle}>
          Say to Current Game
        </div>
        <div className="cu-control-row" style={{ gap: 8 }}>
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleChat();
            }}
            placeholder="say…"
            style={{ ...inputStyle, flex: 1 }}
            disabled={!isLoggedIn}
          />
          <button
            style={btnStyle(false, !isLoggedIn || !chatInput.trim())}
            onClick={handleChat}
            disabled={!isLoggedIn || !chatInput.trim()}
          >
            Say
          </button>
        </div>
      </section>
      {renderChallenges()}
    </>
  );

  const renderChallenges = () => (
    <section className="cu-panel-card" style={sectionStyle}>
      <div className="cu-section-label" style={labelStyle}>
        Incoming Challenges {challenges.length > 0 && `(${challenges.length})`}
      </div>
      {challenges.length === 0 ? (
        <div
          style={{ fontSize: "0.86rem", color: "#64748b", fontStyle: "italic" }}
        >
          {!isLoggedIn
            ? "Connect to receive challenges."
            : "No pending challenges."}
        </div>
      ) : (
        challenges.map((ch) => (
          <div
            key={ch.id}
            style={{
              padding: "9px 10px",
              borderRadius: 8,
              background: "rgba(15,23,42,0.72)",
              border: "1px solid rgba(148,163,184,0.18)",
              fontSize: "0.86rem",
            }}
          >
            <div style={{ marginBottom: 6 }}>
              <strong style={{ color: "#93c5fd" }}>{ch.fromUser}</strong>
              {ch.parsedReliably && (
                <span style={{ color: "#94a3b8", marginLeft: 8 }}>
                  {ch.timeMinutes}+{ch.incrementSeconds}{" "}
                  {ch.rated ? "rated" : "unrated"}
                </span>
              )}
            </div>
            {ch.parsedReliably ? (
              <div className="cu-control-row" style={{ gap: 8 }}>
                <button
                  onClick={() => adapter.acceptChallenge(ch.fromUser)}
                  style={{
                    ...btnStyle(false),
                    padding: "5px 10px",
                    fontSize: "0.82rem",
                  }}
                >
                  Accept
                </button>
                <button
                  onClick={() => adapter.declineChallenge(ch.fromUser)}
                  style={{
                    ...btnStyle(false),
                    padding: "5px 10px",
                    fontSize: "0.82rem",
                    color: "#fca5a5",
                  }}
                >
                  Decline
                </button>
              </div>
            ) : (
              <div style={{ color: "#64748b" }}>
                {ch.rawText} — reply manually in console
              </div>
            )}
          </div>
        ))
      )}
    </section>
  );

  const renderCurrentGame = () => (
    <section
      className="cu-panel-card"
      style={{ ...sectionStyle, opacity: isLoggedIn ? 1 : 0.55 }}
    >
      <div className="cu-section-label" style={labelStyle}>
        Current Game
      </div>
      {gameState ? (
        <div style={{ fontSize: "0.88rem", color: "#b8c7d8", lineHeight: 1.6 }}>
          <div>
            Game #{gameState.gameId} · {gameState.whitePlayer} vs{" "}
            {gameState.blackPlayer}
          </div>
          <div>
            Move {gameState.moveNumber} ·{" "}
            {gameState.turn === "white" ? "White" : "Black"} to move
          </div>
          <div>
            Variant:{" "}
            <strong
              style={{ color: activeVariantSupported ? "#93c5fd" : "#fca5a5" }}
            >
              {activeVariant}
              {activeVariantSupported ? "" : " ⚠ unsupported"}
            </strong>
          </div>
          {!activeVariantSupported && (
            <div style={{ color: "#fca5a5" }}>
              This variant is not supported on the main board yet.
            </div>
          )}
        </div>
      ) : (
        <div style={{ fontSize: "0.86rem", color: "#64748b" }}>
          No active game.
        </div>
      )}
      {isPlaying && (
        <div
          style={{ fontSize: "0.86rem", color: myTurn ? "#86efac" : "#64748b" }}
        >
          {myTurn ? "Your turn" : "Opponent's turn"}
        </div>
      )}
      {isPlaying && (
        <div className="cu-control-row" style={{ gap: 8, flexWrap: "wrap" }}>
          <input
            type="text"
            value={moveInput}
            onChange={(e) => setMoveInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSendMove();
            }}
            placeholder="Move e.g. e2e4"
            style={{
              ...inputStyle,
              flex: "1 1 160px",
              fontFamily: "monospace",
            }}
          />
          <button
            style={btnStyle(false, !moveInput.trim() || !myTurn)}
            onClick={handleSendMove}
            disabled={!moveInput.trim() || !myTurn}
          >
            Send
          </button>
        </div>
      )}
      <div className="cu-control-row" style={{ gap: 8, flexWrap: "wrap" }}>
        {(["abort", "resign", "draw"] as const).map((action) => (
          <button
            key={action}
            style={btnStyle(false, !isLoggedIn || !gameState)}
            onClick={() => adapter.sendGameControl(action)}
            disabled={!isLoggedIn || !gameState}
          >
            {action.charAt(0).toUpperCase() + action.slice(1)}
          </button>
        ))}
      </div>
    </section>
  );

  return (
    <div
      className="view-container cu-view-shell cu-fics-online-view"
      style={{ gap: 12, fontSize: "0.92rem" }}
    >
      <div
        className="cu-panel-card cu-control-row"
        style={{ gap: 10, flexWrap: "wrap" }}
      >
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: loginStatusColor[loginStatus],
            flexShrink: 0,
            display: "inline-block",
          }}
        />
        <strong
          style={{ fontSize: "0.94rem", color: loginStatusColor[loginStatus] }}
        >
          {loginStatusLabel[loginStatus]}
          {handle ? ` as ${handle}` : ""}
        </strong>
        <span
          style={{ fontSize: "0.82rem", color: "#64748b", marginLeft: "auto" }}
        >
          {adapter.style12Requested
            ? adapter.style12Active
              ? "Style 12 ✓"
              : "Style 12 pending"
            : "freechess.org:5000"}
        </span>
      </div>

      {errorMsg && (
        <div
          className="cu-panel-card cu-danger"
          style={{ fontSize: "0.88rem", color: "#fca5a5" }}
        >
          {errorMsg}
        </div>
      )}
      {!adapter.bridgeAvailable && (
        <div
          className="cu-panel-card cu-warning"
          style={{ fontSize: "0.86rem", color: "#fbbf24" }}
        >
          ⚠ Electron bridge unavailable. Run in Electron for live TCP
          connection.
        </div>
      )}

      <div
        className="cu-panel-card cu-control-row"
        style={{ gap: 8, flexWrap: "wrap" }}
      >
        {tabLabels.map((tab) => (
          <ActiveTabButton key={tab.id} tab={tab} />
        ))}
      </div>

      {!isLoggedIn && renderConnect()}
      {activeTab === "playable" && renderPlayable()}
      {activeTab === "watch" && renderWatch()}
      {activeTab === "friend" && renderFriend()}
    </div>
  );
};

export default FicsOnlineView;
