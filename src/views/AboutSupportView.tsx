import React from 'react';

const AboutSupportView: React.FC = () => {
  return (
    <div className="cu-themed-embedded-view cu-about-support-view cu-view-shell cu-stack-lg">
      <section className="cu-panel-card cu-pad cu-stack-sm">
        <h3 className="cu-section-title">About Chess Unleashed</h3>
        <p className="cu-help-text">
          Chess Unleashed is a modular chess and custom-game platform. It lets you customize pieces, themes, rules, sounds,
          events, bots, and animations without replacing the core game.
        </p>
        <p className="cu-help-text">
          The project is still in beta and active development. Some systems are complete, while others are intentionally
          staged for future expansion.
        </p>
      </section>

      <section className="cu-panel-card cu-pad cu-stack-sm">
        <h3 className="cu-section-title">Support Development</h3>
        <p className="cu-help-text">
          Donations are optional and appreciated. They help keep beta development moving and cover ongoing maintenance.
        </p>
        <div className="cu-notice cu-notice-warning">
          Donation link coming soon.
        </div>
      </section>

      <section className="cu-panel-card-muted cu-pad cu-stack-sm">
        <strong className="cu-section-title">What you can change</strong>
        <span className="cu-help-text">Pieces, board visuals, layered themes, sound rules, event rules, named animations, bots, and package contents.</span>
      </section>
    </div>
  );
};

export default AboutSupportView;
