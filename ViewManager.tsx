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

const getPanelTabName = (panel: WorkspacePanel) => {
  const shortById: Record<string, string> = {
    'platform-appearance': 'Platform',
    'audio': 'Audio',
    'sound-editor': 'Sound',
    'bot-manager': 'Bots',
    'package-manager': 'Packages',
    'theme-editor': 'Editor',
    'event-log': 'Events'
  };
  return shortById[panel.id] ?? panel.name.replace(/ Settings$/i, '').replace(/ Manager$/i, '').replace(/ Editor$/i, '');
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

  return <div ref={contentRef}>{children}</div>;
};

const ViewManager: React.FC = () => {
  const { settings, toggleView, setThemeEditorMode } = useSettings();
  const [minimizedViews, setMinimizedViews] = React.useState<Record<string, boolean>>({});
  const [activeTabId, setActiveTabId] = React.useState<string | null>(null);
  const registeredViews = getRegisteredViews();

  const isMobile = window.innerWidth <= 768;
  const buttonRadius = { rounded: 6, square: 2, minimal: 0 }[settings.uiAppearance.buttonStyle];

  const ToggleSwitch = ({ id, active }: { id: string, active: boolean }) => (
    <div
      onClick={() => toggleView(id)}
      style={{
        width: '36px', height: '20px', borderRadius: '10px',
        background: active ? settings.uiAppearance.accentColor : '#ccc',
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

  React.useEffect(() => {
    if (panels.length === 0) {
      setActiveTabId(null);
      return;
    }
    if (!activeTabId || !panels.some(panel => panel.id === activeTabId)) {
      setActiveTabId(panels[0].id);
    }
  }, [activeTabId, panels]);

  if (panels.length === 0) {
    return (
      <div className="view-manager view-manager-empty">
        <div className="panel-tab-strip" aria-label="Workspace panel tabs">
          <button className="panel-tab active" type="button">Workspace</button>
        </div>
        <div className="active-view-panel workspace-empty-panel">
          <h4>Workspace Panels</h4>
          <p>Select a tool from the left palette to open it here.</p>
        </div>
      </div>
    );
  }

  const activePanel = panels.find(panel => panel.id === activeTabId) ?? panels[0];
  const ActiveComponent = activePanel.component;

  return (
    <div className="view-manager workspace-tab-manager">
      <div className="panel-tab-strip" aria-label="Workspace panel tabs">
        {panels.map(panel => (
          <button
            key={panel.id}
            type="button"
            className={`panel-tab ${panel.id === activePanel.id ? 'active' : ''}`}
            onClick={() => setActiveTabId(panel.id)}
            title={`${getGroupLabel(panel.group)}: ${panel.name}`}
          >
            <span className="panel-tab-group">{getGroupLabel(panel.group)}</span>
            <span className="panel-tab-name">{getPanelTabName(panel)}</span>
          </button>
        ))}
      </div>

      <div className="active-view-panel workspace-tab-panel">
        <div className="workspace-panel-titlebar">
          <div>
            <h4>{activePanel.name}</h4>
            <span>{getGroupLabel(activePanel.group)}</span>
          </div>
          {!isMobile && (
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={activePanel.toggleMinimized} style={{ padding: '2px 8px', fontSize: '0.7rem', borderRadius: buttonRadius }}>
                {activePanel.isMinimized ? 'Restore' : 'Minimize'}
              </button>
              <button onClick={activePanel.close} style={{ padding: '2px 8px', fontSize: '0.7rem', borderRadius: buttonRadius }}>
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
    </div>
  );
};

export default ViewManager;
