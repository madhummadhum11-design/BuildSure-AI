import { useState, useRef, useEffect } from 'react'
import './App.css'

// ============================================================================
// Sample Telemetry Datasets (Demo Environment)
// ============================================================================
const ALL_SITES = [
  { id: 'SITE-01', name: 'Riverside Bridge Expansion', score: 89, level: 'Critical', category: 'critical', activeCranes: 4, openHazards: 5, workers: 142 },
  { id: 'SITE-02', name: 'Metro Heights Tower A', score: 78, level: 'High', category: 'high', activeCranes: 6, openHazards: 4, workers: 215 },
  { id: 'SITE-03', name: 'Harbor Container Terminal', score: 61, level: 'High', category: 'high', activeCranes: 3, openHazards: 3, workers: 88 },
  { id: 'SITE-04', name: 'Bayfront Logistics Hub', score: 42, level: 'Medium', category: 'medium', activeCranes: 2, openHazards: 2, workers: 64 },
  { id: 'SITE-05', name: 'City Center Transit Hub', score: 35, level: 'Low', category: 'low', activeCranes: 3, openHazards: 2, workers: 110 },
  { id: 'SITE-06', name: 'Highland Commercial Park', score: 24, level: 'Low', category: 'low', activeCranes: 1, openHazards: 1, workers: 45 }
]

const INITIAL_HAZARDS = [
  {
    id: 'HAZ-1082',
    site: 'Riverside Bridge Expansion',
    hazard: 'Unanchored Perimeter Scaffolding at Pier 3',
    severity: 'Critical',
    riskScore: 92,
    status: 'Open'
  },
  {
    id: 'HAZ-1079',
    site: 'Metro Heights Tower A',
    hazard: 'PPE Violation: Missing Fall Arrest Harness at Level 14',
    severity: 'High',
    riskScore: 84,
    status: 'In Review'
  },
  {
    id: 'HAZ-1075',
    site: 'Harbor Container Terminal',
    hazard: 'Heavy Machinery Ground Proximity Alarm Disabled',
    severity: 'High',
    riskScore: 76,
    status: 'Investigating'
  },
  {
    id: 'HAZ-1071',
    site: 'Bayfront Logistics Hub',
    hazard: 'Submerged Electrical Conduit near Foundation Trench',
    severity: 'Medium',
    riskScore: 58,
    status: 'Work Paused'
  },
  {
    id: 'HAZ-1068',
    site: 'City Center Transit Hub',
    hazard: 'Excavation Shoring Wall Micromovement (>2.5mm)',
    severity: 'Medium',
    riskScore: 52,
    status: 'In Review'
  },
  {
    id: 'HAZ-1064',
    site: 'Highland Commercial Park',
    hazard: 'Obstructed Emergency Egress Route in Sector B',
    severity: 'Low',
    riskScore: 28,
    status: 'Resolved'
  }
]

const INITIAL_ALERTS = [
  {
    id: 'ALT-401',
    title: 'High Wind Velocity Alert (44 km/h)',
    desc: 'Autonomous agent recommended immediate suspension of Tower Crane #2 operations.',
    site: 'Riverside Bridge Expansion',
    time: '8m ago',
    type: 'critical'
  },
  {
    id: 'ALT-402',
    title: 'Geofence Breach in Exclusion Zone',
    desc: 'Unregistered subcontractor detected within high-voltage transformer perimeter.',
    site: 'Metro Heights Tower A',
    time: '24m ago',
    type: 'high'
  },
  {
    id: 'ALT-403',
    title: 'OSHA 1926 Inspection Renewal',
    desc: 'Trench shoring safety certificate renewal inspection due within 48 hours.',
    site: 'City Center Transit Hub',
    time: '1h ago',
    type: 'medium'
  },
  {
    id: 'ALT-404',
    title: 'Agentic Soil Telemetry Update',
    desc: 'Moisture sensors stabilized at Pier 3 following localized rainfall simulation.',
    site: 'Harbor Container Terminal',
    time: '3h ago',
    type: 'info'
  }
]

const AGENT_DELIBERATIONS = [
  {
    id: 'DELIB-901',
    agent: 'Structural Sentinel Agent',
    site: 'Riverside Bridge Expansion',
    time: '4m ago',
    urgency: 'urgent',
    message: 'High wind gusts (>44 km/h) exceed crane hoisting envelope. Dispatched automatic hold recommendation to site superintendent.'
  },
  {
    id: 'DELIB-902',
    agent: 'Vision AI Inspector',
    site: 'Metro Heights Tower A',
    time: '18m ago',
    urgency: 'warning',
    message: 'Perimeter drone pass identified 2 workers without secondary fall arrest lines anchored at Sector 4B.'
  },
  {
    id: 'DELIB-903',
    agent: 'Environmental Sensor Agent',
    site: 'Harbor Container Terminal',
    time: '42m ago',
    urgency: 'normal',
    message: 'Air quality and particulate sensors within baseline OSHA PM2.5 thresholds. Dust suppression mist active.'
  }
]

