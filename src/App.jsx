import { useEffect, useMemo, useRef, useState } from 'react'
import Layout from './components/Layout'
import LockScreen from './components/LockScreen'
import Dashboard from './pages/Dashboard'
import Budget from './pages/Budget'
import Savings from './pages/Savings'
import Assets from './pages/Assets'
import Financing from './pages/Financing'
import Properties from './pages/Properties'
import Journey from './pages/Journey'
import Cloud from './pages/Cloud'
import Settings from './pages/Settings'
import { loadState, saveState, createLocalBackup } from './lib/storage'
import { configured, supabase } from './lib/supabase'

const titles={dashboard:'Dashboard',budget:'Finanzplan',savings:'Sparplan',assets:'Vermögen',financing:'Finanzierung',journey:'Mein Wohnungskauf',properties:'Wohnungen',cloud:'Cloud & Login',settings:'Einstellungen'}

export default function App(){
  const [active,setActive]=useState('dashboard')
  const [state,setStateRaw]=useState(loadState)
  const [locked,setLocked]=useState(Boolean(state.security?.pinHash)&&sessionStorage.getItem('finanzzentrale_unlocked')!=='1')
  const [syncStatus,setSyncStatus]=useState({text:'Lokal',kind:'neutral'})
  const [email,setEmail]=useState(localStorage.getItem('finance_email')||'')
  const [password,setPassword]=useState('')
  const [user,setUser]=useState(null)
  const [autoSync,setAutoSync]=useState(localStorage.getItem('finance_autosync')==='true')
  const syncTimer=useRef(null)

  const setState=updater=>setStateRaw(prev=>typeof updater==='function'?updater(prev):updater)
  useEffect(()=>{setStateRaw(prev=>saveState(prev))},[state.project,state.assumptions,state.assets,state.budget,state.monthlySavings,state.snapshots,state.properties,state.purchaseJourney,state.security])
  useEffect(()=>{if(!configured)return;supabase.auth.getSession().then(({data})=>setUser(data.session?.user?.email||null));const {data}=supabase.auth.onAuthStateChange((_e,s)=>setUser(s?.user?.email||null));return()=>data.subscription.unsubscribe()},[])

  const saveCloud=async(silent=false)=>{
    if(!configured||!user){if(!silent)alert('Bitte anmelden.');return}
    setSyncStatus({text:'Synchronisiert…',kind:'warn'})
    const {data:{user:u}}=await supabase.auth.getUser()
    const {error}=await supabase.from('finance_profiles').upsert({user_id:u.id,app_state:state,updated_at:new Date().toISOString()},{onConflict:'user_id'})
    setSyncStatus(error?{text:'Cloud-Fehler',kind:'warn'}:{text:'Synchronisiert',kind:'good'})
    if(error&&!silent)alert(error.message)
  }
  useEffect(()=>{if(!autoSync||!user)return;clearTimeout(syncTimer.current);syncTimer.current=setTimeout(()=>saveCloud(true),1400);return()=>clearTimeout(syncTimer.current)},[state,autoSync,user])

  const cloud=useMemo(()=>({
    configured,email,password,user,autoSync,setEmail,setPassword,setAutoSync:v=>{setAutoSync(v);localStorage.setItem('finance_autosync',String(v))},
    signIn:async()=>{if(!configured)return alert('Supabase nicht eingerichtet.');const {error}=await supabase.auth.signInWithPassword({email,password});if(error)alert(error.message);else localStorage.setItem('finance_email',email)},
    signUp:async()=>{if(!configured)return alert('Supabase nicht eingerichtet.');const {error}=await supabase.auth.signUp({email,password});alert(error?error.message:'Konto angelegt. Bitte ggf. E-Mail bestätigen.')},
    signOut:async()=>configured&&supabase.auth.signOut(),
    save:()=>saveCloud(false),
    load:async()=>{if(!configured||!user)return alert('Bitte anmelden.');const {data:{user:u}}=await supabase.auth.getUser();const {data,error}=await supabase.from('finance_profiles').select('app_state').eq('user_id',u.id).maybeSingle();if(error)return alert(error.message);if(data&&confirm('Lokale Daten durch Cloud-Stand ersetzen?')){createLocalBackup(state,'Vor Cloud-Wiederherstellung');setState(data.app_state)}}
  }),[configured,email,password,user,autoSync,state])

  const props={state,setState}
  const pages={dashboard:<Dashboard {...props}/>,budget:<Budget {...props}/>,savings:<Savings {...props}/>,assets:<Assets {...props}/>,financing:<Financing {...props}/>,journey:<Journey {...props}/>,properties:<Properties {...props}/>,cloud:<Cloud cloud={cloud}/>,settings:<Settings {...props} onLockChange={setLocked}/>}
  return <>
    {locked&&<LockScreen pinHash={state.security.pinHash} onUnlock={()=>setLocked(false)}/>}
    <Layout active={active} onNavigate={setActive} title={titles[active]} syncStatus={syncStatus}>{pages[active]}</Layout>
  </>
}
