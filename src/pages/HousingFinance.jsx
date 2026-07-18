import { useEffect, useMemo, useRef, useState } from 'react'
import { Building2, Plus, Trash2, Landmark, Home, CalendarClock, TrendingDown } from 'lucide-react'
import { MetricCard, Panel } from '../components/Cards'
import { euro } from '../lib/calculations'

const number = value => Math.max(0, Number(value || 0))
const pct = value => number(value) / 100
const currentMonth = () => new Date().toISOString().slice(0, 7)

const parseNumberInput = value => {
  const normalized = String(value ?? '').trim().replace(',', '.')
  if (normalized === '') return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? Math.max(0, parsed) : null
}

function NumberInput({ value, onValueChange, min = 0, max, step = 'any', ...props }) {
  const safeValue = value === null || value === undefined ? '' : value
  return <input
    {...props}
    type="number"
    inputMode="decimal"
    min={min}
    max={max}
    step={step}
    value={safeValue}
    onChange={event => {
      const raw = event.currentTarget.value
      if (raw === '') {
        onValueChange('')
        return
      }
      const parsed = Number(raw)
      if (!Number.isFinite(parsed)) return
      const lower = min == null ? parsed : Math.max(Number(min), parsed)
      const clamped = max == null ? lower : Math.min(Number(max), lower)
      onValueChange(clamped)
    }}
    onBlur={event => {
      if (event.currentTarget.value === '') onValueChange(Number(min || 0))
    }}
  />
}

export const createHousingFinanceProject = (state, index = 1) => ({
  id: crypto.randomUUID(),
  name: `Finanzierung ${index}`,
  startDate: currentMonth(),
  property: {
    purchasePrice: Number(state?.project?.purchasePrice || 0),
    livingArea: 0,
    address: '',
    buildYear: '',
  },
  equity: {
    useCurrent: true,
    manualAmount: 0,
    includePension: true,
    includeEmergency: false,
  },
  purchaseCosts: {
    transferTaxPct: 3.5,
    notaryPct: 1.5,
    landRegisterPct: 0.5,
    brokerPct: 0,
    renovation: 0,
    furnishing: Number(state?.project?.furnishing || 0),
    other: 0,
  },
  bank: {
    interestPct: Number(state?.assumptions?.bankInterest || 0.035) * 100,
    repaymentPct: Number(state?.assumptions?.bankRepayment || 0.02) * 100,
    fixedYears: 10,
    termYears: 30,
  },
  kfw: {
    enabled: true,
    program: 'KfW-Wohneigentum',
    amount: Number(state?.assumptions?.kfw || 0),
    interestPct: Number(state?.assumptions?.kfwInterest || 0.025) * 100,
    repaymentPct: Number(state?.assumptions?.kfwRepayment || 0.02) * 100,
    graceYears: 1,
    fixedYears: 10,
    termYears: 25,
  },
  monthlyCosts: {
    houseFee: 250,
    heating: 0,
    electricity: 75,
    internet: 45,
    insurance: 25,
    maintenance: 100,
    propertyTax: 25,
    parking: 0,
    other: 0,
  },
  notes: '',
  createdAt: new Date().toISOString(),
})

