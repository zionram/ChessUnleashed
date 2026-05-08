import React, { useMemo, useState } from 'react';
import AnimationPreviewCard from '../components/animation/AnimationPreviewCard';
import {
  useSettings,
  type AnimationEventTarget,
  type AnimationRuleScope,
  type CustomEventBaseTrigger,
  type CustomEventDefinition
} from '../context/SettingsContext';
import { useAudio } from '../context/AudioContext';
import { createSimulatedGameEvent, evaluateCustomEventDefinition, getCustomEventStatus } from '../events/CustomEventRuntime';
import { eventBus } from '../events/EventBus';
import type { GameEvent } from '../events/types';

type BuilderStep = 'what' | 'when' | 'why' | 'where' | 'review';
type CreativeActionKind = 'sound' | 'animation' | 'visual-media' | 'property-change' | 'custom';
type ActionFamily = 'visual' | 'audio' | 'property';
type MediaSourceKind = 'file' | 'existing-change';
type DurationBehavior = 'once' | 'timed' | 'until-event-ends' | 'until-replaced' | 'permanent-until-reset';
type TransitionBehavior = 'instant' | 'fade' | 'slide' | 'grow' | 'custom-animation';
type RevertBehavior = 'revert-to-previous' | 'keep-changed' | 'custom-revert';

type PickerItem = {
  id: string;
  label: string;
  icon: string;
  description: string;
  meta?: string;
  featured?: boolean;
};

const BASE_TRIGGERS: Array<{ id: CustomEventBaseTrigger; label: string; icon: string; description: string; category: string; featured?: boolean }> = [
  { id: 'pieceMoved', label: 'Piece moves', icon: '♟♞♜', description: 'A chess piece moves from one square to another.', category: 'Pieces', featured: true },
  { id: 'pieceCaptured', label: 'Piece is captured', icon: '⚔️', description: 'A piece captures another piece.', category: 'Pieces', featured: true },
  { id: 'check', label: 'King is checked', icon: '👑', description: 'A king is put in check.', category: 'Game', featured: true },
  { id: 'checkmate', label: 'Checkmate', icon: '🏁', description: 'The game ends by checkmate.', category: 'Game', featured: true },
  { id: 'promotion', label: 'Pawn promotes', icon: '♛', description: 'A pawn promotes on the last rank.', category: 'Pieces', featured: true },
  { id: 'gameStart', label: 'Game starts', icon: '▶', description: 'A game begins.', category: 'Game' },
  { id: 'gameEnd', label: 'Game ends', icon: '■', description: 'A game ends.', category: 'Game' },
  { id: 'panelOpened', label: 'Panel opens', icon: '🪟', description: 'A workspace panel opens.', category: 'Interface' },
  { id: 'afterMove', label: 'After any move', icon: '↗', description: 'After any move is completed.', category: 'Pieces' }
];

const ACTION_STARTERS: Array<PickerItem & { kind: CreativeActionKind; family: ActionFamily }> = [
  { id: 'sound', kind: 'sound', family: 'audio', label: 'Play a sound', icon: '🔊', description: 'Play a sound effect or music cue.', featured: true },
  { id: 'animation', kind: 'animation', family: 'visual', label: 'Run animation', icon: '✨', description: 'Run an existing animation.', featured: true },
  { id: 'visual-media', kind: 'visual-media', family: 'visual', label: 'Show visual media', icon: '🖼️', description: 'Show an image, gif, video, or overlay.', featured: true },
  { id: 'property-change', kind: 'property-change', family: 'property', label: 'Change something existing', icon: '🎨', description: 'Change an existing game object or property.', featured: true },
  { id: 'custom', kind: 'custom', family: 'visual', label: 'Something Else', icon: '+', description: 'Choose or create a reusable custom action.' }
];

const PIECES = [
  { value: 'any', label: '♟♞♜ Any piece' },
  { value: 'pawn', label: '♟ Pawn' },
  { value: 'knight', label: '♞ Knight' },
  { value: 'bishop', label: '♝ Bishop' },
  { value: 'rook', label: '♜ Rook' },
  { value: 'queen', label: '♛ Queen' },
  { value: 'king', label: '♚ King' },
  { value: 'custom', label: 'Custom piece' }
];

const TEAMS = [
  { value: 'any', label: 'Any side' },
  { value: 'white', label: 'White' },
  { value: 'black', label: 'Black' },
  { value: 'custom', label: 'Custom side' }
];

const PROPERTY_TARGETS = [
  { id: 'piece', label: 'Piece', icon: '♟', description: 'Change a piece property, such as image, scale, opacity, or glow.' },
  { id: 'board', label: 'Board', icon: '▦', description: 'Change board colors, overlay, scale, or visual style.' },
  { id: 'square', label: 'Square', icon: '□', description: 'Change one or more square properties.' },
  { id: 'background', label: 'Background', icon: '🖼️', description: 'Change the workspace or game background.' },
  { id: 'registered-item', label: 'Other registered item', icon: '🧩', description: 'Search registered in-game items in an advanced pass.' }
];

