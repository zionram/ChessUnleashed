import React, { useMemo, useState } from 'react';
import AnimationPreviewCard from '../components/animation/AnimationPreviewCard';
import { useSettings, type AnimationEventTarget, type CustomEventBaseTrigger, type CustomEventComplexCondition, type CustomEventDefinition } from '../context/SettingsContext';
import { useAudio } from '../context/AudioContext';
import { createSimulatedGameEvent, evaluateCustomEventDefinition, getCustomEventStatus, getTacticalReadinessNote, getTacticalTestHint, TACTICAL_EVENT_DESCRIPTIONS } from '../events/CustomEventRuntime';
import { eventBus } from '../events/EventBus';
import type { GameEvent } from '../events/types';

const BASE_TRIGGERS: Array<{ id: CustomEventBaseTrigger; label: string }> = [
  { id: 'afterMove', label: 'After move' },
  { id: 'pieceMoved', label: 'Piece moved' },
  { id: 'pieceCaptured', label: 'Piece captured' },
  { id: 'check', label: 'Check' },
  { id: 'checkmate', label: 'Checkmate' },
  { id: 'promotion', label: 'Promotion' },
  { id: 'gameStart', label: 'Game start' },
  { id: 'gameEnd', label: 'Game end' },
  { id: 'panelOpened', label: 'Panel opened' }
];

const COMPLEX_CONDITIONS: Array<{ id: CustomEventComplexCondition; label: string }> = [
  { id: 'pieceAttacked', label: 'Piece attacked' },
  { id: 'fork', label: 'Simple fork' },
  { id: 'pin', label: 'Pin' },
  { id: 'trappedPiece', label: 'Trapped piece' },
  { id: 'noSafeMove', label: 'No safe move' }
];

const PIECES = ['any', 'pawn', 'knight', 'bishop', 'rook', 'queen', 'king', 'custom'];
const TEAMS = ['any', 'white', 'black', 'custom'];
const ANIMATION_TARGETS: Array<{ id: AnimationEventTarget; label: string; description: string; needsMoveData?: boolean; needsCaptureData?: boolean }> = [
  { id: 'moved-piece', label: 'Moved piece', description: 'Animate the piece that caused the event.', needsMoveData: true },
  { id: 'captured-piece', label: 'Captured piece', description: 'Animate the captured piece location when capture data exists.', needsCaptureData: true },
  { id: 'source-square', label: 'Source square', description: 'Animate the square the move started from.', needsMoveData: true },
  { id: 'target-square', label: 'Target square', description: 'Animate the destination or affected square.', needsMoveData: true },
  { id: 'board', label: 'Board', description: 'Animate the whole board area. Works for most events.' }
];

const EVENT_TEMPLATES: Array<{ label: string; event: Partial<CustomEventDefinition> }> = [
  { label: 'Piece Moves', event: { name: 'Piece Moves', eventId: 'custom.piece.moves', category: 'Piece Moves', baseTrigger: 'pieceMoved', conditions: { pieceType: 'any', team: 'any' } } },
  { label: 'Piece Captured', event: { name: 'Piece Captured', eventId: 'custom.piece.captured', category: 'Captures', baseTrigger: 'pieceCaptured', conditions: { pieceType: 'any', team: 'any', capturedPiece: 'any' } } },
  { label: 'Any Check', event: { name: 'Any Check', eventId: 'custom.any.check', category: 'Game Events', baseTrigger: 'check', conditions: { pieceType: 'any', team: 'any' } } },
  { label: 'Checkmate', event: { name: 'Checkmate', eventId: 'custom.checkmate', category: 'Game Events', baseTrigger: 'checkmate', conditions: { pieceType: 'any', team: 'any' } } },
  { label: 'Promotion', event: { name: 'Promotion', eventId: 'custom.promotion', category: 'Piece Moves', baseTrigger: 'promotion', conditions: { pieceType: 'any', team: 'any' } } },
  { label: 'Panel Opened', event: { name: 'Panel Opened', eventId: 'custom.panel.opened', category: 'UI Events', baseTrigger: 'panelOpened', conditions: { panelViewId: 'sound-editor' } } },
  { label: 'Custom Sound Cue', event: { name: 'Custom Sound Cue', eventId: 'custom.sound.cue', category: 'Custom Events', baseTrigger: 'afterMove', conditions: { pieceType: 'any', team: 'any' } } },
  { label: 'Piece Attacked', event: { name: 'Piece Attacked', eventId: 'custom.piece.attacked', category: 'Tactics', baseTrigger: 'afterMove', conditions: { pieceType: 'any', team: 'any', capturedPiece: 'any', complexCondition: 'pieceAttacked' } } },
  { label: 'Queen Attacked', event: { name: 'Queen Attacked', eventId: 'custom.queen.attacked', category: 'Tactics', baseTrigger: 'afterMove', conditions: { pieceType: 'any', team: 'any', capturedPiece: 'q', complexCondition: 'pieceAttacked' } } },
  { label: 'Simple Fork', event: { name: 'Simple Fork', eventId: 'custom.simple.fork', category: 'Tactics', baseTrigger: 'afterMove', conditions: { pieceType: 'any', team: 'any', complexCondition: 'fork' } } },
  { label: 'King + Queen Fork', event: { name: 'King + Queen Fork', eventId: 'custom.king.queen.fork', category: 'Tactics', baseTrigger: 'afterMove', conditions: { pieceType: 'any', team: 'any', complexCondition: 'fork' } } }
];

