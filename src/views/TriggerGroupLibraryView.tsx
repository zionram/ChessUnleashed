import React, { useMemo, useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useAudio } from '../context/AudioContext';
import { summarizeTriggerGroup, type TriggerAction, type TriggerGroup } from '../events/TriggerGroups';
import { ACTION_TEMPLATES, makeCatalogAction, makeTriggerId } from '../events/EventCatalog';

const shellStyle: React.CSSProperties = {
  width: '100%',
  maxHeight: '100%',
  overflowY: 'auto',
  padding: 14,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  boxSizing: 'border-box',
  color: '#e2e8f0',
};

const cardStyle: React.CSSProperties = {
  border: '1px solid rgba(148, 163, 184, 0.18)',
  background: 'rgba(8, 18, 34, 0.84)',
  borderRadius: 14,
  padding: 12,
  boxShadow: '0 14px 30px rgba(2, 6, 23, 0.26)',
  boxSizing: 'border-box',
};

const buttonStyle: React.CSSProperties = {
  border: '1px solid rgba(148, 163, 184, 0.24)',
  background: 'rgba(15, 23, 42, 0.72)',
  color: '#dbeafe',
  borderRadius: 9,
  padding: '7px 10px',
  cursor: 'pointer',
  fontWeight: 800,
  fontSize: '0.74rem',
};

const primaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  borderColor: 'rgba(96, 165, 250, 0.5)',
  background: 'rgba(37, 99, 235, 0.7)',
  color: '#eff6ff',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid rgba(148, 163, 184, 0.22)',
  background: 'rgba(2, 6, 23, 0.5)',
  color: '#e2e8f0',
  borderRadius: 8,
  padding: '7px 8px',
  fontSize: '0.76rem',
};

const mutedStyle: React.CSSProperties = {
  color: '#8aa2bd',
  fontSize: '0.74rem',
  lineHeight: 1.35,
};

const pillStyle = (active = false): React.CSSProperties => ({
  border: `1px solid ${active ? 'rgba(96, 165, 250, 0.55)' : 'rgba(148, 163, 184, 0.18)'}`,
  background: active ? 'rgba(37, 99, 235, 0.28)' : 'rgba(15, 23, 42, 0.62)',
  color: active ? '#bfdbfe' : '#cbd5e1',
  borderRadius: 999,
  padding: '4px 8px',
  fontSize: '0.68rem',
  fontWeight: 850,
  display: 'inline-flex',
  gap: 5,
  alignItems: 'center',
});

const actionIcon = (action: TriggerAction) => {
  if (action.type === 'audio' || action.type === 'sound') return '🔊';
  if (action.type === 'animation') return '✨';
  if (action.type === 'message') return '💬';
  if (action.type === 'ui') return '🎨';
  return '⚡';
};

