import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { useSettings } from '../context/SettingsContext';
import { ArrowLeft, Play, Plus, ShieldCheck, ShieldAlert, Trash2, Pencil } from 'lucide-react';
import { testUciWorkerBestMove } from '../engines/UciWorkerAdapter';

type ViewLayer = 'simple' | 'advanced' | 'system' | 'add-bot';

const BotsView: React.FC = () => {
  const { engine, botRuntimeStatus } = useGame();
  const { settings, setActiveEngineId, updateBotSettings, registerBot, updateBot, removeBot, toggleView } = useSettings();
  const [layer, setLayer] = useState<ViewLayer>('simple');
  const [testResult, setTestResult] = useState<{ status: 'idle' | 'testing' | 'pass' | 'fail'; message?: string }>({ status: 'idle' });
  const [editingBotId, setEditingBotId] = useState<string | null>(null);
  
  // New bot form state
  const [newBotName, setNewBotName] = useState('');
  const [newBotPath, setNewBotPath] = useState('');
  const [newBotType, setNewBotType] = useState<'worker' | 'web'>('worker');
  const activeBotConfig = settings.registeredBots.find(bot => bot.id === settings.activeEngineId);

  const handleTestBot = async () => {
    setTestResult({ status: 'testing' });
    
    const currentConfig = settings.registeredBots.find(b => b.id === settings.activeEngineId);
    if (currentConfig && currentConfig.type !== 'mock') {
      try {
        const result = await testUciWorkerBestMove(currentConfig.path, settings.botSettings.depth);
        setTestResult({
          status: 'pass',
          message: `Success: ${currentConfig.name} returned best move ${result.bestMove}.`
        });
      } catch (error) {
        setTestResult({
          status: 'fail',
          message: error instanceof Error ? error.message : 'Could not load this engine. Check that the file path is correct.'
        });
      }
      return;
    }

    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      const lines = engine.getTopLines(1, 1);
      if (lines && lines.length > 0) {
        setTestResult({ status: 'pass', message: `Success: Bot is responsive and generated a move.` });
      } else {
        setTestResult({ status: 'fail', message: 'Fail: Bot did not return any moves.' });
      }
    } catch (err) {
      setTestResult({ status: 'fail', message: `Error: Bot communication failure.` });
    }
  };

  const handleRegisterBot = () => {
    if (!newBotName.trim() || !newBotPath.trim()) return;
    if (editingBotId) {
      updateBot(editingBotId, {
        name: newBotName.trim(),
        type: newBotType,
        path: newBotPath.trim()
      });
      setLayer('simple');
      setEditingBotId(null);
      setNewBotName('');
      setNewBotPath('');
      setNewBotType('worker');
      setTestResult({ status: 'idle' });
      return;
    }
    
    registerBot({
      id: `custom-${Date.now()}`,
      name: newBotName.trim(),
      type: newBotType,
      path: newBotPath.trim()
    });

    setLayer('simple');
    setNewBotName('');
    setNewBotPath('');
    setNewBotType('worker');
  };

  const startEditingBot = (botId: string) => {
    const bot = settings.registeredBots.find(item => item.id === botId);
    if (!bot || bot.builtin) return;
    setEditingBotId(bot.id);
    setNewBotName(bot.name);
    setNewBotPath(bot.path);
    setNewBotType(bot.type === 'web' ? 'web' : 'worker');
    setTestResult({ status: 'idle' });
    setLayer('add-bot');
  };

  const cancelBotForm = () => {
    setLayer('simple');
    setEditingBotId(null);
    setNewBotName('');
    setNewBotPath('');
    setNewBotType('worker');
  };

  const renderSimple = () => (
    <div className="view-layer">
      <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '20px' }}>
        Choose which computer opponent you want to use.
      </p>

      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem' }}>Active Opponent</h4>
        <div style={{ padding: '12px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
          <div style={{ fontWeight: 'bold', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {activeBotConfig?.name ?? engine.name}
          </div>
          <p style={{ margin: '5px 0 0 0', fontSize: '0.75rem', color: '#666' }}>
            {activeBotConfig && activeBotConfig.type !== 'mock' ? 'Browser UCI engine' : engine.description}
          </p>
          {botRuntimeStatus.state !== 'idle' && (
            <div style={{
              marginTop: '8px',
              padding: '6px',
              borderRadius: '6px',
              border: '1px solid',
              borderColor: botRuntimeStatus.state === 'failed' ? '#fecaca' : botRuntimeStatus.state === 'thinking' ? '#fde68a' : '#86efac',
              background: botRuntimeStatus.state === 'failed' ? '#fef2f2' : botRuntimeStatus.state === 'thinking' ? '#fffbeb' : '#f0fdf4',
              color: botRuntimeStatus.state === 'failed' ? '#991b1b' : botRuntimeStatus.state === 'thinking' ? '#92400e' : '#166534',
              fontSize: '0.7rem'
            }}>
              {botRuntimeStatus.message}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem' }}>Select Opponent</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {settings.registeredBots.map(eng => (
            <div key={eng.id} style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setActiveEngineId(eng.id)}
                style={{
                  flex: 1,
                  textAlign: 'left',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: settings.activeEngineId === eng.id ? '#4f46e5' : '#dee2e6',
                  background: settings.activeEngineId === eng.id ? '#f5f3ff' : 'white',
                  cursor: 'pointer'
                }}
              >
                <div style={{ fontSize: '0.8rem', fontWeight: settings.activeEngineId === eng.id ? 'bold' : 'normal' }}>{eng.name}</div>
                {eng.type !== 'mock' && (
                  <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Browser UCI engine - test before play</div>
                )}
              </button>
              {eng.type !== 'mock' && !eng.builtin ? (
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={() => startEditingBot(eng.id)}
                    style={{
                      padding: '0 10px',
                      borderRadius: '6px',
                      border: '1px solid #d0d7de',
                      background: '#fff',
                      color: '#334155',
                      cursor: 'pointer'
                    }}
                    title="Edit this custom bot"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => removeBot(eng.id)}
                    style={{
                      padding: '0 10px',
                      borderRadius: '6px',
                      border: '1px solid #fee2e2',
                      background: '#fef2f2',
                      color: '#ef4444',
                      cursor: 'pointer'
                    }}
                    title="Remove this custom bot"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ) : (
                <div style={{ width: '76px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.1 }} title="Built-in bots cannot be edited or removed">
                  <Trash2 size={14} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: 'auto' }}>
        <button 
          onClick={handleTestBot}
          disabled={testResult.status === 'testing'}
          style={{ 
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            padding: '10px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem'
          }}
          title="Test this bot before using it"
        >
          <Play size={14} /> Test Bot
        </button>
        <button 
          onClick={() => setLayer('add-bot')}
          style={{ 
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            padding: '10px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem'
          }}
          title="Add a new computer opponent"
        >
          <Plus size={14} /> Add Bot
        </button>
      </div>
      <button
        type="button"
        onClick={() => {
          if (!settings.activeViews.includes('computer-opponent')) toggleView('computer-opponent');
        }}
        style={{
          width: '100%',
          marginTop: '10px',
          padding: '10px',
          background: '#f8fafc',
          color: '#2c3e50',
          border: '1px solid #d0d7de',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '0.8rem',
          fontWeight: 700
        }}
        title="Open the full computer opponent controller"
      >
        Open Bot Controls
      </button>

      {testResult.status !== 'idle' && (
        <div style={{ 
          marginTop: '15px', padding: '10px', borderRadius: '6px', fontSize: '0.75rem',
          background: testResult.status === 'pass' ? '#ecfdf5' : testResult.status === 'fail' ? '#fef2f2' : '#f8f9fa',
          color: testResult.status === 'pass' ? '#065f46' : testResult.status === 'fail' ? '#991b1b' : '#666',
          border: '1px solid',
          borderColor: testResult.status === 'pass' ? '#10b981' : testResult.status === 'fail' ? '#ef4444' : '#dee2e6',
          display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          {testResult.status === 'pass' ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
          {testResult.status === 'testing' ? 'Checking bot responsiveness...' : testResult.message}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '20px' }}>
        <button 
          onClick={() => setLayer('advanced')}
          style={{ padding: '8px', background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem' }}
        >
          Bot Strength
        </button>
        <button 
          onClick={() => setLayer('system')}
          style={{ padding: '8px', background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem' }}
        >
          System Details
        </button>
      </div>
    </div>
  );

  const renderAdvanced = () => (
    <div className="view-layer">
      <button onClick={() => setLayer('simple')} style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', color: '#666', fontSize: '0.75rem', marginBottom: '15px' }}>
        <ArrowLeft size={14} /> Back
      </button>
      <h4 style={{ margin: '0 0 10px 0' }}>Bot Strength</h4>
      <p style={{ fontSize: '0.75rem', color: '#666', marginBottom: '15px' }}>
        Adjust how much time the bot takes to think and its search depth.
      </p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.8rem' }}>
          Think Time ({settings.botSettings.thinkTime}ms)
          <input 
            type="range" min="100" max="3000" step="100" 
            value={settings.botSettings.thinkTime} 
            onChange={(e) => updateBotSettings({ thinkTime: parseInt(e.target.value) })}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.8rem' }}>
          Search Depth ({settings.botSettings.depth})
          <input 
            type="range" min="1" max="5" step="1" 
            value={settings.botSettings.depth} 
            onChange={(e) => updateBotSettings({ depth: parseInt(e.target.value) })}
            disabled={!engine.capabilities.supportsDepth}
          />
          {!engine.capabilities.supportsDepth && <span style={{ fontSize: '0.65rem', color: '#999' }}>Variable depth not supported by this bot</span>}
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', cursor: 'pointer' }}>
          <input 
            type="checkbox" 
            checked={settings.botSettings.showMoveExplanation} 
            onChange={(e) => updateBotSettings({ showMoveExplanation: e.target.checked })}
            disabled={!engine.capabilities.supportsMoveExplanation}
          />
          Explain move decisions
        </label>
      </div>
    </div>
  );

  const renderSystem = () => (
    <div className="view-layer">
      <button onClick={() => setLayer('simple')} style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', color: '#666', fontSize: '0.75rem', marginBottom: '15px' }}>
        <ArrowLeft size={14} /> Back
      </button>
      <h4 style={{ margin: '0 0 10px 0' }}>Connection Details</h4>
      
      <div style={{ fontSize: '0.75rem', color: '#666', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div>
          <strong>Engine Adapter:</strong> {settings.registeredBots.find(bot => bot.id === settings.activeEngineId)?.type === 'mock' ? 'Built-in synchronous engine' : 'Browser Worker UCI adapter'}
        </div>
        <div>
          <strong>Selected path:</strong> {settings.registeredBots.find(bot => bot.id === settings.activeEngineId)?.path || 'Built-in'}
        </div>
        <div>
          <strong>Capabilities:</strong>
          <pre style={{ margin: '5px 0 0 0', padding: '8px', background: '#f8f9fa', borderRadius: '4px', border: '1px solid #eee', fontSize: '0.65rem', overflowX: 'auto' }}>
            {JSON.stringify(engine.capabilities, null, 2)}
          </pre>
        </div>
        <div style={{ marginTop: '10px', padding: '10px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '6px', color: '#92400e' }}>
          <strong>Browser Engine Setup:</strong>
          <p style={{ margin: '5px 0 0 0', fontSize: '0.7rem' }}>
            Place the engine file in the public engines folder and use a path like /engines/stockfish/stockfish-18-lite-single.js.
          </p>
        </div>
      </div>
    </div>
  );

  const renderAddBot = () => (
    <div className="view-layer">
      <button onClick={cancelBotForm} style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', color: '#666', fontSize: '0.75rem', marginBottom: '15px' }}>
        <ArrowLeft size={14} /> Back
      </button>
      <h4 style={{ margin: '0 0 5px 0' }}>{editingBotId ? 'Edit Bot' : 'Add Computer Opponent'}</h4>
      <p style={{ fontSize: '0.7rem', color: '#888', marginBottom: '15px' }}>
        {editingBotId ? 'Update this bot name or engine file path, then test it again.' : 'Add a browser-based UCI engine by entering its name and worker path.'}
      </p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem' }}>
          Opponent Name
          <input 
            type="text" 
            placeholder="e.g. Stockfish 16" 
            value={newBotName}
            onChange={(e) => setNewBotName(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} 
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem' }}>
          Connection Type
          <select 
            value={newBotType}
            onChange={(e) => setNewBotType(e.target.value as any)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            <option value="worker">Stockfish / Worker Engine</option>
            <option value="web">Web Engine URL</option>
          </select>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem' }}>
          Engine File / URL
          <input 
            type="text" 
            placeholder="/engines/stockfish/stockfish-18-lite-single.js" 
            value={newBotPath}
            onChange={(e) => setNewBotPath(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} 
          />
        </label>
        
        <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '6px', fontSize: '0.7rem', color: '#475569', border: '1px solid #e2e8f0' }}>
          <strong>Setup Tip</strong>
          <p style={{ margin: '4px 0 0 0' }}>
            For browser engines, place the engine file in the public engines folder and use a path like /engines/stockfish/stockfish-18-lite-single.js.
          </p>
        </div>
        
        <button 
          onClick={handleRegisterBot}
          disabled={!newBotName.trim() || !newBotPath.trim()}
          style={{ 
            padding: '10px', 
            background: '#4f46e5', 
            color: 'white', 
            border: 'none', 
            borderRadius: '6px', 
            cursor: (!newBotName.trim() || !newBotPath.trim()) ? 'not-allowed' : 'pointer', 
            marginTop: '10px',
            fontWeight: 'bold',
            opacity: (!newBotName.trim() || !newBotPath.trim()) ? 0.5 : 1
          }}
        >
          {editingBotId ? 'Save Changes' : 'Register Bot'}
        </button>
        {editingBotId && (
          <button
            type="button"
            onClick={cancelBotForm}
            style={{ padding: '9px', background: '#fff', color: '#334155', border: '1px solid #d0d7de', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="view-container">
      {layer === 'simple' && renderSimple()}
      {layer === 'advanced' && renderAdvanced()}
      {layer === 'system' && renderSystem()}
      {layer === 'add-bot' && renderAddBot()}
    </div>
  );
};

export default BotsView;
