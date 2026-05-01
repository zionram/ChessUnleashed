import React, { useState } from 'react';
import type { MenuItem } from '../../config/menuSchema';
import { useSettings } from '../../context/SettingsContext';
import Overlay from '../layout/Overlay';

interface DynamicMenuProps {
  items: MenuItem[];
  onAction?: (actionId: string) => void;
}

const DynamicMenu: React.FC<DynamicMenuProps> = ({ items, onAction }) => {
  const [activeSubMenu, setActiveSubMenu] = useState<string | null>(null);
  const [activeOverlay, setActiveOverlay] = useState<MenuItem | null>(null);
  const [onCloseRequest, setOnCloseRequest] = useState<(() => void) | null>(null);
  const { settings } = useSettings();
  const accentColor = settings.uiAppearance.accentColor;

  const handleItemClick = (item: MenuItem) => {
    if (item.type === 'submenu') {
      setActiveSubMenu(activeSubMenu === item.id ? null : item.id);
    } else if (item.type === 'overlay') {
      setActiveOverlay(item);
    } else if (item.actionId && onAction) {
      onAction(item.actionId);
    }
  };

  return (
    <div className="dynamic-menu" style={{ width: '100%' }}>
      {items.map(item => (
        <div key={item.id} className="menu-item-container">
          <div
            className="menu-item"
            onClick={() => handleItemClick(item)}
            title={item.label}
            style={{
              padding: '12px 15px',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #f0f0f0',
              // First uiAppearance integration point: accent color for active menu state.
              backgroundColor: activeSubMenu === item.id ? `${accentColor}14` : 'transparent',
              borderLeft: activeSubMenu === item.id ? `3px solid ${accentColor}` : '3px solid transparent',
              transition: 'background-color 0.2s',
              fontSize: '0.9rem',
              color: '#333'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {item.icon && <span style={{ opacity: 0.7 }}>{item.icon}</span>}
              <span style={{ fontWeight: item.type === 'submenu' ? 600 : 400 }}>{item.label}</span>
            </div>
            {item.type === 'submenu' && (
              <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>
                {activeSubMenu === item.id ? '▼' : '▶'}
              </span>
            )}
          </div>
          
          {activeSubMenu === item.id && item.children && (
            <div className="sub-menu-nest" style={{ backgroundColor: '#fff' }}>
              <DynamicMenu items={item.children} onAction={onAction} />
            </div>
          )}
        </div>
      ))}

      {/* Overlay Manager */}
      {activeOverlay && (
        <Overlay 
          isOpen={!!activeOverlay} 
          onClose={() => {
            setActiveOverlay(null);
            setOnCloseRequest(null);
          }}
          onCloseAttempt={onCloseRequest || undefined}
          title={activeOverlay.overlayTitle || activeOverlay.label}
        >
          {activeOverlay.component && (
            <activeOverlay.component 
              registerCloseAttempt={(fn: () => void) => setOnCloseRequest(() => fn)} 
              closeOverlay={() => {
                setActiveOverlay(null);
                setOnCloseRequest(null);
              }} 
            />
          )}
        </Overlay>
      )}
    </div>
  );
};

export default DynamicMenu;