const PLACES: Array<{ id: AnimationEventTarget | 'fullscreen' | 'workspace' | 'left-screen' | 'right-screen' | 'center-screen'; label: string; icon: string; description: string; featured?: boolean }> = [
  { id: 'board', label: 'Whole board', icon: '▦', description: 'Affect the whole board area.', featured: true },
  { id: 'target-square', label: 'Target square', icon: '□', description: 'Affect the destination or target square.', featured: true },
  { id: 'moved-piece', label: 'The piece', icon: '♟', description: 'Affect the piece that caused the event.', featured: true },
  { id: 'fullscreen', label: 'Full screen', icon: '▣', description: 'Show across the full screen.', featured: true },
  { id: 'workspace', label: 'Workspace area', icon: '▤', description: 'Show inside the game workspace.' },
  { id: 'center-screen', label: 'Center screen', icon: '◎', description: 'Show in the center of the screen.' },
  { id: 'left-screen', label: 'Left screen', icon: '◧', description: 'Show on the left side.' },
  { id: 'right-screen', label: 'Right screen', icon: '◨', description: 'Show on the right side.' },
  { id: 'captured-piece', label: 'Captured piece', icon: '⚔️', description: 'Affect the captured piece if capture data exists.' },
  { id: 'source-square', label: 'Source square', icon: '◇', description: 'Affect the square the move started from.' }
];

const ANIMATION_SCOPES: Array<{ id: AnimationRuleScope; label: string }> = [
  { id: 'any-piece', label: 'Any piece' },
  { id: 'my-pieces', label: 'My pieces' },
  { id: 'opponent-pieces', label: 'Opponent pieces' },
  { id: 'white-pieces', label: 'White pieces' },
  { id: 'black-pieces', label: 'Black pieces' }
];

const SAMPLE_EVENTS: Array<{ id: string; label: string; event: GameEvent }> = [
  { id: 'auto', label: 'Auto sample for this event', event: { type: 'move.made', payload: {}, timestamp: Date.now() } },
  { id: 'pawn-e2-e4', label: 'Pawn moves e2 to e4', event: { type: 'move.made', payload: { pieceType: 'pawn', team: 'w', from: 'e2', to: 'e4' }, timestamp: Date.now() } },
  { id: 'queen-captured', label: 'Queen captured', event: { type: 'piece.captured', payload: { pieceType: 'bishop', team: 'b', from: 'g4', to: 'd1', capturedPiece: 'queen' }, timestamp: Date.now() } },
  { id: 'king-check', label: 'King in check', event: { type: 'move.made', payload: { pieceType: 'queen', team: 'w', from: 'h5', to: 'e8', isCheck: true }, timestamp: Date.now() } },
  { id: 'promotion', label: 'Pawn promotion', event: { type: 'move.made', payload: { pieceType: 'pawn', team: 'w', from: 'e7', to: 'e8', isPromotion: true }, timestamp: Date.now() } }
];

const createEventId = (name: string) =>
  name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '') || `custom.event.${Date.now().toString(36)}`;

