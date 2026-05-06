import React, { useEffect, useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import type { Template, LayerConfig } from '../templates/defaultTemplate';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PieceThemeAudit {
  type: string;
  builtinSet: string;
  customSlotsInUse: string[];
}

interface LayerAudit {
  imagePresent: boolean;
  color: string;
  opacity: number;
  repeat: string;
  size: string;
  xOffset: number | undefined;
  yOffset: number | undefined;
  scale: number | undefined;
  lockToBoard?: boolean;
  frameSizeMode?: string;
  fixedWidth?: number;
  fixedHeight?: number;
}

interface BoardMeasurement {
  measured: boolean;
  width?: number;
  height?: number;
  squareSize?: number;
  note: string;
}

interface AssetRecommendations {
  background: string;
  boardOverlay: string;
  frameLayer: string;
  pieces: string;
  animatedOverlays: string;
}

interface AuditData {
  generatedAt: string;
  templateSource: string;
  templateId: string;
  templateName: string;
  pieceThemeMode: string;
  pieceTheme: PieceThemeAudit;
  whitePieceTheme: PieceThemeAudit | null;
  blackPieceTheme: PieceThemeAudit | null;
  boardColors: Template['boardColors'];
  background: LayerAudit;
  boardOverlay: { imagePresent: boolean; opacity: number };
  frameLayer: LayerAudit;
  layerUploadMaxSizeMB: number;
  board: BoardMeasurement;
  assetRecommendations: AssetRecommendations;
  knownLimitations: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LAYER_UPLOAD_MAX_MB = 3;

const auditPieceTheme = (config: Template['pieceTheme']): PieceThemeAudit => ({
  type: config.type,
  builtinSet: config.builtinSet,
  customSlotsInUse: Object.entries(config.customPieces ?? {})
    .filter(([, url]) => !!url)
    .map(([slot]) => slot)
});

const auditLayer = (layer: LayerConfig): LayerAudit => ({
  imagePresent: !!layer.image,
  color: layer.color,
  opacity: layer.opacity,
  repeat: layer.repeat,
  size: layer.size,
  xOffset: layer.xOffset,
  yOffset: layer.yOffset,
  scale: layer.scale,
  lockToBoard: layer.lockToBoard,
  frameSizeMode: layer.frameSizeMode,
  fixedWidth: layer.fixedWidth,
  fixedHeight: layer.fixedHeight
});

const measureBoard = (): BoardMeasurement => {
  const el = document.querySelector('.board-container') as HTMLElement | null;
  if (!el) {
    return {
      measured: false,
      note: 'Board element not found in DOM at audit time. Open the board and regenerate the report for runtime dimensions.'
    };
  }
  const rect = el.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    return {
      measured: false,
      note: 'Board element found but has zero dimensions — it may be hidden. Open the board and regenerate.'
    };
  }
  return {
    measured: true,
    width: Math.round(rect.width),
    height: Math.round(rect.height),
    squareSize: Math.round(rect.width / 8),
    note: 'Runtime-measured from live DOM. Not a fixed universal value — changes with window/container size.'
  };
};

const buildAssetRecommendations = (t: Template, board: BoardMeasurement): AssetRecommendations => {
  const fl = t.frameLayer;
  let frameRec: string;
  if (fl.frameSizeMode === 'fixed' && fl.fixedWidth && fl.fixedHeight) {
    frameRec = `Fixed frame mode active. Recommended: ${fl.fixedWidth}×${fl.fixedHeight}px transparent PNG. Match active fixedWidth/fixedHeight exactly.`;
  } else if (fl.frameSizeMode === 'match-board') {
    if (board.measured && board.width) {
      frameRec = `Match-board mode. Current board is ~${board.width}px square. Recommended: square transparent PNG 1024×1024 or 2048×2048 (will be scaled to board size).`;
    } else {
      frameRec = 'Match-board mode. Recommended: square transparent PNG 1024×1024 or 2048×2048 (scales to rendered board size).';
    }
  } else {
    frameRec = 'Responsive mode. Recommended: square transparent PNG 1024×1024 or 2048×2048 (scales with layout).';
  }

  return {
    background: 'Recommended: 1920×1080px or larger JPEG/PNG. Use 16:9 for full-screen coverage. Transparent PNG if layering over board.',
    boardOverlay: 'Recommended: square transparent PNG 1024×1024 or 2048×2048. Will be scaled to fit the board grid.',
    frameLayer: frameRec,
    pieces: 'Recommended: square transparent PNG or SVG 512×512 or 1024×1024 per piece. GIF supported for animated pieces.',
    animatedOverlays: 'Recommended: transparent animated GIF or WebP. Loop behaviour: use infinite loop for ambient effects; single-play for event triggers. Keep file size under 3MB per file.'
  };
};

const buildAuditData = (t: Template, source: string): AuditData => {
  const board = measureBoard();
  return {
    generatedAt: new Date().toISOString(),
    templateSource: source,
    templateId: t.id,
    templateName: t.name,
    pieceThemeMode: t.pieceThemeMode,
    pieceTheme: auditPieceTheme(t.pieceTheme),
    whitePieceTheme: t.pieceThemeMode === 'team' && t.whitePieceTheme ? auditPieceTheme(t.whitePieceTheme) : null,
    blackPieceTheme: t.pieceThemeMode === 'team' && t.blackPieceTheme ? auditPieceTheme(t.blackPieceTheme) : null,
    boardColors: t.boardColors,
    background: auditLayer(t.background),
    boardOverlay: { imagePresent: !!t.boardOverlay.image, opacity: t.boardOverlay.opacity },
    frameLayer: auditLayer(t.frameLayer),
    layerUploadMaxSizeMB: LAYER_UPLOAD_MAX_MB,
    board,
    assetRecommendations: buildAssetRecommendations(t, board),
    knownLimitations: [
      'Board pixel dimensions are runtime-measured and vary with window/container size.',
      'Piece slot URLs may be blob: or local-asset:// references not portable between sessions.',
      'pieceSet (legacy field) reflects the last-used builtin set but pieceTheme.builtinSet is authoritative.',
      'Custom piece variants (conditional image rules) are noted by slot but full rule details are not expanded here.'
    ]
  };
};

// ─── Markdown generator ───────────────────────────────────────────────────────

const bool = (v: boolean | undefined) => (v ? 'Yes' : 'No');
const px = (v: number | undefined) => (v !== undefined ? `${v}px` : '—');
const pct = (v: number | undefined) => (v !== undefined ? `${v}%` : '—');

const generateMarkdown = (d: AuditData): string => {
  const boardSection = d.board.measured
    ? `- Current rendered width: **${d.board.width}px** *(runtime-measured)*
- Current rendered height: **${d.board.height}px** *(runtime-measured)*
- Square size (width ÷ 8): **${d.board.squareSize}px** *(runtime-measured)*
- Note: ${d.board.note}`
    : `- Board dimensions: **not measured** — ${d.board.note}`;

  const pieceTeamSection = d.pieceThemeMode === 'team' ? `
### White Pieces
- Type: ${d.whitePieceTheme?.type ?? '—'}
- Builtin set: ${d.whitePieceTheme?.builtinSet ?? '—'}
- Custom slots in use: ${d.whitePieceTheme?.customSlotsInUse.length ? d.whitePieceTheme.customSlotsInUse.join(', ') : 'none'}

### Black Pieces
- Type: ${d.blackPieceTheme?.type ?? '—'}
- Builtin set: ${d.blackPieceTheme?.builtinSet ?? '—'}
- Custom slots in use: ${d.blackPieceTheme?.customSlotsInUse.length ? d.blackPieceTheme.customSlotsInUse.join(', ') : 'none'}` : '';

  return `# Chess Unleashed — Active Template Audit

**Generated:** ${d.generatedAt}
**Template Source:** ${d.templateSource}

---

## Template Identity

- Template ID: \`${d.templateId}\`
- Template Name: **${d.templateName}**
- Piece Theme Mode: \`${d.pieceThemeMode}\`

---

## Piece Theme

### ${d.pieceThemeMode === 'team' ? 'Unified (fallback)' : 'Active Piece Set'}
- Type: ${d.pieceTheme.type}
- Builtin set: \`${d.pieceTheme.builtinSet}\`
- Custom slots in use: ${d.pieceTheme.customSlotsInUse.length ? d.pieceTheme.customSlotsInUse.join(', ') : 'none'}
${pieceTeamSection}

---

## Board Colors

- Light squares: \`${d.boardColors.light}\`
- Dark squares: \`${d.boardColors.dark}\`
- Selected: \`${d.boardColors.selected}\`
- Move target: \`${d.boardColors.moveTarget}\`

---

## Background Layer

- Image present: **${bool(d.background.imagePresent)}**
- Color: \`${d.background.color}\`
- Opacity: ${d.background.opacity}
- Repeat: ${d.background.repeat}
- Size: ${d.background.size}
- xOffset: ${px(d.background.xOffset)}
- yOffset: ${px(d.background.yOffset)}
- Scale: ${pct(d.background.scale)}

---

## Board Overlay

- Image present: **${bool(d.boardOverlay.imagePresent)}**
- Opacity: ${d.boardOverlay.opacity}

---

## Frame Layer

- Image present: **${bool(d.frameLayer.imagePresent)}**
- Color: \`${d.frameLayer.color}\`
- Opacity: ${d.frameLayer.opacity}
- Repeat: ${d.frameLayer.repeat}
- Size: ${d.frameLayer.size}
- xOffset: ${px(d.frameLayer.xOffset)}
- yOffset: ${px(d.frameLayer.yOffset)}
- Scale: ${pct(d.frameLayer.scale)}
- Lock to board: ${bool(d.frameLayer.lockToBoard)}
- Frame size mode: \`${d.frameLayer.frameSizeMode ?? 'responsive'}\`
${d.frameLayer.frameSizeMode === 'fixed' ? `- Fixed width: ${px(d.frameLayer.fixedWidth)}\n- Fixed height: ${px(d.frameLayer.fixedHeight)}` : ''}

---

## Layer Upload Limit

- Max file size per layer upload: **${d.layerUploadMaxSizeMB}MB**

---

## Board Responsiveness

**The board is responsive.** Actual rendered pixel size depends on container and window size.

${boardSection}

---

## AI Asset Recommendations (based on active settings)

- **Background:** ${d.assetRecommendations.background}
- **Board Overlay:** ${d.assetRecommendations.boardOverlay}
- **Frame Layer:** ${d.assetRecommendations.frameLayer}
- **Piece Images:** ${d.assetRecommendations.pieces}
- **Animated Overlays:** ${d.assetRecommendations.animatedOverlays}

---

## Known Limitations

${d.knownLimitations.map(l => `- ${l}`).join('\n')}
`;
};

// ─── Guideline Generators ─────────────────────────────────────────────────────

const triggerBlobDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const downloadCanvasAsJpg = (canvas: HTMLCanvasElement, filename: string) => {
  canvas.toBlob(blob => { if (blob) triggerBlobDownload(blob, filename); }, 'image/jpeg', 0.92);
};

const drawBoardGuidelineCanvas = (audit: AuditData): HTMLCanvasElement => {
  const W = 700, H = 700;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#f8f9fa';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#1a1a1a';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Chess Unleashed — Board Guideline', W / 2, 24);

  ctx.font = '11px sans-serif';
  ctx.fillStyle = '#666';
  if (audit.board.measured && audit.board.width) {
    ctx.fillText(`Measured: ${audit.board.width}×${audit.board.height}px  |  Square: ${audit.board.squareSize}px  (runtime, responsive)`, W / 2, 42);
  } else {
    ctx.fillText('Board not measured — open board and regenerate for live dimensions', W / 2, 42);
  }

  const GRID = 544; // 68×8
  const SQ = GRID / 8;
  const ox = (W - GRID) / 2;
  const oy = 62;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? audit.boardColors.light : audit.boardColors.dark;
      ctx.fillRect(ox + c * SQ, oy + r * SQ, SQ, SQ);
    }
  }

  ctx.strokeStyle = '#444';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(ox, oy, GRID, GRID);

  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.lineWidth = 0.5;
  for (let i = 1; i < 8; i++) {
    ctx.beginPath(); ctx.moveTo(ox + i * SQ, oy); ctx.lineTo(ox + i * SQ, oy + GRID); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ox, oy + i * SQ); ctx.lineTo(ox + GRID, oy + i * SQ); ctx.stroke();
  }

  const files = ['a','b','c','d','e','f','g','h'];
  const ranks = ['8','7','6','5','4','3','2','1'];
  ctx.fillStyle = '#333';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  for (let c = 0; c < 8; c++) ctx.fillText(files[c], ox + c * SQ + SQ / 2, oy + GRID + 15);
  ctx.textAlign = 'right';
  for (let r = 0; r < 8; r++) ctx.fillText(ranks[r], ox - 5, oy + r * SQ + SQ / 2 + 4);

  // Square size callout (top-right square)
  ctx.strokeStyle = '#e74c3c';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 2]);
  ctx.strokeRect(ox + 7 * SQ, oy, SQ, SQ);
  ctx.setLineDash([]);
  ctx.fillStyle = '#e74c3c';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(audit.board.measured && audit.board.squareSize ? `${audit.board.squareSize}px` : '?px', ox + 7 * SQ + SQ / 2, oy - 5);

  // Total width span
  const spanY = oy + GRID + 30;
  ctx.strokeStyle = '#2c7be5';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 2]);
  ctx.beginPath(); ctx.moveTo(ox, spanY); ctx.lineTo(ox + GRID, spanY); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#2c7be5';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(audit.board.measured && audit.board.width ? `${audit.board.width}px` : 'varies (responsive)', ox + GRID / 2, spanY + 13);

  // Color legend
  const LY = oy + GRID + 54;
  const LX = [ox, ox + 160, ox + 310, ox + 458];
  const swatches: [string, string][] = [
    ['Light', audit.boardColors.light], ['Dark', audit.boardColors.dark],
    ['Selected', audit.boardColors.selected], ['Move target', audit.boardColors.moveTarget],
  ];
  ctx.font = '10px monospace';
  ctx.textAlign = 'left';
  swatches.forEach(([label, color], i) => {
    ctx.fillStyle = color;
    ctx.fillRect(LX[i], LY - 10, 12, 12);
    ctx.strokeStyle = '#bbb'; ctx.lineWidth = 0.5; ctx.strokeRect(LX[i], LY - 10, 12, 12);
    ctx.fillStyle = '#333';
    ctx.fillText(`${label}: ${color}`, LX[i] + 16, LY);
  });

  ctx.fillStyle = '#aaa';
  ctx.font = '9px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Board overlays: square transparent PNG 1024×1024 or 2048×2048px', W / 2, H - 10);

  return canvas;
};

