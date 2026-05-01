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
  }
}
