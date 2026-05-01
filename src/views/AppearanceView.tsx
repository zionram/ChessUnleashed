import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { useSettings } from '../context/SettingsContext';
import { useGame } from '../context/GameContext';
import { useAudio } from '../context/AudioContext';
import { type Template} from '../templates';
import { PACKAGE_CATEGORIES, unwrapPackageInput } from '../registry/PackageRegistry';
import { buildExperiencePackage, createExperiencePackageZip, type ExperiencePackageContents } from '../packages/ExperiencePackage';



interface AppearanceViewProps {
  registerCloseAttempt?: (fn: () => void) => void;
  closeOverlay?: () => void;
}

const AppearanceView: React.FC<AppearanceViewProps> = ({ registerCloseAttempt, closeOverlay }) => {
  const { settings, updateTemplate } = useSettings();
  const { multiplayer, syncTheme } = useGame();
  const { getCurrentProfile, applyProfile } = useAudio();
  const { template: liveTemplate } = settings;
  
  const [draft, setDraft] = useState<Template>(JSON.parse(JSON.stringify(liveTemplate)));
  const [lastCommitted, setLastCommitted] = useState<Template>(JSON.parse(JSON.stringify(liveTemplate)));
  const [showConfirm, setShowConfirm] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
  const [selectedCats, setSelectedCats] = useState<string[]>(PACKAGE_CATEGORIES.map(c => c.id).concat(['audio']));
  const [importData, setImportData] = useState<any>(null);
  const packageName = importData?.name || importData?.metadata?.name || 'Custom Set';

  const hasUnsavedChanges = JSON.stringify(draft) !== JSON.stringify(lastCommitted);

  useEffect(() => { updateTemplate(draft); }, [draft]);

  const handleCloseAttempt = () => {
    if (hasUnsavedChanges) setShowConfirm(true);
    else if (closeOverlay) closeOverlay();
  };

  useEffect(() => {
    if (registerCloseAttempt) registerCloseAttempt(handleCloseAttempt);
  }, [hasUnsavedChanges, draft]);

  const applyChanges = () => {
    updateTemplate(draft);
    setLastCommitted(JSON.parse(JSON.stringify(draft)));
    if (multiplayer.isConnected) syncTheme(draft);
    if (closeOverlay) closeOverlay();
  };

  const exportPackage = async () => {
    const experiencePackage = buildExperiencePackage({ ...settings, template: draft }, {
      audio: getCurrentProfile(),
      metadata: {
        name: draft.name || 'Chess Unleashed Package',
        description: 'Package saved from the Environment package workflow.'
      }
    });
    const selectedContents: ExperiencePackageContents = {
      ...(selectedCats.some(category => category !== 'audio') ? { template: draft } : {}),
      ...(selectedCats.includes('audio') && experiencePackage.contents.audio ? { audio: experiencePackage.contents.audio } : {})
    };
    const content = await createExperiencePackageZip({
      ...experiencePackage,
      contents: selectedContents
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = `${(draft.name || 'chess-unleashed').replace(/\s+/g, '-').toLowerCase()}-package.zip`;
    link.click();
    setShowBuilder(false);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const zip = await JSZip.loadAsync(file);
      const content = await zip.file("theme.json")?.async("string");
      if (content) {
          const data = unwrapPackageInput(JSON.parse(content));
          setImportData(data);
          setSelectedCats(data.categories || []);
          setShowBuilder(false);
      }
    } catch (err) { alert("Failed to read package."); }
    e.target.value = '';
  };

  const applyImport = () => {
    if (!importData) return;
    const nextDraft = { ...draft };
    PACKAGE_CATEGORIES.forEach(cat => {
       if (selectedCats.includes(cat.id)) cat.keys.forEach(k => { if (importData[k]) (nextDraft as any)[k] = importData[k]; });
    });
    setDraft(nextDraft);
    updateTemplate(nextDraft);
    setLastCommitted(JSON.parse(JSON.stringify(nextDraft)));
    if (selectedCats.includes('audio') && importData.audio) applyProfile(importData.audio);
    setImportData(null);
    setShowBuilder(false);
    if (multiplayer.isConnected) syncTheme(nextDraft);
    if (closeOverlay) closeOverlay();
  };

  if (showConfirm) {
    return (
      <div className="view-container" style={{ textAlign: 'center', padding: '20px 0' }}>
        <h3>Unsaved Changes</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
          <button onClick={applyChanges} style={{ padding: '10px', background: '#4caf50', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>Apply & Close</button>
          <button onClick={() => { updateTemplate(lastCommitted); if (closeOverlay) closeOverlay(); }} style={{ padding: '10px', background: '#f44336', color: 'white', border: 'none', borderRadius: '4px' }}>Discard</button>
          <button onClick={() => setShowConfirm(false)} style={{ padding: '10px', background: '#eee', border: '1px solid #ddd', borderRadius: '4px' }}>Keep Editing</button>
        </div>
      </div>
    );
  }

  if (showBuilder || importData) {
    const isImport = !!importData;
    const allCategories = PACKAGE_CATEGORIES.map(c => c.id).concat(['audio']);
    const isAllSelected = selectedCats.length === allCategories.length;

    const toggleAll = () => {
        if (isAllSelected) setSelectedCats([]);
        else setSelectedCats(allCategories);
    };

    return (
      <div className="view-container">
        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#2c3e50', marginBottom: '8px' }}>
          {isImport ? 'Load / Save Sets' : 'Load / Save Sets'}
        </div>
        {isImport && (
          <div style={{ fontSize: '0.8rem', color: '#2c3e50', marginBottom: '6px', fontWeight: 700 }}>
            {packageName}
          </div>
        )}
        <p style={{ fontSize: '0.8rem', color: '#666' }}>{isImport ? 'Choose categories to load:' : 'Choose categories to include:'}</p>
        <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #eee' }}>
           <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 'bold' }}>
              <input type="checkbox" checked={isAllSelected} onChange={toggleAll} />
              {isAllSelected ? 'Deselect all' : 'Select all'}
           </label>
           {PACKAGE_CATEGORIES.map(cat => (
             <label key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={selectedCats.includes(cat.id)} onChange={() => setSelectedCats(prev => prev.includes(cat.id) ? prev.filter(id => id !== cat.id) : [...prev, cat.id])} />
                {cat.label}
             </label>
           ))}
           <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={selectedCats.includes('audio')} onChange={() => setSelectedCats(prev => prev.includes('audio') ? prev.filter(id => id !== 'audio') : [...prev, 'audio'])} />
              Audio Profile (Mix & Rules)
           </label>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={isImport ? applyImport : exportPackage} style={{ flex: 2, padding: '10px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>{isImport ? 'Apply Package' : 'Save Package'}</button>
          <button onClick={() => { setShowBuilder(false); setImportData(null); }} style={{ flex: 1, padding: '10px', background: '#eee', border: 'none', borderRadius: '4px' }}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="view-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#2c3e50' }}>Theme Packages</div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={() => document.getElementById('pkg-up')?.click()} style={{ padding: '10px 12px', background: '#34495e', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 700 }}>Load Package</button>
          <button onClick={() => setShowBuilder(true)} style={{ padding: '10px 12px', background: '#e67e22', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 700 }}>Save Package</button>
          <input id="pkg-up" type="file" accept=".zip" onChange={handleImportFile} style={{ display: 'none' }} />
        </div>
      </div>
      <p style={{ fontSize: '0.75rem', color: '#666', marginTop: '10px' }}>
        Manage your complete theme configuration. Use the left-hand menu to customize individual board elements like squares, background layers, and piece sets.
      </p>
    </div>
  );
};

export default AppearanceView;
