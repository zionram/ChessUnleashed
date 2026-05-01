import React from 'react';
import { useSettings } from '../../context/SettingsContext';
import { getRegisteredViews } from '../../registry/ViewRegistry';
import ThemeEditorView from '../../views/ThemeEditorView';

const normalizeTitleText = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();

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
  const registeredViews = getRegisteredViews();

  const isMobile = window.innerWidth <= 768;

  const ToggleSwitch = ({ id, active }: { id: string, active: boolean }) => (
    <div 
      onClick={() => toggleView(id)}
      style={{
        width: '36px', height: '20px', borderRadius: '10px',
        background: active ? '#27ae60' : '#ccc',
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

  return (
    <div className="view-manager" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Theme Editor Panel */}
      {settings.isThemeEditorMode && (
        <div className="active-view-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h4 style={{ margin: 0 }}>Piece Editor</h4>
              {!isMobile && (
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => toggleMinimized('theme-editor')} style={{ padding: '2px 8px', fontSize: '0.7rem' }}>
                    {minimizedViews['theme-editor'] ? 'Restore' : 'Minimize'}
                  </button>
                  <button onClick={() => setThemeEditorMode(false)} style={{ padding: '2px 8px', fontSize: '0.7rem' }}>Close</button>
                </div>
              )}
              {isMobile && <ToggleSwitch id="theme-editor" active={settings.isThemeEditorMode} />}
          </div>
          {!minimizedViews['theme-editor'] && (
            <PanelContent title="Piece Editor">
              <ThemeEditorView />
            </PanelContent>
          )}
        </div>
      )}

      {/* Render all registered views */}
      {registeredViews.filter(v => v.id !== 'welcome' && v.id !== 'theme-editor').map(viewConfig => {
        const isActive = settings.activeViews.includes(viewConfig.id);
        const Component = viewConfig.component;
        
        if (!isActive) return null;
        
        return (
          <div key={viewConfig.id} className="active-view-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h4 style={{ margin: 0 }}>{viewConfig.name}</h4>
              {!isMobile && (
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => toggleMinimized(viewConfig.id)} style={{ padding: '2px 8px', fontSize: '0.7rem' }}>
                    {minimizedViews[viewConfig.id] ? 'Restore' : 'Minimize'}
                  </button>
                  <button onClick={() => toggleView(viewConfig.id)} style={{ padding: '2px 8px', fontSize: '0.7rem' }}>
                    Close
                  </button>
                </div>
              )}
              {isMobile && <ToggleSwitch id={viewConfig.id} active={isActive} />}
            </div>
            {!minimizedViews[viewConfig.id] && (
              <PanelContent title={viewConfig.name}>
                <Component />
              </PanelContent>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ViewManager;
