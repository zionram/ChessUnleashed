export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface OnlineCredentials {
  mode: 'guest' | 'account';
  username?: string;
  password?: string;
}

export interface OnlineServiceAdapter {
  readonly serviceName: string;
  readonly status: ConnectionStatus;
  connect(credentials: OnlineCredentials): Promise<void>;
  disconnect(): Promise<void>;
  sendRaw(command: string): void;
}
