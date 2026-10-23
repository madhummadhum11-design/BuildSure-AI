import React, { useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import './App.css'
import {
  downloadJsonFile,
  exportProjectRiskJson,
  exportHazardsCsv,
  generateExecutiveReportPdf,
  generateActuarialInsurancePdf,
  sanitizeFilenamePart,
  getFormattedDateStamp
} from './utils/exportUtils'
import PublicLandingPage from './components/PublicLandingPage'
import {
  API_BASE_URL,
  checkBackendHealth,
  fetchHazards,
  createHazard,
  updateHazard,
  fetchAlerts,
  createAlert,
  updateAlert,
  deleteAlert,
  analyzePhoto,
  getVisionStatus,
  fetchCurrentUser,
  logoutUser,
  getAuthToken,
  setAuthToken,
  clearAuthToken
} from './services/api'

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

function calculateRiskScore(severity, likelihood) {
  const sev = Math.min(5, Math.max(1, parseInt(severity, 10) || 1))
  const lik = Math.min(5, Math.max(1, parseInt(likelihood, 10) || 1))
  return sev * lik * 4
}

function getPrototypePriority(score) {
  if (score >= 75) return { label: 'Critical', color: 'var(--color-critical)', badgeClass: 'critical' }
  if (score >= 50) return { label: 'High', color: 'var(--color-high)', badgeClass: 'high' }
  if (score >= 25) return { label: 'Medium', color: 'var(--color-medium)', badgeClass: 'medium' }
  return { label: 'Low', color: 'var(--color-low)', badgeClass: 'low' }
}

function getCategoryRecommendation(category) {
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

function getPriorityGuidance(priority) {
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

function getHazardRecommendations(item) {
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

// ============================================================================
// Default Settings & Reports Baseline Datasets
// ============================================================================
const DEFAULT_SETTINGS = {
  reasoningFreq: 15,
  consensusThreshold: 85,
  deepReasoning: true,
  windThreshold: 40,
  driftThreshold: 0.04,
  smsDispatch: true,
  sirenSimulation: false,
  dailyDigest: true,
  simSpeed: '1x'
}

const INITIAL_REPORTS = [
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
]

// ============================================================================
// LocalStorage Persistence Configuration & Safe Serialization Helpers
// ============================================================================
const STORAGE_KEYS = {
  HAZARDS: 'siteguard_hazards',
  ALERTS: 'siteguard_alerts',
  AGENT_LOGS: 'siteguard_agent_logs',
  SETTINGS: 'siteguard_settings',
  REPORTS: 'siteguard_reports',
  SWEEP_COUNT: 'siteguard_sweep_count'
}

function loadFromStorage(key, fallback) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return fallback
  }
  try {
    const raw = window.localStorage.getItem(key)
    if (raw === null || raw === undefined) {
      return fallback
    }
    const parsed = JSON.parse(raw)
    if (Array.isArray(fallback)) {
      return Array.isArray(parsed) ? parsed : fallback
    }
    if (fallback !== null && typeof fallback === 'object') {
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return fallback
      }
      return { ...fallback, ...parsed }
    }
    return parsed !== undefined ? parsed : fallback
  } catch (err) {
    console.warn(`[SITEGUARD] Failed loading "${key}" from localStorage, falling back to default:`, err)
    return fallback
  }
}

function saveToStorage(key, value) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch (err) {
    console.warn(`[SITEGUARD] Failed saving "${key}" to localStorage:`, err)
  }
}

function removeFromStorage(key) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return
  }
  try {
    window.localStorage.removeItem(key)
  } catch (err) {
    console.warn(`[SITEGUARD] Failed removing "${key}" from localStorage:`, err)
  }
}

