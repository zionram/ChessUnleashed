import React, { useMemo, useRef, useState } from 'react';
import { useAudio, type AudioRule, type SoundAsset } from '../context/AudioContext';
import { useSettings } from '../context/SettingsContext';
import { getCustomEventStatus } from '../events/CustomEventRuntime';

type RuleDraft = Omit<AudioRule, 'id'>;

const FILTERS = [
  'All',
  'Piece Moves',
  'Captures',
  'Game Events',
  'UI Events',
  'Dynamic Sounds',
  'Music',
  'Custom Events'
];

const PIECES = ['any', 'p', 'n', 'b', 'r', 'q', 'k'];
const SIDES = ['any', 'w', 'b'];

const CATEGORY_EVENTS: Record<string, Array<{ id: string; label: string }>> = {
  'Piece Moves': [
    { id: 'move', label: 'Any move' },
    { id: 'pieceMove', label: 'Piece moves' },
    { id: 'capture', label: 'Piece captures' },
    { id: 'pieceCaptured', label: 'Piece is captured' },
    { id: 'promotion', label: 'Promotion' },
    { id: 'check', label: 'Check' },
    { id: 'checkmate', label: 'Checkmate' }
  ],
  Captures: [
    { id: 'capture', label: 'Any capture' },
    { id: 'capturingPiece', label: 'Capturing piece' },
    { id: 'capturedPiece', label: 'Captured piece' }
  ],
  'Game Events': [
    { id: 'gameStart', label: 'Game start' },
    { id: 'gameEnd', label: 'Game over' },
    { id: 'win', label: 'Win' },
    { id: 'loss', label: 'Loss' },
    { id: 'draw', label: 'Draw' },
    { id: 'resign', label: 'Resign' },
    { id: 'timerLow', label: 'Timer low' }
  ],
  'UI Events': [
    { id: 'panelOpen', label: 'Panel opened' },
    { id: 'panelClose', label: 'Panel closed' },
    { id: 'buttonClick', label: 'Button clicked' },
    { id: 'themeApplied', label: 'Theme or package applied' },
    { id: 'chatOpen', label: 'Open Chat panel' }
  ],
  'Dynamic Sounds': [
    { id: 'dynamicGroup', label: 'Random or grouped sound' },
    { id: 'stateBasedSound', label: 'State-based sound' }
  ],
  Music: [
    { id: 'backgroundMusic', label: 'Background music' },
    { id: 'eventMusic', label: 'Event music' }
  ],
  'Custom Events': [
    { id: 'customEvent', label: 'Custom event ID' }
  ]
};

const pieceNames: Record<string, string> = {
  any: 'Any piece',
  p: 'Pawn',
  n: 'Knight',
  b: 'Bishop',
  r: 'Rook',
  q: 'Queen',
  k: 'King'
};

const getFileType = (file: File): SoundAsset['fileType'] => {
  const lowerName = file.name.toLowerCase();
  return lowerName.endsWith('.mid') || lowerName.endsWith('.midi') ? 'midi' : 'audio';
};

const normalizeCategory = (category?: string) => {
  if (category === 'UI / Panel Events') return 'UI Events';
  if (!category || category === 'Other Events') return 'Custom Events';
  return category;
};

const inferCategory = (eventName: string) => {
  if (['move', 'pieceMove', 'pieceCaptured', 'promotion', 'castle', 'check', 'checkmate'].includes(eventName)) return 'Piece Moves';
  if (['capture', 'capturingPiece', 'capturedPiece'].includes(eventName)) return 'Captures';
  if (['stalemate', 'draw', 'gameStart', 'gameEnd', 'win', 'loss', 'resign', 'timerLow'].includes(eventName)) return 'Game Events';
  if (eventName.includes('panel') || eventName.includes('chat') || eventName === 'buttonClick' || eventName === 'themeApplied') return 'UI Events';
  if (eventName.includes('Music')) return 'Music';
  return 'Custom Events';
};

