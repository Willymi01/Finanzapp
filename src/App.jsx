import { useEffect, useMemo, useState } from 'react'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Budget from './pages/Budget'
import Savings from './pages/Savings'
import Assets from './pages/Assets'
import Financing from './pages/Financing'
import Properties from './pages/Properties'
import Cloud from './pages/Cloud'
import Settings from './pages/Settings'
import { loadState, saveState } from './lib/storage'
import { configured, supabase } from './lib/supabase'

const titles={dashboard:'Dashboard',budget:'Finanzplan',savings:'Sparplan',assets:'Vermögen',financing:'Finanzierung',properties:'Wohnungen',cloud:'Cloud & Login',settings:'Einstellungen'}

export default function App(){
  const [active,setActive]=useState('dashboard')
  const [state,setStateRaw]=useState(loadState)
  const [syncStatus,setSyncStatus]=useState({text:'Lokal',kind:'neutral'})
  const [email,setEmail]=useState(localStorage.getItem('finance_email')||'')
  const [password,setPassword]=useState('')
  const [user,setUser]=useState(null)
  const [autoSync,setAutoSync]=useState(localStorage.getItem('finance_autosync')==='true')

  const setState=updater=>setStateRaw(prev=>typeof updater==='function'?updater(prev):updater)

  useEffect(()=>{setStateRaw(prev=>saveState(prev))},[state.project,state.assumptions,state.assets,state.budget,state.monthlySavings,state.snapshots,state.properties])
  useEffect(()=>{if(!configured)return;supabase.auth.getSession().then(({data})=>setUser(data.session?.user?.email||null));return supabase.auth.onAuthStateChange((_e,s)=>setUser(s?.user?.email||null)).data.subscription.unsubscribe},[])

  const cloud=useMemo(()=>({
    configured,email,password,user,autoSync,setEmail,setPassword,setAutoSync:v=>{setAutoSync(v);localStorage.setItem('finance_autosync',String(v))},
    signIn:async()=>{if(!configured)return alert('Supabase nicht eingerichtet.');const {error}=await supabase.auth.signInWithPassword({email,password});if(error)alert(error.message);else localStorage.setItem('finance_email',email)},
    signUp:async()=>{if(!configured)return alert('Supabase nicht eingerichtet.');const {error}=await supabase.auth.signUp({email,password});alert(error?error.message:'Konto angelegt. Bitte ggf. E-Mail bestätigen.')},
    signOut:async()=>configured&&supabase.auth.signOut(),
    save:async()=>{if(!configured||!user)return alert('Bitte anmelden.');setSyncStatus({text:'Synchronisiert…',kind:'warn'});const {data:{user:u}}=await supabase.auth.getUser();const {error}=await supabase.from('finance_profiles').upsert({user_id:u.id,app_state:state,updated_at:new Date().toISOString()},{onConflict:'user_id'});setSyncStatus(error?{text:'Cloud-Fehler',kind:'warn'}:{text:'Synchronisiert',kind:'good'});if(error)alert(error.message)},
    load:async()=>{if(!configured||!user)return alert('Bitte anmelden.');const {data:{user:u}}=await supabase.auth.getUser();const {data,error}=await supabase.from('finance_profiles').select('app_state').eq('user_id',u.id).maybeSingle();if(error)return alert(error.message);if(data&&confirm('Lokale Daten ersetzen?'))setState(data.app_state)}
  }),[configured,email,password,user,autoSync,state])

  const props={state,setState}
  const pages={dashboard:<Dashboard {...props}/>,budget:<Budget {...props}/>,savings:<Savings {...props}/>,assets:<Assets {...props}/>,financing:<Financing {...props}/>,properties:<Properties {...props}/>,cloud:<Cloud cloud={cloud}/>,settings:<Settings {...props}/>}
  return <Layout active={active} onNavigate={setActive} title={titles[active]} syncStatus={syncStatus}>{pages[active]}</Layout>
}
