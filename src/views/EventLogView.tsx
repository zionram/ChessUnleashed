import React, { useState, useEffect } from 'react';
import { eventLogger } from '../events/EventLogger';
import { eventBus } from '../events/EventBus';
import type { GameEvent } from '../events/types';

const EventLogView: React.FC = () => {
  const [events, setEvents] = useState<GameEvent[]>(eventLogger.getEvents());
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    const handleEvent = () => setEvents(eventLogger.getEvents());
    
    // Subscribe to all events to trigger re-renders
    eventBus.subscribe('*', handleEvent);
    return () => eventBus.unsubscribe('*', handleEvent);
  }, []);

  const handleClear = () => {
    eventLogger.clear();
    setEvents([]);
    setSelectedIndex(null);
  };

  const formatEventLine = (event: GameEvent) => {
    const time = new Date(event.timestamp).toLocaleTimeString([], { hour12: false });
    return `[${time}] ${event.type} - ${JSON.stringify(event.payload)}`;
  };

  const copyLog = async () => {
    const text =
      selectedIndex !== null
        ? formatEventLine(events[selectedIndex])
        : events.map(e => formatEventLine(e)).join("\n");

    await navigator.clipboard.writeText(text);
  };

  return (
    <div className="event-log-container cu-themed-embedded-view cu-event-log-view" style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '10px', padding: '10px', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Event Log</h2>
        <button 
          onClick={handleClear}
          style={{ padding: '4px 12px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #ccc' }}
        >
          Clear Log
        </button>
      </div>

      <div style={{ 
        maxHeight: '300px', 
        overflowY: 'auto', 
        border: '1px solid #eee', 
        borderRadius: '4px', 
        background: '#fafafa', 
        padding: '8px',
        fontFamily: 'monospace'
      }}>
        {events.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#999', padding: '10px' }}>No events logged</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column-reverse' }}>
            {events.map((event, i) => {
              const time = new Date(event.timestamp).toLocaleTimeString([], { hour12: false });
              const payloadStr = JSON.stringify(event.payload);
              const truncatedPayload = payloadStr.length > 80 ? payloadStr.slice(0, 80) + '...' : payloadStr;
              
              return (
                <div 
                  key={`${event.timestamp}-${i}`} 
                  onClick={() => setSelectedIndex(i)}
                  style={{ 
                    whiteSpace: 'nowrap', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis',
                    fontSize: '0.75rem',
                    padding: '2px 4px',
                    borderBottom: '1px solid #f1f1f1',
                    color: '#333',
                    userSelect: 'text',
                    cursor: 'pointer',
                    backgroundColor: selectedIndex === i ? "rgba(120,160,255,0.25)" : "transparent",
                    transition: 'background-color 0.1s'
                  }}
                  title={`[${time}] ${event.type} - ${payloadStr}`}
                >
                  <span style={{ color: '#95a5a6' }}>[{time}]</span>{' '}
                  <span style={{ fontWeight: 'bold', color: '#2c3e50' }}>{event.type}</span>{' - '}
                  <span>{truncatedPayload}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button 
        onClick={copyLog}
        style={{ 
          padding: '6px 0', 
          cursor: 'pointer', 
          borderRadius: '4px', 
          border: '1px solid #ccc',
          background: '#fff',
          fontWeight: 'bold'
        }}
      >
        Copy
      </button>
    </div>
  );
};

export default EventLogView;