export function buildLoanSchedule({ principal, interestPct, repaymentPct, graceMonths = 0, targetMonths = 0, maxMonths = 720 }) {
  const amount = number(principal)
  const monthlyInterest = pct(interestPct) / 12
  const repaymentRate = amount > 0 ? amount * (pct(interestPct) + pct(repaymentPct)) / 12 : 0
  const amortisingMonths = Math.max(1, Math.round(number(targetMonths) - number(graceMonths)))
  const targetRate = amount <= 0 || !targetMonths
    ? 0
    : monthlyInterest > 0
      ? amount * monthlyInterest / (1 - Math.pow(1 + monthlyInterest, -amortisingMonths))
      : amount / amortisingMonths
  // Anfangstilgung und Wunschlaufzeit wirken beide: Die höhere erforderliche Rate gewinnt.
  const regularRate = Math.max(repaymentRate, targetRate)
  let balance = amount
  let totalInterest = 0
  let totalPaid = 0
  const rows = []

  if (amount <= 0) return { rows, regularRate: 0, firstRate: 0, payoffMonths: 0, totalInterest: 0, totalPaid: 0, residual: () => 0, paidOff: true, targetRate: 0, repaymentRate: 0 }

  for (let month = 1; month <= maxMonths && balance > 0.005; month += 1) {
    const opening = balance
    const interest = opening * monthlyInterest
    const grace = month <= graceMonths
    const plannedPayment = grace ? interest : regularRate
    const payment = Math.min(opening + interest, plannedPayment)
    const repayment = Math.max(0, payment - interest)
    balance = Math.max(0, opening - repayment)
    totalInterest += interest
    totalPaid += payment
    rows.push({ month, opening, interest, repayment, payment, balance, grace })

    if (!grace && regularRate <= interest + 0.0001) break
  }

  const paidOff = balance <= 0.005
  const payoffMonths = paidOff ? rows.length : null
  const residual = month => {
    if (month <= 0) return amount
    return rows[Math.min(rows.length, Math.round(month)) - 1]?.balance ?? balance
  }
  return {
    rows,
    regularRate,
    firstRate: rows[0]?.payment || 0,
    payoffMonths,
    totalInterest,
    totalPaid,
    residual,
    paidOff,
    targetRate,
    repaymentRate,
  }
}

const combinedAnnualSchedule = (bankPlan, kfwPlan, startDate) => {
  const maxMonths = Math.max(bankPlan.rows.length, kfwPlan.rows.length)
  const years = []
  const start = startDate ? new Date(`${startDate}-01T12:00:00`) : new Date()
  for (let month = 1; month <= maxMonths; month += 1) {
    const bank = bankPlan.rows[month - 1]
    const kfw = kfwPlan.rows[month - 1]
    const yearIndex = Math.floor((month - 1) / 12)
    if (!years[yearIndex]) {
      const date = new Date(start)
      date.setMonth(date.getMonth() + yearIndex * 12)
      years[yearIndex] = {
        year: yearIndex + 1,
        calendarYear: date.getFullYear(),
        payment: 0,
        interest: 0,
        repayment: 0,
        bankBalance: bank?.opening ?? 0,
        kfwBalance: kfw?.opening ?? 0,
        balance: (bank?.opening ?? 0) + (kfw?.opening ?? 0),
      }
    }
    const row = years[yearIndex]
    row.payment += (bank?.payment || 0) + (kfw?.payment || 0)
    row.interest += (bank?.interest || 0) + (kfw?.interest || 0)
    row.repayment += (bank?.repayment || 0) + (kfw?.repayment || 0)
    row.bankBalance = bank?.balance ?? 0
    row.kfwBalance = kfw?.balance ?? 0
    row.balance = row.bankBalance + row.kfwBalance
  }
  return years
}

const durationLabel = months => {
  if (months == null) return 'nicht vollständig getilgt'
  const years = Math.floor(months / 12)
  const rest = months % 12
  if (!years) return `${rest} Monate`
  return rest ? `${years} Jahre ${rest} Monate` : `${years} Jahre`
}

