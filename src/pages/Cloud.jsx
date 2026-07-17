import { Cloud as CloudIcon, Download, RefreshCw, Upload, MonitorSmartphone, CheckCircle2, AlertTriangle } from 'lucide-react'

const rows=[['Sparplan-Monate','sparplan'],['Sonderzahlungen','sonderzahlungen'],['Zwischenstände','zwischenstaende'],['Immobilien','immobilien'],['Dokumente','dokumente']]

function StatusIcon({kind}){
  return kind==='good'?<CheckCircle2 size={22}/>:kind==='warn'||kind==='info'?<AlertTriangle size={22}/>:<CloudIcon size={22}/>
}

export default function Cloud({cloud}) {
 return <div className="content-grid cloud-center">
  <article className="panel span-12 cloud-overview">
   <div className={`cloud-status-hero ${cloud.status.kind}`}>
    <StatusIcon kind={cloud.status.kind}/>
    <div><span>Cloud-Status</span><strong>{cloud.status.text}</strong><small>{cloud.user?`Angemeldet als ${cloud.user}`:'Für den Geräteabgleich bitte anmelden.'}</small></div>
    <button onClick={cloud.refresh} disabled={!cloud.user||cloud.busy}><RefreshCw size={17}/>{cloud.busy?'Prüfe…':'Status aktualisieren'}</button>
   </div>
   {cloud.error&&<div className="warning">{cloud.error}</div>}
  </article>

  <article className="panel span-5">
   <h2>Anmeldung</h2>
   {!cloud.configured&&<div className="warning">Supabase ist noch nicht eingerichtet. Siehe README.</div>}
   <label>E-Mail<input value={cloud.email} onChange={e=>cloud.setEmail(e.target.value)} type="email"/></label>
   <label>Passwort<input value={cloud.password} onChange={e=>cloud.setPassword(e.target.value)} type="password"/></label>
   <label>Gerätename<input value={cloud.deviceName} onChange={e=>cloud.setDeviceName(e.target.value)} placeholder="z. B. Büro-PC oder Handy"/></label>
   <div className="button-row"><button onClick={cloud.signIn}>Anmelden</button><button onClick={cloud.signUp}>Konto anlegen</button><button className="danger" onClick={cloud.signOut}>Abmelden</button></div>
  </article>

  <article className="panel span-7">
   <h2>Synchronisierung steuern</h2>
   <p className="note">Die App überschreibt einen neueren Cloud-Stand nicht mehr automatisch. Bei Unterschieden entscheidest du bewusst.</p>
   <div className="cloud-actions">
    <button onClick={cloud.save} disabled={!cloud.user||cloud.busy}><Upload size={18}/>Lokalen Stand hochladen</button>
    <button onClick={cloud.load} disabled={!cloud.user||cloud.busy}><Download size={18}/>Cloud-Stand übernehmen</button>
   </div>
   <label className="check"><input type="checkbox" checked={cloud.autoSync} onChange={e=>cloud.setAutoSync(e.target.checked)}/> automatisch hochladen, wenn der lokale Stand eindeutig neuer ist</label>
   {cloud.cloudNewer&&<div className="cloud-hint info"><b>Cloud ist neuer.</b><span>Nutze „Cloud-Stand übernehmen“, damit die neueren Daten auf diesem Gerät erscheinen.</span></div>}
   {cloud.localNewer&&<div className="cloud-hint warn"><b>Lokale Änderungen vorhanden.</b><span>Nutze „Lokalen Stand hochladen“, um PC und Handy abzugleichen.</span></div>}
   {cloud.sameData&&<div className="cloud-hint good"><b>Alles stimmt überein.</b><span>Lokale Daten und Cloud-Daten sind inhaltlich identisch.</span></div>}
  </article>

  <article className="panel span-12">
   <div className="panel-head"><div><h2>Datenvergleich</h2><p>Direkter Überblick über lokalen und gespeicherten Cloud-Stand</p></div><MonitorSmartphone size={26}/></div>
   <div className="cloud-version-grid">
    <section><span>Dieses Gerät</span><strong>{cloud.local.device}</strong><small>Stand: {cloud.formatTime(cloud.local.time)}</small><small>App {cloud.local.version} · Revision {cloud.local.revision}</small></section>
    <section><span>Cloud</span><strong>{cloud.remote?.device||'Noch kein Cloud-Stand'}</strong><small>Stand: {cloud.formatTime(cloud.remote?.time)}</small><small>{cloud.remote?`App ${cloud.remote.version} · Revision ${cloud.remote.revision}`:'Noch keine Daten gespeichert'}</small></section>
   </div>
   <div className="table-wrap"><table className="cloud-compare-table"><thead><tr><th>Bereich</th><th>Dieses Gerät</th><th>Cloud</th><th>Status</th></tr></thead><tbody>
    {rows.map(([label,key])=>{const local=cloud.local.summary[key];const remote=cloud.remote?.summary?.[key];const equal=remote!==undefined&&local===remote;return <tr key={key}><td>{label}</td><td>{local}</td><td>{remote??'–'}</td><td><span className={`compare-pill ${remote===undefined?'neutral':equal?'good':'warn'}`}>{remote===undefined?'Nicht vorhanden':equal?'Gleich':'Unterschied'}</span></td></tr>})}
   </tbody></table></div>
  </article>
 </div>
}
