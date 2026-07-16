import { useState } from 'react'
import { Panel } from '../components/Cards'
import SimpleChart from '../components/SimpleChart'
import DonutChart from '../components/DonutChart'
import {
  euro, percent, projection, budgetBreakdown, annualStatistics,
  monthlyActualSeries, monthlyReview, incomeTotal, fixedTotal,
  variableTotal, surplus, currentGoalProgress
} from '../lib/calculations'

const colors=['#92d050','#5b9bd5','#ffd166','#ef6461','#9b7ede','#4ecdc4','#ff9f43','#c7d0d9']

export default function Statistics({state}) {
  const [period,setPeriod]=useState('Gesamt')
  const projected=projection(state).filter(x=>x.total!=null)
  const actual=monthlyActualSeries(state)
  const annual=annualStatistics(state)
  const breakdown=budgetBreakdown(state)
  const review=monthlyReview(state)
  const income=incomeTotal(state)
  const fixed=fixedTotal(state)
  const variable=variableTotal(state)
  const free=Math.max(0,surplus(state))
  const progress=currentGoalProgress(state)

  const visibleProjection = period==='Monat'
    ? projected.slice(0,12)
    : period==='Jahr'
      ? projected.filter((_,i)=>i%12===11)
      : projected

  const budgetSegments=[
    {label:'Fixkosten',value:fixed,color:'#ef6461',display:euro(fixed)},
    {label:'Variable Kosten',value:variable,color:'#ffd166',display:euro(variable)},
    {label:'Überhang',value:free,color:'#92d050',display:euro(free)}
  ]

  return <>
    <section className="statistics-hero">
      <div>
        <span>Statistik-Center Pro</span>
        <h2>Deine Finanzen auf einen Blick</h2>
        <p>Vermögen, Sparquote, Sonderzahlungen, Ausgaben und Jahresentwicklung automatisch ausgewertet.</p>
      </div>
      <div className="statistics-progress">
        <strong>{Math.round(progress*100)}%</strong><span>Eigenkapitalziel</span>
      </div>
    </section>

    <div className="statistics-kpis">
      <div><span>Eigenkapital heute</span><b>{euro(state.assets.home+state.assets.pension)}</b></div>
      <div><span>Rest bis Ziel</span><b>{euro(Math.max(0,state.project.goal-state.assets.home-state.assets.pension))}</b></div>
      <div><span>Monatliche Sparquote</span><b>{percent(income>0?free/income:0)}</b></div>
      <div><span>Überhang</span><b>{euro(free)}</b></div>
    </div>

    <div className="content-grid">
      <Panel title="Vermögensentwicklung" subtitle="Prognose für den gewählten Zeitraum" className="span-8"
        action={<div className="period-tabs">{['Monat','Jahr','Gesamt'].map(x=><button key={x} className={period===x?'active':''} onClick={()=>setPeriod(x)}>{x}</button>)}</div>}>
        <SimpleChart values={visibleProjection.map(x=>x.total)} goal={state.project.goal}/>
        <div className="statistics-chart-labels"><span>Start {euro(visibleProjection[0]?.total||0)}</span><span>Ende {euro(visibleProjection.at(-1)?.total||0)}</span></div>
        {actual.length>1&&<div className="actual-history-note">✓ {actual.length-1} echte Zwischenstände sind in deiner Historie gespeichert.</div>}
      </Panel>

      <Panel title="Monatsrückblick" subtitle={review.label} className="span-4">
        <div className="monthly-review">
          <div><span>Geplante Sparrate</span><b>{euro(review.planned)}</b></div>
          <div><span>Sparquote</span><b>{percent(review.savingsRate)}</b></div>
          <div><span>Eigenkapital</span><b>{euro(review.current)}</b></div>
          <div><span>Ziel erreicht</span><b>{percent(review.progress)}</b></div>
          <div className="review-highlight"><span>Nächster Meilenstein</span><b>{euro(review.nextMilestone)}</b><small>Noch {euro(review.remaining)}</small></div>
        </div>
      </Panel>

      <Panel title="Monatliche Budgetverteilung" subtitle={`Einkommen ${euro(income)}`} className="span-6">
        <DonutChart segments={budgetSegments} centerLabel="Einkommen" centerValue={euro(income)}/>
      </Panel>

      <Panel title="Ausgaben nach Bereichen" subtitle="Automatisch aus den Bezeichnungen zugeordnet" className="span-6">
        <div className="expense-bars">
          {breakdown.map((item,index)=>{
            const max=breakdown[0]?.value||1
            return <div key={item.label}>
              <div><span>{item.label}</span><b>{euro(item.value)}</b></div>
              <div className="expense-track"><i style={{width:`${item.value/max*100}%`,background:colors[index%colors.length]}}/></div>
            </div>
          })}
        </div>
      </Panel>

      <Panel title="Jahresvergleich" subtitle="Geplante Einzahlungen, Vermögen und Sparquote" className="span-12">
        <div className="table-wrap"><table className="statistics-table">
          <thead><tr><th>Jahr</th><th>Geplant gespart</th><th>Vermögen Jahresende</th><th>Rendite / Wachstum</th><th>Sparquote</th></tr></thead>
          <tbody>{annual.map(row=><tr key={row.year}>
            <td>{row.year}</td><td>{euro(row.planned)}</td><td>{euro(row.value)}</td><td>{euro(row.growth)}</td><td>{percent(row.savingsRate)}</td>
          </tr>)}</tbody>
        </table></div>
      </Panel>

      <Panel title="Automatische Erkenntnisse" subtitle="Direkt aus deinen aktuellen Zahlen" className="span-12">
        <div className="statistics-insights">
          <div className={free>0?'good':'warn'}><i>{free>0?'✓':'!'}</i><span><b>Monatlicher Spielraum</b><small>{free>0?`Nach allen geplanten Kosten bleiben ${euro(free)} übrig.`:'Dein Budget hat aktuell keinen positiven Überhang.'}</small></span></div>
          <div className={progress>=.25?'good':'neutral'}><i>{progress>=.25?'✓':'i'}</i><span><b>Eigenkapitalfortschritt</b><small>Du hast {percent(progress)} deines Eigenkapitalziels erreicht.</small></span></div>
          <div className={annual.at(-1)?.value>=state.project.goal?'good':'warn'}><i>{annual.at(-1)?.value>=state.project.goal?'✓':'!'}</i><span><b>Fünf-Jahres-Prognose</b><small>{annual.at(-1)?.value>=state.project.goal?'Das Ziel wird mit dem aktuellen Modell erreicht.':`Am Ende fehlen im Modell noch ${euro(state.project.goal-(annual.at(-1)?.value||0))}.`}</small></span></div>
        </div>
      </Panel>
    </div>
  </>
}
