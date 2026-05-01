export interface PackageCategory {
  id: string;
  label: string;
  keys: string[];
}

export const PACKAGE_SCHEMA_VERSION = 1;

export const wrapPackageOutput = <T extends Record<string, any>>(data: T) => ({
  schemaVersion: PACKAGE_SCHEMA_VERSION,
  data
});

export function migratePackage<T>(data: T, _version: number): T {
  return data;
}

export const unwrapPackageInput = <T extends Record<string, any>>(pkg: T) => {
  const version = pkg.schemaVersion ?? 1;
  const data = pkg.data ?? pkg;
  return migratePackage(data, version);
};

export const PACKAGE_CATEGORIES: PackageCategory[] = [
  { id: 'squares', label: 'Square Colors', keys: ['boardColors'] },
  { id: 'pieces', label: 'Piece Set & Variants', keys: ['pieceTheme', 'whitePieceTheme', 'blackPieceTheme', 'pieceThemeMode'] },
  { id: 'paths', label: 'Path Visuals', keys: ['pathStyle', 'badgeColors'] },
  { id: 'layers', label: 'Layers (BG/Frame/Overlay)', keys: ['background', 'frameLayer', 'boardOverlay'] }
];