const SAMPLE_EVENTS: Array<{ id: string; label: string; event: GameEvent }> = [
  { id: 'auto', label: 'Auto sample for this event', event: { type: 'move.made', payload: {}, timestamp: Date.now() } },
  { id: 'pawn-e2-e4', label: 'Pawn moves e2 to e4', event: { type: 'move.made', payload: { pieceType: 'pawn', team: 'w', from: 'e2', to: 'e4' }, timestamp: Date.now() } },
  { id: 'queen-captured', label: 'Queen captured', event: { type: 'piece.captured', payload: { pieceType: 'bishop', team: 'b', from: 'g4', to: 'd1', capturedPiece: 'queen' }, timestamp: Date.now() } },
  { id: 'king-check', label: 'King in check', event: { type: 'move.made', payload: { pieceType: 'queen', team: 'w', from: 'h5', to: 'e8', isCheck: true }, timestamp: Date.now() } },
  { id: 'checkmate', label: 'Checkmate', event: { type: 'move.made', payload: { pieceType: 'queen', team: 'w', from: 'h5', to: 'f7', isCheckmate: true }, timestamp: Date.now() } },
  { id: 'promotion', label: 'Pawn promotion', event: { type: 'move.made', payload: { pieceType: 'pawn', team: 'w', from: 'e7', to: 'e8', isPromotion: true }, timestamp: Date.now() } },
  { id: 'panel-opened', label: 'Panel opened', event: { type: 'panel.opened', payload: { panelViewId: 'sound-editor', viewId: 'sound-editor' }, timestamp: Date.now() } },
  { id: 'piece-attacked', label: 'Piece attacked', event: { type: 'move.made', payload: { pieceType: 'bishop', team: 'w', from: 'g2', to: 'd5', attackedPieces: ['q'] }, timestamp: Date.now() } },
  { id: 'queen-attacked', label: 'Queen attacked', event: { type: 'move.made', payload: { pieceType: 'rook', team: 'w', from: 'a1', to: 'a7', attackedPieces: ['q'] }, timestamp: Date.now() } },
  { id: 'simple-fork', label: 'Simple fork', event: { type: 'move.made', payload: { pieceType: 'knight', team: 'w', from: 'e5', to: 'f7', attackedPieces: ['k', 'q'], forkTargets: ['k', 'q'], isSimpleFork: true }, timestamp: Date.now() } }
];

const createEventId = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '') || `custom.event.${Date.now().toString(36)}`;

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

