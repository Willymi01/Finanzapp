import { Home, WalletCards, CalendarDays, TrendingUp, Landmark, Building2, Cloud, Settings, Download } from 'lucide-react'
import { useEffect, useState } from 'react'

const items = [
  ['dashboard','Dashboard',Home],['budget','Finanzplan',WalletCards],['savings','Sparplan',CalendarDays],
  ['assets','Vermögen',TrendingUp],['financing','Finanzierung',Landmark],['properties','Wohnungen',Building2],
  ['cloud','Cloud',Cloud],['settings','Einstellungen',Settings]
]

export default function Layout({ active, onNavigate, title, children, syncStatus }) {
  const [installPrompt,setInstallPrompt]=useState(null)
  useEffect(()=>{
    const handler=e=>{e.preventDefault();setInstallPrompt(e)}
    window.addEventListener('beforeinstallprompt',handler)
    return()=>window.removeEventListener('beforeinstallprompt',handler)
  },[])
  const install=async()=>{if(!installPrompt)return;installPrompt.prompt();await installPrompt.userChoice;setInstallPrompt(null)}
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="logo">€</div><div><strong>Finanzzentrale</strong><span>Version 8.4</span></div></div>
      <nav>{items.map(([key,label,Icon]) => <button key={key} className={active===key?'active':''} onClick={()=>onNavigate(key)}><Icon size={19}/><span>{label}</span></button>)}</nav>
      <div className="sidebar-bottom">
        {installPrompt&&<button className="install-button" onClick={install}><Download size={17}/><span>App installieren</span></button>}
        <small>Datenmigration & Backups aktiv</small>
      </div>
    </aside>
    <main>
      <header className="topbar">
        <div><h1>{title}</h1><p>{new Date().toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})}</p></div>
        <span className={`sync-badge ${syncStatus.kind}`}>{syncStatus.text}</span>
      </header>
      <section className="page">{children}</section>
    </main>
  </div>
}
