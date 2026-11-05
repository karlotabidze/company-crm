const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const SESSION_KEY = 'company-crm-session'

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY)

function headers(token, extra = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${token || SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  }
}

function saveSession(session) {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  else localStorage.removeItem(SESSION_KEY)
}

export function getSession() {
  try {
    const value = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null')
    if (value?.access_token && value?.user) return value
  } catch { /* ignore invalid local session */ }
  return null
}

async function authRequest(path, body, token) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(body),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.msg || data.message || data.error_description || data.error || 'ავტორიზაცია ვერ შესრულდა')
  return data
}

export async function signIn(email, password) {
  const data = await authRequest('token?grant_type=password', { email, password })
  saveSession(data)
  await ensureProfile(data)
  return data
}

export async function signUp(fullName, email, password) {
  const data = await authRequest('signup', {
    email, password,
    data: { full_name: fullName },
  })
  if (data.access_token) {
    saveSession(data)
    await ensureProfile(data)
  }
  return data
}

async function ensureProfile(session) {
  const user = session.user
  if (!user?.id) return
  await request('crm_profiles?on_conflict=id', {
    method: 'POST',
    token: session.access_token,
    body: {
      id: user.id,
      email: user.email || '',
      full_name: user.user_metadata?.full_name || user.email || '',
      role: 'member',
      is_active: true,
    },
    prefer: 'resolution=merge-duplicates,return=minimal',
  })
}

export async function signOut() {
  const session = getSession()
  try {
    if (session?.access_token) await authRequest('logout', {}, session.access_token)
  } finally {
    saveSession(null)
  }
}

export async function request(path, { method = 'GET', body, token, prefer } = {}) {
  const session = getSession()
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: headers(token || session?.access_token, {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(prefer ? { Prefer: prefer } : {}),
    }),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  if (response.status === 204) return null
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const message = data?.message || data?.details || data?.hint || data?.error_description || 'მონაცემების დამუშავება ვერ მოხერხდა'
    throw new Error(message)
  }
  return data
}

export async function loadCrm() {
  const tables = ['crm_profiles','crm_companies','crm_contacts','crm_deals','crm_tasks','crm_activities']
  const results = await Promise.all(tables.map(table => request(`${table}?select=*&order=created_at.desc`)))
  return Object.fromEntries(tables.map((table, index) => [table, results[index] || []]))
}

export async function insertRow(table, values) {
  const rows = await request(`${table}?select=*`, {
    method: 'POST', body: values, prefer: 'return=representation',
  })
  return rows?.[0]
}

export async function updateRow(table, id, values) {
  const rows = await request(`${table}?id=eq.${encodeURIComponent(id)}&select=*`, {
    method: 'PATCH', body: values, prefer: 'return=representation',
  })
  return rows?.[0]
}

export async function deleteRow(table, id) {
  return request(`${table}?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' })
}
