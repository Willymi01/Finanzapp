import { Panel } from '../components/Cards'
import { euro, incomeTotal, fixedTotal, variableTotal, surplus } from '../lib/calculations'

const Row = ({item,group,edit,remove,fixed=false}) => <tr>
  <td><input value={item.name} onChange={e=>edit(group,item.id,'name',e.target.value)}/></td>
  {fixed&&<td><input type="number" min="1" value={item.factor} onChange={e=>edit(group,item.id,'factor',e.target.value)}/></td>}
  <td><input type="number" step=".01" value={fixed?item.cost:item.amount} onChange={e=>edit(group,item.id,fixed?'cost':'amount',e.target.value)}/></td>
  {fixed&&<td>{euro(item.cost/Math.max(1,item.factor))}</td>}
  <td><button className="danger" onClick={()=>remove(group,item.id)}>×</button></td>
</tr>

export default function Budget({ state, setState }) {
  const edit=(group,id,key,value)=>setState(s=>({...s,budget:{...s.budget,[group]:s.budget[group].map(x=>x.id===id?{...x,[key]:key==='name'?value:Number(value)}:x)}}))
  const remove=(group,id)=>setState(s=>({...s,budget:{...s.budget,[group]:s.budget[group].filter(x=>x.id!==id)}}))
  const add=group=>setState(s=>({...s,budget:{...s.budget,[group]:[...s.budget[group],group==='fixed'?{id:crypto.randomUUID(),name:'Neue Ausgabe',factor:1,cost:0}:{id:crypto.randomUUID(),name:'Neue Position',amount:0}]}}))
  const annualIn=state.budget.annualIncome.reduce((a,b)=>a+Number(b.amount||0),0)
  const annualOut=state.budget.annualExpense.reduce((a,b)=>a+Number(b.amount||0),0)
  return <>
    <div className="finance-title">Finanzplan</div>
    <div className="summary-grid excel-summary">
      <div className="summary income"><span>Einkommen</span><strong>{euro(incomeTotal(state))}</strong></div>
      <div className="summary expense"><span>Feste Ausgaben</span><strong>{euro(fixedTotal(state))}</strong></div>
      <div className="summary expense"><span>Variable Ausgaben</span><strong>{euro(variableTotal(state))}</strong></div>
      <div className="summary accent"><span>Überhang / Sparen</span><strong>{euro(surplus(state))}</strong></div>
    </div>
    <div className="content-grid">
      <Panel title="Einkommen" className="span-5 green-panel" action={<button onClick={()=>add('income')}>+ Einkommen</button>}>
        <div className="table-wrap"><table><tbody>{state.budget.income.map(x=><Row key={x.id} item={x} group="income" edit={edit} remove={remove}/>)}</tbody></table></div>
      </Panel>
      <Panel title="Schnellübersicht" className="span-7 yellow-panel">
        <div className="calculation-stack">
          <div><span>Einkommen − feste Ausgaben</span><b>{euro(incomeTotal(state)-fixedTotal(state))}</b></div>
          <div><span>Verfügbar nach allen Kosten</span><b className={surplus(state)>=0?'positive':'negative'}>{euro(surplus(state))}</b></div>
          <div><span>Jährliche Sonderposten</span><b>{euro(annualIn-annualOut)}</b></div>
        </div>
      </Panel>
      <Panel title="Feste Ausgaben" subtitle="Kosten je Fälligkeit werden automatisch auf den Monat umgerechnet" className="span-7 red-panel" action={<button onClick={()=>add('fixed')}>+ Position</button>}>
        <div className="table-wrap"><table><thead><tr><th>Bezeichnung</th><th>Faktor Monate</th><th>Kosten</th><th>Monatlich</th><th/></tr></thead><tbody>{state.budget.fixed.map(x=><Row key={x.id} item={x} group="fixed" edit={edit} remove={remove} fixed/>)}</tbody></table></div>
      </Panel>
      <Panel title="Variable Ausgaben" className="span-5 red-panel" action={<button onClick={()=>add('variable')}>+ Position</button>}>
        <div className="table-wrap"><table><tbody>{state.budget.variable.map(x=><Row key={x.id} item={x} group="variable" edit={edit} remove={remove}/>)}</tbody></table></div>
      </Panel>
      <Panel title="Jährliche Sonderposten" subtitle={`Differenz ${euro(annualIn-annualOut)}`} className="span-12 blue-panel">
        <div className="annual-columns">
          <div><div className="subhead green">Einnahmen</div><button onClick={()=>add('annualIncome')}>+ Einnahme</button><table><tbody>{state.budget.annualIncome.map(x=><Row key={x.id} item={x} group="annualIncome" edit={edit} remove={remove}/>)}</tbody></table></div>
          <div><div className="subhead orange">Ausgaben</div><button onClick={()=>add('annualExpense')}>+ Ausgabe</button><table><tbody>{state.budget.annualExpense.map(x=><Row key={x.id} item={x} group="annualExpense" edit={edit} remove={remove}/>)}</tbody></table></div>
        </div>
      </Panel>
    </div>
  </>
}