function App() {
  // Navigation & UI States
  const [activeNav, setActiveNav] = useState('Dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [selectedSite, setSelectedSite] = useState('All Sites')
  const [severityFilter, setSeverityFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [showDemoBanner, setShowDemoBanner] = useState(true)
  const [showNotifications, setShowNotifications] = useState(false)

  // Interactive Data States
  const [alerts, setAlerts] = useState(INITIAL_ALERTS)
  const [hazards, setHazards] = useState(INITIAL_HAZARDS)
  const [agentLogs, setAgentLogs] = useState(AGENT_DELIBERATIONS)
  const [isSimulatingSweep, setIsSimulatingSweep] = useState(false)
  const [auditSweepCount, setAuditSweepCount] = useState(24)

  // Cursor Spotlight Ref
  const containerRef = useRef(null)

  // Mouse move handler for the subtle cursor spotlight
  const handlePointerMove = (e) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    containerRef.current.style.setProperty('--mouse-x', `${x}px`)
    containerRef.current.style.setProperty('--mouse-y', `${y}px`)
  }

  // Sidebar navigation configuration
  const navItems = [
    { name: 'Dashboard', icon: 'dashboard' },
    { name: 'Site Risk Agent', icon: 'agent' },
    { name: 'Safety Monitoring', icon: 'safety' },
    { name: 'Compliance', icon: 'compliance' },
    { name: 'Insurance Risk', icon: 'insurance' },
    { name: 'Reports', icon: 'reports' },
    { name: 'Alerts', icon: 'alerts', badge: alerts.length },
    { name: 'Settings', icon: 'settings' }
  ]

  // Filtered sites based on site selector
  const displayedSites = selectedSite === 'All Sites' 
    ? ALL_SITES 
    : ALL_SITES.filter(s => s.name === selectedSite)

  // Filtered hazards based on site, severity, and search
  const filteredHazards = hazards.filter((h) => {
    const matchesSite = selectedSite === 'All Sites' || h.site === selectedSite
    const matchesSeverity = severityFilter === 'All' || h.severity.toLowerCase() === severityFilter.toLowerCase()
    const matchesSearch =
      h.site.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.hazard.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.id.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSite && matchesSeverity && matchesSearch
  })

  // Filtered alerts
  const displayedAlerts = selectedSite === 'All Sites'
    ? alerts
    : alerts.filter(a => a.site === selectedSite)

  // Interactive: Dismiss Alert
  const handleDismissAlert = (id) => {
    setAlerts(prev => prev.filter(a => a.id !== id))
  }

  // Interactive: Toggle Hazard status
  const handleToggleHazard = (id) => {
    setHazards(prev => prev.map(h => {
      if (h.id === id) {
        return {
          ...h,
          status: h.status === 'Resolved' ? 'Open' : 'Resolved'
        }
      }
      return h
    }))
  }

  // Interactive: Trigger Autonomous Risk Sweep Simulation
  const handleTriggerRiskSweep = () => {
    setIsSimulatingSweep(true)
    setTimeout(() => {
      const newDelib = {
        id: `DELIB-${Math.floor(1000 + Math.random() * 9000)}`,
        agent: 'Autonomous Sentinel Engine',
        site: selectedSite === 'All Sites' ? 'Riverside Bridge Expansion' : selectedSite,
        time: 'Just now',
        urgency: 'normal',
        message: `Multi-agent telemetry sweep completed. Analyzed 142 structural strain gauges, 8 crane anemometers, and 34 worker telemetry feeds. All values verified.`
      }
      setAgentLogs(prev => [newDelib, ...prev])
      setAuditSweepCount(prev => prev + 1)
      setIsSimulatingSweep(false)
    }, 700)
  }

  return (
    <div
      ref={containerRef}
      className="command-container"
      onPointerMove={handlePointerMove}
    >
      {/* Subtle Cyan/Violet Cursor Spotlight Layer */}
      <div className="command-spotlight" />

      {/* ======================================================================
          Refined Collapsible Sidebar (Deep Charcoal / Midnight)
          ====================================================================== */}
      <aside className={`command-sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="brand-wrapper">
            <div className="brand-icon-shield" title="SITEGUARD AI">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            {!sidebarCollapsed && (
              <div className="brand-text-block">
                <span className="brand-title">SITEGUARD <span>AI</span></span>
                <span className="brand-subtext">AGENTIC RISK OPS</span>
              </div>
            )}
          </div>

          <button
            type="button"
            className="sidebar-collapse-btn"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            aria-label="Toggle sidebar collapse"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {sidebarCollapsed ? (
                <polyline points="9 18 15 12 9 6" />
              ) : (
                <polyline points="15 18 9 12 15 6" />
              )}
            </svg>
          </button>
        </div>

        {/* Sidebar Nav */}
        <nav className="sidebar-nav">
          {!sidebarCollapsed && <div className="nav-group-label">Intelligence Operations</div>}
          {navItems.map((item) => (
            <button
              key={item.name}
              type="button"
              className={`nav-item-btn ${activeNav === item.name ? 'active' : ''}`}
              onClick={() => {
                setActiveNav(item.name)
                setMobileMenuOpen(false)
              }}
              title={sidebarCollapsed ? item.name : undefined}
            >
              <div className="nav-icon-wrap">
                {renderCommandIcon(item.icon)}
              </div>
              {!sidebarCollapsed && <span>{item.name}</span>}
              {!sidebarCollapsed && item.badge !== undefined && item.badge > 0 && (
                <span className="nav-badge-pill">{item.badge}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Sidebar Footer Telemetry Box */}
        <div className="sidebar-footer">
          <div className="telemetry-status-box">
            <div className="radar-beacon" />
            {!sidebarCollapsed && (
              <div className="telemetry-meta">
                <span className="telemetry-name">SENTINEL AGENT v2.4</span>
                <span className="telemetry-sub">SYNC: 14MS &bull; SWEEPS: {auditSweepCount}</span>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ======================================================================
          Main Command Center View
          ====================================================================== */}
      <div className="main-command-view">
        {/* Demo Telemetry Disclaimer Banner */}
        {showDemoBanner && (
          <div className="demo-cyber-banner">
            <div className="demo-banner-indicator">
              <span className="demo-chip">DEMO TELEMETRY SIMULATION</span>
              <span>
                Simulated multi-agent construction risk telemetry for evaluation. No live hardware, cameras, or emergency services connected.
              </span>
            </div>
            <button
              type="button"
              className="demo-banner-close"
              onClick={() => setShowDemoBanner(false)}
            >
              &times; Acknowledge
            </button>
          </div>
        )}

        {/* Top Command Bar */}
        <header className="command-header">
          <div className="header-left-col">
            <button
              type="button"
              className="mobile-nav-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle Navigation"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            <div>
              <div className="header-view-title">
                {activeNav === 'Dashboard' ? 'Construction Risk Intelligence' : activeNav}
                <span className="header-tag-pill">AI OPS LIVE</span>
              </div>
              <div className="header-view-sub">
                Autonomous Site Safety &amp; Actuarial Hazard Command
              </div>
            </div>
          </div>

          <div className="header-right-controls">
            {/* Interactive Site Selector */}
            <select
              className="site-selector-dropdown"
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
              aria-label="Filter by construction site"
            >
              <option value="All Sites">All Sites (6 Monitored)</option>
              {ALL_SITES.map(s => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>

            {/* AI Agent Status Pill */}
            <div className="agent-live-badge">
              <span className="agent-pulse-dot" />
              <span>Agentic Sentinel Active</span>
            </div>

            {/* Notification Control with Triage Tray */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className="cyber-icon-btn"
                onClick={() => setShowNotifications(!showNotifications)}
                title="Telemetry Alerts Triage"
                aria-label="Telemetry Alerts Triage"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {alerts.length > 0 && <span className="btn-indicator-dot" />}
              </button>

              {showNotifications && (
                <div className="notification-tray-dropdown">
                  <div className="tray-header">
                    <span className="tray-title">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--cyan-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      Active Telemetry Alerts ({alerts.length})
                    </span>
                    <button
                      type="button"
                      style={{ fontSize: '10px', color: 'var(--cyan-primary)', fontFamily: 'var(--font-mono)' }}
                      onClick={() => setAlerts([])}
                    >
                      Clear All
                    </button>
                  </div>
                  {alerts.length === 0 ? (
                    <div style={{ padding: '16px 0', textAlign: 'center', fontSize: '12px', color: 'var(--text-dim)' }}>
                      All alerts cleared. Telemetry optimal.
                    </div>
                  ) : (
                    alerts.slice(0, 3).map((alt) => (
                      <div key={alt.id} style={{ fontSize: '11px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                        <strong style={{ color: '#ffffff' }}>{alt.title}</strong>
                        <div style={{ color: 'var(--text-muted)', marginTop: '2px' }}>{alt.site} &bull; {alt.time}</div>
                      </div>
                    ))
                  )}
                  <button
                    type="button"
                    style={{ fontSize: '11px', color: 'var(--cyan-primary)', textAlign: 'center', marginTop: '4px', fontWeight: '700' }}
                    onClick={() => {
                      setActiveNav('Alerts')
                      setShowNotifications(false)
                    }}
                  >
                    Open Full Incident Triage &rarr;
                  </button>
                </div>
              )}
            </div>

            {/* Operator Profile */}
            <div className="operator-badge">
              <div className="operator-avatar">AM</div>
              <div className="operator-meta">
                <span className="operator-callsign">A. Morgan</span>
                <span className="operator-role">SAFETY DIR // AGT-01</span>
              </div>
            </div>
          </div>
        </header>

        {/* ====================================================================
            Active View Body
            ==================================================================== */}
        <main className="command-body">
          {activeNav === 'Dashboard' && (
            <DashboardView
              selectedSite={selectedSite}
              displayedSites={displayedSites}
              hazards={filteredHazards}
              alerts={displayedAlerts}
              agentLogs={agentLogs}
              severityFilter={severityFilter}
              setSeverityFilter={setSeverityFilter}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onToggleHazard={handleToggleHazard}
              onDismissAlert={handleDismissAlert}
              onTriggerSweep={handleTriggerRiskSweep}
              isSimulatingSweep={isSimulatingSweep}
            />
          )}

          {activeNav === 'Site Risk Agent' && (
            <SiteRiskAgentView
              agentLogs={agentLogs}
              onTriggerSweep={handleTriggerRiskSweep}
              isSimulatingSweep={isSimulatingSweep}
              selectedSite={selectedSite}
            />
          )}

          {activeNav === 'Safety Monitoring' && (
            <SafetyMonitoringView selectedSite={selectedSite} />
          )}

          {activeNav === 'Compliance' && (
            <ComplianceView selectedSite={selectedSite} />
          )}

          {activeNav === 'Insurance Risk' && (
            <InsuranceRiskView selectedSite={selectedSite} />
          )}

          {activeNav === 'Reports' && (
            <ReportsView selectedSite={selectedSite} />
          )}

          {activeNav === 'Alerts' && (
            <AlertsCenterView
              alerts={alerts}
              onDismissAlert={handleDismissAlert}
              onClearAll={() => setAlerts([])}
            />
          )}

          {activeNav === 'Settings' && (
            <SettingsView />
          )}
        </main>
      </div>
    </div>
  )
}

// ============================================================================
// Sub-View: 1. Main Dashboard View
// ============================================================================
function DashboardView({
  selectedSite,
  displayedSites,
  hazards,
  alerts,
  agentLogs,
  severityFilter,
  setSeverityFilter,
  searchQuery,
  setSearchQuery,
  onToggleHazard,
  onDismissAlert,
  onTriggerSweep,
  isSimulatingSweep
}) {
  const openHazardCount = hazards.filter(h => h.status !== 'Resolved').length

  return (
    <>
      {/* Four Compact Indicator Cards (KPIs) */}
      <section className="kpi-cards-grid animate-entrance delay-1">
        {/* Active Sites */}
        <div className="kpi-card">
          <div className="kpi-top-row">
            <span className="kpi-label">Active Sites</span>
            <div className="kpi-icon-pill cyan">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
                <line x1="8" y1="6" x2="16" y2="6" />
                <line x1="8" y1="10" x2="16" y2="10" />
                <line x1="8" y1="14" x2="16" y2="14" />
              </svg>
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value">{selectedSite === 'All Sites' ? '12' : '1'}</span>
            <span className="kpi-chip chip-good">+2 TELEMETRY</span>
          </div>
          <div className="kpi-note">100% autonomous drone &amp; sensor coverage</div>
        </div>

        {/* Open Hazards */}
        <div className="kpi-card">
          <div className="kpi-top-row">
            <span className="kpi-label">Open Hazards</span>
            <div className="kpi-icon-pill amber">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value">{openHazardCount}</span>
            <span className="kpi-chip chip-good">&darr; -6 PAST 24H</span>
          </div>
          <div className="kpi-note">4 Critical &bull; 9 High &bull; 15 Moderate</div>
        </div>

        {/* Critical Risks */}
        <div className="kpi-card">
          <div className="kpi-top-row">
            <span className="kpi-label">Critical Risks</span>
            <div className="kpi-icon-pill crimson">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value">{selectedSite === 'All Sites' ? '7' : '2'}</span>
            <span className="kpi-chip chip-alert">ACTION REQ</span>
          </div>
          <div className="kpi-note">Auto-escalated to Field Superintendents</div>
        </div>

        {/* Compliance Score */}
        <div className="kpi-card">
          <div className="kpi-top-row">
            <span className="kpi-label">Compliance Score</span>
            <div className="kpi-icon-pill emerald">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value">94.2%</span>
            <span className="kpi-chip chip-good">&uarr; +1.8%</span>
          </div>
          <div className="kpi-note">OSHA 1926 &amp; ISO 45001 benchmark</div>
        </div>
      </section>

      {/* Site Risk Intelligence & AI Agent Activity */}
      <section className="command-grid-2col animate-entrance delay-2">
        {/* Animated Horizontal Risk Bars */}
        <div className="cyber-panel">
          <div className="panel-header-row">
            <div className="panel-title-group">
              <div className="panel-icon-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
              </div>
              <span className="panel-heading">Site Risk Intelligence Index</span>
            </div>

            <div className="panel-legend">
              <span><span className="legend-dot" style={{ background: '#ff3366' }} />Critical (&gt;80)</span>
              <span><span className="legend-dot" style={{ background: '#ff8c00' }} />High (60-79)</span>
              <span><span className="legend-dot" style={{ background: '#eab308' }} />Med (40-59)</span>
              <span><span className="legend-dot" style={{ background: '#10b981' }} />Low (&lt;40)</span>
            </div>
          </div>

          <div className="site-risk-bars-container">
            {displayedSites.map((site) => (
              <div key={site.id} className="site-bar-item">
                <div className="site-bar-meta">
                  <span className="site-name-text">{site.name}</span>
                  <div className="site-score-badge">
                    <span style={{ color: site.category === 'critical' ? 'var(--color-critical)' : site.category === 'high' ? 'var(--color-high)' : site.category === 'medium' ? 'var(--color-medium)' : 'var(--color-low)' }}>
                      INDEX: {site.score}/100
                    </span>
                    <span style={{ color: 'var(--text-dim)' }}>&bull; {site.level}</span>
                  </div>
                </div>

                <div className="site-meter-track">
                  <div
                    className={`site-meter-fill ${site.category}`}
                    style={{ width: `${site.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live AI Agent Activity Feed */}
        <div className="cyber-panel">
          <div className="panel-header-row">
            <div className="panel-title-group">
              <div className="panel-icon-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <span className="panel-heading">Live AI Agent Feed</span>
            </div>

            <button
              type="button"
              className="agent-quick-action"
              onClick={onTriggerSweep}
              disabled={isSimulatingSweep}
            >
              {isSimulatingSweep ? 'Sweeping...' : '+ Run Sweep'}
            </button>
          </div>

          <div className="agent-activity-feed">
            {agentLogs.slice(0, 3).map((item) => (
              <div key={item.id} className={`agent-activity-entry ${item.urgency}`}>
                <div className="agent-activity-header">
                  <span className="agent-name-tag">{item.agent}</span>
                  <span className="agent-timestamp">{item.time}</span>
                </div>
                <div className="agent-message">{item.message}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                  <span style={{ fontSize: '10px', color: 'var(--cyan-bright)', fontFamily: 'var(--font-mono)' }}>{item.site}</span>
                  <button type="button" className="agent-quick-action">
                    Acknowledge &rarr;
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hazards Table & Alert Timeline */}
      <section className="command-grid-2col animate-entrance delay-3">
        {/* Recent Site Hazards Table */}
        <div className="cyber-panel">
          <div className="panel-header-row">
            <div className="panel-title-group">
              <div className="panel-icon-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <span className="panel-heading">Recent Site Hazards</span>
            </div>
          </div>

          {/* Table Filters & Search */}
          <div className="table-filter-header">
            <div className="cyber-pill-group">
              {['All', 'Critical', 'High', 'Medium', 'Low'].map((sev) => (
                <button
                  key={sev}
                  type="button"
                  className={`cyber-pill-btn ${severityFilter === sev ? 'active' : ''}`}
                  onClick={() => setSeverityFilter(sev)}
                >
                  {sev}
                </button>
              ))}
            </div>

            <input
              type="text"
              className="cyber-search-box"
              placeholder="Search site or hazard..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="table-scroll-container">
            <table className="command-table">
              <thead>
                <tr>
                  <th>Site</th>
                  <th>Hazard Description</th>
                  <th>Severity</th>
                  <th>Risk Score</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {hazards.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '28px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                      NO HAZARDS FOUND FOR CURRENT CRITERIA.
                    </td>
                  </tr>
                ) : (
                  hazards.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="table-cell-site">{item.site}</div>
                        <div className="table-cell-sub">{item.id}</div>
                      </td>
                      <td>
                        <div className="table-cell-hazard">{item.hazard}</div>
                      </td>
                      <td>
                        <span className={`cyber-badge ${item.severity.toLowerCase()}`}>
                          <span className="badge-dot" />
                          {item.severity}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          color: item.riskScore > 80 ? 'var(--color-critical)' : item.riskScore > 60 ? 'var(--color-high)' : item.riskScore > 40 ? 'var(--color-medium)' : 'var(--color-low)'
                        }}>
                          {item.riskScore}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>/100</span>
                      </td>
                      <td>
                        <span className={`table-status-pill ${item.status.toLowerCase().replace(/\s+/g, '-')}`}>
                          {item.status}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="table-action-cyber-btn"
                          onClick={() => onToggleHazard(item.id)}
                        >
                          {item.status === 'Resolved' ? 'Reopen' : 'Resolve'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Alert Timeline */}
        <div className="cyber-panel">
          <div className="panel-header-row">
            <div className="panel-title-group">
              <div className="panel-icon-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <span className="panel-heading">Recent Alerts Timeline</span>
            </div>
            <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
              LIVE FEED
            </span>
          </div>

          <div className="alert-timeline-list">
            {alerts.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px' }}>
                No active alerts in timeline.
              </div>
            ) : (
              alerts.map((alt) => (
                <div key={alt.id} className="timeline-entry">
                  <div className={`timeline-icon-col ${alt.type}`}>
                    {renderAlertIcon(alt.type)}
                  </div>
                  <div className="timeline-content-col">
                    <div className="timeline-title-row">
                      <span className="timeline-title">{alt.title}</span>
                      <span className="timeline-time">{alt.time}</span>
                    </div>
                    <div className="timeline-desc">{alt.desc}</div>
                    <div className="timeline-footer">
                      <span className="timeline-site">{alt.site}</span>
                      <button
                        type="button"
                        className="timeline-dismiss-btn"
                        onClick={() => onDismissAlert(alt.id)}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </>
  )
}

// ============================================================================
// Sub-View: 2. Site Risk Agent Dedicated View
// ============================================================================
function SiteRiskAgentView({ agentLogs, onTriggerSweep, isSimulatingSweep, selectedSite }) {
  const agents = [
    {
      name: 'Structural Sentinel Agent',
      domain: 'Cranes & Scaffold Load Strain',
      status: 'Online & Reasoning',
      load: '42% CPU',
      detections: '14 Flags'
    },
    {
      name: 'Vision AI Inspector',
      domain: 'Camera/Drone PPE & Boundary Breaches',
      status: 'Active Patrol',
      load: '68% GPU',
      detections: '28 Flags'
    },
    {
      name: 'Environmental Sensor Agent',
      domain: 'Wind, Humidity & Dust Telemetry',
      status: 'Live Stream',
      load: '18% CPU',
      detections: '6 Warnings'
    },
    {
      name: 'Permit & Compliance Auditor',
      domain: 'OSHA 1926 Subcontractor Credentials',
      status: 'Synchronized',
      load: '12% CPU',
      detections: '2 Holds'
    }
  ]

  return (
    <div className="view-module-container animate-entrance">
      <div className="view-hero-panel">
        <div>
          <div className="view-hero-title">Autonomous Site Risk Agent Console</div>
          <div className="view-hero-desc">
            Orchestrates multi-agent reasoning models to evaluate structural strain, visual hazard vectors, and environmental limits across {selectedSite}.
          </div>
        </div>
        <button
          type="button"
          className="view-hero-btn"
          onClick={onTriggerSweep}
          disabled={isSimulatingSweep}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          {isSimulatingSweep ? 'Executing Agent Sweep...' : 'Trigger Full Autonomous Sweep'}
        </button>
      </div>

      <div className="module-grid-3col">
        {agents.map((ag) => (
          <div key={ag.name} className="module-card">
            <div className="module-card-header">
              <div className="panel-icon-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="10" rx="2" />
                  <circle cx="12" cy="5" r="2" />
                  <path d="M12 7v4" />
                </svg>
              </div>
              <div>
                <div className="module-card-title">{ag.name}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{ag.domain}</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'var(--font-mono)', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
              <span style={{ color: 'var(--cyan-primary)' }}>{ag.status}</span>
              <span style={{ color: 'var(--text-muted)' }}>{ag.detections}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="cyber-panel">
        <div className="panel-header-row">
          <div className="panel-title-group">
            <div className="panel-icon-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4 17 10 11 4 5" />
                <line x1="12" y1="19" x2="20" y2="19" />
              </svg>
            </div>
            <span className="panel-heading">Multi-Agent Deliberation Trace (Synthetic Logs)</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {agentLogs.map((log) => (
            <div key={log.id} style={{
              background: 'rgba(5, 8, 17, 0.7)',
              border: '1px solid var(--border-subtle)',
              padding: '10px 14px',
              borderRadius: '6px',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--text-primary)'
            }}>
              <span style={{ color: 'var(--cyan-primary)', fontWeight: 700 }}>[{log.time}]</span> &bull;{' '}
              <span style={{ color: '#ffffff', fontWeight: 700 }}>{log.agent}</span> &bull;{' '}
              <span style={{ color: 'var(--text-muted)' }}>{log.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Sub-View: 3. Safety Monitoring Dedicated View
// ============================================================================
function SafetyMonitoringView({ selectedSite }) {
  const feeds = [
    { title: 'CAM 01 // Tower Crane 02 Anemometer', metric: '42 km/h Wind Load', status: 'WARNING: EXCEEDS ENVELOPE', alert: true },
    { title: 'CAM 04 // Scaffolding Pier 3 Tilt Sensor', metric: '0.04° Angular Drift', status: 'NORMAL TOLERANCE', alert: false },
    { title: 'CAM 07 // Level 14 Perimeter Drone Scan', metric: '2 Harness Unclipped', status: 'SAFETY INFRACTION', alert: true },
    { title: 'CAM 11 // North Trench Shoring Wall', metric: '1.2mm Lateral Load', status: 'STABLE PRESSURE', alert: false }
  ]

  return (
    <div className="view-module-container animate-entrance">
      <div className="view-hero-panel">
        <div>
          <div className="view-hero-title">Live Safety Telemetry &amp; Camera HUD</div>
          <div className="view-hero-desc">
            Synthetic drone video feeds, accelerometer meshes, and thermal geofencing telemetry for {selectedSite}.
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
        {feeds.map((feed) => (
          <div key={feed.title} className="cyber-panel">
            <div className="panel-header-row">
              <span style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#ffffff' }}>
                {feed.title}
              </span>
              <span style={{
                fontSize: '10px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                color: feed.alert ? 'var(--color-critical)' : 'var(--color-low)'
              }}>
                {feed.status}
              </span>
            </div>

            {/* Radar / HUD visualizer */}
            <div className="hud-telemetry-box">
              <div className="hud-grid-pattern" />
              <div className="hud-radar-sweep" />
              <div style={{
                position: 'absolute',
                bottom: '10px',
                left: '12px',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--cyan-primary)'
              }}>
                TELEMETRY: {feed.metric}
              </div>
              <div style={{
                position: 'absolute',
                top: '10px',
                right: '12px',
                fontSize: '9px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-dim)'
              }}>
                SIMULATED FEED // 30 FPS
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// Sub-View: 4. Compliance Dedicated View
// ============================================================================
function ComplianceView({ selectedSite }) {
  const complianceItems = [
    { rule: 'OSHA 1926.501 - Fall Protection', score: '92%', status: 'Compliant', issues: '1 Flagged harness' },
    { rule: 'OSHA 1926.651 - Excavation Shoring', score: '88%', status: 'In Review', issues: 'Renewal due 48h' },
    { rule: 'OSHA 1926.1053 - Ladder Safety', score: '98%', status: 'Compliant', issues: '0 Violations' },
    { rule: 'ISO 45001 - Occupational Health Management', score: '96%', status: 'Audited', issues: 'Certified' }
  ]

  return (
    <div className="view-module-container animate-entrance">
      <div className="view-hero-panel">
        <div>
          <div className="view-hero-title">OSHA 1926 &amp; ISO 45001 Compliance Matrix</div>
          <div className="view-hero-desc">
            Automated regulatory compliance audit tracker and projected violation penalty mitigation for {selectedSite}.
          </div>
        </div>
      </div>

      <div className="cyber-panel">
        <table className="command-table">
          <thead>
            <tr>
              <th>Standard / Regulation</th>
              <th>Compliance Score</th>
              <th>Audit Status</th>
              <th>Active Telemetry Notes</th>
            </tr>
          </thead>
          <tbody>
            {complianceItems.map((item) => (
              <tr key={item.rule}>
                <td style={{ fontWeight: 700, color: '#ffffff' }}>{item.rule}</td>
                <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--cyan-primary)', fontWeight: 700 }}>{item.score}</td>
                <td><span className="cyber-badge low">{item.status}</span></td>
                <td style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{item.issues}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ============================================================================
// Sub-View: 5. Insurance Risk Dedicated View
// ============================================================================
function InsuranceRiskView({ selectedSite }) {
  return (
    <div className="view-module-container animate-entrance">
      <div className="view-hero-panel">
        <div>
          <div className="view-hero-title">Actuarial Underwriting &amp; Loss Prevention</div>
          <div className="view-hero-desc">
            Real-time loss ratio forecasting and premium discount qualification derived from agentic safety compliance scores at {selectedSite}.
          </div>
        </div>
      </div>

      <div className="module-grid-3col">
        <div className="module-card">
          <span className="kpi-label">Underwriting Risk Grade</span>
          <span style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>AAA</span>
          <span style={{ fontSize: '11px', color: 'var(--color-low)' }}>Preferred Contractor Tier</span>
        </div>
        <div className="module-card">
          <span className="kpi-label">Projected Loss Ratio</span>
          <span style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>12.4%</span>
          <span style={{ fontSize: '11px', color: 'var(--cyan-primary)' }}>&darr; 8.2% below industry avg</span>
        </div>
        <div className="module-card">
          <span className="kpi-label">Annual Premium Savings</span>
          <span style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>$142,000</span>
          <span style={{ fontSize: '11px', color: 'var(--color-low)' }}>Earned safety credit discount</span>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Sub-View: 6. Reports Dedicated View
// ============================================================================
function ReportsView({ selectedSite }) {
  const reports = [
    { title: 'Weekly Autonomous Risk Dossier - Week 42', date: 'Oct 14, 2026', size: '2.4 MB PDF', status: 'Ready' },
    { title: 'Crane Wind Load & Structural Stress Analysis', date: 'Oct 12, 2026', size: '1.8 MB PDF', status: 'Ready' },
    { title: 'OSHA 1926 Bi-Weekly Field Compliance Audit', date: 'Oct 10, 2026', size: '3.1 MB PDF', status: 'Ready' }
  ]

  return (
    <div className="view-module-container animate-entrance">
      <div className="view-hero-panel">
        <div>
          <div className="view-hero-title">Executive AI Risk Reports</div>
          <div className="view-hero-desc">
            Automated PDF briefings compiled by the SiteGuard AI deliberation engine for {selectedSite}.
          </div>
        </div>
      </div>

      <div className="cyber-panel">
        <table className="command-table">
          <thead>
            <tr>
              <th>Report Title</th>
              <th>Generated Date</th>
              <th>File Size</th>
              <th>Download</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((rep) => (
              <tr key={rep.title}>
                <td style={{ fontWeight: 700, color: '#ffffff' }}>{rep.title}</td>
                <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>{rep.date}</td>
                <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--cyan-primary)' }}>{rep.size}</td>
                <td>
                  <button type="button" className="table-action-cyber-btn">
                    Download PDF &darr;
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ============================================================================
// Sub-View: 7. Alerts Triage Dedicated View
// ============================================================================
function AlertsCenterView({ alerts, onDismissAlert, onClearAll }) {
  return (
    <div className="view-module-container animate-entrance">
      <div className="view-hero-panel">
        <div>
          <div className="view-hero-title">Incident Triage &amp; Escalation Center</div>
          <div className="view-hero-desc">
            Real-time feed of flagged sensor breaches, drone observations, and supervisor notifications.
          </div>
        </div>
        <button type="button" className="view-hero-btn" onClick={onClearAll}>
          Acknowledge &amp; Clear All Alerts
        </button>
      </div>

      <div className="cyber-panel">
        <div className="alert-timeline-list">
          {alerts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-dim)' }}>
              All alerts resolved. No incidents currently flagged.
            </div>
          ) : (
            alerts.map((alt) => (
              <div key={alt.id} className="timeline-entry">
                <div className={`timeline-icon-col ${alt.type}`}>
                  {renderAlertIcon(alt.type)}
                </div>
                <div className="timeline-content-col">
                  <div className="timeline-title-row">
                    <span className="timeline-title">{alt.title}</span>
                    <span className="timeline-time">{alt.time}</span>
                  </div>
                  <div className="timeline-desc">{alt.desc}</div>
                  <div className="timeline-footer">
                    <span className="timeline-site">{alt.site}</span>
                    <button
                      type="button"
                      className="table-action-cyber-btn"
                      onClick={() => onDismissAlert(alt.id)}
                    >
                      Resolve Alert
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Sub-View: 8. Settings Dedicated View
// ============================================================================
function SettingsView() {
  return (
    <div className="view-module-container animate-entrance">
      <div className="view-hero-panel">
        <div>
          <div className="view-hero-title">Platform &amp; Agent Configuration</div>
          <div className="view-hero-desc">
            Adjust autonomous risk scoring weights, sensor polling intervals, and notification dispatch thresholds.
          </div>
        </div>
      </div>

      <div className="cyber-panel">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff', display: 'block', marginBottom: '6px' }}>
              Autonomous Sentinel Reasoning Frequency
            </label>
            <input type="range" min="1" max="60" defaultValue="15" style={{ width: '100%', accentColor: 'var(--cyan-primary)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
              <span>Continuous (1s)</span>
              <span>Balanced (15s Default)</span>
              <span>Periodic (60s)</span>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff', display: 'block', marginBottom: '6px' }}>
              High-Wind Crane Suspension Threshold
            </label>
            <input type="range" min="20" max="60" defaultValue="40" style={{ width: '100%', accentColor: 'var(--cyan-primary)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
              <span>Strict (25 km/h)</span>
              <span>OSHA Standard (40 km/h)</span>
              <span>Heavy Duty (55 km/h)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Helper: Render SVG Icons for Navigation
// ============================================================================
function renderCommandIcon(name) {
  switch (name) {
    case 'dashboard':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </svg>
      )
    case 'agent':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="10" rx="2" />
          <circle cx="12" cy="5" r="2" />
          <path d="M12 7v4" />
          <line x1="8" y1="16" x2="8" y2="16" />
          <line x1="16" y1="16" x2="16" y2="16" />
        </svg>
      )
    case 'safety':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <circle cx="12" cy="11" r="3" />
        </svg>
      )
    case 'compliance':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <path d="m9 15 2 2 4-4" />
        </svg>
      )
    case 'insurance':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      )
    case 'reports':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
          <path d="M22 12A10 10 0 0 0 12 2v10z" />
        </svg>
      )
    case 'alerts':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      )
    case 'settings':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      )
    default:
      return null
  }
}

// ============================================================================
// Helper: Render Alert Icon by Type
// ============================================================================
function renderAlertIcon(type) {
  if (type === 'critical') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    )
  }
  if (type === 'high') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    )
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  )
}

export default App
