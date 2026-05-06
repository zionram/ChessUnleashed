import type { OnlineServiceAdapter, OnlineCredentials, ConnectionStatus } from '../OnlineServiceAdapter';
import type {
  FicsSeekRequest, FicsGameControlAction, FicsServerMessage,
  FicsLoginStatus, FicsChallenge, FicsGameState, Style12Data,
  FicsGameRow, FicsSeekRow
} from './FicsTypes';
import { FicsProtocolParser } from './FicsProtocolParser';
import { translateFicsCommand, type MatchPlayerCommandPayload, type SeekGameCommandPayload, type StandardOnlineCommandId } from './FicsGameTranslator';

const FICS_HOST = 'freechess.org';
const FICS_PORT = 5000;

interface FicsBridge {
  connect(host: string, port: number): Promise<{ ok: boolean }>;
  disconnect(): Promise<{ ok: boolean }>;
  send(command: string): Promise<{ ok: boolean }>;
  onData(listener: (raw: string) => void): () => void;
  onStatus(listener: (payload: { status: ConnectionStatus }) => void): () => void;
  onError(listener: (payload: { message: string }) => void): () => void;
}

declare global {
  interface Window { chessUnleashedFics?: FicsBridge; }
}

export class FicsAdapter implements OnlineServiceAdapter {
  readonly serviceName = 'FICS (freechess.org)';

  private readonly _parser = new FicsProtocolParser();
  private _status: ConnectionStatus = 'disconnected';
  private _loginStatus: FicsLoginStatus = 'disconnected';
  private _credentials: OnlineCredentials | null = null;
  private _handle: string | null = null;
  private _style12Requested = false;
  private _style12Active = false;
  private _gameState: FicsGameState | null = null;
  private _challenges: FicsChallenge[] = [];
  private _latestStyle12: Style12Data | null = null;
  private _observedGameId: string | null = null;
  private _gameRows: FicsGameRow[] = [];
  private _seekRows: FicsSeekRow[] = [];
  private _gameListBuffer: FicsGameRow[] = [];
  private _seekListBuffer: FicsSeekRow[] = [];
  private _collectingGames = false;
  private _collectingSought = false;
  private _myRelation = 0;

  private _loginBuffer = '';
  private _lineBuffer = '';
  private _loginNameSent = false;
  private _loginPassSent = false;
  private _guestReturnSent = false;
  private _loggedInDetected = false;

  private readonly _statusListeners = new Set<(s: ConnectionStatus) => void>();
  private readonly _loginStatusListeners = new Set<(s: FicsLoginStatus) => void>();
  private readonly _msgListeners = new Set<(msg: FicsServerMessage) => void>();
  private readonly _challengeListeners = new Set<(list: FicsChallenge[]) => void>();
  private readonly _gameStateListeners = new Set<(state: FicsGameState | null) => void>();
  private readonly _style12Listeners = new Set<(s12: Style12Data) => void>();
  private readonly _observeListeners = new Set<(gameId: string | null) => void>();
  private readonly _gamesListeners = new Set<(rows: FicsGameRow[]) => void>();
  private readonly _soughtListeners = new Set<(rows: FicsSeekRow[]) => void>();
  private readonly _unsubBridge: Array<() => void> = [];

  constructor() {
    const bridge = window.chessUnleashedFics;
    if (!bridge) return;
    this._unsubBridge.push(
      bridge.onStatus(({ status }) => this._handleTcpStatus(status)),
      bridge.onData((raw) => this._handleRawData(raw)),
      bridge.onError(({ message }) => {
        console.error('[FicsAdapter]', message);
        this._setStatus('error');
        this._setLoginStatus('error');
      })
    );
  }

  // --- Getters ---
  get status(): ConnectionStatus { return this._status; }
  get loginStatus(): FicsLoginStatus { return this._loginStatus; }
  get handle(): string | null { return this._handle; }
  get challenges(): FicsChallenge[] { return [...this._challenges]; }
  get gameState(): FicsGameState | null { return this._gameState; }
  get style12Active(): boolean { return this._style12Active; }
  get style12Requested(): boolean { return this._style12Requested; }
  get latestStyle12(): Style12Data | null { return this._latestStyle12; }
  get observedGameId(): string | null { return this._observedGameId; }
  get gameRows(): FicsGameRow[] { return [...this._gameRows]; }
  get seekRows(): FicsSeekRow[] { return [...this._seekRows]; }
  get myRelation(): number { return this._myRelation; }
  get bridgeAvailable(): boolean { return !!window.chessUnleashedFics; }