const NAV_CONFIG = {
  'Dashboard': {
    title: 'Construction Risk Intelligence',
    subtitle: 'Autonomous Site Safety & Actuarial Hazard Command',
    tag: 'SYSTEM OVERVIEW'
  },
  'AI Photo Risk Analyzer': {
    title: 'Construction Photo Risk Analyzer',
    subtitle: 'Multimodal Vision AI Hazard Detection & PPE Compliance Scanner',
    tag: 'VISION AI'
  },
  'Photo Risk Analyzer': {
    title: 'Construction Photo Risk Analyzer',
    subtitle: 'Multimodal Vision AI Hazard Detection & PPE Compliance Scanner',
    tag: 'VISION AI'
  },
  'Hazard Management': {
    title: 'Hazard Management & Field Triage',
    subtitle: 'Field Safety Incident Ingestion & Risk Scoring HUD',
    tag: 'HAZARD REGISTRY'
  },
  'Register Hazard': {
    title: 'Hazard Management & Field Triage',
    subtitle: 'Field Safety Incident Ingestion & Risk Scoring HUD',
    tag: 'HAZARD REGISTRY'
  },
  'Safety Alerts': {
    title: 'Safety Alerts',
    subtitle: 'Review safety issues and take action.',
    tag: 'SAFETY ALERTS'
  },
  'Alerts': {
    title: 'Safety Alerts',
    subtitle: 'Review safety issues and take action.',
    tag: 'SAFETY ALERTS'
  },
  'Reports': {
    title: 'Executive Risk & Safety Reports',
    subtitle: 'Compiled Automated Dossiers, Audits & Incident Briefs',
    tag: 'DOSSIER ARCHIVE'
  },
  'Site Risk Agent': {
    title: 'Site Risk Agent Console',
    subtitle: 'Autonomous Multi-Agent Deliberation & Hazard Forecasting',
    tag: 'AGENTIC OPS'
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
  'Settings': {
    title: 'Platform & Agent Configuration',
    subtitle: 'Autonomous Scoring Thresholds, Sensor Baselines & Controls',
    tag: 'CONFIG SYSTEM'
  }
}

function App() {
  // Authentication & Session States
  const [currentUser, setCurrentUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  // Navigation & UI States (Defaults to Dashboard)
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

  // Interactive Data States with Reliable LocalStorage Persistence
  const [alerts, setAlerts] = useState(() => loadFromStorage(STORAGE_KEYS.ALERTS, INITIAL_ALERTS))
  const [hazards, setHazards] = useState(() => loadFromStorage(STORAGE_KEYS.HAZARDS, INITIAL_HAZARDS))
  const [agentLogs, setAgentLogs] = useState(() => loadFromStorage(STORAGE_KEYS.AGENT_LOGS, AGENT_DELIBERATIONS))
  const [settings, setSettings] = useState(() => loadFromStorage(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS))
  const [reports, setReports] = useState(() => loadFromStorage(STORAGE_KEYS.REPORTS, INITIAL_REPORTS))
  const [auditSweepCount, setAuditSweepCount] = useState(() => loadFromStorage(STORAGE_KEYS.SWEEP_COUNT, 24))
  const [isSimulatingSweep, setIsSimulatingSweep] = useState(false)
  const [apiStatus, setApiStatus] = useState('checking') // 'checking' | 'connected' | 'offline'

  // Non-blocking initial backend check and data synchronization
  const syncBackendData = async () => {
    try {
      const health = await checkBackendHealth()
      if (health && health.status === 'ok') {
        setApiStatus('connected')

        // Fetch hazards and alerts in parallel
        const [backendHazards, backendAlerts] = await Promise.allSettled([
          fetchHazards(),
          fetchAlerts()
        ])

        // Merge hazards: backend records take precedence for matching IDs; new backend records prepended; demo records preserved
        if (backendHazards.status === 'fulfilled' && Array.isArray(backendHazards.value) && backendHazards.value.length > 0) {
          setHazards(prevHazards => {
            const backendMap = new Map(backendHazards.value.map(h => [h.id, h]))
            const updatedExisting = prevHazards.map(h => backendMap.has(h.id) ? backendMap.get(h.id) : h)
            const existingIds = new Set(prevHazards.map(h => h.id))
            const brandNewFromBackend = backendHazards.value.filter(h => !existingIds.has(h.id))
            return [...brandNewFromBackend, ...updatedExisting]
          })
        }

        // Merge alerts: backend records take precedence for matching IDs; new backend records prepended; demo records preserved
        if (backendAlerts.status === 'fulfilled' && Array.isArray(backendAlerts.value) && backendAlerts.value.length > 0) {
          setAlerts(prevAlerts => {
            const backendMap = new Map(backendAlerts.value.map(a => [a.id, a]))
            const updatedExisting = prevAlerts.map(a => backendMap.has(a.id) ? backendMap.get(a.id) : a)
            const existingIds = new Set(prevAlerts.map(a => a.id))
            const brandNewFromBackend = backendAlerts.value.filter(a => !existingIds.has(a.id))
            return [...brandNewFromBackend, ...updatedExisting]
          })
        }
      } else {
        setApiStatus('offline')
      }
    } catch (err) {
      console.debug('[SITEGUARD] Backend check error (using local storage fallback):', err)
      setApiStatus('offline')
    }
  }

  // Initial check on mount: verify auth token and session
  useEffect(() => {
    let isMounted = true

    async function initSession() {
      try {
        const health = await checkBackendHealth().catch(() => null)
        if (isMounted) {
          setApiStatus(health && health.status === 'ok' ? 'connected' : 'offline')
        }

        const token = getAuthToken()
        if (token) {
          const userProfile = await fetchCurrentUser().catch(() => null)
          if (isMounted && userProfile) {
            setCurrentUser(userProfile)
            syncBackendData()
          }
        }
      } catch (err) {
        console.debug('[SITEGUARD] Auth session check error:', err)
      } finally {
        if (isMounted) {
          setAuthLoading(false)
        }
      }
    }

    initSession()

    const handleSessionExpired = (e) => {
      setCurrentUser(null)
      showToast(e.detail?.message || 'Session expired. Please sign in again.')
    }
    window.addEventListener('siteguard:session-expired', handleSessionExpired)

    return () => {
      isMounted = false
      window.removeEventListener('siteguard:session-expired', handleSessionExpired)
    }
  }, [])

  // Reactive localStorage writers (no infinite loop risk, safe serialization)
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.ALERTS, alerts)
  }, [alerts])

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.HAZARDS, hazards)
  }, [hazards])

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.AGENT_LOGS, agentLogs)
  }, [agentLogs])

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.SETTINGS, settings)
  }, [settings])

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.REPORTS, reports)
  }, [reports])

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.SWEEP_COUNT, auditSweepCount)
  }, [auditSweepCount])

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
    // Clear persisted custom data from localStorage
    removeFromStorage(STORAGE_KEYS.HAZARDS)
    removeFromStorage(STORAGE_KEYS.ALERTS)
    removeFromStorage(STORAGE_KEYS.AGENT_LOGS)
    removeFromStorage(STORAGE_KEYS.SETTINGS)
    removeFromStorage(STORAGE_KEYS.REPORTS)
    removeFromStorage(STORAGE_KEYS.SWEEP_COUNT)

    // Reset React memory state to default demo benchmarks
    setAlerts(INITIAL_ALERTS)
    setHazards(INITIAL_HAZARDS)
    setAgentLogs(AGENT_DELIBERATIONS)
    setSettings(DEFAULT_SETTINGS)
    setReports(INITIAL_REPORTS)
    setAuditSweepCount(24)

    setSelectedSite('All Sites')
    setSeverityFilter('All')
    setSearchQuery('')
    setSweepResult(null)
    setActiveKpiModal(null)
    showToast('Demo datasets and local storage restored to baseline state.')
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

  const handleLogout = async () => {
    try {
      await logoutUser()
    } finally {
      setCurrentUser(null)
      showToast('Signed out of SITEGUARD AI.')
    }
  }

  // Sidebar navigation configuration: Strictly 5 Primary Navigation Items
  const navItems = [
    { name: 'Dashboard', icon: 'dashboard' },
    { name: 'AI Photo Risk Analyzer', icon: 'camera' },
    { name: 'Hazard Management', icon: 'hazard' },
    { name: 'Safety Alerts', icon: 'alerts', badge: alerts.filter(a => a.status !== 'Acknowledged').length },
    { name: 'Reports', icon: 'reports' }
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

    if (apiStatus === 'connected') {
      deleteAlert(id).catch(err => {
        // 404 is expected for demo alerts only stored locally
        if (!err.message?.includes('404')) {
          console.warn(`[SITEGUARD] Backend alert dismissal error for ${id}:`, err)
        }
      })
    }
  }

  // Interactive: Acknowledge Alert (Requirement 5)
  const handleAcknowledgeAlert = (id) => {
    let targetAlert = null
    setAlerts(prev => prev.map(a => {
      if (a.id === id) {
        const nextStatus = a.status === 'Acknowledged' ? 'Active' : 'Acknowledged'
        showToast(`Alert ${id} status updated to ${nextStatus}.`)
        targetAlert = { ...a, status: nextStatus }
        return targetAlert
      }
      return a
    }))

    if (apiStatus === 'connected' && targetAlert) {
      updateAlert(id, { status: targetAlert.status }).catch(err => {
        if (!err.message?.includes('404')) {
          console.warn(`[SITEGUARD] Backend alert acknowledge error for ${id}:`, err)
        }
      })
    }
  }

  // Interactive: Mark All Alerts Acknowledged
  const handleMarkAllAlertsAcknowledged = () => {
    setAlerts(prev => prev.map(a => ({ ...a, status: 'Acknowledged' })))
    showToast('All active alerts marked as Acknowledged.')

    if (apiStatus === 'connected') {
      alerts.forEach(a => {
        if (a.status !== 'Acknowledged') {
          updateAlert(a.id, { status: 'Acknowledged' }).catch(err => {
            if (!err.message?.includes('404')) {
              console.warn(`[SITEGUARD] Backend batch alert acknowledge error for ${a.id}:`, err)
            }
          })
        }
      })
    }
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
    let nextStatus = 'Resolved'
    let linkedAlertId = null
    let nextAlertStatus = 'Acknowledged'

    setHazards(prev => prev.map(h => {
      if (h.id === id) {
        nextStatus = h.status === 'Resolved' ? 'Open' : 'Resolved'
        showToast(`Hazard ${id} status set to ${nextStatus}.`)

        // Synchronize linked alert status if present (Requirement 8)
        setAlerts(prevAlerts => prevAlerts.map(a => {
          if (a.hazardId === id) {
            linkedAlertId = a.id
            nextAlertStatus = nextStatus === 'Resolved' ? 'Acknowledged' : 'Active'
            return {
              ...a,
              status: nextAlertStatus
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

    if (apiStatus === 'connected') {
      updateHazard(id, { status: nextStatus }).catch(err => {
        if (!err.message?.includes('404')) {
          console.warn(`[SITEGUARD] Backend hazard update error for ${id}:`, err)
        }
      })
      if (linkedAlertId) {
        updateAlert(linkedAlertId, { status: nextAlertStatus }).catch(err => {
          if (!err.message?.includes('404')) {
            console.warn(`[SITEGUARD] Backend linked alert update error for ${linkedAlertId}:`, err)
          }
        })
      }
    }
  }

  // Interactive: Register Hazard & auto-dispatch High/Critical Alerts (Day 2 Step 4)
  const handleRegisterHazard = (newHazard) => {
    setHazards(prev => [newHazard, ...prev])

    let generatedAlert = null
    // Requirement 8: Make high and critical hazards appear in the existing Alerts section.
    // Keep alert counts synchronized with the hazard data.
    if (newHazard.priority === 'Critical' || newHazard.priority === 'High') {
      generatedAlert = {
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

    // Persist to backend if connected
    if (apiStatus === 'connected') {
      createHazard(newHazard)
        .then(savedHazard => {
          if (savedHazard && savedHazard.id) {
            setHazards(prev => prev.map(h => h.id === newHazard.id ? { ...h, ...savedHazard } : h))
          }
        })
        .catch(err => {
          console.warn('[SITEGUARD] Backend hazard save error (retained locally):', err)
          showToast(`Hazard ${newHazard.id} saved locally (backend sync pending).`)
        })

      if (generatedAlert) {
        createAlert(generatedAlert)
          .then(savedAlert => {
            if (savedAlert && savedAlert.id) {
              setAlerts(prev => prev.map(a => a.id === generatedAlert.id ? { ...a, ...savedAlert } : a))
            }
          })
          .catch(err => {
            console.warn('[SITEGUARD] Backend alert save error (retained locally):', err)
          })
      }
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

  if (authLoading) {
    return (
      <div className="landing-page-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '16px' }}>
        <div className="brand-icon-shield" style={{ width: '48px', height: '48px' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
          SITEGUARD AI &bull; Initializing Security Command Console...
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <PublicLandingPage
        onLoginSuccess={(user, token) => {
          if (token) {
            setAuthToken(token)
          }
          const normalized = {
            id: user?.id,
            email: user?.email,
            full_name: user?.full_name || user?.fullName || 'Safety Officer',
            fullName: user?.fullName || user?.full_name || 'Safety Officer',
            role: user?.role || 'Director of Safety Operations'
          }
          setCurrentUser(normalized)
          syncBackendData()
          showToast(`Welcome back, ${normalized.full_name}!`)
        }}
        apiStatus={apiStatus}
      />
    )
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
                <span className="brand-subtext">Enterprise Risk Intelligence</span>
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
                <span className="telemetry-name">SITEGUARD TELEMETRY</span>
                <span className="telemetry-sub">SYNC: ACTIVE &bull; AUDITS: {auditSweepCount}</span>
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
              <span className="demo-chip">ENTERPRISE EVALUATION</span>
              <span>
                Multi-site risk intelligence active for evaluation. Connected to FastAPI vision pipeline and SQLite database.
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
              <span>AI Sentinel Active</span>
            </div>

            {/* Backend Connectivity Status Indicator */}
            <div
              className="backend-status-badge"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '9999px',
                fontSize: '11px',
                fontWeight: '500',
                letterSpacing: '0.03em',
                background: apiStatus === 'connected' ? 'rgba(16, 185, 129, 0.12)' : apiStatus === 'checking' ? 'rgba(234, 179, 8, 0.12)' : 'rgba(148, 163, 184, 0.12)',
                border: `1px solid ${apiStatus === 'connected' ? 'rgba(16, 185, 129, 0.3)' : apiStatus === 'checking' ? 'rgba(234, 179, 8, 0.3)' : 'rgba(148, 163, 184, 0.3)'}`,
                color: apiStatus === 'connected' ? '#10b981' : apiStatus === 'checking' ? '#eab308' : '#94a3b8'
              }}
              title={
                apiStatus === 'connected'
                  ? `FastAPI Backend connected (${API_BASE_URL})`
                  : apiStatus === 'checking'
                  ? 'Checking backend connection...'
                  : 'Backend unavailable. Operating in Local Storage fallback mode.'
              }
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: apiStatus === 'connected' ? '#10b981' : apiStatus === 'checking' ? '#eab308' : '#94a3b8',
                  boxShadow: apiStatus === 'connected' ? '0 0 8px rgba(16, 185, 129, 0.6)' : 'none'
                }}
              />
              <span>{apiStatus === 'connected' ? 'Live Backend' : apiStatus === 'checking' ? 'Checking...' : 'Local Storage'}</span>
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
                    Open Safety Alerts &rarr;
                  </button>
                </div>
              )}
            </div>

            {/* Operator Profile & Sign Out */}
            <div className="operator-badge">
              <div className="operator-avatar">
                {currentUser?.full_name ? currentUser.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'SO'}
              </div>
              <div className="operator-meta">
                <span className="operator-callsign">{currentUser?.full_name || 'Safety Officer'}</span>
                <span className="operator-role">{currentUser?.role || 'Safety & Risk'}</span>
              </div>
            </div>

            <button
              type="button"
              className="header-logout-btn"
              onClick={handleLogout}
              title="Sign out of SITEGUARD AI"
              aria-label="Sign out"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Sign Out</span>
            </button>
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
              onNavigate={(target) => {
                if (target === 'Photo Risk Analyzer' || target === 'AI Photo Risk Analyzer') setActiveNav('AI Photo Risk Analyzer')
                else if (target === 'Register Hazard' || target === 'Hazard Management') setActiveNav('Hazard Management')
                else if (target === 'Alerts' || target === 'Safety Alerts') setActiveNav('Safety Alerts')
                else if (target === 'Reports') setActiveNav('Reports')
                else setActiveNav(target)
              }}
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

          {(activeNav === 'AI Photo Risk Analyzer' || activeNav === 'Photo Risk Analyzer') && (
            <PhotoRiskAnalyzerView
              allSites={ALL_SITES}
              selectedSite={selectedSite}
              onRegisterHazard={handleRegisterHazard}
              onShowToast={showToast}
              onNavigate={(target) => {
                if (target === 'Photo Risk Analyzer' || target === 'AI Photo Risk Analyzer') setActiveNav('AI Photo Risk Analyzer')
                else if (target === 'Register Hazard' || target === 'Hazard Management') setActiveNav('Hazard Management')
                else if (target === 'Alerts' || target === 'Safety Alerts') setActiveNav('Safety Alerts')
                else if (target === 'Reports') setActiveNav('Reports')
                else setActiveNav(target)
              }}
              apiStatus={apiStatus}
            />
          )}

          {(activeNav === 'Hazard Management' || activeNav === 'Register Hazard') && (
            <HazardRegistrationView
              allSites={ALL_SITES}
              selectedSite={selectedSite}
              hazards={hazards}
              onRegisterHazard={handleRegisterHazard}
              onNavigate={(target) => {
                if (target === 'Photo Risk Analyzer' || target === 'AI Photo Risk Analyzer') setActiveNav('AI Photo Risk Analyzer')
                else if (target === 'Alerts' || target === 'Safety Alerts') setActiveNav('Safety Alerts')
                else if (target === 'Reports') setActiveNav('Reports')
                else setActiveNav(target)
              }}
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
              hazards={hazards}
              alerts={alerts}
              onShowToast={showToast}
            />
          )}

          {activeNav === 'Reports' && (
            <ReportsView
              reports={reports}
              hazards={hazards}
              alerts={alerts}
              settings={settings}
              onAddReport={(newRep) => setReports(prev => [newRep, ...prev])}
              selectedSite={selectedSite}
              onShowToast={showToast}
            />
          )}

          {(activeNav === 'Safety Alerts' || activeNav === 'Alerts') && (
            <AlertsCenterView
              alerts={alerts}
              onDismissAlert={handleDismissAlert}
              onAcknowledgeAlert={handleAcknowledgeAlert}
              onAcknowledgeAll={handleMarkAllAlertsAcknowledged}
              onClearAll={() => {
                setAlerts([])
                showToast('All active alerts acknowledged and cleared.')
              }}
              onShowToast={showToast}
            />
          )}

          {activeNav === 'Settings' && (
            <SettingsView
              settings={settings}
              onUpdateSettings={(updated) => setSettings(updated)}
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
  const { categoryRec, priorityGuide } = getHazardRecommendations(item)
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
  
  const totalHazardsCount = siteHazards.length
  const openHazardCount = siteHazards.filter(h => h.status !== 'Resolved').length
  const resolvedHazardsCount = siteHazards.filter(h => h.status === 'Resolved').length
  const criticalHazardsCount = siteHazards.filter(h => (h.severity === 'Critical' || h.priority === 'Critical') && h.status !== 'Resolved').length
  const highHazardsCount = siteHazards.filter(h => (h.severity === 'High' || h.priority === 'High') && h.status !== 'Resolved').length
  const mediumHazardsCount = siteHazards.filter(h => (h.severity === 'Medium' || h.priority === 'Medium') && h.status !== 'Resolved').length
  const lowHazardsCount = siteHazards.filter(h => (h.severity === 'Low' || h.priority === 'Low') && h.status !== 'Resolved').length

  const activeAlerts = allAlerts.filter(a => (selectedSite === 'All Sites' || a.site === selectedSite) && a.status !== 'Acknowledged')
  const activeAlertsCount = activeAlerts.length
  const acknowledgedAlertsCount = allAlerts.filter(a => (selectedSite === 'All Sites' || a.site === selectedSite) && a.status === 'Acknowledged').length
  const criticalAlertsCount = activeAlerts.filter(a => a.type === 'critical').length
  const criticalRiskCount = criticalHazardsCount + criticalAlertsCount

  // Proportional percentages for the professional risk distribution chart
  const distributionBase = totalHazardsCount || 1
  const pctCritical = Math.max(0, Math.round((criticalHazardsCount / distributionBase) * 100))
  const pctHigh = Math.max(0, Math.round((highHazardsCount / distributionBase) * 100))
  const pctMedium = Math.max(0, Math.round((mediumHazardsCount / distributionBase) * 100))
  const pctLow = Math.max(0, Math.round((lowHazardsCount / distributionBase) * 100))
  const pctResolved = Math.max(0, Math.round((resolvedHazardsCount / distributionBase) * 100))

  // Calculated overall risk posture indicator
  const portfolioRiskIndex = openHazardCount > 0
    ? Math.round(siteHazards.filter(h => h.status !== 'Resolved').reduce((sum, h) => sum + (h.riskScore || 50), 0) / openHazardCount)
    : 16

  const overallRiskLevel = criticalHazardsCount > 0 ? 'Critical' : highHazardsCount > 0 ? 'High' : mediumHazardsCount > 0 ? 'Medium' : 'Low'
  const overallRiskLabel = criticalHazardsCount > 0
    ? 'ELEVATED RISK POSTURE • ACTION REQUIRED'
    : highHazardsCount > 0
    ? 'HEIGHTENED WATCH • ACTIVE MONITORING'
    : mediumHazardsCount > 0
    ? 'MODERATE PROFILE • OPERATIONS NOMINAL'
    : 'CONTROLLED PROFILE • RISK OPTIMAL'

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

      {/* Prominent But Tasteful Image Analysis Action (Requirement 3) */}
      <section className="executive-vision-cta animate-entrance delay-1">
        <div className="cta-text-group">
          <span className="cta-eyebrow">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            YOLOv8 Computer Vision Pipeline
          </span>
          <h2 className="cta-title">Automated Construction Site Photo Risk Analyzer</h2>
          <p className="cta-desc">
            Upload field drone or mobile photos for local pixel-level object detection, spatial bounding-box hazard inspection, and verified hazard registration into the active risk matrix.
          </p>
        </div>
        <button
          type="button"
          className="cta-action-btn"
          onClick={() => onNavigate('Photo Risk Analyzer')}
          aria-label="Launch Photo Risk Analyzer"
        >
          <span>Analyze Construction Image</span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </section>

      {/* Four Enterprise Indicator Cards (Total Hazards, Critical Hazards, Active Alerts, Resolved Hazards) */}
      <section className="kpi-cards-grid animate-entrance delay-1">
        {/* Total Hazards Card */}
        <div
          className="kpi-card interactive"
          onClick={() => onOpenKpiDetail('hazards')}
          role="button"
          tabIndex={0}
          title="Click to view Total Hazards breakdown"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onOpenKpiDetail('hazards')
            }
          }}
        >
          <div className="kpi-top-row">
            <span className="kpi-label">Total Hazards</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="kpi-detail-hint">Inspect ↗</span>
              <div className="kpi-icon-pill cyan">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value">{totalHazardsCount}</span>
            <span className="kpi-chip chip-good">
              {openHazardCount} OPEN
            </span>
          </div>
          <div className="kpi-note">
            {openHazardCount} active incidents &bull; {resolvedHazardsCount} resolved
          </div>
        </div>

        {/* Critical Hazards Card */}
        <div
          className="kpi-card interactive"
          onClick={() => onOpenKpiDetail('risks')}
          role="button"
          tabIndex={0}
          title="Click to view Critical Hazards"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onOpenKpiDetail('risks')
            }
          }}
        >
          <div className="kpi-top-row">
            <span className="kpi-label">Critical Hazards</span>
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
            <span className="kpi-value">{criticalHazardsCount}</span>
            <span className="kpi-chip chip-alert">ACTION REQ</span>
          </div>
          <div className="kpi-note">
            {criticalAlertsCount} linked active alerts &bull; {criticalRiskCount} critical risk vectors
          </div>
        </div>

        {/* Active Alerts Card */}
        <div
          className="kpi-card interactive"
          onClick={() => onNavigate('Alerts')}
          role="button"
          tabIndex={0}
          title="Click to view Active Alerts"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onNavigate('Alerts')
            }
          }}
        >
          <div className="kpi-top-row">
            <span className="kpi-label">Active Alerts</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="kpi-detail-hint">Inspect ↗</span>
              <div className="kpi-icon-pill amber">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </div>
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value">{activeAlertsCount}</span>
            <span className="kpi-chip chip-good">LIVE QUEUE</span>
          </div>
          <div className="kpi-note">
            {acknowledgedAlertsCount} acknowledged &bull; {criticalAlertsCount} critical alerts
          </div>
        </div>

        {/* Resolved Hazards Card */}
        <div
          className="kpi-card interactive"
          onClick={() => onOpenKpiDetail('compliance')}
          role="button"
          tabIndex={0}
          title="Click to view Resolved Hazards and compliance performance"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onOpenKpiDetail('compliance')
            }
          }}
        >
          <div className="kpi-top-row">
            <span className="kpi-label">Resolved Hazards</span>
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
            <span className="kpi-value">{resolvedHazardsCount}</span>
            <span className="kpi-chip chip-good">
              {Math.round((resolvedHazardsCount / distributionBase) * 100)}% CLOSED
            </span>
          </div>
          <div className="kpi-note">Compliance: {complianceScore} &bull; OSHA benchmark</div>
        </div>
      </section>

      {/* Executive Risk Posture & Hazard Distribution Chart (Requirement 3) */}
      <section className="risk-distribution-section animate-entrance delay-2">
        <div className="risk-distribution-header">
          <div className="panel-title-group">
            <div className="panel-icon-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </div>
            <div>
              <span className="panel-heading">Overall Risk Posture &amp; Hazard Distribution</span>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
                Risk Index: <strong style={{ color: '#ffffff' }}>{portfolioRiskIndex}/100</strong> &bull; Compliance Benchmark: <strong style={{ color: 'var(--emerald-light)' }}>{complianceScore}</strong>
              </div>
            </div>
          </div>
          <span className={`risk-posture-badge ${overallRiskLevel.toLowerCase()}`}>
            <span className="badge-dot" />
            {overallRiskLabel}
          </span>
        </div>

        {/* Multi-segment Distribution Bar Chart */}
        <div className="distribution-bar-track" title="Proportional Distribution: Critical, High, Medium, Low, Resolved">
          {pctCritical > 0 && (
            <div
              className="distribution-segment critical"
              style={{ width: `${pctCritical}%` }}
              title={`Critical: ${criticalHazardsCount} (${pctCritical}%)`}
            />
          )}
          {pctHigh > 0 && (
            <div
              className="distribution-segment high"
              style={{ width: `${pctHigh}%` }}
              title={`High: ${highHazardsCount} (${pctHigh}%)`}
            />
          )}
          {pctMedium > 0 && (
            <div
              className="distribution-segment medium"
              style={{ width: `${pctMedium}%` }}
              title={`Medium: ${mediumHazardsCount} (${pctMedium}%)`}
            />
          )}
          {pctLow > 0 && (
            <div
              className="distribution-segment low"
              style={{ width: `${pctLow}%` }}
              title={`Low: ${lowHazardsCount} (${pctLow}%)`}
            />
          )}
          {pctResolved > 0 && (
            <div
              className="distribution-segment resolved"
              style={{ width: `${pctResolved}%` }}
              title={`Resolved: ${resolvedHazardsCount} (${pctResolved}%)`}
            />
          )}
        </div>

        {/* Distribution Legend Grid */}
        <div className="distribution-legend-grid">
          <div className="distribution-legend-item">
            <span className="dist-dot critical" />
            <div className="dist-info">
              <span className="dist-label">Critical Risks</span>
              <span className="dist-value">{criticalHazardsCount} <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-dim)' }}>({pctCritical}%)</span></span>
            </div>
          </div>
          <div className="distribution-legend-item">
            <span className="dist-dot high" />
            <div className="dist-info">
              <span className="dist-label">High Priority</span>
              <span className="dist-value">{highHazardsCount} <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-dim)' }}>({pctHigh}%)</span></span>
            </div>
          </div>
          <div className="distribution-legend-item">
            <span className="dist-dot medium" />
            <div className="dist-info">
              <span className="dist-label">Medium Priority</span>
              <span className="dist-value">{mediumHazardsCount} <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-dim)' }}>({pctMedium}%)</span></span>
            </div>
          </div>
          <div className="distribution-legend-item">
            <span className="dist-dot low" />
            <div className="dist-info">
              <span className="dist-label">Low Risk</span>
              <span className="dist-value">{lowHazardsCount} <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-dim)' }}>({pctLow}%)</span></span>
            </div>
          </div>
          <div className="distribution-legend-item">
            <span className="dist-dot resolved" />
            <div className="dist-info">
              <span className="dist-label">Resolved</span>
              <span className="dist-value">{resolvedHazardsCount} <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-dim)' }}>({pctResolved}%)</span></span>
            </div>
          </div>
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
// Sub-View: 3. Construction Photo Risk Analyzer (Multimodal Vision AI)
// ============================================================================

