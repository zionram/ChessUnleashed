import React from 'react';
import { useSettings } from '../context/SettingsContext';

const getInitials = (name: string) => {
  const trimmed = name.trim();
  if (!trimmed) return 'GP';
  return trimmed
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('');
};

const ProfileView: React.FC = () => {
  const { settings, updateLocalProfile, regenerateGuestId } = useSettings();
  const profile = settings.localProfile;

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateLocalProfile({ profileImage: reader.result });
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleRegenerateGuestId = () => {
    const confirmed = window.confirm('Generate a new Guest ID? This may affect future local multiplayer identity matching.');
    if (confirmed) regenerateGuestId();
  };

  return (
    <div className="view-container cu-view-shell">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Guest Profile now. Official profiles coming later.</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {profile.profileImage ? (
            <img
              src={profile.profileImage}
              alt=""
              style={{ width: '58px', height: '58px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #d0d7de' }}
            />
          ) : (
            <div style={{ width: '58px', height: '58px', borderRadius: '50%', background: '#e0e7ff', color: '#3730a3', display: 'grid', placeItems: 'center', fontWeight: 700, border: '1px solid #c7d2fe' }}>
              {getInitials(profile.displayName)}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569' }}>
              Profile Picture
            </label>
            <input type="file" accept="image/*" onChange={handleImageUpload} style={{ fontSize: '0.72rem' }} />
            {profile.profileImage && (
              <button
                type="button"
                onClick={() => updateLocalProfile({ profileImage: '' })}
                style={{ alignSelf: 'flex-start', padding: '4px 8px', fontSize: '0.68rem', border: '1px solid #d0d7de', borderRadius: '4px', background: '#fff', cursor: 'pointer' }}
              >
                Remove Picture
              </button>
            )}
          </div>
        </div>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.72rem', fontWeight: 600, color: '#475569' }}>
          Profile Name
          <input
            type="text"
            value={profile.displayName}
            onChange={(event) => updateLocalProfile({ displayName: event.target.value })}
            placeholder="Guest Player"
            style={{ padding: '8px', fontSize: '0.8rem', border: '1px solid #d0d7de', borderRadius: '6px' }}
          />
        </label>

        <div style={{ padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '5px' }}>Guest ID</div>
          <div style={{ fontSize: '0.68rem', color: '#64748b', marginBottom: '8px' }}>
            This temporary ID is stored locally and helps identify you in local sessions. Profile names do not need to be unique.
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: '0.68rem', padding: '7px', borderRadius: '5px', background: '#fff', border: '1px solid #d0d7de', wordBreak: 'break-all' }}>
            {profile.guestId}
          </div>
          <button
            type="button"
            onClick={handleRegenerateGuestId}
            style={{ marginTop: '8px', padding: '6px 9px', fontSize: '0.72rem', border: '1px solid #d0d7de', borderRadius: '5px', background: '#fff', cursor: 'pointer' }}
          >
            Reset Guest ID
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileView;
