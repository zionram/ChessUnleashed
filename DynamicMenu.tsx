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
  const { accentColor, sidebarStyle } = settings.uiAppearance;
  const isGlass = sidebarStyle === 'glass';
  const menuTextColor = isGlass ? '#c8d0d9' : '#333';
  const menuBorderColor = isGlass ? 'rgba(255, 255, 255, 0.06)' : '#f0f0f0';
  const subMenuBgColor = isGlass ? 'rgba(0, 0, 0, 0.18)' : '#fff';

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
    <div className={`dynamic-menu ${isGlass ? 'dynamic-menu-glass' : ''}`} style={{ width: '100%' }}>
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
              borderBottom: `1px solid ${menuBorderColor}`,
              backgroundColor: activeSubMenu === item.id ? `${accentColor}14` : 'transparent',
              borderLeft: activeSubMenu === item.id ? `3px solid ${accentColor}` : '3px solid transparent',
              transition: 'background-color 0.2s',
              fontSize: '0.9rem',
              color: menuTextColor
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {item.icon && <span className="menu-item-icon" style={{ opacity: 0.85 }}>{item.icon}</span>}
              <span className="menu-item-label" style={{ fontWeight: item.type === 'submenu' ? 600 : 400 }}>{item.label}</span>
            </div>
            {item.type === 'submenu' && (
              <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>
                {activeSubMenu === item.id ? '▼' : '▶'}
              </span>
            )}
          </div>
          
          {activeSubMenu === item.id && item.children && (
            <div className="sub-menu-nest" style={{ backgroundColor: subMenuBgColor }}>
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