const drawPieceGuidelineCanvas = (audit: AuditData): HTMLCanvasElement => {
  const SLOTS = ['wk','wq','wr','wb','wn','wp','bk','bq','br','bb','bn','bp'];
  const COLS = 6, ROWS = 2, CELL = 96, PAD = 32, HEADER = 58, FOOTER = 36;
  const W = COLS * CELL + PAD * 2;
  const H = ROWS * CELL + PAD * 2 + HEADER + FOOTER;

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#f8f9fa';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#1a1a1a';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Chess Unleashed — Piece Guideline', W / 2, 22);

  ctx.font = '11px sans-serif';
  ctx.fillStyle = '#666';
  const modeLabel = audit.pieceThemeMode === 'team'
    ? 'Team mode (white/black separate configs)'
    : `Unified mode — builtin set: ${audit.pieceTheme.builtinSet}`;
  ctx.fillText(modeLabel, W / 2, 40);

  const customSlots = new Set([
    ...audit.pieceTheme.customSlotsInUse,
    ...(audit.whitePieceTheme?.customSlotsInUse ?? []),
    ...(audit.blackPieceTheme?.customSlotsInUse ?? []),
  ]);

  SLOTS.forEach((slot, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = PAD + col * CELL;
    const y = HEADER + PAD + row * CELL;

    ctx.fillStyle = slot.startsWith('w') ? '#ffffff' : '#e8e8e8';
    ctx.fillRect(x, y, CELL, CELL);

    // Dashed cell border
    ctx.strokeStyle = customSlots.has(slot) ? '#16a34a' : '#aaa';
    ctx.lineWidth = customSlots.has(slot) ? 2 : 1;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(x + 1, y + 1, CELL - 2, CELL - 2);
    ctx.setLineDash([]);

    // Inner safe zone (8px inset)
    ctx.strokeStyle = 'rgba(44, 123, 229, 0.25)';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([2, 2]);
    ctx.strokeRect(x + 8, y + 8, CELL - 16, CELL - 16);
    ctx.setLineDash([]);

    ctx.fillStyle = '#444';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(slot, x + CELL / 2, y + CELL - 8);

    if (customSlots.has(slot)) {
      ctx.font = '8px sans-serif';
      ctx.fillStyle = '#16a34a';
      ctx.fillText('custom', x + CELL / 2, y + 11);
    }
  });

  // Row side labels
  ctx.font = '10px sans-serif'; ctx.fillStyle = '#888'; ctx.textAlign = 'right';
  ctx.fillText('White', PAD - 6, HEADER + PAD + CELL / 2 + 4);
  ctx.fillText('Black', PAD - 6, HEADER + PAD + CELL + CELL / 2 + 4);

  ctx.fillStyle = '#aaa';
  ctx.font = '9px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Each slot: square transparent PNG 512×512 or 1024×1024px. Dashed = full cell. Blue inset = safe zone. Green = custom image active.', W / 2, H - 10);

  return canvas;
};

