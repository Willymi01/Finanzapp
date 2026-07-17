import { useState } from 'react'
import { Panel } from '../components/Cards'
import { addMonths, euro, monthStart, totalSpecialPayments } from '../lib/calculations'

const MobileSection=({title,subtitle,defaultOpen=false,children})=>{
  const [open,setOpen]=useState(defaultOpen)
  return <details className="mobile-section" open={open} onToggle={event=>setOpen(event.currentTarget.open)}>
    <summary><div><b>{title}</b><span>{subtitle}</span></div><i>⌄</i></summary>
    <div className="mobile-section-body">{children}</div>
  </details>
}

const monthsLong=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']

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
        {id:crypto.randomUUID(),date,home,pension,net,emergency:s.assets.emergency}
      ].sort((a,b)=>new Date(a.date)-new Date(b.date))
    }))
  }

  const removeSnapshot=id=>setState(s=>({...s,snapshots:s.snapshots.filter(x=>x.id!==id)}))

  const addSpecialPayment=()=>setState(s=>({
    ...s,
    specialPayments:[...(s.specialPayments||[]),{
      id:crypto.randomUUID(),
      year:start.getFullYear(),
      month:start.getMonth()+1,
      amount:0,
      target:'ETF / Eigenkapital',
      description:'Neue Sonderzahlung'
    }]
  }))

  const editSpecialPayment=(id,key,value)=>setState(s=>({
    ...s,
    specialPayments:(s.specialPayments||[]).map(p=>p.id===id?{
      ...p,
      [key]:['year','month','amount'].includes(key)?Number(value):value
    }:p)
  }))

  const removeSpecialPayment=id=>setState(s=>({
    ...s,
    specialPayments:(s.specialPayments||[]).filter(p=>p.id!==id)
  }))

  const latest=[...state.snapshots].sort((a,b)=>new Date(a.date)-new Date(b.date)).at(-1)
  const payments=[...(state.specialPayments||[])].sort((a,b)=>a.year-b.year||a.month-b.month)

  return <>
    <MobileSection title="Monatliche Sparraten" subtitle="5-Jahres-Sparplan" defaultOpen>
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
              const rowEnd=addMonths(rowStart,12)
              const monthlyTotal=yearValues.reduce((a,b)=>a+Number(b||0),0)
              const specialTotal=(state.specialPayments||[])
                .filter(payment=>{
                  const date=new Date(Number(payment.year),Number(payment.month)-1,1)
                  return date>=rowStart&&date<rowEnd
                })
                .reduce((sum,payment)=>sum+Math.max(0,Number(payment.amount||0)),0)
              const total=monthlyTotal+specialTotal
              return <tr key={year}>
                <td className="saving-year">
                  Jahr {year+1}
                  <small>{rowStart.toLocaleDateString('de-DE',{month:'2-digit',year:'numeric'})}–{addMonths(rowStart,11).toLocaleDateString('de-DE',{month:'2-digit',year:'numeric'})}</small>
                </td>
                {yearValues.map((value,month)=>{
                  const date=addMonths(rowStart,month)
                  const status=date<today?'saving-past':date.getTime()===today.getTime()?'saving-current':'saving-future'
                  const special=(state.specialPayments||[]).filter(p=>Number(p.year)===date.getFullYear()&&Number(p.month)===date.getMonth()+1)
                  const specialTotal=special.reduce((a,b)=>a+Number(b.amount||0),0)
                  return <td className={status} key={month} title={monthLong(date)}>
                    <input type="number" min="0" step="10" value={value} onChange={e=>edit(year,month,e.target.value)}/>
                    {specialTotal>0&&<small className="saving-special">+ {euro(specialTotal)}</small>}
                  </td>
                })}
                <td className="year-total-cell">
                  <b>{euro(total)}</b>
                  {specialTotal>0&&<small>{euro(monthlyTotal)} + {euro(specialTotal)} Sonderz.</small>}
                </td>
                <td>{euro(total/12)}</td>
              </tr>
            })}
          </tbody>
        </table>
      </div>
    </Panel>
    </MobileSection>

    <MobileSection title="Sonderzahlungen" subtitle={`Geplant ${euro(totalSpecialPayments(state))}`} defaultOpen>
    <Panel title="Sonderzahlungen" subtitle={`Geplant insgesamt ${euro(totalSpecialPayments(state))}`}
      action={<button onClick={addSpecialPayment}>+ Sonderzahlung</button>}>
      <div className="mobile-special-action">
        <button onClick={addSpecialPayment}>+ Sonderzahlung hinzufügen</button>
      </div>
      <p className="note">Sonderzahlungen werden im gewählten Monat eingerechnet. ETF-Zahlungen wachsen danach mit deiner Renditeannahme weiter.</p>
      {payments.length===0
        ? <div className="empty-state"><b>Noch keine Sonderzahlung geplant.</b><span>Lege z. B. Weihnachtsgeld, Urlaubsgeld oder einen Bonus an.</span></div>
        : <>
          <div className="table-wrap desktop-special-editor"><table className="special-payments-table">
            <thead><tr><th>Jahr</th><th>Monat</th><th>Betrag</th><th>Ziel</th><th>Beschreibung</th><th></th></tr></thead>
            <tbody>{payments.map(payment=><tr key={payment.id}>
              <td><input type="number" min={start.getFullYear()} max={start.getFullYear()+10} value={payment.year} onChange={e=>editSpecialPayment(payment.id,'year',e.target.value)}/></td>
              <td><select value={payment.month} onChange={e=>editSpecialPayment(payment.id,'month',e.target.value)}>
                {monthsLong.map((month,index)=><option value={index+1} key={month}>{month}</option>)}
              </select></td>
              <td><input type="number" min="0" step="50" value={payment.amount} onChange={e=>editSpecialPayment(payment.id,'amount',e.target.value)}/></td>
              <td><select value={payment.target} onChange={e=>editSpecialPayment(payment.id,'target',e.target.value)}>
                <option>ETF / Eigenkapital</option>
                <option>Rente</option>
                <option>Notgroschen</option>
              </select></td>
              <td><input value={payment.description||''} onChange={e=>editSpecialPayment(payment.id,'description',e.target.value)}/></td>
              <td><button className="danger" onClick={()=>removeSpecialPayment(payment.id)}>×</button></td>
            </tr>)}</tbody>
          </table></div>

          <div className="mobile-special-editor">
            {payments.map(payment=><article className="special-payment-card" key={payment.id}>
              <div className="special-payment-card-head">
                <b>{monthsLong[Number(payment.month)-1]} {payment.year}</b>
                <button className="danger" onClick={()=>removeSpecialPayment(payment.id)} aria-label="Sonderzahlung löschen">Löschen</button>
              </div>
              <div className="form-grid two">
                <label>Jahr<input type="number" min={start.getFullYear()} max={start.getFullYear()+10} value={payment.year} onChange={e=>editSpecialPayment(payment.id,'year',e.target.value)}/></label>
                <label>Monat<select value={payment.month} onChange={e=>editSpecialPayment(payment.id,'month',e.target.value)}>
                  {monthsLong.map((month,index)=><option value={index+1} key={month}>{month}</option>)}
                </select></label>
                <label>Betrag<input type="number" min="0" step="50" value={payment.amount} onChange={e=>editSpecialPayment(payment.id,'amount',e.target.value)}/></label>
                <label>Ziel<select value={payment.target} onChange={e=>editSpecialPayment(payment.id,'target',e.target.value)}>
                  <option>ETF / Eigenkapital</option>
                  <option>Rente</option>
                  <option>Notgroschen</option>
                </select></label>
              </div>
              <label>Beschreibung<input value={payment.description||''} onChange={e=>editSpecialPayment(payment.id,'description',e.target.value)}/></label>
            </article>)}
          </div>
        </>
      }
    </Panel>
    </MobileSection>

    <MobileSection title="Zwischenstände" subtitle="Ist-Werte übernehmen">
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
              <thead><tr><th>Stichtag</th><th>Wohnungssparen</th><th>Rente</th><th>Netto</th><th></th></tr></thead>
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
    </MobileSection>
  </>
}