export function housingFinanceSummary(state, project) {
  if (!project) return null
  const purchasePrice = number(project.property?.purchasePrice)
  const costs = project.purchaseCosts || {}
  const percentageCosts = purchasePrice * (
    pct(costs.transferTaxPct) + pct(costs.notaryPct) + pct(costs.landRegisterPct) + pct(costs.brokerPct)
  )
  const purchaseCosts = percentageCosts + number(costs.renovation) + number(costs.furnishing) + number(costs.other)
  const totalCost = purchasePrice + purchaseCosts
  const baseEquity = project.equity?.useCurrent ? number(state.assets?.home) : number(project.equity?.manualAmount)
  const pensionEquity = project.equity?.includePension ? number(state.assets?.pension) : 0
  const emergencyEquity = project.equity?.includeEmergency ? number(state.assets?.emergency) : 0
  const equity = baseEquity + pensionEquity + emergencyEquity
  const financingNeed = Math.max(0, totalCost - equity)
  const kfwAmount = project.kfw?.enabled ? Math.min(financingNeed, number(project.kfw?.amount)) : 0
  const bankAmount = Math.max(0, financingNeed - kfwAmount)

  const bankPlan = buildLoanSchedule({
    principal: bankAmount,
    interestPct: project.bank?.interestPct,
    repaymentPct: project.bank?.repaymentPct,
    targetMonths: Math.round(number(project.bank?.termYears) * 12),
  })
  const kfwPlan = buildLoanSchedule({
    principal: kfwAmount,
    interestPct: project.kfw?.interestPct,
    repaymentPct: project.kfw?.repaymentPct,
    graceMonths: Math.round(number(project.kfw?.graceYears) * 12),
    targetMonths: Math.round(number(project.kfw?.termYears) * 12),
  })
  const bankRate = bankPlan.firstRate
  const kfwRate = kfwPlan.firstRate
  const regularKfwRate = kfwPlan.regularRate
  const monthlyHousingCosts = Object.values(project.monthlyCosts || {}).reduce((sum, value) => sum + number(value), 0)
  const fixedYears = Math.max(1, number(project.bank?.fixedYears || 10))
  const fixedMonth = Math.round(fixedYears * 12)
  const residualAtFixed = bankPlan.residual(fixedMonth) + kfwPlan.residual(fixedMonth)
  const payoffMonths = Math.max(bankPlan.payoffMonths || 0, kfwPlan.payoffMonths || 0) || (financingNeed ? null : 0)
  const annualSchedule = combinedAnnualSchedule(bankPlan, kfwPlan, project.startDate)
  const creditRateAfterGrace = bankPlan.regularRate + regularKfwRate

  return {
    purchasePrice, purchaseCosts, totalCost, equity, baseEquity, pensionEquity, emergencyEquity, financingNeed, kfwAmount, bankAmount,
    bankRate, kfwRate, regularKfwRate, creditRate: bankRate + kfwRate,
    creditRateAfterGrace, monthlyHousingCosts, totalMonthly: bankRate + kfwRate + monthlyHousingCosts,
    totalMonthlyAfterGrace: creditRateAfterGrace + monthlyHousingCosts,
    bankPlan, kfwPlan, annualSchedule, residualAtFixed, payoffMonths,
    totalInterest: bankPlan.totalInterest + kfwPlan.totalInterest,
    totalPaid: bankPlan.totalPaid + kfwPlan.totalPaid,
  }
}

const Field = ({ label, suffix, children }) => <label>{label}<div className="input-suffix-wrap">{children}{suffix && <span>{suffix}</span>}</div></label>