  sendStandardCommand(standardId: StandardOnlineCommandId | string, payload?: unknown): boolean {
    const command = translateFicsCommand(standardId, payload);
    if (!command || this._status !== 'connected') return false;
    window.chessUnleashedFics?.send(command);
    return true;
  }

  // --- Subscribers ---
  onStatusChange(cb: (s: ConnectionStatus) => void): () => void {
    this._statusListeners.add(cb);
    return () => this._statusListeners.delete(cb);
  }
  onLoginStatus(cb: (s: FicsLoginStatus) => void): () => void {
    this._loginStatusListeners.add(cb);
    return () => this._loginStatusListeners.delete(cb);
  }
  onData(cb: (msg: FicsServerMessage) => void): () => void {
    this._msgListeners.add(cb);
    return () => this._msgListeners.delete(cb);
  }
  onChallenges(cb: (list: FicsChallenge[]) => void): () => void {
    this._challengeListeners.add(cb);
    return () => this._challengeListeners.delete(cb);
  }
  onGameState(cb: (state: FicsGameState | null) => void): () => void {
    this._gameStateListeners.add(cb);
    return () => this._gameStateListeners.delete(cb);
  }
  onStyle12(cb: (s12: Style12Data) => void): () => void {
    this._style12Listeners.add(cb);
    return () => this._style12Listeners.delete(cb);
  }
  onObserveChange(cb: (gameId: string | null) => void): () => void {
    this._observeListeners.add(cb);
    return () => this._observeListeners.delete(cb);
  }
  onGamesUpdated(cb: (rows: FicsGameRow[]) => void): () => void {
    this._gamesListeners.add(cb);
    return () => this._gamesListeners.delete(cb);
  }
  onSoughtUpdated(cb: (rows: FicsSeekRow[]) => void): () => void {
    this._soughtListeners.add(cb);
    return () => this._soughtListeners.delete(cb);
  }

  // --- Commands ---
  async connect(credentials: OnlineCredentials): Promise<void> {
    const bridge = window.chessUnleashedFics;
    if (!bridge) throw new Error('FICS networking requires the Electron bridge. Run in Electron.');
    this._credentials = credentials;
    this._resetLoginState();
    this._setStatus('connecting');
    this._setLoginStatus('connecting');
    await bridge.connect(FICS_HOST, FICS_PORT);
  }

  async disconnect(): Promise<void> {
    const bridge = window.chessUnleashedFics;
    if (!bridge) return;
    await bridge.disconnect();
    this._resetSession();
    this._setStatus('disconnected');
    this._setLoginStatus('disconnected');
  }

  sendRaw(command: string): void {
    if (this._status !== 'connected') return;
    window.chessUnleashedFics?.send(command);
  }

  seekGame(request: FicsSeekRequest): void {
    if (this._loginStatus !== 'logged-in') return;
    this.sendStandardCommand('seekGame', request satisfies SeekGameCommandPayload);
  }

  cancelSeek(seekId?: number | string): void {
    if (this._status !== 'connected') return;
    this.sendStandardCommand('cancelSeek', { seekId });
  }

  sendGameControl(action: FicsGameControlAction): void {
    if (this._loginStatus !== 'logged-in') return;
    const commandId: StandardOnlineCommandId = action === 'draw' ? 'offerDraw' : action;
    this.sendStandardCommand(commandId);
  }

  sendChat(message: string): void {
    if (this._loginStatus !== 'logged-in') return;
    this.sendStandardCommand('say', { message });
  }

  observeGame(gameId: string): void {
    if (this._loginStatus !== 'logged-in') return;
    const id = gameId.trim();
    if (!id) return;
    if (!this.sendStandardCommand('observeGame', { gameId: id })) return;
    this._observedGameId = id;
    this._observeListeners.forEach(cb => cb(id));
  }

