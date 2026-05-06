import React, { useState, useRef, useEffect } from 'react';
import JSZip from 'jszip';
import { useAudio } from '../context/AudioContext';
import { useSettings } from '../context/SettingsContext';
import {
  validateExperiencePackage,
  makePackagePortable,
  type ExperiencePackage,
  type ExperiencePackageContents,
  type ExperienceAssetCategory
} from '../packages/ExperiencePackage';
import { validateCustomRuleset } from '../rules/RulePackages';
import { getCustomEventStatus } from '../events/CustomEventRuntime';

// ─── Constants ────────────────────────────────────────────────────────────────

const KNOWN_CONTENT_KEYS = new Set([
  'template', 'uiAppearance', 'timeControl', 'chatSettings', 'rules',
  'audio', 'audioSettings', 'soundLibrary', 'soundRules', 'audioPlaylists',
  'botSettings', 'personalityProfiles', 'registeredBots', 'localProfile',
  'multiplayerServer', 'compliancePolicy', 'customEvents',
  'animationDefinitions', 'animationRules', 'customRulesets'
]);

const RUNTIME_STATE_KEYS = new Set([
  'fen', 'moveHistory', 'historyFens', 'currentTurn', 'timerState',
  'result', 'gameState', 'boardState', 'selectedCustomRulesetId', 'currentTurnIndex'
]);

const KNOWN_TOP_KEYS = new Set(['format', 'metadata', 'contents', 'assetManifest']);

const CATEGORY_LABELS: Record<string, string> = {
  template: 'Visuals / Board / Pieces',
  uiAppearance: 'UI Appearance',
  timeControl: 'Timer',
  audio: 'Audio Profile (Legacy)',
  audioSettings: 'Audio Settings',
  soundLibrary: 'Sound Library',
  soundRules: 'Sound Rules',
  audioPlaylists: 'Audio Playlists',
  customEvents: 'Custom Events',
  animationDefinitions: 'Animation Definitions',
  animationRules: 'Event Animation Rules',
  customRulesets: 'Custom Rulesets / Custom Games',
  botSettings: 'Bot Settings',
  registeredBots: 'Registered Bots',
  chatSettings: 'Chat Settings',
  localProfile: 'Profile Identity',
  multiplayerServer: 'Multiplayer Server Settings',
  compliancePolicy: 'Compliance Policy',
  rules: 'Rules Mode',
  personalityProfiles: 'Bot Personalities',
};

// ─── AI Prompt Templates ──────────────────────────────────────────────────────

const UNIVERSAL_PROMPT = `Create a complete Chess Unleashed ExperiencePackage ZIP file from my request.

You must generate and attach the actual downloadable .zip file. Do not return only JSON. Do not return instructions for making the ZIP.

USER REQUEST:
[DESCRIBE WHAT YOU WANT HERE — replace this line]

Required ZIP structure:
PackageName.zip
├── experience.json
├── manifest.json
└── assets/
    ├── boards/
    ├── pieces/
    ├── ui/
    └── audio/

Hard output rules:
- Final response must attach the completed .zip file.
- Do not return only JSON.
- Do not return base64.
- Do not use data: URLs.
- Do not use local filesystem paths.
- Do not hotlink runtime assets.
- All media must be real files inside the ZIP under assets/.
- If you cannot create a ZIP in this AI environment, explicitly say: "I cannot attach files in this environment." Do not pretend the ZIP was created.

experience.json rules:
- experience.json must be valid JSON.
- Top-level keys must be only: format, metadata, contents, assetManifest.
- Do not invent extra top-level keys such as theme, assets, config, images, sounds, or files.
- The required top-level skeleton is:
{
  "format": "chess-unleashed-experience",
  "metadata": {
    "name": "...",
    "version": "1.0.0",
    "description": "...",
    "author": "AI Generated"
  },
  "contents": {},
  "assetManifest": {
    "assets": []
  }
}

Supported contents categories — include only what the request needs:
- rules: { "gameMode": "standard"|"custom", "trainingWheels": true|false }
- botSettings: { "difficulty": 1-10, "enablePersonality": true|false }
- uiAppearance: board size and interface color overrides
- template: visual theme fields:
    boardColors: { "light": "#f0d9b5", "dark": "#b58863", "selected": "#ffeb3b", "moveTarget": "#c8e6c9" }
    boardOverlay: { "image": "package://assets/boards/file.png", "opacity": 0.2 }
    background: { "color": "#000000", "image": "package://assets/boards/file.jpg", "opacity": 1, "repeat": "no-repeat", "size": "cover", "xOffset": 0, "yOffset": 0, "scale": 100 }
    frameLayer: { "color": "transparent", "image": "package://assets/ui/file.png", "opacity": 1, "repeat": "no-repeat", "size": "cover", "xOffset": 0, "yOffset": 0, "scale": 100, "lockToBoard": true, "frameSizeMode": "match-board" }
    pieceThemeMode: "unified" or "team"
    pieceTheme / whitePieceTheme / blackPieceTheme: { "type": "builtin"|"custom", "builtinSet": "cburnett", "customPieces": {}, "customVariants": {} }
    For custom pieces, use keys wp, wn, wb, wr, wq, wk, bp, bn, bb, br, bq, bk and package:// URLs.
- audioSettings: { "masterVolume": 0-1, "musicVolume": 0-1, "sfxVolume": 0-1 }
- soundLibrary: [{ "id": "...", "name": "...", "url": "package://assets/audio/file.wav" }]
- soundRules: [{ "id": "...", "name": "...", "event": "pieceMoved", "piece": "any", "side": "any", "mode": "any", "soundId": "..." }]
  Valid event examples: afterMove, pieceMoved, pieceCaptured, check, checkmate, promotion, gameStart, gameEnd, panelOpened.
- customEvents, animationDefinitions, animationRules only if specifically requested.

Forbidden runtime state:
- Never include fen, moveHistory, currentTurn, timerState, result, gameState, boardState, historyFens, or currentTurnIndex in contents.

Asset rules:
- Every runtime media reference in experience.json must use package://assets/<category>/<filename>.
- Valid categories are boards, pieces, ui, audio.
- Every package:// reference must correspond to a real file in the ZIP.
- If experience.json says package://assets/pieces/wp-shell.png, the ZIP must contain assets/pieces/wp-shell.png.
- Every package:// reference must have a matching assetManifest.assets entry.
- Every assetManifest.assets packagePath must exist as a real file in the ZIP.
- Do not leave asset files missing.
- Do not put sourceUrl in runtime fields.

assetManifest shape:
- assetManifest must be an object with an assets array. Never use assetManifest as a raw array.
- Correct shape:
  "assetManifest": {
    "assets": [
      {
        "id": "asset-1",
        "filename": "wp-shell.png",
        "mimeType": "image/png",
        "category": "pieces",
        "packagePath": "assets/pieces/wp-shell.png",
        "originalDisplayName": "White Shell Pawn"
      }
    ]
  }
- Wrong shape:
  "assetManifest": [ { ... } ]

Allowed asset file formats:
- Images: .png, .jpg, .jpeg, .webp
- Audio: .wav or .mp3
- Prefer generated/simple original PNG artwork and generated/simple WAV sounds if external assets are hard to find.
- Raw SVG may be used internally to create images, but the ZIP should contain raster image files such as PNG/JPG/WEBP, not raw SVG runtime assets.

Media creation guidance:
- Images may be simple generated artwork. Clean vector-style raster art is acceptable.
- Pieces should be readable at small chess-piece size.
- Audio can be simple generated WAV effects.
- If the request asks for sounds, include usable WAV files unless impossible.
- If the request asks for custom pieces, include all 12 piece image files unless the design clearly uses a built-in set.

manifest.json rules:
- Create manifest.json at ZIP root.
- Include enough package metadata for import, including format, metadata, assetManifest, and categories if required by the package format.
- manifest.json must agree with experience.json assetManifest.

Before attaching the ZIP, internally verify:
1. ZIP contains experience.json.
2. ZIP contains manifest.json.
3. ZIP contains every file referenced by package://.
4. experience.json has only valid top-level keys.
5. assetManifest is { "assets": [...] }, not an array.
6. Every assetManifest packagePath exists in the ZIP.
7. No asset path is empty.
8. No base64 is used.
9. No data: URL or local filesystem path is used.
10. The ZIP is ready to import into Chess Unleashed.

Final response:
Attach only the completed ZIP file. Do not include explanations unless you cannot attach files in this environment.`;