const TriggerGroupLibraryView: React.FC = () => {
  const { settings, createTriggerGroup, updateTriggerGroup, deleteTriggerGroup } = useSettings();
  const { library, playLibrarySound, stopPreview } = useAudio();
  const groups = settings.triggerGroups ?? [];
  const [search, setSearch] = useState('');
  const [actionTargetId, setActionTargetId] = useState<string | null>(null);
  const [quickActionType, setQuickActionType] = useState('audio');
  const [quickActionKey, setQuickActionKey] = useState('');

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return groups;
    return groups.filter(group => [
      group.metadata?.name,
      group.metadata?.summary,
      group.metadata?.category,
      group.trigger.event,
      ...(group.metadata?.keywords ?? []),
      ...(group.metadata?.tags ?? []),
      ...group.actions.map(action => `${action.type} ${action.key} ${action.label ?? ''}`),
    ].filter(Boolean).join(' ').toLowerCase().includes(term));
  }, [groups, search]);

  const toggleGroup = (group: TriggerGroup) => updateTriggerGroup(group.id, { enabled: !group.enabled });
  const toggleFavorite = (group: TriggerGroup) => updateTriggerGroup(group.id, { metadata: { ...group.metadata, favorite: !group.metadata?.favorite } });
  const toggleAction = (group: TriggerGroup, action: TriggerAction) => updateTriggerGroup(group.id, {
    actions: group.actions.map(item => item.id === action.id ? { ...item, enabled: item.enabled === false } : item),
  });

  const duplicateGroup = (group: TriggerGroup) => {
    createTriggerGroup({
      ...group,
      id: makeTriggerId('trigger-group'),
      enabled: false,
      metadata: {
        ...group.metadata,
        name: `${group.metadata?.name || group.trigger.event} Copy`,
        source: 'user',
      },
      actions: group.actions.map(action => ({ ...action, id: makeTriggerId('action') })),
      trigger: {
        ...group.trigger,
        conditions: (group.trigger.conditions ?? []).map(condition => ({ ...condition, id: makeTriggerId('condition') })),
      },
    });
  };

  const addQuickAction = (group: TriggerGroup) => {
    const template = ACTION_TEMPLATES.find(action => action.type === quickActionType) ?? ACTION_TEMPLATES[0];
    const soundName = library.find(sound => sound.id === quickActionKey)?.name;
    const action = {
      ...makeCatalogAction(template),
      key: quickActionKey || template.defaultKey,
      label: soundName || template.defaultLabel,
    };
    updateTriggerGroup(group.id, { actions: [...group.actions, action] });
    setActionTargetId(null);
    setQuickActionKey('');
  };

  const previewAction = (action: TriggerAction) => {
    if (action.type === 'audio' && action.key) playLibrarySound(action.key);
  };

  return (
    <div style={shellStyle}>
      <header style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <div style={{ color: '#f8fafc', fontWeight: 950, fontSize: '1.08rem' }}>Trigger Groups</div>
          <div style={mutedStyle}>Manage reusable triggers, grouped actions, previews, favorites, and inactive rules.</div>
        </div>
      </header>

      <section style={cardStyle}>
        <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search triggers, pieces, sounds, animations..." style={inputStyle} />
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
        {filtered.map(group => (
          <article key={group.id} style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 7, alignItems: 'center', color: '#f8fafc', fontWeight: 950 }}>
                  <span>{group.metadata?.icon ?? '✨'}</span>
                  <span>{group.metadata?.name || group.trigger.event}</span>
                  {group.metadata?.favorite && <span style={pillStyle(true)}>★</span>}
                </div>
                <div style={{ ...mutedStyle, marginTop: 5 }}>{summarizeTriggerGroup(group)}</div>
              </div>
              <button type="button" onClick={() => toggleFavorite(group)} style={buttonStyle}>{group.metadata?.favorite ? '★' : '☆'}</button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <span style={pillStyle(group.enabled)}>{group.enabled ? 'On' : 'Off'}</span>
              <span style={pillStyle()}>{group.trigger.event}</span>
              <span style={pillStyle()}>{group.actions.length} action{group.actions.length === 1 ? '' : 's'}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {group.actions.map(action => (
                <div key={action.id} style={{ border: '1px solid rgba(148, 163, 184, 0.14)', background: 'rgba(15, 23, 42, 0.48)', borderRadius: 10, padding: 8, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto auto', gap: 6, alignItems: 'center' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 850, color: action.enabled === false ? '#94a3b8' : '#e2e8f0', fontSize: '0.76rem' }}>{actionIcon(action)} {action.label || action.key || action.type}</div>
                    <div style={{ color: '#7890a8', fontSize: '0.66rem' }}>{action.type}</div>
                  </div>
                  {action.previewable && <button type="button" onClick={() => previewAction(action)} style={buttonStyle}>▶</button>}
                  <button type="button" onClick={() => toggleAction(group, action)} style={buttonStyle}>{action.enabled === false ? 'Off' : 'On'}</button>
                </div>
              ))}
            </div>

            {actionTargetId === group.id && (
              <div style={{ border: '1px solid rgba(96, 165, 250, 0.26)', borderRadius: 10, padding: 9, background: 'rgba(30, 64, 175, 0.16)', display: 'grid', gridTemplateColumns: '100px minmax(0, 1fr) auto', gap: 7, alignItems: 'end' }}>
                <select value={quickActionType} onChange={event => { setQuickActionType(event.target.value); setQuickActionKey(''); }} style={inputStyle}>
                  {ACTION_TEMPLATES.map(action => <option key={action.type} value={action.type}>{action.icon} {action.label}</option>)}
                </select>
                {quickActionType === 'audio' ? (
                  <select value={quickActionKey} onChange={event => setQuickActionKey(event.target.value)} style={inputStyle}>
                    <option value="">Choose sound...</option>
                    {library.map(sound => <option key={sound.id} value={sound.id}>{sound.name}</option>)}
                  </select>
                ) : (
                  <input value={quickActionKey} onChange={event => setQuickActionKey(event.target.value)} placeholder="Action key..." style={inputStyle} />
                )}
                <button type="button" onClick={() => addQuickAction(group)} style={primaryButtonStyle}>Add</button>
              </div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => toggleGroup(group)} style={buttonStyle}>{group.enabled ? 'Turn Off' : 'Turn On'}</button>
              <button type="button" onClick={() => setActionTargetId(actionTargetId === group.id ? null : group.id)} style={buttonStyle}>Add Action</button>
              <button type="button" onClick={() => duplicateGroup(group)} style={buttonStyle}>Make Similar</button>
              <button type="button" onClick={stopPreview} style={buttonStyle}>Stop</button>
              <button type="button" onClick={() => deleteTriggerGroup(group.id)} style={{ ...buttonStyle, borderColor: 'rgba(248, 113, 113, 0.4)', color: '#fecaca' }}>Delete</button>
            </div>
          </article>
        ))}
      </div>

      {!filtered.length && (
        <section style={cardStyle}>
          <div style={mutedStyle}>No trigger groups match this search yet.</div>
        </section>
      )}
    </div>
  );
};

export default TriggerGroupLibraryView;
