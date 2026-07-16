import { MetricCard, Panel } from '../components/Cards'
import SimpleChart from '../components/SimpleChart'
import { euro, percent, projection, financing, surplus } from '../lib/calculations'

export default function Dashboard({ state }) {
  const current = state.assets.home + state.assets.pension
  const plan = projection(state).filter(x=>x.total!=null)
  const fin = financing(state)
  const gap = Math.max(0, state.project.goal - fin.equity)
  const currentMonth = state.monthlySavings[0][new Date().getMonth()] || 0
  const years = Array.from({length:5},(_,i)=>plan[(i+1)*12-1]?.total||0)
  return <>
    <div className="metric-grid">
      <MetricCard label="Eigenkapital" value={euro(current)} hint={`von ${euro(state.project.goal)}`} accent><div className="progress"><div style={{width:`${Math.min(100,current/state.project.goal*100)}%`}}/></div></MetricCard>
      <MetricCard label="Kaufziel" value={euro(state.project.purchasePrice)} hint={`Ziel: ${new Date(state.project.target).toLocaleDateString('de-DE',{month:'long',year:'numeric'})}`}/>
      <MetricCard label="Monatlicher Überhang" value={euro(surplus(state))} hint="nach geplanten Kosten"/>
      <MetricCard label="Voraussichtliche Kreditrate" value={euro(fin.rate)} hint={`Wohnkostenquote ${percent(fin.ratio)}`}/>
    </div>
    <div className="content-grid">
      <Panel title="Vermögensentwicklung" subtitle="Plan bis zum Kaufzeitpunkt" className="span-8"><SimpleChart values={plan.map(x=>x.total)} goal={state.project.goal}/></Panel>
      <Panel title="Heute" subtitle="Dein nächster Schritt" className="span-4"><div className="coach">Diesen Monat sind <b>{euro(currentMonth)}</b> vorgesehen.<br/>Noch fehlen rechnerisch <b>{euro(gap)}</b> bis zum Ziel.</div></Panel>
      <Panel title="Jahresfortschritt" className="span-12"><div className="year-list">{years.map((v,i)=><div className="year-row" key={i}><span>Jahr {i+1}</span><div><i style={{width:`${Math.min(100,v/state.project.goal*100)}%`}}/></div><strong>{euro(v)}</strong></div>)}</div></Panel>
    </div>
  </>
}
