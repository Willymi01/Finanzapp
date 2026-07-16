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


export function monthsUntilDate(dateString) {
  const now = new Date()
  const target = new Date(`${dateString}T12:00:00`)
  return Math.max(0, (target.getFullYear()-now.getFullYear())*12 + target.getMonth()-now.getMonth())
}

export function savingsRate(state) {
  const income = incomeTotal(state)
  return income > 0 ? Math.max(0, surplus(state)) / income : 0
}

export function currentGoalProgress(state) {
  const current = Number(state.assets.home||0) + Number(state.assets.pension||0)
  return state.project.goal > 0 ? current / state.project.goal : 0
}

export function nextCapitalMilestone(state) {
  const current = Number(state.assets.home||0) + Number(state.assets.pension||0)
  const steps = [25000, 50000, state.project.goal*.75, state.project.goal]
    .filter((value,index,array)=>value>current && array.indexOf(value)===index)
    .sort((a,b)=>a-b)
  const target = steps[0] || state.project.goal
  return { target, remaining: Math.max(0,target-current) }
}

export function planStatus(state) {
  const goalDate = projectedGoalDate(state)
  const target = new Date(`${state.project.target}T12:00:00`)
  if (!goalDate) return { label:'Hinter dem Plan', kind:'warn', months:null }
  const diff = (goalDate.getFullYear()-target.getFullYear())*12 + goalDate.getMonth()-target.getMonth()
  if (diff < 0) return { label:`${Math.abs(diff)} Monate voraus`, kind:'good', months:diff }
  if (diff === 0) return { label:'Genau im Plan', kind:'good', months:0 }
  return { label:`${diff} Monate hinter Plan`, kind:'warn', months:diff }
}

export function coachMessages(state) {
  const messages = []
  const rate = savingsRate(state)
  const status = planStatus(state)
  const extra = additionalMonthlyToGoal(state)
  const monthSaving = plannedSavingForDate(state)
  const milestone = nextCapitalMilestone(state)

  if (rate >= .20) messages.push({type:'good',title:'Starke Sparquote',text:`Aktuell sparst du rechnerisch ${percent(rate)} deines Einkommens.`})
  else if (rate >= .10) messages.push({type:'neutral',title:'Solide Sparquote',text:`Deine aktuelle Sparquote liegt bei ${percent(rate)}.`})
  else messages.push({type:'warn',title:'Sparquote prüfen',text:`Deine aktuelle Sparquote liegt bei ${percent(rate)}.`})

  if (status.kind === 'good') messages.push({type:'good',title:'Zeitplan',text:`Du bist ${status.label.toLowerCase()}.`})
  else messages.push({type:'warn',title:'Zeitplan',text:extra>0?`Mit zusätzlich etwa ${euro(extra)} monatlich würdest du die Ziellücke schließen.`:'Dein Zieltermin sollte überprüft werden.'})

  messages.push({type:'neutral',title:'Dieser Monat',text:`Geplant sind ${euro(monthSaving)} Sparrate.`})
  messages.push({type:'neutral',title:'Nächster Meilenstein',text:`Noch ${euro(milestone.remaining)} bis ${euro(milestone.target)}.`})

  return messages
}


export function budgetBreakdown(state) {
  const groups = {
    Wohnen: 0,
    Auto: 0,
    Versicherungen: 0,
    Lebensmittel: 0,
    Freizeit: 0,
    Kommunikation: 0,
    Vorsorge: 0,
    Sonstiges: 0
  }
  const classify = name => {
    const n = String(name || '').toLowerCase()
    if (/miete|strom|heiz|gez|hausgeld|internet|kabel/.test(n)) return /internet|kabel/.test(n) ? 'Kommunikation' : 'Wohnen'
    if (/auto|kfz|benzin|inspektion/.test(n)) return 'Auto'
    if (/versicherung|haftpflicht|hausrat/.test(n)) return 'Versicherungen'
    if (/lebensmittel/.test(n)) return 'Lebensmittel'
    if (/freizeit|fitness|lotto/.test(n)) return 'Freizeit'
    if (/handy/.test(n)) return 'Kommunikation'
    if (/rente|vorsorge|zahn/.test(n)) return 'Vorsorge'
    return 'Sonstiges'
  }
  state.budget.fixed.forEach(item => {
    groups[classify(item.name)] += Number(item.cost || 0) / Math.max(1, Number(item.factor || 1))
  })
  state.budget.variable.forEach(item => {
    groups[classify(item.name)] += Number(item.amount || 0)
  })
  return Object.entries(groups)
    .map(([label,value]) => ({label,value}))
    .filter(x => x.value > 0)
    .sort((a,b) => b.value-a.value)
}

export function annualStatistics(state) {
  const rows = projection(state)
  const start = new Date(`${state.project.start}T12:00:00`)
  return Array.from({length:5},(_,year)=>{
    const end = rows[(year+1)*12-1]
    const startRow = year===0 ? null : rows[year*12-1]
    const planned = state.monthlySavings[year].reduce((a,b)=>a+Number(b||0),0) + Number(state.assumptions.specialAnnual||0)
    const value = end?.total || 0
    const prior = startRow?.total ?? (Number(state.assets.home||0)+Number(state.assets.pension||0))
    const gain = Math.max(0,value-prior-planned)
    const income = incomeTotal(state)*12*Math.pow(1+state.assumptions.salaryGrowth,year)
    return {
      year: start.getFullYear()+year,
      planned,
      value,
      growth: gain,
      savingsRate: income>0 ? planned/income : 0
    }
  })
}

export function monthlyActualSeries(state) {
  const points = []
  const start = new Date(`${state.project.start}T12:00:00`)
  const base = Number(state.assets.home||0)+Number(state.assets.pension||0)
  points.push({date:start,total:base,type:'start'})
  ;(state.snapshots||[]).forEach(s=>points.push({
    date:new Date(`${s.date}T12:00:00`),
    total:Number(s.home||0)+Number(s.pension||0),
    type:'actual'
  }))
  return points.sort((a,b)=>a.date-b.date)
}

export function monthlyReview(state) {
  const now = new Date()
  const planned = plannedSavingForDate(state,now)
  const current = Number(state.assets.home||0)+Number(state.assets.pension||0)
  const progress = state.project.goal>0 ? current/state.project.goal : 0
  const milestone = nextCapitalMilestone(state)
  return {
    label: now.toLocaleDateString('de-DE',{month:'long',year:'numeric'}),
    planned,
    savingsRate: savingsRate(state),
    current,
    progress,
    nextMilestone: milestone.target,
    remaining: milestone.remaining
  }
}
