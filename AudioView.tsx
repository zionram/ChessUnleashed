import React, { useEffect, useMemo, useState } from 'react';
import { isSupportedAudioFile, useAudio } from '../context/AudioContext';
import { useSettings } from '../context/SettingsContext';
import WaveProgressBar from '../components/audio/WaveProgressBar';
import { eventBus } from '../events/EventBus';
import type { GameEvent } from '../events/types';

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

const AudioView: React.FC = () => {
  const { 
    masterVolume, setMasterVolume, musicVolume, setMusicVolume, sfxVolume, setSfxVolume,
    bgMusic, bgMusicName, playlistName, isMusicPlaying, musicProgress, musicDuration,
    playlist, currentTrackIndex, playbackMode,
    addPlaylistTracks, removePlaylistTrack, clearPlaylist, nextTrack, previousTrack,
    setPlaybackMode, playBackgroundMusic, pauseBackgroundMusic, stopBackgroundMusic,
    seekBackgroundMusic, getCurrentProfile, applyProfile, rules, library,
    controller, updateController, updateCategory, playEvent
  } = useAudio();
  const { settings, updateTemplate, toggleView } = useSettings();
  const [showSoundTypes, setShowSoundTypes] = useState(false);
  const [lastSoundRule, setLastSoundRule] = useState('');
  const [uploadMessage, setUploadMessage] = useState('');
  const eventTypes = useMemo(() => Array.from(new Set(rules.map(rule => rule.event))), [rules]);
  const previewEvent = eventTypes[0] || 'move';
  const legacyTemplate = settings.template as typeof settings.template & { audioPlayerAppearance?: typeof settings.template.audioControllerAppearance };
  const audioAppearance = settings.template.audioControllerAppearance ?? legacyTemplate.audioPlayerAppearance ?? DEFAULT_AUDIO_CONTROLLER_APPEARANCE;
  const trackName = bgMusicName || (bgMusic ? 'Custom music' : 'No track loaded');
  const activePlaylistName = playlistName || 'Single Track';
  const soundEditorOpen = settings.activeViews.includes('sound-editor');

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

  const handleMusicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const allFiles = Array.from(e.target.files ?? []);
    if (!allFiles.length) return;
    const files = allFiles.filter(isSupportedAudioFile);
    const rejected = allFiles.filter(file => !isSupportedAudioFile(file));
    if (rejected.length) {
      setUploadMessage(`Unsupported file skipped: ${rejected.map(file => file.name).join(', ')}. Use MP3, WAV, OGG, M4A, MID, or MIDI.`);
    } else {
      setUploadMessage('');
    }
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

  const loadControllerThemeFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        const nextAppearance = json.audioControllerAppearance ?? json.audioPlayerAppearance ?? json;
        updateTemplate({
          audioControllerAppearance: {
            ...audioAppearance,
            ...nextAppearance,
            controlImages: {
              ...(audioAppearance.controlImages || {}),
              ...(nextAppearance.controlImages || {})
            }
          }
        });
      } catch (err) {
        alert('Invalid controller theme file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const saveProfileFile = () => {
    const profile = getCurrentProfile();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(profile, null, 2));
    const link = document.createElement('a');
    link.setAttribute("href", dataStr);
    link.setAttribute("download", `audio_profile.json`);
    link.click();
  };

  const loadProfileFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        applyProfile(json);
      } catch (err) { alert("Invalid profile file."); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="view-container">
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ display: 'flex', gap: '5px' }}>
          <button onClick={saveProfileFile} title="Save profile as JSON" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>Save</button>
          <button onClick={() => document.getElementById('prof-load-in')?.click()} title="Load profile from JSON" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>Load</button>
          <input id="prof-load-in" type="file" accept=".json" onChange={loadProfileFile} style={{ display: 'none' }} />
        </div>
      </div>

      <section className="cu-audio-card" style={{ marginBottom: '20px', padding: '12px', border: '1px solid #d7e0e7', borderRadius: '8px', background: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
          <h4 style={{ fontSize: '0.85rem', margin: 0 }}>Audio Controller</h4>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button
              onClick={() => {
                if (!soundEditorOpen) toggleView('sound-editor');
              }}
              disabled={soundEditorOpen}
              style={{ fontSize: '0.7rem', padding: '4px 8px' }}
            >
              {soundEditorOpen ? 'Sound Editor Open' : 'Open Sound Editor'}
            </button>
            <button onClick={() => updateController({ floating: !controller.floating })} style={{ fontSize: '0.7rem', padding: '4px 8px' }}>
              {controller.floating ? 'Hide Controller' : 'Float Controller'}
            </button>
          </div>
        </div>
        <div className="cu-audio-inner-card" style={{ padding: '10px', border: '1px solid #e3e8ee', borderRadius: '8px', background: '#fafbfc', marginBottom: '12px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '2px' }}>{trackName}</div>
          <div style={{ fontSize: '0.62rem', color: '#5d6d7e', marginBottom: '8px' }}>Playlist: {activePlaylistName}</div>
          {lastSoundRule && (
            <div style={{ fontSize: '0.62rem', color: '#5d6d7e', marginBottom: '8px' }}>
              Last effect: {lastSoundRule}
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <button onClick={previousTrack} disabled={playlist.length < 2} title="Previous track" style={{ padding: '7px 8px' }}>{'<<'}</button>
            <button onClick={isMusicPlaying ? pauseBackgroundMusic : playBackgroundMusic} disabled={!bgMusic} style={{ flex: '1 1 70px', padding: '7px 8px' }}>
              {isMusicPlaying ? 'Pause' : 'Play'}
            </button>
            <button onClick={stopBackgroundMusic} disabled={!bgMusic} style={{ flex: '1 1 70px', padding: '7px 8px' }}>Stop</button>
            <button onClick={nextTrack} disabled={playlist.length < 2} title="Next track" style={{ padding: '7px 8px' }}>{'>>'}</button>
          </div>
          <div style={{ marginBottom: '8px' }}>
            <WaveProgressBar
              progress={musicProgress}
              duration={musicDuration}
              isPlaying={isMusicPlaying && !controller.muted}
              accentColor={audioAppearance.accentColor}
              disabled={!bgMusic || !musicDuration}
              unavailableLabel={bgMusic ? 'Waveform unavailable for this track.' : 'Load music to show playback progress.'}
              onSeek={seekBackgroundMusic}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={() => document.getElementById('mixer-music-up')?.click()} style={{ flex: '1 1 120px', padding: '7px 8px' }}>Add Music</button>
            {playlist.length > 0 && <button onClick={clearPlaylist} style={{ flex: '1 1 90px', padding: '7px 8px', color: '#a33' }}>Clear Playlist</button>}
            <input id="mixer-music-up" type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a,.mid,.midi" multiple onChange={handleMusicUpload} style={{ display: 'none' }} />
          </div>
          {uploadMessage && <div style={{ marginTop: '6px', fontSize: '0.68rem', color: '#9a3412' }}>{uploadMessage}</div>}
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.72rem', marginTop: '10px' }}>
            Playback Mode
            <select value={playbackMode} onChange={(e) => setPlaybackMode(e.target.value as typeof playbackMode)} style={{ padding: '6px', fontSize: '0.78rem' }}>
              <option value="sequence">Play Through</option>
              <option value="repeat-playlist">Repeat Playlist</option>
              <option value="loop-track">Loop Current Track</option>
              <option value="shuffle">Shuffle</option>
            </select>
          </label>
          {playlist.length > 0 && (
            <div style={{ marginTop: '10px', borderTop: '1px solid #e3e8ee', paddingTop: '8px', maxHeight: '150px', overflowY: 'auto' }}>
              {playlist.map((track, index) => (
                <div key={track.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.7rem', marginBottom: '5px' }}>
                  <span style={{ flex: 1, fontWeight: index === currentTrackIndex ? 700 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {track.name}
                  </span>
                  <button onClick={() => removePlaylistTrack(track.id)} style={{ fontSize: '0.62rem', padding: '2px 6px' }}>Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <button onClick={() => playEvent(previewEvent)} style={{ flex: '1 1 80px', padding: '8px' }}>Play Preview</button>
          <button onClick={() => updateController({ muted: !controller.muted })} style={{ flex: '1 1 80px', padding: '8px' }}>
            {controller.muted ? 'Unmute' : 'Mute'}
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <span style={{ width: '92px', fontSize: '0.75rem' }}>Music</span>
          <input type="range" min="0" max="1" step="0.01" value={musicVolume} onChange={(e) => setMusicVolume(parseFloat(e.target.value))} style={{ flex: 1 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <span style={{ width: '92px', fontSize: '0.75rem' }}>Master</span>
          <input type="range" min="0" max="1" step="0.01" value={masterVolume} onChange={(e) => setMasterVolume(parseFloat(e.target.value))} style={{ flex: 1 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <span style={{ width: '92px', fontSize: '0.75rem' }}>Effects</span>
          <input type="range" min="0" max="1" step="0.01" value={sfxVolume} onChange={(e) => setSfxVolume(parseFloat(e.target.value))} style={{ flex: 1 }} />
        </div>
        <button onClick={() => setShowSoundTypes(current => !current)} style={{ width: '100%', padding: '8px', marginTop: '6px' }}>
          {showSoundTypes ? 'Hide Advanced' : 'Advanced'}
        </button>
        {showSoundTypes && (
          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '260px', overflowY: 'auto' }}>
            {eventTypes.map(eventName => {
              const category = controller.categories[eventName] ?? { enabled: true, volume: 1 };
              const soundName = library.find(sound => sound.id === rules.find(rule => rule.event === eventName)?.soundId)?.name ?? 'No sound';

              return (
                <div key={eventName} className="cu-audio-inner-card" style={{ padding: '8px', border: '1px solid #e3e8ee', borderRadius: '6px', background: '#fafbfc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'capitalize' }}>
                      <input type="checkbox" checked={category.enabled} onChange={(e) => updateCategory(eventName, { enabled: e.target.checked })} />
                      {eventName}
                    </label>
                    <button onClick={() => playEvent(eventName)} disabled={!category.enabled} style={{ fontSize: '0.65rem', padding: '3px 7px' }}>Preview</button>
                  </div>
                  <div style={{ fontSize: '0.62rem', color: '#5d6d7e', marginBottom: '5px' }}>{soundName}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.65rem', width: 44 }}>Volume</span>
                    <input type="range" min="0" max="1" step="0.01" value={category.volume} onChange={(e) => updateCategory(eventName, { volume: parseFloat(e.target.value) })} style={{ flex: 1 }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="cu-audio-card" style={{ marginBottom: '20px', padding: '12px', border: '1px solid #d7e0e7', borderRadius: '8px', background: '#fff' }}>
        <h4 style={{ fontSize: '0.85rem', margin: '0 0 10px' }}>Controller Theme</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem' }}>
            Accent
            <input type="color" value={audioAppearance.accentColor} onChange={(e) => updateTemplate({ audioControllerAppearance: { ...audioAppearance, accentColor: e.target.value, sliderColor: e.target.value } })} />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem' }}>
            Background
            <input type="color" value={audioAppearance.backgroundColor} onChange={(e) => updateTemplate({ audioControllerAppearance: { ...audioAppearance, backgroundColor: e.target.value } })} />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem' }}>
            Text
            <input type="color" value={audioAppearance.textColor} onChange={(e) => updateTemplate({ audioControllerAppearance: { ...audioAppearance, textColor: e.target.value } })} />
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={() => document.getElementById('audio-controller-theme-load')?.click()} style={{ flex: '1 1 130px', padding: '7px 8px' }}>Load Controller Theme</button>
            <input id="audio-controller-theme-load" type="file" accept=".json,application/json" onChange={loadControllerThemeFile} style={{ display: 'none' }} />
          </div>
          <div style={{ fontSize: '0.62rem', color: '#6b7280' }}>
            Controller skin metadata is stored on the active template for ExperiencePackage export.
          </div>
        </div>
      </section>

      <p style={{ fontSize: '0.65rem', color: '#888', marginTop: '15px', fontStyle: 'italic' }}>
        Note: Use the Sound Editor for advanced trigger rules and library management.
      </p>
    </div>
  );
};

export default AudioView;
