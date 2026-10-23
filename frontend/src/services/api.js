/**
 * SITEGUARD AI - Backend REST API Service Client
 * Connects the React frontend to the FastAPI + SQLite backend.
 * Base URL: http://127.0.0.1:8000/api
 */

const rawApiUrl = (
  typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL
) ? String(import.meta.env.VITE_API_URL).trim() : 'http://127.0.0.1:8000/api'

/**
 * Normalizes backend API URL by trimming trailing slashes and ensuring the /api path is present.
 */
function normalizeApiBaseUrl(url) {
  let cleaned = (url || '').replace(/\/+$/, '')
  if (cleaned && !cleaned.endsWith('/api')) {
    cleaned = `${cleaned}/api`
  }
  return cleaned || 'http://127.0.0.1:8000/api'
}

export const API_BASE_URL = normalizeApiBaseUrl(rawApiUrl)

export const TOKEN_STORAGE_KEY = 'siteguard_auth_token'

/**
 * Retrieves the stored JWT authentication token from localStorage.
 */
export function getAuthToken() {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY) || null
  } catch {
    return null
  }
}

/**
 * Stores the JWT authentication token into localStorage.
 */
export function setAuthToken(token) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token)
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY)
    }
  } catch {
    // Ignore localStorage write failures in private browsing
  }
}

/**
 * Clears the stored JWT authentication token.
 */
export function clearAuthToken() {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
  } catch {
    // Ignore
  }
}

/**
 * Handles HTTP response validation and parses JSON payload or structured FastAPI error details.
 * Throws explicit descriptive Error on HTTP non-2xx responses or network failures.
 */
async function handleResponse(res) {
  if (!res.ok) {
    let detail = res.statusText || `HTTP ${res.status}`
    try {
      const errorBody = await res.json()
      if (errorBody && errorBody.detail) {
        detail = typeof errorBody.detail === 'string'
          ? errorBody.detail
          : JSON.stringify(errorBody.detail)
      } else if (errorBody && errorBody.message) {
        detail = errorBody.message
      }
    } catch {
      // Body is not JSON or is empty, retain fallback detail
    }
    const err = new Error(`API Error (${res.status}): ${detail}`)
    err.status = res.status
    if (res.status === 401) {
      clearAuthToken()
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('siteguard:session-expired', { detail: { message: detail } }))
      }
    }
    throw err
  }

  // Handle 204 No Content
  if (res.status === 204) {
    return null
  }

  return res.json()
}

/**
 * Wraps native fetch calls with standard headers, JWT bearer authentication, and robust network failure diagnostics.
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`
  const token = getAuthToken()
  const headers = {
    'Accept': 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers
    })
    return await handleResponse(res)
  } catch (err) {
    // If it's already an API Error with a status code, rethrow directly
    if (err.status) {
      throw err
    }
    // Network failures, connection refused, or DNS resolution issues
    throw new Error(`Network failure connecting to SITEGUARD AI API (${url}): ${err.message}`)
  }
}

// ============================================================================
// Normalizers: Transform backend records into camelCase frontend structures
// ============================================================================

/**
 * Normalizes raw hazard records from backend into the camelCase shape expected by React components.
 * Defensive against both snake_case and camelCase inputs.
 */
export function normalizeHazard(raw) {
  if (!raw || typeof raw !== 'object') {
    return null
  }

  const numericSeverity = Number(raw.numericSeverity ?? raw.numeric_severity ?? 3)
  const numericLikelihood = Number(raw.numericLikelihood ?? raw.numeric_likelihood ?? 3)
  const defaultCalculatedScore = Math.min(100, Math.max(1, numericSeverity * numericLikelihood * 4))

  return {
    id: String(raw.id || ''),
    site: String(raw.site || ''),
    hazard: String(raw.hazard || ''),
    category: String(raw.category || 'General'),
    description: raw.description ? String(raw.description) : undefined,
    severity: String(raw.severity || (defaultCalculatedScore >= 75 ? 'Critical' : defaultCalculatedScore >= 50 ? 'High' : defaultCalculatedScore >= 25 ? 'Medium' : 'Low')),
    priority: String(raw.priority || raw.severity || 'Medium'),
    numericSeverity: numericSeverity,
    numericLikelihood: numericLikelihood,
    riskScore: Number(raw.riskScore ?? raw.risk_score ?? defaultCalculatedScore),
    status: String(raw.status || 'Open'),
    categoryRecommendation: raw.categoryRecommendation ?? raw.category_recommendation ?? '',
    priorityGuidance: raw.priorityGuidance ?? raw.priority_guidance ?? '',
    reportedBy: String(raw.reportedBy ?? raw.reported_by ?? 'Site Supervisor'),
    timestamp: String(raw.timestamp || 'Just now'),
    createdAt: raw.createdAt ?? raw.created_at ?? null,
    updatedAt: raw.updatedAt ?? raw.updated_at ?? null
  }
}