const drawFrameGuidelineCanvas = (audit: AuditData): HTMLCanvasElement => {
  const fl = audit.frameLayer;
  const fm = fl.frameSizeMode ?? 'responsive';

  let artW: number, artH: number, note: string;
  if (fm === 'fixed' && fl.fixedWidth && fl.fixedHeight) {
    artW = Math.min(fl.fixedWidth, 1100);
    artH = Math.min(fl.fixedHeight, 800);
    note = `Fixed mode: ${fl.fixedWidth}×${fl.fixedHeight}px`;
  } else if (fm === 'match-board') {
    artW = artH = 640;
    note = audit.board.measured && audit.board.width
      ? `Match-board mode — current board: ~${audit.board.width}×${audit.board.height}px`
      : 'Match-board mode — scales to rendered board size';
  } else {
    artW = artH = 640;
    note = 'Responsive mode — create at 1024×1024px';
  }

  const HEADER = 58, FOOTER = 48;
  const W = artW;
  const H = artH + HEADER + FOOTER;

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#f8f9fa';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#1a1a1a';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Chess Unleashed — Frame / Background Guideline', W / 2, 22);

  ctx.font = '11px sans-serif';
  ctx.fillStyle = '#555';
  ctx.fillText(note, W / 2, 40);

  // Checkered transparency pattern
  const CS = 14;
  for (let cx = 0; cx < W; cx += CS) {
    for (let cy = HEADER; cy < HEADER + artH; cy += CS) {
      ctx.fillStyle = ((cx / CS) + ((cy - HEADER) / CS)) % 2 === 0 ? '#d8d8d8' : '#bdbdbd';
      ctx.fillRect(cx, cy, Math.min(CS, W - cx), Math.min(CS, HEADER + artH - cy));
    }
  }

  // Frame boundary
  ctx.strokeStyle = '#e74c3c';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(2, HEADER + 1, W - 4, artH - 3);
  ctx.setLineDash([]);

  // Center crosshair
  ctx.strokeStyle = 'rgba(44, 123, 229, 0.35)';
  ctx.lineWidth = 0.5;
  ctx.setLineDash([4, 3]);
  ctx.beginPath(); ctx.moveTo(W / 2, HEADER); ctx.lineTo(W / 2, HEADER + artH); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, HEADER + artH / 2); ctx.lineTo(W, HEADER + artH / 2); ctx.stroke();
  ctx.setLineDash([]);

  // Width annotation (bottom)
  const wLabel = fm === 'fixed' && fl.fixedWidth ? `${fl.fixedWidth}px` : `~${artW}px`;
  ctx.strokeStyle = '#e74c3c';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 2]);
  ctx.beginPath(); ctx.moveTo(2, HEADER + artH + 14); ctx.lineTo(W - 2, HEADER + artH + 14); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#e74c3c';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(wLabel, W / 2, HEADER + artH + 27);

  // Height annotation (right)
  const hLabel = fm === 'fixed' && fl.fixedHeight ? `${fl.fixedHeight}px` : `~${artH}px`;
  ctx.fillStyle = '#e74c3c';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(hLabel, W - 6, HEADER + 18);

  // Footer info
  ctx.fillStyle = '#888';
  ctx.font = '9px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`frameSizeMode: ${fm}  |  color: ${fl.color}  |  opacity: ${fl.opacity}  |  transparent regions shown as checkered`, W / 2, H - 10);

  return canvas;
};

