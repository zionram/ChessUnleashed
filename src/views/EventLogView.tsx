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
    <div className="event-log-container cu-themed-embedded-view cu-view-shell cu-event-log-view cu-scroll-area">
      <div className="cu-toolbar-row">
        <h2 className="cu-view-title">Event Log</h2>
        <button type="button" onClick={handleClear} className="cu-inline-button">
          Clear Log
        </button>
      </div>

      <div className="cu-log-panel cu-scroll-area">
        {events.length === 0 ? (
          <div className="cu-empty-note">No events logged</div>
        ) : (
          <div className="cu-log-list">
            {events.map((event, i) => {
              const time = new Date(event.timestamp).toLocaleTimeString([], { hour12: false });
              const payloadStr = JSON.stringify(event.payload);
              const truncatedPayload = payloadStr.length > 80 ? payloadStr.slice(0, 80) + '...' : payloadStr;

              return (
                <div
                  key={`${event.timestamp}-${i}`}
                  onClick={() => setSelectedIndex(i)}
                  className={`cu-log-row ${selectedIndex === i ? 'is-selected' : ''}`}
                  title={`[${time}] ${event.type} - ${payloadStr}`}
                >
                  <span className="cu-log-time">[{time}]</span>{' '}
                  <span className="cu-log-type">{event.type}</span>{' - '}
                  <span>{truncatedPayload}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button type="button" onClick={copyLog} className="cu-secondary-button">
        Copy
      </button>
    </div>
  );
};

export default EventLogView;