/**
 * Normalizes raw alert records from backend into the camelCase shape expected by React components.
 */
export function normalizeAlert(raw) {
  if (!raw || typeof raw !== 'object') {
    return null
  }

  return {
    id: String(raw.id || ''),
    hazardId: raw.hazardId ?? raw.hazard_id ?? null,
    title: String(raw.title || ''),
    desc: String(raw.desc || ''),
    site: String(raw.site || ''),
    time: String(raw.time || 'Just now'),
    type: String(raw.type || 'medium').toLowerCase(),
    status: String(raw.status || 'Active'),
    category: raw.category ? String(raw.category) : undefined,
    riskScore: raw.riskScore !== undefined ? Number(raw.riskScore) : (raw.risk_score !== undefined ? Number(raw.risk_score) : undefined),
    createdAt: raw.createdAt ?? raw.created_at ?? null,
    updatedAt: raw.updatedAt ?? raw.updated_at ?? null
  }
}

// ============================================================================
// Health Endpoint
// ============================================================================

/**
 * Checks FastAPI backend status and SQLite database connection.
 * @returns {Promise<{ status: string, app: string, database: string, hazards_count: number, alerts_count: number, timestamp: string }>}
 */
export async function checkBackendHealth() {
  return await apiRequest('/health', { method: 'GET' })
}

// ============================================================================
// Hazards Endpoints
// ============================================================================

/**
 * Retrieves all registered construction hazards with optional filtering.
 * @param {Object} [filters] - Optional query filters { site, status, severity, category }
 * @returns {Promise<Array<Object>>} Normalized hazard records
 */
export async function fetchHazards(filters = {}) {
  const params = new URLSearchParams()
  if (filters.site && filters.site !== 'All Sites') {
    params.append('site', filters.site)
  }
  if (filters.status) {
    params.append('status', filters.status)
  }
  if (filters.severity && filters.severity !== 'All') {
    params.append('severity', filters.severity)
  }
  if (filters.category && filters.category !== 'All') {
    params.append('category', filters.category)
  }

  const query = params.toString() ? `?${params.toString()}` : ''
  const data = await apiRequest(`/hazards${query}`, { method: 'GET' })

  if (!Array.isArray(data)) {
    throw new Error('Invalid hazards response: expected an array from backend.')
  }

  return data.map(normalizeHazard)
}

/**
 * Creates and registers a new hazard in the persistent database.
 * @param {Object} hazardData - The hazard payload matching HazardCreate schema
 * @returns {Promise<Object>} The created normalized hazard record
 */
export async function createHazard(hazardData) {
  if (!hazardData || typeof hazardData !== 'object') {
    throw new Error('createHazard requires a valid hazard object.')
  }

  // Map to backend schema with camelCase aliases (supported by populate_by_name)
  const payload = {
    id: hazardData.id || undefined,
    site: hazardData.site,
    hazard: hazardData.hazard,
    category: hazardData.category || 'General',
    numericSeverity: hazardData.numericSeverity !== undefined ? Number(hazardData.numericSeverity) : 3,
    numericLikelihood: hazardData.numericLikelihood !== undefined ? Number(hazardData.numericLikelihood) : 3,
    riskScore: hazardData.riskScore !== undefined ? Number(hazardData.riskScore) : undefined,
    severity: hazardData.severity || undefined,
    priority: hazardData.priority || undefined,
    status: hazardData.status || 'Open',
    categoryRecommendation: hazardData.categoryRecommendation || undefined,
    priorityGuidance: hazardData.priorityGuidance || undefined,
    reportedBy: hazardData.reportedBy || 'Site Supervisor',
    timestamp: hazardData.timestamp || 'Just now'
  }

  const created = await apiRequest('/hazards', {
    method: 'POST',
    body: JSON.stringify(payload)
  })

  return normalizeHazard(created)
}

/**
 * Partially updates an existing hazard record (e.g. status toggle or severity change).
 * @param {string} id - The hazard ID (e.g. HAZ-1082)
 * @param {Object} patchData - Fields to update
 * @returns {Promise<Object>} The updated normalized hazard record
 */
