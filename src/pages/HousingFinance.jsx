import { useMemo } from 'react'
import { Building2, Plus, Trash2, Landmark, Home, CalendarClock, TrendingDown } from 'lucide-react'
import { MetricCard, Panel } from '../components/Cards'
import { euro } from '../lib/calculations'

const number = value => Math.max(0, Number(value || 0))
const pct = value => number(value) / 100
const currentMonth = () => new Date().toISOString().slice(0, 7)

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

export function buildLoanSchedule({ principal, interestPct, repaymentPct, graceMonths = 0, maxMonths = 720 }) {
  const amount = number(principal)
  const monthlyInterest = pct(interestPct) / 12
  const regularRate = amount > 0 ? amount * (pct(interestPct) + pct(repaymentPct)) / 12 : 0
  let balance = amount
  let totalInterest = 0
  let totalPaid = 0
  const rows = []

  if (amount <= 0) return { rows, regularRate: 0, firstRate: 0, payoffMonths: 0, totalInterest: 0, totalPaid: 0, residual: () => 0, paidOff: true }

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
  const currentEquity = number(state.assets?.home) + (project.equity?.includePension ? number(state.assets?.pension) : 0) + (project.equity?.includeEmergency ? number(state.assets?.emergency) : 0)
  const equity = project.equity?.useCurrent ? currentEquity : number(project.equity?.manualAmount)
  const financingNeed = Math.max(0, totalCost - equity)
  const kfwAmount = project.kfw?.enabled ? Math.min(financingNeed, number(project.kfw?.amount)) : 0
  const bankAmount = Math.max(0, financingNeed - kfwAmount)

  const bankPlan = buildLoanSchedule({
    principal: bankAmount,
    interestPct: project.bank?.interestPct,
    repaymentPct: project.bank?.repaymentPct,
  })
  const kfwPlan = buildLoanSchedule({
    principal: kfwAmount,
    interestPct: project.kfw?.interestPct,
    repaymentPct: project.kfw?.repaymentPct,
    graceMonths: Math.round(number(project.kfw?.graceYears) * 12),
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
    purchasePrice, purchaseCosts, totalCost, equity, financingNeed, kfwAmount, bankAmount,
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

  const updateRoot = value => setState(current => ({ ...current, housingFinance: { ...current.housingFinance, ...value } }))
  const updateProject = patch => {
    if (!project) return
    setState(current => ({
      ...current,
      housingFinance: {
        ...current.housingFinance,
        projects: (current.housingFinance?.projects || []).map(item => item.id === project.id ? { ...item, ...patch } : item),
      },
    }))
  }
  const updateSection = (section, field, value) => updateProject({ [section]: { ...project[section], [field]: value } })
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
          <Field label="Kaufpreis" suffix="€"><input type="number" min="0" value={project.property.purchasePrice} onChange={event => updateSection('property','purchasePrice',number(event.target.value))}/></Field>
          <Field label="Wohnfläche" suffix="m²"><input type="number" min="0" value={project.property.livingArea} onChange={event => updateSection('property','livingArea',number(event.target.value))}/></Field>
          <Field label="Baujahr"><input type="number" min="1800" max="2100" value={project.property.buildYear} onChange={event => updateSection('property','buildYear',event.target.value)}/></Field>
          <label className="check-field"><input type="checkbox" checked={project.equity.useCurrent} onChange={event => updateSection('equity','useCurrent',event.target.checked)}/><span>Aktuelles Vermögen automatisch übernehmen</span></label>
          {!project.equity.useCurrent && <Field label="Eigenkapital manuell" suffix="€"><input type="number" min="0" value={project.equity.manualAmount} onChange={event => updateSection('equity','manualAmount',number(event.target.value))}/></Field>}
          <label className="check-field"><input type="checkbox" checked={project.equity.includePension} onChange={event => updateSection('equity','includePension',event.target.checked)}/><span>Rentenvermögen einbeziehen</span></label>
          <label className="check-field"><input type="checkbox" checked={project.equity.includeEmergency} onChange={event => updateSection('equity','includeEmergency',event.target.checked)}/><span>Notgroschen einbeziehen</span></label>
        </div>
      </Panel>

      <Panel title="Kaufnebenkosten" subtitle="Prozentsätze und einmalige Zusatzkosten" className="span-6">
        <div className="form-grid two">
          <Field label="Grunderwerbsteuer" suffix="%"><input type="number" min="0" step="0.1" value={project.purchaseCosts.transferTaxPct} onChange={event => updateSection('purchaseCosts','transferTaxPct',number(event.target.value))}/></Field>
          <Field label="Notar" suffix="%"><input type="number" min="0" step="0.1" value={project.purchaseCosts.notaryPct} onChange={event => updateSection('purchaseCosts','notaryPct',number(event.target.value))}/></Field>
          <Field label="Grundbuch" suffix="%"><input type="number" min="0" step="0.1" value={project.purchaseCosts.landRegisterPct} onChange={event => updateSection('purchaseCosts','landRegisterPct',number(event.target.value))}/></Field>
          <Field label="Makler" suffix="%"><input type="number" min="0" step="0.1" value={project.purchaseCosts.brokerPct} onChange={event => updateSection('purchaseCosts','brokerPct',number(event.target.value))}/></Field>
          <Field label="Renovierung" suffix="€"><input type="number" min="0" value={project.purchaseCosts.renovation} onChange={event => updateSection('purchaseCosts','renovation',number(event.target.value))}/></Field>
          <Field label="Möbel / Einrichtung" suffix="€"><input type="number" min="0" value={project.purchaseCosts.furnishing} onChange={event => updateSection('purchaseCosts','furnishing',number(event.target.value))}/></Field>
          <Field label="Sonstige Kosten" suffix="€"><input type="number" min="0" value={project.purchaseCosts.other} onChange={event => updateSection('purchaseCosts','other',number(event.target.value))}/></Field>
        </div>
      </Panel>

      <Panel title="Bankdarlehen" subtitle={`Automatisch verbleibender Betrag: ${euro(summary.bankAmount)}`} className="span-6">
        <div className="loan-heading"><Landmark size={22}/><strong>Monatliche Annuität: {euro(summary.bankPlan.regularRate)}</strong></div>
        <div className="form-grid two">
          <Field label="Sollzins" suffix="%"><input type="number" min="0" step="0.01" value={project.bank.interestPct} onChange={event => updateSection('bank','interestPct',number(event.target.value))}/></Field>
          <Field label="Anfangstilgung" suffix="%"><input type="number" min="0" step="0.01" value={project.bank.repaymentPct} onChange={event => updateSection('bank','repaymentPct',number(event.target.value))}/></Field>
          <Field label="Zinsbindung" suffix="Jahre"><input type="number" min="1" value={project.bank.fixedYears} onChange={event => updateSection('bank','fixedYears',number(event.target.value))}/></Field>
          <Field label="Gewünschte Laufzeit" suffix="Jahre"><input type="number" min="1" value={project.bank.termYears} onChange={event => updateSection('bank','termYears',number(event.target.value))}/></Field>
        </div>
        <div className="loan-result-strip"><span>Restschuld nach Zinsbindung <b>{euro(summary.bankPlan.residual(number(project.bank.fixedYears) * 12))}</b></span><span>Gesamtzins <b>{euro(summary.bankPlan.totalInterest)}</b></span><span>Laufzeit <b>{durationLabel(summary.bankPlan.payoffMonths)}</b></span></div>
      </Panel>

      <Panel title="KfW-Darlehen" subtitle="Tilgungsfreie Anlaufjahre werden als reine Zinszahlung berechnet" className="span-6">
        <label className="check-field kfw-switch"><input type="checkbox" checked={project.kfw.enabled} onChange={event => updateSection('kfw','enabled',event.target.checked)}/><span>KfW-Darlehen verwenden</span></label>
        <div className={`loan-fields ${project.kfw.enabled ? '' : 'disabled'}`}>
          <div className="loan-heading"><Home size={22}/><strong>{number(project.kfw.graceYears) > 0 ? `Start ${euro(summary.kfwRate)} · danach ${euro(summary.regularKfwRate)}` : `Monatliche Annuität: ${euro(summary.regularKfwRate)}`}</strong></div>
          <div className="form-grid two">
            <Field label="Programm"><input value={project.kfw.program} onChange={event => updateSection('kfw','program',event.target.value)}/></Field>
            <Field label="Darlehensbetrag" suffix="€"><input type="number" min="0" value={project.kfw.amount} onChange={event => updateSection('kfw','amount',number(event.target.value))}/></Field>
            <Field label="Sollzins" suffix="%"><input type="number" min="0" step="0.01" value={project.kfw.interestPct} onChange={event => updateSection('kfw','interestPct',number(event.target.value))}/></Field>
            <Field label="Anfangstilgung" suffix="%"><input type="number" min="0" step="0.01" value={project.kfw.repaymentPct} onChange={event => updateSection('kfw','repaymentPct',number(event.target.value))}/></Field>
            <Field label="Tilgungsfreie Jahre" suffix="Jahre"><input type="number" min="0" value={project.kfw.graceYears} onChange={event => updateSection('kfw','graceYears',number(event.target.value))}/></Field>
            <Field label="Zinsbindung" suffix="Jahre"><input type="number" min="1" value={project.kfw.fixedYears ?? 10} onChange={event => updateSection('kfw','fixedYears',number(event.target.value))}/></Field>
            <Field label="Gewünschte Laufzeit" suffix="Jahre"><input type="number" min="1" value={project.kfw.termYears} onChange={event => updateSection('kfw','termYears',number(event.target.value))}/></Field>
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
          ].map(([key,label]) => <Field key={key} label={label} suffix="€/Monat"><input type="number" min="0" value={project.monthlyCosts[key]} onChange={event => updateSection('monthlyCosts',key,number(event.target.value))}/></Field>)}
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