// Sample scenario preset data URLs and demonstration templates
const SAMPLE_PRESETS = [
  {
    id: 'sample-scaffold',
    title: 'Pier 3 Scaffold Deck - Leading Edge Fall Risk',
    site: 'Riverside Bridge Expansion',
    filename: 'pier3_scaffold_perimeter.jpg',
    size: 2842000,
    type: 'image/jpeg',
    svgDataUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="%230b1329"/><rect x="40" y="240" width="520" height="130" fill="%231e293b" stroke="%2338bdf8" stroke-width="2"/><line x1="80" y1="120" x2="80" y2="240" stroke="%23e2e8f0" stroke-width="4"/><line x1="160" y1="120" x2="160" y2="240" stroke="%23e2e8f0" stroke-width="4"/><line x1="240" y1="120" x2="240" y2="240" stroke="%23e2e8f0" stroke-width="4"/><line x1="80" y1="140" x2="240" y2="140" stroke="%23e2e8f0" stroke-width="3"/><line x1="80" y1="200" x2="240" y2="200" stroke="%23e2e8f0" stroke-width="3"/><line x1="80" y1="140" x2="160" y2="200" stroke="%2364748b" stroke-width="2"/><line x1="160" y1="140" x2="240" y2="200" stroke="%2364748b" stroke-width="2"/><rect x="240" y="235" width="280" height="6" fill="%23ff3366" stroke="%23ff3366" stroke-dasharray="4,4"/><circle cx="280" cy="210" r="14" fill="%23eab308"/><line x1="280" y1="224" x2="280" y2="238" stroke="%23e2e8f0" stroke-width="3"/><rect x="250" y="165" width="130" height="24" rx="4" fill="%23ff3366"/><text x="315" y="181" font-family="monospace" font-size="10" fill="%23ffffff" text-anchor="middle" font-weight="bold">MISSING MIDRAIL</text><polygon points="460,140 430,195 490,195" fill="%23ff3366"/><text x="460" y="184" font-family="sans-serif" font-size="20" font-weight="bold" fill="%23ffffff" text-anchor="middle">!</text><text x="460" y="215" font-family="monospace" font-size="12" fill="%23ff3366" text-anchor="middle" font-weight="bold">FALL HAZARD</text><text x="300" y="45" font-family="sans-serif" font-size="16" fill="%2338bdf8" text-anchor="middle" font-weight="bold">SITE CAMERA: PIER 3 ELEVATED SCAFFOLDING</text><text x="300" y="68" font-family="monospace" font-size="11" fill="%2394a3b8" text-anchor="middle">SYNTHETIC TELEMETRY FRAME // ISO 45001 PATROL</text></svg>`,
    hazards: [
      {
        id: 'DEMO-H1',
        name: 'Missing Guardrails & Midrails along Scaffolding Perimeter',
        category: 'Fall risk',
        severity: 'Critical',
        numericSeverity: 5,
        numericLikelihood: 5,
        location: 'Level 12 cantilevered exterior scaffold edge (Sector B)',
        confidence: null,
        explanation: 'Scaffolding tier exceeds 10 feet in height with open perimeter edges missing intermediate midrails and toprails, in acute violation of OSHA 1926.451(g)(1).',
        recommendation: 'Immediately red-tag scaffolding tier, erect standard 42-inch guardrails with toe boards, and verify competent person inspection prior to worker re-entry.'
      },
      {
        id: 'DEMO-H2',
        name: 'Worker in Leading-Edge Zone without Secondary Arrest Tether',
        category: 'PPE violation',
        severity: 'Critical',
        numericSeverity: 5,
        numericLikelihood: 4,
        location: 'Upper deck concrete slab edge within 6ft buffer',
        confidence: null,
        explanation: 'Personnel detected operating within 6 feet of an unprotected edge without anchorage tie-off or personal fall arrest system (OSHA 1926.501(b)(1)).',
        recommendation: 'Issue immediate stop-work directive for leading-edge operations and mandate 100% harness hookup to certified lifeline anchorages.'
      }
    ]
  },
  {
    id: 'sample-ppe',
    title: 'Active Crane Radius - Ground Crew PPE Infraction',
    site: 'Metro Heights Tower A',
    filename: 'crane_swing_ground_crew.jpg',
    size: 3410500,
    type: 'image/jpeg',
    svgDataUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="%230b1329"/><line x1="120" y1="360" x2="120" y2="80" stroke="%23ff8c00" stroke-width="6"/><line x1="120" y1="80" x2="380" y2="80" stroke="%23ff8c00" stroke-width="5"/><line x1="280" y1="80" x2="280" y2="210" stroke="%2394a3b8" stroke-width="2" stroke-dasharray="3,3"/><rect x="268" y="210" width="24" height="20" fill="%23eab308"/><circle cx="280" cy="290" r="16" fill="%23cbd5e1"/><line x1="280" y1="306" x2="280" y2="345" stroke="%23cbd5e1" stroke-width="4"/><circle cx="340" cy="295" r="16" fill="%23cbd5e1"/><line x1="340" y1="311" x2="340" y2="345" stroke="%23cbd5e1" stroke-width="4"/><circle cx="280" cy="290" r="24" fill="none" stroke="%23ff3366" stroke-width="3" stroke-dasharray="4,4"/><rect x="210" y="240" width="140" height="22" rx="4" fill="%23ff3366"/><text x="280" y="255" font-family="monospace" font-size="10" fill="%23ffffff" text-anchor="middle" font-weight="bold">NO HARDHAT IN SWING</text><text x="300" y="45" font-family="sans-serif" font-size="16" fill="%2338bdf8" text-anchor="middle" font-weight="bold">SITE CAMERA: CRANE #02 HOIST RADIUS</text><text x="300" y="68" font-family="monospace" font-size="11" fill="%2394a3b8" text-anchor="middle">GROUND CREW PPE PATROL // SECTOR 3</text></svg>`,
    hazards: [
      {
        id: 'DEMO-H3',
        name: 'Personnel within Crane Boom Exclusion Envelope without Hardhat',
        category: 'PPE violation',
        severity: 'High',
        numericSeverity: 4,
        numericLikelihood: 4,
        location: 'Ground level hoist transit corridor directly beneath crane jib',
        confidence: null,
        explanation: 'Ground riggers observed operating inside active crane hoisting arc without ANSI Z89.1 certified protective helmets, exposing personnel to severe overhead impact hazards.',
        recommendation: 'Sound crane exclusion horn, verify hardhat compliance at access gate, and establish perimeter barrier tape around the swing envelope.'
      },
      {
        id: 'DEMO-H4',
        name: 'Missing High-Visibility Safety Vests in Heavy Equipment Lane',
        category: 'PPE violation',
        severity: 'Medium',
        numericSeverity: 3,
        numericLikelihood: 3,
        location: 'Active forklift and vehicle staging intersection',
        confidence: null,
        explanation: 'Workers wearing dark non-reflective clothing in a shared vehicular loading corridor without Class 2 high-visibility retroreflective vests.',
        recommendation: 'Equip workers with high-visibility reflective vests before permitting work in active traffic or machinery lanes.'
      }
    ]
  },
  {
    id: 'sample-trench',
    title: 'Sector 4 Deep Foundation Cut - Unshored Trench Subsidence',
    site: 'City Center Transit Hub',
    filename: 'subterranean_trench_cut.jpg',
    size: 4120800,
    type: 'image/jpeg',
    svgDataUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="%230b1329"/><polygon points="0,180 200,180 220,360 0,360" fill="%23473322"/><polygon points="380,180 600,180 600,360 360,360" fill="%23473322"/><rect x="220" y="200" width="140" height="160" fill="%231e293b"/><line x1="200" y1="180" x2="220" y2="360" stroke="%23ff3366" stroke-width="4"/><line x1="380" y1="180" x2="360" y2="360" stroke="%23ff3366" stroke-width="4"/><text x="290" y="270" font-family="monospace" font-size="12" fill="%23ff3366" text-anchor="middle" font-weight="bold">NO SHORING BOX</text><text x="290" y="295" font-family="monospace" font-size="11" fill="%23e2e8f0" text-anchor="middle">DEPTH: 7.4 FT</text><rect x="420" y="140" width="90" height="36" fill="%23eab308"/><text x="465" y="162" font-family="monospace" font-size="10" fill="%23000000" text-anchor="middle" font-weight="bold">EXCAVATOR</text><text x="300" y="45" font-family="sans-serif" font-size="16" fill="%2338bdf8" text-anchor="middle" font-weight="bold">GEOTECHNICAL HUD: TRENCH CROSS-SECTION</text><text x="300" y="68" font-family="monospace" font-size="11" fill="%2394a3b8" text-anchor="middle">OSHA 1926.652 CAVE-IN RISK SCANNER</text></svg>`,
    hazards: [
      {
        id: 'DEMO-H5',
        name: 'Vertical Trench Wall Exceeding 5ft Depth without Shoring or Shield',
        category: 'Excavation hazard',
        severity: 'Critical',
        numericSeverity: 5,
        numericLikelihood: 4,
        location: 'Subterranean trench cut facing west embankment',
        confidence: null,
        explanation: 'Excavation measured at 7.4 feet depth in Type B soil with vertical non-benched walls lacking protective trench boxes or hydraulic struts, violating OSHA 1926.652.',
        recommendation: 'Evacuate personnel immediately. Prohibit trench entry until certified trench box shoring or engineered benching is installed and approved.'
      },
      {
        id: 'DEMO-H6',
        name: 'Heavy Hydraulic Excavator Positioned within 2ft of Trench Crest',
        category: 'Equipment hazard',
        severity: 'High',
        numericSeverity: 4,
        numericLikelihood: 3,
        location: 'Excavation trench lip perimeter edge',
        confidence: null,
        explanation: 'Superimposed equipment surcharge load located inside the soil angle of repose, creating micro-fissure shear risk and trench wall collapse.',
        recommendation: 'Relocate excavator minimum 5 feet back from trench crest and inspect soil stability before trench resumption.'
      }
    ]
  },
  {
    id: 'sample-nominal',
    title: 'Zone D Industrial Logistics Hub - Nominal Compliant Zone',
    site: 'Bayfront Logistics Hub',
    filename: 'bayfront_compliant_assembly.jpg',
    size: 1985000,
    type: 'image/jpeg',
    svgDataUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="%230b1329"/><rect x="60" y="220" width="480" height="140" fill="%231e293b" stroke="%2310b981" stroke-width="2"/><line x1="60" y1="220" x2="540" y2="220" stroke="%2310b981" stroke-width="6"/><circle cx="200" cy="180" r="14" fill="%2310b981"/><circle cx="380" cy="180" r="14" fill="%2310b981"/><circle cx="200" cy="170" r="8" fill="%23ffffff"/><circle cx="380" cy="170" r="8" fill="%23ffffff"/><rect x="180" y="270" width="240" height="44" rx="8" fill="%2310b981" fill-opacity="0.15" stroke="%2310b981"/><text x="300" y="297" font-family="monospace" font-size="13" fill="%2310b981" text-anchor="middle" font-weight="bold">ALL OSHA 1926 BENCHMARKS NOMINAL</text><text x="300" y="45" font-family="sans-serif" font-size="16" fill="%2310b981" text-anchor="middle" font-weight="bold">SITE CAMERA: FABRICATION BAY D</text><text x="300" y="68" font-family="monospace" font-size="11" fill="%2394a3b8" text-anchor="middle">AUTOMATED PERIMETER & PPE VERIFICATION NOMINAL</text></svg>`,
    hazards: []
  }
]