const getEventLabel = (eventName: string, category?: string) => {
  const options = CATEGORY_EVENTS[normalizeCategory(category)] ?? [];
  return options.find(option => option.id === eventName)?.label ?? eventName;
};

const getSoundName = (library: SoundAsset[], soundId: string) =>
  library.find(sound => sound.id === soundId)?.name ?? 'Missing sound';

const createDefaultDraft = (library: SoundAsset[]): RuleDraft => ({
  name: '',
  event: 'move',
  piece: 'any',
  side: 'any',
  mode: 'any',
  soundId: library[0]?.id || '',
  category: 'Piece Moves',
  target: 'any',
  playback: {
    allowOverlap: true,
    playOnceUntilReset: false,
    stopOtherSounds: false,
    duckMusic: false,
    pauseMusic: false,
    resumeMusicAfter: true
  }
});

const getRuleSummary = (rule: AudioRule) => {
  const category = normalizeCategory(rule.category || inferCategory(rule.event));
  const eventLabel = getEventLabel(rule.event, category);
  const pieceLabel = pieceNames[rule.piece] ?? rule.piece;
  const sideLabel = rule.side === 'any' ? 'any side' : rule.side === 'w' ? 'White' : 'Black';
  if (category === 'Piece Moves' || category === 'Captures') {
    return rule.name?.trim() || `${eventLabel} for ${pieceLabel.toLowerCase()} (${sideLabel})`;
  }
  return rule.name?.trim() || eventLabel;
};

const getPlaybackSummary = (rule: AudioRule) => {
  const playback = rule.playback ?? {};
  const labels = [
    playback.allowOverlap ? 'Overlap' : '',
    playback.playOnceUntilReset ? 'Once' : '',
    playback.stopOtherSounds ? 'Stop other effects' : '',
    playback.duckMusic ? 'Lower music' : '',
    playback.pauseMusic ? 'Pause music' : ''
  ].filter(Boolean);
  return labels.length ? labels.join(', ') : 'Default';
};

const controlStyle: React.CSSProperties = {
  padding: '8px',
  border: '1px solid #d0d7de',
  borderRadius: 6,
  fontSize: '0.8rem'
};

