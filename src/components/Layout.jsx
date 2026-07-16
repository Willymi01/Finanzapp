import {
  Home, WalletCards, CalendarDays, TrendingUp, Landmark, Building2,
  Cloud, Settings, Download, ListChecks, Milestone, Menu, X, FolderOpen
} from 'lucide-react'
import { useEffect, useState } from 'react'

const items = [
  ['dashboard','Dashboard',Home],
  ['budget','Finanzplan',WalletCards],
  ['savings','Sparplan',CalendarDays],
  ['timeline','Timeline',Milestone],
  ['assets','Vermögen',TrendingUp],
  ['financing','Finanzierung',Landmark],
  ['journey','Mein Wohnungskauf',ListChecks],
  ['properties','Wohnungen',Building2],
  ['documents','Dokumente',FolderOpen],
  ['cloud','Cloud & Login',Cloud],
  ['settings','Einstellungen',Settings]
]

export default function Layout({ active, onNavigate, title, children, syncStatus }) {
  const [installPrompt,setInstallPrompt]=useState(null)
  const [mobileOpen,setMobileOpen]=useState(false)

  useEffect(()=>{
    const handler=e=>{e.preventDefault();setInstallPrompt(e)}
    window.addEventListener('beforeinstallprompt',handler)
    return()=>window.removeEventListener('beforeinstallprompt',handler)
  },[])

  useEffect(()=>{
    const closeOnDesktop=()=>{
      if(window.innerWidth>800)setMobileOpen(false)
    }
    window.addEventListener('resize',closeOnDesktop)
    return()=>window.removeEventListener('resize',closeOnDesktop)
  },[])

  useEffect(()=>{
    document.body.classList.toggle('menu-open',mobileOpen)
    return()=>document.body.classList.remove('menu-open')
  },[mobileOpen])

  const install=async()=>{
    if(!installPrompt)return
    installPrompt.prompt()
    await installPrompt.userChoice
    setInstallPrompt(null)
  }

  const navigate=key=>{
    onNavigate(key)
    setMobileOpen(false)
    window.scrollTo({top:0,behavior:'smooth'})
  }

  return <div className="app-shell">
    <button
      className={`drawer-overlay ${mobileOpen?'visible':''}`}
      aria-label="Menü schließen"
      onClick={()=>setMobileOpen(false)}
    />

    <aside className={`sidebar ${mobileOpen?'mobile-open':''}`}>
      <div className="brand">
        <div className="logo">€</div>
        <div><strong>Finanzzentrale</strong><span>Version 10.3</span></div>
        <button className="drawer-close" aria-label="Menü schließen" onClick={()=>setMobileOpen(false)}>
          <X size={22}/>
        </button>
      </div>

      <div className="mobile-menu-caption">Navigation</div>

      <nav>
        {items.map(([key,label,Icon]) =>
          <button key={key} className={active===key?'active':''} onClick={()=>navigate(key)}>
            <Icon size={20}/>
            <span>{label}</span>
          </button>
        )}
      </nav>

      <div className="sidebar-bottom">
        {installPrompt&&
          <button className="install-button" onClick={install}>
            <Download size={18}/><span>App installieren</span>
          </button>
        }
        <div className={`drawer-sync ${syncStatus.kind}`}>
          <span className="drawer-sync-dot"/><span>{syncStatus.text}</span>
        </div>
        <small>Datenmigration, Cloud und Backups aktiv</small>
      </div>
    </aside>

    <main>
      <header className="topbar">
        <div className="mobile-title-row">
          <button className="menu-button" aria-label="Navigation öffnen" onClick={()=>setMobileOpen(true)}>
            <Menu size={24}/>
          </button>
          <div>
            <h1>{title}</h1>
            <p>{new Date().toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})}</p>
          </div>
        </div>
        <span className={`sync-badge ${syncStatus.kind}`}>{syncStatus.text}</span>
      </header>
      <section className="page">{children}</section>
    </main>
  </div>
}