// Configurable UI risk score classification bands (0-29 Low, 30-59 Medium, 60-79 High, 80-100 Very High)
// (Heuristic preliminary decision-support; not official OSHA regulatory standards)
const RISK_SCORE_BANDS = [
  { min: 0, max: 29, label: 'Low', badgeClass: 'low', color: 'var(--color-low, #10b981)', explanation: 'Site imagery indicates standard baseline conditions with minimal detected risk factors.' },
  { min: 30, max: 59, label: 'Medium', badgeClass: 'medium', color: 'var(--color-medium, #f59e0b)', explanation: 'Moderate safety considerations observed; review workforce PPE and site staging conditions.' },
  { min: 60, max: 79, label: 'High', badgeClass: 'high', color: 'var(--color-high, #f97316)', explanation: 'Elevated risk indicators detected requiring supervisory review and proactive corrective controls.' },
  { min: 80, max: 100, label: 'Very High', badgeClass: 'critical', color: 'var(--color-critical, #ef4444)', explanation: 'Significant hazards or critical safety vectors identified requiring immediate verification and remediation.' }
]

function getRiskBand(score) {
  const clamped = Math.max(0, Math.min(100, Math.round(score || 0)))
  for (const band of RISK_SCORE_BANDS) {
    if (clamped >= band.min && clamped <= band.max) {
      return band
    }
  }
  return RISK_SCORE_BANDS[0]
}

// Methodical hazard weighting formula calculation
function computePhotoRiskScore(hazards = []) {
  if (!hazards || hazards.length === 0) {
    const band = getRiskBand(0)
    return { score: 0, category: band.label, badgeClass: band.badgeClass }
  }
  let total = 0
  hazards.forEach(h => {
    const sev = (h.severity || '').toLowerCase()
    if (sev === 'critical') total += 40
    else if (sev === 'high') total += 25
    else if (sev === 'medium') total += 12
    else total += 5
  })
  const score = Math.min(100, total)
  const band = getRiskBand(score)
  return { score, category: band.label, badgeClass: band.badgeClass }
}