const SoundEditorView: React.FC = () => {
  const {
    masterVolume,
    setMasterVolume,
    sfxVolume,
    setSfxVolume,
    library,
    addSound,
    removeSound,
    renameSound,
    rules,
    addRule,
    updateRule,
    removeRule,
    ruleCategories,
    addRuleCategory,
    playLibrarySound,
    stopPreview
  } = useAudio();
  const { settings, toggleView } = useSettings();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [ruleDraft, setRuleDraft] = useState<RuleDraft>(() => createDefaultDraft(library));
  const [ruleEditorOpen, setRuleEditorOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const categories = useMemo(() => {
    const savedCategories = ruleCategories.map(normalizeCategory);
    const ruleDerivedCategories = rules.map(rule => normalizeCategory(rule.category || inferCategory(rule.event)));
    return ['All', ...Array.from(new Set([...FILTERS.slice(1), ...savedCategories, ...ruleDerivedCategories]))];
  }, [ruleCategories, rules]);

  const visibleRules = useMemo(() => {
    if (selectedCategory === 'All') return rules;
    return rules.filter(rule => normalizeCategory(rule.category || inferCategory(rule.event)) === selectedCategory);
  }, [rules, selectedCategory]);

  const eventOptions = normalizeCategory(ruleDraft.category) === 'Custom Events'
    ? [
        ...CATEGORY_EVENTS['Custom Events'],
        ...settings.customEvents.map(eventDefinition => ({
          id: eventDefinition.eventId,
          label: `${eventDefinition.name || eventDefinition.eventId} (${getCustomEventStatus(eventDefinition, settings.customEvents)})`
        }))
      ]
    : CATEGORY_EVENTS[normalizeCategory(ruleDraft.category)] ?? CATEGORY_EVENTS['Custom Events'];
  const selectedSound = library.find(sound => sound.id === ruleDraft.soundId);
  const selectedCustomEvent = settings.customEvents.find(eventDefinition => eventDefinition.eventId === ruleDraft.event);
  const selectedCustomEventStatus = selectedCustomEvent ? getCustomEventStatus(selectedCustomEvent, settings.customEvents) : null;

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => addSound(file.name.replace(/\.[^/.]+$/, ''), ev.target?.result as string, getFileType(file));
      reader.readAsDataURL(file);
    });
    event.target.value = '';
    if (files.length) setLibraryOpen(true);
  };

  const openNewRule = () => {
    setEditingRuleId(null);
    setRuleDraft(createDefaultDraft(library));
    setRuleEditorOpen(true);
  };

  const openEditRule = (rule: AudioRule) => {
    setEditingRuleId(rule.id);
    setRuleDraft({
      name: rule.name ?? '',
      event: rule.event,
      piece: rule.piece,
      side: rule.side,
      mode: rule.mode,
      soundId: rule.soundId,
      category: normalizeCategory(rule.category || inferCategory(rule.event)),
      target: rule.target ?? 'any',
      playback: {
        allowOverlap: rule.playback?.allowOverlap ?? true,
        playOnceUntilReset: rule.playback?.playOnceUntilReset ?? false,
        stopOtherSounds: rule.playback?.stopOtherSounds ?? false,
        duckMusic: rule.playback?.duckMusic ?? false,
        pauseMusic: rule.playback?.pauseMusic ?? false,
        resumeMusicAfter: rule.playback?.resumeMusicAfter ?? true
      }
    });
    setRuleEditorOpen(true);
  };

  const saveRule = () => {
    const nextRule = {
      ...ruleDraft,
      category: normalizeCategory(ruleDraft.category || inferCategory(ruleDraft.event)),
      soundId: ruleDraft.soundId || library[0]?.id || ''
    };
    if (!nextRule.soundId) return;
    if (editingRuleId) updateRule(editingRuleId, nextRule);
    else addRule(nextRule);
    setRuleEditorOpen(false);
    setEditingRuleId(null);
  };

  const updateDraftPlayback = (key: keyof NonNullable<AudioRule['playback']>, value: boolean) => {
    setRuleDraft({
      ...ruleDraft,
      playback: {
        ...ruleDraft.playback,
        [key]: value
      }
    });
  };

  const addCustomCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    addRuleCategory(trimmed);
    setSelectedCategory(trimmed);
    setNewCategoryName('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff', padding: 14, boxSizing: 'border-box', gap: 12 }}>
      <input ref={fileInputRef} type="file" accept="audio/*,.mid,.midi" multiple onChange={handleFileUpload} style={{ display: 'none' }} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button type="button" onClick={openNewRule} style={{ padding: '10px', borderRadius: 8, border: '1px solid #2c3e50', background: '#2c3e50', color: '#fff', cursor: 'pointer', fontWeight: 800 }}>
          Add Sound Rule
        </button>
        <button type="button" onClick={() => fileInputRef.current?.click()} style={{ padding: '10px', borderRadius: 8, border: '1px solid #d0d7de', background: '#f8fafc', color: '#2c3e50', cursor: 'pointer', fontWeight: 800 }}>
          Add Sound Files
        </button>
      </div>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: 10, border: '1px solid #e5e7eb', borderRadius: 8, background: '#f8fafc' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.75rem', color: '#475569' }}>
          Master volume
          <input type="range" min="0" max="1" step="0.05" value={masterVolume} onChange={(e) => setMasterVolume(parseFloat(e.target.value))} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.75rem', color: '#475569' }}>
          Sound effects
          <input type="range" min="0" max="1" step="0.05" value={sfxVolume} onChange={(e) => setSfxVolume(parseFloat(e.target.value))} />
        </label>
      </section>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {categories.map(category => (
          <button
            key={category}
            type="button"
            onClick={() => setSelectedCategory(category)}
            style={{
              padding: '7px 10px',
              borderRadius: 999,
              border: '1px solid #d0d7de',
              background: selectedCategory === category ? '#2c3e50' : '#fff',
              color: selectedCategory === category ? '#fff' : '#2c3e50',
              fontSize: '0.72rem',
              cursor: 'pointer'
            }}
          >
            {category}
          </button>
        ))}
      </div>

      <section style={{ border: '1px solid #d0d7de', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 0.9fr 1fr 70px', gap: 8, padding: '8px 10px', background: '#f1f5f9', color: '#334155', fontSize: '0.68rem', fontWeight: 900, textTransform: 'uppercase' }}>
          <span>Event / Rule</span>
          <span>Sound</span>
          <span>Category</span>
          <span>Playback</span>
          <span>Edit</span>
        </div>
        <div style={{ maxHeight: 280, overflow: 'auto' }}>
          {visibleRules.map(rule => {
            const category = normalizeCategory(rule.category || inferCategory(rule.event));
            return (
              <div key={rule.id} style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 0.9fr 1fr 70px', gap: 8, alignItems: 'center', padding: '9px 10px', borderTop: '1px solid #eef2f7', fontSize: '0.76rem' }}>
                <span style={{ color: '#2c3e50', fontWeight: 700 }}>{getRuleSummary(rule)}</span>
                <span style={{ color: '#475569' }}>{getSoundName(library, rule.soundId)}</span>
                <span style={{ color: '#475569' }}>{category}</span>
                <span style={{ color: '#475569' }}>{getPlaybackSummary(rule)}</span>
                <span style={{ display: 'flex', gap: 5 }}>
                  <button type="button" onClick={() => openEditRule(rule)} style={{ padding: '5px 7px', border: '1px solid #d0d7de', borderRadius: 5, background: '#fff', cursor: 'pointer' }}>Edit</button>
                  <button type="button" onClick={() => removeRule(rule.id)} style={{ padding: '5px 7px', border: '1px solid #fecaca', borderRadius: 5, background: '#fef2f2', color: '#b42318', cursor: 'pointer' }}>Delete</button>
                </span>
              </div>
            );
          })}
          {!visibleRules.length && (
            <div style={{ padding: 14, color: '#64748b', fontSize: '0.8rem' }}>No sound rules in this category yet.</div>
          )}
        </div>
      </section>

      <section style={{ border: '1px solid #d0d7de', borderRadius: 8, background: '#fff', overflow: 'hidden' }}>
        <button
          type="button"
          onClick={() => setLibraryOpen(!libraryOpen)}
          style={{ width: '100%', padding: '10px 12px', border: 0, background: '#f8fafc', color: '#2c3e50', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}
        >
          <span>Sound Library</span>
          <span>{library.length} files {libraryOpen ? 'Hide' : 'Show'}</span>
        </button>
        {libraryOpen && (
          <div style={{ maxHeight: 240, overflow: 'auto' }}>
            {library.map(sound => (
              <div key={sound.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto auto', gap: 8, alignItems: 'center', padding: 9, borderTop: '1px solid #eef2f7' }}>
                <input value={sound.name} onChange={(e) => renameSound(sound.id, e.target.value)} style={controlStyle} />
                <button type="button" onClick={() => playLibrarySound(sound.id)} disabled={sound.fileType === 'midi'} style={{ padding: '7px 9px', borderRadius: 6, border: '1px solid #d0d7de', background: '#fff', cursor: sound.fileType === 'midi' ? 'not-allowed' : 'pointer' }}>
                  {sound.fileType === 'midi' ? 'MIDI pending' : 'Play'}
                </button>
                <button type="button" onClick={() => removeSound(sound.id)} style={{ padding: '7px 9px', borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', color: '#b42318', cursor: 'pointer' }}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {ruleEditorOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(15, 23, 42, 0.35)', display: 'grid', placeItems: 'center', padding: 16 }}>
          <div style={{ width: 'min(720px, 96vw)', maxHeight: '90vh', overflow: 'auto', background: '#fff', borderRadius: 10, boxShadow: '0 18px 60px rgba(15,23,42,0.28)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '1rem', fontWeight: 900, color: '#2c3e50' }}>{editingRuleId ? 'Edit Sound Rule' : 'Add Sound Rule'}</div>
                <div style={{ fontSize: '0.76rem', color: '#64748b' }}>Choose the event, target, sound file, and playback behavior.</div>
              </div>
              <button type="button" onClick={() => setRuleEditorOpen(false)} style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #d0d7de', background: '#fff', cursor: 'pointer' }}>Cancel</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.75rem', color: '#475569' }}>
                Sound Rule Name
                <input value={ruleDraft.name ?? ''} onChange={(e) => setRuleDraft({ ...ruleDraft, name: e.target.value })} placeholder="Example: Pawn capture sound" style={controlStyle} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.75rem', color: '#475569' }}>
                Sound Category
                <select
                  value={normalizeCategory(ruleDraft.category)}
                  onChange={(e) => {
                    const category = e.target.value;
                    const nextEvent = CATEGORY_EVENTS[category]?.[0]?.id ?? ruleDraft.event;
                    setRuleDraft({ ...ruleDraft, category, event: nextEvent });
                  }}
                  style={controlStyle}
                >
                  {FILTERS.filter(category => category !== 'All').map(category => <option key={category} value={category}>{category}</option>)}
                  {categories.filter(category => !FILTERS.includes(category)).map(category => <option key={category} value={category}>{category}</option>)}
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.75rem', color: '#475569' }}>
                Sound File
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto auto', gap: 6 }}>
                  <select value={ruleDraft.soundId} onChange={(e) => setRuleDraft({ ...ruleDraft, soundId: e.target.value })} style={controlStyle}>
                    {library.map(sound => <option key={sound.id} value={sound.id}>{sound.name}{sound.fileType === 'midi' ? ' (MIDI playback pending)' : ''}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={() => playLibrarySound(ruleDraft.soundId)}
                    disabled={!ruleDraft.soundId || selectedSound?.fileType === 'midi'}
                    style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #d0d7de', background: '#fff', cursor: ruleDraft.soundId && selectedSound?.fileType !== 'midi' ? 'pointer' : 'not-allowed', fontWeight: 700 }}
                  >
                    Preview
                  </button>
                  <button
                    type="button"
                    onClick={stopPreview}
                    style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #d0d7de', background: '#fff', cursor: 'pointer', fontWeight: 700 }}
                  >
                    Stop
                  </button>
                </div>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.75rem', color: '#475569' }}>
                Trigger / Event
                <select value={ruleDraft.event} onChange={(e) => setRuleDraft({ ...ruleDraft, event: e.target.value })} style={controlStyle}>
                  {eventOptions.map(event => <option key={event.id} value={event.id}>{event.label}</option>)}
                </select>
              </label>
              {(normalizeCategory(ruleDraft.category) === 'Piece Moves' || normalizeCategory(ruleDraft.category) === 'Captures') && (
                <>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.75rem', color: '#475569' }}>
                    Apply To
                    <select value={ruleDraft.piece} onChange={(e) => setRuleDraft({ ...ruleDraft, piece: e.target.value })} style={controlStyle}>
                      {PIECES.map(piece => <option key={piece} value={piece}>{pieceNames[piece] ?? piece}</option>)}
                    </select>
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.75rem', color: '#475569' }}>
                    Side
                    <select value={ruleDraft.side} onChange={(e) => setRuleDraft({ ...ruleDraft, side: e.target.value })} style={controlStyle}>
                      {SIDES.map(side => <option key={side} value={side}>{side === 'any' ? 'Any side' : side === 'w' ? 'White' : 'Black'}</option>)}
                    </select>
                  </label>
                </>
              )}
              {(normalizeCategory(ruleDraft.category) === 'UI Events' || normalizeCategory(ruleDraft.category) === 'Custom Events') && (
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.75rem', color: '#475569', gridColumn: '1 / -1' }}>
                  Apply To / Event ID
                  <input value={ruleDraft.target ?? ''} onChange={(e) => setRuleDraft({ ...ruleDraft, target: e.target.value })} placeholder="panel id, button id, or future custom event id" style={controlStyle} />
                </label>
              )}
            </div>

            <section style={{ padding: 10, border: '1px solid #e5e7eb', borderRadius: 8, background: '#f8fafc' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 900, color: '#2c3e50', marginBottom: 8 }}>Playback Behavior</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  ['allowOverlap', 'Allow overlap with other sound effects'],
                  ['playOnceUntilReset', 'Play only once until event resets'],
                  ['stopOtherSounds', 'Stop other sound effects before playing'],
                  ['duckMusic', 'Lower background music while playing'],
                  ['pauseMusic', 'Pause background music while playing'],
                  ['resumeMusicAfter', 'Resume music after sound ends']
                ].map(([key, label]) => (
                  <label key={key} style={{ display: 'flex', gap: 7, alignItems: 'center', fontSize: '0.76rem', color: '#475569' }}>
                    <input
                      type="checkbox"
                      checked={!!ruleDraft.playback?.[key as keyof NonNullable<AudioRule['playback']>]}
                      onChange={(e) => updateDraftPlayback(key as keyof NonNullable<AudioRule['playback']>, e.target.checked)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </section>

            <section style={{ padding: 10, border: '1px dashed #cbd5e1', borderRadius: 8, color: '#64748b', fontSize: '0.76rem' }}>
              {normalizeCategory(ruleDraft.category) === 'Dynamic Sounds' && 'Dynamic sound groups are saved as rules now. Random/group playback logic is prepared for a future pass.'}
              {normalizeCategory(ruleDraft.category) === 'Music' && 'Music rules are prepared for event music and background music handoff. Full routing will use the Audio Controller.'}
              {normalizeCategory(ruleDraft.category) === 'Custom Events' && (
                selectedCustomEvent
                  ? `${selectedCustomEvent.name}: ${selectedCustomEventStatus}. ${selectedCustomEventStatus === 'Future-only' ? 'This rule can be saved, but it will not fire until detection is added.' : selectedCustomEvent.category}`
                  : 'Custom event IDs are saved here. Active events can fire now; Future-only tactical events are saved but will not fire until detection is added.'
              )}
              {selectedSound?.fileType === 'midi' && 'MIDI files can be stored and assigned now. Browser MIDI playback support is pending.'}
            </section>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setRuleEditorOpen(false)} style={{ padding: '9px 12px', borderRadius: 6, border: '1px solid #d0d7de', background: '#fff', cursor: 'pointer', fontWeight: 700 }}>Cancel</button>
              <button type="button" onClick={saveRule} disabled={!ruleDraft.soundId} style={{ padding: '9px 12px', borderRadius: 6, border: '1px solid #2c3e50', background: ruleDraft.soundId ? '#2c3e50' : '#94a3b8', color: '#fff', cursor: ruleDraft.soundId ? 'pointer' : 'not-allowed', fontWeight: 800 }}>
                Save Rule
              </button>
            </div>
          </div>
        </div>
      )}

      <section style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 'auto' }}>
        <input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="New custom category" style={{ ...controlStyle, flex: 1 }} />
        <button type="button" onClick={addCustomCategory} style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #d0d7de', background: '#fff', cursor: 'pointer' }}>Add Category</button>
        <button type="button" onClick={() => toggleView('sound-editor')} style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #d0d7de', background: '#fff', cursor: 'pointer' }}>Close</button>
      </section>
    </div>
  );
};

export default SoundEditorView;
