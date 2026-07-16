import { MetricCard, Panel } from '../components/Cards'
import SimpleChart from '../components/SimpleChart'
import { euro, projection } from '../lib/calculations'
export default function Assets({state}) {
 const vals=projection(state).filter(x=>x.total!=null).map(x=>x.total)
 return <><div className="metric-grid"><MetricCard label="Wohnungssparen" value={euro(state.assets.home)}/><MetricCard label="Rente" value={euro(state.assets.pension)}/><MetricCard label="Notgroschen" value={euro(state.assets.emergency)}/><MetricCard label="Gesamt" value={euro(state.assets.home+state.assets.pension+state.assets.emergency)} accent/></div><Panel title="Vermögensprognose"><SimpleChart values={vals} goal={state.project.goal}/></Panel></>
}
