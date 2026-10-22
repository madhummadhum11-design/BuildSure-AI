import React, { useState, useRef, useEffect, Fragment } from 'react'
import './App.css'

// ============================================================================
// Sample Telemetry Datasets (Demo Environment)
// ============================================================================
const ALL_SITES = [
  { id: 'SITE-01', name: 'Riverside Bridge Expansion', score: 89, level: 'Critical', category: 'critical', activeCranes: 4, openHazards: 5, workers: 142, compliance: '86.4%', criticalCount: 3, zone: 'Zone A - Heavy Civil' },
  { id: 'SITE-02', name: 'Metro Heights Tower A', score: 78, level: 'High', category: 'high', activeCranes: 6, openHazards: 4, workers: 215, compliance: '91.8%', criticalCount: 2, zone: 'Zone B - High-Rise Commercial' },
  { id: 'SITE-03', name: 'Harbor Container Terminal', score: 61, level: 'High', category: 'high', activeCranes: 3, openHazards: 3, workers: 88, compliance: '93.5%', criticalCount: 1, zone: 'Zone C - Marine Logistics' },
  { id: 'SITE-04', name: 'Bayfront Logistics Hub', score: 42, level: 'Medium', category: 'medium', activeCranes: 2, openHazards: 2, workers: 64, compliance: '96.2%', criticalCount: 1, zone: 'Zone D - Industrial Warehouse' },
  { id: 'SITE-05', name: 'City Center Transit Hub', score: 35, level: 'Low', category: 'low', activeCranes: 3, openHazards: 2, workers: 110, compliance: '97.5%', criticalCount: 0, zone: 'Zone E - Urban Subterranean' },
  { id: 'SITE-06', name: 'Highland Commercial Park', score: 24, level: 'Low', category: 'low', activeCranes: 1, openHazards: 1, workers: 45, compliance: '98.9%', criticalCount: 0, zone: 'Zone F - Low-Rise Office' }
]

// ============================================================================
// Day 2 Step 4: Prototype Risk Scoring & Recommendation Engine Rules
// (Deterministic demonstration rules, not validated construction safety standards)
// ============================================================================

export function calculateRiskScore(severity, likelihood) {
  const sev = Math.min(5, Math.max(1, parseInt(severity, 10) || 1))
  const lik = Math.min(5, Math.max(1, parseInt(likelihood, 10) || 1))
  return sev * lik * 4
}

export function getPrototypePriority(score) {
  if (score >= 75) return { label: 'Critical', color: 'var(--color-critical)', badgeClass: 'critical' }
  if (score >= 50) return { label: 'High', color: 'var(--color-high)', badgeClass: 'high' }
  if (score >= 25) return { label: 'Medium', color: 'var(--color-medium)', badgeClass: 'medium' }
  return { label: 'Low', color: 'var(--color-low)', badgeClass: 'low' }
}

export function getCategoryRecommendation(category) {
  const normCat = (category || '').toLowerCase().trim()
  if (normCat.includes('fall')) {
    return 'Inspect edges and guardrails; restrict unsafe access.'
  }
  if (normCat.includes('ppe')) {
    return 'Verify required protective equipment and correct the violation.'
  }
  if (normCat.includes('equipment') || normCat.includes('machinery') || normCat.includes('crane')) {
    return 'Isolate unsafe equipment and request a qualified inspection.'
  }
  if (normCat.includes('electrical')) {
    return 'Restrict access and request inspection by a qualified electrician.'
  }
  if (normCat.includes('structural') || normCat.includes('scaffold') || normCat.includes('shoring')) {
    return 'Restrict access and arrange an urgent competent-person inspection.'
  }
  return 'Inspect the reported condition and assign an appropriate corrective action.'
}

export function getPriorityGuidance(priority) {
  const normPri = (priority || '').toLowerCase().trim()
  if (normPri === 'critical') {
    return 'Recommend immediate isolation of the hazard and urgent review by the responsible site safety professional.'
  }
  if (normPri === 'high') {
    return 'Recommend prompt corrective action and supervisor review.'
  }
  if (normPri === 'medium') {
    return 'Recommend corrective action and monitoring.'
  }
  return 'Recommend routine corrective action and continued monitoring.'
}

export function getHazardRecommendations(item) {
  const categoryRec = item.categoryRecommendation || getCategoryRecommendation(item.category || item.hazard)
  const priorityGuide = item.priorityGuidance || getPriorityGuidance(item.priority || item.severity)
  return { categoryRec, priorityGuide }
}

const INITIAL_HAZARDS = [
  {
    id: 'HAZ-1082',
    site: 'Riverside Bridge Expansion',
    hazard: 'Unanchored Perimeter Scaffolding at Pier 3',
    category: 'Structural hazard',
    numericSeverity: 5,
    numericLikelihood: 5,
    riskScore: 100,
    severity: 'Critical',
    priority: 'Critical',
    status: 'Open',
    categoryRecommendation: 'Restrict access and arrange an urgent competent-person inspection.',
    priorityGuidance: 'Recommend immediate isolation of the hazard and urgent review by the responsible site safety professional.',
    reportedBy: 'A. Morgan (Safety Superintendent)',
    timestamp: '18m ago'
  },
  {
    id: 'HAZ-1079',
    site: 'Metro Heights Tower A',
    hazard: 'PPE Violation: Missing Fall Arrest Harness at Level 14',
    category: 'Fall risk',
    numericSeverity: 5,
    numericLikelihood: 4,
    riskScore: 80,
    severity: 'Critical',
    priority: 'Critical',
    status: 'In Review',
    categoryRecommendation: 'Inspect edges and guardrails; restrict unsafe access.',
    priorityGuidance: 'Recommend immediate isolation of the hazard and urgent review by the responsible site safety professional.',
    reportedBy: 'Field Safety Inspector',
    timestamp: '42m ago'
  },
  {
    id: 'HAZ-1075',
    site: 'Harbor Container Terminal',
    hazard: 'Heavy Machinery Ground Proximity Alarm Disabled',
    category: 'Equipment hazard',
    numericSeverity: 4,
    numericLikelihood: 4,
    riskScore: 64,
    severity: 'High',
    priority: 'High',
    status: 'Investigating',
    categoryRecommendation: 'Isolate unsafe equipment and request a qualified inspection.',
    priorityGuidance: 'Recommend prompt corrective action and supervisor review.',
    reportedBy: 'Crane Operations Lead',
    timestamp: '1h ago'
  },
  {
    id: 'HAZ-1071',
    site: 'Bayfront Logistics Hub',
    hazard: 'Submerged Electrical Conduit near Foundation Trench',
    category: 'Electrical hazard',
    numericSeverity: 4,
    numericLikelihood: 3,
    riskScore: 48,
    severity: 'Medium',
    priority: 'Medium',
    status: 'Work Paused',
    categoryRecommendation: 'Restrict access and request inspection by a qualified electrician.',
    priorityGuidance: 'Recommend corrective action and monitoring.',
    reportedBy: 'Trench Supervisor',
    timestamp: '3h ago'
  },
  {
    id: 'HAZ-1068',
    site: 'City Center Transit Hub',
    hazard: 'Excavation Shoring Wall Micromovement (>2.5mm)',
    category: 'Structural hazard',
    numericSeverity: 3,
    numericLikelihood: 3,
    riskScore: 36,
    severity: 'Medium',
    priority: 'Medium',
    status: 'In Review',
    categoryRecommendation: 'Restrict access and arrange an urgent competent-person inspection.',
    priorityGuidance: 'Recommend corrective action and monitoring.',
    reportedBy: 'Geotechnical Monitor',
    timestamp: '5h ago'
  },
  {
    id: 'HAZ-1064',
    site: 'Highland Commercial Park',
    hazard: 'Obstructed Emergency Egress Route in Sector B',
    category: 'Other',
    numericSeverity: 2,
    numericLikelihood: 2,
    riskScore: 16,
    severity: 'Low',
    priority: 'Low',
    status: 'Resolved',
    categoryRecommendation: 'Inspect the reported condition and assign an appropriate corrective action.',
    priorityGuidance: 'Recommend routine corrective action and continued monitoring.',
    reportedBy: 'Quarterly Audit Crew',
    timestamp: '1d ago'
  }
]

const INITIAL_ALERTS = [
  {
    id: 'ALT-401',
    hazardId: 'HAZ-1082',
    title: 'High Wind Velocity Alert (44 km/h)',
    desc: 'Autonomous agent recommended immediate suspension of Tower Crane #2 operations. Linked to structural scaffold strain.',
    site: 'Riverside Bridge Expansion',
    time: '8m ago',
    type: 'critical',
    status: 'Active'
  },
  {
    id: 'ALT-402',
    hazardId: 'HAZ-1079',
    title: 'Critical Fall Risk & PPE Violation at Level 14',
    desc: 'Unanchored workers detected near perimeter edge. Recommend immediate isolation of the hazard and urgent review.',
    site: 'Metro Heights Tower A',
    time: '24m ago',
    type: 'critical',
    status: 'Active'
  },
  {
    id: 'ALT-403',
    title: 'OSHA 1926 Inspection Renewal',
    desc: 'Trench shoring safety certificate renewal inspection due within 48 hours.',
    site: 'City Center Transit Hub',
    time: '1h ago',
    type: 'medium',
    status: 'Active'
  },
  {
    id: 'ALT-404',
    title: 'Agentic Soil Telemetry Update',
    desc: 'Moisture sensors stabilized at Pier 3 following localized rainfall simulation.',
    site: 'Harbor Container Terminal',
    time: '3h ago',
    type: 'info',
    status: 'Active'
  },
  {
    id: 'ALT-405',
    title: 'Battery Telemetry Degradation on Drone Sentinel 02',
    desc: 'Autonomous boundary surveillance drone reporting low voltage on return path.',
    site: 'Bayfront Logistics Hub',
    time: '4h ago',
    type: 'medium',
    status: 'Active'
  },
  {
    id: 'ALT-406',
    title: 'Auxiliary Egress Lighting Circuit Verified',
    desc: 'Field superintendent completed quarterly emergency fixture illumination test.',
    site: 'Highland Commercial Park',
    time: '6h ago',
    type: 'info',
    status: 'Acknowledged'
  }
]

const AGENT_DELIBERATIONS = [
  {
    id: 'DELIB-901',
    agent: 'Structural Sentinel Agent',
    site: 'Riverside Bridge Expansion',
    time: '4m ago',
    urgency: 'urgent',
    status: 'Active',
    message: 'High wind gusts (>44 km/h) exceed crane hoisting envelope. Dispatched automatic hold recommendation to site superintendent.'
  },
  {
    id: 'DELIB-902',
    agent: 'Vision AI Inspector',
    site: 'Metro Heights Tower A',
    time: '18m ago',
    urgency: 'warning',
    status: 'Active',
    message: 'Perimeter drone pass identified 2 workers without secondary fall arrest lines anchored at Sector 4B.'
  },
  {
    id: 'DELIB-903',
    agent: 'Environmental Sensor Agent',
    site: 'Harbor Container Terminal',
    time: '42m ago',
    urgency: 'normal',
    status: 'Acknowledged',
    message: 'Air quality and particulate sensors within baseline OSHA PM2.5 thresholds. Dust suppression mist active.'
  }
]

