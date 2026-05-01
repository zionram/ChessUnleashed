import React, { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useGame } from '../context/GameContext';
import { type PieceThemeConfig } from '../templates';
import { SettingsFieldRenderer } from '../components/settings/SettingsFieldRenderer';
import { getRegisteredSettingsField } from '../registry/SettingsRegistry';

type PieceSidePrefix = 'w' | 'b';
type BulkApplyTarget = 'white' | 'black' | 'both';
type BulkImportFile = { name: string; dataUrl: string };

const BULK_APPLY_TARGETS: Array<{ id: BulkApplyTarget; label: string; prefixes: PieceSidePrefix[] }> = [
  { id: 'white', label: 'Apply to White', prefixes: ['w'] },
  { id: 'black', label: 'Apply to Black', prefixes: ['b'] },
  { id: 'both', label: 'Apply to Both', prefixes: ['w', 'b'] }
];

const ThemeEditorView: React.FC = () => {
  const { settings, updateTemplate, updateThemeDraft, setThemeDraft, setThemeEditorMode } = useSettings();
  const { multiplayer, syncTheme } = useGame();
  const { template: liveTemplate, themeDraft: draft } = settings;
  const [editTarget, setEditTarget] = useState<'unified' | 'white' | 'black'>('unified');
  const [bulkImportFiles, setBulkImportFiles] = useState<BulkImportFile[]>([]);
  const [bulkImportAssignments, setBulkImportAssignments] = useState<Record<string, string>>({});
  const [bulkExtraStyleAssignments, setBulkExtraStyleAssignments] = useState<Record<string, string>>({});
  const [bulkExtraStyleRules, setBulkExtraStyleRules] = useState<Record<string, { operator: '>' | '<' | '='; threshold: number }>>({});
  const [bulkAutoAssignedFiles, setBulkAutoAssignedFiles] = useState<string[]>([]);
  const [activeVariantPiece, setActiveVariantPiece] = useState<string | null>(null);
  const [bulkApplyTarget, setBulkApplyTarget] = useState<BulkApplyTarget>('both');
  const [isBulkDropActive, setIsBulkDropActive] = useState(false);

  // Ensure draft exists when editor is mounted
  useEffect(() => {
    if (!draft) {
      setThemeDraft(JSON.parse(JSON.stringify(liveTemplate)));
    }
  }, [draft, liveTemplate]);

  const getActiveConfig = (): PieceThemeConfig | null => {
    if (!draft) return null;
    if (draft.pieceThemeMode === 'unified') return draft.pieceTheme;
    return editTarget === 'white' ? (draft.whitePieceTheme || draft.pieceTheme) : (draft.blackPieceTheme || draft.pieceTheme);
  };

  const updateActiveConfig = (updates: Partial<PieceThemeConfig>) => {
    if (!draft) return;
    const key = draft.pieceThemeMode === 'unified' ? 'pieceTheme' : (editTarget === 'white' ? 'whitePieceTheme' : 'blackPieceTheme');
    const current = getActiveConfig();
    if (current) {
        updateThemeDraft({ [key]: { ...current, ...updates } });
    }
  };

  useEffect(() => {
    const handlePieceSelect = (e: any) => {
      if (e.detail) {
        const slot = e.detail;
        if (draft?.pieceThemeMode === 'team') setEditTarget(slot.startsWith('w') ? 'white' : 'black');
        
        const piece = Object.entries(BULK_PIECE_SLOT_MAP).find(([, slotKey]) => slot.endsWith(slotKey))?.[0];
        if (piece) document.getElementById(`bulk-piece-slot-input-${piece}`)?.click();
      }
    };
    window.addEventListener('chess-piece-selected', handlePieceSelect);
    return () => window.removeEventListener('chess-piece-selected', handlePieceSelect);
  }, [draft?.pieceThemeMode, editTarget]);

  if (!draft) return <div style={{ padding: '20px' }}>Initializing draft...</div>;

  const hasChanges = JSON.stringify(draft) !== JSON.stringify(liveTemplate);

  const BULK_PIECE_MATCHERS: Array<{ piece: string; tokens: string[] }> = [
    { piece: 'pawn', tokens: ['pawn', '_p', '-p', ' p ', '(p)', '[p]'] },
    { piece: 'rook', tokens: ['rook', 'castle', '_r', '-r', ' r ', '(r)', '[r]'] },
    { piece: 'knight', tokens: ['knight', 'horse', '_n', '-n', ' n ', '(n)', '[n]'] },
    { piece: 'bishop', tokens: ['bishop', '_b', '-b', ' b ', '(b)', '[b]'] },
    { piece: 'queen', tokens: ['queen', '_q', '-q', ' q ', '(q)', '[q]'] },
    { piece: 'king', tokens: ['king', '_k', '-k', ' k ', '(k)', '[k]'] }
  ];
  const BULK_PIECE_SLOT_MAP: Record<string, string> = {
    pawn: 'p',
    rook: 'r',
    knight: 'n',
    bishop: 'b',
    queen: 'q',
    king: 'k'
  };
  const getBulkMatchedPiece = (fileName: string, allowClaimedPiece = true, claimedPieces?: Set<string>) => {
    const normalized = ` ${fileName.toLowerCase().replace(/\.[^.]+$/, '').replace(/[^a-z0-9]+/g, ' ')} `;
    return BULK_PIECE_MATCHERS.find(({ piece, tokens }) =>
      (allowClaimedPiece || !claimedPieces?.has(piece)) && tokens.some(token => normalized.includes(token))
    )?.piece;
  };

  const activeConfig = getActiveConfig();
  if (!activeConfig) return null;
  const stagedBulkAssignments = bulkImportFiles.flatMap(file => {
    const piece = bulkImportAssignments[file.name];
    return piece ? [{ piece, file }] : [];
  });
  const bulkAssignmentPreview = BULK_PIECE_MATCHERS.map(({ piece }) => {
    const match = stagedBulkAssignments.find(entry => entry.piece === piece);
    return { piece, file: match?.file ?? null };
  });
  const unassignedBulkFiles = bulkImportFiles.filter(file => !bulkImportAssignments[file.name]);
  const availableExtraStyleFiles = unassignedBulkFiles.filter(file => !bulkExtraStyleAssignments[file.name]);
  const stagedVariantCandidates = unassignedBulkFiles.flatMap(file => {
    const piece = bulkExtraStyleAssignments[file.name];
    const rule = bulkExtraStyleRules[file.name] ?? { operator: '=' as const, threshold: 1 };
    return piece ? [{ file, piece, operator: rule.operator, threshold: rule.threshold }] : [];
  });
  const selectedBulkApplyTarget = BULK_APPLY_TARGETS.find(target => target.id === bulkApplyTarget) ?? BULK_APPLY_TARGETS[2];
  const hasBulkApplyChanges = stagedBulkAssignments.length > 0 || stagedVariantCandidates.some(({ piece }) => Boolean(piece));
  const builtInSetConfig = getRegisteredSettingsField('pieces.builtinSet');

  const builtInSetField = {
    key: builtInSetConfig?.id ?? 'piece-theme-builtin-set',
    type: builtInSetConfig?.type ?? 'select',
    label: builtInSetConfig?.label ?? 'Built-in Set',
    value: activeConfig.builtinSet,
    onChange: (value: string | number | boolean) => updateActiveConfig({ type: 'builtin', builtinSet: String(value) }),
    options: builtInSetConfig?.options ?? ['cburnett', 'alpha', 'merida', 'fresca', 'caliente'].map(s => ({ label: s.toUpperCase(), value: s }))
  };

  const saveUnifiedSet = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(activeConfig, null, 2));
    const link = document.createElement('a');
    link.setAttribute("href", dataStr);
    link.setAttribute("download", `unified_piece_set.json`);
    link.click();
  };

  const loadUnifiedSet = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        updateThemeDraft({ pieceThemeMode: 'unified', pieceTheme: json });
        setEditTarget('unified');
      } catch (err) { alert("Invalid set file."); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const loadBulkImportFiles = (files: FileList | File[], assignedPiece?: string) => {
    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    Promise.all(
      imageFiles.map(file => new Promise<BulkImportFile>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve({ name: file.name, dataUrl: event.target?.result as string });
        reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
        reader.readAsDataURL(file);
      }))
    )
      .then(nextFiles => {
        setBulkImportFiles(current => [...current, ...nextFiles]);
        if (assignedPiece) {
          setBulkImportAssignments(current => {
            const nextAssignments = { ...current };

            Object.keys(nextAssignments).forEach(fileName => {
              if (nextAssignments[fileName] === assignedPiece) delete nextAssignments[fileName];
            });
            nextFiles.forEach((file, index) => {
              if (index === 0) nextAssignments[file.name] = assignedPiece;
              else delete nextAssignments[file.name];
            });

            return nextAssignments;
          });
          setBulkExtraStyleAssignments(current => {
            const nextAssignments = { ...current };
            nextFiles.forEach((file, index) => {
              if (index > 0) nextAssignments[file.name] = assignedPiece;
              else delete nextAssignments[file.name];
            });
            return nextAssignments;
          });
        }
      })
      .catch(() => alert('Failed to load bulk import images.'));
  };

  const loadBulkVariantFiles = (files: FileList | File[], piece: string) => {
    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    Promise.all(
      imageFiles.map(file => new Promise<BulkImportFile>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve({ name: file.name, dataUrl: event.target?.result as string });
        reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
        reader.readAsDataURL(file);
      }))
    )
      .then(nextFiles => {
        setBulkImportFiles(current => [...current, ...nextFiles]);
        setBulkExtraStyleAssignments(current => {
          const nextAssignments = { ...current };
          nextFiles.forEach(file => {
            nextAssignments[file.name] = piece;
          });
          return nextAssignments;
        });
      })
      .catch(() => alert('Failed to load extra style images.'));
  };

  const autoAssignBulkImages = () => {
    const manualAssignments = Object.fromEntries(
      Object.entries(bulkImportAssignments).filter(([fileName]) => !bulkAutoAssignedFiles.includes(fileName))
    );
    const nextAssignments: Record<string, string> = { ...manualAssignments };
    const claimedPieces = new Set(Object.values(manualAssignments));
    const openPieces = BULK_PIECE_MATCHERS.map(({ piece }) => piece).filter(piece => !claimedPieces.has(piece));
    const autoFiles = bulkImportFiles.filter(file => !manualAssignments[file.name]);
    const shuffledAutoFiles = [...autoFiles].sort(() => Math.random() - 0.5);
    const assignedAutoFiles: string[] = [];

    shuffledAutoFiles.forEach(file => {
      if (openPieces.length === 0) return;

      const matchedPiece = getBulkMatchedPiece(file.name, false, claimedPieces);
      const nextPiece = matchedPiece && openPieces.includes(matchedPiece)
        ? matchedPiece
        : openPieces[0];

      nextAssignments[file.name] = nextPiece;
      assignedAutoFiles.push(file.name);
      claimedPieces.add(nextPiece);
      openPieces.splice(openPieces.indexOf(nextPiece), 1);
    });

    setBulkImportAssignments(nextAssignments);
    setBulkAutoAssignedFiles(assignedAutoFiles);
  };

  const handleBulkImportInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) loadBulkImportFiles(e.target.files);
    e.target.value = '';
  };

  const handleBulkDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsBulkDropActive(false);
    if (e.dataTransfer.files?.length) loadBulkImportFiles(e.dataTransfer.files);
  };

  const updateBulkImportAssignment = (fileName: string, nextPiece: string) => {
    setBulkImportAssignments(current => {
      const nextAssignments = { ...current };

      Object.keys(nextAssignments).forEach(existingFileName => {
        if (existingFileName !== fileName && nextAssignments[existingFileName] === nextPiece) {
          delete nextAssignments[existingFileName];
        }
      });

      if (!nextPiece) {
        delete nextAssignments[fileName];
      } else {
        nextAssignments[fileName] = nextPiece;
      }

      return nextAssignments;
    });

    if (nextPiece) {
      setBulkAutoAssignedFiles(current => current.filter(name => name !== fileName));
      setBulkExtraStyleAssignments(current => {
        const nextAssignments = { ...current };
        delete nextAssignments[fileName];
        return nextAssignments;
      });
    }
  };

  const updateBulkExtraStyleAssignment = (fileName: string, nextPiece: string) => {
    setBulkExtraStyleAssignments(current => {
      const nextAssignments = { ...current };

      if (!nextPiece) delete nextAssignments[fileName];
      else nextAssignments[fileName] = nextPiece;

      return nextAssignments;
    });
  };

  const updateBulkExtraStyleRule = (fileName: string, updates: Partial<{ operator: '>' | '<' | '='; threshold: number }>) => {
    setBulkExtraStyleRules(current => ({
      ...current,
      [fileName]: {
        operator: current[fileName]?.operator ?? '=',
        threshold: current[fileName]?.threshold ?? 1,
        ...updates
      }
    }));
  };

  const clearBulkBaseAssignment = (fileName: string) => {
    setBulkImportAssignments(current => {
      const nextAssignments = { ...current };
      delete nextAssignments[fileName];
      return nextAssignments;
    });
    setBulkAutoAssignedFiles(current => current.filter(name => name !== fileName));
  };

  const clearStagedBulkImport = () => {
    setBulkImportFiles([]);
    setBulkImportAssignments({});
    setBulkExtraStyleAssignments({});
    setBulkExtraStyleRules({});
    setBulkAutoAssignedFiles([]);
    setActiveVariantPiece(null);
    setIsBulkDropActive(false);
  };

  const resetUnappliedPieceChanges = () => {
    setThemeDraft(JSON.parse(JSON.stringify(liveTemplate)));
    setEditTarget('unified');
    clearStagedBulkImport();
  };

  const handleBulkPieceDrop = (e: React.DragEvent<HTMLDivElement>, piece: string) => {
    e.preventDefault();
    if (e.dataTransfer.files?.length) loadBulkImportFiles(e.dataTransfer.files, piece);
  };

  const applyBulkAssignment = () => {
    if (!hasBulkApplyChanges) return;

    const applyStagedImagesToConfig = (config: PieceThemeConfig, prefixes: PieceSidePrefix[]) => {
      const nextCustomPieces = { ...config.customPieces };
      const nextCustomVariants = { ...(config.customVariants || {}) };

      prefixes.forEach(prefix => {
        stagedBulkAssignments.forEach(({ piece, file }) => {
          const slotKey = BULK_PIECE_SLOT_MAP[piece];
          if (!slotKey) return;

          nextCustomPieces[`${prefix}${slotKey}`] = file.dataUrl;
        });

        stagedVariantCandidates.forEach(({ file, piece, operator, threshold }) => {
          if (!piece) return;

          const slotKey = BULK_PIECE_SLOT_MAP[piece];
          if (!slotKey) return;

          const targetSlot = `${prefix}${slotKey}`;
          const currentVariants = nextCustomVariants[targetSlot] || [];
          nextCustomVariants[targetSlot] = [
            ...currentVariants,
            {
              threshold,
              operator,
              image: file.dataUrl
            }
          ];
        });
      });

      return {
        ...config,
        type: 'custom' as const,
        customPieces: nextCustomPieces,
        customVariants: nextCustomVariants
      };
    };

    const buildTargetConfig = (prefix: PieceSidePrefix) => {
      const currentConfig = prefix === 'w'
        ? (draft.whitePieceTheme || draft.pieceTheme)
        : (draft.blackPieceTheme || draft.pieceTheme);
      return applyStagedImagesToConfig(currentConfig, [prefix]);
    };

    const targetUpdates: Partial<typeof draft> = {
      pieceThemeMode: bulkApplyTarget === 'both' ? 'unified' : 'team'
    };

    if (bulkApplyTarget === 'both') {
      targetUpdates.pieceTheme = applyStagedImagesToConfig(draft.pieceTheme, ['w', 'b']);
    }

    selectedBulkApplyTarget.prefixes.forEach(prefix => {
      const key = prefix === 'w' ? 'whitePieceTheme' : 'blackPieceTheme';
      targetUpdates[key] = buildTargetConfig(prefix);
    });

    updateThemeDraft(targetUpdates);
    setBulkImportFiles([]);
    setBulkImportAssignments({});
    setBulkExtraStyleAssignments({});
    setBulkExtraStyleRules({});
    setBulkAutoAssignedFiles([]);
    setActiveVariantPiece(null);
    setIsBulkDropActive(false);
  };

  return (
    <div className="view-container theme-editor-workspace" style={{ padding: '15px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '15px' }}>
        <button onClick={() => { if (window.confirm("Exit?")) { setThemeDraft(null); setThemeEditorMode(false); } }} style={{ fontSize: '0.7rem', padding: '4px 10px', cursor: 'pointer' }}>Exit</button>
      </div>

      <button onClick={() => { updateTemplate(draft); if (multiplayer.isConnected) syncTheme(draft); }} disabled={!hasChanges} style={{ width: '100%', padding: '10px', background: hasChanges ? '#4caf50' : '#ccc', color: 'white', border: 'none', borderRadius: '4px', cursor: hasChanges ? 'pointer' : 'not-allowed', fontWeight: 'bold', marginBottom: '15px' }}>Apply to Game</button>
      <button
        onClick={resetUnappliedPieceChanges}
        disabled={!hasChanges && bulkImportFiles.length === 0}
        style={{ width: '100%', padding: '8px', background: '#f8f9fa', border: '1px solid #ddd', borderRadius: '4px', cursor: hasChanges || bulkImportFiles.length > 0 ? 'pointer' : 'not-allowed', marginBottom: '15px' }}
      >
        Reset Unapplied Changes
      </button>

      <section style={{ marginBottom: '15px', padding: '12px', border: '1px solid #d7e0e7', borderRadius: '8px', background: '#fff' }}>
        <h4 style={{ margin: '0 0 8px 0' }}>Piece Set</h4>
        <div style={{ fontSize: '0.72rem', color: '#5d6d7e', marginBottom: '12px' }}>
          Choose a built-in set, import a saved set, or override individual pieces with your own images. Changes stay in the draft until you apply them to the game.
        </div>
        <SettingsFieldRenderer
          key={builtInSetField.key}
          fieldKey={builtInSetField.key}
          type={builtInSetField.type}
          label="Choose Built-in Pieces"
          value={builtInSetField.value}
          onChange={builtInSetField.onChange}
          options={builtInSetField.options}
        />
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
          <button
            onClick={() => document.getElementById('set-load-in')?.click()}
            style={{ flex: '1 1 140px', padding: '10px', background: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Import Piece Set
          </button>
          <button
            onClick={saveUnifiedSet}
            style={{ flex: '1 1 140px', padding: '10px', background: '#f8f9fa', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Save Piece Set
          </button>
        </div>
        <input id="set-load-in" type="file" accept=".json" onChange={loadUnifiedSet} style={{ display: 'none' }} />
      </section>

      <section style={{ marginBottom: '15px', padding: '12px', border: `1px dashed ${isBulkDropActive ? '#3498db' : '#ccd6dd'}`, borderRadius: '8px', background: isBulkDropActive ? 'rgba(52, 152, 219, 0.08)' : '#fafbfc' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
          <h4 style={{ margin: 0 }}>Import Custom Images</h4>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: '100%' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.7rem', color: '#5d6d7e', flex: '1 1 150px', minWidth: '140px' }}>
              Target
              <select
                value={bulkApplyTarget}
                onChange={(e) => setBulkApplyTarget(e.target.value as BulkApplyTarget)}
                style={{ fontSize: '0.75rem', padding: '5px 6px', minWidth: 0, flex: 1 }}
              >
                {BULK_APPLY_TARGETS.map(target => (
                  <option key={target.id} value={target.id}>{target.label}</option>
                ))}
              </select>
            </label>
            <button
              onClick={autoAssignBulkImages}
              disabled={bulkImportFiles.length === 0}
              style={{ fontSize: '0.75rem', padding: '6px 10px', cursor: bulkImportFiles.length > 0 ? 'pointer' : 'not-allowed' }}
            >
              Auto Assign
            </button>
            <button
              onClick={applyBulkAssignment}
              disabled={!hasBulkApplyChanges}
              style={{ fontSize: '0.75rem', padding: '6px 10px', cursor: hasBulkApplyChanges ? 'pointer' : 'not-allowed' }}
            >
              Add to Draft
            </button>
            <button
              onClick={clearStagedBulkImport}
              disabled={bulkImportFiles.length === 0}
              style={{ fontSize: '0.75rem', padding: '6px 10px', cursor: bulkImportFiles.length > 0 ? 'pointer' : 'not-allowed' }}
            >
              Clear Staged
            </button>
            <button
              onClick={() => document.getElementById('bulk-piece-import-input')?.click()}
              style={{ fontSize: '0.75rem', padding: '6px 10px', cursor: 'pointer' }}
            >
              Choose Images
            </button>
          </div>
          <input id="bulk-piece-import-input" type="file" accept="image/*" multiple onChange={handleBulkImportInput} style={{ display: 'none' }} />
        </div>
        <div style={{ fontSize: '0.72rem', color: '#5d6d7e', marginBottom: '8px' }}>
          Stage multiple piece images here, review the base assignments and extra style images, then add them to the selected side in the draft.
        </div>
        <div
          onDragEnter={(e) => { e.preventDefault(); setIsBulkDropActive(true); }}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={(e) => {
            e.preventDefault();
            if (e.currentTarget === e.target) setIsBulkDropActive(false);
          }}
          onDrop={handleBulkDrop}
          style={{
            minHeight: '72px',
            padding: '10px',
            borderRadius: '6px',
            background: '#fff',
            border: `1px solid ${isBulkDropActive ? '#3498db' : '#e3e8ee'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center'
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#5d6d7e' }}>
            Drop 5-12 piece images here, or use Choose Images.
          </div>
        </div>
        {bulkImportFiles.length === 0 && (
          <div style={{ marginTop: '10px', fontSize: '0.72rem', color: '#8a94a6' }}>
            No staged images yet. Nothing will change in the current piece set until you add staged images to the draft.
          </div>
        )}
        {bulkImportFiles.length > 0 && (
          <>
            <div style={{ marginTop: '10px', fontSize: '0.75rem', fontWeight: 600, color: '#2c3e50' }}>
              Base Piece Assignment Preview
            </div>
            <div style={{ marginTop: '4px', fontSize: '0.7rem', color: '#5d6d7e' }}>
              Click Auto Assign or choose piece slots manually. Assigned images become the main piece images in the draft.
            </div>
            <div style={{ marginTop: '8px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(118px, 1fr))', gap: '8px' }}>
              {bulkAssignmentPreview.map(entry => (
                <div
                  key={entry.piece}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleBulkPieceDrop(e, entry.piece)}
                  style={{ border: '1px solid #e3e8ee', borderRadius: '6px', padding: '6px', background: '#fff' }}
                  title={`Drop an image here to assign it to ${entry.piece}`}
                >
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#2c3e50', marginBottom: '6px', textTransform: 'capitalize' }}>
                    {entry.piece}
                  </div>
                  <div style={{ height: '54px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '6px', overflow: 'hidden', background: '#f5f7fa', borderRadius: '4px' }}>
                    {entry.file ? (
                      <img src={entry.file.dataUrl} alt={entry.file.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                    ) : (
                      <span style={{ fontSize: '0.62rem', color: '#8a94a6' }}>No match</span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.62rem', color: '#5d6d7e', wordBreak: 'break-word' }}>
                    {entry.file ? entry.file.name : 'Waiting for match'}
                  </div>
                  {entry.file && (
                    <button
                      onClick={() => clearBulkBaseAssignment(entry.file!.name)}
                      style={{ marginTop: '6px', width: '100%', fontSize: '0.62rem', padding: '4px 6px', cursor: 'pointer' }}
                    >
                      Clear Base
                    </button>
                  )}
                  <button
                    onClick={() => document.getElementById(`bulk-piece-slot-input-${entry.piece}`)?.click()}
                    style={{ marginTop: '6px', width: '100%', fontSize: '0.62rem', padding: '4px 6px', cursor: 'pointer' }}
                  >
                    Choose
                  </button>
                  <input
                    id={`bulk-piece-slot-input-${entry.piece}`}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      if (e.target.files?.length) loadBulkImportFiles(e.target.files, entry.piece);
                      e.target.value = '';
                    }}
                    style={{ display: 'none' }}
                  />
                  {stagedVariantCandidates.filter(candidate => candidate.piece === entry.piece).length > 0 && (
                    <div style={{ marginTop: '6px', fontSize: '0.58rem', color: '#7d6608' }}>
                      <div>{stagedVariantCandidates.filter(candidate => candidate.piece === entry.piece).length} extra style</div>
                      {stagedVariantCandidates.filter(candidate => candidate.piece === entry.piece).slice(0, 2).map(candidate => (
                        <div key={candidate.file.name} style={{ wordBreak: 'break-word' }}>{candidate.file.name}</div>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => setActiveVariantPiece(current => current === entry.piece ? null : entry.piece)}
                    style={{ marginTop: '6px', width: '100%', fontSize: '0.62rem', padding: '4px 6px', cursor: 'pointer' }}
                  >
                    {activeVariantPiece === entry.piece ? 'Hide Variants' : 'Add Variants'}
                  </button>
                  {activeVariantPiece === entry.piece && (
                    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e3e8ee' }}>
                      <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#2c3e50', marginBottom: '6px' }}>
                        {entry.piece[0].toUpperCase() + entry.piece.slice(1)} Extra Styles
                      </div>
                      <button
                        onClick={() => document.getElementById(`bulk-piece-variant-input-${entry.piece}`)?.click()}
                        style={{ width: '100%', fontSize: '0.62rem', padding: '4px 6px', cursor: 'pointer', marginBottom: '6px' }}
                      >
                        Choose Extra Images
                      </button>
                      <input
                        id={`bulk-piece-variant-input-${entry.piece}`}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => {
                          if (e.target.files?.length) loadBulkVariantFiles(e.target.files, entry.piece);
                          e.target.value = '';
                        }}
                        style={{ display: 'none' }}
                      />
                      {stagedVariantCandidates.filter(candidate => candidate.piece === entry.piece).map(({ file, operator, threshold }) => (
                        <div key={file.name} style={{ marginBottom: '8px', padding: '6px', background: '#f8f9fa', borderRadius: '4px' }}>
                          <div style={{ height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#fff', borderRadius: '4px', marginBottom: '5px' }}>
                            <img src={file.dataUrl} alt={file.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                          </div>
                          <div style={{ fontSize: '0.58rem', color: '#5d6d7e', wordBreak: 'break-word', marginBottom: '5px' }}>{file.name}</div>
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            <select
                              value={operator}
                              onChange={(e) => updateBulkExtraStyleRule(file.name, { operator: e.target.value as '>' | '<' | '=' })}
                              style={{ width: '42px', fontSize: '0.62rem' }}
                            >
                              <option value=">">&gt;</option>
                              <option value="<">&lt;</option>
                              <option value="=">=</option>
                            </select>
                            <input
                              type="number"
                              value={threshold}
                              onChange={(e) => updateBulkExtraStyleRule(file.name, { threshold: Number(e.target.value) || 0 })}
                              style={{ minWidth: 0, flex: 1, fontSize: '0.62rem' }}
                            />
                          </div>
                          <button
                            onClick={() => updateBulkExtraStyleAssignment(file.name, '')}
                            style={{ marginTop: '5px', width: '100%', fontSize: '0.58rem', padding: '3px 5px', cursor: 'pointer' }}
                          >
                            Remove from {entry.piece}
                          </button>
                        </div>
                      ))}
                      {availableExtraStyleFiles.length > 0 && (
                        <div style={{ marginTop: '6px' }}>
                          <div style={{ fontSize: '0.58rem', color: '#5d6d7e', marginBottom: '4px' }}>Available extra images</div>
                          {availableExtraStyleFiles.slice(0, 4).map(file => (
                            <button
                              key={file.name}
                              onClick={() => updateBulkExtraStyleAssignment(file.name, entry.piece)}
                              style={{ width: '100%', fontSize: '0.58rem', padding: '3px 5px', cursor: 'pointer', marginBottom: '4px', textAlign: 'left' }}
                            >
                              {file.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={{ marginTop: '12px', fontSize: '0.75rem', fontWeight: 600, color: '#2c3e50' }}>
              Reassign Base Images
            </div>
            <div style={{ marginTop: '4px', fontSize: '0.7rem', color: '#5d6d7e' }}>
              Change which base piece slot each staged image should fill before applying it to the draft.
            </div>
            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {bulkImportFiles.map(file => (
                <div key={file.name} style={{ display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid #e3e8ee', borderRadius: '6px', padding: '8px', background: '#fff' }}>
                  <div style={{ width: '54px', height: '54px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#f5f7fa', borderRadius: '4px', flexShrink: 0 }}>
                    <img src={file.dataUrl} alt={file.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.68rem', color: '#2c3e50', wordBreak: 'break-word' }}>{file.name}</div>
                  </div>
                  <select
                    value={bulkImportAssignments[file.name] ?? ''}
                    onChange={(e) => updateBulkImportAssignment(file.name, e.target.value)}
                    style={{ padding: '4px', fontSize: '0.75rem' }}
                  >
                    <option value="">Unassigned</option>
                    {BULK_PIECE_MATCHERS.map(({ piece }) => (
                      <option key={piece} value={piece}>
                        {piece[0].toUpperCase() + piece.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            {availableExtraStyleFiles.length > 0 && (
              <div style={{ marginTop: '12px', fontSize: '0.68rem', color: '#5d6d7e' }}>
                {availableExtraStyleFiles.length} unassigned image{availableExtraStyleFiles.length === 1 ? '' : 's'} available for per-piece variants. Use Add Variants under a base slot to attach them.
              </div>
            )}
          </>
        )}
      </section>

    </div>
  );
};

export default ThemeEditorView;
