import React, { useState } from 'react'
import { loginUser, registerUser } from '../services/api'

export default function PublicLandingPage({
  onLoginSuccess,
  apiStatus = 'connected'
}) {
  const [authMode, setAuthMode] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('Safety Officer')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [activePreviewTab, setActivePreviewTab] = useState('dashboard') // 'dashboard' | 'vision'

  // Pre-fill demo credentials for mentor/college evaluator convenience
  const handleFillDemoCredentials = () => {
    setEmail('demo@siteguard.ai')
    setPassword('SiteGuard2026!')
    setAuthMode('login')
    setErrorMessage('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage('')

    if (!email || !password) {
      setErrorMessage('Please provide both email and password.')
      return
    }

    if (authMode === 'register' && !fullName.trim()) {
      setErrorMessage('Please provide your full name for account creation.')
      return
    }

    setLoading(true)
    try {
      if (authMode === 'login') {
        const data = await loginUser(email, password)
        const token = data?.access_token || data?.accessToken
        if (onLoginSuccess) {
          onLoginSuccess(data.user, token)
        }
      } else {
        const data = await registerUser({
          email,
          password,
          fullName,
          role
        })
        const token = data?.access_token || data?.accessToken
        if (onLoginSuccess) {
          onLoginSuccess(data.user, token)
        }
      }
    } catch (err) {
      console.error('[SITEGUARD] Authentication error:', err)
      let msg = err.message || 'Authentication failed. Please verify your credentials.'
      if (msg.includes('401') || msg.toLowerCase().includes('incorrect') || msg.toLowerCase().includes('invalid')) {
        msg = 'Invalid email or password. You can click "Quick Demo Account" to evaluate with mentor credentials.'
      } else if (msg.includes('409') || msg.toLowerCase().includes('already registered')) {
        msg = 'An account with this email already exists. Please switch to Sign In.'
      }
      setErrorMessage(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="landing-page-root">
      {/* ======================================================================
          Top Navigation Bar
          ====================================================================== */}
      <header className="landing-nav-bar">
        <div className="landing-nav-container">
          <div className="landing-brand">
            <div className="brand-icon-shield" title="SITEGUARD AI">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <div className="landing-brand-text">
              <span className="landing-brand-title">SITEGUARD <span>AI</span></span>
              <span className="landing-brand-subtitle">Construction Risk Intelligence</span>
            </div>
          </div>

          <nav className="landing-nav-links">
            <a href="#how-it-works">How It Works</a>
            <a href="#platform-preview">Preview</a>
            <a href="#core-features">Features</a>
            <a href="#why-siteguard">Why SiteGuard</a>
          </nav>

          <div className="landing-nav-actions">
            <div className={`landing-api-pill ${apiStatus === 'connected' ? 'online' : 'offline'}`}>
              <span className="status-indicator-dot" />
              <span>{apiStatus === 'connected' ? 'FastAPI Connected' : 'Offline Mode'}</span>
            </div>
            <button
              type="button"
              className="landing-signin-jump-btn"
              onClick={() => {
                const el = document.getElementById('auth-form-card')
                if (el) el.scrollIntoView({ behavior: 'smooth' })
              }}
            >
              Sign In
            </button>
          </div>
        </div>
      </header>

      {/* ======================================================================
          Hero & Prominent Login Section
          ====================================================================== */}
      <section className="landing-hero-section">
        <div className="landing-hero-container">
          {/* Left Column: Heading, Value Prop & Metrics */}
          <div className="landing-hero-left">
            <div className="landing-badge">
              <span className="badge-pulse-dot" />
              <span>ENTERPRISE RISK MANAGEMENT &amp; VISION AI</span>
            </div>

            <h1 className="landing-hero-heading">
              Smarter Construction.<br />
              <span className="gradient-text">Safer Sites.</span>
            </h1>

            <p className="landing-hero-subtext">
              SITEGUARD AI combines local computer vision neural networks with automated
              incident triage to help safety directors, superintendents, and project managers
              identify potential job-site hazards, evaluate risks, and enforce OSHA safety compliance.
            </p>

            <div className="landing-feature-chips">
              <div className="feature-chip">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--emerald-light)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                <span>YOLOv8 Computer Vision</span>
              </div>
              <div className="feature-chip">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--emerald-light)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span>OSHA 1926 Aligned</span>
              </div>
              <div className="feature-chip">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--emerald-light)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 14 14" />
                </svg>
                <span>Sub-Second Inference</span>
              </div>
            </div>

            <div className="landing-quick-demo-callout">
              <div className="demo-callout-icon">💡</div>
              <div className="demo-callout-body">
                <strong>Mentor &amp; College Project Evaluation:</strong>
                <span> A pre-configured demo account is ready. Use the <em>One-Click Demo Login</em> button on the card to authenticate instantly.</span>
              </div>
            </div>
          </div>

          {/* Right Column: Prominent Enterprise Login / Register Card */}
          <div className="landing-hero-right">
            <div className="auth-card" id="auth-form-card">
              <div className="auth-card-header">
                <div className="auth-tabs">
                  <button
                    type="button"
                    className={`auth-tab-btn ${authMode === 'login' ? 'active' : ''}`}
                    onClick={() => {
                      setAuthMode('login')
                      setErrorMessage('')
                    }}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    className={`auth-tab-btn ${authMode === 'register' ? 'active' : ''}`}
                    onClick={() => {
                      setAuthMode('register')
                      setErrorMessage('')
                    }}
                  >
                    Create Account
                  </button>
                </div>
              </div>

              {/* Fast 1-Click Demo Fill for Evaluators */}
              <button
                type="button"
                className="demo-autofill-btn"
                onClick={handleFillDemoCredentials}
                title="Fill demo credentials (demo@siteguard.ai)"
              >
                <span className="bolt-icon">⚡</span>
                <span>Fill Evaluator Demo Credentials</span>
              </button>

              {errorMessage && (
                <div className="auth-error-banner" role="alert">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="auth-form">
                {authMode === 'register' && (
                  <>
                    <div className="auth-field-group">
                      <label htmlFor="auth-fullname">Full Name</label>
                      <input
                        id="auth-fullname"
                        type="text"
                        placeholder="e.g. Alex Morgan"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        className="auth-input"
                        autoComplete="name"
                      />
                    </div>

                    <div className="auth-field-group">
                      <label htmlFor="auth-role">Platform Role</label>
                      <select
                        id="auth-role"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="auth-select"
                      >
                        <option value="Safety Officer">Safety Officer</option>
                        <option value="Site Superintendent">Site Superintendent</option>
                        <option value="Project Director">Project Director</option>
                        <option value="Compliance Auditor">Compliance Auditor</option>
                      </select>
                    </div>
                  </>
                )}

                <div className="auth-field-group">
                  <label htmlFor="auth-email">Corporate Email</label>
                  <input
                    id="auth-email"
                    type="email"
                    placeholder="supervisor@siteguard.ai"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="auth-input"
                    autoComplete="email"
                  />
                </div>

                <div className="auth-field-group">
                  <label htmlFor="auth-password">Password</label>
                  <div className="password-input-wrapper">
                    <input
                      id="auth-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="auth-input"
                      autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="auth-submit-btn"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="btn-spinner-wrap">
                      <span className="btn-spinner" />
                      <span>{authMode === 'login' ? 'Authenticating...' : 'Creating Account...'}</span>
                    </span>
                  ) : (
                    <span>{authMode === 'login' ? 'Sign In to Command Center →' : 'Complete Registration & Access →'}</span>
                  )}
                </button>
              </form>

              <div className="auth-card-footer">
                <div className="demo-credentials-text">
                  <span>Demo Account: <code>demo@siteguard.ai</code></span>
                  <span>Password: <code>SiteGuard2026!</code></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================================
          Section 1: How SITEGUARD AI Works (3 Sequential Steps)
          ====================================================================== */}
      <section className="landing-section" id="how-it-works">
        <div className="landing-section-container">
          <div className="section-header-centered">
            <span className="section-pretitle">METHODOLOGY</span>
            <h2 className="section-title">How SITEGUARD AI Works</h2>
            <p className="section-subtitle">
              A seamless, three-step continuous workflow converting job-site visual data into actionable safety governance.
            </p>
          </div>

          <div className="how-it-works-grid">
            {/* Step 1 */}
            <div className="step-card">
              <div className="step-number-badge">01</div>
              <div className="step-icon-wrap">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <h3 className="step-title">Upload Site Information or Photo</h3>
              <p className="step-description">
                Safety personnel, site inspectors, or autonomous drones capture real-time visual
                imagery of scaffolding, perimeter edges, crane lifting corridors, or trench excavations.
              </p>
              <div className="step-detail-tag">JPEG, PNG &bull; Direct Upload</div>
            </div>

            {/* Step 2 */}
            <div className="step-card featured">
              <div className="step-number-badge">02</div>
              <div className="step-icon-wrap">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </div>
              <h3 className="step-title">AI Analyzes Recognizable Objects</h3>
              <p className="step-description">
                The embedded local YOLOv8 neural network processes pixel tensors on the FastAPI
                backend, identifying workers, heavy machinery, vehicles, and equipment with exact coordinates.
              </p>
              <div className="step-detail-tag">YOLOv8 &bull; Real Inference</div>
            </div>

            {/* Step 3 */}
            <div className="step-card">
              <div className="step-number-badge">03</div>
              <div className="step-icon-wrap">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <polyline points="9 11 12 14 22 4" />
                </svg>
              </div>
              <h3 className="step-title">Review Potential Risks &amp; Safety Alerts</h3>
              <p className="step-description">
                Deterministic risk scoring calculates composite scores (1–100), generates tailored
                action recommendations, and synchronizes critical alerts to the safety registry.
              </p>
              <div className="step-detail-tag">Instant Triage &bull; Audit Trail</div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================================
          Section 2: Platform Preview & Interactive Visual Demo
          ====================================================================== */}
      <section className="landing-section dark-alt" id="platform-preview">
        <div className="landing-section-container">
          <div className="section-header-centered">
            <span className="section-pretitle">INTERFACE PREVIEW</span>
            <h2 className="section-title">Production Interface &amp; Vision Console</h2>
            <p className="section-subtitle">
              Engineered with deep navy surfaces, restrained emerald accents, and high-density telemetry displays.
            </p>

            <div className="preview-tab-controls">
              <button
                type="button"
                className={`preview-tab-btn ${activePreviewTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => setActivePreviewTab('dashboard')}
              >
                Risk Command Dashboard
              </button>
              <button
                type="button"
                className={`preview-tab-btn ${activePreviewTab === 'vision' ? 'active' : ''}`}
                onClick={() => setActivePreviewTab('vision')}
              >
                AI Photo Risk Analyzer
              </button>
            </div>
          </div>

          <div className="landing-preview-window">
            <div className="preview-window-chrome">
              <div className="chrome-dots">
                <span className="chrome-dot red" />
                <span className="chrome-dot yellow" />
                <span className="chrome-dot green" />
              </div>
              <div className="chrome-title-bar">
                <span>https://siteguard.ai/console/{activePreviewTab}</span>
              </div>
              <div className="chrome-status-tag">
                <span className="status-indicator-dot" />
                <span>YOLOv8 ACTIVE</span>
              </div>
            </div>

            <div className="preview-window-content">
              {activePreviewTab === 'dashboard' ? (
                <img
                  src="/dashboard-preview.png"
                  alt="SITEGUARD AI Enterprise Command Dashboard Preview"
                  className="preview-screenshot-img"
                  loading="lazy"
                />
              ) : (
                <img
                  src="/vision-preview.png"
                  alt="SITEGUARD AI Photo Risk Analyzer Preview"
                  className="preview-screenshot-img"
                  loading="lazy"
                />
              )}
            </div>

            <div className="preview-window-caption">
              <span>Actual UI screenshot from SITEGUARD AI &bull; Deep Navy Theme with Live SQLite &amp; YOLOv8 backend</span>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================================
          Section 3: The Five Main Features Highlight
          ====================================================================== */}
      <section className="landing-section" id="core-features">
        <div className="landing-section-container">
          <div className="section-header-centered">
            <span className="section-pretitle">CORE ARCHITECTURE</span>
            <h2 className="section-title">Five Core Capabilities</h2>
            <p className="section-subtitle">
              A disciplined, streamlined suite of five authenticated tools covering all key aspects of job-site safety.
            </p>
          </div>

          <div className="landing-features-grid">
            {/* Feature 1: Dashboard */}
            <div className="feature-card">
              <div className="feature-icon-pill">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
              </div>
              <div className="feature-card-header">
                <span className="feature-index">01</span>
                <h3 className="feature-name">Dashboard Command Center</h3>
              </div>
              <p className="feature-desc">
                Real-time portfolio overview across active sites. Track overall risk posture,
                open hazard counts, critical hazards, active sensor alerts, and execute 1-click risk sweeps.
              </p>
              <ul className="feature-points">
                <li>Multi-site risk indexing</li>
                <li>Severity distribution breakdown</li>
                <li>Live activity timeline</li>
              </ul>
            </div>

            {/* Feature 2: AI Photo Risk Analyzer */}
            <div className="feature-card highlight-card">
              <div className="feature-icon-pill">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </div>
              <div className="feature-card-header">
                <span className="feature-index">02</span>
                <h3 className="feature-name">AI Photo Risk Analyzer</h3>
              </div>
              <p className="feature-desc">
                Upload construction site photos and trigger local YOLOv8 neural network inference.
                Detect workers, heavy machinery, and equipment with real bounding box annotations.
              </p>
              <ul className="feature-points">
                <li>Real local YOLOv8 inference (no mock)</li>
                <li>Customizable confidence threshold</li>
                <li>Direct hazard registration flow</li>
              </ul>
            </div>

            {/* Feature 3: Hazard Management */}
            <div className="feature-card">
              <div className="feature-icon-pill">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div className="feature-card-header">
                <span className="feature-index">03</span>
                <h3 className="feature-name">Hazard Management</h3>
              </div>
              <p className="feature-desc">
                Comprehensive incident registry backed by SQLite database. Register new hazards,
                inspect severity and likelihood matrix, and resolve or reopen incidents with full audit trails.
              </p>
              <ul className="feature-points">
                <li>Severity &times; Likelihood scoring (1-100)</li>
                <li>Category safety protocol recommendations</li>
                <li>Persistent status lifecycle tracking</li>
              </ul>
            </div>

            {/* Feature 4: Safety Alerts */}
            <div className="feature-card">
              <div className="feature-icon-pill">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </div>
              <div className="feature-card-header">
                <span className="feature-index">04</span>
                <h3 className="feature-name">Safety Alerts Center</h3>
              </div>
              <p className="feature-desc">
                Prioritized incident queue capturing automatic high-risk escalations and sensor
                anomalies. Allows safety officers to acknowledge alerts and track response times.
              </p>
              <ul className="feature-points">
                <li>Real-time alert dispatching</li>
                <li>Critical &amp; High priority escalation</li>
                <li>Auditable acknowledgment status</li>
              </ul>
            </div>

            {/* Feature 5: Reports */}
            <div className="feature-card">
              <div className="feature-icon-pill">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <div className="feature-card-header">
                <span className="feature-index">05</span>
                <h3 className="feature-name">Executive Reports</h3>
              </div>
              <p className="feature-desc">
                Generate production-grade safety dossiers and risk summaries. Download formatted
                PDF executive briefs, actuarial risk reviews, CSV hazard lists, and raw JSON telemetry.
              </p>
              <ul className="feature-points">
                <li>Professional PDF generation</li>
                <li>CSV hazard export for spreadsheets</li>
                <li>Complete JSON telemetry snapshots</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================================
          Section 4: Why SITEGUARD AI?
          ====================================================================== */}
      <section className="landing-section dark-alt" id="why-siteguard">
        <div className="landing-section-container">
          <div className="section-header-centered">
            <span className="section-pretitle">THE VALUE PROPOSITION</span>
            <h2 className="section-title">Why SITEGUARD AI?</h2>
            <p className="section-subtitle">
              Designed specifically for the rigorous demands of civil engineering, high-rise commercial, and industrial construction.
            </p>
          </div>

          <div className="why-grid">
            <div className="why-card">
              <div className="why-icon">🛡️</div>
              <h4 className="why-card-title">Proactive vs. Reactive Safety</h4>
              <p className="why-card-text">
                Traditional safety programs analyze incidents after an injury occurs. SITEGUARD AI
                provides early visual indicators and automated guidance to resolve conditions before they cause harm.
              </p>
            </div>

            <div className="why-card">
              <div className="why-icon">⚡</div>
              <h4 className="why-card-title">Real Computer Vision Inference</h4>
              <p className="why-card-text">
                Unlike prototypes that display static mock detections, SITEGUARD AI runs actual
                YOLOv8 object detection on real image tensors, calculating exact bounding boxes and detection counts.
              </p>
            </div>

            <div className="why-card">
              <div className="why-icon">📊</div>
              <h4 className="why-card-title">Unified Single-Pane Oversight</h4>
              <p className="why-card-text">
                Bridges the communication gap between field workers, site safety superintendents,
                and corporate risk executives with consistent scoring and actionable incident alerts.
              </p>
            </div>

            <div className="why-card">
              <div className="why-icon">🔒</div>
              <h4 className="why-card-title">Enterprise Data &amp; Auth Security</h4>
              <p className="why-card-text">
                Secured by signed JWT access tokens, bcrypt password hashing, and persistent
                SQLite database storage, ensuring your job-site safety records remain private and tamper-evident.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================================
          Footer with Required Safety Disclaimer
          ====================================================================== */}
      <footer className="landing-footer">
        <div className="landing-footer-container">
          <div className="footer-top-row">
            <div className="footer-brand">
              <div className="brand-icon-shield small">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
              <span className="footer-brand-title">SITEGUARD <span>AI</span></span>
            </div>
            <div className="footer-meta">
              <span>v2.4.0 Enterprise Edition &bull; College Demonstration Platform</span>
            </div>
          </div>

          <div className="footer-disclaimer-box">
            <strong>IMPORTANT SAFETY DISCLAIMER:</strong> SITEGUARD AI analysis and computer vision object
            detections support preliminary risk assessment and informational triage only. General object
            detection does not independently establish a safety violation. This platform does not replace
            professional on-site inspections by certified safety engineers, statutory OSHA 1926 compliance audits,
            or mandatory structural engineering certifications.
          </div>

          <div className="footer-bottom-row">
            <span className="footer-copyright">&copy; 2026 SITEGUARD AI &bull; Built for Autonomous Construction Risk Intelligence</span>
            <div className="footer-quick-links">
              <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                Back to Top ↑
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
