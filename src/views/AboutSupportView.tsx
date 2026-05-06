import React from 'react';

const AboutSupportView: React.FC = () => {
  return (
    <div className="cu-themed-embedded-view cu-about-support-view" style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '0.9rem', lineHeight: 1.5 }}>
      <section style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h3 style={{ margin: 0, fontSize: '1rem' }}>About Chess Unleashed</h3>
        <p style={{ margin: 0 }}>
          Chess Unleashed is a modular chess and custom-game platform. It lets you customize pieces, themes, rules, sounds,
          events, bots, and animations without replacing the core game.
        </p>
        <p style={{ margin: 0 }}>
          The project is still in beta and active development. Some systems are complete, while others are intentionally
          staged for future expansion.
        </p>
      </section>

      <section style={{
        background: 'rgba(255,255,255,0.82)',
        border: '1px solid rgba(148,163,184,0.35)',
        borderRadius: '10px',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <h3 style={{ margin: 0, fontSize: '1rem' }}>Support Development</h3>
        <p style={{ margin: 0 }}>
          Donations are optional and appreciated. They help keep beta development moving and cover ongoing maintenance.
        </p>
        <div style={{
          padding: '10px 12px',
          borderRadius: '8px',
          background: 'rgba(249,115,22,0.08)',
          border: '1px dashed rgba(249,115,22,0.35)',
          color: '#9a3412',
          fontSize: '0.85rem'
        }}>
          Donation link coming soon.
        </div>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '6px', color: '#475569' }}>
        <strong style={{ fontSize: '0.9rem', color: '#1f2937' }}>What you can change</strong>
        <span>Pieces, board visuals, layered themes, sound rules, event rules, named animations, bots, and package contents.</span>
      </section>
    </div>
  );
};

export default AboutSupportView;
