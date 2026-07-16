import { useState } from 'react'
import { exportState, importState } from '../lib/storage'
import { hashPin } from '../lib/security'

export default function Settings({state,setState,onLockChange}) {
 const [pin,setPin]=useState('')
 const set=(section,key,value)=>setState(s=>({...s,[section]:{...s[section],[key]:value}}))
 const savePin=async()=>{const pinHash=await hashPin(pin);setState(s=>({...s,security:{...s.security,pinHash}}));sessionStorage.removeItem('finanzzentrale_unlocked');onLockChange(Boolean(pinHash));alert(pinHash?'PIN gespeichert.':'PIN entfernt.')}
 return <div className="content-grid">
  <article className="panel span-6"><h2>Projekt</h2><div className="form-grid">
   {[['Projektstart','start','date'],['Kaufdatum','target','date'],['Eigenkapitalziel','goal','number'],['Kaufpreis','purchasePrice','number']].map(([l,k,t])=><label key={k}>{l}<input type={t} value={state.project[k]} onChange={e=>set('project',k,t==='number'?Number(e.target.value):e.target.value)}/></label>)}
  </div></article>
  <article className="panel span-6"><h2>Lokale App-Sperre</h2><label>Neue PIN (4–8 Ziffern)<input type="password" inputMode="numeric" maxLength="8" value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,''))}/></label><div className="button-row"><button onClick={savePin}>PIN speichern</button><button onClick={()=>{setPin('');setState(s=>({...s,security:{...s.security,pinHash:''}}));onLockChange(false)}}>PIN entfernen</button></div><p className="note">Die PIN schützt die Anzeige auf diesem Gerät. Cloud-Daten werden zusätzlich durch den Supabase-Login geschützt.</p></article>
  <article className="panel span-6"><h2>Daten & Backups</h2><p>Version 8.2 übernimmt automatisch Daten älterer Versionen. Vor einer Migration wird eine lokale Sicherung angelegt.</p><div className="button-row"><button onClick={()=>exportState(state)}>JSON exportieren</button><label className="button">JSON importieren<input hidden type="file" accept=".json" onChange={async e=>setState(await importState(e.target.files[0]))}/></label></div></article>
  <article className="panel span-6"><h2>Über diese Version</h2><div className="version-box"><b>Meine Finanzzentrale 8.2</b><span>Finanzplan im Excel-Stil</span><span>Wohnungscockpit</span><span>Finanzierungsszenarien</span><span>PIN-Sperre</span><span>Cloud & PWA</span></div></article>
 </div>
}