const buildUniversalPrompt = (userRequest: string): string =>
  UNIVERSAL_PROMPT.replace(
    '[DESCRIBE WHAT YOU WANT HERE — replace this line]',
    userRequest.trim() || '[DESCRIBE WHAT YOU WANT HERE — replace this line]'
  );

const PROMPTS: Array<{ id: string; label: string; text: string }> = [
  {
    id: 'theme',
    label: 'Theme Package',
    text: `Generate a valid Chess Unleashed experience package JSON for a custom visual theme.

Required structure:
{
  "format": "chess-unleashed-experience",
  "metadata": { "name": "...", "version": "1.0.0", "description": "...", "author": "..." },
  "contents": { ... }
}

Allowed content categories: template, uiAppearance, rules (all optional).

template fields (all sub-fields optional — include only what you need):
- boardColors: { "light": "#f0d9b5", "dark": "#b58863", "selected": "#ffeb3b", "moveTarget": "#c8e6c9" }
- boardOverlay: { "image": "", "opacity": 0.2 }
- background: { "color": "#f5f5f5", "image": "", "opacity": 1, "repeat": "no-repeat", "size": "cover", "xOffset": 0, "yOffset": 0, "scale": 100 }
    repeat: "repeat" | "no-repeat" | "space" | "round" | "centered"
    size: "auto" | "cover" | "contain" | CSS size string
- frameLayer: { "color": "transparent", "image": "", "opacity": 1, "repeat": "no-repeat", "size": "auto", "xOffset": 0, "yOffset": 0, "scale": 100, "lockToBoard": false, "frameSizeMode": "responsive" }
    frameSizeMode: "responsive" | "match-board" | "fixed" (add "fixedWidth"/"fixedHeight" numbers when "fixed")
- pieceThemeMode: "unified" | "team"
- pieceTheme / whitePieceTheme / blackPieceTheme: { "type": "builtin", "builtinSet": "cburnett", "customPieces": {}, "customVariants": {} }
    For custom images: "type": "custom", set customPieces keys wp/wn/wb/wr/wq/wk/bp/bn/bb/br/bq/bk to package:// or ""
- Leave all image fields as "" unless referencing a file in the ZIP.
- If any package:// references are used, include a top-level "assetManifest": { "version": "1.0.0", "assets": [...] }
  Each asset entry: { "id": "...", "filename": "...", "mimeType": "image/png", "category": "pieces"|"boards"|"ui", "packagePath": "assets/.../filename.png", "originalDisplayName": "..." }

uiAppearance fields (all optional):
- boardSize: number (300–900)
- welcomeSidebarBg: "#rrggbb" or "transparent"
- controlBarBg: "#rrggbb" or "transparent"

rules fields (optional):
- gameMode: "standard" | "custom"
- trainingWheels: true | false

Rules:
- Do NOT include: fen, moveHistory, currentTurn, timerState, result, gameState, boardState
- Do NOT invent fields that are not listed above
- Do NOT generate media files — use "" or package:// references only

Output: the experience.json only, then a "Required Assets:" section listing any image files that still need to be collected.`
  },
  {
    id: 'sound-event',
    label: 'Sound & Events Package',
    text: `Generate a valid Chess Unleashed experience package JSON with custom events and sound rules.

Required structure:
{
  "format": "chess-unleashed-experience",
  "metadata": { "name": "...", "version": "1.0.0", "description": "..." },
  "contents": { ... }
}

Allowed content categories: customEvents, soundLibrary, soundRules (all optional).

customEvents items:
{ "id": "evt-xxx", "name": "...", "eventId": "...", "category": "custom",
  "baseTrigger": "pieceMoved", "conditions": {}, "conditionMode": "all" }
Valid baseTrigger values: afterMove, pieceMoved, pieceCaptured, check, checkmate, promotion, gameStart, gameEnd, panelOpened

soundLibrary items:
{ "id": "snd-xxx", "name": "...", "url": "" }
Leave url as "" — list required audio files separately.

soundRules items:
{ "id": "sr-xxx", "name": "...", "event": "pieceMoved", "piece": "any", "side": "any", "mode": "any", "soundId": "snd-xxx" }
Valid event: same as baseTrigger values above
Valid piece: any, p, n, b, r, q, k
Valid side: any, w, b
Valid mode: any, local, vsComputer, multiplayer
soundId must match an id in soundLibrary.

Rules:
- Do NOT include live game state fields
- Do NOT invent fields not listed above
- Leave all audio URL fields as ""

Output: the JSON only, then a "Required Assets:" section listing any audio files needed.`
  },
  {
    id: 'animation',
    label: 'Animation Package',
    text: `Generate a valid Chess Unleashed experience package JSON with animation definitions and event-triggered animation rules.

Required structure:
{
  "format": "chess-unleashed-experience",
  "metadata": { "name": "...", "version": "1.0.0", "description": "..." },
  "contents": { ... }
}

Allowed content categories: animationDefinitions, customEvents, animationRules.

animationDefinitions items:
{ "id": "anim-xxx", "name": "...", "description": "...", "category": "...",
  "preset": "bounce", "targetType": "piece",
  "durationMs": 400, "delayMs": 0, "easing": "ease-in-out",
  "intensity": 0.7, "repeatCount": 1, "enabled": true, "status": "active" }
Valid preset: snap, slide, fast-slide, bounce, hop, shake, pulse, capture-pop, promotion-glow, board-flash
Valid targetType: piece, captured-piece, promoted-piece, board, ui

customEvents items:
{ "id": "evt-xxx", "name": "...", "eventId": "...", "category": "custom",
  "baseTrigger": "pieceCaptured", "conditions": {}, "conditionMode": "all" }
Valid baseTrigger: afterMove, pieceMoved, pieceCaptured, check, checkmate, promotion, gameStart, gameEnd, panelOpened

animationRules items:
{ "id": "ar-xxx", "eventId": "evt-xxx", "animationId": "anim-xxx",
  "target": "moved-piece", "scope": "any-piece", "enabled": true }
Valid target: moved-piece, captured-piece, target-square, source-square, board, current-player-panel, fallback-preview
Valid scope: any-piece, my-pieces, opponent-pieces, white-pieces, black-pieces
eventId must match a customEvents id. animationId must match an animationDefinitions id.

Rules:
- Do NOT include live game state fields
- Do NOT invent fields not listed above

Output: the complete valid JSON only.`
  },
  {
    id: 'full',
    label: 'Full Experience Package',
    text: `Generate a complete valid Chess Unleashed experience package JSON combining visuals, sounds, events, and animations.

Required structure:
{
  "format": "chess-unleashed-experience",
  "metadata": { "name": "...", "version": "1.0.0", "description": "...", "author": "..." },
  "contents": { ... }
}

Include a thoughtful selection from these content categories:
- template (optional sub-fields only):
    boardColors: { "light": "#hex", "dark": "#hex", "selected": "#hex", "moveTarget": "#hex" }
    boardOverlay: { "image": "", "opacity": 0.2 }
    background: { "color": "#hex", "image": "", "opacity": 1, "repeat": "no-repeat", "size": "cover", "xOffset": 0, "yOffset": 0, "scale": 100 }
    frameLayer: { "color": "transparent", "image": "", "opacity": 1, "repeat": "no-repeat", "size": "auto", "xOffset": 0, "yOffset": 0, "scale": 100, "lockToBoard": false, "frameSizeMode": "responsive" }
    pieceThemeMode: "unified" | "team"
    pieceTheme: { "type": "builtin", "builtinSet": "cburnett", "customPieces": {}, "customVariants": {} }
    Use "" for all image fields. Do not invent template fields not listed above.
- uiAppearance: boardSize (300–900), color overrides
- rules: gameMode ("standard"), trainingWheels (boolean)
- audioSettings: masterVolume (0–1), musicVolume (0–1), sfxVolume (0–1)
- customEvents: array of { id, name, eventId, category, baseTrigger, conditions: {}, conditionMode }
  Valid baseTrigger: afterMove, pieceMoved, pieceCaptured, check, checkmate, promotion, gameStart, gameEnd, panelOpened
- soundLibrary: array of { id, name, url: "" }
- soundRules: array of { id, name, event, piece, side, mode, soundId }
  soundId must match soundLibrary id. piece/side/mode accept "any" or specific values.
- animationDefinitions: array of { id, name, description, category, preset, targetType, durationMs, delayMs, easing, intensity, repeatCount, enabled, status }
  Valid preset: snap, slide, fast-slide, bounce, hop, shake, pulse, capture-pop, promotion-glow, board-flash
- animationRules: array of { id, eventId, animationId, target, scope, enabled }
  eventId → customEvents id. animationId → animationDefinitions id.
- botSettings: { difficulty: 1–10, enablePersonality: boolean }

Hard rules:
- Do NOT include any of: fen, moveHistory, currentTurn, timerState, result, gameState, boardState, historyFens
- Do NOT invent field names that are not explicitly listed above
- Use "" for all image/audio url fields unless referencing a file in the ZIP with package://assets/<category>/<filename>
  Valid category values: pieces, boards, audio, ui
- If any package:// references are used, include a top-level "assetManifest": { "version": "1.0.0", "assets": [...] }
  Each entry: { "id": "...", "filename": "...", "mimeType": "...", "category": "...", "packagePath": "assets/.../filename.ext", "originalDisplayName": "..." }
- Use unique string ids for all items (e.g. "evt-001", "snd-move", "anim-bounce-cap")

Output: the complete experience.json, then a "Required Assets:" section listing any image/audio files that still need to be collected before packaging as a ZIP.`
  }
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getCategoryWarnings = (
  contents: ExperiencePackageContents,
  category: string,
  currentSoundIds: Set<string>,
  existingCustomEvents: ExperiencePackageContents['customEvents']
): string[] => {
  const warnings: string[] = [];

  if (category === 'soundRules' && contents.soundRules) {
    const packageSoundIds = new Set([
      ...(contents.soundLibrary ?? []).map(s => s.id),
      ...(contents.audio?.library ?? []).map(s => s.id),
      ...currentSoundIds
    ]);
    const missing = contents.soundRules.filter(r => r.soundId && !packageSoundIds.has(r.soundId));
    if (missing.length > 0) warnings.push(`${missing.length} sound rule(s) reference sounds not in this package.`);
  }
  if (category === 'customEvents' && contents.customEvents) {
    const invalid = contents.customEvents.filter(e => getCustomEventStatus(e, existingCustomEvents ?? []) === 'Invalid');
    if (invalid.length > 0) warnings.push(`${invalid.length} custom event(s) need review before they can run.`);
  }
  if (category === 'customRulesets' && contents.customRulesets) {
    const invalid = contents.customRulesets.filter(r => !validateCustomRuleset(r).valid);
    if (invalid.length > 0) warnings.push(`${invalid.length} custom game(s) need validation before play.`);
  }
  if (category === 'registeredBots' && contents.registeredBots?.some(b => b.type === 'worker' || b.type === 'web')) {
    warnings.push('Worker/URL bots may need matching local engine files on this device.');
  }

  const categoryValue = contents[category as keyof ExperiencePackageContents];
  if (categoryValue && JSON.stringify(categoryValue).includes('package://')) {
    warnings.push('Contains asset references that need a .zip to restore. Use Package Manager › Load Package for full fidelity.');
  }

  return warnings;
};

// ─── AI Draft Manifest Helpers ───────────────────────────────────────────────

const AI_MIME_MAP: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
  mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg',
};