// ─── Component ────────────────────────────────────────────────────────────────

interface ActiveTemplateAuditViewProps {
  closeOverlay?: () => void;
}

const section = (title: string, children: React.ReactNode) => (
  <div style={{ marginBottom: 20 }}>
    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#2c3e50', borderBottom: '1px solid #e1e4e8', paddingBottom: 4, marginBottom: 8 }}>
      {title}
    </div>
    {children}
  </div>
);

const row = (label: string, value: React.ReactNode) => (
  <div style={{ display: 'flex', gap: 8, marginBottom: 3, fontSize: '0.82rem' }}>
    <span style={{ color: '#666', minWidth: 180, flexShrink: 0 }}>{label}</span>
    <span style={{ color: '#1e1e1e', fontFamily: 'monospace', wordBreak: 'break-all' }}>{value}</span>
  </div>
);

const chip = (text: string, color = '#2c3e50', bg = '#f0f0f0') => (
  <span style={{ display: 'inline-block', padding: '1px 7px', borderRadius: 10, background: bg, color, fontSize: '0.75rem', fontWeight: 600, fontFamily: 'monospace' }}>
    {text}
  </span>
);

const ActiveTemplateAuditView: React.FC<ActiveTemplateAuditViewProps> = () => {
  const { settings } = useSettings();
  const [audit, setAudit] = useState<AuditData | null>(null);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

  const activeTemplate = settings.themeDraft ?? settings.template;
  const templateSource = settings.themeDraft ? 'Draft (unsaved edits in Theme Editor)' : 'Applied template';

  const generate = () => setAudit(buildAuditData(activeTemplate, templateSource));

  useEffect(() => { generate(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const downloadMd = () => {
    if (!audit) return;
    const md = generateMarkdown(audit);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chess-unleashed-active-template-audit.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadJson = () => {
    if (!audit) return;
    const blob = new Blob([JSON.stringify(audit, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chess-unleashed-active-template-audit.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyReport = async () => {
    if (!audit) return;
    const md = generateMarkdown(audit);
    try {
      await navigator.clipboard.writeText(md);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = md;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopyStatus('copied');
    setTimeout(() => setCopyStatus('idle'), 2000);
  };

  if (!audit) return null;

  const t = activeTemplate;
  const fl = audit.frameLayer;
  const bg = audit.background;

  return (
    <div className="cu-themed-embedded-view cu-active-template-audit-view" style={{ padding: '24px', maxWidth: 700, fontFamily: 'sans-serif', color: '#2c3e50' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Active Template Audit</h2>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#f0f6ff', border: '1px solid #b6d4fe', color: '#1d4ed8' }}>
          Read-only Report
        </span>
      </div>
      <p style={{ margin: '0 0 8px', fontSize: '0.83rem', color: '#555' }}>
        Current active visual/layer settings for the live template. Use this as context for AI asset generation.
      </p>
      <p style={{ margin: '0 0 18px', fontSize: '0.79rem', color: '#888' }}>
        Source: <strong>{audit.templateSource}</strong> — generated {new Date(audit.generatedAt).toLocaleTimeString()}
      </p>

      {/* Download / Copy toolbar */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24, padding: '12px 14px', background: '#f6f8fa', border: '1px solid #d0d7de', borderRadius: 8 }}>
        <button onClick={downloadMd} style={{ padding: '7px 14px', borderRadius: 6, border: 'none', background: '#2c7be5', color: '#fff', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>
          ⬇ Download Active Template Report (.md)
        </button>
        <button onClick={downloadJson} style={{ padding: '7px 14px', borderRadius: 6, border: '1px solid #d0d7de', background: '#fff', color: '#2c3e50', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}>
          ⬇ Download Audit JSON
        </button>
        <button onClick={copyReport} style={{ padding: '7px 14px', borderRadius: 6, border: '1px solid #d0d7de', background: copyStatus === 'copied' ? '#d1fae5' : '#fff', color: copyStatus === 'copied' ? '#065f46' : '#2c3e50', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', transition: 'background 0.15s' }}>
          {copyStatus === 'copied' ? '✓ Copied!' : '⎘ Copy Report'}
        </button>
        <button onClick={generate} style={{ padding: '7px 14px', borderRadius: 6, border: '1px solid #d0d7de', background: '#fff', color: '#2c3e50', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}>
          ↺ Regenerate
        </button>
        <div style={{ width: '100%', borderTop: '1px solid #e0e0e0', margin: '6px 0 2px' }} />
        <span style={{ fontSize: '0.77rem', color: '#888', alignSelf: 'center' }}>Guideline JPGs:</span>
        <button onClick={() => downloadCanvasAsJpg(drawBoardGuidelineCanvas(audit), 'board-guideline.jpg')} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #d0d7de', background: '#fff', color: '#2c3e50', fontWeight: 600, fontSize: '0.79rem', cursor: 'pointer' }}>
          ⬇ Board
        </button>
        <button onClick={() => downloadCanvasAsJpg(drawPieceGuidelineCanvas(audit), 'piece-guideline.jpg')} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #d0d7de', background: '#fff', color: '#2c3e50', fontWeight: 600, fontSize: '0.79rem', cursor: 'pointer' }}>
          ⬇ Pieces
        </button>
        <button onClick={() => downloadCanvasAsJpg(drawFrameGuidelineCanvas(audit), 'frame-guideline.jpg')} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #d0d7de', background: '#fff', color: '#2c3e50', fontWeight: 600, fontSize: '0.79rem', cursor: 'pointer' }}>
          ⬇ Frame / Background
        </button>
      </div>

      {/* Template Identity */}
      {section('Template Identity', <>
        {row('Template ID', chip(audit.templateId))}
        {row('Template Name', <strong>{audit.templateName}</strong>)}
        {row('Piece Theme Mode', chip(audit.pieceThemeMode))}
      </>)}

      {/* Piece Theme */}
      {section('Piece Theme', <>
        {audit.pieceThemeMode === 'team' ? (
          <>
            <div style={{ fontSize: '0.8rem', color: '#555', marginBottom: 6 }}>Team mode — white and black use separate configurations.</div>
            <div style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: 4 }}>White Pieces</div>
            {row('Type', chip(audit.whitePieceTheme?.type ?? '—'))}
            {row('Builtin set', chip(audit.whitePieceTheme?.builtinSet ?? '—'))}
            {row('Custom slots in use', audit.whitePieceTheme?.customSlotsInUse.length ? audit.whitePieceTheme.customSlotsInUse.join(', ') : 'none')}
            <div style={{ fontWeight: 600, fontSize: '0.8rem', margin: '8px 0 4px' }}>Black Pieces</div>
            {row('Type', chip(audit.blackPieceTheme?.type ?? '—'))}
            {row('Builtin set', chip(audit.blackPieceTheme?.builtinSet ?? '—'))}
            {row('Custom slots in use', audit.blackPieceTheme?.customSlotsInUse.length ? audit.blackPieceTheme.customSlotsInUse.join(', ') : 'none')}
          </>
        ) : (
          <>
            {row('Type', chip(audit.pieceTheme.type))}
            {row('Builtin set', chip(audit.pieceTheme.builtinSet))}
            {row('Custom slots in use', audit.pieceTheme.customSlotsInUse.length ? audit.pieceTheme.customSlotsInUse.join(', ') : 'none')}
          </>
        )}
      </>)}

      {/* Board Colors */}
      {section('Board Colors', <>
        {(['light', 'dark', 'selected', 'moveTarget'] as const).map(k => (
          <div key={k} style={{ display: 'flex', gap: 8, marginBottom: 3, fontSize: '0.82rem', alignItems: 'center' }}>
            <span style={{ color: '#666', minWidth: 180, flexShrink: 0 }}>{k}</span>
            <span style={{ width: 16, height: 16, borderRadius: 3, background: t.boardColors[k], border: '1px solid #ccc', flexShrink: 0 }} />
            <span style={{ fontFamily: 'monospace', color: '#1e1e1e' }}>{t.boardColors[k]}</span>
          </div>
        ))}
      </>)}

      {/* Background */}
      {section('Background Layer', <>
        {row('Image present', bg.imagePresent ? chip('Yes', '#065f46', '#d1fae5') : chip('No', '#666', '#f0f0f0'))}
        {row('Color', <><span style={{ width: 14, height: 14, borderRadius: 2, background: bg.color, border: '1px solid #ccc', display: 'inline-block', marginRight: 6, verticalAlign: 'middle' }} />{bg.color}</>)}
        {row('Opacity', String(bg.opacity))}
        {row('Repeat', bg.repeat)}
        {row('Size', bg.size)}
        {row('xOffset', px(bg.xOffset))}
        {row('yOffset', px(bg.yOffset))}
        {row('Scale', pct(bg.scale))}
      </>)}

      {/* Board Overlay */}
      {section('Board Overlay', <>
        {row('Image present', audit.boardOverlay.imagePresent ? chip('Yes', '#065f46', '#d1fae5') : chip('No', '#666', '#f0f0f0'))}
        {row('Opacity', String(audit.boardOverlay.opacity))}
      </>)}

      {/* Frame Layer */}
      {section('Frame Layer', <>
        {row('Image present', fl.imagePresent ? chip('Yes', '#065f46', '#d1fae5') : chip('No', '#666', '#f0f0f0'))}
        {row('Color', <><span style={{ width: 14, height: 14, borderRadius: 2, background: fl.color, border: '1px solid #ccc', display: 'inline-block', marginRight: 6, verticalAlign: 'middle' }} />{fl.color}</>)}
        {row('Opacity', String(fl.opacity))}
        {row('Repeat', fl.repeat)}
        {row('Size', fl.size)}
        {row('xOffset', px(fl.xOffset))}
        {row('yOffset', px(fl.yOffset))}
        {row('Scale', pct(fl.scale))}
        {row('Lock to board', fl.lockToBoard ? 'Yes' : 'No')}
        {row('Frame size mode', chip(fl.frameSizeMode ?? 'responsive'))}
        {fl.frameSizeMode === 'fixed' && row('Fixed width', px(fl.fixedWidth))}
        {fl.frameSizeMode === 'fixed' && row('Fixed height', px(fl.fixedHeight))}
      </>)}

      {/* Layer Upload Limit */}
      {section('Layer Upload Limit', <>
        {row('Max size per upload', `${audit.layerUploadMaxSizeMB}MB`)}
      </>)}

      {/* Board Runtime */}
      {section('Board Responsiveness', <>
        <div style={{ fontSize: '0.81rem', color: '#444', marginBottom: 6, padding: '8px 10px', background: '#fffbea', border: '1px solid #f5d87a', borderRadius: 5 }}>
          The board is responsive. Actual rendered pixel size depends on the container and window size.
        </div>
        {audit.board.measured ? (
          <>
            {row('Current rendered width', <><strong>{audit.board.width}px</strong> <span style={{ color: '#888', fontSize: '0.76rem' }}>runtime-measured</span></>)}
            {row('Current rendered height', <><strong>{audit.board.height}px</strong> <span style={{ color: '#888', fontSize: '0.76rem' }}>runtime-measured</span></>)}
            {row('Square size (width ÷ 8)', <><strong>{audit.board.squareSize}px</strong> <span style={{ color: '#888', fontSize: '0.76rem' }}>runtime-measured</span></>)}
            <div style={{ fontSize: '0.77rem', color: '#888', marginTop: 4 }}>{audit.board.note}</div>
          </>
        ) : (
          <div style={{ fontSize: '0.81rem', color: '#888' }}>{audit.board.note}</div>
        )}
      </>)}

      {/* Asset Recommendations */}
      {section('AI Asset Recommendations', <>
        <div style={{ fontSize: '0.79rem', color: '#555', marginBottom: 8 }}>
          Based on the active template settings above.
        </div>
        {(['background', 'boardOverlay', 'frameLayer', 'pieces', 'animatedOverlays'] as const).map(key => {
          const labels: Record<string, string> = {
            background: 'Background', boardOverlay: 'Board Overlay',
            frameLayer: 'Frame Layer', pieces: 'Piece Images', animatedOverlays: 'Animated Overlays'
          };
          return (
            <div key={key} style={{ marginBottom: 8, padding: '8px 10px', background: '#f6f8fa', border: '1px solid #d0d7de', borderRadius: 5 }}>
              <div style={{ fontWeight: 700, fontSize: '0.79rem', marginBottom: 3 }}>{labels[key]}</div>
              <div style={{ fontSize: '0.79rem', color: '#444', lineHeight: 1.5 }}>{audit.assetRecommendations[key]}</div>
            </div>
          );
        })}
      </>)}

      {/* Known Limitations */}
      {section('Known Limitations', <>
        {audit.knownLimitations.map((l, i) => (
          <div key={i} style={{ fontSize: '0.8rem', color: '#666', marginBottom: 3 }}>• {l}</div>
        ))}
      </>)}

    </div>
  );
};

export default ActiveTemplateAuditView;
