import React from 'react';
import { useSettings } from '../../context/SettingsContext';
import { getRegisteredViews } from '../../registry/ViewRegistry';
import ThemeEditorView from '../../views/ThemeEditorView';

const normalizeTitleText = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();

type WorkspacePanel = {
  id: string;
  name: string;
  group: 'properties' | 'history' | 'tools';
  component: React.ComponentType<any>;
  close: () => void;
  isMinimized: boolean;
  toggleMinimized: () => void;
};

const getPanelGroup = (id: string): WorkspacePanel['group'] => {
  if (['history', 'event-log', 'stats'].includes(id)) return 'history';
  if (['layers', 'paths', 'squares', 'theme-editor', 'platform-appearance', 'audio', 'timer-settings'].includes(id)) return 'properties';
  return 'tools';
};

const getGroupLabel = (group: WorkspacePanel['group']) => ({
  properties: 'Properties',
  history: 'History',
  tools: 'Tools'
}[group]);

const getShortPanelName = (name: string) => {
  const map: Record<string, string> = {
    'Platform UI': 'Platform',
    'Platform Appearance': 'Platform',
    'Audio Settings': 'Audio',
    'Sound Editor': 'Sounds',
    'Bot Manager': 'Bots',
    'Theme Editor': 'Theme',
    'Piece Editor': 'Pieces',
    'Package Manager': 'Packages',
    'Import / Export': 'Packages',
    'Event Log': 'Events'
  };
  return map[name] ?? name.replace(/\s+(Settings|Manager|Editor|View)$/i, '');
};

const PanelContent: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!import.meta.env.DEV) return;
    const firstHeading = contentRef.current?.querySelector('h1, h2, h3, h4');
    const headingText = firstHeading?.textContent ?? '';
    if (headingText && normalizeTitleText(headingText) === normalizeTitleText(title)) {
      console.warn(
        `[Panel title ownership] "${title}" is already rendered by the panel shell. Remove the duplicate top-level heading from the view component.`
      );
    }
  }, [title]);

  return <div ref={contentRef} className="cu-view-shell cu-themed-embedded-view cu-scroll-area">{children}</div>;
};

