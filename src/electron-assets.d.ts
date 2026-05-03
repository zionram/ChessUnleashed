import type { ExperienceAssetCategory } from './packages/ExperiencePackage';

export interface ImportedAssetRegistryEntry {
  id: string;
  originalPackagePath: string;
  localRef: string;
  mimeType: string;
  category: ExperienceAssetCategory;
  displayName: string;
  packageId: string;
}

export interface LanDiscoveredGame {
  id: string;
  appId: string;
  appVersion: string;
  hostDisplayName: string;
  hostAddress: string;
  serverPort: number;
  roomId: string;
  gameModeLabel: string;
  timestamp: string;
  lastSeen: number;
}

export interface LanServerInfo {
  port: number;
  addresses: string[];
  primaryAddress: string;
  manualUrl: string;
  discoveryPort: number;
  available: boolean;
}

declare global {
  interface Window {
    chessUnleashedAssets?: {
      savePackageAssets: (payload: {
        packageId: string;
        assets: Array<{
          id: string;
          packagePath: string;
          bytes: ArrayBuffer;
          mimeType: string;
          category: ExperienceAssetCategory;
          displayName: string;
        }>;
      }) => Promise<{
        packageId: string;
        refs: Record<string, string>;
        assets: ImportedAssetRegistryEntry[];
      }>;
    };
    chessUnleashedLan?: {
      startListening: () => Promise<{
        available: boolean;
        games: LanDiscoveredGame[];
        serverInfo?: LanServerInfo;
        error?: string;
      }>;
      getServerInfo: () => Promise<LanServerInfo>;
      startBroadcast: (payload: {
        hostDisplayName: string;
        roomId: string;
        gameModeLabel?: string;
      }) => Promise<{
        available: boolean;
        serverInfo?: LanServerInfo;
        error?: string;
      }>;
      stopBroadcast: () => Promise<{ available: boolean }>;
      onGamesUpdated: (listener: (games: LanDiscoveredGame[]) => void) => () => void;
    };
  }
}
