import { Panel } from '../components/Cards'
import SimpleChart from '../components/SimpleChart'
import {
  euro, percent, projection, financing, surplus, incomeTotal,
  monthsUntilDate, savingsRate, currentGoalProgress, nextCapitalMilestone,
  planStatus, coachMessages, financeCoachAnalysis, plannedContributionForDate
} from '../lib/calculations'
import { housingFinanceSummary } from './HousingFinance'

const greeting=()=>{
  const hour=new Date().getHours()
  if(hour<11)return 'Guten Morgen'
  if(hour<17)return 'Guten Tag'
  return 'Guten Abend'
}

export default function Dashboard({ state, cloud }) {
  const current = Number(state.assets.home||0) + Number(state.assets.pension||0)
  const totalAssets = current + Number(state.assets.emergency||0)
  const plan = projection(state).filter(x=>x.total!=null)
  const fin = financing(state)
  const months = monthsUntilDate(state.project.target)
  const currentContribution = plannedContributionForDate(state)
  const progress = currentGoalProgress(state)
  const saveRate = savingsRate(state)
  const milestone = nextCapitalMilestone(state)
  const status = planStatus(state)
  const messages = coachMessages(state)
  const coachAnalysis = financeCoachAnalysis(state)
  const activeHousingProject = (state.housingFinance?.projects || []).find(item=>item.id===state.housingFinance?.activeProjectId) || state.housingFinance?.projects?.[0]
  const activeHousingSummary = housingFinanceSummary(state, activeHousingProject)
  const journeyDone = Object.entries(state.purchaseJourney||{}).filter(([key,value])=>key!=='notes'&&value===true).length

  return <>
    <section className="pro-hero">
      <div className="pro-greeting">
        <span>{greeting()} 👋</span>
        <h2>Dein Weg zur eigenen Wohnung</h2>
        <p>Noch {months} Monate bis zum geplanten Kauf im {new Date(`${state.project.target}T12:00:00`).toLocaleDateString('de-DE',{month:'long',year:'numeric'})}.</p>
      </div>
      <div className="goal-ring" style={{'--goal-progress':`${Math.min(100,progress*100)*3.6}deg`}}>
        <div><strong>{Math.round(progress*100)}%</strong><span>Sparziel</span></div>
      </div>
    </section>

    {cloud&&<button className={`dashboard-cloud-card ${cloud.status.kind}`} onClick={()=>document.querySelector('[data-cloud-link]')?.click()} type="button">
      <span className="cloud-card-dot"/><div><small>Cloud-Status</small><strong>{cloud.status.text}</strong><span>{cloud.sameData?'PC und Handy stimmen überein':cloud.cloudNewer?'Neuere Daten liegen in der Cloud':cloud.localNewer?'Lokale Änderungen noch nicht hochgeladen':'Cloud-Center öffnen und prüfen'}</span></div>
    </button>}

    <div className="pro-kpi-grid">
      <article className="pro-kpi accent">
        <span>Eigenkapital</span>
        <strong>{euro(current)}</strong>
        <small>von {euro(state.project.goal)}</small>
        <div className="progress"><div style={{width:`${Math.min(100,progress*100)}%`}}/></div>
      </article>
      <article className="pro-kpi">
        <span>Monatliches Einkommen</span>
        <strong>{euro(incomeTotal(state))}</strong>
        <small>Überhang {euro(surplus(state))}</small>
      </article>
      <article className="pro-kpi">
        <span>Sparquote</span>
        <strong>{percent(saveRate)}</strong>
        <small>vom aktuellen Nettoeinkommen</small>
      </article>
      <article className={`pro-kpi ${status.kind==='good'?'status-good':'status-warn'}`}>
        <span>Planstatus</span>
        <strong>{status.label}</strong>
        <small>automatisch aus der Prognose</small>
      </article>
    </div>

    <div className="content-grid">
      {activeHousingProject&&activeHousingSummary&&<Panel title="Aktive Wohnungsfinanzierung" subtitle={activeHousingProject.name} className="span-12 housing-dashboard-panel">
        <div className="dashboard-finance housing-dashboard-grid">
          <div><span>Kaufpreis</span><b>{euro(activeHousingSummary.purchasePrice)}</b></div>
          <div><span>Eigenkapital</span><b>{euro(activeHousingSummary.equity)}</b></div>
          <div><span>Finanzierungsbedarf</span><b>{euro(activeHousingSummary.financingNeed)}</b></div>
          <div><span>Gesamtbelastung</span><b>{euro(activeHousingSummary.totalMonthly)}</b></div>
        </div>
      </Panel>}

      <Panel title="Vermögensentwicklung" subtitle="Prognose bis zum Kaufzeitpunkt" className="span-8">
        <SimpleChart values={plan.map(x=>x.total)} goal={state.project.goal}/>
        <div className="chart-footer">
          <span>Heute {euro(current)}</span>
          <span>Ziel {euro(state.project.goal)}</span>
        </div>
      </Panel>

      <Panel title="Finanzcoach" subtitle={`Planstatus: ${coachAnalysis.status.label}`} className="span-4">
        <div className="coach-list">
          {messages.map((message,index)=>
            <div className={`coach-message ${message.type}`} key={index}>
              <i>{message.type==='good'?'✓':message.type==='warn'?'!':'i'}</i>
              <div><b>{message.title}</b><span>{message.text}</span></div>
            </div>
          )}
        </div>
      </Panel>

      <Panel title="Vermögensaufteilung" subtitle={`Gesamt inkl. Notgroschen ${euro(totalAssets)}`} className="span-6">
        <div className="dashboard-asset-bars">
          {[
            ['Wohnungssparen',state.assets.home,'home'],
            ['Rentenversicherung',state.assets.pension,'pension'],
            ['Notgroschen',state.assets.emergency,'emergency']
          ].map(([label,value,type])=>
            <div className="dashboard-asset-row" key={label}>
              <div><span>{label}</span><b>{euro(value)}</b></div>
              <div className="dashboard-asset-track"><i className={type} style={{width:`${totalAssets?Math.max(2,value/totalAssets*100):0}%`}}/></div>
            </div>
          )}
        </div>
      </Panel>

      <Panel title="Finanzierungsblick" subtitle="Aktuelle Prognose zum Kaufzeitpunkt" className="span-6">
        <div className="dashboard-finance pro-finance">
          <div><span>Kaufpreis</span><b>{euro(state.project.purchasePrice)}</b></div>
          <div><span>Eigenkapital am Ziel</span><b>{euro(fin.equity)}</b></div>
          <div><span>Kreditrate</span><b>{euro(fin.rate)}</b></div>
          <div><span>Wohnkostenquote</span><b className={fin.ratio<=.42?'good-value':'warning-value'}>{percent(fin.ratio)}</b></div>
        </div>
      </Panel>

      <Panel title="Nächster Meilenstein" subtitle="Dein nächstes greifbares Zwischenziel" className="span-6">
        <div className="milestone-card">
          <div className="milestone-icon">🎯</div>
          <div>
            <span>Zielwert</span>
            <strong>{euro(milestone.target)}</strong>
            <small>Noch {euro(milestone.remaining)} erforderlich</small>
          </div>
        </div>
      </Panel>

      <Panel title="Mein Wohnungskauf" subtitle={`${journeyDone} von 6 Etappen erledigt`} className="span-6">
        <div className="mini-journey">
          {['Eigenkapital','Finanzierung','Wohnung','Unterlagen','Vertrag','Schlüssel'].map((label,index)=>
            <div className={index<journeyDone?'done':''} key={label}>
              <i>{index<journeyDone?'✓':index+1}</i><span>{label}</span>
            </div>
          )}
        </div>
      </Panel>
    </div>
  </>
}