function ResidualChart({ rows, initial }) {
  const visible = rows.filter((_, index) => index === 0 || (index + 1) % 2 === 0 || index === rows.length - 1).slice(0, 26)
  const width = 760
  const height = 230
  const pad = 28
  const max = Math.max(initial, 1)
  const points = visible.map((row, index) => {
    const x = pad + (visible.length <= 1 ? 0 : index / (visible.length - 1)) * (width - pad * 2)
    const y = pad + (1 - row.balance / max) * (height - pad * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  return <div className="repayment-chart-wrap">
    <svg className="repayment-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Entwicklung der Restschuld">
      {[0, .25, .5, .75, 1].map(value => <line key={value} x1={pad} x2={width-pad} y1={pad + value*(height-pad*2)} y2={pad + value*(height-pad*2)} />)}
      <polyline points={points}/>
      {visible.map((row,index) => {
        const [x,y] = points.split(' ')[index].split(',')
        return <circle key={row.year} cx={x} cy={y} r="3"/>
      })}
    </svg>
    <div className="repayment-chart-labels"><span>Start {euro(initial)}</span><span>{visible.at(-1)?.calendarYear || ''}: {euro(visible.at(-1)?.balance || 0)}</span></div>
  </div>
}

export default function HousingFinance({ state, setState }) {
  const projects = state.housingFinance?.projects || []
  const activeId = state.housingFinance?.activeProjectId || projects[0]?.id || null
  const project = projects.find(item => item.id === activeId) || projects[0] || null
  const summary = useMemo(() => housingFinanceSummary(state, project), [state, project])

  const updateRoot = value => setState(current => ({
    ...current,
    housingFinance: { ...(current.housingFinance || {}), ...value },
  }))
  const updateActiveProject = updater => setState(current => {
    const finance = current.housingFinance || { projects: [], activeProjectId: null }
    const id = finance.activeProjectId || finance.projects?.[0]?.id
    return {
      ...current,
      housingFinance: {
        ...finance,
        projects: (finance.projects || []).map(item => item.id === id ? updater(item) : item),
      },
    }
  })
  const updateProject = patch => updateActiveProject(item => ({ ...item, ...patch }))
  const updateSection = (section, field, value) => updateActiveProject(item => ({
    ...item,
    [section]: { ...(item[section] || {}), [field]: value },
  }))
  const addProject = () => {
    const item = createHousingFinanceProject(state, projects.length + 1)
    setState(current => ({
      ...current,
      housingFinance: { projects: [...(current.housingFinance?.projects || []), item], activeProjectId: item.id },
    }))
  }
  const removeProject = () => {
    if (!project || !confirm(`„${project.name}“ wirklich löschen?`)) return
    setState(current => {
      const remaining = (current.housingFinance?.projects || []).filter(item => item.id !== project.id)
      return { ...current, housingFinance: { projects: remaining, activeProjectId: remaining[0]?.id || null } }
    })
  }

  if (!project) return <Panel title="Wohnungsfinanzierung Pro" subtitle="Berechne eine konkrete Wohnung vom Kaufpreis bis zur vollständigen Tilgung.">
    <div className="housing-empty"><Building2 size={48}/><h3>Noch keine Finanzierung angelegt</h3><p>Lege dein erstes Projekt an. Deine aktuellen Vermögenswerte können automatisch als Eigenkapital übernommen werden.</p><button className="primary" onClick={addProject}><Plus size={18}/> Erste Finanzierung anlegen</button></div>
  </Panel>

  return <>
    <section className="housing-project-bar">
      <div>
        <span>Aktives Projekt</span>
        <select value={project.id} onChange={event => updateRoot({ activeProjectId: event.target.value })}>
          {projects.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </div>
      <button onClick={addProject}><Plus size={18}/> Neues Projekt</button>
      <button className="danger" onClick={removeProject}><Trash2 size={18}/> Löschen</button>
    </section>

    <div className="housing-title-edit">
      <Field label="Bezeichnung"><input value={project.name} onChange={event => updateProject({ name: event.target.value })}/></Field>
      <Field label="Adresse / Notiz zum Objekt"><input placeholder="z. B. Musterstraße 12, Augsburg" value={project.property.address} onChange={event => updateSection('property','address',event.target.value)}/></Field>
      <Field label="Finanzierungsbeginn"><input type="month" value={project.startDate || currentMonth()} onChange={event => updateProject({ startDate: event.target.value })}/></Field>
    </div>

    <div className="metric-grid housing-metrics">
      <MetricCard label="Gesamtkosten" value={euro(summary.totalCost)} hint={`davon ${euro(summary.purchaseCosts)} Kaufnebenkosten`} accent/>
      <MetricCard label="Eigenkapital" value={euro(summary.equity)} hint={`${summary.totalCost ? Math.round(summary.equity / summary.totalCost * 100) : 0} % der Gesamtkosten`}/>
      <MetricCard label="Restschuld nach Zinsbindung" value={euro(summary.residualAtFixed)} hint={`nach ${number(project.bank.fixedYears || 10)} Jahren`}/>
      <MetricCard label="Rechnerische Laufzeit" value={durationLabel(summary.payoffMonths)} hint={`Gesamtzinsen ${euro(summary.totalInterest)}`}/>
    </div>

    <div className="content-grid housing-grid">
      <Panel title="Objekt & Eigenkapital" subtitle="Grunddaten der Wohnung und vorhandenes Eigenkapital" className="span-6">
        <div className="form-grid two">
          <Field label="Kaufpreis" suffix="€"><NumberInput value={project.property.purchasePrice} onValueChange={value => updateSection('property','purchasePrice',value)}/></Field>
          <Field label="Wohnfläche" suffix="m²"><NumberInput value={project.property.livingArea} onValueChange={value => updateSection('property','livingArea',value)}/></Field>
          <Field label="Baujahr"><NumberInput min={1800} max={2100} value={project.property.buildYear} onValueChange={value => updateSection('property','buildYear',value)}/></Field>
          <label className="check-field"><input type="checkbox" checked={Boolean(project.equity.useCurrent)} onChange={event => updateSection('equity','useCurrent',event.target.checked)}/><span>Aktuelles Vermögen automatisch übernehmen</span></label>
          {!project.equity.useCurrent && <Field label="Eigenkapital manuell" suffix="€"><NumberInput value={project.equity.manualAmount} onValueChange={value => updateSection('equity','manualAmount',value)}/></Field>}
          <label className="check-field"><input type="checkbox" checked={Boolean(project.equity.includePension)} onChange={event => updateSection('equity','includePension',event.target.checked)}/><span>Rentenvermögen einbeziehen</span></label>
          <label className="check-field"><input type="checkbox" checked={Boolean(project.equity.includeEmergency)} onChange={event => updateSection('equity','includeEmergency',event.target.checked)}/><span>Notgroschen einbeziehen</span></label>
        </div>
        <div className="equity-breakdown">
          <span>Basis-Eigenkapital <b>{euro(summary.baseEquity)}</b></span>
          <span>Rentenvermögen <b>{euro(summary.pensionEquity)}</b></span>
          <span>Notgroschen <b>{euro(summary.emergencyEquity)}</b></span>
        </div>
      </Panel>

      <Panel title="Kaufnebenkosten" subtitle="Prozentsätze und einmalige Zusatzkosten" className="span-6">
        <div className="form-grid two">
          <Field label="Grunderwerbsteuer" suffix="%"><NumberInput value={project.purchaseCosts.transferTaxPct} onValueChange={value => updateSection('purchaseCosts','transferTaxPct',value)} step="0.1"/></Field>
          <Field label="Notar" suffix="%"><NumberInput value={project.purchaseCosts.notaryPct} onValueChange={value => updateSection('purchaseCosts','notaryPct',value)} step="0.1"/></Field>
          <Field label="Grundbuch" suffix="%"><NumberInput value={project.purchaseCosts.landRegisterPct} onValueChange={value => updateSection('purchaseCosts','landRegisterPct',value)} step="0.1"/></Field>
          <Field label="Makler" suffix="%"><NumberInput value={project.purchaseCosts.brokerPct} onValueChange={value => updateSection('purchaseCosts','brokerPct',value)} step="0.1"/></Field>
          <Field label="Renovierung" suffix="€"><NumberInput value={project.purchaseCosts.renovation} onValueChange={value => updateSection('purchaseCosts','renovation',value)}/></Field>
          <Field label="Möbel / Einrichtung" suffix="€"><NumberInput value={project.purchaseCosts.furnishing} onValueChange={value => updateSection('purchaseCosts','furnishing',value)}/></Field>
          <Field label="Sonstige Kosten" suffix="€"><NumberInput value={project.purchaseCosts.other} onValueChange={value => updateSection('purchaseCosts','other',value)}/></Field>
        </div>
      </Panel>

      <Panel title="Bankdarlehen" subtitle={`Automatisch verbleibender Betrag: ${euro(summary.bankAmount)} · Rate reagiert auf Tilgung und Wunschlaufzeit`} className="span-6">
        <div className="loan-heading"><Landmark size={22}/><strong>Monatliche Annuität: {euro(summary.bankPlan.regularRate)}</strong></div>
        <div className="form-grid two">
          <Field label="Sollzins" suffix="%"><NumberInput value={project.bank.interestPct} onValueChange={value => updateSection('bank','interestPct',value)} step="0.01"/></Field>
          <Field label="Anfangstilgung" suffix="%"><NumberInput value={project.bank.repaymentPct} onValueChange={value => updateSection('bank','repaymentPct',value)} step="0.01"/></Field>
          <Field label="Zinsbindung" suffix="Jahre"><NumberInput value={project.bank.fixedYears} onValueChange={value => updateSection('bank','fixedYears',value)}/></Field>
          <Field label="Gewünschte Laufzeit" suffix="Jahre"><NumberInput value={project.bank.termYears} onValueChange={value => updateSection('bank','termYears',value)}/></Field>
        </div>
        <div className="loan-result-strip"><span>Restschuld nach Zinsbindung <b>{euro(summary.bankPlan.residual(number(project.bank.fixedYears) * 12))}</b></span><span>Gesamtzins <b>{euro(summary.bankPlan.totalInterest)}</b></span><span>Laufzeit <b>{durationLabel(summary.bankPlan.payoffMonths)}</b></span></div>
      </Panel>

      <Panel title="KfW-Darlehen" subtitle="Anlaufjahre, Anfangstilgung und Wunschlaufzeit werden gemeinsam berechnet" className="span-6">
        <label className="check-field kfw-switch"><input type="checkbox" checked={Boolean(project.kfw.enabled)} onChange={event => updateSection('kfw','enabled',event.target.checked)}/><span>KfW-Darlehen verwenden</span></label>
        <div className={`loan-fields ${project.kfw.enabled ? '' : 'disabled'}`}>
          <div className="loan-heading"><Home size={22}/><strong>{number(project.kfw.graceYears) > 0 ? `Start ${euro(summary.kfwRate)} · danach ${euro(summary.regularKfwRate)}` : `Monatliche Annuität: ${euro(summary.regularKfwRate)}`}</strong></div>
          <div className="form-grid two">
            <Field label="Programm"><input value={project.kfw.program} onChange={event => updateSection('kfw','program',event.target.value)}/></Field>
            <Field label="Darlehensbetrag" suffix="€"><NumberInput value={project.kfw.amount} onValueChange={value => updateSection('kfw','amount',value)}/></Field>
            <Field label="Sollzins" suffix="%"><NumberInput value={project.kfw.interestPct} onValueChange={value => updateSection('kfw','interestPct',value)} step="0.01"/></Field>
            <Field label="Anfangstilgung" suffix="%"><NumberInput value={project.kfw.repaymentPct} onValueChange={value => updateSection('kfw','repaymentPct',value)} step="0.01"/></Field>
            <Field label="Tilgungsfreie Jahre" suffix="Jahre"><NumberInput value={project.kfw.graceYears} onValueChange={value => updateSection('kfw','graceYears',value)}/></Field>
            <Field label="Zinsbindung" suffix="Jahre"><NumberInput min={1} value={project.kfw.fixedYears ?? 10} onValueChange={value => updateSection('kfw','fixedYears',value)}/></Field>
            <Field label="Gewünschte Laufzeit" suffix="Jahre"><NumberInput value={project.kfw.termYears} onValueChange={value => updateSection('kfw','termYears',value)}/></Field>
          </div>
          <div className="loan-result-strip"><span>Restschuld nach Zinsbindung <b>{euro(summary.kfwPlan.residual(number(project.kfw.fixedYears ?? 10) * 12))}</b></span><span>Gesamtzins <b>{euro(summary.kfwPlan.totalInterest)}</b></span><span>Laufzeit <b>{durationLabel(summary.kfwPlan.payoffMonths)}</b></span></div>
        </div>
      </Panel>

      <Panel title="Monatliche Wohnungskosten" subtitle="Alle laufenden Kosten zusätzlich zu den Kreditraten" className="span-8">
        <div className="form-grid three housing-cost-form">
          {[
            ['houseFee','Hausgeld'],['heating','Heizung'],['electricity','Strom'],['internet','Internet'],
            ['insurance','Versicherungen'],['maintenance','Instandhaltungsrücklage'],['propertyTax','Grundsteuer'],
            ['parking','Stellplatz / Garage'],['other','Sonstige Kosten'],
          ].map(([key,label]) => <Field key={key} label={label} suffix="€/Monat"><NumberInput value={project.monthlyCosts[key]} onValueChange={value => updateSection('monthlyCosts',key,value)}/></Field>)}
        </div>
      </Panel>

      <Panel title="Monatsübersicht" subtitle="Exakte Aufteilung aus den Tilgungsplänen" className="span-4">
        <div className="housing-monthly-breakdown">
          <div><span>Bankrate</span><b>{euro(summary.bankRate)}</b></div>
          <div><span>KfW-Rate zu Beginn</span><b>{euro(summary.kfwRate)}</b></div>
          {number(project.kfw.graceYears) > 0 && <div><span>KfW nach Anlaufzeit</span><b>{euro(summary.regularKfwRate)}</b></div>}
          <div><span>Wohnungskosten</span><b>{euro(summary.monthlyHousingCosts)}</b></div>
          <div className="total"><span>Gesamt zu Beginn</span><b>{euro(summary.totalMonthly)}</b></div>
          {number(project.kfw.graceYears) > 0 && <div className="total secondary"><span>Nach KfW-Anlaufzeit</span><b>{euro(summary.totalMonthlyAfterGrace)}</b></div>}
        </div>
        <p className="calculation-note">Die Annuität bleibt innerhalb der Modellrechnung konstant. Zinsen werden monatlich auf die jeweilige Restschuld berechnet. Änderungen des Zinssatzes nach der Zinsbindung folgen mit der Anschlussfinanzierung in einer späteren Version.</p>
      </Panel>

      <Panel title="Restschuldentwicklung" subtitle="Bank- und KfW-Darlehen zusammen" className="span-12">
        <div className="repayment-insights">
          <div><CalendarClock size={20}/><span>Vollständig getilgt</span><b>{durationLabel(summary.payoffMonths)}</b></div>
          <div><TrendingDown size={20}/><span>Gesamte Zinskosten</span><b>{euro(summary.totalInterest)}</b></div>
          <div><Landmark size={20}/><span>Restschuld nach {number(project.bank.fixedYears)} Jahren</span><b>{euro(summary.residualAtFixed)}</b></div>
        </div>
        <ResidualChart rows={summary.annualSchedule} initial={summary.financingNeed}/>
      </Panel>

      <Panel title="Jährlicher Tilgungsplan" subtitle="Rate, Zins, Tilgung und Restschuld für jedes Finanzierungsjahr" className="span-12">
        <div className="table-scroll repayment-table-wrap">
          <table className="repayment-table">
            <thead><tr><th>Jahr</th><th>Kalenderjahr</th><th>Gezahlte Raten</th><th>Zinsen</th><th>Tilgung</th><th>Bank-Restschuld</th><th>KfW-Restschuld</th><th>Gesamt-Restschuld</th></tr></thead>
            <tbody>{summary.annualSchedule.map(row => <tr key={row.year}>
              <td><b>{row.year}</b></td><td>{row.calendarYear}</td><td>{euro(row.payment)}</td><td>{euro(row.interest)}</td><td>{euro(row.repayment)}</td><td>{euro(row.bankBalance)}</td><td>{euro(row.kfwBalance)}</td><td><b>{euro(row.balance)}</b></td>
            </tr>)}</tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Notizen" subtitle="Besichtigung, Bankgespräch oder offene Punkte" className="span-12">
        <textarea rows="4" placeholder="Eigene Notizen zur Finanzierung …" value={project.notes} onChange={event => updateProject({ notes: event.target.value })}/>
      </Panel>
    </div>
  </>
}
