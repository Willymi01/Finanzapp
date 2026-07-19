import { defaultState } from './defaultState'

export const STORAGE_KEY = 'finanzzentrale'
const LEGACY_KEYS = [
  'finanzzentrale_v7','finanzzentrale_v60','finanzzentrale_v51',
  'finanzzentrale_v50','finanzzentrale_v42','finanzzentrale_v41',
  'finanzzentrale_v2','finanzzentrale'
]

const deepMerge = (base, value) => {
  if (Array.isArray(base)) return Array.isArray(value) ? value : base
  if (base && typeof base === 'object') {
    const out = { ...base }
    for (const [key, val] of Object.entries(value || {})) {
      out[key] = key in base ? deepMerge(base[key], val) : val
    }
    return out
  }
  return value ?? base
}

export const normaliseState = value => {
  const merged = deepMerge(structuredClone(defaultState), value || {})
  merged.schemaVersion = 10
  if (merged.assumptions && 'specialAnnual' in merged.assumptions) delete merged.assumptions.specialAnnual
  merged.monthlySavings = Array.from({ length: 5 }, (_, year) =>
    Array.from({ length: 12 }, (_, month) =>
      Number(merged.monthlySavings?.[year]?.[month] ?? [300,450,600,750,900][year])
    )
  )
  for (const group of ['income','fixed','variable','annualIncome','annualExpense']) {
    merged.budget[group] = (merged.budget[group] || []).map(item => ({
      id: item.id || crypto.randomUUID(), ...item
    }))
  }
  merged.snapshots = Array.isArray(merged.snapshots) ? merged.snapshots : []
  merged.specialPayments = Array.isArray(merged.specialPayments) ? merged.specialPayments : []
  merged.properties = Array.isArray(merged.properties) ? merged.properties : []
  merged.documents = Array.isArray(merged.documents) ? merged.documents : []
  merged.housingFinance = merged.housingFinance && typeof merged.housingFinance === 'object' ? merged.housingFinance : { projects: [], activeProjectId: null }
  merged.housingFinance.projects = Array.isArray(merged.housingFinance.projects) ? merged.housingFinance.projects.map(project => ({
    ...project,
    bank: { annualRateIncreasePct: 0, increaseStartYear: 2, maxMonthlyRate: 0, ...(project.bank || {}) },
    kfw: { annualRateIncreasePct: 0, increaseStartYear: 2, maxMonthlyRate: 0, ...(project.kfw || {}) },
    rateChanges: Array.isArray(project.rateChanges) ? project.rateChanges : [],
    extraRepayments: Array.isArray(project.extraRepayments) ? project.extraRepayments : [],
  })) : []
  const activeProjectExists = merged.housingFinance.projects.some(project => project.id === merged.housingFinance.activeProjectId)
  if (!activeProjectExists) merged.housingFinance.activeProjectId = merged.housingFinance.projects[0]?.id || null
  return merged
}

export function loadState() {
  const current = localStorage.getItem(STORAGE_KEY)
  if (current) return normaliseState(JSON.parse(current))
  for (const key of LEGACY_KEYS) {
    const raw = localStorage.getItem(key)
    if (!raw) continue
    try {
      const migrated = normaliseState(JSON.parse(raw))
      localStorage.setItem(`${STORAGE_KEY}_backup_${Date.now()}`, raw)
      saveState(migrated)
      return migrated
    } catch {}
  }
  return normaliseState(defaultState)
}

export function saveState(state) {
  const updated = { ...state, schemaVersion: 10 }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  return updated
}

export function exportState(state) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `finanzzentrale-backup-${new Date().toISOString().slice(0,10)}.json`
  link.click()
  URL.revokeObjectURL(link.href)
}

export async function importState(file) {
  return normaliseState(JSON.parse(await file.text()))
}


export const BACKUP_INDEX_KEY = 'finanzzentrale_backup_index'
const MAX_BACKUPS = 12

export function createLocalBackup(state, reason='Manuelle Sicherung') {
  const id = `finanzzentrale_backup_${Date.now()}`
  const entry = {
    id,
    reason,
    createdAt: new Date().toISOString(),
    schemaVersion: state.schemaVersion || 8
  }
  localStorage.setItem(id, JSON.stringify(state))
  const index = JSON.parse(localStorage.getItem(BACKUP_INDEX_KEY) || '[]')
  const next = [entry, ...index].slice(0, MAX_BACKUPS)
  for (const old of index.slice(MAX_BACKUPS - 1)) localStorage.removeItem(old.id)
  localStorage.setItem(BACKUP_INDEX_KEY, JSON.stringify(next))
  return entry
}

export function listLocalBackups() {
  return JSON.parse(localStorage.getItem(BACKUP_INDEX_KEY) || '[]')
}

export function restoreLocalBackup(id) {
  const raw = localStorage.getItem(id)
  if (!raw) throw new Error('Sicherung nicht gefunden.')
  return normaliseState(JSON.parse(raw))
}

export function deleteLocalBackup(id) {
  localStorage.removeItem(id)
  const index = listLocalBackups().filter(x => x.id !== id)
  localStorage.setItem(BACKUP_INDEX_KEY, JSON.stringify(index))
}

export function clearLocalBackups() {
  for (const entry of listLocalBackups()) localStorage.removeItem(entry.id)
  localStorage.removeItem(BACKUP_INDEX_KEY)
}