  unobserveGame(gameIdOrHandle?: string | number): void {
    if (this._status !== 'connected') return;
    this.sendStandardCommand('unobserve', { gameIdOrHandle });
    this._observedGameId = null;
    this._observeListeners.forEach(cb => cb(null));
  }

  acceptChallenge(fromUser: string): void {
    if (this._loginStatus !== 'logged-in') return;
    this.sendStandardCommand('acceptOffer', { fromUser });
    this._removeChallenge(fromUser);
  }

  declineChallenge(fromUser: string): void {
    if (this._loginStatus !== 'logged-in') return;
    this.sendStandardCommand('declineOffer', { fromUser });
    this._removeChallenge(fromUser);
  }

  sendMove(move: string): void {
    if (Math.abs(this._myRelation) !== 1) return;
    this.sendStandardCommand('move', move);
  }

  matchPlayer(handle: string, timeMinutes: number, incrementSeconds: number, rated: boolean, color: 'auto' | 'white' | 'black' = 'auto'): void {
    if (this._loginStatus !== 'logged-in') return;
    this.sendStandardCommand('matchPlayer', { handle, timeMinutes, incrementSeconds, rated, color } satisfies MatchPlayerCommandPayload);
  }

  playSeek(seekId: number | string): void {
    if (this._loginStatus !== 'logged-in') return;
    this.sendStandardCommand('playSeek', { seekId });
  }

  rematch(): void {
    if (this._loginStatus !== 'logged-in') return;
    this.sendStandardCommand('rematch');
  }

  requestGames(): void {
    if (this._status !== 'connected') return;
    this._gameListBuffer = [];
    this._collectingGames = true;
    this.sendStandardCommand('listGames');
  }

  requestSought(): void {
    if (this._status !== 'connected') return;
    this._seekListBuffer = [];
    this._collectingSought = true;
    this.sendStandardCommand('listSeeks');
  }

  showPendingOffers(): void {
    if (this._status !== 'connected') return;
    this.sendStandardCommand('showPendingOffers');
  }

  getMoves(target?: string | number): void {
    if (this._status !== 'connected') return;
    this.sendStandardCommand('getMoves', { gameId: target });
  }

  sendTell(handle: string, message: string): void {
    if (this._loginStatus !== 'logged-in') return;
    this.sendStandardCommand('tell', { handle, message });
  }

  sendKibitz(message: string): void {
    if (this._loginStatus !== 'logged-in') return;
    this.sendStandardCommand('kibitz', { message });
  }

  sendWhisper(message: string): void {
    if (this._loginStatus !== 'logged-in') return;
    this.sendStandardCommand('whisper', { message });
  }

  requestMoreTime(seconds?: number): void {
    if (this._loginStatus !== 'logged-in') return;
    this.sendStandardCommand('moreTime', { seconds });
  }

  requestTakeback(moves?: number): void {
    if (this._loginStatus !== 'logged-in') return;
    this.sendStandardCommand('takeback', { moves });
  }

  flagOpponent(): void {
    if (this._loginStatus !== 'logged-in') return;
    this.sendStandardCommand('flag');
  }

  destroy(): void {
    this._unsubBridge.forEach(fn => fn());
    this._unsubBridge.length = 0;
    this._statusListeners.clear();
    this._loginStatusListeners.clear();
    this._msgListeners.clear();
    this._challengeListeners.clear();
    this._gameStateListeners.clear();
    this._style12Listeners.clear();
    this._observeListeners.clear();
    this._gamesListeners.clear();
    this._soughtListeners.clear();
  }

  // --- Private ---
  private _setStatus(s: ConnectionStatus): void {
    this._status = s;
    this._statusListeners.forEach(cb => cb(s));
  }

  private _setLoginStatus(s: FicsLoginStatus): void {
    this._loginStatus = s;
    this._loginStatusListeners.forEach(cb => cb(s));
  }

  private _handleTcpStatus(status: ConnectionStatus): void {
    this._setStatus(status);
    if (status === 'connected') {
      this._setLoginStatus('awaiting-login');
    } else if (status === 'disconnected' || status === 'error') {
      this._resetSession();
      this._setLoginStatus(status === 'error' ? 'error' : 'disconnected');
    }
  }