const ViewManager: React.FC = () => {
  const { settings, toggleView, setThemeEditorMode } = useSettings();
  const [minimizedViews, setMinimizedViews] = React.useState<Record<string, boolean>>({});
  const [activeTabId, setActiveTabId] = React.useState<string | null>(null);
  const registeredViews = getRegisteredViews();

  const isMobile = window.innerWidth <= 768;
  const buttonRadius = { rounded: 6, square: 2, minimal: 0 }[settings.uiAppearance.buttonStyle];
  const isGlass = settings.uiAppearance.sidebarStyle === 'glass';
  const accentColor = settings.uiAppearance.accentColor;

  const tabStripStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'stretch',
    gap: '5px',
    padding: '6px 4px 8px',
    overflowX: 'hidden',
    overflowY: 'visible',
    scrollbarWidth: 'none'
  };

  const getTabStyle = (active: boolean): React.CSSProperties => ({
    flex: '1 1 72px',
    minWidth: '64px',
    maxWidth: '96px',
    padding: '5px 7px',
    borderRadius: '7px 7px 0 0',
    border: active
      ? `1px solid ${accentColor}`
      : isGlass
        ? '1px solid rgba(148, 163, 184, 0.18)'
        : '1px solid #d0d7de',
    borderBottom: active
      ? `2px solid ${accentColor}`
      : isGlass
        ? '1px solid rgba(148, 163, 184, 0.14)'
        : '1px solid #d0d7de',
    background: active
      ? (isGlass ? 'rgba(14, 47, 72, 0.92)' : '#eef6ff')
      : (isGlass ? 'rgba(10, 18, 32, 0.82)' : '#f6f8fa'),
    color: isGlass ? '#e5edf7' : '#1f2937',
    cursor: 'pointer',
    textAlign: 'left',
    boxShadow: active && isGlass ? '0 0 0 1px rgba(56, 189, 248, 0.12), 0 0 14px rgba(56, 189, 248, 0.14)' : undefined,
    overflow: 'hidden'
  });

  const buttonStyle: React.CSSProperties = {
    padding: '2px 8px',
    fontSize: '0.7rem',
    borderRadius: buttonRadius
  };

  const ToggleSwitch = ({ id, active }: { id: string; active: boolean }) => (
    <div
      onClick={() => toggleView(id)}
      style={{
        width: '36px', height: '20px', borderRadius: '10px',
        background: active ? accentColor : '#ccc',
        position: 'relative', cursor: 'pointer', transition: 'background 0.3s'
      }}
    >
      <div style={{
        width: '16px', height: '16px', borderRadius: '50%', background: 'white',
        position: 'absolute', top: '2px', left: active ? '18px' : '2px',
        transition: 'left 0.3s'
      }} />
    </div>
  );

  const toggleMinimized = (id: string) => {
    setMinimizedViews(current => ({ ...current, [id]: !current[id] }));
  };

  const panels: WorkspacePanel[] = [];

  if (settings.isThemeEditorMode) {
    panels.push({
      id: 'theme-editor',
      name: 'Piece Editor',
      group: 'properties',
      component: ThemeEditorView,
      close: () => setThemeEditorMode(false),
      isMinimized: !!minimizedViews['theme-editor'],
      toggleMinimized: () => toggleMinimized('theme-editor')
    });
  }

  registeredViews
    .filter(v => v.id !== 'welcome' && v.id !== 'theme-editor' && v.position !== 'center')
    .forEach(viewConfig => {
      if (!settings.activeViews.includes(viewConfig.id)) return;
      panels.push({
        id: viewConfig.id,
        name: viewConfig.name,
        group: getPanelGroup(viewConfig.id),
        component: viewConfig.component,
        close: () => toggleView(viewConfig.id),
        isMinimized: !!minimizedViews[viewConfig.id],
        toggleMinimized: () => toggleMinimized(viewConfig.id)
      });
    });

  const panelIdsKey = panels.map(p => p.id).join('|');

  React.useEffect(() => {
    if (panels.length === 0) {
      setActiveTabId(null);
      return;
    }
    setActiveTabId(current => {
      if (current && panels.some(p => p.id === current)) return current;
      return panels[0].id;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelIdsKey]);

  if (panels.length === 0) {
    return (
      <div className="view-manager view-manager-empty">
        <div className="panel-tab-strip" aria-label="Workspace panel tabs" style={tabStripStyle}>
          <button className="panel-tab active" type="button" style={{ ...getTabStyle(true), cursor: 'default' }}>Workspace</button>
        </div>
        <div className="active-view-panel workspace-empty-panel">
          <h4>Workspace Panels</h4>
          <p>Select a tool from the left palette to open it here.</p>
        </div>
      </div>
    );
  }

  const activePanel = panels.find(p => p.id === activeTabId) ?? panels[0];
  const ActiveComponent = activePanel?.component ?? null;

  return (
    <div className="view-manager workspace-tab-manager">
      <div className="panel-tab-strip" aria-label="Workspace panel tabs" style={tabStripStyle}>
        {panels.map(panel => (
          <button
            key={panel.id}
            type="button"
            className={`panel-tab ${activePanel && panel.id === activePanel.id ? 'active' : ''}`}
            style={getTabStyle(!!activePanel && panel.id === activePanel.id)}
            onClick={() => setActiveTabId(panel.id)}
            title={`${getGroupLabel(panel.group)}: ${panel.name}`}
          >
            <span
              className="panel-tab-group"
              style={{
                display: 'block',
                fontSize: '0.52rem',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                opacity: 0.62,
                lineHeight: 1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {getGroupLabel(panel.group)}
            </span>
            <span
              className="panel-tab-name"
              style={{
                display: 'block',
                marginTop: '2px',
                fontSize: '0.72rem',
                lineHeight: 1.1,
                fontWeight: 700,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {getShortPanelName(panel.name)}
            </span>
          </button>
        ))}
      </div>

      {activePanel && ActiveComponent ? (
        <div className="active-view-panel workspace-tab-panel">
          <div className="workspace-panel-titlebar">
            <div>
              <h4>{activePanel.name}</h4>
              <span>{getGroupLabel(activePanel.group)}</span>
            </div>
            {!isMobile && (
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={activePanel.toggleMinimized} style={buttonStyle}>
                  {activePanel.isMinimized ? 'Restore' : 'Minimize'}
                </button>
                <button onClick={activePanel.close} style={buttonStyle}>
                  Close
                </button>
              </div>
            )}
            {isMobile && <ToggleSwitch id={activePanel.id} active />}
          </div>
          {!activePanel.isMinimized && (
            <PanelContent title={activePanel.name}>
              <ActiveComponent />
            </PanelContent>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default ViewManager;
