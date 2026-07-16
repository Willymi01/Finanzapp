import { MetricCard, Panel } from '../components/Cards'
import SimpleChart from '../components/SimpleChart'
import { euro, projection } from '../lib/calculations'

export default function Assets({state,setState}) {
  const vals=projection(state).filter(x=>x.total!=null).map(x=>x.total)
  const total=state.assets.home+state.assets.pension+state.assets.emergency

  const update=(key,value)=>setState(s=>({
    ...s,
    assets:{...s.assets,[key]:Math.max(0,Number(value)||0)}
  }))

  return <>
    <div className="metric-grid">
      <MetricCard label="Wohnungssparen" value={euro(state.assets.home)}/>
      <MetricCard label="Rente" value={euro(state.assets.pension)}/>
      <MetricCard label="Notgroschen" value={euro(state.assets.emergency)}/>
      <MetricCard label="Gesamt" value={euro(total)} accent/>
    </div>

    <div className="content-grid">
      <Panel title="Aktuelle Vermögenswerte bearbeiten" subtitle="Änderungen wirken sofort auf Dashboard und Prognose" className="span-5">
        <div className="asset-edit-form">
          <label>Wohnungssparen / ETF
            <input type="number" min="0" step="100" value={state.assets.home} onChange={e=>update('home',e.target.value)}/>
          </label>
          <label>Rentenversicherung
            <input type="number" min="0" step="100" value={state.assets.pension} onChange={e=>update('pension',e.target.value)}/>
          </label>
          <label>Notgroschen
            <input type="number" min="0" step="100" value={state.assets.emergency} onChange={e=>update('emergency',e.target.value)}/>
          </label>
          <button onClick={()=>update('emergency',0)}>Notgroschen auf 0 € setzen</button>
        </div>
        <p className="note">Der Notgroschen war bisher nur ein voreingestellter Planwert von 5.000 €. Er ist kein berechneter Kontostand.</p>
      </Panel>

      <Panel title="Vermögensprognose" subtitle="Wohnungssparen und Rentenwert bis zum Kaufzeitpunkt" className="span-7">
        <SimpleChart values={vals} goal={state.project.goal}/>
      </Panel>
    </div>
  </>
}
