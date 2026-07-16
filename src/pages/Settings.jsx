import { useEffect, useState } from 'react'
import {
  exportState, importState, createLocalBackup, listLocalBackups,
  restoreLocalBackup, deleteLocalBackup, clearLocalBackups
} from '../lib/storage'
import { hashPin } from '../lib/security'

export default function Settings({state,setState,onLockChange}) {
 const [pin,setPin]=useState('')
 const [backups,setBackups]=useState([])
 const refresh=()=>setBackups(listLocalBackups())
 useEffect(refresh,[])

 const set=(section,key,value)=>setState(s=>({...s,[section]:{...s[section],[key]:value}}))
 const savePin=async()=>{
   const pinHash=await hashPin(pin)
   setState(s=>({...s,security:{...s.security,pinHash}}))
   sessionStorage.removeItem('finanzzentrale_unlocked')
   onLockChange(Boolean(pinHash))
   alert(pinHash?'PIN gespeichert.':'PIN entfernt.')
 }
 const makeBackup=()=>{
   createLocalBackup(state,'Manuelle Sicherung')
   refresh()
   alert('Lokale Sicherung erstellt.')
 }
 const doImport=async file=>{
   if(!file)return
   try{
     createLocalBackup(state,'Vor JSON-Import')
     const imported=await importState(file)
     if(confirm('Aktuelle Daten durch die importierte Sicherung ersetzen?')){
       setState(imported)
       refresh()
       alert('Sicherung importiert.')
     }
   }catch(error){alert(`Import fehlgeschlagen: ${error.message}`)}
 }
 const restore=id=>{
   if(!confirm('Aktuellen Stand durch diese Sicherung ersetzen?'))return
   createLocalBackup(state,'Vor Wiederherstellung')
   setState(restoreLocalBackup(id))
   refresh()
   alert('Sicherung wiederhergestellt.')
 }
 const remove=id=>{
   if(!confirm('Diese Sicherung löschen?'))return
   deleteLocalBackup(id);refresh()
 }

 return <div className="content-grid">
  <article className="panel span-6">
   <h2>Projekt</h2>
   <div className="form-grid">
    {[['Projektstart','start','date'],['Kaufdatum','target','date'],['Eigenkapitalziel','goal','number'],['Kaufpreis','purchasePrice','number']].map(([l,k,t])=>
      <label key={k}>{l}<input type={t} value={state.project[k]} onChange={e=>set('project',k,t==='number'?Number(e.target.value):e.target.value)}/></label>
    )}
   </div>
  </article>

  <article className="panel span-6">
   <h2>Lokale App-Sperre</h2>
   <label>Neue PIN (4–8 Ziffern)
    <input type="password" inputMode="numeric" maxLength="8" value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,''))}/>
   </label>
   <div className="button-row">
    <button onClick={savePin}>PIN speichern</button>
    <button onClick={()=>{setPin('');setState(s=>({...s,security:{...s.security,pinHash:''}}));onLockChange(false)}}>PIN entfernen</button>
   </div>
   <p className="note">Die PIN schützt die Anzeige auf diesem Gerät. Cloud-Daten werden zusätzlich durch den Supabase-Login geschützt.</p>
  </article>

  <article className="panel span-12">
   <div className="panel-head">
    <div><h2>Backup-Zentrale</h2><p>Zusätzliche Sicherung neben der Supabase-Cloud</p></div>
    <button onClick={makeBackup}>Lokale Sicherung erstellen</button>
   </div>

   <div className="backup-actions">
    <button onClick={()=>exportState(state)}>JSON-Datei exportieren</button>
    <label className="button">JSON-Datei importieren
      <input hidden type="file" accept=".json,application/json" onChange={e=>doImport(e.target.files?.[0])}/>
    </label>
   </div>

   <div className="backup-info">
    <div><b>JSON-Export</b><span>Für OneDrive, USB-Stick oder einen neuen Computer.</span></div>
    <div><b>Lokale Sicherungen</b><span>Bis zu 12 frühere Stände bleiben in diesem Browser gespeichert.</span></div>
    <div><b>Cloud</b><span>Supabase synchronisiert deinen aktuellen Stand zwischen PC und Handy.</span></div>
   </div>

   <h3 className="backup-heading">Lokale Sicherungsverläufe</h3>
   {backups.length===0
    ? <div className="empty-state"><b>Noch keine lokale Sicherung.</b><span>Erstelle vor größeren Änderungen eine Sicherung.</span></div>
    : <div className="table-wrap"><table>
      <thead><tr><th>Datum</th><th>Grund</th><th>Version</th><th></th></tr></thead>
      <tbody>{backups.map(item=><tr key={item.id}>
        <td>{new Date(item.createdAt).toLocaleString('de-DE')}</td>
        <td>{item.reason}</td>
        <td>Schema {item.schemaVersion}</td>
        <td className="backup-buttons">
          <button onClick={()=>restore(item.id)}>Wiederherstellen</button>
          <button className="danger" onClick={()=>remove(item.id)}>Löschen</button>
        </td>
      </tr>)}</tbody>
    </table></div>
   }
   {backups.length>0&&<button className="danger backup-clear" onClick={()=>{if(confirm('Alle lokalen Sicherungen löschen?')){clearLocalBackups();refresh()}}}>Alle lokalen Sicherungen löschen</button>}
  </article>

  <article className="panel span-12">
   <h2>Empfohlene Sicherungsroutine</h2>
   <div className="backup-routine">
    <div><i>1</i><span><b>Automatische Cloud-Synchronisierung</b><small>Für PC und Handy aktiviert lassen.</small></span></div>
    <div><i>2</i><span><b>Monatlicher JSON-Export</b><small>Datei auf OneDrive oder externem Speicher ablegen.</small></span></div>
    <div><i>3</i><span><b>Vor großen Änderungen sichern</b><small>Über „Lokale Sicherung erstellen“ einen Wiederherstellungspunkt anlegen.</small></span></div>
   </div>
  </article>
 </div>
}