  private _handleRawData(raw: string): void {
    this._loginBuffer += raw;
    this._processLoginFlow();
    if (this._loginBuffer.length > 32768) {
      this._loginBuffer = this._loginBuffer.slice(-4096);
    }

    const combined = this._lineBuffer + raw;
    const lines = combined.split('\n');
    this._lineBuffer = lines.pop() ?? '';

    for (const line of lines) {
      this._emitLine(line.replace(/\r/g, ''));
    }

    // Emit prompt lines that arrive without a trailing newline
    const partial = this._lineBuffer.replace(/\r/g, '').trimEnd();
    if (/login:\s*$/i.test(partial) || /password:\s*$/i.test(partial)) {
      this._emitLine(partial);
    }
  }

  private _emitLine(line: string): void {
    const trimmed = line.trimEnd();
    if (!trimmed) return;

    if (this._collectingGames) {
      if (this._parser.isGamesListEnd(trimmed) || this._parser.isGamesEmpty(trimmed)) {
        this._gameRows = [...this._gameListBuffer];
        this._gameListBuffer = [];
        this._collectingGames = false;
        this._gamesListeners.forEach(cb => cb([...this._gameRows]));
      } else {
        const row = this._parser.parseGameRow(trimmed);
        if (row) this._gameListBuffer.push(row);
      }
    }

    if (this._collectingSought) {
      if (this._parser.isSoughtListEnd(trimmed) || this._parser.isSoughtEmpty(trimmed)) {
        this._seekRows = [...this._seekListBuffer];
        this._seekListBuffer = [];
        this._collectingSought = false;
        this._soughtListeners.forEach(cb => cb([...this._seekRows]));
      } else {
        const row = this._parser.parseSoughtRow(trimmed);
        if (row) this._seekListBuffer.push(row);
      }
    } else {
      // FICS can also push live seek announcements after the sought list completes.
      // Keep the Online seek list useful without requiring another refresh.
      const liveSeek = this._parser.parseSoughtRow(trimmed);
      if (liveSeek && /\bseeking\b/i.test(trimmed)) {
        const withoutDuplicate = this._seekRows.filter(row => row.seekId !== liveSeek.seekId);
        this._seekRows = [liveSeek, ...withoutDuplicate].slice(0, 40);
        this._soughtListeners.forEach(cb => cb([...this._seekRows]));
      }
    }

    const msg = this._parser.parse(trimmed);
    this._processMessage(msg);
    this._msgListeners.forEach(cb => cb(msg));
  }

  private _processMessage(msg: FicsServerMessage): void {
    if (msg.style12) {
      const s12 = msg.style12;
      this._style12Active = true;
      this._latestStyle12 = s12;
      this._myRelation = s12.myRelation;
      this._style12Listeners.forEach(cb => cb(s12));
      // myRelation 2=observing, 0=examining — confirm observe state from server
      if ((s12.myRelation === 2 || s12.myRelation === 0) && this._observedGameId === null) {
        this._observedGameId = String(s12.gameId);
        this._observeListeners.forEach(cb => cb(this._observedGameId));
      }
      const newState: FicsGameState = {
        gameId: String(s12.gameId),
        active: Math.abs(s12.myRelation) === 1,
        whitePlayer: s12.whiteName,
        blackPlayer: s12.blackName,
        whiteTimeMs: s12.whiteClock * 1000,
        blackTimeMs: s12.blackClock * 1000,
        moveNumber: s12.moveNumber,
        turn: s12.turn
      };
      this._gameState = newState;
      this._gameStateListeners.forEach(cb => cb(newState));
    }

    if (msg.type === 'challenge') {
      const parsed = this._parser.detectChallenge(msg.raw);
      if (parsed) {
        const challenge: FicsChallenge = {
          id: `${parsed.fromUser}-${msg.timestamp}`,
          fromUser: parsed.fromUser,
          timeMinutes: parsed.time,
          incrementSeconds: parsed.inc,
          rated: parsed.rated,
          color: 'unknown',
          rawText: msg.raw,
          parsedReliably: parsed.parsedReliably
        };
        this._challenges = [
          ...this._challenges.filter(c => c.fromUser !== parsed.fromUser),
          challenge
        ];
        this._challengeListeners.forEach(cb => cb([...this._challenges]));
      }
    }

    if (msg.type === 'game' && !msg.style12) {
      const start = this._parser.detectGameStart(msg.raw);
      if (start) {
        const newState: FicsGameState = {
          gameId: String(start.gameId),
          active: true,
          whitePlayer: start.white,
          blackPlayer: start.black,
          whiteTimeMs: 0,
          blackTimeMs: 0,
          moveNumber: 0,
          turn: 'white'
        };
        this._gameState = newState;
        this._challenges = [];
        this._gameStateListeners.forEach(cb => cb(newState));
        this._challengeListeners.forEach(cb => cb([]));
      }

      const end = this._parser.detectGameEnd(msg.raw);
      if (end && this._gameState?.gameId === String(end.gameId)) {
        this._gameState = null;
        this._gameStateListeners.forEach(cb => cb(null));
      }
    }
  }

