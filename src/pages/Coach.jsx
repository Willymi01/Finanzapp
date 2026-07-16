import { useMemo, useState } from 'react'
import { Panel } from '../components/Cards'
import {
  euro, percent, financeCoachAnalysis, simulateAdditionalSaving,
  coachWeeklyReport, coachMonthlyReport, totalSpecialPayments
} from '../lib/calculations'

const icon={good:'✓',warn:'!',neutral:'i'}

export default function Coach({state,setState}) {
  const [filter,setFilter]=useState('Alle')
  const analysis=useMemo(()=>financeCoachAnalysis(state),[state])
  const weekly=useMemo(()=>coachWeeklyReport(state),[state])
  const monthly=useMemo(()=>coachMonthlyReport(state),[state])
  const scenarios=useMemo(()=>[25,50,100].map(value=>simulateAdditionalSaving(state,value)),[state])
  const specialTotal=totalSpecialPayments(state)

  const categories=['Alle',...new Set(analysis.insights.map(item=>item.category))]
  const visible=filter==='Alle'?analysis.insights:analysis.insights.filter(item=>item.category===filter)

  const applyExtra=value=>{
    if(!confirm(`Die Sparrate in allen zukünftigen Monaten um ${euro(value)} erhöhen?`))return
    const now=new Date()
    const start=new Date(`${state.project.start}T12:00:00`)
    const currentIndex=(now.getFullYear()-start.getFullYear())*12+now.getMonth()-start.getMonth()
    setState(s=>({
      ...s,
      monthlySavings:s.monthlySavings.map((row,y)=>row.map((old,m)=>{
        const index=y*12+m
        return index>=Math.max(0,currentIndex)?Number(old||0)+value:Number(old||0)
      }))
    }))
  }

  const formatDate=date=>date
    ? date.toLocaleDateString('de-DE',{month:'long',year:'numeric'})
    : 'nach dem Planzeitraum'

  return <>
    <section className="coach-hero-pro">
      <div>
        <span>Finanzcoach Pro</span>
        <h2>Deine Zahlen verständlich erklärt</h2>
        <p>Regelbasierte Analysen aus deinem Finanzplan inklusive Sonderzahlungen – transparent und ohne externe KI-Übertragung.</p>
      </div>
      <div className={`coach-status ${analysis.status.kind}`}>
        <strong>{analysis.status.label}</strong><span>aktueller Planstatus</span>
      </div>
    </section>

    <div className="coach-summary-grid">
      <div><span>Eigenkapital</span><b>{euro(analysis.current)}</b></div>
      <div><span>Ziel erreicht</span><b>{percent(analysis.progress)}</b></div>
      <div><span>Sparquote</span><b>{percent(analysis.saveRate)}</b></div>
      <div><span>ETF-Renditeeffekt</span><b>{euro(analysis.returns)}</b></div>
      <div><span>Sonderzahlungen geplant</span><b>{euro(specialTotal)}</b></div>
    </div>

    <div className="coach-filter">
      {categories.map(item=><button key={item} className={filter===item?'active':''} onClick={()=>setFilter(item)}>{item}</button>)}
    </div>

    <div className="content-grid">
      <Panel title="Persönliche Analyse" subtitle="Nur Hinweise, die zu deinen aktuellen Daten passen" className="span-8">
        <div className="coach-analysis-list">
          {visible.map((item,index)=><article className={`coach-analysis ${item.type}`} key={`${item.category}-${index}`}>
            <i>{icon[item.type]||'i'}</i>
            <div><span>{item.category}</span><h3>{item.title}</h3><p>{item.text}</p></div>
          </article>)}
        </div>
      </Panel>

      <Panel title="Schnellüberblick" subtitle="Wichtige Kennzahlen" className="span-4">
        <div className="coach-facts">
          <div><span>Finanzierungsbedarf</span><b>{euro(analysis.financing.need)}</b></div>
          <div><span>Kreditrate</span><b>{euro(analysis.financing.rate)}</b></div>
          <div><span>Wohnkostenquote</span><b>{percent(analysis.financing.ratio)}</b></div>
          <div><span>Reserve</span><b>{analysis.reserveMonths.toFixed(1)} Monate</b></div>
          <div><span>Nächster Meilenstein</span><b>{euro(analysis.milestone.target)}</b></div>
        </div>
      </Panel>

      <Panel title="Was wäre, wenn du mehr sparst?" subtitle="Auswirkung auf Zieltermin und Endvermögen" className="span-12">
        <div className="coach-scenarios">
          {scenarios.map(scenario=><article key={scenario.extraMonthly}>
            <span>+ {euro(scenario.extraMonthly)} pro Monat</span>
            <strong>{formatDate(scenario.goalDate)}</strong>
            <small>Endvermögen {euro(scenario.finalValue)}</small>
            <button onClick={()=>applyExtra(scenario.extraMonthly)}>Auf zukünftige Monate anwenden</button>
          </article>)}
        </div>
      </Panel>

      <Panel title={weekly.title} subtitle="Automatisch aus den letzten und nächsten sieben Tagen" className="span-6">
        <ul className="coach-report">{weekly.items.map(item=><li key={item}>{item}</li>)}</ul>
      </Panel>

      <Panel title={monthly.title} subtitle="Aktueller Monatsstand" className="span-6">
        <ul className="coach-report">{monthly.items.map(item=><li key={item}>{item}</li>)}</ul>
      </Panel>

      <Panel title="So arbeitet der Coach" className="span-12">
        <div className="coach-transparency">
          <div><b>Keine externe KI</b><span>Die Hinweise werden lokal aus deinen gespeicherten Zahlen berechnet.</span></div>
          <div><b>Nachvollziehbar</b><span>ETF-Rendite, Sparquote, Wohnkosten und Zieltermin sind die Grundlage.</span></div>
          <div><b>Keine Finanzberatung</b><span>Die Ergebnisse sind Planungsmodelle und ersetzen keine Bank- oder Anlageberatung.</span></div>
        </div>
      </Panel>
    </div>
  </>
}