const inferAssetMime = (filename: string): string =>
  AI_MIME_MAP[filename.split('.').pop()?.toLowerCase() ?? ''] ?? 'application/octet-stream';

const inferAssetCategory = (packagePath: string): ExperienceAssetCategory => {
  if (packagePath.startsWith('assets/pieces/')) return 'pieces';
  if (packagePath.startsWith('assets/boards/')) return 'boards';
  if (packagePath.startsWith('assets/audio/')) return 'audio';
  return 'ui';
};

const generateAIAssetManifest = (pkg: ExperiencePackage): ExperiencePackage => {
  const json = JSON.stringify(pkg);
  const pattern = /"package:\/\/([^"\\]+)"/g;
  const refs = new Set<string>();
  let match;
  while ((match = pattern.exec(json)) !== null) {
    refs.add(match[1]);
  }
  if (refs.size === 0) return pkg;

  const existingPaths = new Set((pkg.assetManifest?.assets ?? []).map(a => a.packagePath));
  let nextId = (pkg.assetManifest?.assets.length ?? 0) + 1;

  const newEntries = [...refs]
    .filter(path => !existingPaths.has(path))
    .map(path => {
      const filename = path.split('/').pop() ?? path;
      return {
        id: `ai-asset-${nextId++}`,
        filename,
        mimeType: inferAssetMime(filename),
        category: inferAssetCategory(path),
        packagePath: path,
        originalDisplayName: filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
      };
    });

  if (newEntries.length === 0) return pkg;

  return {
    ...pkg,
    assetManifest: {
      version: '1.0.0',
      assets: [...(pkg.assetManifest?.assets ?? []), ...newEntries],
    },
  };
};

const AI_IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']);
const AI_AUDIO_EXTS = new Set(['mp3', 'wav', 'ogg']);

const isValidFileForPath = (file: File, packagePath: string): boolean => {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (packagePath.startsWith('assets/audio/')) {
    return file.type.startsWith('audio/') || AI_AUDIO_EXTS.has(ext);
  }
  return file.type.startsWith('image/') || AI_IMAGE_EXTS.has(ext);
};

const findDuplicateManifestFilenames = (assets: Array<{ filename: string }>): Set<string> => {
  const counts = new Map<string, number>();
  for (const asset of assets) {
    const key = asset.filename.toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return new Set([...counts.entries()].filter(([, n]) => n > 1).map(([k]) => k));
};

const validateDomainInput = (raw: string): string | null => {
  const domain = raw.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
  if (!domain) return null;
  if (domain.includes('*')) return null;
  if (domain.includes('/')) return null;
  if (domain.includes(' ')) return null;
  if (!domain.includes('.')) return null;
  return domain.toLowerCase();
};

const validateRemoteAssetUrl = (url: string, packagePath: string, allowlist: Set<string>): string | null => {
  let parsed: URL;
  try { parsed = new URL(url); } catch { return null; }
  if (parsed.protocol !== 'https:') return null;
  if (!allowlist.has(parsed.hostname)) return null;
  const ext = parsed.pathname.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'svg') return null;
  if (packagePath.startsWith('assets/audio/')) {
    return AI_AUDIO_EXTS.has(ext) ? url : null;
  }
  return AI_IMAGE_EXTS.has(ext) ? url : null;
};