const mergeTemplate = (template: Partial<CustomEventDefinition>): CustomEventDefinition => ({
  ...createBlankEvent(),
  ...template,
  id: `event-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
  conditions: {
    ...createBlankEvent().conditions,
    ...template.conditions
  }
});

const validateEvent = (eventDefinition: CustomEventDefinition, existing: CustomEventDefinition[], editingId: string | null) => {
  const messages: string[] = [];
  if (!eventDefinition.name.trim()) messages.push('Event name is required.');
  if (!eventDefinition.eventId.trim()) messages.push('Event ID is required.');
  if (!eventDefinition.baseTrigger) messages.push('Choose a base trigger.');
  if (eventDefinition.conditions.complexCondition && !['pieceAttacked', 'fork'].includes(eventDefinition.conditions.complexCondition)) {
    messages.push('This tactical condition is coming later.');
  }
  if (existing.some(item => item.id !== editingId && item.eventId.trim() === eventDefinition.eventId.trim())) {
    messages.push('Event ID must be unique.');
  }
  return messages;
};

const isUnset = (value?: string) => !value || value === 'any';

const getConditionSummaries = (eventDefinition: CustomEventDefinition) => {
  const conditions = eventDefinition.conditions;
  const summaries: Array<{ key: keyof CustomEventDefinition['conditions']; text: string }> = [];
  if (!isUnset(conditions.pieceType)) summaries.push({ key: 'pieceType', text: `Piece is ${conditions.pieceType}` });
  if (!isUnset(conditions.team)) summaries.push({ key: 'team', text: `Team is ${conditions.team}` });
  if (conditions.fromSquare) summaries.push({ key: 'fromSquare', text: `From square is ${conditions.fromSquare}` });
  if (conditions.toSquare) summaries.push({ key: 'toSquare', text: `Target square is ${conditions.toSquare}` });
  if (!isUnset(conditions.capturedPiece)) summaries.push({ key: 'capturedPiece', text: `Captured or attacked piece is ${conditions.capturedPiece}` });
  if (conditions.panelViewId) summaries.push({ key: 'panelViewId', text: `Panel opened is ${conditions.panelViewId}` });
  if (conditions.complexCondition) summaries.push({ key: 'complexCondition', text: `Tactical condition is ${conditions.complexCondition}` });
  return summaries;
};

const getStatusStyle = (status: string): React.CSSProperties => ({
  padding: '2px 7px',
  borderRadius: 999,
  fontSize: '0.64rem',
  fontWeight: 900,
  background: status === 'Active' ? '#dcfce7' : status === 'Future-only' ? '#fffbeb' : '#fef2f2',
  color: status === 'Active' ? '#166534' : status === 'Future-only' ? '#92400e' : '#b42318'
});

const getTargetDataWarning = (eventDefinition: CustomEventDefinition, target: AnimationEventTarget) => {
  const targetInfo = ANIMATION_TARGETS.find(item => item.id === target);
  if (!targetInfo) return '';
  if (targetInfo.needsCaptureData && eventDefinition.baseTrigger !== 'pieceCaptured') {
    return 'This target needs capture data. If the event payload has no captured piece, the animation falls back safely.';
  }
  if (targetInfo.needsMoveData && !['afterMove', 'pieceMoved', 'pieceCaptured', 'promotion', 'check', 'checkmate'].includes(eventDefinition.baseTrigger)) {
    return 'This target needs move-square data. If the event payload has no squares, the animation falls back safely.';
  }
  return '';
};

const EventBuilderView: React.FC = () => {
  const { settings, toggleView, createCustomEvent, updateCustomEvent, deleteCustomEvent, createAnimationRule, deleteAnimationRule } = useSettings();
  const { rules: soundRules } = useAudio();
  const [draft, setDraft] = useState<CustomEventDefinition>(() => createBlankEvent());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeLayer, setActiveLayer] = useState<'simple' | 'advanced' | 'system'>('simple');
  const [message, setMessage] = useState('');
  const [testResult, setTestResult] = useState('');
  const [selectedSampleId, setSelectedSampleId] = useState('auto');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [triggerFilter, setTriggerFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [attachAnimationId, setAttachAnimationId] = useState(settings.animationDefinitions[0]?.id ?? '');
  const [attachTarget, setAttachTarget] = useState<AnimationEventTarget>('target-square');
  const validation = useMemo(() => validateEvent(draft, settings.customEvents, editingId), [draft, settings.customEvents, editingId]);
  const draftStatus = getCustomEventStatus(draft, settings.customEvents);
  const draftSavedEvent = settings.customEvents.find(eventDefinition => eventDefinition.id === editingId || eventDefinition.eventId === draft.eventId);
  const draftConditionSummaries = getConditionSummaries(draft);
  const attachTargetWarning = getTargetDataWarning(draft, attachTarget);
  const selectedAttachAnimation = settings.animationDefinitions.find(animation => animation.id === attachAnimationId);
  const categories = useMemo(() => ['All', ...Array.from(new Set(settings.customEvents.map(eventDefinition => eventDefinition.category || 'Custom Events')))], [settings.customEvents]);
  const visibleEvents = useMemo(() => settings.customEvents.filter(eventDefinition => {
    const status = getCustomEventStatus(eventDefinition, settings.customEvents);
    const search = searchTerm.trim().toLowerCase();
    return (!search || `${eventDefinition.name} ${eventDefinition.eventId}`.toLowerCase().includes(search)) &&
      (statusFilter === 'All' || status === statusFilter) &&
      (triggerFilter === 'All' || eventDefinition.baseTrigger === triggerFilter) &&
      (categoryFilter === 'All' || eventDefinition.category === categoryFilter);
  }), [settings.customEvents, searchTerm, statusFilter, triggerFilter, categoryFilter]);

  const beginCreate = () => {
    setDraft(createBlankEvent());
    setEditingId(null);
    setMessage('');
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
    setMessage('');
  };

  const useTemplate = (template: Partial<CustomEventDefinition>) => {
    setDraft(mergeTemplate(template));
    setEditingId(null);
    setMessage('');
    setTestResult('');
    setActiveLayer('simple');
  };

  const saveEvent = () => {
    if (validation.length) {
      setMessage(validation[0]);
      return;
    }
    if (editingId) updateCustomEvent(editingId, draft);
    else createCustomEvent(draft);
    setMessage(editingId ? 'Custom event updated.' : 'Custom event created.');
    beginCreate();
  };

  const testEvent = () => {
    const selectedSample = SAMPLE_EVENTS.find(sample => sample.id === selectedSampleId);
    const simulatedEvent = selectedSampleId === 'auto' ? createSimulatedGameEvent(draft) : (selectedSample?.event ?? createSimulatedGameEvent(draft));
    const result = evaluateCustomEventDefinition(draft, simulatedEvent);
    const conditionText = draftConditionSummaries.length
      ? ` Conditions checked: ${draftConditionSummaries.map(item => item.text).join('; ')}.`
      : ' No extra filters were set.';
    setTestResult(result.matched
      ? `Matched ${simulatedEvent.type}.${conditionText}`
      : `Not matched: ${result.reason}${result.missingData.length ? ` Missing: ${result.missingData.join(', ')}.` : ''}${result.unsupported.length ? ` ${result.unsupported.join(' ')}` : ''}${conditionText}`
    );
    if (result.matched) {
      eventBus.emit({
        type: 'custom.event',
        payload: {
          eventId: draft.eventId || 'unsaved.custom.event',
          name: draft.name || 'Unsaved Custom Event',
          summary: `Custom Event: ${draft.name || 'Unsaved Custom Event'}`,
          sourceEvent: simulatedEvent.type,
          simulated: true
        }
      });
    }
  };

  const updateConditions = (updates: Partial<CustomEventDefinition['conditions']>) => {
    setDraft({ ...draft, conditions: { ...draft.conditions, ...updates } });
  };

  const clearCondition = (key: keyof CustomEventDefinition['conditions']) => {
    const fallback: Partial<CustomEventDefinition['conditions']> = {
      pieceType: 'any',
      team: 'any',
      fromSquare: '',
      toSquare: '',
      capturedPiece: 'any',
      panelViewId: '',
      complexCondition: ''
    };
    updateConditions({ [key]: fallback[key] } as Partial<CustomEventDefinition['conditions']>);
  };

  const copyEventJson = async () => {
    const json = JSON.stringify(draft, null, 2);
    try {
      await navigator.clipboard.writeText(json);
      setMessage('Copied event JSON.');
    } catch {
      setMessage('Copy failed. Select and copy the JSON manually.');
    }
  };

  const attachAnimationToEvent = (eventDefinition: CustomEventDefinition) => {
    const status = getCustomEventStatus(eventDefinition, settings.customEvents);
    const savedEvent = settings.customEvents.find(item => item.id === eventDefinition.id || item.eventId === eventDefinition.eventId);
    if (!savedEvent) {
      setMessage('Save this custom event before attaching an animation.');
      return;
    }
    if (status !== 'Active') {
      setMessage('Only active custom events can call animations.');
      return;
    }
    if (!attachAnimationId) {
      setMessage('Choose an animation first.');
      return;
    }
    createAnimationRule({
      id: `anim-rule-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      eventId: eventDefinition.eventId,
      animationId: attachAnimationId,
      target: attachTarget,
      enabled: true
    });
    setMessage(`Animation attached to ${eventDefinition.name}.`);
  };

  const attachSoundToEvent = (eventDefinition: CustomEventDefinition) => {
    const status = getCustomEventStatus(eventDefinition, settings.customEvents);
    if (status !== 'Active') {
      setMessage('Only active custom events can reliably trigger sound rules.');
      return;
    }
    setMessage(`Sound Editor opened. Choose Custom Events, then select ${eventDefinition.name}.`);
    toggleView('sound-editor');
  };

  const commonFieldStyle: React.CSSProperties = { padding: 8, border: '1px solid #d0d7de', borderRadius: 6 };
  const layerButtonStyle = (layer: typeof activeLayer): React.CSSProperties => ({
    flex: '1 1 90px',
    padding: '8px 10px',
    borderRadius: 8,
    border: activeLayer === layer ? '1px solid #2c3e50' : '1px solid #d0d7de',
    background: activeLayer === layer ? '#2c3e50' : '#fff',
    color: activeLayer === layer ? '#fff' : '#2c3e50',
    cursor: 'pointer',
    fontWeight: 800
  });

  const conditionGrid = (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: '0.75rem', color: '#475569' }}>
        Piece Type
        <select value={draft.conditions.pieceType ?? 'any'} onChange={(event) => updateConditions({ pieceType: event.target.value })} style={commonFieldStyle}>
          {PIECES.map(piece => <option key={piece} value={piece}>{piece}</option>)}
        </select>
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: '0.75rem', color: '#475569' }}>
        Team
        <select value={draft.conditions.team ?? 'any'} onChange={(event) => updateConditions({ team: event.target.value })} style={commonFieldStyle}>
          {TEAMS.map(team => <option key={team} value={team}>{team}</option>)}
        </select>
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: '0.75rem', color: '#475569' }}>
        From Square
        <input value={draft.conditions.fromSquare ?? ''} onChange={(event) => updateConditions({ fromSquare: event.target.value })} placeholder="e2" style={commonFieldStyle} />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: '0.75rem', color: '#475569' }}>
        To Square / Target Square
        <input value={draft.conditions.toSquare ?? ''} onChange={(event) => updateConditions({ toSquare: event.target.value })} placeholder="e4" style={commonFieldStyle} />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: '0.75rem', color: '#475569' }}>
        Captured / Attacked Piece
        <input value={draft.conditions.capturedPiece ?? ''} onChange={(event) => updateConditions({ capturedPiece: event.target.value })} placeholder="any, queen, custom id" style={commonFieldStyle} />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: '0.75rem', color: '#475569' }}>
        Panel / View ID
        <input value={draft.conditions.panelViewId ?? ''} onChange={(event) => updateConditions({ panelViewId: event.target.value })} placeholder="sound-editor" style={commonFieldStyle} />
      </label>
    </div>
  );

  return (
    <div className="view-container" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => setActiveLayer('simple')} style={layerButtonStyle('simple')}>Simple</button>
        <button type="button" onClick={() => setActiveLayer('advanced')} style={layerButtonStyle('advanced')}>Advanced</button>
        <button type="button" onClick={() => setActiveLayer('system')} style={layerButtonStyle('system')}>System</button>
      </div>

      {activeLayer === 'simple' && (
        <>
      <section style={{ padding: 12, border: '1px solid #d0d7de', borderRadius: 8, background: '#fff' }}>
        <div style={{ fontWeight: 900, color: '#2c3e50', marginBottom: 4 }}>1. Choose Event Type</div>
        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 8 }}>
          Start with a common event, then rename it and add only the filters you need.
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {EVENT_TEMPLATES.map(template => (
            <button key={template.label} type="button" onClick={() => useTemplate(template.event)} style={{ padding: '7px 10px', borderRadius: 999, border: '1px solid #d0d7de', background: '#f8fafc', color: '#2c3e50', cursor: 'pointer', fontSize: '0.74rem', fontWeight: 700 }}>
              {template.label}
            </button>
          ))}
        </div>
      </section>

      <section style={{ padding: 12, border: '1px solid #d0d7de', borderRadius: 8, background: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginBottom: 10 }}>
          <div>
            <div style={{ fontWeight: 900, color: '#2c3e50' }}>2. Name Event</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>This is the name shown in Sound Rules and the Event Log.</div>
          </div>
          <button type="button" onClick={beginCreate} style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #d0d7de', background: '#fff', cursor: 'pointer' }}>
            New Event
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: '0.75rem', color: '#475569' }}>
            Event Name
            <input
              value={draft.name}
              onChange={(event) => {
                const name = event.target.value;
                setDraft({ ...draft, name, eventId: editingId || draft.eventId ? draft.eventId : createEventId(name) });
              }}
              style={commonFieldStyle}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: '0.75rem', color: '#475569' }}>
            Category
            <input value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} style={commonFieldStyle} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: '0.75rem', color: '#475569' }}>
            Base Trigger
            <select value={draft.baseTrigger} onChange={(event) => setDraft({ ...draft, baseTrigger: event.target.value as CustomEventBaseTrigger })} style={commonFieldStyle}>
              <option value="">Choose trigger</option>
              {BASE_TRIGGERS.map(trigger => <option key={trigger.id} value={trigger.id}>{trigger.label}</option>)}
            </select>
          </label>
        </div>
      </section>

      <section style={{ padding: 12, border: '1px solid #d0d7de', borderRadius: 8, background: '#f8fafc' }}>
        <div style={{ fontWeight: 900, color: '#2c3e50', marginBottom: 4 }}>3. Choose Common Filters</div>
        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 8 }}>
          Leave fields as any or blank when the event should match broadly.
        </div>
        {conditionGrid}
      </section>
        </>
      )}

      {activeLayer === 'advanced' && (
        <>
      <section style={{ padding: 12, border: '1px solid #d0d7de', borderRadius: 8, background: '#fff' }}>
        <div style={{ fontWeight: 900, color: '#2c3e50', marginBottom: 4 }}>Condition Builder</div>
        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 8 }}>
          Choose whether every active condition must pass, or whether any one condition is enough.
        </div>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.75rem', color: '#475569', marginBottom: 10 }}>
          Condition Group
          <select value={draft.conditionMode ?? 'all'} onChange={(event) => setDraft({ ...draft, conditionMode: event.target.value as 'all' | 'any' })} style={commonFieldStyle}>
            <option value="all">ALL conditions match</option>
            <option value="any">ANY condition matches</option>
          </select>
        </label>
        {conditionGrid}
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontWeight: 800, color: '#2c3e50', fontSize: '0.78rem' }}>
            Active condition summary ({draft.conditionMode === 'any' ? 'ANY can match' : 'ALL must match'})
          </div>
          {draftConditionSummaries.length > 0 ? draftConditionSummaries.map(summary => (
            <div key={summary.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '6px 8px', border: '1px solid #e2e8f0', borderRadius: 6, background: '#f8fafc', fontSize: '0.72rem' }}>
              <span>{summary.text}</span>
              <button type="button" onClick={() => clearCondition(summary.key)} style={{ padding: '3px 7px', borderRadius: 6, border: '1px solid #d0d7de', background: '#fff', cursor: 'pointer', fontSize: '0.65rem' }}>
                Remove
              </button>
            </div>
          )) : (
            <div style={{ padding: '6px 8px', border: '1px dashed #cbd5e1', borderRadius: 6, color: '#64748b', fontSize: '0.72rem' }}>
              No extra conditions. This event matches any payload with the selected base trigger.
            </div>
          )}
        </div>
        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 8 }}>
          Trigger type is controlled by Base Trigger in the Simple layer. Supported condition fields are evaluated by the current runtime.
        </div>
      </section>

      <section style={{ padding: 12, border: '1px dashed #f59e0b', borderRadius: 8, background: '#fffbeb', color: '#92400e' }}>
        <div style={{ fontWeight: 900, marginBottom: 6 }}>Future Tactical Conditions</div>
        <select value={draft.conditions.complexCondition ?? ''} onChange={(event) => updateConditions({ complexCondition: event.target.value as CustomEventComplexCondition | '' })} style={{ padding: 8, border: '1px solid #fcd34d', borderRadius: 6, width: '100%' }}>
          <option value="">None</option>
          {COMPLEX_CONDITIONS.map(condition => <option key={condition.id} value={condition.id} disabled={!['pieceAttacked', 'fork'].includes(condition.id)}>{condition.label}{['pieceAttacked', 'fork'].includes(condition.id) ? ' - Active' : ' - Future detection'}</option>)}
        </select>
        <div style={{ fontSize: '0.75rem', marginTop: 6 }}>{getTacticalReadinessNote(draft)}</div>
        <div style={{ fontSize: '0.75rem', marginTop: 4 }}>How to test: {getTacticalTestHint(draft)}</div>
      </section>
        </>
      )}

      {activeLayer === 'system' && (
        <section style={{ padding: 12, border: '1px solid #d0d7de', borderRadius: 8, background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <div>
              <div style={{ fontWeight: 900, color: '#2c3e50' }}>System Preview</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Raw event definition, runtime status, diagnostics, and test payload details.</div>
            </div>
            <button type="button" onClick={copyEventJson} style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #d0d7de', background: '#fff', cursor: 'pointer' }}>
              Copy Event JSON
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            <div style={{ padding: 8, border: '1px solid #e2e8f0', borderRadius: 6, background: '#f8fafc', fontSize: '0.75rem' }}>
              <strong>Event ID</strong>
              <div>{draft.eventId || '(missing)'}</div>
            </div>
            <div style={{ padding: 8, border: '1px solid #e2e8f0', borderRadius: 6, background: '#f8fafc', fontSize: '0.75rem' }}>
              <strong>Runtime Status</strong>
              <div style={{ marginTop: 4 }}><span style={getStatusStyle(draftStatus)}>{draftStatus}</span></div>
            </div>
            <div style={{ padding: 8, border: '1px solid #e2e8f0', borderRadius: 6, background: '#f8fafc', fontSize: '0.75rem' }}>
              <strong>Validation</strong>
              <div>{validation.length ? validation.join(' ') : 'Event definition looks valid.'}</div>
            </div>
            <div style={{ padding: 8, border: '1px solid #e2e8f0', borderRadius: 6, background: '#f8fafc', fontSize: '0.75rem' }}>
              <strong>Test Payload</strong>
              <div>{selectedSampleId === 'auto' ? 'Generated from current definition.' : SAMPLE_EVENTS.find(sample => sample.id === selectedSampleId)?.label}</div>
            </div>
          </div>
          <div style={{ marginBottom: 8, padding: 8, borderRadius: 6, border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '0.72rem', color: '#475569' }}>
            Raw editing is read-only here. Use Simple and Advanced to change the event definition safely.
          </div>
          <pre style={{ margin: 0, padding: 10, maxHeight: 260, overflow: 'auto', borderRadius: 6, background: '#0f172a', color: '#e2e8f0', fontSize: '0.68rem' }}>
            {JSON.stringify(draft, null, 2)}
          </pre>
        </section>
      )}

      {message && <div style={{ color: validation.length ? '#b42318' : '#166534', fontSize: '0.78rem' }}>{message}</div>}
      {testResult && (
        <div style={{ padding: '8px 10px', borderRadius: 6, border: `1px solid ${testResult.startsWith('Matched') ? '#bbf7d0' : '#fde68a'}`, background: testResult.startsWith('Matched') ? '#f0fdf4' : '#fffbeb', color: testResult.startsWith('Matched') ? '#166534' : '#92400e', fontSize: '0.78rem' }}>
          {testResult}
        </div>
      )}
      {validation.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: 18, color: '#b42318', fontSize: '0.75rem' }}>
          {validation.map(item => <li key={item}>{item}</li>)}
        </ul>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: '0.75rem', color: '#475569' }}>
          Test Sample
          <select value={selectedSampleId} onChange={(event) => setSelectedSampleId(event.target.value)} style={{ padding: 8, border: '1px solid #d0d7de', borderRadius: 6 }}>
            {SAMPLE_EVENTS.map(sample => <option key={sample.id} value={sample.id}>{sample.label}</option>)}
          </select>
        </label>
        <button type="button" onClick={saveEvent} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #2c3e50', background: '#2c3e50', color: '#fff', cursor: 'pointer', fontWeight: 900 }}>
          {editingId ? 'Save Custom Event' : 'Create Event'}
        </button>
      </div>
      <button type="button" onClick={testEvent} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #d0d7de', background: '#fff', color: '#2c3e50', cursor: 'pointer', fontWeight: 900 }}>
        Test Event
      </button>

      <section style={{ padding: 12, border: '1px solid #d0d7de', borderRadius: 8, background: '#fff' }}>
        <div style={{ fontWeight: 900, color: '#2c3e50', marginBottom: 4 }}>Attach Animation</div>
        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 8 }}>
          Active events can call named Animation Builder definitions. Future-only or invalid events are blocked.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <select value={attachAnimationId} onChange={(event) => setAttachAnimationId(event.target.value)} style={commonFieldStyle}>
            {settings.animationDefinitions.filter(animation => animation.enabled).map(animation => (
              <option key={animation.id} value={animation.id}>{animation.name}</option>
            ))}
          </select>
          <select value={attachTarget} onChange={(event) => setAttachTarget(event.target.value as AnimationEventTarget)} style={commonFieldStyle}>
            {ANIMATION_TARGETS.map(target => <option key={target.id} value={target.id}>{target.label}</option>)}
          </select>
        </div>
        <div style={{ marginTop: 8, padding: 8, border: '1px solid #e2e8f0', borderRadius: 6, background: '#f8fafc', color: '#475569', fontSize: '0.72rem' }}>
          <strong>{ANIMATION_TARGETS.find(target => target.id === attachTarget)?.label}:</strong>{' '}
          {ANIMATION_TARGETS.find(target => target.id === attachTarget)?.description}
          {attachTargetWarning && <div style={{ marginTop: 4, color: '#92400e' }}>{attachTargetWarning}</div>}
        </div>
        <div style={{ marginTop: 8 }}>
          <AnimationPreviewCard definition={selectedAttachAnimation} compact />
        </div>
        <button
          type="button"
          onClick={() => attachAnimationToEvent(draft)}
          disabled={draftStatus !== 'Active' || !draftSavedEvent}
          style={{ marginTop: 8, width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #2c3e50', background: draftStatus === 'Active' && draftSavedEvent ? '#2c3e50' : '#94a3b8', color: '#fff', cursor: draftStatus === 'Active' && draftSavedEvent ? 'pointer' : 'not-allowed', fontWeight: 900 }}
        >
          {draftSavedEvent ? 'Attach Animation to Current Event' : 'Save Event Before Attaching'}
        </button>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontWeight: 900, color: '#2c3e50' }}>Custom Events</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.8fr 0.8fr 0.8fr', gap: 6 }}>
          <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search events" style={{ padding: 7, border: '1px solid #d0d7de', borderRadius: 6 }} />
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} style={{ padding: 7, border: '1px solid #d0d7de', borderRadius: 6 }}>
            {categories.map(category => <option key={category} value={category}>{category}</option>)}
          </select>
          <select value={triggerFilter} onChange={(event) => setTriggerFilter(event.target.value)} style={{ padding: 7, border: '1px solid #d0d7de', borderRadius: 6 }}>
            <option value="All">All triggers</option>
            {BASE_TRIGGERS.map(trigger => <option key={trigger.id} value={trigger.id}>{trigger.label}</option>)}
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} style={{ padding: 7, border: '1px solid #d0d7de', borderRadius: 6 }}>
            {['All', 'Active', 'Invalid', 'Future-only'].map(status => <option key={status} value={status}>{status}</option>)}
          </select>
        </div>
        {visibleEvents.map(eventDefinition => {
          const status = getCustomEventStatus(eventDefinition, settings.customEvents);
          const attachedAnimationRules = settings.animationRules.filter(rule => rule.eventId === eventDefinition.eventId);
          const attachedSoundRules = soundRules.filter(rule => rule.event === eventDefinition.eventId);
          return (
          <div key={eventDefinition.id} style={{ padding: 10, border: '1px solid #d0d7de', borderRadius: 8, background: '#fff', display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 800, color: '#2c3e50' }}>{eventDefinition.name}</span>
                <span style={getStatusStyle(status)}>{status}</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{eventDefinition.category} - {eventDefinition.baseTrigger || 'No trigger'} - {eventDefinition.eventId}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                <span style={{ padding: '2px 6px', borderRadius: 999, background: '#eff6ff', color: '#1d4ed8', fontSize: '0.68rem', fontWeight: 800 }}>
                  {attachedSoundRules.length} sound rule{attachedSoundRules.length === 1 ? '' : 's'}
                </span>
                <span style={{ padding: '2px 6px', borderRadius: 999, background: '#eef2ff', color: '#3730a3', fontSize: '0.68rem', fontWeight: 800 }}>
                  {attachedAnimationRules.length} animation rule{attachedAnimationRules.length === 1 ? '' : 's'}
                </span>
              </div>
              {eventDefinition.conditions.complexCondition && (
                <div style={{ fontSize: '0.72rem', color: ['pieceAttacked', 'fork'].includes(eventDefinition.conditions.complexCondition) ? '#166534' : '#92400e' }}>
                  {TACTICAL_EVENT_DESCRIPTIONS[eventDefinition.conditions.complexCondition] ?? `Uses tactical condition: ${eventDefinition.conditions.complexCondition}`}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button type="button" disabled={status !== 'Active'} onClick={() => attachSoundToEvent(eventDefinition)} title={status === 'Active' ? 'Open Sound Editor for this event' : 'Only active events can attach working sound rules'} style={{ padding: '6px 9px', borderRadius: 6, border: '1px solid #d0d7de', background: status === 'Active' ? '#fff' : '#f1f5f9', cursor: status === 'Active' ? 'pointer' : 'not-allowed' }}>Attach Sound</button>
              <button type="button" disabled={status !== 'Active'} onClick={() => attachAnimationToEvent(eventDefinition)} style={{ padding: '6px 9px', borderRadius: 6, border: '1px solid #d0d7de', background: status === 'Active' ? '#fff' : '#f1f5f9', cursor: status === 'Active' ? 'pointer' : 'not-allowed' }}>Attach Animation</button>
              <button type="button" onClick={() => {
                beginEdit(eventDefinition);
                setSelectedSampleId('auto');
                setTimeout(() => {
                  const simulatedEvent = createSimulatedGameEvent(eventDefinition);
                  const result = evaluateCustomEventDefinition(eventDefinition, simulatedEvent);
                  const summaries = getConditionSummaries(eventDefinition);
                  setTestResult(result.matched
                    ? `Matched ${simulatedEvent.type}.${summaries.length ? ` Conditions checked: ${summaries.map(item => item.text).join('; ')}.` : ' No extra filters were set.'}`
                    : `Not matched: ${result.reason}`
                  );
                }, 0);
              }} style={{ padding: '6px 9px', borderRadius: 6, border: '1px solid #d0d7de', background: '#fff', cursor: 'pointer' }}>Test</button>
              <button type="button" onClick={() => beginEdit(eventDefinition)} style={{ padding: '6px 9px', borderRadius: 6, border: '1px solid #d0d7de', background: '#fff', cursor: 'pointer' }}>Edit</button>
              <button type="button" onClick={() => deleteCustomEvent(eventDefinition.id)} style={{ padding: '6px 9px', borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', color: '#b42318', cursor: 'pointer' }}>Delete</button>
            </div>
            {attachedAnimationRules.length > 0 && (
              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {attachedAnimationRules.map(rule => {
                  const animation = settings.animationDefinitions.find(item => item.id === rule.animationId);
                  return (
                    <div key={rule.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', padding: '5px 7px', borderRadius: 6, background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '0.68rem' }}>
                      <span>{animation?.name ?? rule.animationId} -&gt; {ANIMATION_TARGETS.find(target => target.id === rule.target)?.label ?? rule.target}</span>
                      <button type="button" onClick={() => deleteAnimationRule(rule.id)} style={{ border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b', borderRadius: 6, cursor: 'pointer' }}>Remove</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );})}
        {!visibleEvents.length && <div style={{ padding: 10, border: '1px dashed #cbd5e1', borderRadius: 8, color: '#64748b', fontSize: '0.8rem' }}>No custom events match this filter.</div>}
      </section>
    </div>
  );
};

export default EventBuilderView;
