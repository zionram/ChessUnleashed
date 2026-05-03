import React, { useEffect, useMemo, useRef, useState } from 'react';
import { isSupportedAudioFile, useAudio } from '../../context/AudioContext';
import { useSettings } from '../../context/SettingsContext';
import WaveProgressBar from '../audio/WaveProgressBar';
import { eventBus } from '../../events/EventBus';
import type { GameEvent } from '../../events/types';

const DEFAULT_AUDIO_CONTROLLER_APPEARANCE = {
  layout: 'compact',
  shape: 'rounded',
  accentColor: '#3498db',
  backgroundColor: '#ffffff',
  textColor: '#2c3e50',
  sliderColor: '#3498db',
  barStyle: 'bars',
  controlStyle: 'buttons',
  controlImages: {}
} as const;

const AudioController: React.FC = () => {
  const {
    masterVolume,
    setMasterVolume,
    musicVolume,
    setMusicVolume,
    bgMusic,
    bgMusicName,
    playlistName,
    playlist,
    currentTrackIndex,
    playbackMode,
    isMusicPlaying,
    musicProgress,
    musicDuration,
    addPlaylistTracks,
    removePlaylistTrack,
    clearPlaylist,
    nextTrack,
    previousTrack,
    setPlaybackMode,
    playBackgroundMusic,
    pauseBackgroundMusic,
    stopBackgroundMusic,
    seekBackgroundMusic,
    rules,
    library,
    controller,
    updateController,
    updateCategory
  } = useAudio();
  const { settings } = useSettings();
  const legacyTemplate = settings.template as typeof settings.template & { audioPlayerAppearance?: typeof DEFAULT_AUDIO_CONTROLLER_APPEARANCE };
  const appearance = settings.template.audioControllerAppearance ?? legacyTemplate.audioPlayerAppearance ?? DEFAULT_AUDIO_CONTROLLER_APPEARANCE;
  const eventTypes = useMemo(() => Array.from(new Set(rules.map(rule => rule.event))), [rules]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragPosition, setDragPosition] = useState(controller.floatingPos || { x: 120, y: 120 });
  const [lastSoundRule, setLastSoundRule] = useState('');
  const [uploadMessage, setUploadMessage] = useState('');
  const playerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (controller.floatingPos && !isDragging) setDragPosition(controller.floatingPos);
  }, [controller.floatingPos, isDragging]);

  useEffect(() => {
    const handleRulePlayed = (event: GameEvent) => {
      const payload = event.payload as { ruleName?: string; soundName?: string } | undefined;
      const ruleName = payload?.ruleName || 'Sound rule';
      const soundName = payload?.soundName || 'sound';
      setLastSoundRule(`${ruleName} - ${soundName}`);
    };

    eventBus.subscribe('sound.rule.played', handleRulePlayed);
    return () => eventBus.unsubscribe('sound.rule.played', handleRulePlayed);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      setDragPosition({
        x: Math.max(0, e.clientX - dragOffset.x),
        y: Math.max(0, e.clientY - dragOffset.y)
      });
    };

    const handleMouseUp = (e: MouseEvent) => {
      const x = Math.max(0, e.clientX - dragOffset.x);
      const y = Math.max(0, e.clientY - dragOffset.y);
      setIsDragging(false);
      updateController({ floatingPos: { x, y } });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, updateController]);

  if (!controller.floating) return null;

  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const rect = playerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setIsDragging(true);
  };

  const handleMusicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const allFiles = Array.from(e.target.files ?? []);
    const files = allFiles.filter(isSupportedAudioFile);
    const rejected = allFiles.filter(file => !isSupportedAudioFile(file));
    if (rejected.length) setUploadMessage(`Unsupported file skipped: ${rejected.map(file => file.name).join(', ')}`);
    else setUploadMessage('');
    if (!files.length) {
      e.target.value = '';
      return;
    }
    Promise.all(files.map(file => new Promise<{ name: string; url: string }>((resolve) => {
      const reader = new FileReader();
      reader.onload = (ev) => resolve({ name: file.name, url: ev.target?.result as string });
      reader.readAsDataURL(file);
    }))).then(addPlaylistTracks);
    e.target.value = '';
  };

  const trackName = bgMusicName || (bgMusic ? 'Custom music' : 'No track loaded');
  const activePlaylistName = playlistName || 'Single Track';
  const hasPlaylistControls = playlist.length > 1;
  const isGlassUi = settings.uiAppearance.sidebarStyle === 'glass';
  const uiAccent = settings.uiAppearance.accentColor || appearance.accentColor;
  const buttonRadius = { rounded: 6, square: 2, minimal: 0 }[settings.uiAppearance.buttonStyle] ?? 6;
  const floatingBackground = isGlassUi ? 'rgba(2, 6, 23, 0.94)' : appearance.backgroundColor;
  const floatingText = isGlassUi ? '#dbeafe' : appearance.textColor;
  const floatingMutedText = isGlassUi ? '#8fa3ba' : appearance.textColor;
  const floatingBorder = isGlassUi ? 'rgba(56, 189, 248, 0.34)' : '#d7e0e7';
  const floatingHeaderBg = isGlassUi ? 'rgba(15, 23, 42, 0.84)' : 'rgba(0,0,0,0.04)';
  const floatingCardBg = isGlassUi ? 'rgba(15, 23, 42, 0.62)' : 'rgba(255,255,255,0.52)';
  const floatingCardBorder = isGlassUi ? 'rgba(148, 163, 184, 0.18)' : '#e3e8ee';
  const floatingButtonStyle: React.CSSProperties = {
    borderRadius: buttonRadius,
    border: isGlassUi ? '1px solid rgba(148, 163, 184, 0.24)' : undefined,
    background: isGlassUi ? 'rgba(15, 23, 42, 0.78)' : undefined,
    color: isGlassUi ? '#e2e8f0' : undefined,
    cursor: 'pointer'
  };

  return (
    <div
      ref={playerRef}
      className={`audio-controller-floating${isGlassUi ? ' glass' : ''}`}
      style={{
        position: 'fixed',
        left: dragPosition.x,
        top: dragPosition.y,
        zIndex: 1000,
        width: 286,
        borderRadius: appearance.shape === 'rounded' ? 12 : 2,
        border: `1px solid ${floatingBorder}`,
        background: floatingBackground,
        color: floatingText,
        boxShadow: isGlassUi ? '0 24px 70px rgba(0,0,0,0.58), 0 0 0 1px rgba(56,189,248,0.08)' : '0 10px 28px rgba(0,0,0,0.2)',
        overflow: 'hidden'
      }}
    >
      <div
        onMouseDown={handleHeaderMouseDown}
        style={{
          padding: '8px 10px',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
          background: floatingHeaderBg,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8
        }}
      >
        <strong style={{ fontSize: '0.78rem', color: floatingText }}>Audio Controller</strong>
        <button onClick={() => updateController({ floating: false })} onMouseDown={(e) => e.stopPropagation()} style={{ ...floatingButtonStyle, fontSize: '0.65rem', padding: '2px 7px' }}>
          Close
        </button>
      </div>

      <div style={{ padding: 10 }}>
        <div style={{ marginBottom: 10 }}>
          <WaveProgressBar
            progress={musicProgress}
            duration={musicDuration}
            isPlaying={isMusicPlaying && !controller.muted}
            accentColor={isGlassUi ? uiAccent : appearance.accentColor}
            disabled={!bgMusic || !musicDuration}
            unavailableLabel={bgMusic ? 'Waveform unavailable for this track.' : 'Load music to show playback progress.'}
            onSeek={seekBackgroundMusic}
          />
        </div>

        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {trackName}
          </div>
          <div style={{ fontSize: '0.62rem', opacity: 0.72, color: floatingMutedText }}>Playlist: {activePlaylistName}</div>
          {lastSoundRule && (
            <div style={{ fontSize: '0.58rem', opacity: 0.68, color: floatingMutedText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Last effect: {lastSoundRule}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          <button onClick={previousTrack} disabled={!hasPlaylistControls} title="Previous track" style={{ ...floatingButtonStyle, padding: '6px 7px' }}>{'<<'}</button>
          <button onClick={isMusicPlaying ? pauseBackgroundMusic : playBackgroundMusic} disabled={!bgMusic} style={{ ...floatingButtonStyle, flex: 1, padding: '6px 4px' }}>
            {isMusicPlaying ? 'Pause' : 'Play'}
          </button>
          <button onClick={stopBackgroundMusic} disabled={!bgMusic} style={{ ...floatingButtonStyle, flex: 1, padding: '6px 4px' }}>Stop</button>
          <button onClick={nextTrack} disabled={!hasPlaylistControls} title="Next track" style={{ ...floatingButtonStyle, padding: '6px 7px' }}>{'>>'}</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: '0.65rem', width: 44 }}>Music</span>
          <input type="range" min="0" max="1" step="0.01" value={musicVolume} onChange={(e) => setMusicVolume(parseFloat(e.target.value))} style={{ flex: 1, accentColor: isGlassUi ? uiAccent : appearance.sliderColor }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: '0.65rem', width: 44 }}>Master</span>
          <input type="range" min="0" max="1" step="0.01" value={masterVolume} onChange={(e) => setMasterVolume(parseFloat(e.target.value))} style={{ flex: 1, accentColor: isGlassUi ? uiAccent : appearance.sliderColor }} />
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: showAdvanced ? 8 : 0 }}>
          <button onClick={() => document.getElementById('floating-audio-upload')?.click()} style={{ ...floatingButtonStyle, flex: 1, padding: '6px 4px' }}>
            Add Music
          </button>
          <button onClick={() => updateController({ muted: !controller.muted })} style={{ ...floatingButtonStyle, flex: 1, padding: '6px 4px' }}>
            {controller.muted ? 'Unmute' : 'Mute'}
          </button>
          <button onClick={() => setShowAdvanced(current => !current)} style={{ ...floatingButtonStyle, flex: 1, padding: '6px 4px' }}>
            Advanced
          </button>
          <input id="floating-audio-upload" type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a,.mid,.midi" multiple onChange={handleMusicUpload} style={{ display: 'none' }} />
        </div>
        {uploadMessage && <div style={{ fontSize: '0.6rem', color: isGlassUi ? '#fbbf24' : '#9a3412', marginBottom: 6 }}>{uploadMessage}</div>}

        {showAdvanced && (
          <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 7, paddingTop: 2 }}>
            <div style={{ padding: 7, border: `1px solid ${floatingCardBorder}`, borderRadius: 6, background: floatingCardBg }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.68rem', fontWeight: 700 }}>
                Playback
                <select value={playbackMode} onChange={(e) => setPlaybackMode(e.target.value as typeof playbackMode)} style={{ padding: 5, borderRadius: buttonRadius, background: isGlassUi ? 'rgba(2, 6, 23, 0.82)' : undefined, color: isGlassUi ? '#e2e8f0' : undefined, border: isGlassUi ? '1px solid rgba(148, 163, 184, 0.22)' : undefined }}>
                  <option value="sequence">Play Through</option>
                  <option value="repeat-playlist">Repeat Playlist</option>
                  <option value="loop-track">Loop Current</option>
                  <option value="shuffle">Shuffle</option>
                </select>
              </label>
            </div>
            {playlist.length > 0 && (
              <div style={{ padding: 7, border: `1px solid ${floatingCardBorder}`, borderRadius: 6, background: floatingCardBg }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                  <strong style={{ fontSize: '0.68rem' }}>Queue</strong>
                  <button onClick={clearPlaylist} style={{ ...floatingButtonStyle, fontSize: '0.6rem', padding: '2px 6px' }}>Clear</button>
                </div>
                {playlist.map((track, index) => (
                  <div key={track.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.62rem', marginBottom: 4 }}>
                    <span style={{ flex: 1, fontWeight: index === currentTrackIndex ? 700 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {track.name}
                    </span>
                    <button onClick={() => removePlaylistTrack(track.id)} style={{ ...floatingButtonStyle, fontSize: '0.58rem', padding: '1px 5px' }}>Remove</button>
                  </div>
                ))}
              </div>
            )}
            {eventTypes.map(eventName => {
              const category = controller.categories[eventName] ?? { enabled: true, volume: 1 };
              const soundName = library.find(sound => sound.id === rules.find(rule => rule.event === eventName)?.soundId)?.name ?? 'No sound';

              return (
                <div key={eventName} style={{ padding: 7, border: `1px solid ${floatingCardBorder}`, borderRadius: 6, background: floatingCardBg }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.68rem', fontWeight: 700, textTransform: 'capitalize' }}>
                    <input type="checkbox" checked={category.enabled} onChange={(e) => updateCategory(eventName, { enabled: e.target.checked })} />
                    {eventName}
                  </label>
                  <div style={{ fontSize: '0.58rem', opacity: 0.7, color: floatingMutedText, margin: '3px 0 5px' }}>{soundName}</div>
                  <input type="range" min="0" max="1" step="0.01" value={category.volume} onChange={(e) => updateCategory(eventName, { volume: parseFloat(e.target.value) })} style={{ width: '100%', accentColor: isGlassUi ? uiAccent : appearance.sliderColor }} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioController;
