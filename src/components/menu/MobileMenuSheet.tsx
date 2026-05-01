import React, { useState } from 'react';
import { MENU_SCHEMA } from '../../config/menuSchema';

interface MobileMenuSheetProps {
  sectionId: string;
  onClose: () => void;
  onAction: (actionId: string) => void;
}

const MobileMenuSheet: React.FC<MobileMenuSheetProps> = ({ sectionId, onClose, onAction }) => {
  const section = MENU_SCHEMA.find(m => m.id === sectionId);
  const [msg, setMsg] = useState<string | null>(null);

  if (!section) return null;
  const SheetComponent = section.component;

  const handleAction = (actionId: string) => {
    onAction(actionId);
    setMsg("Added to your screen tools!");
    setTimeout(() => {
        setMsg(null);
        if (sectionId !== 'view') onClose();
    }, 1500);
  };

  return (
    <div className="mobile-menu-sheet">
      <div className="sheet-header">
        {section.label}
        <button onClick={onClose} style={{ float: 'right' }}>✕</button>
      </div>
      {msg && <div style={{ padding: '10px', background: '#d4edda', color: '#155724', fontSize: '0.8rem', textAlign: 'center' }}>{msg}</div>}
      {section.type === 'overlay' && SheetComponent && (
        <div style={{ padding: '15px 20px' }}>
          <SheetComponent closeOverlay={onClose} />
        </div>
      )}
      {section.type !== 'overlay' && section.children?.map(item => (
        <div key={item.id} className="sheet-item" onClick={() => handleAction(item.actionId || '')}>
          {item.icon} {item.label}
        </div>
      ))}
    </div>
  );
};

export default MobileMenuSheet;
