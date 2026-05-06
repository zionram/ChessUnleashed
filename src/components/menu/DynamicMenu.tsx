import React, { useState } from 'react';
import type { MenuItem } from '../../config/menuSchema';
import { useSettings } from '../../context/SettingsContext';
import Overlay from '../layout/Overlay';

interface DynamicMenuProps {
  items: MenuItem[];
  onAction?: (actionId: string) => void;
  depth?: number;
  onRootItemSelect?: (item: MenuItem) => void;
  activeRootItemIds?: readonly string[];
}

const DynamicMenu: React.FC<DynamicMenuProps> = ({ items, onAction, depth = 0, onRootItemSelect, activeRootItemIds }) => {
  const [activeSubMenu, setActiveSubMenu] = useState<string | null>(null);
  const [activeOverlay, setActiveOverlay] = useState<MenuItem | null>(null);
  const [onCloseRequest, setOnCloseRequest] = useState<(() => void) | null>(null);
  const { settings } = useSettings();
  const { accentColor, sidebarStyle, density } = settings.uiAppearance;
  const isGlass = sidebarStyle === 'glass';
  const isCompact = isGlass || density === 'compact';
  const isRootToolGrid = isGlass && depth === 0;
  const menuTextColor = isGlass ? '#c8d0d9' : '#333';
  const menuMutedTextColor = isGlass ? '#7f8da3' : '#687385';
  const menuBorderColor = isGlass ? 'rgba(148, 163, 184, 0.13)' : '#f0f0f0';
  const subMenuBgColor = isGlass ? 'rgba(2, 6, 23, 0.28)' : '#fff';

  const handleItemClick = (item: MenuItem) => {
    if (item.type === 'submenu') {
      if (isRootToolGrid && onRootItemSelect) {
        onRootItemSelect(item);
      } else {
        setActiveSubMenu(activeSubMenu === item.id ? null : item.id);
      }
    } else if (item.type === 'overlay') {
      setActiveOverlay(item);
    } else if (item.actionId && onAction) {
      onAction(item.actionId);
    }
  };

  return (
    <div
      className={`dynamic-menu ${isRootToolGrid ? 'dynamic-menu-icon-grid' : ''}`}
      style={{
        width: '100%',
        display: isRootToolGrid ? 'grid' : 'block',
        gridTemplateColumns: isRootToolGrid ? 'repeat(2, minmax(0, 1fr))' : undefined,
        gap: isRootToolGrid ? '6px' : undefined,
        padding: isRootToolGrid ? '8px 10px 6px' : undefined,
        boxSizing: 'border-box'
      }}
    >
      {items.map(item => {
        const isActive = isRootToolGrid && activeRootItemIds ? activeRootItemIds.includes(item.id) : activeSubMenu === item.id;
        const showIconTile = isRootToolGrid;
        const fallbackIcon = item.label?.trim()?.charAt(0)?.toUpperCase() ?? '•';

        return (
          <div
            key={item.id}
            className={`menu-item-container ${showIconTile ? 'menu-grid-item-container' : ''}`}
            style={{ display: showIconTile ? 'contents' : undefined }}
          >
            <div
              className={`menu-item ${showIconTile ? 'menu-icon-grid-button' : ''} ${isActive ? 'is-active' : ''}`}
              onClick={() => handleItemClick(item)}
              title={item.label}
              aria-label={item.label}
              style={{
                position: 'relative',
                padding: showIconTile ? '7px 5px 6px' : (isCompact ? '6px 8px' : '12px 15px'),
                minHeight: showIconTile ? '48px' : undefined,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: showIconTile ? 'column' : 'row',
                justifyContent: showIconTile ? 'center' : 'space-between',
                alignItems: 'center',
                gap: showIconTile ? '4px' : (isCompact ? '6px' : '10px'),
                borderTop: showIconTile
                  ? `1px solid ${isActive ? `${accentColor}88` : 'rgba(148, 163, 184, 0.14)'}`
                  : undefined,
                borderRight: showIconTile
                  ? `1px solid ${isActive ? `${accentColor}88` : 'rgba(148, 163, 184, 0.14)'}`
                  : undefined,
                borderBottom: showIconTile
                  ? `1px solid ${isActive ? `${accentColor}88` : 'rgba(148, 163, 184, 0.14)'}`
                  : `1px solid ${menuBorderColor}`,
                borderLeft: showIconTile
                  ? `1px solid ${isActive ? `${accentColor}88` : 'rgba(148, 163, 184, 0.14)'}`
                  : (isActive ? `3px solid ${accentColor}` : '3px solid transparent'),
                backgroundColor: isActive
                  ? `${accentColor}20`
                  : showIconTile
                    ? 'rgba(8, 17, 34, 0.48)'
                    : 'transparent',
                borderRadius: showIconTile ? 8 : (isCompact ? 8 : 0),
                margin: showIconTile ? 0 : (isCompact ? '2px 6px' : 0),
                transition: 'background-color 0.2s, border-color 0.2s, transform 0.2s, box-shadow 0.2s',
                fontSize: showIconTile ? '0.58rem' : (isCompact ? '0.75rem' : '0.9rem'),
                color: menuTextColor,
                boxShadow: showIconTile && isActive ? `0 0 0 1px rgba(56, 189, 248, 0.10), 0 0 10px ${accentColor}2f` : undefined,
                textAlign: 'center',
                minWidth: 0
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: showIconTile ? 'column' : 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: showIconTile ? '3px' : (isCompact ? '8px' : '10px'),
                  minWidth: 0,
                  width: showIconTile ? '100%' : undefined
                }}
              >
                <span
                  className={`menu-icon-box ${isActive ? 'is-active' : ''}`}
                  style={{
                    color: isActive ? accentColor : menuMutedTextColor,
                    borderColor: isActive ? `${accentColor}88` : (isGlass ? 'rgba(148, 163, 184, 0.18)' : 'transparent'),
                    background: isGlass ? 'rgba(15, 23, 42, 0.64)' : 'transparent',
                    width: showIconTile ? 26 : undefined,
                    height: showIconTile ? 26 : undefined,
                    minWidth: showIconTile ? 26 : undefined,
                    fontSize: showIconTile ? '0.88rem' : undefined,
                    boxShadow: showIconTile && isActive ? `0 0 10px ${accentColor}2f` : undefined
                  }}
                >
                  {item.icon || fallbackIcon}
                </span>
                <span
                  className={`menu-label ${isActive ? 'is-active' : ''}`}
                  style={{
                    fontWeight: item.type === 'submenu' ? 650 : 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '100%',
                    fontSize: showIconTile ? '0.55rem' : undefined,
                    lineHeight: showIconTile ? 1 : undefined,
                    opacity: showIconTile ? 0.76 : undefined
                  }}
                >
                  {showIconTile ? item.label.replace(/\s+/g, ' ') : item.label}
                </span>
              </div>

              {item.type === 'submenu' && (
                <span
                  aria-hidden="true"
                  style={{
                    position: showIconTile ? 'absolute' : undefined,
                    right: showIconTile ? 6 : undefined,
                    bottom: showIconTile ? 5 : undefined,
                    fontSize: showIconTile ? '0.52rem' : '0.8rem',
                    opacity: showIconTile ? 0.72 : 0.5,
                    color: isActive ? accentColor : undefined,
                    lineHeight: 1
                  }}
                >
                  {isActive ? '▼' : '▶'}
                </span>
              )}
            </div>

            {activeSubMenu === item.id && item.children && !(isRootToolGrid && onRootItemSelect) && (
              <div
                className="sub-menu-nest"
                style={{
                  backgroundColor: subMenuBgColor,
                  gridColumn: showIconTile ? '1 / -1' : undefined,
                  borderLeft: isGlass ? `2px solid ${accentColor}66` : undefined,
                  borderRadius: isGlass ? 8 : undefined,
                  margin: showIconTile ? '0 0 3px' : undefined,
                  padding: showIconTile ? '3px 0' : undefined
                }}
              >
                <DynamicMenu items={item.children} onAction={onAction} depth={depth + 1} />
              </div>
            )}
          </div>
        );
      })}

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
