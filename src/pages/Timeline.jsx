import { Panel } from '../components/Cards'
import { euro, timelineMilestones, projectedGoalDate, additionalMonthlyToGoal } from '../lib/calculations'

export default function Timeline({state}) {
  const milestones=timelineMilestones(state)
  const goalDate=projectedGoalDate(state)
  const extra=additionalMonthlyToGoal(state)
  const start=new Date(`${state.project.start}T12:00:00`)
  const target=new Date(`${state.project.target}T12:00:00`)
  const now=new Date()
  const total=Math.max(1,target-start)
  const position=Math.min(100,Math.max(0,((now-start)/total)*100))

  return <>
    <div className="timeline-hero">
      <div>
        <span>Projektzeitraum</span>
        <strong>{start.toLocaleDateString('de-DE',{month:'long',year:'numeric'})} bis {target.toLocaleDateString('de-DE',{month:'long',year:'numeric'})}</strong>
        <small>Heute liegst du bei {Math.round(position)} % der geplanten Zeit.</small>
      </div>
      <div className="timeline-progress-ring" style={{'--timeline-progress':`${position*3.6}deg`}}><b>{Math.round(position)}%</b></div>
    </div>

    <div className="content-grid">
      <Panel title="Zeitachse bis zum Wohnungskauf" subtitle="Automatisch aus Sparplan und Kaufziel berechnet" className="span-8">
        <div className="vertical-timeline">
          <div className="timeline-event done">
            <i>✓</i><div><b>Projektstart</b><span>{start.toLocaleDateString('de-DE')}</span></div>
          </div>
          <div className="timeline-event current">
            <i>●</i><div><b>Heute</b><span>{now.toLocaleDateString('de-DE')}</span></div>
          </div>
          {milestones.map((m,i)=><div className={`timeline-event ${m.date&&m.date<now?'done':''}`} key={i}>
            <i>{m.date&&m.date<now?'✓':i+1}</i>
            <div><b>{m.label}</b><span>{m.date?m.date.toLocaleDateString('de-DE',{month:'long',year:'numeric'}):'Mit aktuellem Plan noch nicht erreicht'}</span></div>
          </div>)}
          <div className="timeline-event purchase">
            <i>🏠</i><div><b>Geplanter Wohnungskauf</b><span>{target.toLocaleDateString('de-DE',{month:'long',year:'numeric'})}</span></div>
          </div>
        </div>
      </Panel>

      <Panel title="Prognose" subtitle="Was dein aktueller Plan bedeutet" className="span-4">
        <div className="timeline-insights">
          <div><span>Eigenkapitalziel</span><b>{euro(state.project.goal)}</b></div>
          <div><span>Voraussichtlich erreicht</span><b>{goalDate?goalDate.toLocaleDateString('de-DE',{month:'long',year:'numeric'}):'Später als geplant'}</b></div>
          <div><span>Zusätzliche Monatsrate</span><b>{euro(extra)}</b></div>
        </div>
      </Panel>
    </div>
  </>
}