const createBlankEvent = (): CustomEventDefinition => ({
  id: `event-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
  name: '',
  eventId: '',
  category: 'Custom Events',
  baseTrigger: '',
  conditionMode: 'all',
  conditions: {
    pieceType: 'any',
    team: 'any',
    fromSquare: '',
    toSquare: '',
    capturedPiece: 'any',
    panelViewId: '',
    complexCondition: ''
  }
});

const validateEvent = (eventDefinition: CustomEventDefinition, existing: CustomEventDefinition[], editingId: string | null) => {
  const messages: string[] = [];
  if (!eventDefinition.name.trim()) messages.push('Name this before saving.');
  if (!eventDefinition.eventId.trim()) messages.push('Event ID is required.');
  if (!eventDefinition.baseTrigger) messages.push('Choose when this should happen.');
  if (existing.some(item => item.id !== editingId && item.eventId.trim() === eventDefinition.eventId.trim())) messages.push('Event ID must be unique.');
  return messages;
};

const cardStyle = (active = false): React.CSSProperties => ({
  border: active ? '1px solid rgba(56, 189, 248, 0.72)' : '1px solid rgba(148, 163, 184, 0.18)',
  background: active ? 'rgba(14, 47, 72, 0.7)' : 'rgba(10, 20, 38, 0.72)',
  color: '#dbeafe',
  borderRadius: 12,
  padding: 12,
  cursor: 'pointer',
  textAlign: 'left',
  boxShadow: active ? '0 0 0 1px rgba(56, 189, 248, 0.22), 0 0 18px rgba(56, 189, 248, 0.14)' : 'none'
});

const stepButtonStyle = (active = false): React.CSSProperties => ({
  border: active ? '1px solid rgba(56, 189, 248, 0.72)' : '1px solid rgba(148, 163, 184, 0.18)',
  background: active ? 'rgba(14, 47, 72, 0.82)' : 'rgba(15, 23, 42, 0.72)',
  color: active ? '#e0f2fe' : '#94a3b8',
  borderRadius: 999,
  padding: '7px 11px',
  fontSize: '0.74rem',
  fontWeight: 900,
  cursor: 'pointer'
});

const fieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 5,
  fontSize: '0.72rem',
  color: '#94a3b8',
  fontWeight: 800
};

const inputStyle: React.CSSProperties = {
  minWidth: 0,
  border: '1px solid rgba(148, 163, 184, 0.22)',
  borderRadius: 8,
  background: 'rgba(15, 23, 42, 0.76)',
  color: '#dbeafe',
  padding: '8px 9px'
};

const sectionTitleStyle: React.CSSProperties = { color: '#e5edf7', fontSize: '1.15rem', fontWeight: 950 };
const helperStyle: React.CSSProperties = { color: '#94a3b8', fontSize: '0.78rem' };

const PickerList: React.FC<{
  title: string;
  helper: string;
  items: PickerItem[];
  selectedId?: string;
  search: string;
  onSearch: (value: string) => void;
  onPick: (item: PickerItem) => void;
  onAddNew: () => void;
  addLabel?: string;
}> = ({ title, helper, items, selectedId, search, onSearch, onPick, onAddNew, addLabel = '+ Add new' }) => {
  const filtered = items.filter(item => !search.trim() || `${item.label} ${item.description} ${item.meta ?? ''}`.toLowerCase().includes(search.trim().toLowerCase()));
  const featured = filtered.filter(item => item.featured);
  const regular = filtered.filter(item => !item.featured);
  const renderItem = (item: PickerItem, compact = false) => (
    <button key={item.id} type="button" onClick={() => onPick(item)} style={cardStyle(selectedId === item.id)}>
      <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
        <span style={{ fontSize: compact ? '1rem' : '1.25rem', lineHeight: 1 }}>{item.icon}</span>
        <span style={{ minWidth: 0 }}>
          <strong style={{ display: 'block' }}>{item.label}</strong>
          <span style={{ display: 'block', color: '#94a3b8', fontSize: '0.7rem', marginTop: 3 }}>{item.description}</span>
          {item.meta && <span style={{ display: 'block', color: '#7dd3fc', fontSize: '0.66rem', marginTop: 4 }}>{item.meta}</span>}
        </span>
      </div>
    </button>
  );

  return (
    <div style={{ ...cardStyle(false), cursor: 'default' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: 9 }}>
        <div>
          <strong>{title}</strong>
          <div style={{ color: '#94a3b8', fontSize: '0.72rem', marginTop: 2 }}>{helper}</div>
        </div>
        <button type="button" onClick={onAddNew} style={{ ...inputStyle, padding: '6px 9px', whiteSpace: 'nowrap' }}>{addLabel}</button>
      </div>
      <input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search..." style={{ ...inputStyle, width: '100%', marginBottom: 10 }} />
      {featured.length > 0 && (
        <>
          <div style={{ color: '#7f96ae', fontSize: '0.65rem', fontWeight: 950, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Featured</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 8, marginBottom: 10 }}>{featured.map(item => renderItem(item))}</div>
        </>
      )}
      <div style={{ color: '#7f96ae', fontSize: '0.65rem', fontWeight: 950, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Saved / available</div>
      <div style={{ display: 'grid', gap: 7, maxHeight: 230, overflow: 'auto' }}>
        {regular.map(item => renderItem(item, true))}
        {!regular.length && !featured.length && <div style={{ color: '#94a3b8', fontSize: '0.76rem' }}>Nothing here yet. Use Add new below.</div>}
      </div>
    </div>
  );
};

const EventBuilderView: React.FC = () => {
  const { settings, toggleView, createCustomEvent, updateCustomEvent, deleteCustomEvent, createAnimationRule, deleteAnimationRule } = useSettings();
  const { library, rules: soundRules, addRule, playLibrarySound } = useAudio();
  const [step, setStep] = useState<BuilderStep>('what');
  const [draft, setDraft] = useState<CustomEventDefinition>(() => createBlankEvent());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [actionKind, setActionKind] = useState<CreativeActionKind>('sound');
  const [mediaSourceKind, setMediaSourceKind] = useState<MediaSourceKind>('file');
  const [selectedSoundId, setSelectedSoundId] = useState(library[0]?.id ?? '');
  const [selectedAnimationId, setSelectedAnimationId] = useState(settings.animationDefinitions.find(a => a.enabled)?.id ?? '');
  const [selectedPlace, setSelectedPlace] = useState<AnimationEventTarget | string>('board');
  const [attachScope, setAttachScope] = useState<AnimationRuleScope>('any-piece');
  const [customActionName, setCustomActionName] = useState('');
  const [customActionIcon, setCustomActionIcon] = useState('✨');
  const [customActionFamily, setCustomActionFamily] = useState<ActionFamily>('visual');
  const [selectedPropertyTarget, setSelectedPropertyTarget] = useState('piece');
  const [propertyName, setPropertyName] = useState('image');
  const [propertyValue, setPropertyValue] = useState('');
  const [durationBehavior, setDurationBehavior] = useState<DurationBehavior>('once');
  const [durationSeconds, setDurationSeconds] = useState(3);
  const [transitionBehavior, setTransitionBehavior] = useState<TransitionBehavior>('instant');
  const [revertBehavior, setRevertBehavior] = useState<RevertBehavior>('revert-to-previous');
  const [actionSearch, setActionSearch] = useState('');
  const [eventSearch, setEventSearch] = useState('');
  const [conditionSearch, setConditionSearch] = useState('');
  const [placeSearch, setPlaceSearch] = useState('');
  const [customPanelOpen, setCustomPanelOpen] = useState(false);
  const [selectedSampleId, setSelectedSampleId] = useState('auto');
  const [message, setMessage] = useState('');
  const [testResult, setTestResult] = useState('');

  const validation = useMemo(() => validateEvent(draft, settings.customEvents, editingId), [draft, settings.customEvents, editingId]);
  const selectedAction = ACTION_STARTERS.find(action => action.kind === actionKind) ?? ACTION_STARTERS[0];
  const selectedTrigger = BASE_TRIGGERS.find(trigger => trigger.id === draft.baseTrigger);
  const selectedPlaceInfo = PLACES.find(place => place.id === selectedPlace);
  const selectedAnimation = settings.animationDefinitions.find(animation => animation.id === selectedAnimationId);

  const soundPickerItems: PickerItem[] = library.map(sound => ({ id: sound.id, label: sound.name, icon: '🔊', description: 'Sound library file', meta: sound.fileType ? sound.fileType.toUpperCase() : 'AUDIO', featured: sound.id === selectedSoundId }));
  const animationPickerItems: PickerItem[] = settings.animationDefinitions.filter(animation => animation.enabled).map(animation => ({ id: animation.id, label: animation.name, icon: '✨', description: animation.description || 'Animation preset', meta: animation.category, featured: animation.builtin }));
  const actionPickerItems: PickerItem[] = ACTION_STARTERS.map(action => ({ id: action.kind, label: action.label, icon: action.icon, description: action.description, meta: action.family, featured: action.featured }));
  const eventPickerItems: PickerItem[] = [
    ...BASE_TRIGGERS.map(trigger => ({ id: trigger.id, label: trigger.label, icon: trigger.icon, description: trigger.description, meta: trigger.category, featured: trigger.featured })),
    ...settings.customEvents.map(eventDefinition => ({ id: `custom:${eventDefinition.id}`, label: eventDefinition.name, icon: '⭐', description: eventDefinition.eventId, meta: eventDefinition.category || 'Saved custom event' }))
  ];
  const placePickerItems: PickerItem[] = PLACES.map(place => ({ id: String(place.id), label: place.label, icon: place.icon, description: place.description, featured: place.featured }));
  const conditionPickerItems: PickerItem[] = [
    { id: 'piece', label: 'Piece type', icon: '♟♞♜', description: 'Limit this to pawns, kings, queens, or another piece.', featured: true },
    { id: 'side', label: 'Side', icon: '◐', description: 'Only white, black, or either side.', featured: true },
    { id: 'from', label: 'From square', icon: '◇', description: 'Only when it starts from a square.' },
    { id: 'to', label: 'To square', icon: '□', description: 'Only when it lands on a square.', featured: true },
    { id: 'captured', label: 'Captured / affected piece', icon: '⚔️', description: 'Only when a certain piece is captured or affected.' },
    { id: 'panel', label: 'Panel or view', icon: '🪟', description: 'Only when a specific screen or tool is involved.' },
    { id: 'custom', label: 'Something Else', icon: '+', description: 'Add a deeper condition from registered event data.' }
  ];

  const eventSentence = useMemo(() => {
    const action = actionKind === 'custom' ? (customActionName || 'something custom') : selectedAction.label.toLowerCase();
    const when = selectedTrigger?.label.toLowerCase() || 'something happens';
    const piece = PIECES.find(pieceOption => pieceOption.value === draft.conditions.pieceType)?.label ?? '♟♞♜ Any piece';
    const side = TEAMS.find(team => team.value === draft.conditions.team)?.label ?? 'Any side';
    const place = selectedPlaceInfo?.label.toLowerCase() || 'the workspace';
    const duration = durationBehavior === 'timed' ? ` for ${durationSeconds} seconds` : durationBehavior === 'until-event-ends' ? ' until the event ends' : durationBehavior === 'permanent-until-reset' ? ' until reset' : '';
    return `${action} when ${piece} ${when}${side !== 'Any side' ? ` for ${side}` : ''}${draft.conditions.toSquare ? ` on ${draft.conditions.toSquare}` : ''} at ${place}${duration}.`;
  }, [actionKind, customActionName, selectedAction.label, selectedTrigger?.label, draft.conditions.pieceType, draft.conditions.team, draft.conditions.toSquare, selectedPlaceInfo?.label, durationBehavior, durationSeconds]);

  const updateConditions = (updates: Partial<CustomEventDefinition['conditions']>) => {
    setDraft(current => ({ ...current, conditions: { ...current.conditions, ...updates } }));
  };

  const setTrigger = (triggerId: CustomEventBaseTrigger) => {
    const trigger = BASE_TRIGGERS.find(item => item.id === triggerId);
    setDraft(current => ({
      ...current,
      baseTrigger: triggerId,
      category: trigger?.id === 'panelOpened' ? 'UI Events' : trigger?.id === 'pieceCaptured' ? 'Captures' : trigger?.id === 'check' || trigger?.id === 'checkmate' ? 'Game Events' : current.category || 'Custom Events'
    }));
  };

  const applyAction = (kind: CreativeActionKind) => {
    setActionKind(kind);
    if (kind === 'sound') setCustomActionFamily('audio');
    else if (kind === 'property-change') setCustomActionFamily('property');
    else setCustomActionFamily('visual');
    setCustomPanelOpen(kind === 'custom');
  };

  const makeDefaultName = () => {
    const action = actionKind === 'custom' ? (customActionName || 'Custom Effect') : selectedAction.label;
    const when = selectedTrigger?.label ?? 'Custom Event';
    return `${action} when ${when}`;
  };

  const prepareDraftForSave = (): CustomEventDefinition => {
    const name = draft.name.trim() || makeDefaultName();
    return {
      ...draft,
      name,
      eventId: draft.eventId.trim() || createEventId(name)
    };
  };

  const saveEvent = () => {
    const nextDraft = prepareDraftForSave();
    const nextValidation = validateEvent(nextDraft, settings.customEvents, editingId);
    if (nextValidation.length) {
      setMessage(nextValidation[0]);
      return;
    }

    if (editingId) updateCustomEvent(editingId, nextDraft);
    else createCustomEvent(nextDraft);

    if (actionKind === 'sound' && selectedSoundId) {
      const side = nextDraft.conditions.team === 'white' ? 'w' : nextDraft.conditions.team === 'black' ? 'b' : 'any';
      addRule({
        name: nextDraft.name,
        event: nextDraft.eventId,
        piece: nextDraft.conditions.pieceType || 'any',
        side,
        mode: 'any',
        soundId: selectedSoundId,
        category: 'Custom Events'
      });
    }

    if ((actionKind === 'animation' || (actionKind === 'visual-media' && mediaSourceKind === 'file')) && selectedAnimationId) {
      createAnimationRule({
        id: `anim-rule-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        eventId: nextDraft.eventId,
        animationId: selectedAnimationId,
        target: (PLACES.some(place => place.id === selectedPlace) ? selectedPlace : 'board') as AnimationEventTarget,
        scope: attachScope,
        enabled: true
      });
    }

    setDraft(nextDraft);
    setEditingId(nextDraft.id);
    setMessage('Saved and registered.');
  };

  const testEvent = () => {
    const testDraft = prepareDraftForSave();
    const selectedSample = SAMPLE_EVENTS.find(sample => sample.id === selectedSampleId);
    const simulatedEvent = selectedSampleId === 'auto' ? createSimulatedGameEvent(testDraft) : (selectedSample?.event ?? createSimulatedGameEvent(testDraft));
    const result = evaluateCustomEventDefinition(testDraft, simulatedEvent);
    setTestResult(result.matched ? `Matched ${simulatedEvent.type}.` : `Not matched: ${result.reason}${result.missingData.length ? ` Missing: ${result.missingData.join(', ')}.` : ''}`);
    if (result.matched) {
      eventBus.emit({
        type: 'custom.event',
        payload: { eventId: testDraft.eventId || 'unsaved.custom.event', name: testDraft.name || 'Unsaved Custom Event', simulated: true }
      });
    }
  };

  const beginEdit = (eventDefinition: CustomEventDefinition) => {
    setDraft({
      ...eventDefinition,
      conditionMode: eventDefinition.conditionMode ?? 'all',
      conditions: {
        pieceType: 'any',
        team: 'any',
        fromSquare: '',
        toSquare: '',
        capturedPiece: 'any',
        panelViewId: '',
        complexCondition: '',
        ...eventDefinition.conditions
      }
    });
    setEditingId(eventDefinition.id);
    setStep('review');
    setMessage('Loaded for editing.');
  };

  const stepOrder: BuilderStep[] = ['what', 'when', 'why', 'where', 'review'];
  const stepLabels: Record<BuilderStep, string> = { what: 'What?', when: 'When?', why: 'Why?', where: 'Where?', review: 'Save' };
  const currentIndex = stepOrder.indexOf(step);
  const goNext = () => setStep(stepOrder[Math.min(stepOrder.length - 1, currentIndex + 1)]);
  const goBack = () => setStep(stepOrder[Math.max(0, currentIndex - 1)]);

  const selectEventPickerItem = (item: PickerItem) => {
    if (item.id.startsWith('custom:')) {
      const eventDefinition = settings.customEvents.find(existing => `custom:${existing.id}` === item.id);
      if (eventDefinition) beginEdit(eventDefinition);
      return;
    }
    setTrigger(item.id as CustomEventBaseTrigger);
  };

  const selectConditionPickerItem = (item: PickerItem) => {
    if (item.id === 'piece') updateConditions({ pieceType: draft.conditions.pieceType === 'pawn' ? 'any' : 'pawn' });
    if (item.id === 'side') updateConditions({ team: draft.conditions.team === 'white' ? 'any' : 'white' });
    if (item.id === 'from') updateConditions({ fromSquare: draft.conditions.fromSquare || 'e2' });
    if (item.id === 'to') updateConditions({ toSquare: draft.conditions.toSquare || 'e4' });
    if (item.id === 'captured') updateConditions({ capturedPiece: draft.conditions.capturedPiece === 'queen' ? 'any' : 'queen' });
    if (item.id === 'panel') updateConditions({ panelViewId: draft.conditions.panelViewId || 'sound-editor' });
    if (item.id === 'custom') updateConditions({ complexCondition: draft.conditions.complexCondition || '' });
  };

  return (
    <div className="view-container cu-themed-embedded-view cu-view-shell cu-event-builder-view cu-scroll-area" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
        <div>
          <div style={{ color: '#e5edf7', fontSize: '1rem', fontWeight: 950 }}>Do Something Cool</div>
          <div style={helperStyle}>Creative-first event builder. Pick one thing at a time.</div>
        </div>
        <button type="button" onClick={() => toggleView('event-builder')} style={inputStyle}>Close</button>
      </div>

      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
        {stepOrder.map((item, index) => (
          <button key={item} type="button" onClick={() => setStep(item)} style={stepButtonStyle(step === item)}>
            {index + 1}. {stepLabels[item]}
          </button>
        ))}
      </div>

      {step === 'what' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={sectionTitleStyle}>What do you want to happen?</div>
            <div style={helperStyle}>Choose a featured action, or use Something Else to create/reuse a custom action.</div>
          </div>
          <PickerList
            title="Choose an action"
            helper="All action pickers use the same Featured / Saved / All / Add pattern."
            items={actionPickerItems}
            selectedId={actionKind}
            search={actionSearch}
            onSearch={setActionSearch}
            onPick={(item) => applyAction(item.id as CreativeActionKind)}
            onAddNew={() => { setCustomPanelOpen(true); setActionKind('custom'); }}
            addLabel="+ Add custom action"
          />

          {customPanelOpen && (
            <div style={{ ...cardStyle(true), cursor: 'default' }}>
              <strong>Custom action</strong>
              <div style={{ color: '#94a3b8', fontSize: '0.72rem', marginTop: 3 }}>Create the reusable action idea. Later this can be featured as a big button.</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 80px 190px', gap: 10, marginTop: 10 }}>
                <label style={fieldStyle}>Name
                  <input value={customActionName} onChange={(event) => setCustomActionName(event.target.value)} placeholder="Cat runs across screen" style={inputStyle} />
                </label>
                <label style={fieldStyle}>Icon
                  <input value={customActionIcon} onChange={(event) => setCustomActionIcon(event.target.value)} placeholder="🐈" style={inputStyle} />
                </label>
                <label style={fieldStyle}>What kind?
                  <select value={customActionFamily} onChange={(event) => setCustomActionFamily(event.target.value as ActionFamily)} style={inputStyle}>
                    <option value="visual">Something you see</option>
                    <option value="audio">Something you hear</option>
                    <option value="property">Something existing changes</option>
                  </select>
                </label>
              </div>
            </div>
          )}

          {(actionKind === 'visual-media' || customActionFamily === 'visual') && (
            <div style={{ ...cardStyle(false), cursor: 'default' }}>
              <strong>Visual type</strong>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 8, marginTop: 10 }}>
                <button type="button" onClick={() => setMediaSourceKind('file')} style={cardStyle(mediaSourceKind === 'file')}><strong>📁 Media from a file</strong><span style={{ display: 'block', color: '#94a3b8', fontSize: '0.7rem', marginTop: 4 }}>Use an image, GIF, video, or existing animation asset.</span></button>
                <button type="button" onClick={() => { setMediaSourceKind('existing-change'); setActionKind('property-change'); }} style={cardStyle(mediaSourceKind === 'existing-change')}><strong>🎨 Change something already in the game</strong><span style={{ display: 'block', color: '#94a3b8', fontSize: '0.7rem', marginTop: 4 }}>Change a registered thing’s property instead of playing media.</span></button>
              </div>
            </div>
          )}

          {actionKind === 'sound' && (
            <PickerList
              title="Choose sound media"
              helper="Pick a saved sound. Use Add new to add media in the Sound Editor later."
              items={soundPickerItems}
              selectedId={selectedSoundId}
              search={actionSearch}
              onSearch={setActionSearch}
              onPick={(item) => setSelectedSoundId(item.id)}
              onAddNew={() => setMessage('Open Sound Editor to add a new sound file.')}
              addLabel="+ Add sound"
            />
          )}

          {(actionKind === 'animation' || (actionKind === 'visual-media' && mediaSourceKind === 'file')) && (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(180px, 280px)', gap: 10 }}>
              <PickerList
                title="Choose visual media / animation"
                helper="Pick an existing animation. Custom image/video media catalog comes next."
                items={animationPickerItems}
                selectedId={selectedAnimationId}
                search={actionSearch}
                onSearch={setActionSearch}
                onPick={(item) => setSelectedAnimationId(item.id)}
                onAddNew={() => setMessage('Open Animation Builder to create a new animation.')}
                addLabel="+ Add animation"
              />
              <div style={{ ...cardStyle(false), cursor: 'default' }}>
                <strong>Preview</strong>
                <div style={{ marginTop: 10 }}><AnimationPreviewCard definition={selectedAnimation} compact /></div>
              </div>
            </div>
          )}

          {actionKind === 'property-change' && (
            <div style={{ ...cardStyle(false), cursor: 'default' }}>
              <strong>Change something already in the game</strong>
              <div style={{ color: '#94a3b8', fontSize: '0.72rem', marginTop: 3 }}>This does not process media. It changes a registered item/property, such as piece.image → another image link.</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, marginTop: 10 }}>
                {PROPERTY_TARGETS.map(target => (
                  <button key={target.id} type="button" onClick={() => setSelectedPropertyTarget(target.id)} style={cardStyle(selectedPropertyTarget === target.id)}>
                    <strong>{target.icon} {target.label}</strong>
                    <span style={{ display: 'block', color: '#94a3b8', fontSize: '0.68rem', marginTop: 4 }}>{target.description}</span>
                  </button>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginTop: 10 }}>
                <label style={fieldStyle}>Property
                  <input value={propertyName} onChange={(event) => setPropertyName(event.target.value)} placeholder="image, color, opacity" style={inputStyle} />
                </label>
                <label style={fieldStyle}>Change to
                  <input value={propertyValue} onChange={(event) => setPropertyValue(event.target.value)} placeholder="new asset id, color, value" style={inputStyle} />
                </label>
              </div>
            </div>
          )}
        </section>
      )}

      {step === 'when' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={sectionTitleStyle}>When should it happen?</div>
            <div style={helperStyle}>Choose from featured registered events, saved custom events, or search the full list.</div>
          </div>
          <PickerList
            title="Choose event"
            helper="Registered events and saved custom events appear in the same picker pattern."
            items={eventPickerItems}
            selectedId={draft.baseTrigger}
            search={eventSearch}
            onSearch={setEventSearch}
            onPick={selectEventPickerItem}
            onAddNew={() => setMessage('Custom event creation will open the registered-event form in the next pass.')}
            addLabel="+ Add event"
          />
        </section>
      )}

      {step === 'why' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={sectionTitleStyle}>Why / only if?</div>
            <div style={helperStyle}>Pick common logic conditions. Each choice reveals the appropriate control below.</div>
          </div>
          <PickerList
            title="Choose condition"
            helper="Feature common chess logic, search deeper conditions, or add custom logic."
            items={conditionPickerItems}
            selectedId=""
            search={conditionSearch}
            onSearch={setConditionSearch}
            onPick={selectConditionPickerItem}
            onAddNew={() => updateConditions({ complexCondition: draft.conditions.complexCondition || '' })}
            addLabel="+ Add condition"
          />
          <div style={{ ...cardStyle(false), cursor: 'default' }}>
            <strong>Current conditions</strong>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginTop: 10 }}>
              <label style={fieldStyle}>Piece
                <select value={draft.conditions.pieceType ?? 'any'} onChange={(event) => updateConditions({ pieceType: event.target.value })} style={inputStyle}>{PIECES.map(piece => <option key={piece.value} value={piece.value}>{piece.label}</option>)}</select>
              </label>
              <label style={fieldStyle}>Side
                <select value={draft.conditions.team ?? 'any'} onChange={(event) => updateConditions({ team: event.target.value })} style={inputStyle}>{TEAMS.map(team => <option key={team.value} value={team.value}>{team.label}</option>)}</select>
              </label>
              <label style={fieldStyle}>From
                <input value={draft.conditions.fromSquare ?? ''} onChange={(event) => updateConditions({ fromSquare: event.target.value })} placeholder="e2" style={inputStyle} />
              </label>
              <label style={fieldStyle}>To
                <input value={draft.conditions.toSquare ?? ''} onChange={(event) => updateConditions({ toSquare: event.target.value })} placeholder="e4" style={inputStyle} />
              </label>
            </div>
          </div>
        </section>
      )}

      {step === 'where' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={sectionTitleStyle}>Where should it happen?</div>
            <div style={helperStyle}>Choose where the effect belongs. Valid places can become smarter based on the action/event.</div>
          </div>
          <PickerList
            title="Choose place"
            helper="The same picker pattern can eventually list every registered screen, square, piece, and workspace region."
            items={placePickerItems}
            selectedId={String(selectedPlace)}
            search={placeSearch}
            onSearch={setPlaceSearch}
            onPick={(item) => setSelectedPlace(item.id)}
            onAddNew={() => setMessage('Custom place creation will use registered screen/item metadata in the next pass.')}
            addLabel="+ Add place"
          />
          <div style={{ ...cardStyle(false), cursor: 'default' }}>
            <strong>How should it behave?</strong>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginTop: 10 }}>
              <label style={fieldStyle}>Change style
                <select value={transitionBehavior} onChange={(event) => setTransitionBehavior(event.target.value as TransitionBehavior)} style={inputStyle}>
                  <option value="instant">Instant</option>
                  <option value="fade">Fade</option>
                  <option value="slide">Slide</option>
                  <option value="grow">Grow / shrink</option>
                  <option value="custom-animation">Custom animation</option>
                </select>
              </label>
              <label style={fieldStyle}>How long?
                <select value={durationBehavior} onChange={(event) => setDurationBehavior(event.target.value as DurationBehavior)} style={inputStyle}>
                  <option value="once">Just once</option>
                  <option value="timed">For a set time</option>
                  <option value="until-event-ends">Until the event ends</option>
                  <option value="until-replaced">Until another rule changes it</option>
                  <option value="permanent-until-reset">Permanent until reset</option>
                </select>
              </label>
              {durationBehavior === 'timed' && (
                <label style={fieldStyle}>Seconds
                  <input type="number" min={1} value={durationSeconds} onChange={(event) => setDurationSeconds(Number(event.target.value) || 1)} style={inputStyle} />
                </label>
              )}
              <label style={fieldStyle}>Afterward
                <select value={revertBehavior} onChange={(event) => setRevertBehavior(event.target.value as RevertBehavior)} style={inputStyle}>
                  <option value="revert-to-previous">Revert to previous</option>
                  <option value="keep-changed">Keep changed</option>
                  <option value="custom-revert">Custom revert</option>
                </select>
              </label>
              {actionKind === 'animation' && (
                <label style={fieldStyle}>Apply animation to
                  <select value={attachScope} onChange={(event) => setAttachScope(event.target.value as AnimationRuleScope)} style={inputStyle}>{ANIMATION_SCOPES.map(scope => <option key={scope.id} value={scope.id}>{scope.label}</option>)}</select>
                </label>
              )}
            </div>
          </div>
        </section>
      )}

      {step === 'review' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={sectionTitleStyle}>Review, test, and save</div>
            <div style={helperStyle}>The rule sentence appears here at the end so it does not distract while building.</div>
          </div>
          <div style={{ ...cardStyle(false), cursor: 'default' }}>
            <div style={{ color: '#94a3b8', fontSize: '0.66rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 950 }}>Rule preview</div>
            <div style={{ marginTop: 6, color: '#e5edf7', fontSize: '1rem', fontWeight: 900 }}>{eventSentence}</div>
            {actionKind === 'property-change' && <div style={{ color: '#7dd3fc', fontSize: '0.72rem', marginTop: 7 }}>Property change: {selectedPropertyTarget}.{propertyName || 'property'} → {propertyValue || 'new value'} · {transitionBehavior} · {durationBehavior} · {revertBehavior}</div>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 90px', gap: 10 }}>
            <label style={fieldStyle}>Name
              <input value={draft.name} onChange={(event) => {
                const name = event.target.value;
                setDraft(current => ({ ...current, name, eventId: editingId || current.eventId ? current.eventId : createEventId(name) }));
              }} placeholder={makeDefaultName()} style={inputStyle} />
            </label>
            <label style={fieldStyle}>Icon
              <input placeholder={selectedAction.icon} style={inputStyle} />
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            <label style={fieldStyle}>Test sample
              <select value={selectedSampleId} onChange={(event) => setSelectedSampleId(event.target.value)} style={inputStyle}>{SAMPLE_EVENTS.map(sample => <option key={sample.id} value={sample.id}>{sample.label}</option>)}</select>
            </label>
            {selectedSoundId && <button type="button" onClick={() => playLibrarySound(selectedSoundId)} style={{ ...inputStyle, alignSelf: 'end' }}>▶ Preview sound</button>}
            <button type="button" onClick={testEvent} style={{ ...inputStyle, alignSelf: 'end' }}>Test trigger</button>
            <button type="button" onClick={saveEvent} style={{ ...inputStyle, alignSelf: 'end', background: 'rgba(20, 83, 45, 0.72)' }}>Save and register</button>
          </div>
          {validation.length > 0 && <div style={{ color: '#fecaca', fontSize: '0.76rem' }}>{validation.join(' ')}</div>}
          {message && <div style={{ color: '#bbf7d0', fontSize: '0.76rem' }}>{message}</div>}
          {testResult && <div style={{ color: testResult.startsWith('Matched') ? '#bbf7d0' : '#fde68a', fontSize: '0.76rem' }}>{testResult}</div>}
        </section>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 4 }}>
        <button type="button" onClick={goBack} disabled={currentIndex === 0} style={inputStyle}>← Back</button>
        <button type="button" onClick={goNext} disabled={currentIndex === stepOrder.length - 1} style={inputStyle}>Next →</button>
      </div>

      <section style={{ ...cardStyle(false), cursor: 'default' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: 8 }}>
          <strong>Saved cool things</strong>
          <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>{settings.customEvents.length} registered</span>
        </div>
        <div style={{ display: 'grid', gap: 8, maxHeight: 220, overflow: 'auto' }}>
          {settings.customEvents.map(eventDefinition => {
            const status = getCustomEventStatus(eventDefinition, settings.customEvents);
            const attachedAnimationRules = settings.animationRules.filter(rule => rule.eventId === eventDefinition.eventId);
            const attachedSoundRules = soundRules.filter(rule => rule.event === eventDefinition.eventId);
            return (
              <div key={eventDefinition.id} style={{ border: '1px solid rgba(148, 163, 184, 0.14)', borderRadius: 10, padding: 9, background: 'rgba(5, 13, 25, 0.48)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <strong>{eventDefinition.name}</strong>
                  <span style={{ color: status === 'Active' ? '#bbf7d0' : '#fde68a', fontSize: '0.68rem', fontWeight: 900 }}>{status}</span>
                </div>
                <div style={{ color: '#94a3b8', fontSize: '0.68rem', marginTop: 3 }}>{eventDefinition.eventId} · {attachedSoundRules.length} sound · {attachedAnimationRules.length} animation</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 7 }}>
                  <button type="button" onClick={() => beginEdit(eventDefinition)} style={{ ...inputStyle, padding: '5px 8px', fontSize: '0.7rem' }}>Edit</button>
                  <button type="button" onClick={() => deleteCustomEvent(eventDefinition.id)} style={{ ...inputStyle, padding: '5px 8px', fontSize: '0.7rem', color: '#fecaca' }}>Delete</button>
                  {attachedAnimationRules.map(rule => <button key={rule.id} type="button" onClick={() => deleteAnimationRule(rule.id)} style={{ ...inputStyle, padding: '5px 8px', fontSize: '0.7rem' }}>Remove animation</button>)}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default EventBuilderView;
