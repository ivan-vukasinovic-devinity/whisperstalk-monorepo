export function LandingPage({ onGetStarted }) {
  return (
    <div className="landing-page">
      <nav className="landing-nav">
        <div className="landing-nav-brand">
          <span className="brand-icon">◯</span>
          <span className="landing-nav-name">WhisperTalk</span>
        </div>
        <button className="btn small" onClick={onGetStarted}>Open App</button>
      </nav>

      <section className="landing-hero">
        <div className="landing-hero-badge">End-to-End Encrypted Messenger</div>
        <h1>Whispers<br /><span className="hero-accent">Spoken Freely!</span></h1>
        <p className="landing-hero-sub">
          A private messenger built for people who value their freedom of speech
          and privacy. Encrypted end-to-end, with nothing stored on servers — and
          every conversation self-destructs in 12 hours.
        </p>
        <div className="landing-hero-actions">
          <button className="btn landing-cta" onClick={onGetStarted}>
            Start a Private Conversation
          </button>
          <a href="#how-it-works" className="landing-link">See How It Works ↓</a>
        </div>
      </section>

      <section className="landing-features">
        <div className="feature-card">
          <div className="feature-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h3>Privacy by Design</h3>
          <p>
            Your messages are encrypted on your device before they're sent. No
            corporation, no government, no third party can read your private
            conversations. Your privacy is absolute.
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12H2"/>
              <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
              <line x1="12" y1="16" x2="12" y2="16.01"/>
            </svg>
          </div>
          <h3>No Surveillance. No Records.</h3>
          <p>
            Big Tech stores your messages on their servers — available to data
            brokers, hackers, and authorities. WhisperTalk stores nothing. Your
            freedom of speech stays between you and who you're talking to.
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <h3>Gone in 12 Hours</h3>
          <p>
            Private conversations should stay private. Every message
            self-destructs after 12 hours. No searchable archives. No data
            mining. Your right to speak freely, protected by design.
          </p>
        </div>
      </section>

      <section className="landing-steps" id="how-it-works">
        <div className="landing-section-header">
          <h2>Freedom of speech in three steps</h2>
          <p className="landing-section-sub">
            No phone number. No email. No identity verification. Your privacy starts here.
          </p>
        </div>

        <div className="steps-grid">
          <div className="step-card">
            <div className="step-number">1</div>
            <h3>Claim Your Privacy</h3>
            <p>
              Pick any username. No personal information required — your identity
              is yours alone. No one tracks it. No one owns it.
            </p>
          </div>
          <div className="step-card">
            <div className="step-number">2</div>
            <h3>Connect on Your Terms</h3>
            <p>
              Share your QR code or username. No centralized friend lists. No
              phone book uploads. Your social connections stay private.
            </p>
          </div>
          <div className="step-card">
            <div className="step-number">3</div>
            <h3>Speak Without Fear</h3>
            <p>
              Express yourself freely. Messages are encrypted, relayed securely,
              and erased after 12 hours. No censorship, no monitoring.
            </p>
          </div>
        </div>
      </section>

      <section className="landing-comparison">
        <div className="landing-section-header">
          <h2>Built different from Big Tech</h2>
        </div>
        <div className="comparison-table">
          <div className="comparison-header">
            <span></span>
            <span className="comparison-them">Big Tech</span>
            <span className="comparison-us">WhisperTalk</span>
          </div>
          <div className="comparison-row">
            <span>Messages stored on server</span>
            <span className="comparison-them">Forever</span>
            <span className="comparison-us">Never</span>
          </div>
          <div className="comparison-row">
            <span>End-to-end encryption</span>
            <span className="comparison-them">Optional / backdoored</span>
            <span className="comparison-us">Always available</span>
          </div>
          <div className="comparison-row">
            <span>Sign-up requires</span>
            <span className="comparison-them">Email, phone, ID</span>
            <span className="comparison-us">Just a username</span>
          </div>
          <div className="comparison-row">
            <span>Data collection</span>
            <span className="comparison-them">Everything</span>
            <span className="comparison-us">Nothing</span>
          </div>
          <div className="comparison-row">
            <span>Content moderation</span>
            <span className="comparison-them">AI-scanned</span>
            <span className="comparison-us">None</span>
          </div>
          <div className="comparison-row">
            <span>Message history</span>
            <span className="comparison-them">Permanent</span>
            <span className="comparison-us">12h then gone</span>
          </div>
        </div>
      </section>

      <section className="landing-final-cta">
        <h2>Defend your privacy and freedom</h2>
        <p>
          Privacy is the foundation of free speech. Without it, every word you
          say can be used against you. WhisperTalk exists to protect both — no
          registration hassle, no data collection, no compromise.
        </p>
        <button className="btn landing-cta" onClick={onGetStarted}>
          Protect Your Privacy Now
        </button>
      </section>

      <footer className="landing-footer">
        <p>Privacy is a right. Free speech is non-negotiable. No tracking. No profiling. No exceptions.</p>
      </footer>
    </div>
  );
}