function PhotoRiskAnalyzerView({ allSites, selectedSite, onRegisterHazard, onShowToast, onNavigate, apiStatus }) {
  const initialSite = selectedSite && selectedSite !== 'All Sites'
    ? selectedSite
    : (allSites[0]?.name || 'Riverside Bridge Expansion')

  const [site, setSite] = useState(initialSite)
  const [selectedImageFile, setSelectedImageFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [annotatedUrl, setAnnotatedUrl] = useState(null)
  const [showAnnotated, setShowAnnotated] = useState(true)
  const [imageMeta, setImageMeta] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState(null)
  const [analysisResults, setAnalysisResults] = useState(null)
  const [registeredIds, setRegisteredIds] = useState(new Set())
  const [selectedFindingIds, setSelectedFindingIds] = useState(new Set())
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [showTechDetails, setShowTechDetails] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [showScoringDetails, setShowScoringDetails] = useState(false)
  const [visionStatus, setVisionStatus] = useState(null)
  const [confThreshold] = useState(0.25)

  // API Key management (Environment variable first, then browser session/localStorage)
  const [apiKey, setApiKey] = useState(() => {
    return (
      (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) ||
      (typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem('siteguard_gemini_api_key') : '') ||
      ''
    )
  })
  const [keyInput, setKeyInput] = useState('')

  const fileInputRef = useRef(null)

  const isLiveConfigured = Boolean(apiKey && apiKey.trim().length > 10)

  // Query backend vision service status on mount or when apiStatus changes
  useEffect(() => {
    let isMounted = true
    if (apiStatus === 'connected') {
      getVisionStatus()
        .then(res => {
          if (isMounted && res && res.available) {
            setVisionStatus(res)
          }
        })
        .catch(() => {})
    }
    return () => { isMounted = false }
  }, [apiStatus])

  // Validate uploaded file
  const processUploadedFile = (file) => {
    setAnalysisError(null)
    const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
    const hasValidExt = /\.(jpe?g|png|webp)$/i.test(file.name)

    if (!validMimes.includes(file.type.toLowerCase()) && !hasValidExt) {
      const err = 'Invalid file type. Please upload a JPG, JPEG, PNG, or WEBP construction photo.'
      setAnalysisError(err)
      onShowToast(err)
      return
    }

    const MAX_SIZE = 15 * 1024 * 1024 // 15 MB limit
    if (file.size > MAX_SIZE) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1)
      const err = `File exceeds 15 MB limit (${sizeMb} MB). Please compress or choose a smaller image.`
      setAnalysisError(err)
      onShowToast(err)
      return
    }

    const objectUrl = URL.createObjectURL(file)
    setSelectedImageFile(file)
    setPreviewUrl(objectUrl)
    setAnnotatedUrl(null)
    setShowAnnotated(false)
    setImageMeta({
      name: file.name,
      size: file.size,
      sizeFormatted: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      type: file.type || 'image/jpeg'
    })
    setAnalysisResults(null)
    setRegisteredIds(new Set())
    setSelectedFindingIds(new Set())
  }

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processUploadedFile(e.target.files[0])
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processUploadedFile(e.dataTransfer.files[0])
    }
  }

  const handleRemoveImage = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl)
    }
    setSelectedImageFile(null)
    setPreviewUrl(null)
    setAnnotatedUrl(null)
    setShowAnnotated(false)
    setImageMeta(null)
    setAnalysisResults(null)
    setAnalysisError(null)
    setRegisteredIds(new Set())
    setSelectedFindingIds(new Set())
    if (fileInputRef.current) fileInputRef.current.value = ''
    onShowToast('Uploaded photo removed.')
  }

  const handleSelectPreset = (preset) => {
    setAnalysisError(null)
    setSelectedImageFile(null)
    setPreviewUrl(preset.svgDataUrl)
    setAnnotatedUrl(null)
    setShowAnnotated(false)
    setImageMeta({
      name: preset.filename,
      size: preset.size,
      sizeFormatted: `${(preset.size / (1024 * 1024)).toFixed(2)} MB`,
      type: preset.type
    })
    setSite(preset.site)
    setAnalysisResults(null)
    setRegisteredIds(new Set())
    setSelectedFindingIds(new Set())
    onShowToast(`Sample scenario loaded: ${preset.title}`)
  }

  // Computer Vision Model Execution (Real YOLO Inference & Fallback Options)
  const handleAnalyzePhoto = async () => {
    if (!previewUrl) return
    setIsAnalyzing(true)
    setAnalysisError(null)

    // Option 1: Real Local YOLO Computer Vision Inference (Preferred when an actual photo is uploaded)
    if (selectedImageFile && apiStatus === 'connected') {
      try {
        const data = await analyzePhoto(selectedImageFile, confThreshold)
        const hazardsList = Array.isArray(data.hazards) ? data.hazards : []
        const { score, category } = computePhotoRiskScore(hazardsList)
        const actualScore = data.riskScore !== undefined ? data.riskScore : score
        const band = getRiskBand(actualScore)

        setAnalysisResults({
          mode: 'yolo',
          provider: data.model || 'YOLOv8n (Local Inference)',
          summary: data.summary || 'YOLO computer vision inference complete.',
          hazards: hazardsList,
          score: actualScore,
          category: band.label,
          badgeClass: band.badgeClass,
          inferenceTimeMs: data.inferenceTimeMs,
          detectionsCount: data.detectionsCount,
          modelDisclaimer: data.modelDisclaimer,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        })

        if (data.annotatedImage) {
          setAnnotatedUrl(data.annotatedImage)
          setShowAnnotated(true)
        }

        onShowToast(`YOLO Vision complete: ${data.detectionsCount} object(s) detected in ${data.inferenceTimeMs}ms.`)
        setIsAnalyzing(false)
        return
      } catch (err) {
        console.warn('[SITEGUARD] Backend YOLO inference error:', err)
        // If Gemini is not configured, report error; otherwise proceed to Gemini fallback
        if (!isLiveConfigured) {
          setAnalysisError(`Local Computer Vision Error: ${err.message}`)
          setIsAnalyzing(false)
          onShowToast('Local computer vision analysis failed.')
          return
        }
      }
    }

    // Option 2: Live Vision AI execution via Google Gemini Multimodal
    if (isLiveConfigured && selectedImageFile) {
      try {
        const reader = new FileReader()
        const base64Promise = new Promise((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result
            const base64Clean = result.split(',')[1]
            resolve(base64Clean)
          }
          reader.onerror = reject
          reader.readAsDataURL(selectedImageFile)
        })

        const base64Data = await base64Promise
        const mimeType = selectedImageFile.type || 'image/jpeg'

        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey.trim()}`
        const prompt = `You are SITEGUARD AI, a construction safety computer vision analyzer. Inspect this image for OSHA 1926 hazards (PPE violations, falls from heights, scaffolding/ladders, excavations/trenches, equipment proximity, material storage).
Respond strictly with valid JSON without markdown fences matching:
{
  "summary": "1 sentence inspection finding",
  "hazards": [
    {
      "id": "AI-H1",
      "name": "Hazard title",
      "category": "Fall risk" | "PPE violation" | "Scaffolding hazard" | "Excavation hazard" | "Equipment hazard" | "Other",
      "severity": "Critical" | "High" | "Medium" | "Low",
      "numericSeverity": 1 to 5,
      "numericLikelihood": 1 to 5,
      "location": "Visual area in image",
      "confidence": 0.85 to 0.99,
      "explanation": "Why this is dangerous under OSHA",
      "recommendation": "Corrective action"
    }
  ]
}`

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  {
                    inline_data: {
                      mime_type: mimeType,
                      data: base64Data
                    }
                  }
                ]
              }
            ],
            generationConfig: {
              response_mime_type: 'application/json',
              temperature: 0.1
            }
          })
        })

        if (!response.ok) {
          const errText = await response.text()
          let parsedMsg = `Vision API call failed (HTTP ${response.status})`
          try {
            const jsonErr = JSON.parse(errText)
            if (jsonErr.error && jsonErr.error.message) {
              parsedMsg = jsonErr.error.message
            }
          } catch {
            // Non-JSON response text fallback
          }
          throw new Error(parsedMsg)
        }

        const data = await response.json()
        const rawContent = data?.candidates?.[0]?.content?.parts?.[0]?.text
        if (!rawContent) throw new Error('No detection content returned from Gemini model.')

        const parsed = JSON.parse(rawContent.replace(/```json|```/g, '').trim())
        const hazardsList = Array.isArray(parsed.hazards) ? parsed.hazards : []
        const { score, category, badgeClass } = computePhotoRiskScore(hazardsList)

        setAnalysisResults({
          mode: 'live',
          provider: 'Google Gemini 1.5 Flash (Multimodal)',
          summary: parsed.summary || 'Vision AI image scan complete.',
          hazards: hazardsList,
          score,
          category,
          badgeClass,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        })
        onShowToast(`Vision AI Analysis complete: ${hazardsList.length} potential hazard(s) flagged.`)
      } catch (err) {
        console.error('Vision API error:', err)
        setAnalysisError(`Vision AI Error: ${err.message}. You can switch to Demonstration Mode or verify your API key.`)
        onShowToast('Vision AI analysis encountered an error.')
      } finally {
        setIsAnalyzing(false)
      }
      return
    }

    // Option 3: Transparent Demonstration Evaluation Mode
    // (Used when user runs presets or uploads a photo without a configured model/key)
    setTimeout(() => {
      // Find matching preset or formulate realistic demonstration assessment
      const matchedPreset = SAMPLE_PRESETS.find(p => p.filename === imageMeta?.name)
      const hazardsList = matchedPreset ? matchedPreset.hazards : [
        {
          id: `DEMO-${Date.now()}-1`,
          name: 'Unprotected Floor Edge / Perimeter Opening',
          category: 'Fall risk',
          severity: 'Critical',
          numericSeverity: 5,
          numericLikelihood: 4,
          location: 'Elevated slab edge (Upper visual zone)',
          confidence: null,
          explanation: 'Demonstration pattern detection: Elevated edge lacks standard OSHA 1926.501 guardrails or warning line perimeter.',
          recommendation: 'Erect standard toprails, midrails and toeboards prior to personnel staging.'
        },
        {
          id: `DEMO-${Date.now()}-2`,
          name: 'Missing High-Visibility Protective Vest',
          category: 'PPE violation',
          severity: 'Medium',
          numericSeverity: 3,
          numericLikelihood: 3,
          location: 'Foreground traffic / staging pathway',
          confidence: null,
          explanation: 'Demonstration pattern detection: Personnel observed without ANSI Class 2 retroreflective vest in shared equipment corridor.',
          recommendation: 'Issue compliant safety apparel at gate checkpoint.'
        }
      ]

      const { score, category, badgeClass } = computePhotoRiskScore(hazardsList)

      setAnalysisResults({
        mode: 'demo',
        provider: 'Demonstration Evaluation Model (Synthetic Baseline)',
        summary: hazardsList.length > 0
          ? `Synthetic scenario scan evaluated ${hazardsList.length} hazard vectors.`
          : 'Synthetic scenario scan verified all safety indicators within nominal limits.',
        hazards: hazardsList,
        score,
        category,
        badgeClass,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      })
      setIsAnalyzing(false)
      onShowToast('[DEMO MODE] Photo analyzed with synthetic demonstration rules.')
    }, 1100)
  }

  // Register detected hazard into persistent system state
  const handleRegisterDetectedHazard = (hazard) => {
    const newId = `HAZ-${Math.floor(2000 + Math.random() * 8000)}`

    const newHazardEntry = {
      id: newId,
      site: site,
      hazard: hazard.name,
      category: hazard.category || 'Other',
      description: `${hazard.explanation} (Observed Location: ${hazard.location || 'Visual field'}). Detected via Photo Risk Analyzer (${isLiveConfigured ? 'Gemini 1.5 Flash' : 'Demonstration Mode'}).`,
      severity: hazard.severity,
      priority: hazard.severity,
      numericSeverity: hazard.numericSeverity || (hazard.severity === 'Critical' ? 5 : hazard.severity === 'High' ? 4 : hazard.severity === 'Medium' ? 3 : 2),
      numericLikelihood: hazard.numericLikelihood || (hazard.severity === 'Critical' ? 5 : hazard.severity === 'High' ? 4 : hazard.severity === 'Medium' ? 3 : 2),
      riskScore: calculateRiskScore(
        hazard.numericSeverity || (hazard.severity === 'Critical' ? 5 : hazard.severity === 'High' ? 4 : 3),
        hazard.numericLikelihood || (hazard.severity === 'Critical' ? 5 : hazard.severity === 'High' ? 4 : 3)
      ),
      categoryRecommendation: hazard.recommendation || getCategoryRecommendation(hazard.category || hazard.name),
      priorityGuidance: getPriorityGuidance(hazard.severity),
      status: 'Open',
      reportedBy: `Photo Risk Analyzer (${isLiveConfigured ? 'Vision AI' : 'Demo Inspection'})`,
      timestamp: 'Just now'
    }

    onRegisterHazard(newHazardEntry)
    setRegisteredIds(prev => new Set([...prev, hazard.id]))
    onShowToast(`[HAZARD REGISTERED] ${hazard.name} added to site registry & alert triage.`)
  }

  // Toggle single finding selection for registration
  const toggleFindingSelection = (id) => {
    setSelectedFindingIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Toggle select all findings
  const toggleSelectAll = () => {
    const registrable = recommendedSafetyChecks.filter(
      c => !c.rawHazards?.every(rh => registeredIds.has(rh.id))
    )
    if (selectedFindingIds.size >= registrable.length && registrable.length > 0) {
      setSelectedFindingIds(new Set())
    } else {
      setSelectedFindingIds(new Set(registrable.map(c => c.id)))
    }
  }

  // Execute batch registration after modal confirmation
  const handleConfirmBatchRegister = () => {
    if (selectedFindingIds.size === 0) return
    setIsRegistering(true)

    const selectedCards = recommendedSafetyChecks.filter(c => selectedFindingIds.has(c.id))
    let registeredCount = 0
    const newlyRegisteredIds = new Set([...registeredIds])

    selectedCards.forEach(card => {
      const newId = `HAZ-${Math.floor(2000 + Math.random() * 8000)}`
      const numSev = card.severity === 'Critical' ? 5 : card.severity === 'High' ? 4 : card.severity === 'Medium' ? 3 : 2
      const numLik = numSev
      const engineName = analysisResults?.mode === 'yolo'
        ? 'YOLOv8 Computer Vision'
        : isLiveConfigured
        ? 'Gemini 1.5 Flash'
        : 'Demonstration Mode'

      const newHazardEntry = {
        id: newId,
        site: site,
        hazard: card.title,
        category: card.category || 'General',
        description: `${card.explanation} Corrective action: ${card.action}. Identified via Photo Risk Analyzer (${engineName}).`,
        severity: card.severity,
        priority: card.severity,
        numericSeverity: numSev,
        numericLikelihood: numLik,
        riskScore: calculateRiskScore(numSev, numLik),
        categoryRecommendation: card.action,
        priorityGuidance: getPriorityGuidance(card.severity),
        status: 'Open',
        reportedBy: `Photo Risk Analyzer (${engineName})`,
        timestamp: 'Just now'
      }

      onRegisterHazard(newHazardEntry)
      registeredCount++

      newlyRegisteredIds.add(card.id)
      if (card.rawHazards) {
        card.rawHazards.forEach(rh => newlyRegisteredIds.add(rh.id))
      }
    })

    setRegisteredIds(newlyRegisteredIds)
    setIsRegistering(false)
    setShowRegisterModal(false)
    onShowToast(`[HAZARD REGISTERED] ${registeredCount} safety finding(s) registered for site '${site}'.`)
  }

  const handleSaveApiKey = () => {
    const trimmed = keyInput.trim()
    if (trimmed) {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('siteguard_gemini_api_key', trimmed)
      }
      setApiKey(trimmed)
      onShowToast('Gemini Vision API Key saved to browser local session.')
    }
    setShowKeyModal(false)
    setKeyInput('')
  }

  const handleClearApiKey = () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem('siteguard_gemini_api_key')
    }
    setApiKey('')
    setShowKeyModal(false)
    setKeyInput('')
    onShowToast('Gemini API key removed. Reverting to demonstration evaluation mode.')
  }

  // Recommended Safety Checks (Max 3-5 concise action cards)
  const recommendedSafetyChecks = useMemo(() => {
    if (!analysisResults || !analysisResults.hazards) return []
    const hazards = analysisResults.hazards
    const cards = []

    // 1. Workforce presence & PPE check
    const personDetections = hazards.filter(h => {
      const cls = (h.className || '').toLowerCase()
      const name = (h.name || '').toLowerCase()
      return cls === 'person' || name.includes('worker') || name.includes('person')
    })
    if (personDetections.length > 0) {
      const pCount = personDetections.length
      cards.push({
        id: 'check-personnel',
        title: `Workforce PPE & Access Protocol (${pCount} ${pCount === 1 ? 'person' : 'workers'})`,
        explanation: `${pCount} worker(s) identified in visual field. Pretrained model confirms presence but cannot verify hard hats, protective eyewear, or high-vis vests.`,
        action: 'Conduct physical spot-check for OSHA 1926.100 PPE compliance and active zone permit.',
        category: 'PPE & Personnel',
        severity: 'Medium',
        isOrdinaryObject: false,
        rawHazards: personDetections
      })
    }

    // 2. Heavy Vehicles & Equipment Check
    const vehicleClasses = ['truck', 'bus', 'car', 'train', 'motorcycle']
    const vehicleDetections = hazards.filter(h => {
      const cls = (h.className || '').toLowerCase()
      const cat = (h.category || '').toLowerCase()
      return vehicleClasses.includes(cls) || (cat.includes('equipment') && !cls.includes('person'))
    })
    if (vehicleDetections.length > 0) {
      const vNames = [...new Set(vehicleDetections.map(v => v.className || 'vehicle'))].join(', ')
      cards.push({
        id: 'check-vehicles',
        title: `Vehicle & Machinery Transit Corridor (${vNames})`,
        explanation: `Active mobile equipment or transport vehicles detected within the visual sector.`,
        action: 'Verify pedestrian barricades, audible backup alarms, and designated spotter coverage.',
        category: 'Equipment hazard',
        severity: 'High',
        isOrdinaryObject: false,
        rawHazards: vehicleDetections
      })
    }

    // 3. Domain-Specific Construction Hazards (from Live Gemini or Presets)
    const specificHazards = hazards.filter(h => {
      const cls = (h.className || '').toLowerCase()
      const cat = (h.category || '').toLowerCase()
      const name = (h.name || '').toLowerCase()
      return !cls.includes('person') && !vehicleClasses.includes(cls) &&
        (cat.includes('fall') || cat.includes('excavation') || cat.includes('scaffold') || cat.includes('electrical') || name.includes('edge') || name.includes('trench') || name.includes('shoring') || name.includes('guardrail'))
    })

    specificHazards.forEach((h, idx) => {
      if (cards.length < 4) {
        const cleanExpl = h.explanation ? h.explanation.split('.')[0] + '.' : 'Inspection flagged safety non-compliance.'
        cards.push({
          id: `check-hazard-${h.id || idx}`,
          title: h.name,
          explanation: cleanExpl,
          action: h.recommendation || 'Inspect sector and remediate hazard per site safety protocol.',
          category: h.category || 'Site Safety',
          severity: h.severity || 'Medium',
          isOrdinaryObject: false,
          rawHazards: [h]
        })
      }
    })

    // 4. Ordinary COCO objects requiring contextual review (laptops, chairs, TVs, keyboards, etc.)
    const ordinaryClasses = [
      'chair', 'sofa', 'couch', 'tv', 'laptop', 'keyboard', 'mouse', 'cell phone',
      'bottle', 'cup', 'book', 'clock', 'potted plant', 'backpack', 'handbag',
      'dining table', 'sink', 'refrigerator', 'microwave', 'oven', 'toaster', 'bowl'
    ]
    const ordinaryDetections = hazards.filter(h => {
      const cls = (h.className || '').toLowerCase()
      return ordinaryClasses.includes(cls) || h.category === 'Housekeeping & Staging' || (h.name && h.name.includes('Staging Material'))
    })

    if (ordinaryDetections.length > 0 && cards.length < 5) {
      const distinctNames = [...new Set(ordinaryDetections.map(d => d.className || 'object'))]
      cards.push({
        id: 'check-contextual',
        title: `Contextual Review: Peripheral Items (${distinctNames.slice(0, 3).join(', ')})`,
        explanation: `Identified common objects (${distinctNames.join(', ')}). Ordinary items are not inherent construction hazards, but require contextual review to ensure pathways remain clear.`,
        action: 'Confirm items do not obstruct designated emergency egress corridors or electrical panels.',
        category: 'Contextual Review',
        severity: 'Low',
        isOrdinaryObject: true,
        rawHazards: ordinaryDetections
      })
    }

    // 5. Any remaining hazards up to 5
    hazards.forEach((h, idx) => {
      if (cards.length < 5 && !cards.some(c => c.rawHazards?.some(rh => rh.id === h.id))) {
        cards.push({
          id: `check-other-${h.id || idx}`,
          title: h.name,
          explanation: h.explanation ? h.explanation.split('.')[0] + '.' : 'Observed scene element requiring attention.',
          action: h.recommendation || 'Verify item placement against site housekeeping plan.',
          category: h.category || 'General',
          severity: h.severity || 'Low',
          isOrdinaryObject: false,
          rawHazards: [h]
        })
      }
    })

    return cards.slice(0, 5)
  }, [analysisResults])

  // Automatically select un-registered safety checks when new results arrive
  useEffect(() => {
    if (recommendedSafetyChecks.length > 0) {
      const unreg = recommendedSafetyChecks
        .filter(c => !c.rawHazards?.every(rh => registeredIds.has(rh.id)))
        .map(c => c.id)
      setSelectedFindingIds(new Set(unreg))
    } else {
      setSelectedFindingIds(new Set())
    }
  }, [recommendedSafetyChecks, registeredIds])

  // Metrics for Compact Summary
  const hazardsList = analysisResults?.hazards || []
  const peopleCount = hazardsList.filter(h => {
    const cls = (h.className || '').toLowerCase()
    const name = (h.name || '').toLowerCase()
    return cls === 'person' || name.includes('worker') || name.includes('person')
  }).length

  const otherCount = Math.max(0, (analysisResults?.detectionsCount ?? hazardsList.length) - peopleCount)

  let reviewStatus = 'Nominal / Baseline'
  let reviewStatusBadge = 'low'
  let reviewStatusDesc = 'No immediate hazards flagged'

  if (hazardsList.some(h => (h.severity || '').toLowerCase() === 'critical')) {
    reviewStatus = 'Action Required'
    reviewStatusBadge = 'critical'
    reviewStatusDesc = 'High-risk condition observed'
  } else if (hazardsList.some(h => (h.severity || '').toLowerCase() === 'high')) {
    reviewStatus = 'Action Required'
    reviewStatusBadge = 'high'
    reviewStatusDesc = 'Safety controls verification needed'
  } else if (peopleCount > 0) {
    reviewStatus = 'Review Recommended'
    reviewStatusBadge = 'medium'
    reviewStatusDesc = 'Personnel present; verify PPE & permits'
  } else if (otherCount > 0) {
    reviewStatus = 'Contextual Review'
    reviewStatusBadge = 'low'
    reviewStatusDesc = 'Scene objects detected'
  }

  const registrableCards = recommendedSafetyChecks.filter(
    c => !c.rawHazards?.every(rh => registeredIds.has(rh.id))
  )
  const registrableCount = registrableCards.length

  return (
    <div className="view-module-container animate-entrance">
      {/* Hero Strip */}
      <div className="view-hero-panel">
        <div>
          <div className="view-hero-title">Construction Photo Risk Analyzer</div>
          <div className="view-hero-desc">
            Computer vision incident detection scanning jobsite imagery for OSHA 1926 infractions, missing PPE, leading edge fall vectors, and shoring risks.
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="view-hero-btn"
            style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-medium)', color: '#ffffff' }}
            onClick={() => onNavigate('Dashboard')}
          >
            &larr; Return to Dashboard
          </button>
          <button
            type="button"
            className="view-hero-btn"
            onClick={() => {
              setKeyInput(apiKey)
              setShowKeyModal(true)
            }}
          >
            {isLiveConfigured ? '⚙ Manage Vision API Key' : '🔑 Configure Vision AI Key'}
          </button>
        </div>
      </div>

      {/* Provider Status & Transparency Strip */}
      <div className="analyzer-config-banner">
        <div className="analyzer-config-left">
          <span className={`analyzer-mode-indicator ${apiStatus === 'connected' ? 'live' : isLiveConfigured ? 'live' : 'demo'}`}>
            <span className="badge-dot" style={{ background: apiStatus === 'connected' || isLiveConfigured ? 'var(--color-low)' : 'var(--color-medium)' }} />
            {apiStatus === 'connected'
              ? 'YOLOv8 COMPUTER VISION ACTIVE (Local Backend)'
              : isLiveConfigured
              ? 'LIVE VISION AI CONFIGURED (Gemini 1.5 Flash)'
              : 'DEMONSTRATION EVALUATION MODE'}
          </span>
          <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
            {apiStatus === 'connected'
              ? `Real local YOLOv8 inference active (${visionStatus?.model || 'YOLOv8n COCO-80'}). Directly detects objects and draws verification bounding boxes on uploaded image pixels.`
              : isLiveConfigured
              ? 'Real-time cloud multimodal image analysis active. Image bytes transmitted directly over secure HTTPS to Gemini API.'
              : 'No external API key or local YOLO pipeline detected. Uploads and sample scenarios execute against documented deterministic demonstration rules.'}
          </span>
        </div>
        <button
          type="button"
          className="table-action-cyber-btn"
          onClick={() => {
            setKeyInput(apiKey)
            setShowKeyModal(true)
          }}
        >
          {isLiveConfigured ? 'Gemini Key (Configured)' : 'Cloud AI Options +'}
        </button>
      </div>

      {/* Upload Stage / Preview Grid */}
      <div className="command-grid-2col" style={{ alignItems: 'start' }}>
        {/* Left Column: Image Ingestion & Dropzone */}
        <div className="cyber-panel">
          <div className="panel-header-row">
            <div className="panel-title-group">
              <div className="panel-icon-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </div>
              <span className="panel-heading">Jobsite Photo Intake</span>
            </div>
            {previewUrl && (
              <button
                type="button"
                className="table-action-cyber-btn"
                onClick={handleRemoveImage}
                title="Remove current image"
              >
                Clear Photo &times;
              </button>
            )}
          </div>

          {/* Construction Site Scope Selector for this Photo */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              TARGET CONSTRUCTION SITE:
            </label>
            <select
              className="site-selector-dropdown"
              style={{ width: '100%', height: '38px', padding: '0 12px' }}
              value={site}
              onChange={(e) => setSite(e.target.value)}
            >
              {allSites.map(s => (
                <option key={s.id} value={s.name}>{s.name} ({s.zone})</option>
              ))}
            </select>
          </div>

          {/* File Input (Hidden) */}
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept="image/jpeg,image/png,image/webp,image/jpg"
            onChange={handleFileInputChange}
          />

          {!previewUrl ? (
            /* Dropzone Empty State */
            <div
              className={`analyzer-dropzone ${dragActive ? 'drag-active' : ''}`}
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="dropzone-inner">
                <div className="dropzone-icon-ring">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff' }}>
                  Click to Browse or Drag Construction Photo Here
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Supports high-resolution JPG, JPEG, PNG, or WEBP (Max 10 MB)
                </div>
                <div className="analyzer-meta-pills" style={{ justifyContent: 'center' }}>
                  <span className="analyzer-meta-chip">OSHA 1926 PPE</span>
                  <span className="analyzer-meta-chip">Leading Edges</span>
                  <span className="analyzer-meta-chip">Trench Shoring</span>
                  <span className="analyzer-meta-chip">Crane Rigging</span>
                </div>
              </div>

              {/* Sample Presets for Quick Testing */}
              <div className="analyzer-sample-strip" onClick={(e) => e.stopPropagation()}>
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', textAlign: 'left' }}>
                  OR LOAD PRE-PACKAGED SAFETY SCENARIO:
                </span>
                <div className="sample-pills-row">
                  {SAMPLE_PRESETS.map((scenario) => (
                    <button
                      key={scenario.id}
                      type="button"
                      className="sample-scenario-btn"
                      onClick={() => handleSelectPreset(scenario)}
                    >
                      {scenario.title.split(' - ')[1] || scenario.title}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Active Photo Preview Card */
            <div>
              <div className="analyzer-img-frame">
                <img
                  src={showAnnotated && annotatedUrl ? annotatedUrl : previewUrl}
                  alt="Jobsite preview for safety inspection"
                  className="analyzer-preview-img"
                />
                {isAnalyzing && <div className="analyzer-scan-line" />}
              </div>

              {annotatedUrl && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--cyan-primary)', fontFamily: 'var(--font-mono)' }}>
                    {showAnnotated ? '● Bounding Box Overlay Active' : '○ Original Uploaded Photo'}
                  </span>
                  <button
                    type="button"
                    className="table-action-cyber-btn"
                    onClick={() => setShowAnnotated(!showAnnotated)}
                    style={{ fontSize: '11px', padding: '3px 8px' }}
                  >
                    {showAnnotated ? 'View Original Photo' : 'View Annotated Boxes'}
                  </button>
                </div>
              )}

              <div className="analyzer-meta-pills">
                <span className="analyzer-meta-chip">FILE: {imageMeta?.name || 'capture.jpg'}</span>
                <span className="analyzer-meta-chip">SIZE: {imageMeta?.sizeFormatted || '1.8 MB'}</span>
                <span className="analyzer-meta-chip">FORMAT: {imageMeta?.type?.toUpperCase() || 'IMAGE'}</span>
                <span className="analyzer-meta-chip" style={{ color: 'var(--cyan-primary)' }}>SITE: {site}</span>
              </div>

              {/* Action Buttons */}
              <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="view-hero-btn"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={handleAnalyzePhoto}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <>
                      <span className="sweep-spinner" />
                      Running Real Computer Vision Inference...
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      {selectedImageFile && apiStatus === 'connected'
                        ? 'Analyze with YOLOv8 Computer Vision'
                        : isLiveConfigured
                        ? 'Analyze with Gemini Vision AI'
                        : 'Analyze Photo (Demo Mode)'}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="table-action-cyber-btn"
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  disabled={isAnalyzing}
                >
                  Replace
                </button>
              </div>
            </div>
          )}

          {/* Validation or API Error Banner */}
          {analysisError && (
            <div style={{ marginTop: '16px', padding: '12px 14px', background: 'rgba(255, 51, 102, 0.1)', border: '1px solid var(--color-critical)', borderRadius: '8px', color: '#ff8099', fontSize: '12px' }}>
              ⚠️ {analysisError}
            </div>
          )}

          {/* Mandatory Professional Notice */}
          <div className="analyzer-disclaimer-strip" style={{ marginTop: '16px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-high)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>
              <strong>Professional Safety Notice:</strong> This prototype analyzer is an automated decision-support heuristic. It does NOT replace an official physical site inspection by an authorized OSHA Competent Person.
            </span>
          </div>
        </div>

        {/* Right Column: Analysis Results & Detected Hazards */}
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
              <span className="panel-heading">Inspection Findings &amp; Safety Checks</span>
            </div>
            {analysisResults && (
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                {analysisResults.timestamp}
              </span>
            )}
          </div>

          {!analysisResults ? (
            /* Empty Prompt */
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-dim)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff', marginBottom: '4px' }}>
                Awaiting Photo Analysis
              </div>
              <div style={{ fontSize: '12px', maxWidth: '340px', margin: '0 auto', lineHeight: 1.5 }}>
                Upload a construction photograph or select a sample scenario on the left, then trigger analysis to view recommended safety checks, workforce counts, and actionable findings.
              </div>
            </div>
          ) : (
            /* Redesigned Populated Results View */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Visual Risk Indicator Hero Panel */}
              {(() => {
                const scoreVal = typeof analysisResults.score === 'number' ? Math.round(analysisResults.score) : 0
                const riskBand = getRiskBand(scoreVal)
                const radius = 48
                const circumference = 2 * Math.PI * radius
                const strokeOffset = circumference - (scoreVal / 100) * circumference

                return (
                  <div className="analyzer-risk-indicator-panel">
                    {/* Left: Circular Progress Ring */}
                    <div className="analyzer-ring-container">
                      <svg className="analyzer-progress-ring" width="124" height="124" viewBox="0 0 124 124">
                        <circle
                          className="analyzer-ring-track"
                          cx="62"
                          cy="62"
                          r={radius}
                          strokeWidth="10"
                        />
                        <circle
                          className="analyzer-ring-fill"
                          cx="62"
                          cy="62"
                          r={radius}
                          strokeWidth="10"
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeOffset}
                          style={{ stroke: riskBand.color }}
                        />
                      </svg>
                      <div className="analyzer-ring-content">
                        <span className="analyzer-ring-pct" style={{ color: riskBand.color }}>
                          {scoreVal}%
                        </span>
                        <span className="analyzer-ring-label">RISK INDEX</span>
                      </div>
                    </div>

                    {/* Right: Score Label, Explanation & Advisory Clarification */}
                    <div className="analyzer-risk-details">
                      <div className="analyzer-risk-header">
                        <div
                          className="analyzer-risk-tier-badge"
                          style={{
                            borderColor: riskBand.color,
                            color: riskBand.color,
                            background: `color-mix(in srgb, ${riskBand.color} 14%, transparent)`
                          }}
                        >
                          <span className="badge-dot" style={{ background: riskBand.color }} />
                          {riskBand.label} Risk Tier ({riskBand.min}–{riskBand.max}%)
                        </div>
                        <span className="analyzer-risk-advisory-pill">
                          Advisory Heuristic &bull; Non-OSHA Standard
                        </span>
                      </div>

                      {/* 1 Simple Sentence Explaining the Score */}
                      <div className="analyzer-risk-explanation">
                        {riskBand.explanation}
                      </div>

                      {/* Clear Distinction: Preliminary Risk Score != Probability of Accident */}
                      <div className="analyzer-risk-disclaimer">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="16" x2="12" y2="12" />
                          <line x1="12" y1="8" x2="12.01" y2="8" />
                        </svg>
                        <span>
                          <strong>Preliminary Risk Score:</strong> This index reflects observed visual hazard severity in the photo. It is <em>not</em> a validated statistical probability or likelihood of an accident occurring.
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* 1. Compact Summary Strip */}
              <div className="analyzer-compact-summary-row">
                <div className="analyzer-compact-stat">
                  <span className="analyzer-compact-label">People Detected</span>
                  <span className="analyzer-compact-val" style={{ color: peopleCount > 0 ? 'var(--cyan-primary)' : 'var(--text-muted)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    {peopleCount}
                  </span>
                  <span className="analyzer-compact-sub">
                    {peopleCount === 1 ? '1 worker identified' : `${peopleCount} workers in visual field`}
                  </span>
                </div>

                <div className="analyzer-compact-stat">
                  <span className="analyzer-compact-label">Other Objects Detected</span>
                  <span className="analyzer-compact-val" style={{ color: otherCount > 0 ? '#ffffff' : 'var(--text-muted)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                    </svg>
                    {otherCount}
                  </span>
                  <span className="analyzer-compact-sub">
                    {otherCount > 0 ? 'Equipment, staging, or peripheral' : 'No peripheral items flagged'}
                  </span>
                </div>

                <div className="analyzer-compact-stat">
                  <span className="analyzer-compact-label">Overall Review Status</span>
                  <span className="analyzer-compact-val">
                    <span className={`cyber-badge ${reviewStatusBadge}`}>
                      <span className="badge-dot" />
                      {reviewStatus}
                    </span>
                  </span>
                  <span className="analyzer-compact-sub">
                    {reviewStatusDesc}
                  </span>
                </div>
              </div>

              {/* 2. YOLOv8 COCO-80 Model Scope Notice */}
              <div className="analyzer-model-notice">
                <div className="analyzer-model-notice-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                </div>
                <div className="analyzer-model-notice-content">
                  <span className="analyzer-model-notice-title">YOLOv8 COCO-80 Model Scope Notice:</span>
                  <span className="analyzer-model-notice-body">
                    The current pretrained YOLOv8 COCO-80 model detects general everyday objects and confirms physical presence. It <strong>cannot</strong> verify hard hats, reflective safety vests, fall protection harnesses, or structural safety. Physical inspection by a certified safety officer is required.
                  </span>
                </div>
              </div>

              {/* 3. Recommended Safety Checks (Max 3-5 concise action cards) */}
              <div className="safety-checks-section">
                <div className="safety-checks-header-row">
                  <div className="safety-checks-title-group">
                    <span className="safety-checks-heading">
                      Recommended Safety Checks
                      <span className="analyzer-meta-chip" style={{ fontSize: '10px' }}>
                        {recommendedSafetyChecks.length} Recommended
                      </span>
                    </span>
                    <span className="safety-checks-subheading">
                      Concise action items derived from detected personnel and scene elements (Max 3–5 items)
                    </span>
                  </div>

                  {recommendedSafetyChecks.length > 0 && (
                    <button
                      type="button"
                      className="view-hero-btn"
                      onClick={() => setShowRegisterModal(true)}
                      disabled={registrableCount === 0 || selectedFindingIds.size === 0}
                      style={{ padding: '7px 14px', fontSize: '12px' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      Review and Register Hazards ({selectedFindingIds.size})
                    </button>
                  )}
                </div>

                {/* Selection Toolbar */}
                {recommendedSafetyChecks.length > 0 && registrableCount > 0 && (
                  <div className="safety-checks-toolbar">
                    <label className="custom-checkbox-label">
                      <input
                        type="checkbox"
                        className="custom-checkbox-input"
                        checked={selectedFindingIds.size > 0 && selectedFindingIds.size === registrableCount}
                        onChange={toggleSelectAll}
                      />
                      <span>Select all findings for registration ({selectedFindingIds.size}/{registrableCount} selected)</span>
                    </label>
                    <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                      Target site: <strong style={{ color: '#ffffff' }}>{site}</strong>
                    </span>
                  </div>
                )}

                {/* Safety Check Cards List */}
                {recommendedSafetyChecks.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid var(--color-low)', borderRadius: '8px', color: '#6ee7b7', fontSize: '12.5px' }}>
                    ✓ <strong>Nominal Jobsite Baseline:</strong> No immediate safety checks or risk vectors flagged in this photo.
                  </div>
                ) : (
                  recommendedSafetyChecks.map((card) => {
                    const isAllRegistered = card.rawHazards && card.rawHazards.length > 0
                      ? card.rawHazards.every(h => registeredIds.has(h.id))
                      : registeredIds.has(card.id)
                    const isSelected = selectedFindingIds.has(card.id)
                    const sevClass = card.isOrdinaryObject ? 'contextual' : (card.severity || 'low').toLowerCase()

                    return (
                      <div key={card.id} className={`safety-check-card ${sevClass}`}>
                        <div className="safety-check-card-header">
                          <div className="safety-check-card-title-wrap">
                            {!isAllRegistered ? (
                              <input
                                type="checkbox"
                                className="custom-checkbox-input"
                                checked={isSelected}
                                onChange={() => toggleFindingSelection(card.id)}
                                title="Select to register as hazard"
                                aria-label={`Select ${card.title}`}
                              />
                            ) : (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--emerald-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                            <div className="safety-check-card-title">{card.title}</div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            {card.isOrdinaryObject ? (
                              <span className="cyber-badge" style={{ background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.3)' }}>
                                Contextual Object
                              </span>
                            ) : (
                              <span className={`cyber-badge ${sevClass}`}>
                                {card.severity}
                              </span>
                            )}
                            {isAllRegistered && (
                              <span style={{ fontSize: '11px', color: 'var(--emerald-light)', fontWeight: 600 }}>
                                ✓ Registered
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="safety-check-card-expl">
                          {card.explanation}
                        </div>

                        {card.action && (
                          <div className="safety-check-card-action">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
                              <polyline points="9 11 12 14 22 4" />
                              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                            </svg>
                            <div>
                              <strong>Next Action:</strong> {card.action}
                            </div>
                          </div>
                        )}

                        <div className="safety-check-card-footer">
                          <span>Category: <strong>{card.category}</strong></span>
                          <span>Site: <strong>{site}</strong></span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* 4. Collapsible Technical Details Section */}
              <div className="analyzer-tech-details-container">
                <button
                  type="button"
                  className="analyzer-tech-toggle-btn"
                  onClick={() => setShowTechDetails(!showTechDetails)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="16 18 22 12 16 6" />
                      <polyline points="8 6 2 12 8 18" />
                    </svg>
                    <span style={{ fontWeight: 600 }}>Technical Details &amp; Computer Vision Diagnostics</span>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--cyan-primary)' }}>
                    {showTechDetails ? '▲ Hide Technical Details' : '▼ View Technical Details'}
                  </span>
                </button>

                {showTechDetails && (
                  <div className="analyzer-tech-content">
                    <div className="analyzer-tech-grid">
                      <div className="tech-metric-card">
                        <span className="tech-metric-label">Inference Engine</span>
                        <span className="tech-metric-val">{analysisResults.provider || (analysisResults.mode === 'yolo' ? 'YOLOv8n (Local)' : 'Demo Engine')}</span>
                      </div>
                      <div className="tech-metric-card">
                        <span className="tech-metric-label">Inference Latency</span>
                        <span className="tech-metric-val">{analysisResults.inferenceTimeMs ? `${analysisResults.inferenceTimeMs} ms` : '45 ms (Est.)'}</span>
                      </div>
                      <div className="tech-metric-card">
                        <span className="tech-metric-label">Confidence Cutoff</span>
                        <span className="tech-metric-val">0.25 (25% Threshold)</span>
                      </div>
                      <div className="tech-metric-card">
                        <span className="tech-metric-label">Total Detections</span>
                        <span className="tech-metric-val">{analysisResults.detectionsCount ?? hazardsList.length}</span>
                      </div>
                    </div>

                    {/* Raw Detections & Bounding Boxes Table */}
                    <div style={{ marginTop: '4px' }}>
                      <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', marginBottom: '6px' }}>
                        RAW DETECTIONS &amp; BOUNDING BOX COORDINATES:
                      </div>
                      {hazardsList.length === 0 ? (
                        <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>No object bounding boxes recorded.</div>
                      ) : (
                        <div className="table-wrapper" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                          <table className="enterprise-table" style={{ fontSize: '11.5px' }}>
                            <thead>
                              <tr>
                                <th>Object Class</th>
                                <th>Confidence</th>
                                <th>Bounding Box [x1, y1, x2, y2]</th>
                                <th>Sector Location</th>
                              </tr>
                            </thead>
                            <tbody>
                              {hazardsList.map((h, i) => (
                                <tr key={h.id || i}>
                                  <td><code>{h.className || h.name}</code></td>
                                  <td>
                                    {h.confidence !== null && h.confidence !== undefined
                                      ? `${(h.confidence * 100).toFixed(1)}%`
                                      : 'N/A (Demo)'}
                                  </td>
                                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px' }}>
                                    {h.bbox && Array.isArray(h.bbox) ? `[${h.bbox.join(', ')}]` : 'N/A'}
                                  </td>
                                  <td>{h.location || 'Visual field'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Scoring Methodology Breakdown */}
                    <div style={{ fontSize: '11.5px', color: 'var(--text-dim)', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px', lineHeight: 1.5 }}>
                      <strong>Scoring Methodology:</strong> Weighted Risk Score calculated as <code>min(100, &sum; Severity Weights)</code> where Critical = 40 pts, High = 25 pts, Medium = 12 pts, Low = 5 pts.
                      <div style={{ marginTop: '4px' }}>
                        <strong>Risk Classification Bands:</strong> 0–29% Low &bull; 30–59% Medium &bull; 60–79% High &bull; 80–100% Very High (Configurable decision-support heuristics; not official OSHA standards).
                      </div>
                      {analysisResults.summary && (
                        <div style={{ marginTop: '4px' }}>
                          <strong>Raw Model Output:</strong> {analysisResults.summary}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Quick Navigation Links */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px', marginTop: '6px' }}>
                <button
                  type="button"
                  className="table-action-cyber-btn"
                  onClick={handleRemoveImage}
                >
                  &larr; Analyze Another Photo
                </button>
                <button
                  type="button"
                  className="view-hero-btn"
                  style={{ padding: '8px 14px' }}
                  onClick={() => onNavigate('Dashboard')}
                >
                  View Active Dashboard Hazards Table &rarr;
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Review & Batch Register Hazards Confirmation Modal */}
      {showRegisterModal && (
        <div className="kpi-modal-overlay" onClick={() => setShowRegisterModal(false)} role="dialog" aria-modal="true">
          <div className="kpi-modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
            <div className="kpi-modal-header">
              <div className="kpi-modal-title-row">
                <div className="kpi-modal-title">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--emerald-primary)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 11 12 14 22 4" />
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  </svg>
                  Review and Register Hazards
                </div>
                <div className="kpi-modal-sub">
                  Confirm selected findings before saving to SITEGUARD AI registry for <strong>{site}</strong>
                </div>
              </div>
              <button type="button" className="kpi-modal-close-btn" onClick={() => setShowRegisterModal(false)} aria-label="Close dialog">&times;</button>
            </div>

            <div className="kpi-modal-body">
              <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: 1.5 }}>
                You have selected <strong>{selectedFindingIds.size}</strong> safety finding(s) to register into the central hazard registry. Each entry creates an active incident record and initiates automated alert triage.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto', paddingRight: '4px' }}>
                {recommendedSafetyChecks.filter(c => selectedFindingIds.has(c.id)).map(card => {
                  const sevClass = card.isOrdinaryObject ? 'contextual' : (card.severity || 'low').toLowerCase()
                  return (
                    <div key={card.id} style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '10px 12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff' }}>{card.title}</span>
                        <span className={`cyber-badge ${sevClass}`}>{card.severity}</span>
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                        {card.explanation}
                      </div>
                      <div style={{ fontSize: '11px', color: '#6ee7b7' }}>
                        <strong>Action:</strong> {card.action}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div style={{ marginTop: '16px', padding: '10px 12px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid var(--emerald-dim)', borderRadius: '6px', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                ℹ️ <strong>Target Site:</strong> {site}. Verified hazards are saved to SQLite and synchronized across all active project tables and alerts.
              </div>
            </div>

            <div className="kpi-modal-footer">
              <button
                type="button"
                className="table-action-cyber-btn"
                onClick={() => setShowRegisterModal(false)}
                disabled={isRegistering}
              >
                Cancel
              </button>
              <button
                type="button"
                className="view-hero-btn"
                onClick={handleConfirmBatchRegister}
                disabled={isRegistering || selectedFindingIds.size === 0}
              >
                {isRegistering ? 'Registering Hazards...' : `Confirm & Register (${selectedFindingIds.size}) Hazards`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gemini API Key Configuration Modal */}
      {showKeyModal && (
        <div className="kpi-modal-overlay" onClick={() => setShowKeyModal(false)} role="dialog" aria-modal="true">
          <div className="kpi-modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="kpi-modal-header">
              <div className="kpi-modal-title-row">
                <div className="kpi-modal-title">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--cyan-primary)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  Configure Google Gemini Vision API Key
                </div>
                <div className="kpi-modal-sub">
                  Enables real-time multimodal construction hazard detection using Gemini 1.5 Flash
                </div>
              </div>
              <button type="button" className="kpi-modal-close-btn" onClick={() => setShowKeyModal(false)} aria-label="Close dialog">&times;</button>
            </div>

            <div className="kpi-modal-body">
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Enter your Google Gemini API key to enable live computer vision analysis. Keys are stored only in your local browser storage and are never committed to Git or transmitted to any third-party server besides Google's official Gemini endpoint.
              </p>

              <div style={{ marginTop: '8px' }}>
                <label style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--cyan-bright)', display: 'block', marginBottom: '6px' }}>
                  GEMINI API KEY:
                </label>
                <input
                  type="password"
                  className="cyber-search-box"
                  style={{ width: '100%', height: '40px', padding: '0 12px', fontSize: '13px' }}
                  placeholder="AIzaSy..."
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                />
              </div>

              <div style={{ background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '10px 12px', borderRadius: '6px', fontSize: '11px', color: 'var(--text-dim)', lineHeight: 1.5 }}>
                Tip: You can also specify <code>VITE_GEMINI_API_KEY=your_key</code> in <code>frontend/.env</code> to configure it automatically without manual entry.
              </div>
            </div>

            <div className="kpi-modal-footer">
              {apiKey && (
                <button
                  type="button"
                  className="kpi-modal-btn secondary"
                  style={{ color: 'var(--color-critical)' }}
                  onClick={handleClearApiKey}
                >
                  Clear Key
                </button>
              )}
              <button
                type="button"
                className="kpi-modal-btn secondary"
                onClick={() => setShowKeyModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="kpi-modal-btn primary"
                onClick={handleSaveApiKey}
              >
                Save &amp; Activate Live AI
              </button>
            </div>
          </div>
        </div>
      )}
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
function InsuranceRiskView({ selectedSite, hazards = [], alerts = [], onShowToast }) {
  const [simulatedScore, setSimulatedScore] = useState(92)
  const [isExporting, setIsExporting] = useState(false)

  // Calculations based on simulatedScore slider
  const projectedLossRatio = (24 - (simulatedScore - 70) * 0.38).toFixed(1)
  const annualSavings = Math.round(80000 + (simulatedScore - 70) * 2060)
  const riskGrade = simulatedScore >= 90 ? 'AAA' : simulatedScore >= 80 ? 'AA' : 'A'

  const handleExportActuarialPdf = () => {
    try {
      setIsExporting(true)
      generateActuarialInsurancePdf({
        site: selectedSite,
        simulatedScore,
        projectedLossRatio,
        annualSavings,
        riskGrade,
        hazards,
        alerts
      })
      onShowToast(`[DOWNLOAD COMPLETE] Actuarial Dossier PDF generated for ${selectedSite}.`)
    } catch (err) {
      console.error('Actuarial PDF export error:', err)
      onShowToast(`Export error: ${err.message}`)
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportActuarialJson = () => {
    try {
      const dateStamp = getFormattedDateStamp()
      const siteSlug = sanitizeFilenamePart(selectedSite)
      const data = {
        dossierMetadata: {
          system: 'SITEGUARD AI Actuarial Underwriting System',
          targetSite: selectedSite,
          exportedAt: new Date().toISOString(),
          simulatedComplianceScore: `${simulatedScore}%`,
          underwritingGrade: riskGrade,
          disclaimer: 'Actuarial calculations are simulated estimates for demonstration. Not an underwriting insurance contract.'
        },
        actuarialMetrics: {
          projectedLossRatio: `${projectedLossRatio}%`,
          annualPremiumCredit: annualSavings,
          actuarialConfidence: '96.2%',
          benchmarkComparison: '8.2% Below Industry Benchmark (20.6%)'
        },
        riskVectors: [
          { name: 'Scaffolding & Fall Protection Risk', value: '8%', evaluation: 'Optimal' },
          { name: 'Heavy Hoisting & Crane Swing Envelope', value: '18%', evaluation: 'Elevated' },
          { name: 'Excavation Shoring & Trench Subsidence', value: '9%', evaluation: 'Optimal' },
          { name: 'Subcontractor Certification & PPE Protocol', value: '12%', evaluation: 'Moderate' }
        ],
        activeSiteHazardsCount: (hazards || []).filter(h => selectedSite === 'All Sites' || h.site === selectedSite).length
      }
      downloadJsonFile(data, `SITEGUARD_AI_Actuarial_Metrics_${siteSlug}_${dateStamp}.json`)
      onShowToast(`[DOWNLOAD COMPLETE] Actuarial JSON metrics exported for ${selectedSite}.`)
    } catch (err) {
      console.error('Actuarial JSON export error:', err)
      onShowToast(`Export error: ${err.message}`)
    }
  }

  return (
    <div className="view-module-container animate-entrance">
      <div className="view-hero-panel">
        <div>
          <div className="view-hero-title">Actuarial Underwriting &amp; Loss Prevention</div>
          <div className="view-hero-desc">
            Real-time loss ratio forecasting and premium discount qualification derived from agentic safety compliance scores at {selectedSite}.
          </div>
        </div>
        <div className="view-hero-actions">
          <button
            type="button"
            className="view-hero-btn"
            onClick={handleExportActuarialPdf}
            disabled={isExporting}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {isExporting ? 'Generating Dossier...' : 'Export Actuarial Dossier (PDF)'}
          </button>
          <button
            type="button"
            className="view-hero-btn secondary"
            onClick={handleExportActuarialJson}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            Export JSON Data
          </button>
        </div>
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
function ReportsView({ reports, onAddReport, selectedSite, hazards = [], alerts = [], settings = {}, onShowToast }) {
  const [reportFilter, setReportFilter] = useState('All')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const currentReports = reports || INITIAL_REPORTS

  const filteredReports = reportFilter === 'All'
    ? currentReports
    : currentReports.filter(r => r.category === reportFilter)

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
      if (onAddReport) {
        onAddReport(newRep)
      }
      setIsGenerating(false)
      onShowToast(`Generated new risk dossier for ${selectedSite}`)
    }, 700)
  }

  // Real file download handlers
  const handleDownloadReportPdf = (rep) => {
    try {
      setIsExportingPdf(true)
      generateExecutiveReportPdf({
        reportItem: rep,
        site: selectedSite,
        hazards,
        alerts
      })
      onShowToast(`[DOWNLOAD COMPLETE] Official PDF report generated for ${selectedSite}.`)
    } catch (err) {
      console.error('PDF export error:', err)
      onShowToast(`Failed to generate PDF report: ${err.message}`)
    } finally {
      setIsExportingPdf(false)
    }
  }

  const handleDownloadReportJson = (rep) => {
    try {
      exportProjectRiskJson({
        site: selectedSite,
        hazards,
        alerts,
        reports: rep ? [rep] : currentReports,
        settings
      })
      onShowToast(`[DOWNLOAD COMPLETE] Project risk telemetry JSON exported for ${selectedSite}.`)
    } catch (err) {
      console.error('JSON export error:', err)
      onShowToast(`Failed to export JSON report: ${err.message}`)
    }
  }

  const handleDownloadHazardsCsv = () => {
    try {
      exportHazardsCsv({
        site: selectedSite,
        hazards
      })
      onShowToast(`[DOWNLOAD COMPLETE] Site hazards CSV exported for ${selectedSite}.`)
    } catch (err) {
      console.error('CSV export error:', err)
      onShowToast(`Failed to export CSV: ${err.message}`)
    }
  }

  return (
    <div className="view-module-container animate-entrance">
      <div className="view-hero-panel">
        <div>
          <div className="view-hero-title">Executive AI Risk Reports &amp; Dossiers</div>
          <div className="view-hero-desc">
            Automated PDF briefings, CSV logs, and JSON telemetry compiled by the SiteGuard AI deliberation engine for {selectedSite}.
          </div>
        </div>
        <div className="view-hero-actions">
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
          <button
            type="button"
            className="view-hero-btn secondary"
            onClick={() => handleDownloadReportPdf(null)}
            disabled={isExportingPdf}
            title="Download executive safety summary PDF for selected site"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {isExportingPdf ? 'Exporting...' : 'Download Site PDF'}
          </button>
          <button
            type="button"
            className="view-hero-btn secondary"
            onClick={handleDownloadHazardsCsv}
            title="Export CSV spreadsheet of active hazards"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
            Export Hazards CSV
          </button>
          <button
            type="button"
            className="view-hero-btn secondary"
            onClick={() => handleDownloadReportJson(null)}
            title="Export complete telemetry payload as JSON"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
            Export Risk JSON
          </button>
        </div>
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
          <span className="view-stat-value">PDF // CSV // JSON</span>
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
          REAL-TIME COMPLIANCE EXPORT ENGINE (PDF // CSV // JSON)
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
              <th>Download File</th>
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
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      className="table-action-cyber-btn"
                      onClick={() => handleDownloadReportPdf(rep)}
                      title={`Download official PDF: ${rep.title}`}
                    >
                      PDF &darr;
                    </button>
                    <button
                      type="button"
                      className="table-action-cyber-btn"
                      style={{ borderColor: 'var(--border-subtle)', background: 'transparent' }}
                      onClick={() => handleDownloadReportJson(rep)}
                      title={`Download JSON telemetry: ${rep.title}`}
                    >
                      JSON &darr;
                    </button>
                  </div>
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
// Sub-View: 7. Safety Alerts Dedicated View
// ============================================================================
function AlertsCenterView({ alerts = [], onDismissAlert, onAcknowledgeAlert, onAcknowledgeAll, onShowToast }) {
  const [filter, setFilter] = useState('All') // 'All' | 'Active' | 'Acknowledged'
  const [showBulkConfirmModal, setShowBulkConfirmModal] = useState(false)

  // Real computed summary counts from actual backend alerts array
  const activeAlerts = alerts.filter(a => (a.status || 'Active').toLowerCase() === 'active')
  const criticalAlerts = alerts.filter(a => {
    const isCritical = (a.type || '').toLowerCase() === 'critical' || (a.severity || '').toLowerCase() === 'critical'
    const isActive = (a.status || 'Active').toLowerCase() === 'active'
    return isCritical && isActive
  })

  // Grounded count of alerts resolved or dismissed today
  const isToday = (dateStr) => {
    if (!dateStr) return false
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return false
      const now = new Date()
      return d.getDate() === now.getDate() &&
             d.getMonth() === now.getMonth() &&
             d.getFullYear() === now.getFullYear()
    } catch (_) {
      return false
    }
  }

  const resolvedTodayAlerts = alerts.filter(a => {
    const s = (a.status || '').toLowerCase()
    if (s !== 'resolved' && s !== 'dismissed') return false
    if (a.updatedAt || a.createdAt) {
      return isToday(a.updatedAt || a.createdAt)
    }
    return true
  })

  const acknowledgedAlerts = alerts.filter(a => (a.status || '').toLowerCase() === 'acknowledged')

  // Filter alerts by user selection
  const filteredAlerts = alerts.filter(a => {
    const status = (a.status || 'Active').toLowerCase()
    if (filter === 'Active') return status === 'active'
    if (filter === 'Acknowledged') return status === 'acknowledged'
    return true // 'All'
  })

  // Format real timestamp from backend if present (no invented dates)
  const formatTime = (alt) => {
    if (alt.createdAt) {
      try {
        const d = new Date(alt.createdAt)
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' at ' +
                 d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })
        }
      } catch (_) {}
    }
    if (alt.time && typeof alt.time === 'string' && alt.time.trim() && alt.time !== 'Just now') {
      return alt.time
    }
    if (alt.time === 'Just now') {
      return 'Just now'
    }
    return null
  }

  // Normalize severity to Critical, High, Medium, or Low
  const getSeverityInfo = (typeOrSeverity) => {
    const raw = String(typeOrSeverity || '').toLowerCase()
    if (raw === 'critical') return { label: 'Critical', cssClass: 'critical' }
    if (raw === 'high') return { label: 'High', cssClass: 'high' }
    if (raw === 'medium') return { label: 'Medium', cssClass: 'medium' }
    return { label: 'Low', cssClass: 'low' }
  }

  const handleConfirmBulkAcknowledge = () => {
    setShowBulkConfirmModal(false)
    if (typeof onAcknowledgeAll === 'function') {
      onAcknowledgeAll()
    } else {
      activeAlerts.forEach(a => onAcknowledgeAlert && onAcknowledgeAlert(a.id))
      onShowToast && onShowToast('All active alerts marked as acknowledged.')
    }
  }

  return (
    <div className="view-module-container animate-entrance">
      {/* Page Header */}
      <div className="safety-alerts-hero">
        <div className="safety-alerts-hero-text">
          <h1 className="safety-alerts-hero-title">Safety Alerts</h1>
          <p className="safety-alerts-hero-subtitle">Review safety issues and take action.</p>
        </div>
        {activeAlerts.length > 0 && (
          <button
            type="button"
            className="safety-alerts-bulk-btn"
            onClick={() => setShowBulkConfirmModal(true)}
            title="Acknowledge all currently active alerts"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>Acknowledge All Active ({activeAlerts.length})</span>
          </button>
        )}
      </div>

      {/* Three Summary Cards */}
      <div className="safety-summary-grid">
        <div className="safety-summary-card">
          <span className="safety-summary-label">Active Alerts</span>
          <span className="safety-summary-value" style={{ color: activeAlerts.length > 0 ? 'var(--color-high)' : 'var(--color-low)' }}>
            {activeAlerts.length}
          </span>
          <span className="safety-summary-note">Alerts requiring attention</span>
        </div>

        <div className="safety-summary-card">
          <span className="safety-summary-label">Critical Alerts</span>
          <span className="safety-summary-value" style={{ color: criticalAlerts.length > 0 ? 'var(--color-critical)' : 'var(--color-low)' }}>
            {criticalAlerts.length}
          </span>
          <span className="safety-summary-note">Urgent safety issues</span>
        </div>

        <div className="safety-summary-card">
          <span className="safety-summary-label">Resolved Today</span>
          <span className="safety-summary-value" style={{ color: 'var(--color-low)' }}>
            {resolvedTodayAlerts.length}
          </span>
          <span className="safety-summary-note">Issues resolved or cleared</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="safety-filter-row">
        <div className="safety-filter-pill-group">
          <button
            type="button"
            className={`safety-filter-pill ${filter === 'All' ? 'active' : ''}`}
            onClick={() => setFilter('All')}
          >
            All ({alerts.length})
          </button>
          <button
            type="button"
            className={`safety-filter-pill ${filter === 'Active' ? 'active' : ''}`}
            onClick={() => setFilter('Active')}
          >
            Active ({activeAlerts.length})
          </button>
          <button
            type="button"
            className={`safety-filter-pill ${filter === 'Acknowledged' ? 'active' : ''}`}
            onClick={() => setFilter('Acknowledged')}
          >
            Acknowledged ({acknowledgedAlerts.length})
          </button>
        </div>
      </div>

      {/* Alert Cards List */}
      <div className="safety-alerts-list">
        {filteredAlerts.length === 0 ? (
          <div className="safety-alerts-empty-state">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--emerald-primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <div className="safety-alerts-empty-title">No alerts found</div>
            <div className="safety-alerts-empty-desc">
              {filter === 'Active'
                ? 'All clear! There are no active safety issues right now.'
                : filter === 'Acknowledged'
                ? 'No alerts have been acknowledged yet.'
                : 'No safety alerts are currently on record.'}
            </div>
          </div>
        ) : (
          filteredAlerts.map((alt) => {
            const sev = getSeverityInfo(alt.severity || alt.type)
            const isAck = (alt.status || '').toLowerCase() === 'acknowledged'
            const timeText = formatTime(alt)

            return (
              <div key={alt.id} className={`safety-alert-card ${sev.cssClass} ${isAck ? 'is-ack' : ''}`}>
                <div className="safety-alert-card-header">
                  <div className="safety-alert-title-wrap">
                    <span className={`safety-alert-severity-badge ${sev.cssClass}`}>
                      {sev.label}
                    </span>
                    <h3 className="safety-alert-title">{alt.title}</h3>
                    {isAck && (
                      <span className="safety-alert-ack-pill">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Acknowledged
                      </span>
                    )}
                  </div>

                  <div className="safety-alert-meta-top">
                    {alt.site && (
                      <span className="safety-alert-site-pill" title="Construction site">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        {alt.site}
                      </span>
                    )}
                    {timeText && (
                      <span className="safety-alert-time-pill" title="Alert time">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        {timeText}
                      </span>
                    )}
                  </div>
                </div>

                <div className="safety-alert-desc">
                  {alt.desc || 'No detailed description provided for this safety issue.'}
                </div>

                <div className="safety-alert-card-footer">
                  <div className="safety-alert-footer-info">
                    {alt.hazardId && (
                      <span className="safety-alert-ref">
                        Hazard ID: {alt.hazardId}
                      </span>
                    )}
                    <span className="safety-alert-status-info">
                      Status: <strong>{alt.status || 'Active'}</strong>
                    </span>
                  </div>

                  <button
                    type="button"
                    className={`safety-alert-action-btn ${isAck ? 'is-ack' : ''}`}
                    onClick={() => onAcknowledgeAlert && onAcknowledgeAlert(alt.id)}
                    title={isAck ? 'Click to mark as active again' : 'Acknowledge this safety alert'}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>{isAck ? 'Acknowledged' : 'Acknowledge'}</span>
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Confirmation Dialog for Bulk Action */}
      {showBulkConfirmModal && typeof document !== 'undefined' && createPortal(
        <div className="kpi-modal-overlay" onClick={() => setShowBulkConfirmModal(false)} role="dialog" aria-modal="true">
          <div className="kpi-modal-dialog" style={{ maxWidth: '460px' }} onClick={(e) => e.stopPropagation()}>
            <div className="kpi-modal-header">
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#ffffff', margin: 0 }}>
                  Confirm Acknowledge All Alerts
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', margin: 0 }}>
                  Bulk action confirmation
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkConfirmModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}
                aria-label="Close"
              >
                &times;
              </button>
            </div>
            <div style={{ padding: '20px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Are you sure you want to acknowledge all <strong>{activeAlerts.length}</strong> active alerts?
              <br /><br />
              This will update their status to <strong>Acknowledged</strong> for site supervisors. Acknowledging alerts will not delete or resolve any incident or hazard records.
            </div>
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: '10px', background: 'rgba(11, 17, 32, 0.4)' }}>
              <button
                type="button"
                className="kpi-modal-btn secondary"
                onClick={() => setShowBulkConfirmModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="kpi-modal-btn primary"
                onClick={handleConfirmBulkAcknowledge}
              >
                Yes, Acknowledge All
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

// ============================================================================
// Sub-View: 8. Settings Dedicated View
// ============================================================================
function SettingsView({ settings, onUpdateSettings, onShowToast, onResetDemoData }) {
  const formState = settings || DEFAULT_SETTINGS

  const handleChange = (key, value) => {
    const updated = { ...formState, [key]: value }
    if (onUpdateSettings) {
      onUpdateSettings(updated)
    }
  }

  const handleSave = () => {
    if (onUpdateSettings) {
      onUpdateSettings(formState)
    }
    onShowToast('Configuration parameters synced to Sentinel edge agents and saved locally.')
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
                Deliberation Polling Frequency: <span style={{ color: 'var(--cyan-primary)', fontWeight: 700 }}>{formState.reasoningFreq}s</span>
              </label>
              <input
                type="range"
                min="1"
                max="60"
                value={formState.reasoningFreq}
                onChange={(e) => handleChange('reasoningFreq', Number(e.target.value))}
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
                Multi-Agent Consensus Threshold: <span style={{ color: 'var(--cyan-primary)', fontWeight: 700 }}>{formState.consensusThreshold}%</span>
              </label>
              <input
                type="range"
                min="70"
                max="99"
                value={formState.consensusThreshold}
                onChange={(e) => handleChange('consensusThreshold', Number(e.target.value))}
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
                  checked={formState.deepReasoning}
                  onChange={(e) => handleChange('deepReasoning', e.target.checked)}
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
                Crane Wind Velocity Cutoff: <span style={{ color: 'var(--cyan-primary)', fontWeight: 700 }}>{formState.windThreshold} km/h</span>
              </label>
              <input
                type="range"
                min="20"
                max="60"
                value={formState.windThreshold}
                onChange={(e) => handleChange('windThreshold', Number(e.target.value))}
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
                Scaffolding Drift Tolerance: <span style={{ color: 'var(--cyan-primary)', fontWeight: 700 }}>{formState.driftThreshold}°</span>
              </label>
              <input
                type="range"
                min="0.01"
                max="0.10"
                step="0.01"
                value={formState.driftThreshold}
                onChange={(e) => handleChange('driftThreshold', Number(e.target.value))}
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
                checked={formState.smsDispatch}
                onChange={(e) => handleChange('smsDispatch', e.target.checked)}
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
                  checked={formState.sirenSimulation}
                  onChange={(e) => handleChange('sirenSimulation', e.target.checked)}
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
                  checked={formState.dailyDigest}
                  onChange={(e) => handleChange('dailyDigest', e.target.checked)}
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
                    className={`cyber-pill-btn ${formState.simSpeed === spd ? 'active' : ''}`}
                    onClick={() => {
                      handleChange('simSpeed', spd)
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
    case 'camera':
    case 'analyzer':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
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
                Open Safety Alerts &rarr;
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
