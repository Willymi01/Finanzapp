export const euro = value => new Intl.NumberFormat('de-DE', {
  style: 'currency', currency: 'EUR', maximumFractionDigits: 0
}).format(Number(value) || 0)

export const percent = value => new Intl.NumberFormat('de-DE', {
  style: 'percent', maximumFractionDigits: 1
}).format(Number(value) || 0)

export const incomeTotal = state => state.budget.income.reduce((s,x) => s + Number(x.amount || 0), 0)
export const fixedTotal = state => state.budget.fixed.reduce((s,x) => s + Number(x.cost || 0) / Math.max(1, Number(x.factor || 1)), 0)
export const variableTotal = state => state.budget.variable.reduce((s,x) => s + Number(x.amount || 0), 0)
export const surplus = state => incomeTotal(state) - fixedTotal(state) - variableTotal(state)

export const addMonths = (date, n) => new Date(date.getFullYear(), date.getMonth() + n, 1)

export const monthStart = date => new Date(date.getFullYear(), date.getMonth(), 1)

export const projectMonthIndex = (state, date = new Date()) => {
  const start = monthStart(new Date(`${state.project.start}T12:00:00`))
  const current = monthStart(date)
  return (current.getFullYear() - start.getFullYear()) * 12 + current.getMonth() - start.getMonth()
}

export const plannedSavingForDate = (state, date = new Date()) => {
  const index = projectMonthIndex(state, date)
  if (index < 0 || index >= 60) return 0
  return Number(state.monthlySavings[Math.floor(index / 12)]?.[index % 12] || 0)
}

export function projection(state) {
  const start = new Date(`${state.project.start}T12:00:00`)
  const snapshots = [...state.snapshots].sort((a,b) => new Date(a.date) - new Date(b.date))
  const latest = snapshots.at(-1)
  let home = latest ? Number(latest.home) : Number(state.assets.home)
  let pension = latest ? Number(latest.pension) : Number(state.assets.pension)
  const baseDate = latest ? new Date(`${latest.date}T12:00:00`) : start
  const rows = []
  for (let i=0; i<60; i++) {
    const date = addMonths(start, i)
    if (date < new Date(baseDate.getFullYear(), baseDate.getMonth(), 1)) {
      rows.push({ date, home: null, pension: null, total: null })
      continue
    }
    if (latest && date.getFullYear() === baseDate.getFullYear() && date.getMonth() === baseDate.getMonth()) {
      rows.push({ date, home, pension, total: home + pension })
      continue
    }
    const monthly = Number(state.monthlySavings[Math.floor(i/12)]?.[i%12] || 0)
    home = home * (1 + state.assumptions.investmentReturn / 12) + monthly
    pension *= (1 + state.assumptions.pensionGrowth / 12)
    if (i % 12 === 11) home += Number(state.assumptions.specialAnnual || 0)
    rows.push({ date, home, pension, total: home + pension })
  }
  return rows
}

export function financing(state) {
  const final = projection(state).filter(x => x.total != null).at(-1)
  const equity = final?.total || state.assets.home + state.assets.pension
  const ancillary = state.project.purchasePrice * state.project.ancillaryRate
  const usable = Math.max(0, equity - state.project.furnishing - state.project.emergencyTarget)
  const need = Math.max(0, state.project.purchasePrice + ancillary - usable)
  const kfw = Math.min(state.assumptions.kfw, need)
  const bank = Math.max(0, need - kfw)
  const rate = kfw * (state.assumptions.kfwInterest + state.assumptions.kfwRepayment) / 12
    + bank * (state.assumptions.bankInterest + state.assumptions.bankRepayment) / 12
  const targetNet = incomeTotal(state) * Math.pow(1 + state.assumptions.salaryGrowth, 5)
  const housing = rate + state.assumptions.ownerCosts + state.assumptions.maintenance
  return { equity, ancillary, usable, need, kfw, bank, rate, targetNet, housing, ratio: housing / targetNet }
}


export function targetDateForAmount(state, targetAmount) {
  const row = projection(state).find(x => x.total != null && x.total >= targetAmount)
  return row?.date || null
}

export function projectedGoalDate(state) {
  return targetDateForAmount(state, state.project.goal)
}

export function additionalMonthlyToGoal(state) {
  const end = new Date(`${state.project.target}T12:00:00`)
  const now = new Date()
  const months = Math.max(1, (end.getFullYear()-now.getFullYear())*12 + end.getMonth()-now.getMonth())
  const final = projection(state).filter(x=>x.total!=null).at(-1)?.total || 0
  return Math.max(0, state.project.goal-final) / months
}

export function timelineMilestones(state) {
  const targets = [
    { label:'25.000 € Eigenkapital', amount:25000 },
    { label:'50 % des Sparziels', amount:state.project.goal*.5 },
    { label:'Kaufnebenkosten erreicht', amount:state.project.purchasePrice*state.project.ancillaryRate },
    { label:'75 % des Sparziels', amount:state.project.goal*.75 },
    { label:'Eigenkapitalziel erreicht', amount:state.project.goal },
  ]
  return targets.map(item => ({...item, date: targetDateForAmount(state,item.amount)}))
}
