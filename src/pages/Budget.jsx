import { Panel } from '../components/Cards'
import { euro, incomeTotal, fixedTotal, variableTotal, surplus } from '../lib/calculations'

export default function Budget({ state, setState }) {
  const edit=(group,id,key,value)=>setState(s=>({...s,budget:{...s.budget,[group]:s.budget[group].map(x=>x.id===id?{...x,[key]:key==='name'?value:Number(value)}:x)}}))
  const remove=(group,id)=>setState(s=>({...s,budget:{...s.budget,[group]:s.budget[group].filter(x=>x.id!==id)}}))
  const add=group=>setState(s=>({...s,budget:{...s.budget,[group]:[...s.budget[group],group==='fixed'?{id:crypto.randomUUID(),name:'Neue Ausgabe',factor:1,cost:0}:{id:crypto.randomUUID(),name:'Neue Position',amount:0}]}}))
  return <>
    <div className="summary-grid">
      {['Einnahmen','Feste Kosten','Variable Kosten','Überhang'].map((x,i)=><div className={`summary ${i===3?'accent':''}`} key={x}><span>{x}</span><strong>{euro([incomeTotal(state),fixedTotal(state),variableTotal(state),surplus(state)][i])}</strong></div>)}
    </div>
    <div className="content-grid">
      <Panel title="Feste Ausgaben" subtitle="Intervall wird auf Monat umgerechnet" className="span-7" action={<button onClick={()=>add('fixed')}>+ Position</button>}>
        <div className="table-wrap"><table><thead><tr><th>Bezeichnung</th><th>alle X Monate</th><th>Betrag</th><th>monatlich</th><th/></tr></thead><tbody>{state.budget.fixed.map(x=><tr key={x.id}><td><input value={x.name} onChange={e=>edit('fixed',x.id,'name',e.target.value)}/></td><td><input type="number" value={x.factor} onChange={e=>edit('fixed',x.id,'factor',e.target.value)}/></td><td><input type="number" value={x.cost} onChange={e=>edit('fixed',x.id,'cost',e.target.value)}/></td><td>{euro(x.cost/Math.max(1,x.factor))}</td><td><button className="danger" onClick={()=>remove('fixed',x.id)}>×</button></td></tr>)}</tbody></table></div>
      </Panel>
      <Panel title="Variable Ausgaben" className="span-5" action={<button onClick={()=>add('variable')}>+ Position</button>}>
        <div className="table-wrap"><table><tbody>{state.budget.variable.map(x=><tr key={x.id}><td><input value={x.name} onChange={e=>edit('variable',x.id,'name',e.target.value)}/></td><td><input type="number" value={x.amount} onChange={e=>edit('variable',x.id,'amount',e.target.value)}/></td><td><button className="danger" onClick={()=>remove('variable',x.id)}>×</button></td></tr>)}</tbody></table></div>
      </Panel>
    </div>
  </>
}
