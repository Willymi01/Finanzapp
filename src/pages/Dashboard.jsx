import { MetricCard, Panel } from '../components/Cards'
import SimpleChart from '../components/SimpleChart'
import { euro, percent, projection, financing, surplus, plannedSavingForDate, projectMonthIndex } from '../lib/calculations'

const monthsUntil=(target)=>{
  const now=new Date(), end=new Date(`${target}T12:00:00`)
  return Math.max(0,(end.getFullYear()-now.getFullYear())*12+end.getMonth()-now.getMonth())
}

export default function Dashboard({ state }) {
  const current = state.assets.home + state.assets.pension
  const currentWithEmergency = current + state.assets.emergency
  const plan = projection(state).filter(x=>x.total!=null)
  const fin = financing(state)
  const gap = Math.max(0, state.project.goal - fin.equity)
  const currentMonth = plannedSavingForDate(state)
  const index = projectMonthIndex(state)
  const currentLabel = index < 0
    ? 'Das Sparprojekt hat noch nicht begonnen.'
    : index >= 60
      ? 'Der geplante Fünf-Jahres-Zeitraum ist beendet.'
      : `Sparjahr ${Math.floor(index/12)+1}, Monat ${index%12+1}`
  const years = Array.from({length:5},(_,i)=>plan[(i+1)*12-1]?.total||0)
  const requiredExtra = monthsUntil(state.project.target)>0 ? gap/monthsUntil(state.project.target) : gap
  const completedJourney = Object.entries(state.purchaseJourney||{}).filter(([key,value])=>key!=='notes'&&value===true).length

  return <>
    <div className="metric-grid dashboard-metrics">
      <MetricCard label="Eigenkapital" value={euro(current)} hint={`von ${euro(state.project.goal)}`} accent>
        <div className="progress"><div style={{width:`${Math.min(100,current/state.project.goal*100)}%`}}/></div>
      </MetricCard>
      <MetricCard label="Sparziel erreicht" value={percent(current/state.project.goal)} hint={`Noch ${euro(Math.max(0,state.project.goal-current))}`}/>
      <MetricCard label="Monatliches Einkommen" value={euro(state.budget.income.reduce((a,b)=>a+Number(b.amount||0),0))} hint={`Überhang ${euro(surplus(state))}`}/>
      <MetricCard label="Bis zum Kauf" value={`${monthsUntil(state.project.target)} Monate`} hint={`Ziel: ${new Date(`${state.project.target}T12:00:00`).toLocaleDateString('de-DE',{month:'long',year:'numeric'})}`}/>
    </div>

    <div className="content-grid">
      <Panel title="Vermögensentwicklung" subtitle="Plan bis zum Kaufzeitpunkt" className="span-8">
        <SimpleChart values={plan.map(x=>x.total)} goal={state.project.goal}/>
      </Panel>
      <Panel title="Heute" subtitle={currentLabel} className="span-4">
        <div className="coach">
          {currentMonth>0
            ? <>Diesen Monat sind <b>{euro(currentMonth)}</b> vorgesehen.<br/></>
            : <>Für den aktuellen Monat liegt keine Sparrate im Projektzeitraum vor.<br/></>}
          Noch fehlen rechnerisch <b>{euro(gap)}</b> bis zum Ziel.<br/>
          {gap>0&&<span>Das entspricht aktuell etwa <b>{euro(requiredExtra)}</b> zusätzlicher Monatsrate.</span>}
        </div>
      </Panel>

      <Panel title="Vermögensaufteilung" subtitle="Aktuelle Werte aus deinen Eingaben" className="span-6">
        <div className="asset-breakdown dashboard-assets">
          <div><span>Wohnungssparen</span><b>{euro(state.assets.home)}</b></div>
          <div><span>Rentenversicherung</span><b>{euro(state.assets.pension)}</b></div>
          <div><span>Notgroschen</span><b>{euro(state.assets.emergency)}</b></div>
          <div><span>Gesamt</span><b>{euro(currentWithEmergency)}</b></div>
        </div>
      </Panel>

      <Panel title="Finanzierungsblick" subtitle="Aktuelle Prognose" className="span-6">
        <div className="dashboard-finance">
          <div><span>Kaufpreis</span><b>{euro(state.project.purchasePrice)}</b></div>
          <div><span>Kreditrate</span><b>{euro(fin.rate)}</b></div>
          <div><span>Gesamt-Wohnkosten</span><b>{euro(fin.housing)}</b></div>
          <div><span>Wohnkostenquote</span><b className={fin.ratio<=.42?'good-value':'warning-value'}>{percent(fin.ratio)}</b></div>
        </div>
      </Panel>

      <Panel title="Mein Wohnungskauf" subtitle={`${completedJourney} von 6 Meilensteinen erledigt`} className="span-12">
        <div className="dashboard-journey">
          {['Eigenkapital','Finanzierung','Wohnung','Unterlagen','Kaufvertrag','Schlüssel'].map((label,i)=>
            <div key={label} className={i<completedJourney?'done':''}><i>{i<completedJourney?'✓':i+1}</i><span>{label}</span></div>
          )}
        </div>
      </Panel>

      <Panel title="Jahresfortschritt" className="span-12">
        <div className="year-list">{years.map((v,i)=>
          <div className="year-row" key={i}><span>Jahr {i+1}</span><div><i style={{width:`${Math.min(100,v/state.project.goal*100)}%`}}/></div><strong>{euro(v)}</strong></div>
        )}</div>
      </Panel>
    </div>
  </>
}