const NAV_CONFIG = {
  'Dashboard': {
    title: 'Construction Risk Intelligence',
    subtitle: 'Autonomous Site Safety & Actuarial Hazard Command',
    tag: 'SYSTEM OVERVIEW'
  },
  'Site Risk Agent': {
    title: 'Site Risk Agent Console',
    subtitle: 'Autonomous Multi-Agent Deliberation & Hazard Forecasting',
    tag: 'AGENTIC OPS'
  },
  'Register Hazard': {
    title: 'Hazard Registration & Field Triage',
    subtitle: 'Field Safety Incident Ingestion & Prototype Risk Scoring HUD',
    tag: 'HAZARD REGISTRATION'
  },
  'Safety Monitoring': {
    title: 'Safety & Telemetry Monitoring',
    subtitle: 'Computer Vision Feeds, Acoustic & Vibration Sensor HUD',
    tag: 'SENSOR HUD'
  },
  'Compliance': {
    title: 'Regulatory Compliance Matrix',
    subtitle: 'OSHA 1926 Standards, Field Permits & Subcontractor Credentials',
    tag: 'AUDIT MATRIX'
  },
  'Insurance Risk': {
    title: 'Actuarial Insurance Risk Center',
    subtitle: 'Loss Ratio Projections, Underwriting Grades & Risk Credits',
    tag: 'ACTUARIAL SIM'
  },
  'Reports': {
    title: 'Executive Risk & Safety Reports',
    subtitle: 'Compiled Automated Dossiers, Audits & Incident Briefs',
    tag: 'DOSSIER ARCHIVE'
  },
  'Alerts': {
    title: 'Incident Triage & Alert Center',
    subtitle: 'Prioritized Telemetry Anomalies & Real-Time Field Escalations',
    tag: 'INCIDENT QUEUE'
  },
  'Settings': {
    title: 'Platform & Agent Configuration',
    subtitle: 'Autonomous Scoring Thresholds, Sensor Baselines & Controls',
    tag: 'CONFIG SYSTEM'
  }
}

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
  const [toastMessage, setToastMessage] = useState(null)
  const [sweepResult, setSweepResult] = useState(null)
  const [activeKpiModal, setActiveKpiModal] = useState(null)

  // Interactive Data States
  const [alerts, setAlerts] = useState(INITIAL_ALERTS)
  const [hazards, setHazards] = useState(INITIAL_HAZARDS)
  const [agentLogs, setAgentLogs] = useState(AGENT_DELIBERATIONS)
  const [isSimulatingSweep, setIsSimulatingSweep] = useState(false)
  const [auditSweepCount, setAuditSweepCount] = useState(24)

  const notificationRef = useRef(null)

  const showToast = (message) => {
    setToastMessage(message)
    setTimeout(() => {
      setToastMessage((current) => (current === message ? null : current))
    }, 3200)
  }

  // Click outside listener for notification panel
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target)) {
        setShowNotifications(false)
      }
    }
    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showNotifications])

  // ESC key listener to close modals & trays
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setActiveKpiModal(null)
        setShowNotifications(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const currentNav = NAV_CONFIG[activeNav] || {
    title: activeNav,
    subtitle: 'Construction Risk Intelligence Platform',
    tag: 'AI OPS'
  }

  // Update browser tab document title on active view change
  useEffect(() => {
    document.title = `${currentNav.title} | SITEGUARD AI`
  }, [currentNav.title])

  const handleResetDemoData = () => {
    setAlerts(INITIAL_ALERTS)
    setHazards(INITIAL_HAZARDS)
    setAgentLogs(AGENT_DELIBERATIONS)
    setSelectedSite('All Sites')
    setSeverityFilter('All')
    setSearchQuery('')
    setSweepResult(null)
    setActiveKpiModal(null)
    showToast('Demo datasets restored to baseline state.')
  }

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
    { name: 'Register Hazard', icon: 'hazard' },
    { name: 'Safety Monitoring', icon: 'safety' },
    { name: 'Compliance', icon: 'compliance' },
    { name: 'Insurance Risk', icon: 'insurance' },
    { name: 'Reports', icon: 'reports' },
    { name: 'Alerts', icon: 'alerts', badge: alerts.filter(a => a.status !== 'Acknowledged').length },
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
    showToast(`Alert ${id} removed from feed.`)
  }

  // Interactive: Acknowledge Alert (Requirement 5)
  const handleAcknowledgeAlert = (id) => {
    setAlerts(prev => prev.map(a => {
      if (a.id === id) {
        const nextStatus = a.status === 'Acknowledged' ? 'Active' : 'Acknowledged'
        showToast(`Alert ${id} status updated to ${nextStatus}.`)
        return { ...a, status: nextStatus }
      }
      return a
    }))
  }

  // Interactive: Mark All Alerts Acknowledged
  const handleMarkAllAlertsAcknowledged = () => {
    setAlerts(prev => prev.map(a => ({ ...a, status: 'Acknowledged' })))
    showToast('All active alerts marked as Acknowledged.')
  }

  // Interactive: Acknowledge Agent Log entry
  const handleAcknowledgeAgentLog = (id) => {
    setAgentLogs(prev => prev.map(item => {
      if (item.id === id) {
        const nextStatus = item.status === 'Acknowledged' ? 'Active' : 'Acknowledged'
        showToast(`Deliberation ${id} marked as ${nextStatus}.`)
        return { ...item, status: nextStatus }
      }
      return item
    }))
  }

  // Interactive: Toggle Hazard status & sync linked alerts (Day 2 Step 4)
  const handleToggleHazard = (id) => {
    setHazards(prev => prev.map(h => {
      if (h.id === id) {
        const nextStatus = h.status === 'Resolved' ? 'Open' : 'Resolved'
        showToast(`Hazard ${id} status set to ${nextStatus}.`)

        // Synchronize linked alert status if present (Requirement 8)
        setAlerts(prevAlerts => prevAlerts.map(a => {
          if (a.hazardId === id) {
            return {
              ...a,
              status: nextStatus === 'Resolved' ? 'Acknowledged' : 'Active'
            }
          }
          return a
        }))

        return {
          ...h,
          status: nextStatus
        }
      }
      return h
    }))
  }

  // Interactive: Register Hazard & auto-dispatch High/Critical Alerts (Day 2 Step 4)
  const handleRegisterHazard = (newHazard) => {
    setHazards(prev => [newHazard, ...prev])

    // Requirement 8: Make high and critical hazards appear in the existing Alerts section.
    // Keep alert counts synchronized with the hazard data.
    if (newHazard.priority === 'Critical' || newHazard.priority === 'High') {
      const generatedAlert = {
        id: `ALT-${Math.floor(410 + Math.random() * 580)}`,
        hazardId: newHazard.id,
        title: `${newHazard.priority} Hazard Alert: ${newHazard.hazard}`,
        desc: `${newHazard.priorityGuidance || getPriorityGuidance(newHazard.priority)} ${newHazard.categoryRecommendation || getCategoryRecommendation(newHazard.category)}`,
        site: newHazard.site,
        time: 'Just now',
        type: newHazard.priority.toLowerCase(), // 'critical' or 'high'
        status: 'Active',
        category: newHazard.category,
        riskScore: newHazard.riskScore
      }
      setAlerts(prev => [generatedAlert, ...prev])
      showToast(`[ALERT DISPATCHED] ${newHazard.priority} hazard added to Alerts Queue & Active Hazards Registry.`)
    } else {
      showToast(`Hazard ${newHazard.id} successfully registered with priority ${newHazard.priority}!`)
    }
  }

  // Interactive: Trigger Autonomous Risk Sweep Simulation (Requirement 4 & 9)
  const handleTriggerRiskSweep = () => {
    setIsSimulatingSweep(true)
    setSweepResult(null)
    setTimeout(() => {
      const targetSite = selectedSite === 'All Sites' ? 'Riverside Bridge Expansion' : selectedSite
      const siteObj = ALL_SITES.find(s => s.name === targetSite) || ALL_SITES[0]
      const newDelib = {
        id: `DELIB-${Math.floor(1000 + Math.random() * 9000)}`,
        agent: 'Autonomous Sentinel Engine',
        site: targetSite,
        time: 'Just now',
        urgency: 'normal',
        status: 'Active',
        message: `[SIMULATED SWEEP] Telemetry cycle verified for ${targetSite}. Analyzed ${120 + Math.floor(Math.random() * 40)} structural strain gauges, ${siteObj.activeCranes * 2} anemometers, and ${siteObj.workers} worker positioning beacons. All values within nominal safety tolerances.`
      }
      setAgentLogs(prev => [newDelib, ...prev])
      setAuditSweepCount(prev => prev + 1)
      setSweepResult({
        id: `SWEEP-${Math.floor(1000 + Math.random() * 9000)}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        site: selectedSite === 'All Sites' ? 'All Monitored Sites Portfolio' : selectedSite,
        status: 'SIMULATED NOMINAL',
        gaugesChecked: selectedSite === 'All Sites' ? 840 : 142,
        anemometers: selectedSite === 'All Sites' ? 19 : siteObj.activeCranes,
        workersScanned: selectedSite === 'All Sites' ? ALL_SITES.reduce((a, b) => a + b.workers, 0) : siteObj.workers,
        message: `Simulated multi-agent telemetry sweep completed successfully for ${selectedSite === 'All Sites' ? 'all 6 active zones' : selectedSite}. No acute structural stress or perimeter safety violations were detected during this cycle.`,
        simulatedDisclaimer: 'SIMULATED DEMO: Synthetic telemetry analysis cycle completed for platform evaluation. No live physical sensors, autonomous agents, or actual emergency dispatch systems are operational.'
      })
      setIsSimulatingSweep(false)
      showToast(`[SIMULATED] Risk sweep completed for ${selectedSite}. Telemetry nominal.`)
    }, 1100)
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
                {currentNav.title}
                <span className="header-tag-pill">{currentNav.tag}</span>
              </div>
              <div className="header-view-sub">
                {currentNav.subtitle}
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
                {alerts.filter(a => a.status !== 'Acknowledged').length > 0 && <span className="btn-indicator-dot" />}
              </button>

              {showNotifications && (
                <div className="notification-tray-dropdown" ref={notificationRef}>
                  <div className="tray-header">
                    <span className="tray-title">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--cyan-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      Alerts Triage ({alerts.length})
                    </span>
                    <div className="tray-actions-row">
                      <button
                        type="button"
                        className="tray-action-link"
                        onClick={handleMarkAllAlertsAcknowledged}
                        title="Mark all active alerts as Acknowledged"
                      >
                        Acknowledge All
                      </button>
                      <button
                        type="button"
                        className="tray-action-link"
                        onClick={() => {
                          setAlerts([])
                          showToast('All alerts cleared.')
                        }}
                        title="Clear all alerts"
                      >
                        Clear All
                      </button>
                      <button
                        type="button"
                        className="tray-close-btn"
                        onClick={() => setShowNotifications(false)}
                        aria-label="Close notification tray"
                        title="Close"
                      >
                        &times;
                      </button>
                    </div>
                  </div>

                  {alerts.length === 0 ? (
                    <div style={{ padding: '24px 0', textAlign: 'center', fontSize: '12px', color: 'var(--text-dim)' }}>
                      All alerts cleared. Telemetry optimal.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '340px', overflowY: 'auto' }}>
                      {alerts.map((alt) => (
                        <div key={alt.id} className="tray-alert-item">
                          <div className="tray-alert-top">
                            <strong className="tray-alert-title">{alt.title}</strong>
                            <span className={`tray-status-pill ${alt.status?.toLowerCase() || 'active'}`}>
                              {alt.status || 'Active'}
                            </span>
                          </div>
                          <div className="tray-alert-desc">{alt.desc}</div>
                          <div className="tray-alert-footer">
                            <span className="tray-alert-meta">{alt.site} &bull; {alt.time}</span>
                            <button
                              type="button"
                              className={`tray-ack-btn ${alt.status === 'Acknowledged' ? 'is-ack' : ''}`}
                              onClick={() => handleAcknowledgeAlert(alt.id)}
                            >
                              {alt.status === 'Acknowledged' ? '✓ Acknowledged' : 'Acknowledge'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    style={{ fontSize: '11px', color: 'var(--cyan-primary)', textAlign: 'center', marginTop: '4px', fontWeight: '700', background: 'none', border: 'none', cursor: 'pointer', padding: '6px' }}
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
              setSelectedSite={setSelectedSite}
              allSites={ALL_SITES}
              displayedSites={displayedSites}
              hazards={filteredHazards}
              allHazards={hazards}
              alerts={displayedAlerts}
              allAlerts={alerts}
              agentLogs={agentLogs}
              severityFilter={severityFilter}
              setSeverityFilter={setSeverityFilter}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onToggleHazard={handleToggleHazard}
              onDismissAlert={handleDismissAlert}
              onAcknowledgeAlert={handleAcknowledgeAlert}
              onAcknowledgeAgentLog={handleAcknowledgeAgentLog}
              onTriggerSweep={handleTriggerRiskSweep}
              isSimulatingSweep={isSimulatingSweep}
              sweepResult={sweepResult}
              onDismissSweepResult={() => setSweepResult(null)}
              onOpenKpiDetail={(type) => setActiveKpiModal(type)}
              onNavigate={setActiveNav}
            />
          )}

          {activeNav === 'Site Risk Agent' && (
            <SiteRiskAgentView
              agentLogs={agentLogs}
              onTriggerSweep={handleTriggerRiskSweep}
              isSimulatingSweep={isSimulatingSweep}
              selectedSite={selectedSite}
              onShowToast={showToast}
              onNavigate={setActiveNav}
            />
          )}

          {activeNav === 'Register Hazard' && (
            <HazardRegistrationView
              allSites={ALL_SITES}
              selectedSite={selectedSite}
              hazards={hazards}
              onRegisterHazard={handleRegisterHazard}
              onNavigate={setActiveNav}
              onShowToast={showToast}
              onToggleHazard={handleToggleHazard}
            />
          )}

          {activeNav === 'Safety Monitoring' && (
            <SafetyMonitoringView
              selectedSite={selectedSite}
              onShowToast={showToast}
            />
          )}

          {activeNav === 'Compliance' && (
            <ComplianceView
              selectedSite={selectedSite}
              onShowToast={showToast}
            />
          )}

          {activeNav === 'Insurance Risk' && (
            <InsuranceRiskView
              selectedSite={selectedSite}
              onShowToast={showToast}
            />
          )}

          {activeNav === 'Reports' && (
            <ReportsView
              selectedSite={selectedSite}
              onShowToast={showToast}
            />
          )}

          {activeNav === 'Alerts' && (
            <AlertsCenterView
              alerts={alerts}
              onDismissAlert={handleDismissAlert}
              onAcknowledgeAlert={handleAcknowledgeAlert}
              onClearAll={() => {
                setAlerts([])
                showToast('All active alerts acknowledged and cleared.')
              }}
              onShowToast={showToast}
            />
          )}

          {activeNav === 'Settings' && (
            <SettingsView
              onShowToast={showToast}
              onResetDemoData={handleResetDemoData}
            />
          )}
        </main>
      </div>

      {/* KPI Detail Modal Dialog (Requirement 6) */}
      <KpiDetailModal
        activeModal={activeKpiModal}
        onClose={() => setActiveKpiModal(null)}
        selectedSite={selectedSite}
        allSites={ALL_SITES}
        onSelectSite={setSelectedSite}
        onNavigate={(view) => setActiveNav(view)}
        hazards={hazards}
        alerts={alerts}
        onToggleHazard={handleToggleHazard}
        onFilterSeverity={setSeverityFilter}
        onScrollToHazards={() => {
          const el = document.getElementById('recent-hazards-section')
          if (el) el.scrollIntoView({ behavior: 'smooth' })
        }}
      />

      {/* Floating Action Feedback Cyber Toast */}
      {toastMessage && (
        <div className="cyber-toast-container">
          <div className="cyber-toast" onClick={() => setToastMessage(null)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--cyan-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Interactive Component: Expandable Hazard Safety Recommendations (Day 2 Step 4)
// ============================================================================
function HazardRecommendationRow({ item, onToggleHazard, onClose, onNavigate, colSpan = 6 }) {
  const categoryRec = item.categoryRecommendation || getCategoryRecommendation(item.category || item.hazard)
  const priorityGuide = item.priorityGuidance || getPriorityGuidance(item.priority || item.severity)
  const priorityBadge = getPrototypePriority(item.riskScore || 50)
  const isHighOrCritical = (item.riskScore || 50) >= 50 || item.priority === 'High' || item.priority === 'Critical' || item.severity === 'High' || item.severity === 'Critical'

  return (
    <tr className="hazard-expansion-row">
      <td colSpan={colSpan}>
        <div className={`hazard-recommendation-panel ${priorityBadge.badgeClass}`}>
          <div className="rec-header-row">
            <div className="rec-header-left">
              <span className="rec-section-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
                Safety Recommendations &amp; Guidance
              </span>
              <span className={`cyber-badge ${priorityBadge.badgeClass}`}>
                PRIORITY: {priorityBadge.label.toUpperCase()}
              </span>
              {isHighOrCritical && (
                <span className="alert-hazard-sync-pill">
                  <span className="badge-dot" />
                  SYNCED TO ALERTS
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                REF: {item.id} &bull; {item.site}
              </span>
              <button
                type="button"
                className="hazard-expand-btn expanded"
                onClick={(e) => {
                  e.stopPropagation()
                  onClose()
                }}
                title="Collapse recommendations panel"
              >
                ▲ Collapse
              </button>
            </div>
          </div>

          <div className="rec-grid-layout">
            {/* Category-Specific Recommendation (Requirement 4) */}
            <div className="rec-card category-rec">
              <div className="rec-card-header">
                <span className="rec-card-tag">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--cyan-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                  </svg>
                  Category Protocol: {item.category || 'General Safety'}
                </span>
              </div>
              <div className="rec-card-text">
                {categoryRec}
              </div>
            </div>

            {/* Priority-Based Guidance (Requirement 5) */}
            <div className={`rec-card priority-rec ${priorityBadge.badgeClass}`}>
              <div className="rec-card-header">
                <span className="rec-card-tag">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  Priority Guidance: {priorityBadge.label} (Score: {item.riskScore}/100)
                </span>
              </div>
              <div className="rec-card-text">
                {priorityGuide}
              </div>
            </div>
          </div>

          {/* Scoring & Meta Strip */}
          <div className="rec-meta-bar">
            <div className="rec-meta-left">
              <span className="rec-meta-item">Severity: <strong>{item.numericSeverity || (item.severity === 'Critical' ? 5 : item.severity === 'High' ? 4 : item.severity === 'Medium' ? 3 : 2)}/5</strong></span>
              <span>&bull;</span>
              <span className="rec-meta-item">Likelihood: <strong>{item.numericLikelihood || (item.riskScore >= 75 ? 5 : item.riskScore >= 50 ? 4 : item.riskScore >= 25 ? 3 : 2)}/5</strong></span>
              <span>&bull;</span>
              <span className="rec-meta-item">Prototype Formula: <strong>Severity &times; Likelihood &times; 4 = {item.riskScore}/100</strong></span>
              <span>&bull;</span>
              <span className="rec-meta-item">Status: <strong>{item.status}</strong></span>
              {item.reportedBy && (
                <>
                  <span>&bull;</span>
                  <span className="rec-meta-item">Reporter: <strong>{item.reportedBy}</strong></span>
                </>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="table-action-cyber-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleHazard(item.id)
                }}
              >
                {item.status === 'Resolved' ? 'Reopen Incident' : 'Mark Resolved'}
              </button>
              {isHighOrCritical && onNavigate && (
                <button
                  type="button"
                  className="table-action-cyber-btn"
                  style={{ color: 'var(--cyan-primary)', borderColor: 'rgba(56, 189, 248, 0.4)' }}
                  onClick={(e) => {
                    e.stopPropagation()
                    onNavigate('Alerts')
                  }}
                >
                  View Alerts Queue &rarr;
                </button>
              )}
            </div>
          </div>

          {/* Demonstration Notice (Requirement 3) */}
          <div className="rec-disclaimer-notice">
            <strong>DEMONSTRATION RULE NOTICE:</strong> The risk score ({item.riskScore}/100) and recommendations are produced using prototype demonstration rules (Severity &times; Likelihood &times; 4; 1–24 Low, 25–49 Medium, 50–74 High, 75–100 Critical). These are simulated heuristics for platform interface evaluation, not a validated construction-safety standard.
          </div>
        </div>
      </td>
    </tr>
  )
}

// ============================================================================
// Sub-View: 1. Main Dashboard View
// ============================================================================
function DashboardView({
  selectedSite,
  setSelectedSite,
  allSites,
  displayedSites,
  hazards,
  allHazards,
  alerts,
  allAlerts,
  agentLogs,
  severityFilter,
  setSeverityFilter,
  searchQuery,
  setSearchQuery,
  onToggleHazard,
  onDismissAlert,
  onAcknowledgeAlert,
  onAcknowledgeAgentLog,
  onTriggerSweep,
  isSimulatingSweep,
  sweepResult,
  onDismissSweepResult,
  onOpenKpiDetail,
  onNavigate
}) {
  const [expandedHazardId, setExpandedHazardId] = useState(null)
  const selectedSiteData = allSites?.find(s => s.name === selectedSite)

  // Hazards filtered to selected site
  const siteHazards = selectedSite === 'All Sites' 
    ? allHazards 
    : allHazards.filter(h => h.site === selectedSite)
  
  const openHazardCount = siteHazards.filter(h => h.status !== 'Resolved').length
  const criticalHazardsCount = siteHazards.filter(h => (h.severity === 'Critical' || h.priority === 'Critical') && h.status !== 'Resolved').length
  const criticalAlertsCount = allAlerts.filter(a => (selectedSite === 'All Sites' || a.site === selectedSite) && a.type === 'critical' && a.status !== 'Acknowledged').length
  const criticalRiskCount = criticalHazardsCount + criticalAlertsCount

  const complianceScore = selectedSite === 'All Sites' 
    ? '94.2%' 
    : (selectedSiteData?.compliance || '94.2%')

  const activeWorkers = selectedSite === 'All Sites'
    ? allSites.reduce((sum, s) => sum + s.workers, 0)
    : (selectedSiteData?.workers || 142)

  const activeCranes = selectedSite === 'All Sites'
    ? allSites.reduce((sum, s) => sum + s.activeCranes, 0)
    : (selectedSiteData?.activeCranes || 4)

  return (
    <>
      {/* Active Site Filter Context Banner (Requirement 2) */}
      {selectedSite !== 'All Sites' && (
        <div className="active-site-banner">
          <div className="site-banner-info">
            <span className="site-banner-badge">{selectedSiteData?.category?.toUpperCase() || 'ACTIVE'} RISK</span>
            <span className="site-banner-text">
              Site Scope: <strong>{selectedSite}</strong> &bull; {selectedSiteData?.zone} &bull; {activeWorkers} Workers &bull; {activeCranes} Cranes &bull; Compliance: <strong>{complianceScore}</strong>
            </span>
          </div>
          <button
            type="button"
            className="site-banner-reset-btn"
            onClick={() => setSelectedSite('All Sites')}
            title="Reset site filter to all monitored sites"
          >
            Show All Sites &times;
          </button>
        </div>
      )}

      {/* Four Interactive Indicator Cards (KPIs - Requirement 6) */}
      <section className="kpi-cards-grid animate-entrance delay-1">
        {/* Active Sites / Selected Site Card */}
        <div
          className="kpi-card interactive"
          onClick={() => onOpenKpiDetail('sites')}
          role="button"
          tabIndex={0}
          title="Click to view Active Construction Sites breakdown"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onOpenKpiDetail('sites')
            }
          }}
        >
          <div className="kpi-top-row">
            <span className="kpi-label">{selectedSite === 'All Sites' ? 'Active Sites' : 'Selected Site'}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="kpi-detail-hint">Inspect ↗</span>
              <div className="kpi-icon-pill cyan">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
                  <line x1="8" y1="6" x2="16" y2="6" />
                  <line x1="8" y1="10" x2="16" y2="10" />
                  <line x1="8" y1="14" x2="16" y2="14" />
                </svg>
              </div>
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value">{selectedSite === 'All Sites' ? '6 Active' : '1 Active'}</span>
            <span className="kpi-chip chip-good">
              {selectedSite === 'All Sites' ? '+2 TELEMETRY' : `${selectedSiteData?.category?.toUpperCase()} RISK`}
            </span>
          </div>
          <div className="kpi-note">
            {selectedSite === 'All Sites'
              ? '6 active zones • 664 workers on duty'
              : `${selectedSite} • ${activeWorkers} workers • ${activeCranes} cranes`}
          </div>
        </div>

        {/* Open Hazards Card */}
        <div
          className="kpi-card interactive"
          onClick={() => onOpenKpiDetail('hazards')}
          role="button"
          tabIndex={0}
          title="Click to view Open Hazards breakdown"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onOpenKpiDetail('hazards')
            }
          }}
        >
          <div className="kpi-top-row">
            <span className="kpi-label">Open Hazards</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="kpi-detail-hint">Inspect ↗</span>
              <div className="kpi-icon-pill amber">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value">{openHazardCount}</span>
            <span className="kpi-chip chip-good">&darr; -6 PAST 24H</span>
          </div>
          <div className="kpi-note">
            {siteHazards.filter(h => h.severity === 'Critical' && h.status !== 'Resolved').length} Critical &bull;{' '}
            {siteHazards.filter(h => h.severity === 'High' && h.status !== 'Resolved').length} High &bull;{' '}
            {siteHazards.filter(h => h.severity === 'Medium' && h.status !== 'Resolved').length} Moderate
          </div>
        </div>

        {/* Critical Risks Card */}
        <div
          className="kpi-card interactive"
          onClick={() => onOpenKpiDetail('risks')}
          role="button"
          tabIndex={0}
          title="Click to view Critical Risk escalation vectors"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onOpenKpiDetail('risks')
            }
          }}
        >
          <div className="kpi-top-row">
            <span className="kpi-label">Critical Risks</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="kpi-detail-hint">Inspect ↗</span>
              <div className="kpi-icon-pill crimson">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value">{criticalRiskCount}</span>
            <span className="kpi-chip chip-alert">ACTION REQ</span>
          </div>
          <div className="kpi-note">
            {selectedSite === 'All Sites'
              ? 'Auto-escalated to Field Superintendents'
              : `Specific to ${selectedSite} perimeter`}
          </div>
        </div>

        {/* Compliance Score Card */}
        <div
          className="kpi-card interactive"
          onClick={() => onOpenKpiDetail('compliance')}
          role="button"
          tabIndex={0}
          title="Click to view OSHA 1926 compliance breakdown"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onOpenKpiDetail('compliance')
            }
          }}
        >
          <div className="kpi-top-row">
            <span className="kpi-label">Compliance Score</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="kpi-detail-hint">Inspect ↗</span>
              <div className="kpi-icon-pill emerald">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value">{complianceScore}</span>
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
              <div
                key={site.id}
                className="site-bar-item"
                style={{
                  cursor: 'pointer',
                  padding: '4px 6px',
                  borderRadius: '6px',
                  background: selectedSite === site.name ? 'rgba(0, 242, 254, 0.06)' : 'transparent',
                  border: selectedSite === site.name ? '1px solid rgba(0, 242, 254, 0.25)' : '1px solid transparent'
                }}
                onClick={() => setSelectedSite(site.name)}
                title={`Click to filter dashboard to ${site.name}`}
              >
                <div className="site-bar-meta">
                  <span className="site-name-text">
                    {site.name} {selectedSite === site.name && <span style={{ color: 'var(--cyan-primary)', fontSize: '11px', fontWeight: 600 }}>[FILTERED]</span>}
                  </span>
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

            {/* Run Sweep button (Requirement 4) */}
            <button
              type="button"
              className="agent-quick-action"
              onClick={onTriggerSweep}
              disabled={isSimulatingSweep}
              aria-label="Run simulated multi-agent telemetry sweep"
            >
              {isSimulatingSweep ? (
                <>
                  <span className="sweep-spinner" />
                  Simulating...
                </>
              ) : (
                '+ Run Sweep'
              )}
            </button>
          </div>

          {/* Sweeping Active Pulse State */}
          {isSimulatingSweep && (
            <div className="sweep-running-bar">
              <span className="sweep-pulse-indicator" />
              <span>[SIMULATING SWEEP] Performing multi-agent telemetry sweep across strain gauges &amp; crane feeds...</span>
            </div>
          )}

          {/* Simulated Sweep Result Card (Requirement 4 & 9) */}
          {sweepResult && (
            <div className="sweep-result-card">
              <div className="sweep-result-header">
                <div className="sweep-result-title-group">
                  <span className="sweep-result-badge">SIMULATED RESULT</span>
                  <span className="sweep-result-status">{sweepResult.status}</span>
                  <span className="sweep-result-time">{sweepResult.time}</span>
                </div>
                <button
                  type="button"
                  className="sweep-result-close"
                  onClick={onDismissSweepResult}
                  title="Dismiss Result"
                  aria-label="Dismiss simulated result"
                >
                  &times;
                </button>
              </div>
              <p className="sweep-result-message">{sweepResult.message}</p>
              <div className="sweep-result-meta-strip">
                <span>Site: <strong>{sweepResult.site}</strong></span>
                <span>Simulated Gauges: <strong>{sweepResult.gaugesChecked}</strong></span>
                <span>Anemometers: <strong>{sweepResult.anemometers}</strong></span>
                <span>Workers: <strong>{sweepResult.workersScanned}</strong></span>
              </div>
              <div className="sweep-result-disclaimer">
                ⚠️ {sweepResult.simulatedDisclaimer}
              </div>
            </div>
          )}

          <div className="agent-activity-feed">
            {agentLogs.slice(0, 3).map((item) => (
              <div key={item.id} className={`agent-activity-entry ${item.urgency}`}>
                <div className="agent-activity-header">
                  <span className="agent-name-tag">{item.agent}</span>
                  <span className="agent-timestamp">{item.time}</span>
                </div>
                <div className="agent-message">{item.message}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--cyan-bright)', fontWeight: 500 }}>{item.site}</span>
                  <button
                    type="button"
                    className={`agent-quick-action ${item.status === 'Acknowledged' ? 'is-ack' : ''}`}
                    onClick={() => onAcknowledgeAgentLog(item.id)}
                  >
                    {item.status === 'Acknowledged' ? '✓ Acknowledged' : 'Acknowledge →'}
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
        <div className="cyber-panel" id="recent-hazards-section">
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
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {hazards.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '28px', color: 'var(--text-dim)', fontSize: '13px' }}>
                      No hazards found matching current criteria.
                    </td>
                  </tr>
                ) : (
                  hazards.map((item) => {
                    const priorityBadge = getPrototypePriority(item.riskScore || 50)
                    const isExpanded = expandedHazardId === item.id
                    return (
                      <React.Fragment key={item.id}>
                        <tr
                          className={`table-row-selectable ${isExpanded ? 'is-expanded' : ''}`}
                          onClick={() => setExpandedHazardId(isExpanded ? null : item.id)}
                          title="Click to view Safety Recommendations & Priority Guidance"
                        >
                          <td>
                            <div className="table-cell-site">{item.site}</div>
                            <div className="table-cell-sub">
                              {item.id} {item.category ? `• ${item.category}` : ''}
                            </div>
                          </td>
                          <td>
                            <div className="table-cell-hazard">{item.hazard}</div>
                            {item.categoryRecommendation && (
                              <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ color: 'var(--cyan-primary)', fontWeight: 600 }}>Rec:</span>
                                <span>{item.categoryRecommendation.slice(0, 52)}...</span>
                              </div>
                            )}
                          </td>
                          <td>
                            <span className={`cyber-badge ${(item.severity || 'medium').toLowerCase()}`}>
                              <span className="badge-dot" />
                              {item.severity} {item.numericSeverity ? `(${item.numericSeverity}/5)` : ''}
                            </span>
                          </td>
                          <td>
                            <span style={{
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 700,
                              fontSize: '13px',
                              color: priorityBadge.color
                            }}>
                              {item.riskScore}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 500 }}>/100</span>
                          </td>
                          <td>
                            <span className={`cyber-badge ${priorityBadge.badgeClass}`}>
                              {item.priority || priorityBadge.label}
                            </span>
                          </td>
                          <td>
                            <span className={`table-status-pill ${item.status.toLowerCase().replace(/\s+/g, '-')}`}>
                              {item.status}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <button
                                type="button"
                                className={`hazard-expand-btn ${isExpanded ? 'expanded' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setExpandedHazardId(isExpanded ? null : item.id)
                                }}
                                title="Expand safety recommendations & action guidance"
                              >
                                {isExpanded ? '▲ Hide' : '▼ Recs'}
                              </button>
                              <button
                                type="button"
                                className="table-action-cyber-btn"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onToggleHazard(item.id)
                                }}
                              >
                                {item.status === 'Resolved' ? 'Reopen' : 'Resolve'}
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <HazardRecommendationRow
                            item={item}
                            onToggleHazard={onToggleHazard}
                            onClose={() => setExpandedHazardId(null)}
                            onNavigate={onNavigate}
                            colSpan={7}
                          />
                        )}
                      </React.Fragment>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Alert Timeline (Requirement 5 & 8) */}
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
              LIVE FEED &bull; {alerts.length} ACTIVE ALERTS
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
                      <div className="timeline-meta-left">
                        <span className="timeline-site">{alt.site}</span>
                        <span className={`alert-status-badge ${alt.status?.toLowerCase() || 'active'}`}>
                          {alt.status || 'Active'}
                        </span>
                        {alt.hazardId && (
                          <span className="alert-hazard-sync-pill">
                            <span className="badge-dot" />
                            SYNCED HAZARD: {alt.hazardId}
                          </span>
                        )}
                      </div>
                      <div className="timeline-actions">
                        <button
                          type="button"
                          className={`timeline-ack-btn ${alt.status === 'Acknowledged' ? 'is-ack' : ''}`}
                          onClick={() => onAcknowledgeAlert(alt.id)}
                          title="Acknowledge this incident alert"
                        >
                          {alt.status === 'Acknowledged' ? '✓ Acknowledged' : 'Acknowledge'}
                        </button>
                        <button
                          type="button"
                          className="timeline-dismiss-btn"
                          onClick={() => onDismissAlert(alt.id)}
                          title="Remove alert from feed"
                        >
                          Dismiss
                        </button>
                      </div>
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
function SiteRiskAgentView({ agentLogs, onTriggerSweep, isSimulatingSweep, selectedSite, onShowToast, onNavigate }) {
  const [activeFilter, setActiveFilter] = useState('All')

  const agents = [
    {
      id: 'agent-1',
      name: 'Structural Sentinel Agent',
      domain: 'Cranes & Scaffold Load Strain',
      category: 'Structural',
      status: 'Online & Reasoning',
      load: '42% CPU',
      detections: '14 Flags',
      architecture: 'Strain Gauge Mesh v2.4',
      confidence: '99.1%'
    },
    {
      id: 'agent-2',
      name: 'Vision AI Inspector',
      domain: 'Camera/Drone PPE & Boundary Breaches',
      category: 'Vision',
      status: 'Active Patrol',
      load: '68% GPU',
      detections: '28 Flags',
      architecture: 'YOLOv11-Edge-Synthetic',
      confidence: '96.4%'
    },
    {
      id: 'agent-3',
      name: 'Environmental Sensor Agent',
      domain: 'Wind, Humidity & Dust Telemetry',
      category: 'Environmental',
      status: 'Live Stream',
      load: '18% CPU',
      detections: '6 Warnings',
      architecture: 'Micro-climate LSTM Filter',
      confidence: '98.7%'
    },
    {
      id: 'agent-4',
      name: 'Permit & Compliance Auditor',
      domain: 'OSHA 1926 Subcontractor Credentials',
      category: 'Compliance',
      status: 'Synchronized',
      load: '12% CPU',
      detections: '2 Holds',
      architecture: 'Regulatory Code RAG Engine',
      confidence: '99.5%'
    }
  ]

  const filteredAgents = activeFilter === 'All'
    ? agents
    : agents.filter(a => a.category === activeFilter)

  return (
    <div className="view-module-container animate-entrance">
      <div className="view-hero-panel">
        <div>
          <div className="view-hero-title">Autonomous Site Risk Agent Console</div>
          <div className="view-hero-desc">
            Orchestrates multi-agent reasoning models to evaluate structural strain, visual hazard vectors, and environmental limits across {selectedSite}.
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
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
          <button
            type="button"
            className="view-hero-btn"
            style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid var(--border-medium)', color: '#ffffff' }}
            onClick={() => onNavigate && onNavigate('Register Hazard')}
          >
            + Register Field Hazard &rarr;
          </button>
        </div>
      </div>

      {/* Synthetic Metric Strip */}
      <div className="view-stats-row">
        <div className="view-stat-card">
          <span className="view-stat-label">Active Reasoning Models</span>
          <span className="view-stat-value">4 AGENTS</span>
          <span className="view-stat-sub">100% Core Mesh Synchronized</span>
        </div>
        <div className="view-stat-card">
          <span className="view-stat-label">Mean Inference Latency</span>
          <span className="view-stat-value">14 MS</span>
          <span className="view-stat-sub">Edge TPU Simulated Acceleration</span>
        </div>
        <div className="view-stat-card">
          <span className="view-stat-label">Simulated Telemetry Ingestion</span>
          <span className="view-stat-value">184.2K</span>
          <span className="view-stat-sub">Tokens / Hour Throughput</span>
        </div>
        <div className="view-stat-card">
          <span className="view-stat-label">Consensus Hazard Score</span>
          <span className="view-stat-value">91.4%</span>
          <span className="view-stat-sub">Multi-Model Cross-Validation</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="table-filter-header">
        <div className="cyber-pill-group">
          {['All', 'Structural', 'Vision', 'Environmental', 'Compliance'].map((cat) => (
            <button
              key={cat}
              type="button"
              className={`cyber-pill-btn ${activeFilter === cat ? 'active' : ''}`}
              onClick={() => setActiveFilter(cat)}
            >
              {cat === 'All' ? 'All Models (4)' : cat}
            </button>
          ))}
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
          SYNTHETIC REASONING PIPELINE // DEMO MODE
        </span>
      </div>

      {/* Agents Grid */}
      <div className="module-grid-3col">
        {filteredAgents.map((ag) => (
          <div key={ag.id} className="module-card">
            <div className="module-card-header">
              <div className="panel-icon-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="10" rx="2" />
                  <circle cx="12" cy="5" r="2" />
                  <path d="M12 7v4" />
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div className="module-card-title">{ag.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>{ag.domain}</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Core Architecture:</span>
                <span style={{ color: '#ffffff', fontWeight: 500 }}>{ag.architecture}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Inference Confidence:</span>
                <span style={{ color: 'var(--color-low)', fontWeight: 600 }}>{ag.confidence}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Compute Allocation:</span>
                <span style={{ color: 'var(--cyan-primary)', fontWeight: 600 }}>{ag.load}</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', marginTop: '4px' }}>
              <span style={{ color: 'var(--cyan-primary)', fontWeight: 600 }}>{ag.status}</span>
              <button
                type="button"
                className="table-action-cyber-btn"
                onClick={() => onShowToast(`Diagnostic ping sent to ${ag.name} (Simulated 14ms reply)`)}
              >
                Ping Agent
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Multi-Agent Deliberation Trace */}
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
          <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
            EVALUATION TELEMETRY ONLY
          </span>
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
// Sub-View: Hazard Registration & Field Triage (Day 2 Step 3)
// ============================================================================
function HazardRegistrationView({
  allSites,
  selectedSite,
  hazards,
  onRegisterHazard,
  onNavigate,
  onShowToast,
  onToggleHazard
}) {
  const initialSite = selectedSite && selectedSite !== 'All Sites'
    ? selectedSite
    : (allSites[0]?.name || 'Riverside Bridge Expansion')

  const [site, setSite] = useState(initialSite)
  const [category, setCategory] = useState('Fall Risk')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState(3)
  const [likelihood, setLikelihood] = useState(3)
  const [reportedBy, setReportedBy] = useState('A. Morgan (Safety Superintendent)')

  const [errors, setErrors] = useState({})
  const [lastSubmitted, setLastSubmitted] = useState(null)
  const [expandedRegistryId, setExpandedRegistryId] = useState(null)

  // Real-time prototype calculation (Requirement 2, 4 & 5)
  // risk score = severity * likelihood * 4 (range 4 to 100)
  const riskScore = calculateRiskScore(severity, likelihood)
  const priorityInfo = getPrototypePriority(riskScore)
  const liveCategoryRec = getCategoryRecommendation(category)
  const livePriorityGuide = getPriorityGuidance(priorityInfo.label)

  const severityLabels = [
    { num: 1, label: 'Negligible', desc: 'No injury / minor delay' },
    { num: 2, label: 'Minor', desc: 'First-aid injury / brief hold' },
    { num: 3, label: 'Moderate', desc: 'Medical treatment / localized stoppage' },
    { num: 4, label: 'Major', desc: 'Severe injury / partial zone shut' },
    { num: 5, label: 'Critical', desc: 'Catastrophic event / life safety breach' }
  ]

  const likelihoodLabels = [
    { num: 1, label: 'Rare', desc: 'Improbable under typical ops' },
    { num: 2, label: 'Unlikely', desc: 'Could occur under abnormal condition' },
    { num: 3, label: 'Possible', desc: 'May occur occasionally' },
    { num: 4, label: 'Likely', desc: 'Expected to occur during active shift' },
    { num: 5, label: 'Certain', desc: 'Imminent or continuous exposure' }
  ]

  const validate = () => {
    const errs = {}
    if (!site || site.trim() === '') errs.site = 'Construction site selection is required.'
    if (!category || category.trim() === '') errs.category = 'Hazard category is required.'
    if (!title || title.trim().length < 3) errs.title = 'Hazard title must be at least 3 characters long.'
    if (!description || description.trim().length < 10) errs.description = 'Detailed description must be at least 10 characters long.'
    if (!severity || severity < 1 || severity > 5) errs.severity = 'Severity rating must be between 1 and 5.'
    if (!likelihood || likelihood < 1 || likelihood > 5) errs.likelihood = 'Likelihood rating must be between 1 and 5.'
    if (!reportedBy || reportedBy.trim().length < 2) errs.reportedBy = 'Reporter name/callsign is required.'
    return errs
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      onShowToast('Please complete all required fields correctly.')
      return
    }

    setErrors({})

    const categoryRec = getCategoryRecommendation(category)
    const priorityGuide = getPriorityGuidance(priorityInfo.label)

    const newId = `HAZ-${Math.floor(1000 + Math.random() * 9000)}`
    const newEntry = {
      id: newId,
      site: site,
      hazard: title.trim(),
      category: category,
      description: description.trim(),
      severity: priorityInfo.label,
      numericSeverity: severity,
      numericLikelihood: likelihood,
      riskScore: riskScore,
      priority: priorityInfo.label,
      categoryRecommendation: categoryRec,
      priorityGuidance: priorityGuide,
      status: 'Open',
      reportedBy: reportedBy.trim(),
      timestamp: 'Just now'
    }

    // Add to frontend state table & auto-escalate (Requirements 6 & 8)
    onRegisterHazard(newEntry)
    setLastSubmitted(newEntry)

    // Clear form fields (Requirement 8)
    setTitle('')
    setDescription('')
    setSeverity(3)
    setLikelihood(3)
  }

  const handleResetForm = () => {
    setTitle('')
    setDescription('')
    setSeverity(3)
    setLikelihood(3)
    setErrors({})
    onShowToast('Hazard registration form reset.')
  }

  return (
    <div className="view-module-container animate-entrance">
      {/* Hero Strip */}
      <div className="view-hero-panel">
        <div>
          <div className="view-hero-title">Hazard Registration &amp; Field Triage</div>
          <div className="view-hero-desc">
            Manual safety incident intake &amp; prototype risk scoring HUD with deterministic safety recommendations.
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="view-hero-btn"
            style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-medium)', color: '#ffffff' }}
            onClick={() => onNavigate('Dashboard')}
          >
            &larr; View Live Dashboard
          </button>
        </div>
      </div>

      {/* Success Banner (Requirements 6, 7 & 8) */}
      {lastSubmitted && (
        <div className="form-success-card">
          <div className="form-success-header">
            <div className="form-success-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              Hazard Successfully Registered &amp; Ingested into State (ID: {lastSubmitted.id})
            </div>
            <button
              type="button"
              className="form-success-close"
              onClick={() => setLastSubmitted(null)}
              aria-label="Dismiss success message"
            >
              &times;
            </button>
          </div>
          <div className="form-success-meta">
            <strong>{lastSubmitted.hazard}</strong> has been registered for <strong>{lastSubmitted.site}</strong> with prototype risk score <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: lastSubmitted.riskScore >= 75 ? 'var(--color-critical)' : 'var(--color-high)' }}>{lastSubmitted.riskScore}/100</span> (Priority: <strong style={{ color: lastSubmitted.riskScore >= 75 ? 'var(--color-critical)' : 'var(--color-high)' }}>{lastSubmitted.priority}</strong>).
          </div>
          <div style={{ background: 'rgba(0, 0, 0, 0.25)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '6px', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
            <div>
              <span style={{ color: 'var(--cyan-bright)', fontWeight: 600 }}>Category Protocol ({lastSubmitted.category}):</span>{' '}
              <span style={{ color: '#ffffff' }}>{lastSubmitted.categoryRecommendation}</span>
            </div>
            <div>
              <span style={{ color: lastSubmitted.riskScore >= 75 ? 'var(--color-critical)' : 'var(--color-high)', fontWeight: 600 }}>Priority Guidance ({lastSubmitted.priority}):</span>{' '}
              <span style={{ color: '#ffffff' }}>{lastSubmitted.priorityGuidance}</span>
            </div>
            {(lastSubmitted.priority === 'Critical' || lastSubmitted.priority === 'High') && (
              <div style={{ color: 'var(--color-critical)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <span className="badge-dot" style={{ background: 'var(--color-critical)' }} />
                Synchronized: High/Critical hazard dispatched as active alert to Alerts queue.
              </div>
            )}
          </div>
          <div className="form-success-actions">
            <button
              type="button"
              className="kpi-modal-btn primary"
              onClick={() => onNavigate('Dashboard')}
            >
              View in Dashboard Hazards Table &rarr;
            </button>
            <button
              type="button"
              className="kpi-modal-btn secondary"
              onClick={() => setLastSubmitted(null)}
            >
              Register Another Incident
            </button>
          </div>
        </div>
      )}

      {/* Form & Scoring Layout */}
      <div className="hazard-form-layout">
        {/* Form Card */}
        <form className="hazard-form-card" onSubmit={handleSubmit} noValidate>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#ffffff' }}>Incident Intake Details</h3>
              <p style={{ margin: '3px 0 0 0', fontSize: '11px', color: 'var(--text-dim)' }}>All fields marked with an asterisk (<span style={{ color: 'var(--color-critical)' }}>*</span>) are mandatory.</p>
            </div>
            <span className="cyber-badge low" style={{ fontSize: '10px' }}>INTAKE READY</span>
          </div>

          {/* Construction Site Dropdown */}
          <div className="form-group">
            <label className="form-label" htmlFor="hazard-site-select">
              <span>Construction Site <span className="required-dot">*</span></span>
              <span className="form-label-desc">Select active project perimeter</span>
            </label>
            <select
              id="hazard-site-select"
              className={`form-select ${errors.site ? 'is-invalid' : ''}`}
              value={site}
              onChange={(e) => {
                setSite(e.target.value)
                if (errors.site) setErrors(prev => ({ ...prev, site: undefined }))
              }}
            >
              {allSites.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name} ({s.zone})
                </option>
              ))}
            </select>
            {errors.site && <div className="form-error-msg">{errors.site}</div>}
          </div>

          {/* Hazard Category Dropdown */}
          <div className="form-group">
            <label className="form-label" htmlFor="hazard-category-select">
              <span>Hazard Category <span className="required-dot">*</span></span>
              <span className="form-label-desc">OSHA / Field Safety Classification</span>
            </label>
            <select
              id="hazard-category-select"
              className={`form-select ${errors.category ? 'is-invalid' : ''}`}
              value={category}
              onChange={(e) => {
                setCategory(e.target.value)
                if (errors.category) setErrors(prev => ({ ...prev, category: undefined }))
              }}
            >
              <option value="Fall Risk">Fall Risk (OSHA 1926.501)</option>
              <option value="PPE Violation">PPE Violation (OSHA 1926.95)</option>
              <option value="Equipment Hazard">Equipment Hazard (Crane / Heavy Machinery)</option>
              <option value="Electrical Hazard">Electrical Hazard (Lockout/Tagout)</option>
              <option value="Structural Hazard">Structural Hazard (Shoring / Formwork Strain)</option>
              <option value="Other">Other Unclassified Safety Hazard</option>
            </select>
            {errors.category && <div className="form-error-msg">{errors.category}</div>}
          </div>

          {/* Hazard Title */}
          <div className="form-group">
            <label className="form-label" htmlFor="hazard-title-input">
              <span>Hazard Title <span className="required-dot">*</span></span>
              <span className="form-label-desc">Clear, concise incident headline</span>
            </label>
            <input
              id="hazard-title-input"
              type="text"
              className={`form-input ${errors.title ? 'is-invalid' : ''}`}
              placeholder="e.g. Unanchored Perimeter Scaffolding at Pier 3"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                if (errors.title) setErrors(prev => ({ ...prev, title: undefined }))
              }}
            />
            {errors.title && <div className="form-error-msg">{errors.title}</div>}
          </div>

          {/* Detailed Description */}
          <div className="form-group">
            <label className="form-label" htmlFor="hazard-description-input">
              <span>Detailed Description <span className="required-dot">*</span></span>
              <span className="form-label-desc">Observation notes, zone location, and conditions</span>
            </label>
            <textarea
              id="hazard-description-input"
              className={`form-textarea ${errors.description ? 'is-invalid' : ''}`}
              placeholder="Provide exact coordinates, structural components, affected crew, and immediate corrective steps..."
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
                if (errors.description) setErrors(prev => ({ ...prev, description: undefined }))
              }}
              rows={3}
            />
            {errors.description && <div className="form-error-msg">{errors.description}</div>}
          </div>

          {/* Severity (1-5) */}
          <div className="form-group">
            <label className="form-label">
              <span>Severity Rating (1–5) <span className="required-dot">*</span></span>
              <span className="form-label-desc">Current: {severity} — {severityLabels[severity - 1]?.label}</span>
            </label>
            <div className="rating-pill-row">
              {severityLabels.map((item) => (
                <button
                  key={item.num}
                  type="button"
                  className={`rating-pill ${severity === item.num ? 'selected' : ''}`}
                  onClick={() => {
                    setSeverity(item.num)
                    if (errors.severity) setErrors(prev => ({ ...prev, severity: undefined }))
                  }}
                  title={item.desc}
                >
                  <span className="rating-num">{item.num}</span>
                  <span className="rating-label">{item.label}</span>
                </button>
              ))}
            </div>
            {errors.severity && <div className="form-error-msg">{errors.severity}</div>}
          </div>

          {/* Likelihood (1-5) */}
          <div className="form-group">
            <label className="form-label">
              <span>Likelihood Rating (1–5) <span className="required-dot">*</span></span>
              <span className="form-label-desc">Current: {likelihood} — {likelihoodLabels[likelihood - 1]?.label}</span>
            </label>
            <div className="rating-pill-row">
              {likelihoodLabels.map((item) => (
                <button
                  key={item.num}
                  type="button"
                  className={`rating-pill ${likelihood === item.num ? 'selected' : ''}`}
                  onClick={() => {
                    setLikelihood(item.num)
                    if (errors.likelihood) setErrors(prev => ({ ...prev, likelihood: undefined }))
                  }}
                  title={item.desc}
                >
                  <span className="rating-num">{item.num}</span>
                  <span className="rating-label">{item.label}</span>
                </button>
              ))}
            </div>
            {errors.likelihood && <div className="form-error-msg">{errors.likelihood}</div>}
          </div>

          {/* Reported By */}
          <div className="form-group">
            <label className="form-label" htmlFor="hazard-reportedby-input">
              <span>Reported By <span className="required-dot">*</span></span>
              <span className="form-label-desc">Safety officer or reporting inspector</span>
            </label>
            <input
              id="hazard-reportedby-input"
              type="text"
              className={`form-input ${errors.reportedBy ? 'is-invalid' : ''}`}
              placeholder="e.g. A. Morgan (Safety Superintendent)"
              value={reportedBy}
              onChange={(e) => {
                setReportedBy(e.target.value)
                if (errors.reportedBy) setErrors(prev => ({ ...prev, reportedBy: undefined }))
              }}
            />
            {errors.reportedBy && <div className="form-error-msg">{errors.reportedBy}</div>}
          </div>

          {/* Form Action Buttons */}
          <div className="form-actions-row">
            <button type="submit" className="btn-submit-hazard">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
              Register Hazard to Active Matrix
            </button>
            <button type="button" className="btn-reset-hazard" onClick={handleResetForm}>
              Reset Form
            </button>
          </div>
        </form>

        {/* Live Scoring Preview HUD (Requirement 4 & 5) */}
        <div className="scoring-hud-panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px', color: '#ffffff', textTransform: 'uppercase' }}>
              Prototype Risk HUD
            </span>
            <span className="cyber-badge info" style={{ fontSize: '10px' }}>SIMULATED</span>
          </div>

          {/* Score Box */}
          <div className="scoring-score-box">
            <span className="scoring-score-label">COMPUTED RISK SCORE</span>
            <span
              className="scoring-score-num"
              style={{ color: priorityInfo.color }}
            >
              {riskScore}
            </span>
            <span
              className={`scoring-priority-badge cyber-badge ${priorityInfo.badgeClass}`}
            >
              <span className="badge-dot" />
              PRIORITY: {priorityInfo.label.toUpperCase()}
            </span>
          </div>

          {/* Formula calculation preview */}
          <div className="scoring-formula-block">
            <span style={{ color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase' }}>Prototype Calculation Formula:</span>
            <span>Severity ({severity}) &times; Likelihood ({likelihood}) &times; 4 = <strong>{riskScore}</strong> / 100</span>
          </div>

          {/* Priority Scale Guide (Requirement 5) */}
          <div style={{ background: 'rgba(5, 8, 17, 0.5)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', fontSize: '10px', textTransform: 'uppercase' }}>
              Prototype Priority Thresholds:
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-low)' }} />
                <span style={{ color: 'var(--text-muted)' }}>1–24: <strong>Low</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-medium)' }} />
                <span style={{ color: 'var(--text-muted)' }}>25–49: <strong>Medium</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-high)' }} />
                <span style={{ color: 'var(--text-muted)' }}>50–74: <strong>High</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-critical)' }} />
                <span style={{ color: 'var(--text-muted)' }}>75–100: <strong>Critical</strong></span>
              </div>
            </div>
          </div>

          {/* Dynamic Recommendations Preview (Requirements 4 & 5) */}
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', fontSize: '10px', textTransform: 'uppercase' }}>
              Dynamic Recommendation Preview:
            </span>
            <div style={{ borderLeft: '3px solid var(--cyan-primary)', paddingLeft: '8px' }}>
              <div style={{ color: 'var(--cyan-bright)', fontWeight: 600, fontSize: '10.5px' }}>CATEGORY PROTOCOL ({category.toUpperCase()}):</div>
              <div style={{ color: '#ffffff', marginTop: '2px', lineHeight: 1.4 }}>{liveCategoryRec}</div>
            </div>
            <div style={{ borderLeft: `3px solid ${priorityInfo.color}`, paddingLeft: '8px' }}>
              <div style={{ color: priorityInfo.color, fontWeight: 600, fontSize: '10.5px' }}>PRIORITY GUIDANCE ({priorityInfo.label.toUpperCase()}):</div>
              <div style={{ color: '#ffffff', marginTop: '2px', lineHeight: 1.4 }}>{livePriorityGuide}</div>
            </div>
            {(priorityInfo.label === 'Critical' || priorityInfo.label === 'High') && (
              <div style={{ fontSize: '10.5px', color: 'var(--color-critical)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span className="badge-dot" style={{ background: 'var(--color-critical)' }} />
                Will auto-escalate to Incident Alerts queue upon registration.
              </div>
            )}
          </div>

          {/* Mandatory Prototype Disclaimer (Requirement 3) */}
          <div className="scoring-disclaimer">
            <strong>DEMONSTRATION RULE NOTICE:</strong> This score is generated using an experimental demonstration formula (Severity &times; Likelihood &times; 4) yielding a range of 4–100. It is a conceptual prototype rule for interface evaluation and is not a certified or validated industry safety standard.
          </div>

          {/* Live Intake Summary Preview */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11.5px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-dim)' }}>Target Site:</span>
              <strong style={{ color: '#ffffff' }}>{site}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-dim)' }}>Category:</span>
              <span style={{ color: 'var(--cyan-bright)' }}>{category}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-dim)' }}>Reporter:</span>
              <span style={{ color: '#ffffff' }}>{reportedBy || 'Unassigned'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Active Hazard Registry Table (Requirement 6 & 7) */}
      <div className="cyber-panel" style={{ marginTop: '24px' }}>
        <div className="panel-header-row">
          <div className="panel-title-group">
            <div className="panel-icon-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div>
              <span className="panel-heading">Active Hazard Registry (Live State)</span>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
                Showing all registered incidents in frontend state ({hazards.length} total entries). Click any incident row to inspect safety recommendations &amp; action guidance.
              </div>
            </div>
          </div>
          <span className="cyber-badge info" style={{ fontSize: '10px' }}>
            STATE COUNT: {hazards.length}
          </span>
        </div>

        <div className="table-scroll-container">
          <table className="command-table">
            <thead>
              <tr>
                <th>Hazard Title</th>
                <th>Selected Site</th>
                <th>Severity</th>
                <th>Risk Score</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {hazards.map((item) => {
                const priorityBadge = getPrototypePriority(item.riskScore || 50)
                const isExpanded = expandedRegistryId === item.id
                return (
                  <React.Fragment key={item.id}>
                    <tr
                      className={`table-row-selectable ${isExpanded ? 'is-expanded' : ''}`}
                      onClick={() => setExpandedRegistryId(isExpanded ? null : item.id)}
                      title="Click to view Safety Recommendations & Priority Guidance"
                    >
                      <td>
                        <div className="table-cell-hazard" style={{ fontWeight: 600 }}>{item.hazard}</div>
                        <div className="table-cell-sub">
                          ID: {item.id} {item.category ? `• Category: ${item.category}` : ''} {item.reportedBy ? `• Reported by: ${item.reportedBy}` : ''}
                        </div>
                      </td>
                      <td>
                        <div className="table-cell-site">{item.site}</div>
                      </td>
                      <td>
                        <span className={`cyber-badge ${(item.severity || 'medium').toLowerCase()}`}>
                          <span className="badge-dot" />
                          {item.severity} {item.numericSeverity ? `(${item.numericSeverity}/5)` : ''}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          fontSize: '13px',
                          color: priorityBadge.color
                        }}>
                          {item.riskScore}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>/100</span>
                      </td>
                      <td>
                        <span className={`cyber-badge ${priorityBadge.badgeClass}`}>
                          {item.priority || priorityBadge.label}
                        </span>
                      </td>
                      <td>
                        <span className={`table-status-pill ${item.status.toLowerCase().replace(/\s+/g, '-')}`}>
                          {item.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <button
                            type="button"
                            className={`hazard-expand-btn ${isExpanded ? 'expanded' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              setExpandedRegistryId(isExpanded ? null : item.id)
                            }}
                            title="Expand safety recommendations & action guidance"
                          >
                            {isExpanded ? '▲ Hide' : '▼ Recs'}
                          </button>
                          <button
                            type="button"
                            className="table-action-cyber-btn"
                            onClick={(e) => {
                              e.stopPropagation()
                              onToggleHazard(item.id)
                            }}
                          >
                            {item.status === 'Resolved' ? 'Reopen' : 'Resolve'}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <HazardRecommendationRow
                        item={item}
                        onToggleHazard={onToggleHazard}
                        onClose={() => setExpandedRegistryId(null)}
                        onNavigate={onNavigate}
                        colSpan={7}
                      />
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Sub-View: 4. Safety Monitoring Dedicated View
// ============================================================================
function SafetyMonitoringView({ selectedSite, onShowToast }) {
  const [isThermalMode, setIsThermalMode] = useState(false)
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true)
  const [selectedFeedFilter, setSelectedFeedFilter] = useState('All')

  const feeds = [
    {
      id: 'feed-1',
      title: 'CAM 01 // Tower Crane 02 Anemometer',
      zone: 'Crane Rig',
      metric: '42 km/h Wind Load',
      status: 'WARNING: EXCEEDS ENVELOPE',
      alert: true,
      subtext: 'Hoisting hook swing vector: 1.4m oscillation',
      bboxText: 'CRANE HOOK // EXCLUSION ZONE'
    },
    {
      id: 'feed-2',
      title: 'CAM 04 // Scaffolding Pier 3 Tilt Sensor',
      zone: 'Scaffolding',
      metric: '0.04° Angular Drift',
      status: 'NORMAL TOLERANCE',
      alert: false,
      subtext: 'Strain microstrain: 142 με (Threshold: 600 με)',
      bboxText: 'SCAFFOLD PIER 3 // STABLE'
    },
    {
      id: 'feed-3',
      title: 'CAM 07 // Level 14 Perimeter Drone Scan',
      zone: 'Perimeter',
      metric: '2 Harness Unclipped',
      status: 'SAFETY INFRACTION',
      alert: true,
      subtext: 'Worker ID #4092 & #4110 missing tie-off tether',
      bboxText: 'WORKER TAGGED // PPE VIOLATION'
    },
    {
      id: 'feed-4',
      title: 'CAM 11 // North Trench Shoring Wall',
      zone: 'Excavation',
      metric: '1.2mm Lateral Load',
      status: 'STABLE PRESSURE',
      alert: false,
      subtext: 'Hydraulic shoring strut pressure: 42.4 PSI',
      bboxText: 'TRENCH WALL // REINFORCED'
    }
  ]

  const displayedFeeds = selectedFeedFilter === 'All'
    ? feeds
    : feeds.filter(f => f.zone === selectedFeedFilter)

  return (
    <div className="view-module-container animate-entrance">
      <div className="view-hero-panel">
        <div>
          <div className="view-hero-title">Live Safety Telemetry &amp; Camera HUD</div>
          <div className="view-hero-desc">
            Synthetic drone video feeds, accelerometer meshes, and thermal geofencing telemetry for {selectedSite}.
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="table-action-cyber-btn"
            style={{ padding: '8px 14px' }}
            onClick={() => {
              setIsThermalMode(!isThermalMode)
              onShowToast(isThermalMode ? 'Thermal IR Mode Disabled' : 'Simulated Thermal IR Mode Enabled')
            }}
          >
            {isThermalMode ? 'Disable Thermal IR' : 'Simulate Thermal IR'}
          </button>
          <button
            type="button"
            className="table-action-cyber-btn"
            style={{ padding: '8px 14px' }}
            onClick={() => {
              setShowBoundingBoxes(!showBoundingBoxes)
              onShowToast(showBoundingBoxes ? 'Bounding box overlays hidden' : 'Bounding box overlays active')
            }}
          >
            {showBoundingBoxes ? 'Hide Overlays' : 'Show Overlays'}
          </button>
        </div>
      </div>

      {/* Feeds Metric Row */}
      <div className="view-stats-row">
        <div className="view-stat-card">
          <span className="view-stat-label">Active Camera HUDs</span>
          <span className="view-stat-value">4 FEEDS</span>
          <span className="view-stat-sub">Synthetic Optical Sensor Mesh</span>
        </div>
        <div className="view-stat-card">
          <span className="view-stat-label">Simulation Stream FPS</span>
          <span className="view-stat-value">30 FPS</span>
          <span className="view-stat-sub">1080p Telemetry HUD Overlay</span>
        </div>
        <div className="view-stat-card">
          <span className="view-stat-label">Perimeter Geofences</span>
          <span className="view-stat-value">12 ZONES</span>
          <span className="view-stat-sub">1 Exclusion Alert Active</span>
        </div>
        <div className="view-stat-card">
          <span className="view-stat-label">Environmental Limits</span>
          <span className="view-stat-value" style={{ color: 'var(--color-high)' }}>1 FLAGGED</span>
          <span className="view-stat-sub">Tower Crane Wind Limit</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="table-filter-header">
        <div className="cyber-pill-group">
          {['All', 'Crane Rig', 'Scaffolding', 'Perimeter', 'Excavation'].map((zone) => (
            <button
              key={zone}
              type="button"
              className={`cyber-pill-btn ${selectedFeedFilter === zone ? 'active' : ''}`}
              onClick={() => setSelectedFeedFilter(zone)}
            >
              {zone === 'All' ? 'All Visual Zones' : zone}
            </button>
          ))}
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
          SIMULATED SENSOR HUD // NO LIVE CAMERAS CONNECTED
        </span>
      </div>

      {/* Camera Grid */}
      <div className="camera-hud-grid">
        {displayedFeeds.map((feed) => (
          <div key={feed.id} className="cyber-panel">
            <div className="panel-header-row">
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff' }}>
                {feed.title}
              </span>
              <span style={{
                fontSize: '11px',
                fontWeight: 600,
                color: feed.alert ? 'var(--color-critical)' : 'var(--color-low)'
              }}>
                {feed.status}
              </span>
            </div>

            {/* Radar / HUD visualizer */}
            <div className={`hud-telemetry-box ${isThermalMode ? 'thermal' : ''}`}>
              <div className="hud-grid-pattern" />
              <div className="hud-radar-sweep" />

              {showBoundingBoxes && (
                <div className="hud-bbox-layer">
                  <div className="hud-bbox" style={{ top: '22%', left: '32%', width: '36%', height: '56%' }}>
                    <span className="hud-bbox-label">{feed.bboxText}</span>
                  </div>
                </div>
              )}

              <div style={{
                position: 'absolute',
                bottom: '10px',
                left: '12px',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                color: isThermalMode ? '#f43f5e' : 'var(--cyan-primary)'
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
                {isThermalMode ? 'IR THERMAL SIM' : 'SYNTHETIC HUD'} // 30 FPS
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{feed.subtext}</span>
              <button
                type="button"
                className="table-action-cyber-btn"
                onClick={() => onShowToast(`Captured telemetry snapshot for ${feed.title}`)}
              >
                Snapshot HUD
              </button>
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
function ComplianceView({ selectedSite, onShowToast }) {
  const [selectedStandard, setSelectedStandard] = useState('All')
  const [isAuditing, setIsAuditing] = useState(false)
  const [expandedChecklist, setExpandedChecklist] = useState('OSHA 1926.501')

  const complianceItems = [
    {
      code: 'OSHA 1926.501',
      rule: 'OSHA 1926.501 - Fall Protection & Leading Edges',
      category: 'Fall Protection',
      score: '92%',
      status: 'Compliant',
      issues: '1 Flagged harness in Sector 4B',
      lastAudit: 'Today, 04:18 AM',
      checklist: [
        'Perimeter guardrail load strength tested (>200 lbs lateral force)',
        'Worker fall arrest harnesses checked for annual tag expiration',
        'Floor opening covers secured and labeled with high-visibility warning'
      ]
    },
    {
      code: 'OSHA 1926.651',
      rule: 'OSHA 1926.651 - Excavation & Trench Shoring Systems',
      category: 'Excavation',
      score: '88%',
      status: 'In Review',
      issues: 'Renewal inspection due within 48h',
      lastAudit: 'Yesterday, 14:30 PM',
      checklist: [
        'Geotechnical daily soil classification verified (Type B clay loam)',
        'Trench shoring hydraulic strut gauge verified (>40 PSI)',
        'Egress ladders positioned within 25ft perimeter'
      ]
    },
    {
      code: 'OSHA 1926.1053',
      rule: 'OSHA 1926.1053 - Portable & Fixed Ladder Safety',
      category: 'Ladders',
      score: '98%',
      status: 'Compliant',
      issues: '0 Violations detected',
      lastAudit: 'Oct 14, 2026',
      checklist: [
        'Ladder side rails extend 3 feet above landing surface',
        'Non-conductive structural composite used around electrical transformers',
        'Slip-resistant rungs and base cleats inspected'
      ]
    },
    {
      code: 'ISO 45001',
      rule: 'ISO 45001 - Occupational Health & Hazard Controls',
      category: 'Health Management',
      score: '96%',
      status: 'Audited',
      issues: 'Certified Site Protocol',
      lastAudit: 'Oct 11, 2026',
      checklist: [
        'Daily toolbox safety talks logged with digital worker signatures',
        'Subcontractor safety induction certification verified',
        'Emergency evacuation muster route clear of construction materials'
      ]
    }
  ]

  const filteredItems = selectedStandard === 'All'
    ? complianceItems
    : complianceItems.filter(item => item.category === selectedStandard)

  const handleRunAudit = () => {
    setIsAuditing(true)
    setTimeout(() => {
      setIsAuditing(false)
      onShowToast(`Autonomous compliance self-audit completed for ${selectedSite}. All 18 standards verified.`)
    }, 800)
  }

  return (
    <div className="view-module-container animate-entrance">
      <div className="view-hero-panel">
        <div>
          <div className="view-hero-title">OSHA 1926 &amp; ISO 45001 Compliance Matrix</div>
          <div className="view-hero-desc">
            Automated regulatory compliance audit tracker and projected violation penalty mitigation for {selectedSite}.
          </div>
        </div>
        <button
          type="button"
          className="view-hero-btn"
          onClick={handleRunAudit}
          disabled={isAuditing}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {isAuditing ? 'Auditing Standards...' : 'Run Self-Audit'}
        </button>
      </div>

      {/* Compliance Metric Cards */}
      <div className="view-stats-row">
        <div className="view-stat-card">
          <span className="view-stat-label">Overall Compliance Score</span>
          <span className="view-stat-value">94.8%</span>
          <span className="view-stat-sub">&uarr; +1.4% OSHA Benchmark</span>
        </div>
        <div className="view-stat-card">
          <span className="view-stat-label">Active Standards Tracked</span>
          <span className="view-stat-value">18 CODES</span>
          <span className="view-stat-sub">OSHA 1926 + ISO 45001</span>
        </div>
        <div className="view-stat-card">
          <span className="view-stat-label">Verified Safety Permits</span>
          <span className="view-stat-value">6 PERMITS</span>
          <span className="view-stat-sub">100% Authorized &amp; Active</span>
        </div>
        <div className="view-stat-card">
          <span className="view-stat-label">Penalty Exposure Mitigated</span>
          <span className="view-stat-value">$240,000</span>
          <span className="view-stat-sub">Estimated Actuarial Defense</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="table-filter-header">
        <div className="cyber-pill-group">
          {['All', 'Fall Protection', 'Excavation', 'Ladders', 'Health Management'].map((cat) => (
            <button
              key={cat}
              type="button"
              className={`cyber-pill-btn ${selectedStandard === cat ? 'active' : ''}`}
              onClick={() => setSelectedStandard(cat)}
            >
              {cat === 'All' ? 'All Regulations (4)' : cat}
            </button>
          ))}
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
          DEMO REGULATORY AUDIT MATRIX
        </span>
      </div>

      {/* Compliance Matrix Table */}
      <div className="cyber-panel">
        <table className="command-table">
          <thead>
            <tr>
              <th>Standard / Regulation</th>
              <th>Compliance Score</th>
              <th>Audit Status</th>
              <th>Active Telemetry Notes</th>
              <th>Audit Checklist</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => (
              <tr key={item.code}>
                <td>
                  <div style={{ fontWeight: 600, color: '#ffffff' }}>{item.rule}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>Last audited: {item.lastAudit}</div>
                </td>
                <td>
                  <div style={{ fontFamily: 'var(--font-sans)', color: 'var(--cyan-primary)', fontWeight: 700, fontSize: '14px' }}>{item.score}</div>
                  <div className="risk-meter-track" style={{ width: '80px', marginTop: '4px' }}>
                    <div className="risk-meter-fill" style={{ width: item.score, background: 'var(--cyan-primary)' }} />
                  </div>
                </td>
                <td>
                  <span className={`cyber-badge ${item.status === 'Compliant' || item.status === 'Audited' ? 'low' : 'medium'}`}>
                    {item.status}
                  </span>
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{item.issues}</td>
                <td>
                  <button
                    type="button"
                    className="table-action-cyber-btn"
                    onClick={() => {
                      setExpandedChecklist(expandedChecklist === item.code ? null : item.code)
                    }}
                  >
                    {expandedChecklist === item.code ? 'Hide Audit Items' : 'Inspect Checklist'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Expandable Checklist Details */}
        {expandedChecklist && (
          <div style={{
            marginTop: '16px',
            padding: '16px',
            background: 'rgba(5, 8, 17, 0.75)',
            border: '1px solid var(--border-medium)',
            borderRadius: '8px'
          }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--cyan-primary)', marginBottom: '8px' }}>
              Audit Verification Protocol: {expandedChecklist}
            </div>
            {complianceItems.find(c => c.code === expandedChecklist)?.checklist.map((pt, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-primary)', padding: '4px 0' }}>
                <span style={{ color: 'var(--color-low)', fontWeight: 800 }}>&check;</span>
                <span>{pt}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Sub-View: 5. Insurance Risk Dedicated View
// ============================================================================
function InsuranceRiskView({ selectedSite, onShowToast }) {
  const [simulatedScore, setSimulatedScore] = useState(92)

  // Calculations based on simulatedScore slider
  const projectedLossRatio = (24 - (simulatedScore - 70) * 0.38).toFixed(1)
  const annualSavings = Math.round(80000 + (simulatedScore - 70) * 2060)
  const riskGrade = simulatedScore >= 90 ? 'AAA' : simulatedScore >= 80 ? 'AA' : 'A'

  return (
    <div className="view-module-container animate-entrance">
      <div className="view-hero-panel">
        <div>
          <div className="view-hero-title">Actuarial Underwriting &amp; Loss Prevention</div>
          <div className="view-hero-desc">
            Real-time loss ratio forecasting and premium discount qualification derived from agentic safety compliance scores at {selectedSite}.
          </div>
        </div>
        <button
          type="button"
          className="view-hero-btn"
          onClick={() => onShowToast(`Actuarial Loss Prevention Dossier exported for ${selectedSite}`)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export Actuarial Dossier
        </button>
      </div>

      {/* Actuarial Metric Cards */}
      <div className="view-stats-row">
        <div className="view-stat-card">
          <span className="view-stat-label">Underwriting Risk Grade</span>
          <span className="view-stat-value" style={{ color: 'var(--color-low)' }}>{riskGrade}</span>
          <span className="view-stat-sub">Top 5% Lowest Construction Casualty Risk</span>
        </div>
        <div className="view-stat-card">
          <span className="view-stat-label">Projected Loss Ratio</span>
          <span className="view-stat-value">{projectedLossRatio}%</span>
          <span className="view-stat-sub">&darr; 8.2% Below Industry Benchmark (20.6%)</span>
        </div>
        <div className="view-stat-card">
          <span className="view-stat-label">Annual Premium Credit</span>
          <span className="view-stat-value">${annualSavings.toLocaleString()}</span>
          <span className="view-stat-sub">Earned Autonomous Safety Discount</span>
        </div>
        <div className="view-stat-card">
          <span className="view-stat-label">Actuarial Confidence</span>
          <span className="view-stat-value">96.2%</span>
          <span className="view-stat-sub">ISO Casualty Formula Validated</span>
        </div>
      </div>

      <div className="command-grid-2col">
        {/* Actuarial Risk Factor Vector Breakdown */}
        <div className="cyber-panel">
          <div className="panel-header-row">
            <div className="panel-title-group">
              <div className="panel-icon-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <span className="panel-heading">Actuarial Risk Vector Breakdown</span>
            </div>
            <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
              SIMULATED WEIGHTS
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="risk-meter-item">
              <div className="risk-meter-header">
                <span className="risk-meter-name">Scaffolding &amp; Fall Protection Risk</span>
                <span className="risk-meter-val" style={{ color: 'var(--color-low)' }}>8% (Optimal)</span>
              </div>
              <div className="risk-meter-track">
                <div className="risk-meter-fill" style={{ width: '8%', background: 'var(--color-low)' }} />
              </div>
            </div>

            <div className="risk-meter-item">
              <div className="risk-meter-header">
                <span className="risk-meter-name">Heavy Hoisting &amp; Crane Swing Envelope</span>
                <span className="risk-meter-val" style={{ color: 'var(--color-high)' }}>18% (Elevated)</span>
              </div>
              <div className="risk-meter-track">
                <div className="risk-meter-fill" style={{ width: '18%', background: 'var(--color-high)' }} />
              </div>
            </div>

            <div className="risk-meter-item">
              <div className="risk-meter-header">
                <span className="risk-meter-name">Excavation Shoring &amp; Trench Subsidence</span>
                <span className="risk-meter-val" style={{ color: 'var(--color-low)' }}>9% (Optimal)</span>
              </div>
              <div className="risk-meter-track">
                <div className="risk-meter-fill" style={{ width: '9%', background: 'var(--color-low)' }} />
              </div>
            </div>

            <div className="risk-meter-item">
              <div className="risk-meter-header">
                <span className="risk-meter-name">Subcontractor Certification &amp; PPE Protocol</span>
                <span className="risk-meter-val" style={{ color: 'var(--color-medium)' }}>12% (Moderate)</span>
              </div>
              <div className="risk-meter-track">
                <div className="risk-meter-fill" style={{ width: '12%', background: 'var(--color-medium)' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Carrier Credit Simulator */}
        <div className="cyber-panel">
          <div className="panel-header-row">
            <div className="panel-title-group">
              <div className="panel-icon-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
              </div>
              <span className="panel-heading">Carrier Premium Discount Simulator</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff' }}>
              Hypothetical Site Compliance Score: <span style={{ color: 'var(--cyan-primary)', fontWeight: 700 }}>{simulatedScore}%</span>
            </label>
            <input
              type="range"
              min="70"
              max="99"
              value={simulatedScore}
              onChange={(e) => setSimulatedScore(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--cyan-primary)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-dim)' }}>
              <span>Baseline (70%)</span>
              <span>Autonomous Sentinel (85%)</span>
              <span>Ultra-Safe Tier (99%)</span>
            </div>

            <div style={{
              background: 'rgba(5, 8, 17, 0.7)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              fontSize: '12px',
              marginTop: '4px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Projected Casualty Rate:</span>
                <span style={{ color: '#ffffff', fontWeight: 600 }}>{projectedLossRatio}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Projected Policy Savings:</span>
                <span style={{ color: 'var(--color-low)', fontWeight: 700 }}>${annualSavings.toLocaleString()} / year</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Carrier Tier Qualification:</span>
                <span style={{ color: 'var(--cyan-primary)' }}>{riskGrade} PREFERRED</span>
              </div>
            </div>

            <span style={{ fontSize: '10px', color: 'var(--text-dim)', lineHeight: '1.4' }}>
              * Actuarial calculations are simulated estimates for demonstration. Not an underwriting insurance contract.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Sub-View: 6. Reports Dedicated View
// ============================================================================
function ReportsView({ selectedSite, onShowToast }) {
  const [reportFilter, setReportFilter] = useState('All')
  const [isGenerating, setIsGenerating] = useState(false)
  const [reports, setReports] = useState([
    {
      id: 'rep-1',
      title: 'Weekly Autonomous Risk Dossier - Week 42',
      category: 'Weekly Brief',
      date: 'Oct 14, 2026',
      size: '2.4 MB PDF',
      author: 'Sentinel Agent v2.4',
      status: 'Ready'
    },
    {
      id: 'rep-2',
      title: 'Crane Wind Load & Structural Stress Analysis',
      category: 'Structural Audit',
      date: 'Oct 12, 2026',
      size: '1.8 MB PDF',
      author: 'Structural Sentinel Agent',
      status: 'Ready'
    },
    {
      id: 'rep-3',
      title: 'OSHA 1926 Bi-Weekly Field Compliance Audit',
      category: 'Compliance Log',
      date: 'Oct 10, 2026',
      size: '3.1 MB PDF',
      author: 'Compliance Auditor AI',
      status: 'Ready'
    },
    {
      id: 'rep-4',
      title: 'Subcontractor Geofence Infraction Investigation',
      category: 'Incident Investigation',
      date: 'Oct 08, 2026',
      size: '1.2 MB PDF',
      author: 'Vision AI Inspector',
      status: 'Ready'
    }
  ])

  const filteredReports = reportFilter === 'All'
    ? reports
    : reports.filter(r => r.category === reportFilter)

  const handleGenerateReport = () => {
    setIsGenerating(true)
    setTimeout(() => {
      const newRep = {
        id: `rep-${Date.now()}`,
        title: `On-Demand Risk Dossier - ${selectedSite}`,
        category: 'Weekly Brief',
        date: 'Just now',
        size: '2.6 MB PDF',
        author: 'Sentinel Deliberation Engine',
        status: 'Ready'
      }
      setReports(prev => [newRep, ...prev])
      setIsGenerating(false)
      onShowToast(`Generated new risk dossier for ${selectedSite}`)
    }, 700)
  }

  return (
    <div className="view-module-container animate-entrance">
      <div className="view-hero-panel">
        <div>
          <div className="view-hero-title">Executive AI Risk Reports &amp; Dossiers</div>
          <div className="view-hero-desc">
            Automated PDF briefings compiled by the SiteGuard AI deliberation engine for {selectedSite}.
          </div>
        </div>
        <button
          type="button"
          className="view-hero-btn"
          onClick={handleGenerateReport}
          disabled={isGenerating}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
          {isGenerating ? 'Compiling Dossier...' : 'Generate On-Demand Dossier'}
        </button>
      </div>

      {/* Reports Metrics */}
      <div className="view-stats-row">
        <div className="view-stat-card">
          <span className="view-stat-label">Total Dossiers Generated</span>
          <span className="view-stat-value">{reports.length + 20} BRIEFS</span>
          <span className="view-stat-sub">100% Cryptographically Signed</span>
        </div>
        <div className="view-stat-card">
          <span className="view-stat-label">Carrier Audit Status</span>
          <span className="view-stat-value">APPROVED</span>
          <span className="view-stat-sub">ISO 45001 &amp; OSHA Format</span>
        </div>
        <div className="view-stat-card">
          <span className="view-stat-label">Pending Field Sign-Off</span>
          <span className="view-stat-value">2 DOSSIERS</span>
          <span className="view-stat-sub">Site Superintendent Queue</span>
        </div>
        <div className="view-stat-card">
          <span className="view-stat-label">Export Archival Formats</span>
          <span className="view-stat-value">PDF // JSON</span>
          <span className="view-stat-sub">Encrypted Actuarial Telemetry</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="table-filter-header">
        <div className="cyber-pill-group">
          {['All', 'Weekly Brief', 'Structural Audit', 'Compliance Log', 'Incident Investigation'].map((cat) => (
            <button
              key={cat}
              type="button"
              className={`cyber-pill-btn ${reportFilter === cat ? 'active' : ''}`}
              onClick={() => setReportFilter(cat)}
            >
              {cat === 'All' ? 'All Dossiers' : cat}
            </button>
          ))}
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
          SIMULATED PDF EXPORT SYSTEM
        </span>
      </div>

      {/* Reports Table */}
      <div className="cyber-panel">
        <table className="command-table">
          <thead>
            <tr>
              <th>Report Title</th>
              <th>Category</th>
              <th>Compiled By</th>
              <th>Generated Date</th>
              <th>File Size</th>
              <th>Download</th>
            </tr>
          </thead>
          <tbody>
            {filteredReports.map((rep) => (
              <tr key={rep.id}>
                <td>
                  <div style={{ fontWeight: 600, color: '#ffffff' }}>{rep.title}</div>
                </td>
                <td>
                  <span className="cyber-badge info">{rep.category}</span>
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                  {rep.author}
                </td>
                <td style={{ color: 'var(--text-dim)', fontSize: '12px' }}>{rep.date}</td>
                <td style={{ color: 'var(--cyan-primary)', fontWeight: 600, fontSize: '12px' }}>{rep.size}</td>
                <td>
                  <button
                    type="button"
                    className="table-action-cyber-btn"
                    onClick={() => onShowToast(`Simulated download initiated: ${rep.title}.pdf`)}
                  >
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
function AlertsCenterView({ alerts, onDismissAlert, onAcknowledgeAlert, onClearAll, onShowToast }) {
  const [alertFilter, setAlertFilter] = useState('All')

  const filteredAlerts = alertFilter === 'All'
    ? alerts
    : alerts.filter(a => a.type.toLowerCase() === alertFilter.toLowerCase())

  return (
    <div className="view-module-container animate-entrance">
      <div className="view-hero-panel">
        <div>
          <div className="view-hero-title">Incident Triage &amp; Escalation Center</div>
          <div className="view-hero-desc">
            Real-time feed of flagged sensor breaches, drone observations, and supervisor notifications.
          </div>
        </div>
        <button
          type="button"
          className="view-hero-btn"
          onClick={onClearAll}
          disabled={alerts.length === 0}
        >
          Acknowledge &amp; Clear All Alerts
        </button>
      </div>

      {/* Alert Stats */}
      <div className="view-stats-row">
        <div className="view-stat-card">
          <span className="view-stat-label">Active Triage Alerts</span>
          <span className="view-stat-value" style={{ color: alerts.length > 0 ? 'var(--color-critical)' : 'var(--color-low)' }}>
            {alerts.length} ALERTS
          </span>
          <span className="view-stat-sub">Real-Time Sensor Queue</span>
        </div>
        <div className="view-stat-card">
          <span className="view-stat-label">Critical Escalations</span>
          <span className="view-stat-value" style={{ color: 'var(--color-critical)' }}>
            {alerts.filter(a => a.type === 'critical').length} ACTIVE
          </span>
          <span className="view-stat-sub">Automated Dispatch Triggered</span>
        </div>
        <div className="view-stat-card">
          <span className="view-stat-label">High Priority Flags</span>
          <span className="view-stat-value" style={{ color: 'var(--color-high)' }}>
            {alerts.filter(a => a.type === 'high').length} ACTIVE
          </span>
          <span className="view-stat-sub">Field Supervisor Review</span>
        </div>
        <div className="view-stat-card">
          <span className="view-stat-label">Auto-Resolved Today</span>
          <span className="view-stat-value" style={{ color: 'var(--color-low)' }}>18 INCIDENTS</span>
          <span className="view-stat-sub">Sensor Anomaly Cleared</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="table-filter-header">
        <div className="cyber-pill-group">
          {['All', 'Critical', 'High', 'Medium', 'Info'].map((sev) => (
            <button
              key={sev}
              type="button"
              className={`cyber-pill-btn ${alertFilter === sev ? 'active' : ''}`}
              onClick={() => setAlertFilter(sev)}
            >
              {sev === 'All' ? `All Alerts (${alerts.length})` : sev}
            </button>
          ))}
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
          AUTOMATED TRIAGE QUEUE // DEMO FEED
        </span>
      </div>

      {/* Alerts Timeline List */}
      <div className="cyber-panel">
        <div className="alert-timeline-list">
          {filteredAlerts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-dim)' }}>
              No incidents currently flagged in this triage tier. Telemetry optimal.
            </div>
          ) : (
            filteredAlerts.map((alt) => (
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
                    <div className="timeline-meta-left">
                      <span className="timeline-site">{alt.site}</span>
                      <span className={`alert-status-badge ${alt.status?.toLowerCase() || 'active'}`}>
                        {alt.status || 'Active'}
                      </span>
                      {alt.hazardId && (
                        <span className="alert-hazard-sync-pill">
                          <span className="badge-dot" />
                          SYNCED HAZARD: {alt.hazardId}
                        </span>
                      )}
                      {alt.riskScore && (
                        <span style={{ fontSize: '11px', color: 'var(--cyan-primary)', fontFamily: 'var(--font-mono)' }}>
                          SCORE: {alt.riskScore}/100
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className={`table-action-cyber-btn ${alt.status === 'Acknowledged' ? 'is-ack' : ''}`}
                        onClick={() => {
                          onAcknowledgeAlert(alt.id)
                        }}
                        title="Acknowledge this alert"
                      >
                        {alt.status === 'Acknowledged' ? '✓ Acknowledged' : 'Acknowledge'}
                      </button>
                      <button
                        type="button"
                        className="table-action-cyber-btn"
                        onClick={() => {
                          onShowToast(`Simulated SMS escalation dispatched for ${alt.title}`)
                        }}
                      >
                        Escalate Super
                      </button>
                      <button
                        type="button"
                        className="table-action-cyber-btn"
                        onClick={() => {
                          onDismissAlert(alt.id)
                          onShowToast(`Alert ${alt.id} resolved and archived.`)
                        }}
                      >
                        Resolve Alert
                      </button>
                    </div>
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
function SettingsView({ onShowToast, onResetDemoData }) {
  const [reasoningFreq, setReasoningFreq] = useState(15)
  const [consensusThreshold, setConsensusThreshold] = useState(85)
  const [deepReasoning, setDeepReasoning] = useState(true)
  const [windThreshold, setWindThreshold] = useState(40)
  const [driftThreshold, setDriftThreshold] = useState(0.04)
  const [smsDispatch, setSmsDispatch] = useState(true)
  const [sirenSimulation, setSirenSimulation] = useState(false)
  const [dailyDigest, setDailyDigest] = useState(true)
  const [simSpeed, setSimSpeed] = useState('1x')

  const handleSave = () => {
    onShowToast('Configuration parameters synced to Sentinel edge agents (Simulated)')
  }

  return (
    <div className="view-module-container animate-entrance">
      <div className="view-hero-panel">
        <div>
          <div className="view-hero-title">Platform &amp; Agent Configuration</div>
          <div className="view-hero-desc">
            Adjust autonomous risk scoring weights, sensor polling intervals, and notification dispatch thresholds.
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="table-action-cyber-btn"
            style={{ padding: '8px 14px' }}
            onClick={onResetDemoData}
          >
            Reset Demo Data
          </button>
          <button
            type="button"
            className="view-hero-btn"
            onClick={handleSave}
          >
            Save Configuration
          </button>
        </div>
      </div>

      <div className="settings-grid">
        {/* Panel 1: Autonomous Reasoning Engine */}
        <div className="cyber-panel">
          <div className="panel-header-row">
            <div className="panel-title-group">
              <div className="panel-icon-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <span className="panel-heading">Autonomous Sentinel Reasoning</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff', display: 'block', marginBottom: '6px' }}>
                Deliberation Polling Frequency: <span style={{ color: 'var(--cyan-primary)', fontWeight: 700 }}>{reasoningFreq}s</span>
              </label>
              <input
                type="range"
                min="1"
                max="60"
                value={reasoningFreq}
                onChange={(e) => setReasoningFreq(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--cyan-primary)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-dim)' }}>
                <span>Continuous (1s)</span>
                <span>Balanced (15s Default)</span>
                <span>Periodic (60s)</span>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff', display: 'block', marginBottom: '6px' }}>
                Multi-Agent Consensus Threshold: <span style={{ color: 'var(--cyan-primary)', fontWeight: 700 }}>{consensusThreshold}%</span>
              </label>
              <input
                type="range"
                min="70"
                max="99"
                value={consensusThreshold}
                onChange={(e) => setConsensusThreshold(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--cyan-primary)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-dim)' }}>
                <span>Majority (70%)</span>
                <span>High Confidence (85%)</span>
                <span>Unanimous (99%)</span>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
              <label className="cyber-toggle-label">
                <div>
                  <div className="cyber-toggle-title">Chain-of-Thought Deliberation Trace</div>
                  <div className="cyber-toggle-desc">Logs detailed reasoning steps in the multi-agent console.</div>
                </div>
                <input
                  type="checkbox"
                  className="cyber-toggle-input"
                  checked={deepReasoning}
                  onChange={(e) => setDeepReasoning(e.target.checked)}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Panel 2: Hazard Threshold Limits */}
        <div className="cyber-panel">
          <div className="panel-header-row">
            <div className="panel-title-group">
              <div className="panel-icon-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <span className="panel-heading">Construction Safety Limits</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff', display: 'block', marginBottom: '6px' }}>
                Crane Wind Velocity Cutoff: <span style={{ color: 'var(--cyan-primary)', fontWeight: 700 }}>{windThreshold} km/h</span>
              </label>
              <input
                type="range"
                min="20"
                max="60"
                value={windThreshold}
                onChange={(e) => setWindThreshold(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--cyan-primary)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-dim)' }}>
                <span>Strict (25 km/h)</span>
                <span>OSHA Standard (40 km/h)</span>
                <span>Heavy Duty (55 km/h)</span>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff', display: 'block', marginBottom: '6px' }}>
                Scaffolding Drift Tolerance: <span style={{ color: 'var(--cyan-primary)', fontWeight: 700 }}>{driftThreshold}°</span>
              </label>
              <input
                type="range"
                min="0.01"
                max="0.10"
                step="0.01"
                value={driftThreshold}
                onChange={(e) => setDriftThreshold(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--cyan-primary)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-dim)' }}>
                <span>Ultra-Tolerant (0.01°)</span>
                <span>Nominal (0.04°)</span>
                <span>Relaxed (0.10°)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Panel 3: Notifications & Dispatch */}
        <div className="cyber-panel">
          <div className="panel-header-row">
            <div className="panel-title-group">
              <div className="panel-icon-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </div>
              <span className="panel-heading">Field Alert Escalation Channels</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label className="cyber-toggle-label">
              <div>
                <div className="cyber-toggle-title">Automated Superintendent SMS</div>
                <div className="cyber-toggle-desc">Instant text dispatch when Critical risks are flagged.</div>
              </div>
              <input
                type="checkbox"
                className="cyber-toggle-input"
                checked={smsDispatch}
                onChange={(e) => setSmsDispatch(e.target.checked)}
              />
            </label>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
              <label className="cyber-toggle-label">
                <div>
                  <div className="cyber-toggle-title">Simulate Site Alarm / Siren Trigger</div>
                  <div className="cyber-toggle-desc">Audible exclusion zone buzzer simulation.</div>
                </div>
                <input
                  type="checkbox"
                  className="cyber-toggle-input"
                  checked={sirenSimulation}
                  onChange={(e) => setSirenSimulation(e.target.checked)}
                />
              </label>
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
              <label className="cyber-toggle-label">
                <div>
                  <div className="cyber-toggle-title">Daily Actuarial Digest Email</div>
                  <div className="cyber-toggle-desc">Morning PDF briefing dispatched to risk officer.</div>
                </div>
                <input
                  type="checkbox"
                  className="cyber-toggle-input"
                  checked={dailyDigest}
                  onChange={(e) => setDailyDigest(e.target.checked)}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Panel 4: Simulation Environment */}
        <div className="cyber-panel">
          <div className="panel-header-row">
            <div className="panel-title-group">
              <div className="panel-icon-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </div>
              <span className="panel-heading">Simulation Telemetry Mode</span>
            </div>
            <span className="cyber-badge info">SIMULATION ACTIVE</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff', display: 'block', marginBottom: '8px' }}>
                Synthetic Sensor Stream Velocity
              </label>
              <div className="cyber-pill-group">
                {['1x (Real-Time)', '5x (Accelerated)', 'Paused'].map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    className={`cyber-pill-btn ${simSpeed === spd ? 'active' : ''}`}
                    onClick={() => {
                      setSimSpeed(spd)
                      onShowToast(`Simulation velocity set to ${spd}`)
                    }}
                  >
                    {spd}
                  </button>
                ))}
              </div>
            </div>

            <div style={{
              background: 'rgba(5, 8, 17, 0.7)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '12px',
              fontSize: '11px',
              color: 'var(--text-dim)',
              lineHeight: '1.5'
            }}>
              Notice: The SiteGuard platform is operating in demonstration evaluation mode. All sensory data and agent deliberations are synthetic.
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
    case 'hazard':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
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

// ============================================================================
// Interactive Component: KPI Detail Modal (Requirement 6)
// ============================================================================
function KpiDetailModal({
  activeModal,
  onClose,
  selectedSite,
  allSites,
  onSelectSite,
  onNavigate,
  hazards,
  alerts,
  onToggleHazard,
  onFilterSeverity,
  onScrollToHazards
}) {
  if (!activeModal) return null

  const selectedSiteData = allSites?.find(s => s.name === selectedSite)
  const siteHazards = selectedSite === 'All Sites' ? hazards : hazards.filter(h => h.site === selectedSite)
  const openHazards = siteHazards.filter(h => h.status !== 'Resolved')
  const criticalHazards = siteHazards.filter(h => h.severity === 'Critical')
  const criticalAlerts = alerts.filter(a => (selectedSite === 'All Sites' || a.site === selectedSite) && a.type === 'critical')

  return (
    <div className="kpi-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="kpi-modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Modal Content: Active Sites */}
        {activeModal === 'sites' && (
          <>
            <div className="kpi-modal-header">
              <div className="kpi-modal-title-row">
                <div className="kpi-modal-title">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--cyan-primary)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
                    <line x1="8" y1="6" x2="16" y2="6" />
                    <line x1="8" y1="10" x2="16" y2="10" />
                  </svg>
                  Monitored Construction Sites Portfolio
                </div>
                <div className="kpi-modal-sub">
                  Simulated multi-zone telemetry &bull; 6 Active Sites &bull; {selectedSite !== 'All Sites' ? `Active Scope: ${selectedSite}` : 'Showing all sites'}
                </div>
              </div>
              <button type="button" className="kpi-modal-close-btn" onClick={onClose} aria-label="Close dialog">&times;</button>
            </div>

            <div className="kpi-modal-body">
              <div className="kpi-modal-summary-strip">
                <div className="kpi-mini-stat">
                  <span className="kpi-mini-label">TOTAL MONITORED</span>
                  <span className="kpi-mini-value" style={{ color: 'var(--cyan-primary)' }}>6 SITES</span>
                </div>
                <div className="kpi-mini-stat">
                  <span className="kpi-mini-label">WORKERS ON DUTY</span>
                  <span className="kpi-mini-value">664 TOTAL</span>
                </div>
                <div className="kpi-mini-stat">
                  <span className="kpi-mini-label">ACTIVE CRANES</span>
                  <span className="kpi-mini-value">19 CRANES</span>
                </div>
                <div className="kpi-mini-stat">
                  <span className="kpi-mini-label">AVG RISK INDEX</span>
                  <span className="kpi-mini-value" style={{ color: 'var(--color-high)' }}>55/100</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', letterSpacing: '0.5px' }}>
                  SELECT SITE TO FILTER DASHBOARD TELEMETRY:
                </span>
                {allSites?.map((site) => (
                  <div
                    key={site.id}
                    className={`kpi-site-card-item ${selectedSite === site.name ? 'selected' : ''}`}
                  >
                    <div className="kpi-site-item-info">
                      <div className="kpi-site-item-name">{site.name}</div>
                      <div className="kpi-site-item-meta">
                        {site.zone} &bull; {site.workers} Workers &bull; {site.activeCranes} Cranes &bull; Compliance: {site.compliance}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className={`cyber-badge ${site.category}`}>
                        <span className="badge-dot" />
                        {site.level} ({site.score})
                      </span>
                      <button
                        type="button"
                        className="kpi-modal-btn secondary"
                        onClick={() => {
                          onSelectSite(site.name)
                          onClose()
                        }}
                      >
                        {selectedSite === site.name ? '✓ Selected' : 'Filter Site'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="kpi-modal-footer">
              <button
                type="button"
                className="kpi-modal-btn secondary"
                onClick={() => {
                  onSelectSite('All Sites')
                  onClose()
                }}
              >
                Reset to All Sites
              </button>
              <button
                type="button"
                className="kpi-modal-btn primary"
                onClick={() => {
                  onNavigate('Site Risk Agent')
                  onClose()
                }}
              >
                Navigate to Site Risk Agent Console &rarr;
              </button>
            </div>
          </>
        )}

        {/* Modal Content: Open Hazards */}
        {activeModal === 'hazards' && (
          <>
            <div className="kpi-modal-header">
              <div className="kpi-modal-title-row">
                <div className="kpi-modal-title">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-high)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  Open Site Hazards Triage Detail
                </div>
                <div className="kpi-modal-sub">
                  Active structural, PPE &amp; equipment safety anomalies for {selectedSite}
                </div>
              </div>
              <button type="button" className="kpi-modal-close-btn" onClick={onClose} aria-label="Close dialog">&times;</button>
            </div>

            <div className="kpi-modal-body">
              <div className="kpi-modal-summary-strip">
                <div className="kpi-mini-stat">
                  <span className="kpi-mini-label">ACTIVE OPEN</span>
                  <span className="kpi-mini-value" style={{ color: 'var(--color-high)' }}>{openHazards.length} HAZARDS</span>
                </div>
                <div className="kpi-mini-stat">
                  <span className="kpi-mini-label">CRITICAL TIER</span>
                  <span className="kpi-mini-value" style={{ color: 'var(--color-critical)' }}>
                    {siteHazards.filter(h => h.severity === 'Critical').length} CRITICAL
                  </span>
                </div>
                <div className="kpi-mini-stat">
                  <span className="kpi-mini-label">HIGH SEVERITY</span>
                  <span className="kpi-mini-value" style={{ color: 'var(--color-high)' }}>
                    {siteHazards.filter(h => h.severity === 'High').length} HIGH
                  </span>
                </div>
                <div className="kpi-mini-stat">
                  <span className="kpi-mini-label">RESOLVED TODAY</span>
                  <span className="kpi-mini-value" style={{ color: 'var(--color-low)' }}>
                    {siteHazards.filter(h => h.status === 'Resolved').length} RESOLVED
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', letterSpacing: '0.5px' }}>
                  CURRENT HAZARDS IN ACTIVE SCOPE:
                </span>
                {siteHazards.map((item) => (
                  <div key={item.id} className="kpi-modal-hazard-row">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff' }}>{item.hazard}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {item.site} &bull; ID: {item.id} &bull; Score: <strong style={{ color: item.riskScore > 80 ? 'var(--color-critical)' : 'var(--color-high)' }}>{item.riskScore}/100</strong>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`cyber-badge ${item.severity.toLowerCase()}`}>
                        {item.severity}
                      </span>
                      <button
                        type="button"
                        className="table-action-cyber-btn"
                        onClick={() => onToggleHazard(item.id)}
                      >
                        {item.status === 'Resolved' ? 'Reopen' : 'Resolve'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="kpi-modal-footer">
              <button
                type="button"
                className="kpi-modal-btn secondary"
                onClick={() => {
                  onClose()
                  onScrollToHazards()
                }}
              >
                Scroll to Hazards Table &darr;
              </button>
              <button
                type="button"
                className="kpi-modal-btn primary"
                onClick={() => {
                  onNavigate('Safety Monitoring')
                  onClose()
                }}
              >
                Inspect in Safety Monitoring HUD &rarr;
              </button>
            </div>
          </>
        )}

        {/* Modal Content: Critical Risks */}
        {activeModal === 'risks' && (
          <>
            <div className="kpi-modal-header">
              <div className="kpi-modal-title-row">
                <div className="kpi-modal-title">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-critical)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  Critical Risk Escalation Vectors
                </div>
                <div className="kpi-modal-sub">
                  Acute telemetry anomalies &amp; perimeter warnings for {selectedSite}
                </div>
              </div>
              <button type="button" className="kpi-modal-close-btn" onClick={onClose} aria-label="Close dialog">&times;</button>
            </div>

            <div className="kpi-modal-body">
              <div className="kpi-modal-summary-strip">
                <div className="kpi-mini-stat">
                  <span className="kpi-mini-label">CRITICAL VECTORS</span>
                  <span className="kpi-mini-value" style={{ color: 'var(--color-critical)' }}>
                    {criticalHazards.length + criticalAlerts.length} ACTIVE
                  </span>
                </div>
                <div className="kpi-mini-stat">
                  <span className="kpi-mini-label">ESCALATION STATUS</span>
                  <span className="kpi-mini-value" style={{ color: 'var(--color-critical)' }}>DISPATCHED</span>
                </div>
                <div className="kpi-mini-stat">
                  <span className="kpi-mini-label">AUTOMATED HOLDS</span>
                  <span className="kpi-mini-value">2 CRANES</span>
                </div>
                <div className="kpi-mini-stat">
                  <span className="kpi-mini-label">MEAN RESOLUTION</span>
                  <span className="kpi-mini-value">24 MIN</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', letterSpacing: '0.5px' }}>
                  FLAGGED CRITICAL ANOMALIES:
                </span>
                {criticalHazards.length === 0 && criticalAlerts.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dim)', fontSize: '12px' }}>
                    No critical risk vectors active for {selectedSite}. Telemetry nominal.
                  </div>
                ) : (
                  <>
                    {criticalHazards.map(h => (
                      <div key={h.id} className="kpi-modal-hazard-row" style={{ borderLeft: '3px solid var(--color-critical)' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff' }}>{h.hazard}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{h.site} &bull; Score: {h.riskScore}/100</div>
                        </div>
                        <span className="cyber-badge critical">Critical</span>
                      </div>
                    ))}
                    {criticalAlerts.map(a => (
                      <div key={a.id} className="kpi-modal-hazard-row" style={{ borderLeft: '3px solid var(--color-critical)' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff' }}>{a.title}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{a.site} &bull; {a.desc}</div>
                        </div>
                        <span className="cyber-badge critical">Critical Alert</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>

            <div className="kpi-modal-footer">
              <button
                type="button"
                className="kpi-modal-btn secondary"
                onClick={() => {
                  onFilterSeverity('Critical')
                  onClose()
                  onScrollToHazards()
                }}
              >
                Filter Table to Critical Only
              </button>
              <button
                type="button"
                className="kpi-modal-btn primary"
                onClick={() => {
                  onNavigate('Alerts')
                  onClose()
                }}
              >
                Open Incident Triage Queue &rarr;
              </button>
            </div>
          </>
        )}

        {/* Modal Content: Compliance Score */}
        {activeModal === 'compliance' && (
          <>
            <div className="kpi-modal-header">
              <div className="kpi-modal-title-row">
                <div className="kpi-modal-title">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-low)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  OSHA 1926 &amp; ISO 45001 Compliance Breakdown
                </div>
                <div className="kpi-modal-sub">
                  Actuarial audit matrix &amp; subcontractor safety credential benchmarks for {selectedSite}
                </div>
              </div>
              <button type="button" className="kpi-modal-close-btn" onClick={onClose} aria-label="Close dialog">&times;</button>
            </div>

            <div className="kpi-modal-body">
              <div className="kpi-modal-summary-strip">
                <div className="kpi-mini-stat">
                  <span className="kpi-mini-label">OVERALL BENCHMARK</span>
                  <span className="kpi-mini-value" style={{ color: 'var(--color-low)' }}>
                    {selectedSite === 'All Sites' ? '94.2%' : (selectedSiteData?.compliance || '94.2%')}
                  </span>
                </div>
                <div className="kpi-mini-stat">
                  <span className="kpi-mini-label">ACTIVE PERMITS</span>
                  <span className="kpi-mini-value">28 VERIFIED</span>
                </div>
                <div className="kpi-mini-stat">
                  <span className="kpi-mini-label">AUDIT STATUS</span>
                  <span className="kpi-mini-value" style={{ color: 'var(--color-low)' }}>COMPLIANT</span>
                </div>
                <div className="kpi-mini-stat">
                  <span className="kpi-mini-label">UNDERWRITING CREDIT</span>
                  <span className="kpi-mini-value" style={{ color: 'var(--cyan-primary)' }}>-14% RATE</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', letterSpacing: '0.5px' }}>
                  REGULATORY STANDARDS VERIFICATION:
                </span>
                {[
                  { name: 'OSHA 1926.451 — Scaffolding & Pier Shoring', score: '92.4%', status: 'Compliant' },
                  { name: 'OSHA 1926.501 — Fall Arrest & Harness Anchorages', score: '95.8%', status: 'Compliant' },
                  { name: 'OSHA 1926.651 — Excavation & Trenching Slope Envelopes', score: '91.2%', status: 'Compliant' },
                  { name: 'ISO 45001 — Heavy Crane Hoisting & Perimeter Exclusion', score: '97.0%', status: 'Exceeds Standard' },
                  { name: 'OSHA Subpart C — Subcontractor Credentials & Training', score: '94.6%', status: 'Compliant' }
                ].map((std) => (
                  <div key={std.name} className="kpi-standard-item">
                    <div>
                      <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#ffffff' }}>{std.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Status: {std.status}</div>
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-low)', fontSize: '13px' }}>
                      {std.score}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="kpi-modal-footer">
              <button
                type="button"
                className="kpi-modal-btn secondary"
                onClick={onClose}
              >
                Close Breakdown
              </button>
              <button
                type="button"
                className="kpi-modal-btn primary"
                onClick={() => {
                  onNavigate('Compliance')
                  onClose()
                }}
              >
                Open Full Compliance Matrix &rarr;
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default App
