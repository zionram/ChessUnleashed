import React, { useEffect, useState } from 'react';
import {
  addErrorLogEntry,
  clearErrorLogEntries,
  getErrorLogEntries,
  getErrorReportText,
  type AppErrorLogEntry
} from '../utils/ErrorLog';

const createFriendlySummary = (entry: AppErrorLogEntry) => {
  if (entry.summary.toLowerCase().includes('board')) return 'Something went wrong while loading the board.';
  if (entry.summary.toLowerCase().includes('setting')) return 'A setting could not be applied.';
  return entry.summary || 'Something went wrong in the app.';
};

const TroubleshooterView: React.FC = () => {
  const [entries, setEntries] = useState<AppErrorLogEntry[]>(getErrorLogEntries());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const refresh = () => setEntries(getErrorLogEntries());
    window.addEventListener('chess-unleashed:error-log-updated', refresh);
    return () => window.removeEventListener('chess-unleashed:error-log-updated', refresh);
  }, []);

  const reportText = getErrorReportText(entries);

  const copyReport = async () => {
    await navigator.clipboard.writeText(reportText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const downloadReport = () => {
    const blob = new Blob([reportText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chess-unleashed-error-report-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const clearLog = () => {
    clearErrorLogEntries();
    setExpandedId(null);
  };

  const addTestEntry = () => {
    addErrorLogEntry({
      summary: 'Test troubleshooter entry.',
      details: 'This is a local test entry for verifying the Troubleshooter log display.',
      context: 'TroubleshooterView'
    });
  };

  return (
    <div className="view-container" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div>
        <h3 style={{ margin: '0 0 4px', fontSize: '1rem' }}>Troubleshooter</h3>
        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
          Review local app errors and prepare reports. Nothing is sent anywhere yet.
        </div>
      </div>

      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        <button type="button" onClick={copyReport} style={{ padding: '6px 9px', borderRadius: '5px', border: '1px solid #d0d7de', background: '#fff', cursor: 'pointer', fontSize: '0.72rem' }}>
          {copied ? 'Copied' : 'Copy Error Report'}
        </button>
        <button type="button" onClick={downloadReport} style={{ padding: '6px 9px', borderRadius: '5px', border: '1px solid #d0d7de', background: '#fff', cursor: 'pointer', fontSize: '0.72rem' }}>
          Download Report
        </button>
        <button type="button" onClick={clearLog} style={{ padding: '6px 9px', borderRadius: '5px', border: '1px solid #d0d7de', background: '#fff', cursor: 'pointer', fontSize: '0.72rem' }}>
          Clear Log
        </button>
      </div>

      <button type="button" disabled title="Support upload requires an official server endpoint." style={{ padding: '7px 9px', borderRadius: '5px', border: '1px solid #d0d7de', background: '#f8fafc', color: '#94a3b8', fontSize: '0.72rem', cursor: 'not-allowed' }}>
        Send to Support (Coming Later)
      </button>

      <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc', maxHeight: '280px', overflowY: 'auto' }}>
        {entries.length === 0 ? (
          <div style={{ padding: '14px', fontSize: '0.75rem', color: '#64748b', textAlign: 'center' }}>
            No errors logged. If something goes wrong, it will appear here.
          </div>
        ) : (
          entries.map(entry => {
            const isExpanded = expandedId === entry.id;
            return (
              <div key={entry.id} style={{ padding: '10px', borderBottom: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  style={{ width: '100%', padding: 0, border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer' }}
                >
                  <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#334155' }}>{createFriendlySummary(entry)}</div>
                  <div style={{ marginTop: '3px', fontSize: '0.65rem', color: '#64748b' }}>
                    {new Date(entry.timestamp).toLocaleString()} {entry.context ? `- ${entry.context}` : ''}
                  </div>
                </button>
                {isExpanded && (
                  <pre style={{ margin: '8px 0 0', padding: '8px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#fff', border: '1px solid #d0d7de', borderRadius: '5px', fontSize: '0.65rem', color: '#334155' }}>
                    {JSON.stringify(entry, null, 2)}
                  </pre>
                )}
              </div>
            );
          })
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '10px', border: '1px solid #fee2e2', borderRadius: '8px', background: '#fff7ed' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9a3412' }}>Reset System</div>
        <div style={{ fontSize: '0.68rem', color: '#9a3412', lineHeight: 1.35 }}>
          Resets local settings to defaults and reloads the app. To restart the server, stop and rerun node server/chessServer.js.
        </div>
        <div style={{ fontSize: '0.68rem', color: '#9a3412' }}>
          Use Advanced - System - Reset System to open the in-game reset confirmation.
        </div>
      </div>

      <button type="button" onClick={addTestEntry} style={{ alignSelf: 'flex-start', padding: '5px 8px', borderRadius: '5px', border: '1px solid #d0d7de', background: '#fff', color: '#64748b', cursor: 'pointer', fontSize: '0.68rem' }}>
        Add Test Log Entry
      </button>
    </div>
  );
};

export default TroubleshooterView;