  private _processLoginFlow(): void {
    const buf = this._loginBuffer;

    if (!this._loginNameSent && /login:\s*$/mi.test(buf)) {
      this._loginNameSent = true;
      this._setLoginStatus('logging-in');
      const name = this._credentials?.mode === 'account'
        ? (this._credentials.username ?? 'guest')
        : 'guest';
      window.chessUnleashedFics?.send(name);
      this._loginBuffer = '';
      return;
    }

    if (this._loginNameSent && !this._loginPassSent && !this._guestReturnSent) {
      if (/password:\s*$/mi.test(buf)) {
        this._loginPassSent = true;
        window.chessUnleashedFics?.send(this._credentials?.password ?? '');
        this._loginBuffer = '';
        return;
      }
      if (/press return to enter/i.test(buf)) {
        this._guestReturnSent = true;
        window.chessUnleashedFics?.send('');
        this._loginBuffer = '';
        return;
      }
    }

    if (!this._loggedInDetected && /starting fics session as\s+(\w+)/i.test(buf)) {
      this._loggedInDetected = true;
      const m = /starting fics session as\s+(\w+)/i.exec(buf);
      this._handle = m?.[1] ?? null;
      this._style12Requested = false;
      this._style12Active = false;
      this._setLoginStatus('logged-in');
      this.sendStandardCommand('setStyle12');
      this._style12Requested = true;
      this._loginBuffer = '';
      return;
    }

    if (!this._loggedInDetected
      && (this._loginStatus === 'logging-in' || this._loginStatus === 'awaiting-login')
      && /invalid password|login incorrect/i.test(buf)) {
      this._setLoginStatus('login-failed');
      this._loginBuffer = '';
    }
  }

  private _resetLoginState(): void {
    this._loginBuffer = '';
    this._lineBuffer = '';
    this._loginNameSent = false;
    this._loginPassSent = false;
    this._guestReturnSent = false;
    this._loggedInDetected = false;
  }

  private _resetSession(): void {
    this._resetLoginState();
    this._handle = null;
    this._style12Requested = false;
    this._style12Active = false;
    this._gameState = null;
    this._challenges = [];
    this._latestStyle12 = null;
    this._observedGameId = null;
    this._credentials = null;
    this._gameRows = [];
    this._seekRows = [];
    this._gameListBuffer = [];
    this._seekListBuffer = [];
    this._collectingGames = false;
    this._collectingSought = false;
    this._myRelation = 0;
    this._gamesListeners.forEach(cb => cb([]));
    this._soughtListeners.forEach(cb => cb([]));
    this._observeListeners.forEach(cb => cb(null));
  }

  private _removeChallenge(fromUser: string): void {
    this._challenges = this._challenges.filter(c => c.fromUser !== fromUser);
    this._challengeListeners.forEach(cb => cb([...this._challenges]));
  }
}

let _instance: FicsAdapter | null = null;
export function getFicsAdapter(): FicsAdapter {
  if (!_instance) _instance = new FicsAdapter();
  return _instance;
}
