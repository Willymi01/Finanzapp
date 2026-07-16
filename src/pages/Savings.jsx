import { Panel } from '../components/Cards'
import { addMonths, euro, monthStart } from '../lib/calculations'

export default function Savings({ state, setState }) {
  const start = monthStart(new Date(`${state.project.start}T12:00:00`))
  const today = monthStart(new Date())
  const monthName = date => date.toLocaleDateString('de-DE', { month: 'short' }).replace('.', '')
  const monthLong = date => date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })

  const edit=(year,month,value)=>setState(s=>({
    ...s,
    monthlySavings:s.monthlySavings.map((row,y)=>
      y===year ? row.map((old,m)=>m===month ? Math.max(0,Number(value)) : old) : row
    )
  }))

  const addSnapshot=()=> {
    const date=document.getElementById('snap-date').value
    const home=Number(document.getElementById('snap-home').value)
    const pension=Number(document.getElementById('snap-pension').value)
    const net=Number(document.getElementById('snap-net').value)
    if(!date || !Number.isFinite(home) || !Number.isFinite(pension) || !Number.isFinite(net)) {
      alert('Bitte alle Werte vollständig eingeben.')
      return
    }
    setState(s=>({
      ...s,
      assets:{...s.assets,home,pension},
      budget:{...s.budget,income:s.budget.income.map((x,i)=>i===0?{...x,amount:net}:x)},
      snapshots:[
        ...s.snapshots.filter(x=>x.date!==date),
        {id:crypto.randomUUID(),date,home,pension,net}
      ].sort((a,b)=>new Date(a.date)-new Date(b.date))
    }))
  }

  const removeSnapshot=id=>setState(s=>({...s,snapshots:s.snapshots.filter(x=>x.id!==id)}))

  const latest=[...state.snapshots].sort((a,b)=>new Date(a.date)-new Date(b.date)).at(-1)

  return <>
    <Panel title="Monatliche Sparraten" subtitle={`Projektstart ${start.toLocaleDateString('de-DE',{month:'long',year:'numeric'})} · der aktuelle Monat ist grün markiert`}>
      <div className="savings-legend">
        <span><i className="legend past-legend"/>Vergangen</span>
        <span><i className="legend current-legend"/>Aktueller Monat</span>
        <span><i className="legend future-legend"/>Zukünftig</span>
      </div>
      <div className="table-wrap">
        <table className="savings-table dated-savings">
          <thead>
            <tr>
              <th>Sparjahr</th>
              {Array.from({length:12},(_,m)=>{
                const d=addMonths(start,m)
                return <th key={m}>{monthName(d)}</th>
              })}
              <th>Gesamt</th>
              <th>Ø mtl.</th>
            </tr>
          </thead>
          <tbody>
            {state.monthlySavings.map((yearValues,year)=>{
              const rowStart=addMonths(start,year*12)
              const total=yearValues.reduce((a,b)=>a+Number(b||0),0)
              return <tr key={year}>
                <td className="saving-year">
                  Jahr {year+1}
                  <small>{rowStart.toLocaleDateString('de-DE',{month:'2-digit',year:'numeric'})}–{addMonths(rowStart,11).toLocaleDateString('de-DE',{month:'2-digit',year:'numeric'})}</small>
                </td>
                {yearValues.map((value,month)=>{
                  const date=addMonths(rowStart,month)
                  const status=date<today?'saving-past':date.getTime()===today.getTime()?'saving-current':'saving-future'
                  return <td className={status} key={month} title={monthLong(date)}>
                    <input type="number" min="0" step="10" value={value} onChange={e=>edit(year,month,e.target.value)}/>
                  </td>
                })}
                <td><b>{euro(total)}</b></td>
                <td>{euro(total/12)}</td>
              </tr>
            })}
          </tbody>
        </table>
      </div>
    </Panel>

    <Panel title="Zwischenstand übernehmen" subtitle="Ab dem Stichtag rechnet die Prognose mit deinen echten Ist-Werten weiter">
      <div className="form-grid four">
        <label>Stichtag<input id="snap-date" type="date" defaultValue={new Date().toISOString().slice(0,10)}/></label>
        <label>Wohnungssparen<input id="snap-home" type="number" defaultValue={latest?.home??state.assets.home}/></label>
        <label>Rentenversicherung<input id="snap-pension" type="number" defaultValue={latest?.pension??state.assets.pension}/></label>
        <label>Nettoeinkommen<input id="snap-net" type="number" defaultValue={latest?.net??state.budget.income[0]?.amount??0}/></label>
      </div>
      <button onClick={addSnapshot}>Zwischenstand speichern</button>

      <div className="snapshot-history">
        <h3>Gespeicherte Zwischenstände</h3>
        {state.snapshots.length===0
          ? <p className="note">Noch kein Zwischenstand gespeichert. Das ist beim ersten Start richtig.</p>
          : <div className="table-wrap"><table>
              <thead><tr><th>Stichtag</th><th>Wohnungssparen</th><th>Rente</th><th>Netto</th><th/></tr></thead>
              <tbody>{[...state.snapshots].sort((a,b)=>new Date(b.date)-new Date(a.date)).map(s=>
                <tr key={s.id}>
                  <td>{new Date(`${s.date}T12:00:00`).toLocaleDateString('de-DE')}</td>
                  <td>{euro(s.home)}</td><td>{euro(s.pension)}</td><td>{euro(s.net)}</td>
                  <td><button className="danger" onClick={()=>removeSnapshot(s.id)}>×</button></td>
                </tr>
              )}</tbody>
            </table></div>
        }
      </div>
    </Panel>
  </>
}