const fetchRemoteAssetBlob = async (url: string, packagePath: string): Promise<Blob | null> => {
  const maxBytes = packagePath.startsWith('assets/audio/') ? 5 * 1024 * 1024 : 3 * 1024 * 1024;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') ?? '';
    if (packagePath.startsWith('assets/audio/') && !contentType.startsWith('audio/')) return null;
    if (!packagePath.startsWith('assets/audio/') && !contentType.startsWith('image/')) return null;
    const blob = await res.blob();
    if (blob.size > maxBytes) return null;
    return blob;
  } catch {
    return null;
  }
};

// ─── Component ────────────────────────────────────────────────────────────────

interface MissingAssetReport {
  filename: string;
  packagePath: string;
  category: string;
  reason: 'no-source' | 'rejected-url' | 'fetch-failed' | 'wrong-type' | 'conflict';
}

const MISSING_REASON_LABELS: Record<MissingAssetReport['reason'], string> = {
  'no-source': 'No source URL',
  'rejected-url': 'URL rejected (untrusted domain, SVG, or non-HTTPS)',
  'fetch-failed': 'Remote fetch failed',
  'wrong-type': 'Wrong file type',
  'conflict': 'Filename conflict in manifest',
};

interface AIPackageBuilderViewProps {
  closeOverlay?: () => void;
  registerCloseAttempt?: (fn: () => void) => void;
}

