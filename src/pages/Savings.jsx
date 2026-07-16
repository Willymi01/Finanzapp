import { Panel } from '../components/Cards'
import { euro } from '../lib/calculations'

export default function Savings({ state, setState }) {
  const months=['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez']
  const edit=(y,m,v)=>setState(s=>({...s,monthlySavings:s.monthlySavings.map((yr,yi)=>yi===y?yr.map((x,mi)=>mi===m?Number(v):x):yr)}))
  const addSnapshot=()=> {
    const date=document.getElementById('snap-date').value
    const home=Number(document.getElementById('snap-home').value)
    const pension=Number(document.getElementById('snap-pension').value)
    const net=Number(document.getElementById('snap-net').value)
    if(!date)return
    setState(s=>({...s,assets:{...s.assets,home,pension},budget:{...s.budget,income:s.budget.income.map((x,i)=>i===0?{...x,amount:net}:x)},snapshots:[...s.snapshots,{id:crypto.randomUUID(),date,home,pension,net}]}))
  }
  return <>
    <Panel title="Monatliche Sparraten" subtitle="Alle 60 Monate wirken direkt auf die Prognose">
      <div className="table-wrap"><table className="savings-table"><thead><tr><th>Jahr</th>{months.map(m=><th key={m}>{m}</th>)}<th>Gesamt</th></tr></thead><tbody>{state.monthlySavings.map((yr,y)=><tr key={y}><td>Jahr {y+1}</td>{yr.map((v,m)=><td key={m}><input type="number" value={v} onChange={e=>edit(y,m,e.target.value)}/></td>)}<td><b>{euro(yr.reduce((a,b)=>a+Number(b),0))}</b></td></tr>)}</tbody></table></div>
    </Panel>
    <Panel title="Zwischenstand übernehmen" subtitle="Neue Ist-Werte verhindern doppelte Berechnung vergangener Monate">
      <div className="form-grid four"><label>Stichtag<input id="snap-date" type="date" defaultValue={new Date().toISOString().slice(0,10)}/></label><label>Wohnungssparen<input id="snap-home" type="number" defaultValue={state.assets.home}/></label><label>Rentenversicherung<input id="snap-pension" type="number" defaultValue={state.assets.pension}/></label><label>Nettoeinkommen<input id="snap-net" type="number" defaultValue={state.budget.income[0]?.amount||0}/></label></div>
      <button onClick={addSnapshot}>Zwischenstand speichern</button>
    </Panel>
  </>
}