export async function updateHazard(id, patchData) {
  if (!id) {
    throw new Error('updateHazard requires a valid hazard ID.')
  }

  const safeId = encodeURIComponent(String(id).trim())
  const payload = {}

  if (patchData.site !== undefined) payload.site = patchData.site
  if (patchData.hazard !== undefined) payload.hazard = patchData.hazard
  if (patchData.category !== undefined) payload.category = patchData.category
  if (patchData.numericSeverity !== undefined) payload.numericSeverity = Number(patchData.numericSeverity)
  if (patchData.numericLikelihood !== undefined) payload.numericLikelihood = Number(patchData.numericLikelihood)
  if (patchData.riskScore !== undefined) payload.riskScore = Number(patchData.riskScore)
  if (patchData.severity !== undefined) payload.severity = patchData.severity
  if (patchData.priority !== undefined) payload.priority = patchData.priority
  if (patchData.status !== undefined) payload.status = patchData.status
  if (patchData.categoryRecommendation !== undefined) payload.categoryRecommendation = patchData.categoryRecommendation
  if (patchData.priorityGuidance !== undefined) payload.priorityGuidance = patchData.priorityGuidance
  if (patchData.reportedBy !== undefined) payload.reportedBy = patchData.reportedBy
  if (patchData.timestamp !== undefined) payload.timestamp = patchData.timestamp

  const updated = await apiRequest(`/hazards/${safeId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  })

  return normalizeHazard(updated)
}

/**
 * Permanently deletes a hazard from the database.
 * @param {string} id - The hazard ID to delete
 * @returns {Promise<{ status: string, message: string, id: string }>}
 */
export async function deleteHazard(id) {
  if (!id) {
    throw new Error('deleteHazard requires a valid hazard ID.')
  }

  const safeId = encodeURIComponent(String(id).trim())
  return await apiRequest(`/hazards/${safeId}`, {
    method: 'DELETE'
  })
}

// ============================================================================
// Alerts Endpoints
// ============================================================================

/**
 * Retrieves all incident and sensor alerts from the triage queue.
 * @param {Object} [filters] - Optional query filters { site, status, type }
 * @returns {Promise<Array<Object>>} Normalized alert records
 */
export async function fetchAlerts(filters = {}) {
  const params = new URLSearchParams()
  if (filters.site && filters.site !== 'All Sites') {
    params.append('site', filters.site)
  }
  if (filters.status) {
    params.append('status', filters.status)
  }
  if (filters.type && filters.type !== 'all') {
    params.append('type', filters.type.toLowerCase())
  }

  const query = params.toString() ? `?${params.toString()}` : ''
  const data = await apiRequest(`/alerts${query}`, { method: 'GET' })

  if (!Array.isArray(data)) {
    throw new Error('Invalid alerts response: expected an array from backend.')
  }

  return data.map(normalizeAlert)
}

/**
 * Dispatches a new sensor or incident alert into the database triage queue.
 * @param {Object} alertData - The alert payload matching AlertCreate schema
 * @returns {Promise<Object>} The created normalized alert record
 */
export async function createAlert(alertData) {
  if (!alertData || typeof alertData !== 'object') {
    throw new Error('createAlert requires a valid alert object.')
  }

  const payload = {
    id: alertData.id || undefined,
    hazardId: alertData.hazardId || undefined,
    title: alertData.title,
    desc: alertData.desc,
    site: alertData.site,
    time: alertData.time || 'Just now',
    type: (alertData.type || 'medium').toLowerCase(),
    status: alertData.status || 'Active'
  }

  const created = await apiRequest('/alerts', {
    method: 'POST',
    body: JSON.stringify(payload)
  })

  return normalizeAlert(created)
}

/**
 * Partially updates an alert record (e.g. status transition from Active to Acknowledged).
 * @param {string} id - The alert ID (e.g. ALT-401)
 * @param {Object} patchData - Fields to update
 * @returns {Promise<Object>} The updated normalized alert record
 */
export async function updateAlert(id, patchData) {
  if (!id) {
    throw new Error('updateAlert requires a valid alert ID.')
  }

  const safeId = encodeURIComponent(String(id).trim())
  const payload = {}

  if (patchData.title !== undefined) payload.title = patchData.title
  if (patchData.desc !== undefined) payload.desc = patchData.desc
  if (patchData.site !== undefined) payload.site = patchData.site
  if (patchData.hazardId !== undefined) payload.hazardId = patchData.hazardId
  if (patchData.time !== undefined) payload.time = patchData.time
  if (patchData.type !== undefined) payload.type = patchData.type.toLowerCase()
  if (patchData.status !== undefined) payload.status = patchData.status

  const updated = await apiRequest(`/alerts/${safeId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  })

  return normalizeAlert(updated)
}