const AIPackageBuilderView: React.FC<AIPackageBuilderViewProps> = ({ closeOverlay, registerCloseAttempt }) => {
  const {
    settings,
    updateTemplate,
    updateUIAppearance,
    updateTimeControl,
    updateChatSettings,
    updateBotSettings,
    setGameMode,
    setTrainingWheels,
    setThemeDraft,
    importSettingsCategories,
    updateTrustedAssetDomains
  } = useSettings();
  const { getCurrentProfile, applyProfile } = useAudio();

  const [jsonInput, setJsonInput] = useState('');
  const [parsedPackage, setParsedPackage] = useState<ExperiencePackage | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationNotices, setValidationNotices] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [showPrompts, setShowPrompts] = useState(false);
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
  const [normalizeLog, setNormalizeLog] = useState<string[]>([]);
  const [zipAssetFiles, setZipAssetFiles] = useState<Map<string, File>>(new Map());
  const zipFileInputRef = useRef<HTMLInputElement>(null);
  const [domainInput, setDomainInput] = useState('');
  const [userRequest, setUserRequest] = useState('');
  const [missingAssets, setMissingAssets] = useState<MissingAssetReport[]>([]);

  const closeOverlayRef = useRef(closeOverlay);
  closeOverlayRef.current = closeOverlay;
  useEffect(() => {
    registerCloseAttempt?.(() => closeOverlayRef.current?.());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const availableCategories = parsedPackage ? Object.keys(parsedPackage.contents) : [];
  const currentSoundIds = new Set(getCurrentProfile().library.map(s => s.id));

  const allCategoryWarnings: Record<string, string[]> = {};
  if (parsedPackage) {
    availableCategories.forEach(cat => {
      const w = getCategoryWarnings(parsedPackage.contents, cat, currentSoundIds, settings.customEvents);
      if (w.length > 0) allCategoryWarnings[cat] = w;
    });
  }

  const totalWarnings = Object.values(allCategoryWarnings).flat().length;

  const resetState = () => {
    setParsedPackage(null);
    setValidationErrors([]);
    setValidationNotices([]);
    setSelectedCategories([]);
    setStatus(null);
    setNormalizeLog([]);
    setZipAssetFiles(new Map());
    setMissingAssets([]);
  };

  const copyPrompt = async (promptId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopiedPromptId(promptId);
    setTimeout(() => setCopiedPromptId(null), 2000);
  };

  const copyMissingAssets = async () => {
    if (missingAssets.length === 0) return;
    const name = parsedPackage?.metadata.name ?? 'package';
    const lines = [`Missing assets for: ${name}`, ''];
    missingAssets.forEach((a, i) => {
      lines.push(`${i + 1}. ${a.filename} (${a.category})`);
      lines.push(`   Path: ${a.packagePath}`);
      lines.push(`   Issue: ${MISSING_REASON_LABELS[a.reason]}`);
    });
    const text = lines.join('\n');
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  };

  const validate = () => {
    resetState();

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonInput.trim());
    } catch {
      setValidationErrors(['Invalid JSON — could not parse. Check for missing commas, quotes, or brackets.']);
      return;
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      setValidationErrors(['Input must be a JSON object, not an array or primitive value.']);
      return;
    }

    const obj = parsed as Record<string, unknown>;

    // Schema validation (blocking)
    const result = validateExperiencePackage(parsed);
    if (!result.valid) {
      setValidationErrors(result.issues);
      return;
    }

    // Non-blocking notices
    const notices: string[] = [];

    // Unknown top-level keys
    const unknownTopKeys = Object.keys(obj).filter(k => !KNOWN_TOP_KEYS.has(k));
    if (unknownTopKeys.length > 0) {
      notices.push(`Unknown top-level fields will be ignored: ${unknownTopKeys.join(', ')}. Use Normalize to clean them.`);
    }

    // Unknown content keys
    const contents = obj.contents as Record<string, unknown> | undefined;
    if (contents) {
      const unknownContentKeys = Object.keys(contents).filter(k => !KNOWN_CONTENT_KEYS.has(k));
      if (unknownContentKeys.length > 0) {
        notices.push(`Unknown content categories will be skipped on apply: ${unknownContentKeys.join(', ')}. Use Normalize to remove them.`);
      }

      // Runtime game state fields
      const foundRuntime = Object.keys(contents).filter(k => RUNTIME_STATE_KEYS.has(k));
      if (foundRuntime.length > 0) {
        notices.push(`Live game state detected in contents (${foundRuntime.join(', ')}) — these will be ignored. Use Normalize to remove them.`);
      }
    }

    // package:// asset refs
    if (JSON.stringify(obj).includes('package://')) {
      notices.push('This package references binary assets (package:// URLs). Asset images/audio will not load unless you use Package Manager › Load Package with the original .zip.');
    }

    const pkg = parsed as ExperiencePackage;
    setParsedPackage(pkg);
    setSelectedCategories(Object.keys(pkg.contents).filter(k => KNOWN_CONTENT_KEYS.has(k)));
    setValidationNotices(notices);
    setStatus(null);
  };

  const normalizePackage = () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonInput.trim());
    } catch {
      setValidationErrors(['Invalid JSON — fix syntax errors before normalizing.']);
      return;
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      setValidationErrors(['Input must be a JSON object to normalize.']);
      return;
    }

    const obj = { ...(parsed as Record<string, unknown>) };
    const changes: string[] = [];

    // Fix format
    if (obj.format !== 'chess-unleashed-experience') {
      obj.format = 'chess-unleashed-experience';
      changes.push('Set format to "chess-unleashed-experience".');
    }

    // Fix metadata
    if (!obj.metadata || typeof obj.metadata !== 'object' || Array.isArray(obj.metadata)) {
      obj.metadata = {};
      changes.push('Added missing metadata object.');
    }
    const meta = { ...(obj.metadata as Record<string, unknown>) };
    if (!meta.name || typeof meta.name !== 'string' || !meta.name.trim()) {
      meta.name = 'Unnamed Package';
      changes.push('Set metadata.name to "Unnamed Package".');
    }
    if (!meta.version || typeof meta.version !== 'string') {
      meta.version = '1.0.0';
      changes.push('Set metadata.version to "1.0.0".');
    }
    obj.metadata = meta;

    // Fix contents
    if (!obj.contents || typeof obj.contents !== 'object' || Array.isArray(obj.contents)) {
      obj.contents = {};
      changes.push('Added missing contents object.');
    }
    const contents = { ...(obj.contents as Record<string, unknown>) };

    // Remove unknown content keys
    const unknownContentKeys = Object.keys(contents).filter(k => !KNOWN_CONTENT_KEYS.has(k));
    unknownContentKeys.forEach(k => {
      delete contents[k];
      changes.push(`Removed unknown content key: "${k}".`);
    });

    // Remove runtime game state fields
    const foundRuntime = Object.keys(contents).filter(k => RUNTIME_STATE_KEYS.has(k));
    foundRuntime.forEach(k => {
      delete contents[k];
      changes.push(`Removed live game state field: "${k}".`);
    });
    obj.contents = contents;

    // Remove unknown top-level keys
    const unknownTopKeys = Object.keys(obj).filter(k => !KNOWN_TOP_KEYS.has(k));
    unknownTopKeys.forEach(k => {
      delete obj[k];
      changes.push(`Removed unknown top-level field: "${k}".`);
    });

    if (changes.length === 0) {
      changes.push('No changes needed — package was already clean.');
    }

    setJsonInput(JSON.stringify(obj, null, 2));
    setNormalizeLog(changes);
    resetState();
    setStatus('Package normalized. Click Validate to check the result.');
  };

  const applyPackage = () => {
    if (!parsedPackage) return;
    const { contents } = parsedPackage;

    if (selectedCategories.includes('template') && contents.template) updateTemplate(contents.template);
    if (selectedCategories.includes('uiAppearance') && contents.uiAppearance) updateUIAppearance(contents.uiAppearance);
    if (selectedCategories.includes('timeControl') && contents.timeControl) updateTimeControl(contents.timeControl);
    if (selectedCategories.includes('chatSettings') && contents.chatSettings) updateChatSettings(contents.chatSettings);
    if (selectedCategories.includes('botSettings') && contents.botSettings) updateBotSettings(contents.botSettings);
    if (selectedCategories.includes('rules') && contents.rules) {
      setGameMode(contents.rules.gameMode);
      setTrainingWheels(contents.rules.trainingWheels);
    }

    let nextAudioProfile = selectedCategories.includes('audio') && contents.audio
      ? contents.audio
      : getCurrentProfile();
    if (selectedCategories.includes('audioSettings') && contents.audioSettings) {
      nextAudioProfile = { ...nextAudioProfile, ...contents.audioSettings };
    }
    if (selectedCategories.includes('soundLibrary') && contents.soundLibrary) {
      nextAudioProfile = { ...nextAudioProfile, library: contents.soundLibrary };
    }
    if (selectedCategories.includes('soundRules') && contents.soundRules) {
      nextAudioProfile = { ...nextAudioProfile, rules: contents.soundRules };
    }
    if (selectedCategories.includes('audioPlaylists') && contents.audioPlaylists) {
      nextAudioProfile = { ...nextAudioProfile, ...contents.audioPlaylists };
    }
    if (
      (selectedCategories.includes('audio') && contents.audio) ||
      (selectedCategories.includes('audioSettings') && contents.audioSettings) ||
      (selectedCategories.includes('soundLibrary') && contents.soundLibrary) ||
      (selectedCategories.includes('soundRules') && contents.soundRules) ||
      (selectedCategories.includes('audioPlaylists') && contents.audioPlaylists)
    ) {
      applyProfile(nextAudioProfile);
    }

    importSettingsCategories({
      ...(selectedCategories.includes('personalityProfiles') && contents.personalityProfiles ? { personalityProfiles: contents.personalityProfiles } : {}),
      ...(selectedCategories.includes('registeredBots') && contents.registeredBots ? { registeredBots: contents.registeredBots } : {}),
      ...(selectedCategories.includes('localProfile') && contents.localProfile ? { localProfile: contents.localProfile } : {}),
      ...(selectedCategories.includes('multiplayerServer') && contents.multiplayerServer ? { multiplayerServer: contents.multiplayerServer } : {}),
      ...(selectedCategories.includes('customRulesets') && contents.customRulesets ? { customRulesets: contents.customRulesets } : {}),
      ...(selectedCategories.includes('customEvents') && contents.customEvents ? { customEvents: contents.customEvents } : {}),
      ...(selectedCategories.includes('animationDefinitions') && contents.animationDefinitions ? { animationDefinitions: contents.animationDefinitions } : {}),
      ...(selectedCategories.includes('animationRules') && contents.animationRules ? { animationRules: contents.animationRules } : {}),
    });

    setThemeDraft(null);
    const name = parsedPackage.metadata.name;
    setStatus(`Package applied and saved. (${name})`);
    setParsedPackage(null);
    setJsonInput('');
    setSelectedCategories([]);
    setValidationNotices([]);
    closeOverlay?.();
  };

  const saveAsDraft = () => {
    if (!parsedPackage) return;
    try {
      const portable = makePackagePortable(parsedPackage);
      const marked: ExperiencePackage = {
        ...portable,
        metadata: { ...portable.metadata, aiGenerated: true },
      };
      const withManifest = generateAIAssetManifest(marked);
      const blob = new Blob([JSON.stringify(withManifest, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const safeName = parsedPackage.metadata.name.replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '') || 'package';
      link.href = url;
      link.download = `${safeName}-draft.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setStatus(`Draft saved: ${link.download}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setStatus(`Save failed: ${message}`);
    }
  };

  const exportAsZip = async () => {
    if (!parsedPackage) return;
    setStatus('Exporting ZIP…');
    try {
      const portable = makePackagePortable(parsedPackage);
      const marked: ExperiencePackage = {
        ...portable,
        metadata: { ...portable.metadata, aiGenerated: true },
      };
      const withManifest = generateAIAssetManifest(marked);

      const zip = new JSZip();
      zip.file('experience.json', JSON.stringify(withManifest, null, 2));
      zip.file('manifest.json', JSON.stringify({
        format: withManifest.format,
        metadata: withManifest.metadata,
        assetManifest: withManifest.assetManifest,
        categories: Object.keys(withManifest.contents)
      }, null, 2));

      const assets = withManifest.assetManifest?.assets ?? [];
      const duplicates = findDuplicateManifestFilenames(assets);
      let bundled = 0, remoteFetched = 0;
      const missingReports: MissingAssetReport[] = [];

      const remoteAllowlist = new Set(settings.trustedAssetDomains);
      const remoteBlobs = new Map<string, Blob>();
      const remoteFailures = new Map<string, 'rejected-url' | 'fetch-failed'>();

      if (assets.length > 0) {
        const toFetch = assets.filter(a => !duplicates.has(a.filename.toLowerCase()) && !zipAssetFiles.has(a.filename.toLowerCase()) && a.sourceUrl);
        if (toFetch.length > 0) setStatus(`Fetching ${toFetch.length} remote asset${toFetch.length !== 1 ? 's' : ''}…`);
        for (const asset of toFetch) {
          const validUrl = validateRemoteAssetUrl(asset.sourceUrl!, asset.packagePath, remoteAllowlist);
          if (!validUrl) {
            remoteFailures.set(asset.packagePath, 'rejected-url');
          } else {
            const blob = await fetchRemoteAssetBlob(validUrl, asset.packagePath);
            if (blob) remoteBlobs.set(asset.packagePath, blob);
            else remoteFailures.set(asset.packagePath, 'fetch-failed');
          }
        }
      }

      for (const asset of assets) {
        const key = asset.filename.toLowerCase();
        if (duplicates.has(key)) {
          missingReports.push({ filename: asset.filename, packagePath: asset.packagePath, category: asset.category, reason: 'conflict' });
          continue;
        }
        const file = zipAssetFiles.get(key);
        if (!file) {
          const remoteBlob = remoteBlobs.get(asset.packagePath);
          if (remoteBlob) {
            zip.file(asset.packagePath, remoteBlob);
            remoteFetched++;
            continue;
          }
          const reason: MissingAssetReport['reason'] = asset.sourceUrl
            ? (remoteFailures.get(asset.packagePath) ?? 'fetch-failed')
            : 'no-source';
          missingReports.push({ filename: asset.filename, packagePath: asset.packagePath, category: asset.category, reason });
          continue;
        }
        if (!isValidFileForPath(file, asset.packagePath)) {
          missingReports.push({ filename: asset.filename, packagePath: asset.packagePath, category: asset.category, reason: 'wrong-type' });
          continue;
        }
        zip.file(asset.packagePath, file);
        bundled++;
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const safeName = parsedPackage.metadata.name.replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '') || 'package';
      link.href = url;
      link.download = `${safeName}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setMissingAssets(missingReports);

      const totalCovered = bundled + remoteFetched;
      if (assets.length === 0) {
        setStatus('ZIP saved.');
      } else if (totalCovered === assets.length) {
        setStatus(`ZIP saved with all ${assets.length} assets.`);
      } else {
        const parts: string[] = [];
        if (bundled > 0) parts.push(`${bundled} bundled`);
        if (remoteFetched > 0) parts.push(`${remoteFetched} remote`);
        if (missingReports.length > 0) parts.push(`${missingReports.length} missing/skipped`);
        setStatus(`ZIP saved: ${parts.join(', ')}.`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setStatus(`Export failed: ${message}`);
    }
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const canInput = !jsonInput.trim();

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="cu-themed-embedded-view cu-ai-package-builder-view" style={{ padding: '24px', maxWidth: 700, fontFamily: 'sans-serif', color: '#2c3e50' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>AI Package Builder</h2>
        <span style={{
          fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px',
          borderRadius: 10, background: '#fffbe6', border: '1px solid #f5d87a', color: '#8a6d00',
          letterSpacing: '0.02em'
        }}>
          Experimental · AI-assisted
        </span>
      </div>
      <p style={{ margin: '0 0 20px', fontSize: '0.84rem', color: '#555', lineHeight: 1.5 }}>
        Use an external AI (ChatGPT, Claude, Gemini) to generate Chess Unleashed package JSON,
        then paste it here to validate, review, and apply. No AI accounts or API keys required.
      </p>

      {/* Universal Prompt — primary action */}
      <div style={{ marginBottom: 16, border: '1px solid #b6d4fe', borderRadius: 8, overflow: 'hidden', background: '#f0f6ff' }}>
        <div style={{ padding: '12px 14px', borderBottom: '1px solid #b6d4fe', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1d4ed8' }}>✨ Universal Package Prompt</div>
            <div style={{ fontSize: '0.78rem', color: '#3b5ea6', marginTop: 2 }}>
              Copy, paste into any AI, describe what you want, paste the result below.
            </div>
          </div>
          <button
            onClick={() => copyPrompt('universal', buildUniversalPrompt(userRequest))}
            style={{
              padding: '7px 16px', borderRadius: 6, border: 'none', flexShrink: 0,
              background: copiedPromptId === 'universal' ? '#d1fae5' : '#2c7be5',
              color: copiedPromptId === 'universal' ? '#065f46' : '#fff',
              fontWeight: 700, fontSize: '0.84rem', cursor: 'pointer', transition: 'background 0.15s',
              whiteSpace: 'nowrap'
            }}
          >
            {copiedPromptId === 'universal' ? '✓ Copied!' : 'Copy Full Prompt'}
          </button>
        </div>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid #b6d4fe' }}>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#1d4ed8', marginBottom: 5 }}>
            Describe what you want
          </label>
          <textarea
            value={userRequest}
            onChange={e => setUserRequest(e.target.value)}
            placeholder="e.g. An underwater theme with teal board colors, bubble sound effects on capture, and animated piece movement."
            rows={3}
            style={{
              width: '100%', boxSizing: 'border-box',
              fontFamily: 'sans-serif', fontSize: '0.81rem',
              padding: '7px 10px', borderRadius: 5,
              border: '1px solid #b6d4fe', background: '#fff',
              color: '#1e1e1e', resize: 'vertical', lineHeight: 1.5
            }}
          />
        </div>
        <div style={{ padding: '10px 14px', fontSize: '0.8rem', color: '#1e3a8a', lineHeight: 1.7 }}>
          <div style={{ fontWeight: 600, marginBottom: 4, color: '#1d4ed8' }}>Your description can include any of:</div>
          <ul style={{ margin: 0, paddingLeft: 18, color: '#3b5ea6' }}>
            <li>Theme or mood (e.g. underwater, medieval, neon city, nature)</li>
            <li>Board colors or background image style</li>
            <li>Custom piece look, style, or set</li>
            <li>Sound effects, ambient audio, or music style</li>
            <li>Special rules, events, or animations</li>
          </ul>
          <div style={{ marginTop: 6, fontSize: '0.76rem', color: '#6b7eb4' }}>
            The full technical prompt is included when you click Copy Full Prompt.
          </div>
        </div>
      </div>

      {/* Specialized Prompts — optional/secondary */}
      <div style={{ marginBottom: 20, border: '1px solid #d0d7de', borderRadius: 8, overflow: 'hidden' }}>
        <button
          onClick={() => setShowPrompts(v => !v)}
          style={{
            width: '100%', textAlign: 'left', padding: '9px 14px',
            background: showPrompts ? '#f6f8fa' : '#fafafa',
            border: 'none', borderBottom: showPrompts ? '1px solid #d0d7de' : 'none',
            cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem', color: '#555',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}
        >
          <span>Optional: Specialized Prompts</span>
          <span style={{ fontSize: '0.76rem', color: '#888', fontWeight: 400 }}>
            {showPrompts ? 'Hide' : 'Theme · Sound/Events · Animation · Full Experience'}
          </span>
        </button>
        {showPrompts && (
          <div style={{ padding: 14 }}>
            <p style={{ margin: '0 0 12px', fontSize: '0.81rem', color: '#666', lineHeight: 1.5 }}>
              Use these when you want tighter control over a specific category.
              For most cases the Universal prompt above is all you need.
            </p>
            <div style={{ display: 'grid', gap: 10 }}>
              {PROMPTS.map(prompt => (
                <div key={prompt.id} style={{
                  border: '1px solid #d0d7de', borderRadius: 6, overflow: 'hidden', background: '#fdfdfd'
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px', background: '#f6f8fa', borderBottom: '1px solid #d0d7de'
                  }}>
                    <span style={{ fontWeight: 600, fontSize: '0.83rem' }}>{prompt.label}</span>
                    <button
                      onClick={() => copyPrompt(prompt.id, prompt.text)}
                      style={{
                        padding: '4px 12px', borderRadius: 5,
                        border: '1px solid #d0d7de',
                        background: copiedPromptId === prompt.id ? '#d1fae5' : '#fff',
                        color: copiedPromptId === prompt.id ? '#065f46' : '#2c3e50',
                        fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', transition: 'background 0.15s'
                      }}
                    >
                      {copiedPromptId === prompt.id ? '✓ Copied!' : 'Copy Prompt'}
                    </button>
                  </div>
                  <pre style={{
                    margin: 0, padding: '10px 12px',
                    fontSize: '0.73rem', color: '#333', background: '#fdfdfd',
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    maxHeight: 140, overflowY: 'auto', lineHeight: 1.5
                  }}>
                    {prompt.text}
                  </pre>
                </div>
              ))}
            </div>
            <p style={{ margin: '12px 0 0', fontSize: '0.78rem', color: '#666' }}>
              Full schema reference: <strong>docs/AI_PACKAGE_CREATION_GUIDE.md</strong> in the project folder.
            </p>
          </div>
        )}
      </div>

      {/* JSON Input */}
      <div style={{ marginBottom: 10 }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: '0.85rem' }}>
          Package JSON
        </label>
        <textarea
          value={jsonInput}
          onChange={e => { setJsonInput(e.target.value); resetState(); }}
          placeholder="Paste AI-generated package JSON here..."
          rows={13}
          style={{
            width: '100%', fontFamily: 'monospace', fontSize: '0.77rem',
            padding: '10px', border: '1px solid #d0d7de', borderRadius: 6,
            resize: 'vertical', background: '#fdfdfd', color: '#1e1e1e',
            boxSizing: 'border-box', lineHeight: 1.5
          }}
        />
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button
          onClick={validate}
          disabled={canInput}
          style={{
            padding: '8px 18px', borderRadius: 6, border: 'none',
            background: !canInput ? '#2c7be5' : '#b0c4de',
            color: '#fff', fontWeight: 600,
            cursor: !canInput ? 'pointer' : 'not-allowed', fontSize: '0.88rem'
          }}
        >
          Validate
        </button>
        <button
          onClick={normalizePackage}
          disabled={canInput}
          style={{
            padding: '8px 16px', borderRadius: 6,
            border: '1px solid #d0d7de',
            background: !canInput ? '#fff' : '#f6f8fa',
            color: !canInput ? '#2c3e50' : '#999',
            fontWeight: 600, cursor: !canInput ? 'pointer' : 'not-allowed', fontSize: '0.88rem'
          }}
          title="Strips unknown fields and fills required defaults without touching your actual content"
        >
          Normalize
        </button>
      </div>

      {/* Normalize Log */}
      {normalizeLog.length > 0 && (
        <div style={{ marginBottom: 16, padding: '10px 14px', background: '#f0f6ff', border: '1px solid #b6d4fe', borderRadius: 6 }}>
          <div style={{ fontWeight: 700, color: '#1d4ed8', marginBottom: 6, fontSize: '0.83rem' }}>Normalize Changes</div>
          {normalizeLog.map((line, i) => (
            <div key={i} style={{ fontSize: '0.8rem', color: '#1e3a8a', marginBottom: 2 }}>{line}</div>
          ))}
        </div>
      )}

      {/* Validation Errors (blocking) */}
      {validationErrors.length > 0 && (
        <div style={{ marginBottom: 16, padding: '12px 14px', background: '#fff5f5', border: '1px solid #f5c2c7', borderRadius: 6 }}>
          <div style={{ fontWeight: 700, color: '#c0392b', marginBottom: 6, fontSize: '0.85rem' }}>Invalid Package</div>
          {validationErrors.map((err, i) => (
            <div key={i} style={{ color: '#c0392b', fontSize: '0.82rem', marginBottom: 2 }}>✗ {err}</div>
          ))}
          <div style={{ marginTop: 8, fontSize: '0.78rem', color: '#888' }}>
            Fix the errors above, or try clicking <strong>Normalize</strong> to clean up common issues.
          </div>
        </div>
      )}

      {/* Validation Notices (non-blocking) */}
      {validationNotices.length > 0 && parsedPackage && (
        <div style={{ marginBottom: 16, padding: '10px 14px', background: '#fffbea', border: '1px solid #f5d87a', borderRadius: 6 }}>
          <div style={{ fontWeight: 700, color: '#8a6d00', marginBottom: 6, fontSize: '0.83rem' }}>Notices</div>
          {validationNotices.map((notice, i) => (
            <div key={i} style={{ fontSize: '0.8rem', color: '#6b5000', marginBottom: 2 }}>⚠ {notice}</div>
          ))}
        </div>
      )}

      {/* Valid Package Panel */}
      {parsedPackage && (
        <>
          <div style={{ marginBottom: 16, padding: '12px 14px', background: '#f0fff4', border: '1px solid #b2dfdb', borderRadius: 6 }}>
            <div style={{ fontWeight: 700, color: '#1a7a4a', marginBottom: 4, fontSize: '0.85rem' }}>✓ Valid Package</div>
            <div style={{ fontSize: '0.83rem', color: '#333' }}>
              <strong>{parsedPackage.metadata.name}</strong>
              {parsedPackage.metadata.version ? ` v${parsedPackage.metadata.version}` : ''}
              {parsedPackage.metadata.author ? ` — by ${parsedPackage.metadata.author}` : ''}
            </div>
            {parsedPackage.metadata.description && (
              <div style={{ fontSize: '0.8rem', color: '#555', marginTop: 4 }}>{parsedPackage.metadata.description}</div>
            )}
          </div>

          {/* Category Warnings */}
          {totalWarnings > 0 && (
            <div style={{ marginBottom: 14, padding: '10px 14px', background: '#fffbea', border: '1px solid #f5d87a', borderRadius: 6 }}>
              <div style={{ fontWeight: 700, color: '#8a6d00', marginBottom: 6, fontSize: '0.83rem' }}>
                Category Warnings ({totalWarnings})
              </div>
              {Object.entries(allCategoryWarnings).map(([cat, warns]) =>
                warns.map((w, i) => (
                  <div key={`${cat}-${i}`} style={{ fontSize: '0.79rem', color: '#6b5000', marginBottom: 2 }}>
                    <strong>{CATEGORY_LABELS[cat] ?? cat}:</strong> {w}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Category Selection */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                Categories to Apply ({selectedCategories.length}/{availableCategories.filter(c => KNOWN_CONTENT_KEYS.has(c)).length} selected)
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => setSelectedCategories(availableCategories.filter(c => KNOWN_CONTENT_KEYS.has(c)))}
                  style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: 4, border: '1px solid #d0d7de', background: '#f6f8fa', cursor: 'pointer', color: '#444' }}
                >
                  All
                </button>
                <button
                  onClick={() => setSelectedCategories([])}
                  style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: 4, border: '1px solid #d0d7de', background: '#f6f8fa', cursor: 'pointer', color: '#444' }}
                >
                  None
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {availableCategories.map(cat => {
                const isKnown = KNOWN_CONTENT_KEYS.has(cat);
                const warns = allCategoryWarnings[cat] ?? [];
                return (
                  <label key={cat} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: isKnown ? 'pointer' : 'default', fontSize: '0.83rem', opacity: isKnown ? 1 : 0.45 }}>
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(cat)}
                      onChange={() => isKnown && toggleCategory(cat)}
                      disabled={!isKnown}
                      style={{ marginTop: 2, flexShrink: 0 }}
                    />
                    <span>
                      <span style={{ fontWeight: 600 }}>{CATEGORY_LABELS[cat] ?? cat}</span>
                      {!isKnown && <span style={{ marginLeft: 6, color: '#999', fontSize: '0.76rem' }}>(unknown — will be skipped)</span>}
                      {isKnown && warns.length > 0 && (
                        <span style={{ marginLeft: 6, color: '#a07000', fontSize: '0.78rem' }}>
                          ⚠ {warns[0]}
                        </span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Apply / Save */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
            <button
              onClick={applyPackage}
              disabled={selectedCategories.length === 0}
              style={{
                padding: '8px 20px', borderRadius: 6, border: 'none',
                background: selectedCategories.length > 0 ? '#1a7a4a' : '#b0c4b0',
                color: '#fff', fontWeight: 700,
                cursor: selectedCategories.length > 0 ? 'pointer' : 'not-allowed', fontSize: '0.88rem'
              }}
            >
              Apply Package
            </button>
            <button
              onClick={saveAsDraft}
              style={{
                padding: '8px 16px', borderRadius: 6,
                border: '1px solid #d0d7de', background: '#fff',
                color: '#2c3e50', fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem'
              }}
            >
              Save as Draft (.json)
            </button>
          </div>

          {/* ZIP Export */}
          <div style={{ marginBottom: 14, padding: '10px 12px', background: '#f6f8fa', borderRadius: 6, border: '1px solid #d0d7de' }}>
            <div style={{ fontWeight: 600, fontSize: '0.83rem', color: '#444', marginBottom: 8 }}>Export as ZIP</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => zipFileInputRef.current?.click()}
                style={{
                  padding: '6px 12px', borderRadius: 5,
                  border: '1px solid #d0d7de', background: '#fff',
                  color: '#2c3e50', fontWeight: 500, cursor: 'pointer', fontSize: '0.82rem'
                }}
              >
                {zipAssetFiles.size > 0
                  ? `${zipAssetFiles.size} file${zipAssetFiles.size !== 1 ? 's' : ''} selected`
                  : 'Select asset files (optional)'}
              </button>
              <button
                onClick={exportAsZip}
                style={{
                  padding: '6px 14px', borderRadius: 5, border: 'none',
                  background: '#2c7be5', color: '#fff',
                  fontWeight: 600, cursor: 'pointer', fontSize: '0.82rem'
                }}
              >
                Export as ZIP
              </button>
              <input
                ref={zipFileInputRef}
                type="file"
                multiple
                style={{ display: 'none' }}
                onChange={e => {
                  const map = new Map<string, File>();
                  Array.from(e.target.files ?? []).forEach(f => map.set(f.name.toLowerCase(), f));
                  setZipAssetFiles(map);
                }}
              />
            </div>
            <div style={{ fontSize: '0.76rem', color: '#888', marginTop: 6 }}>
              Select files matching manifest filenames (e.g. wp.png, ocean-bg.jpg). Unmatched entries are noted on export.
            </div>

            {/* Trusted remote asset domains */}
            <div style={{ marginTop: 10, borderTop: '1px solid #e0e0e0', paddingTop: 8 }}>
              <div style={{ fontWeight: 600, fontSize: '0.78rem', color: '#555', marginBottom: 5 }}>
                Trusted remote asset domains
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 6 }}>
                {settings.trustedAssetDomains.map(domain => (
                  <div key={domain} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', background: '#fff', border: '1px solid #d0d7de', borderRadius: 4, padding: '3px 8px' }}>
                    <span style={{ fontFamily: 'monospace', color: '#2c3e50' }}>{domain}</span>
                    <button
                      onClick={() => updateTrustedAssetDomains(settings.trustedAssetDomains.filter(d => d !== domain))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: '0.78rem', padding: '0 2px', lineHeight: 1 }}
                      title="Remove domain"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="text"
                  value={domainInput}
                  onChange={e => setDomainInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const validated = validateDomainInput(domainInput);
                      if (validated && !settings.trustedAssetDomains.includes(validated)) {
                        updateTrustedAssetDomains([...settings.trustedAssetDomains, validated]);
                      }
                      setDomainInput('');
                    }
                  }}
                  placeholder="example.com"
                  style={{ flex: 1, fontSize: '0.78rem', padding: '4px 8px', borderRadius: 4, border: '1px solid #d0d7de', fontFamily: 'monospace' }}
                />
                <button
                  onClick={() => {
                    const validated = validateDomainInput(domainInput);
                    if (validated && !settings.trustedAssetDomains.includes(validated)) {
                      updateTrustedAssetDomains([...settings.trustedAssetDomains, validated]);
                    }
                    setDomainInput('');
                  }}
                  disabled={!validateDomainInput(domainInput)}
                  style={{
                    fontSize: '0.78rem', padding: '4px 10px', borderRadius: 4,
                    border: '1px solid #d0d7de',
                    background: validateDomainInput(domainInput) ? '#f0f6ff' : '#f6f8fa',
                    color: validateDomainInput(domainInput) ? '#1d4ed8' : '#999',
                    cursor: validateDomainInput(domainInput) ? 'pointer' : 'not-allowed',
                    fontWeight: 600
                  }}
                >
                  Add
                </button>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#aaa', marginTop: 4 }}>
                HTTPS only. Domain name only (e.g. raw.githubusercontent.com). No wildcards.
              </div>
            </div>
          </div>

          {/* Missing Assets Report */}
          {missingAssets.length > 0 && (
            <div style={{ marginTop: 12, border: '1px solid #fbbf24', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', background: '#fffbe6', borderBottom: '1px solid #fbbf24' }}>
                <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#92400e' }}>
                  {missingAssets.length} asset{missingAssets.length !== 1 ? 's' : ''} not bundled
                </span>
                <button
                  onClick={copyMissingAssets}
                  style={{
                    fontSize: '0.76rem', padding: '3px 10px', borderRadius: 4,
                    border: '1px solid #fbbf24', background: '#fff',
                    color: '#92400e', fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  Copy Missing Assets
                </button>
              </div>
              <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {missingAssets.map((a, i) => (
                  <div key={i} style={{ fontSize: '0.78rem', lineHeight: 1.5 }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#1e1e1e' }}>{a.filename}</span>
                    <span style={{ color: '#888', marginLeft: 6 }}>({a.category})</span>
                    <span style={{ color: '#b45309', marginLeft: 6 }}>— {MISSING_REASON_LABELS[a.reason]}</span>
                    <div style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#666', marginTop: 1 }}>{a.packagePath}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ fontSize: '0.77rem', color: '#777', lineHeight: 1.5, marginTop: missingAssets.length > 0 ? 10 : 0 }}>
            Packages with binary assets (images, audio files) need a .zip to restore correctly.
            For full durable asset support, use Package Manager › Load Package with the original .zip.
          </div>
        </>
      )}

      {/* Status */}
      {status && (
        <div style={{
          marginTop: 14, padding: '10px 14px', borderRadius: 6, fontSize: '0.83rem', fontWeight: 500,
          background: status.startsWith('Package applied') || status.startsWith('Draft saved') || status.startsWith('ZIP saved') ? '#f0fff4' : '#f0f6ff',
          border: `1px solid ${status.startsWith('Package applied') || status.startsWith('Draft saved') || status.startsWith('ZIP saved') ? '#b2dfdb' : '#b6d4fe'}`,
          color: status.startsWith('Package applied') || status.startsWith('Draft saved') || status.startsWith('ZIP saved') ? '#1a7a4a' : '#1d4ed8'
        }}>
          {status}
        </div>
      )}

    </div>
  );
};

export default AIPackageBuilderView;
