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


export const specialPaymentTotalForDate = (state, date = new Date(), target = null) =>
  (state.specialPayments || [])
    .filter(payment =>
      Number(payment.year) === date.getFullYear()
      && Number(payment.month) === date.getMonth() + 1
      && (!target || payment.target === target)
    )
    .reduce((sum,payment) => sum + Math.max(0,Number(payment.amount || 0)),0)

export const plannedContributionForDate = (state, date = new Date()) =>
  plannedSavingForDate(state,date) + specialPaymentTotalForDate(state,date)

export function projection(state) {
  const start = new Date(`${state.project.start}T12:00:00`)
  const snapshots = [...state.snapshots].sort((a,b) => new Date(a.date) - new Date(b.date))
  const latest = snapshots.at(-1)
  let home = latest ? Number(latest.home) : Number(state.assets.home)
  let pension = latest ? Number(latest.pension) : Number(state.assets.pension)
  let emergency = latest?.emergency != null ? Number(latest.emergency) : Number(state.assets.emergency || 0)
  const baseDate = latest ? new Date(`${latest.date}T12:00:00`) : start
  const rows = []

  const payments = Array.isArray(state.specialPayments) ? state.specialPayments : []

  for (let i=0; i<60; i++) {
    const date = addMonths(start, i)

    if (date < new Date(baseDate.getFullYear(), baseDate.getMonth(), 1)) {
      rows.push({ date, home: null, pension: null, emergency: null, total: null, specialPayments: [] })
      continue
    }

    if (latest && date.getFullYear() === baseDate.getFullYear() && date.getMonth() === baseDate.getMonth()) {
      const monthPayments = payments.filter(p => Number(p.year) === date.getFullYear() && Number(p.month) === date.getMonth() + 1)
      rows.push({ date, home, pension, emergency, total: home + pension, totalWithEmergency: home + pension + emergency, specialPayments: monthPayments })
      continue
    }

    const monthly = Number(state.monthlySavings[Math.floor(i/12)]?.[i%12] || 0)

    home = home * (1 + state.assumptions.investmentReturn / 12) + monthly
    pension = pension * (1 + state.assumptions.pensionGrowth / 12)

    const monthPayments = payments.filter(p => Number(p.year) === date.getFullYear() && Number(p.month) === date.getMonth() + 1)
    for (const payment of monthPayments) {
      const amount = Math.max(0, Number(payment.amount || 0))
      if (payment.target === 'Rente') pension += amount
      else if (payment.target === 'Notgroschen') emergency += amount
      else home += amount
    }

    rows.push({
      date,
      home,
      pension,
      emergency,
      total: home + pension,
      totalWithEmergency: home + pension + emergency,
      specialPayments: monthPayments
    })
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
  const monthSaving = plannedContributionForDate(state)
  const milestone = nextCapitalMilestone(state)

  if (rate >= .20) messages.push({type:'good',title:'Starke Sparquote',text:`Aktuell sparst du rechnerisch ${percent(rate)} deines Einkommens.`})
  else if (rate >= .10) messages.push({type:'neutral',title:'Solide Sparquote',text:`Deine aktuelle Sparquote liegt bei ${percent(rate)}.`})
  else messages.push({type:'warn',title:'Sparquote prüfen',text:`Deine aktuelle Sparquote liegt bei ${percent(rate)}.`})

  if (status.kind === 'good') messages.push({type:'good',title:'Zeitplan',text:`Du bist ${status.label.toLowerCase()}.`})
  else messages.push({type:'warn',title:'Zeitplan',text:extra>0?`Mit zusätzlich etwa ${euro(extra)} monatlich würdest du die Ziellücke schließen.`:'Dein Zieltermin sollte überprüft werden.'})

  messages.push({type:'neutral',title:'Dieser Monat',text:`Geplant sind ${euro(monthSaving)} inklusive Sonderzahlungen.`})
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
    const yearStart = addMonths(start,year*12)
    const yearEnd = addMonths(yearStart,12)
    const special = (state.specialPayments || [])
      .filter(payment => {
        const date = new Date(Number(payment.year),Number(payment.month)-1,1)
        return date >= yearStart && date < yearEnd
      })
      .reduce((sum,payment)=>sum+Math.max(0,Number(payment.amount||0)),0)
    const planned = state.monthlySavings[year].reduce((a,b)=>a+Number(b||0),0) + special
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
  const planned = plannedContributionForDate(state,now)
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


export function simulateAdditionalSaving(state, extraMonthly) {
  const copy = structuredClone(state)
  copy.monthlySavings = copy.monthlySavings.map(row =>
    row.map(value => Number(value || 0) + Number(extraMonthly || 0))
  )
  const goalDate = projectedGoalDate(copy)
  const finalValue = projection(copy).filter(x=>x.total!=null).at(-1)?.total || 0
  return { extraMonthly:Number(extraMonthly||0), goalDate, finalValue }
}

export function returnContribution(state) {
  const withReturns = projection(state).filter(x=>x.total!=null).at(-1)?.total || 0
  const withoutReturns = projection({
    ...state,
    assumptions:{...state.assumptions,investmentReturn:0,pensionGrowth:0}
  }).filter(x=>x.total!=null).at(-1)?.total || 0
  return Math.max(0,withReturns-withoutReturns)
}

export function emergencyMonths(state) {
  const monthlyCosts = fixedTotal(state)+variableTotal(state)
  return monthlyCosts > 0 ? Number(state.assets.emergency||0)/monthlyCosts : 0
}

export function financeCoachAnalysis(state) {
  const progress = currentGoalProgress(state)
  const saveRate = savingsRate(state)
  const fin = financing(state)
  const status = planStatus(state)
  const milestone = nextCapitalMilestone(state)
  const returns = returnContribution(state)
  const reserveMonths = emergencyMonths(state)
  const projected = projection(state).filter(x=>x.total!=null).at(-1)?.total || 0
  const current = Number(state.assets.home||0)+Number(state.assets.pension||0)
  const insights = []

  insights.push({
    type: saveRate >= .20 ? 'good' : saveRate >= .10 ? 'neutral' : 'warn',
    category:'Sparen',
    title:`Sparquote ${percent(saveRate)}`,
    text: saveRate >= .20
      ? 'Deine rechnerische Sparquote ist stark und unterstützt dein Kaufziel.'
      : saveRate >= .10
        ? 'Deine Sparquote ist solide. Kleine Erhöhungen können den Zieltermin verbessern.'
        : 'Deine Sparquote ist niedrig. Prüfe, ob Ausgaben oder Sparrate angepasst werden können.'
  })

  insights.push({
    type: status.kind,
    category:'Zeitplan',
    title:status.label,
    text: status.kind==='good'
      ? 'Deine aktuelle Prognose passt zum geplanten Kaufzeitpunkt.'
      : `Für den Zieltermin fehlen rechnerisch etwa ${euro(additionalMonthlyToGoal(state))} zusätzliche Monatsrate.`
  })

  insights.push({
    type:'neutral',
    category:'ETF',
    title:`Renditeeffekt ca. ${euro(returns)}`,
    text:`Bei deiner Annahme von ${percent(state.assumptions.investmentReturn)} trägt die Wertentwicklung voraussichtlich zum Endvermögen bei.`
  })

  insights.push({
    type: fin.ratio <= .35 ? 'good' : fin.ratio <= .45 ? 'neutral' : 'warn',
    category:'Finanzierung',
    title:`Wohnkostenquote ${percent(fin.ratio)}`,
    text: fin.ratio <= .35
      ? 'Die modellierte Wohnkostenquote liegt in einem komfortableren Bereich.'
      : fin.ratio <= .45
        ? 'Die modellierte Wohnkostenquote ist erhöht und sollte mit einer Bank geprüft werden.'
        : 'Die modellierte Wohnkostenquote ist hoch. Kaufpreis, Eigenkapital oder Rate sollten geprüft werden.'
  })

  insights.push({
    type: reserveMonths >= 3 ? 'good' : reserveMonths > 0 ? 'warn' : 'warn',
    category:'Sicherheit',
    title: reserveMonths > 0 ? `${reserveMonths.toFixed(1)} Monatskosten Reserve` : 'Keine Notreserve eingetragen',
    text: reserveMonths >= 3
      ? 'Deine eingetragene Reserve deckt mindestens drei Monatsausgaben.'
      : 'Für den Wohnungskauf wäre eine getrennte Liquiditätsreserve sinnvoll.'
  })

  insights.push({
    type:'neutral',
    category:'Meilenstein',
    title:`Noch ${euro(milestone.remaining)}`,
    text:`Bis zum nächsten Meilenstein von ${euro(milestone.target)}.`
  })

  return {
    insights,
    current,
    projected,
    progress,
    saveRate,
    returns,
    reserveMonths,
    financing:fin,
    status,
    milestone
  }
}

export function coachWeeklyReport(state) {
  const analysis=financeCoachAnalysis(state)
  const documents=(state.documents||[]).filter(doc=>{
    const date=new Date(doc.uploadedAt||doc.documentDate)
    return Date.now()-date.getTime() <= 7*24*60*60*1000
  }).length
  const upcoming=(state.properties||[]).filter(p=>{
    if(!p.viewingDate)return false
    const d=new Date(p.viewingDate)
    return d>=new Date() && d-new Date()<=7*24*60*60*1000
  }).length
  return {
    title:'Wochenbericht',
    items:[
      `Aktuelle Sparquote: ${percent(analysis.saveRate)}`,
      `Eigenkapitalfortschritt: ${percent(analysis.progress)}`,
      `${documents} neue Dokumente in den letzten 7 Tagen`,
      `${upcoming} Besichtigungstermine in den nächsten 7 Tagen`,
      `Nächster Meilenstein: ${euro(analysis.milestone.target)}`
    ]
  }
}

export function coachMonthlyReport(state) {
  const review=monthlyReview(state)
  const analysis=financeCoachAnalysis(state)
  return {
    title:`Monatsbericht ${review.label}`,
    items:[
      `Geplante Sparrate: ${euro(review.planned)}`,
      `Rechnerischer Überhang: ${euro(surplus(state))}`,
      `Eigenkapital: ${euro(review.current)}`,
      `Ziel erreicht: ${percent(review.progress)}`,
      `Geschätzter Renditebeitrag bis zum Ziel: ${euro(analysis.returns)}`
    ]
  }
}


export function totalSpecialPayments(state) {
  return (state.specialPayments || []).reduce((sum,p)=>sum+Math.max(0,Number(p.amount||0)),0)
}

export function specialPaymentsForYear(state, year) {
  return (state.specialPayments || []).filter(p=>Number(p.year)===Number(year))
}

export function specialPaymentsForMonth(state, year, month) {
  return (state.specialPayments || []).filter(p=>Number(p.year)===Number(year)&&Number(p.month)===Number(month))
}
