import { useMemo } from 'react'
import { Building2, Plus, Trash2, Landmark, Home, WalletCards } from 'lucide-react'
import { MetricCard, Panel } from '../components/Cards'
import { euro } from '../lib/calculations'

const number = value => Math.max(0, Number(value || 0))
const pct = value => number(value) / 100

export const createHousingFinanceProject = (state, index = 1) => ({
  id: crypto.randomUUID(),
  name: `Finanzierung ${index}`,
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
  const bankRate = bankAmount * (pct(project.bank?.interestPct) + pct(project.bank?.repaymentPct)) / 12
  const kfwRate = kfwAmount * (pct(project.kfw?.interestPct) + pct(project.kfw?.repaymentPct)) / 12
  const monthlyHousingCosts = Object.values(project.monthlyCosts || {}).reduce((sum, value) => sum + number(value), 0)
  return {
    purchasePrice, purchaseCosts, totalCost, equity, financingNeed, kfwAmount, bankAmount,
    bankRate, kfwRate, creditRate: bankRate + kfwRate,
    monthlyHousingCosts, totalMonthly: bankRate + kfwRate + monthlyHousingCosts,
  }
}

const Field = ({ label, suffix, children }) => <label>{label}<div className="input-suffix-wrap">{children}{suffix && <span>{suffix}</span>}</div></label>

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

  if (!project) return <Panel title="Wohnungsfinanzierung Pro" subtitle="Berechne eine konkrete Wohnung vom Kaufpreis bis zur monatlichen Gesamtbelastung.">
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
    </div>

    <div className="metric-grid housing-metrics">
      <MetricCard label="Gesamtkosten" value={euro(summary.totalCost)} hint={`davon ${euro(summary.purchaseCosts)} Kaufnebenkosten`} accent/>
      <MetricCard label="Eigenkapital" value={euro(summary.equity)} hint={`${summary.totalCost ? Math.round(summary.equity / summary.totalCost * 100) : 0} % der Gesamtkosten`}/>
      <MetricCard label="Finanzierungsbedarf" value={euro(summary.financingNeed)} hint={`Bank ${euro(summary.bankAmount)} · KfW ${euro(summary.kfwAmount)}`}/>
      <MetricCard label="Monatliche Belastung" value={euro(summary.totalMonthly)} hint={`Kredite ${euro(summary.creditRate)} · Wohnen ${euro(summary.monthlyHousingCosts)}`}/>
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
        <div className="loan-heading"><Landmark size={22}/><strong>Geschätzte Rate: {euro(summary.bankRate)}</strong></div>
        <div className="form-grid two">
          <Field label="Sollzins" suffix="%"><input type="number" min="0" step="0.01" value={project.bank.interestPct} onChange={event => updateSection('bank','interestPct',number(event.target.value))}/></Field>
          <Field label="Anfangstilgung" suffix="%"><input type="number" min="0" step="0.01" value={project.bank.repaymentPct} onChange={event => updateSection('bank','repaymentPct',number(event.target.value))}/></Field>
          <Field label="Zinsbindung" suffix="Jahre"><input type="number" min="1" value={project.bank.fixedYears} onChange={event => updateSection('bank','fixedYears',number(event.target.value))}/></Field>
          <Field label="Geplante Laufzeit" suffix="Jahre"><input type="number" min="1" value={project.bank.termYears} onChange={event => updateSection('bank','termYears',number(event.target.value))}/></Field>
        </div>
      </Panel>

      <Panel title="KfW-Darlehen" subtitle="Förderdarlehen separat vom Bankdarlehen erfassen" className="span-6">
        <label className="check-field kfw-switch"><input type="checkbox" checked={project.kfw.enabled} onChange={event => updateSection('kfw','enabled',event.target.checked)}/><span>KfW-Darlehen verwenden</span></label>
        <div className={`loan-fields ${project.kfw.enabled ? '' : 'disabled'}`}>
          <div className="loan-heading"><Home size={22}/><strong>Geschätzte Rate: {euro(summary.kfwRate)}</strong></div>
          <div className="form-grid two">
            <Field label="Programm"><input value={project.kfw.program} onChange={event => updateSection('kfw','program',event.target.value)}/></Field>
            <Field label="Darlehensbetrag" suffix="€"><input type="number" min="0" value={project.kfw.amount} onChange={event => updateSection('kfw','amount',number(event.target.value))}/></Field>
            <Field label="Sollzins" suffix="%"><input type="number" min="0" step="0.01" value={project.kfw.interestPct} onChange={event => updateSection('kfw','interestPct',number(event.target.value))}/></Field>
            <Field label="Tilgung" suffix="%"><input type="number" min="0" step="0.01" value={project.kfw.repaymentPct} onChange={event => updateSection('kfw','repaymentPct',number(event.target.value))}/></Field>
            <Field label="Tilgungsfreie Jahre" suffix="Jahre"><input type="number" min="0" value={project.kfw.graceYears} onChange={event => updateSection('kfw','graceYears',number(event.target.value))}/></Field>
            <Field label="Laufzeit" suffix="Jahre"><input type="number" min="1" value={project.kfw.termYears} onChange={event => updateSection('kfw','termYears',number(event.target.value))}/></Field>
          </div>
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

      <Panel title="Monatsübersicht" subtitle="Erste Orientierung – detaillierter Tilgungsplan folgt in 10.9.1" className="span-4">
        <div className="housing-monthly-breakdown">
          <div><span>Bankrate</span><b>{euro(summary.bankRate)}</b></div>
          <div><span>KfW-Rate</span><b>{euro(summary.kfwRate)}</b></div>
          <div><span>Wohnungskosten</span><b>{euro(summary.monthlyHousingCosts)}</b></div>
          <div className="total"><span>Gesamt pro Monat</span><b>{euro(summary.totalMonthly)}</b></div>
        </div>
        <p className="calculation-note">Die Kreditrate ist in dieser Grundversion eine Schätzung aus Sollzins plus Anfangstilgung. Restschuld, exakte Laufzeit und Tilgungsplan folgen im nächsten Schritt.</p>
      </Panel>

      <Panel title="Notizen" subtitle="Besichtigung, Bankgespräch oder offene Punkte" className="span-12">
        <textarea rows="4" placeholder="Eigene Notizen zur Finanzierung …" value={project.notes} onChange={event => updateProject({ notes: event.target.value })}/>
      </Panel>
    </div>
  </>
}