/**
 * Dismisses or permanently deletes an alert from the triage queue.
 * @param {string} id - The alert ID to delete
 * @returns {Promise<{ status: string, message: string, id: string }>}
 */
export async function deleteAlert(id) {
  if (!id) {
    throw new Error('deleteAlert requires a valid alert ID.')
  }

  const safeId = encodeURIComponent(String(id).trim())
  return await apiRequest(`/alerts/${safeId}`, {
    method: 'DELETE'
  })
}

// ============================================================================
// Computer Vision Endpoints
// ============================================================================

/**
 * Sends an uploaded construction photograph to the backend YOLO computer vision pipeline.
 * @param {File} file - The uploaded image file (JPEG, PNG, WEBP)
 * @param {number} [confidence] - Optional confidence threshold (0.05 - 0.95)
 * @returns {Promise<Object>} Vision analysis results containing real detections, bounding boxes, risk score, and annotated image
 */
export async function analyzePhoto(file, confidence) {
  if (!file) {
    throw new Error('analyzePhoto requires a valid file object.')
  }

  const formData = new FormData()
  formData.append('image', file)

  let url = `${API_BASE_URL}/vision/analyze`
  if (confidence !== undefined && confidence !== null) {
    url += `?confidence=${encodeURIComponent(confidence)}`
  }

  try {
    const token = getAuthToken()
    const headers = {
      'Accept': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
    const res = await fetch(url, {
      method: 'POST',
      body: formData,
      headers
    })
    return await handleResponse(res)
  } catch (err) {
    if (err.status) throw err
    throw new Error(`Network failure connecting to Vision AI API (${url}): ${err.message}`)
  }
}

/**
 * Queries the backend vision pipeline status and model information.
 * @returns {Promise<Object>}
 */
export async function getVisionStatus() {
  return await apiRequest('/vision/status', { method: 'GET' })
}

// ============================================================================
// Authentication Endpoints
// ============================================================================

/**
 * Authenticates user credentials and stores the returned JWT access token.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ access_token: string, token_type: string, expires_in?: number, user: Object }>}
 */
export async function loginUser(email, password) {
  if (!email || !password) {
    throw new Error('Email and password are required.')
  }
  const data = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim(), password })
  })

  const token = data?.access_token || data?.accessToken
  if (token) {
    setAuthToken(token)
    data.access_token = token
    data.accessToken = token
  }

  if (data?.user) {
    data.user.full_name = data.user.full_name || data.user.fullName || 'Safety Officer'
    data.user.fullName = data.user.fullName || data.user.full_name || 'Safety Officer'
  }

  return data
}

/**
 * Registers a new user account, stores the JWT access token, and returns user profile.
 * @param {Object} userData - { email, password, full_name, role }
 * @returns {Promise<{ access_token: string, token_type: string, expires_in?: number, user: Object }>}
 */
export async function registerUser(userData) {
  if (!userData || !userData.email || !userData.password) {
    throw new Error('Email and password are required.')
  }
  const payload = {
    email: userData.email.trim(),
    password: userData.password,
    full_name: userData.fullName || userData.full_name || 'Safety Specialist',
    role: userData.role || 'Safety Officer'
  }
  const data = await apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload)
  })

  const token = data?.access_token || data?.accessToken
  if (token) {
    setAuthToken(token)
    data.access_token = token
    data.accessToken = token
  }

  if (data?.user) {
    data.user.full_name = data.user.full_name || data.user.fullName || 'Safety Officer'
    data.user.fullName = data.user.fullName || data.user.full_name || 'Safety Officer'
  }

  return data
}

/**
 * Fetches the authenticated user profile using current JWT token.
 * @returns {Promise<Object>}
 */
export async function fetchCurrentUser() {
  const token = getAuthToken()
  if (!token) {
    return null
  }
  try {
    const raw = await apiRequest('/auth/me', { method: 'GET' })
    if (!raw) return null
    return {
      id: raw.id,
      email: raw.email,
      fullName: raw.fullName || raw.full_name || 'Safety Officer',
      full_name: raw.full_name || raw.fullName || 'Safety Officer',
      role: raw.role || 'Director of Safety Operations',
      isActive: raw.isActive ?? raw.is_active ?? true
    }
  } catch (err) {
    if (err.status === 401) {
      clearAuthToken()
      return null
    }
    throw err
  }
}

/**
 * Logs out the current session and clears the local JWT token.
 */
export async function logoutUser() {
  try {
    const token = getAuthToken()
    if (token) {
      await apiRequest('/auth/logout', { method: 'POST' }).catch(() => {})
    }
  } finally {
    clearAuthToken()
  }
}
