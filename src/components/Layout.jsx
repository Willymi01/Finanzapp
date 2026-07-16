import { Home, WalletCards, CalendarDays, TrendingUp, Landmark, Building2, Cloud, Settings } from 'lucide-react'

const items = [
  ['dashboard','Dashboard',Home],['budget','Finanzplan',WalletCards],['savings','Sparplan',CalendarDays],
  ['assets','Vermögen',TrendingUp],['financing','Finanzierung',Landmark],['properties','Wohnungen',Building2],
  ['cloud','Cloud',Cloud],['settings','Einstellungen',Settings]
]

export default function Layout({ active, onNavigate, title, children, syncStatus }) {
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="logo">€</div><div><strong>Finanzzentrale</strong><span>Version 8.0</span></div></div>
      <nav>{items.map(([key,label,Icon]) => <button key={key} className={active===key?'active':''} onClick={()=>onNavigate(key)}><Icon size={19}/><span>{label}</span></button>)}</nav>
      <small className="sidebar-note">Datenmigration & Backups aktiv</small>
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
