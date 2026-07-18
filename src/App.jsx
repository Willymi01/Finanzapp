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
import Documents from './pages/Documents'
import Timeline from './pages/Timeline'
import Statistics from './pages/Statistics'
import Coach from './pages/Coach'
import HousingFinance from './pages/HousingFinance'
import { loadState, saveState, createLocalBackup, normaliseState } from './lib/storage'
import { configured, supabase } from './lib/supabase'
import { APP_VERSION, compareVersions, dataFingerprint, dataSummary, detectDeviceName, formatSyncTime, getDeviceId, setDeviceName, withLocalMeta } from './lib/sync'

const titles={dashboard:'Dashboard',budget:'Finanzplan',savings:'Sparplan',timeline:'Timeline',statistics:'Statistiken',coach:'Finanzcoach',assets:'Vermögen',financing:'Finanzierung',journey:'Mein Wohnungskauf',properties:'Wohnungen',documents:'Dokumente',housingFinance:'Wohnungsfinanzierung',cloud:'Cloud-Center',settings:'Einstellungen'}

export default function App(){
  const [active,setActive]=useState('dashboard')
  const [state,setStateRaw]=useState(loadState)
  const [locked,setLocked]=useState(Boolean(state.security?.pinHash)&&sessionStorage.getItem('finanzzentrale_unlocked')!=='1')
  const [email,setEmail]=useState(localStorage.getItem('finance_email')||'')
  const [password,setPassword]=useState('')
  const [user,setUser]=useState(null)
  const [autoSync,setAutoSync]=useState(localStorage.getItem('finance_autosync')==='true')
  const [cloudProfile,setCloudProfile]=useState(null)
  const [cloudBusy,setCloudBusy]=useState(false)
  const [cloudError,setCloudError]=useState('')
  const [deviceNameState,setDeviceNameState]=useState(detectDeviceName())
  const syncTimer=useRef(null)

  const setState=updater=>setStateRaw(prev=>{
    const next=typeof updater==='function'?updater(prev):updater
    return withLocalMeta(next,prev.meta)
  })

  useEffect(()=>{saveState(state)},[state])
  useEffect(()=>{if(!configured)return;supabase.auth.getSession().then(({data})=>setUser(data.session?.user?.email||null));const {data}=supabase.auth.onAuthStateChange((_e,s)=>setUser(s?.user?.email||null));return()=>data.subscription.unsubscribe()},[])
  useEffect(()=>{
    if(!state.security?.pinHash)return
    let timer
    const reset=()=>{clearTimeout(timer);timer=setTimeout(()=>{sessionStorage.removeItem('finanzzentrale_unlocked');setLocked(true)},5*60*1000)}
    const events=['mousemove','keydown','touchstart','click']
    events.forEach(e=>window.addEventListener(e,reset,{passive:true}));reset()
    return()=>{clearTimeout(timer);events.forEach(e=>window.removeEventListener(e,reset))}
  },[state.security?.pinHash])

  const fetchCloud=async(silent=false)=>{
    if(!configured||!user)return null
    if(!silent)setCloudBusy(true)
    setCloudError('')
    const {data:{user:u}}=await supabase.auth.getUser()
    const {data,error}=await supabase.from('finance_profiles').select('app_state,updated_at').eq('user_id',u.id).maybeSingle()
    if(!silent)setCloudBusy(false)
    if(error){setCloudError(error.message);return null}
    const profile=data?{...data,app_state:normaliseState(data.app_state)}:null
    setCloudProfile(profile)
    return profile
  }

  useEffect(()=>{if(user)fetchCloud(true);else setCloudProfile(null)},[user])

  const localFingerprint=dataFingerprint(state)
  const cloudFingerprint=cloudProfile?.app_state?dataFingerprint(cloudProfile.app_state):null
  const localTime=state.meta?.updatedAt||state.meta?.createdAt
  const cloudTime=cloudProfile?.updated_at||cloudProfile?.app_state?.meta?.updatedAt
  const localMs=localTime?new Date(localTime).getTime():0
  const cloudMs=cloudTime?new Date(cloudTime).getTime():0
  const sameData=Boolean(cloudFingerprint&&localFingerprint===cloudFingerprint)
  const remoteAppVersion=cloudProfile?.app_state?.meta?.appVersion||null
  const appOutdated=Boolean(remoteAppVersion&&compareVersions(APP_VERSION,remoteAppVersion)<0)
  const appVersionDifferent=Boolean(remoteAppVersion&&APP_VERSION!==remoteAppVersion)
  const conflict=Boolean(cloudProfile&&!sameData&&localMs&&cloudMs&&Math.abs(localMs-cloudMs)>1000)
  const cloudNewer=Boolean(conflict&&cloudMs>localMs)
  const localNewer=Boolean(cloudProfile&&!sameData&&!cloudNewer)

  const syncStatus=!configured?{text:'Cloud nicht eingerichtet',kind:'warn'}:
    !user?{text:'Nur lokal',kind:'neutral'}:
    cloudError?{text:'Cloud-Fehler',kind:'warn'}:
    cloudBusy?{text:'Cloud wird geprüft…',kind:'warn'}:
    appOutdated?{text:'App-Update verfügbar',kind:'warn'}:
    sameData?{text:'Alles synchron',kind:'good'}:
    cloudNewer?{text:'Cloud ist neuer',kind:'info'}:
    localNewer?{text:'Lokale Änderungen',kind:'warn'}:
    {text:'Cloud bereit',kind:'neutral'}

  const saveCloud=async(silent=false)=>{
    if(!configured||!user){if(!silent)alert('Bitte anmelden.');return false}
    if(cloudNewer&&!silent&&!confirm('Die Cloud enthält einen neueren Stand. Lokale Daten trotzdem überschreiben?'))return false
    setCloudBusy(true);setCloudError('')
    const {data:{user:u}}=await supabase.auth.getUser()
    const now=new Date().toISOString()
    const upload={...state,meta:{...state.meta,updatedAt:now,deviceId:getDeviceId(),deviceName:deviceNameState,appVersion:APP_VERSION,revision:Math.max(Number(state.meta?.revision||0),Number(cloudProfile?.app_state?.meta?.revision||0))+1}}
    const {error}=await supabase.from('finance_profiles').upsert({user_id:u.id,app_state:upload,updated_at:now},{onConflict:'user_id'})
    setCloudBusy(false)
    if(error){setCloudError(error.message);if(!silent)alert(error.message);return false}
    setStateRaw(upload);saveState(upload);setCloudProfile({app_state:upload,updated_at:now});return true
  }

  const loadCloud=async()=>{
    const profile=await fetchCloud(false)
    if(!profile)return alert('In der Cloud wurde noch kein Datenstand gefunden.')
    if(!confirm('Lokale Daten durch den Cloud-Stand ersetzen? Vorher wird automatisch eine lokale Sicherung erstellt.'))return
    createLocalBackup(state,'Vor Cloud-Wiederherstellung')
    const loaded=normaliseState(profile.app_state)
    setStateRaw(loaded);saveState(loaded)
  }

  useEffect(()=>{
    if(!autoSync||!user||!cloudProfile||sameData||cloudNewer)return
    clearTimeout(syncTimer.current)
    syncTimer.current=setTimeout(()=>saveCloud(true),1800)
    return()=>clearTimeout(syncTimer.current)
  },[localFingerprint,autoSync,user,cloudFingerprint,cloudNewer])


  const refreshApplication=async()=>{
    try{
      if('serviceWorker' in navigator){
        const registrations=await navigator.serviceWorker.getRegistrations()
        await Promise.all(registrations.map(registration=>registration.unregister()))
      }
      if('caches' in window){
        const keys=await caches.keys()
        await Promise.all(keys.map(key=>caches.delete(key)))
      }
    }finally{
      window.location.reload()
    }
  }

  const cloud=useMemo(()=>({
    configured,email,password,user,autoSync,setEmail,setPassword,
    setAutoSync:v=>{setAutoSync(v);localStorage.setItem('finance_autosync',String(v))},
    signIn:async()=>{if(!configured)return alert('Supabase nicht eingerichtet.');const {error}=await supabase.auth.signInWithPassword({email,password});if(error)alert(error.message);else localStorage.setItem('finance_email',email)},
    signUp:async()=>{if(!configured)return alert('Supabase nicht eingerichtet.');const {error}=await supabase.auth.signUp({email,password});alert(error?error.message:'Konto angelegt. Bitte ggf. E-Mail bestätigen.')},
    signOut:async()=>configured&&supabase.auth.signOut(),
    save:()=>saveCloud(false),load:loadCloud,refresh:()=>fetchCloud(false),
    status:syncStatus,busy:cloudBusy,error:cloudError,profile:cloudProfile,
    local:{time:localTime,device:deviceNameState,version:APP_VERSION,dataVersion:state.meta?.appVersion||APP_VERSION,revision:Number(state.meta?.revision||0),summary:dataSummary(state)},
    remote:cloudProfile?{time:cloudTime,device:cloudProfile.app_state?.meta?.deviceName||'Unbekanntes Gerät',version:cloudProfile.app_state?.meta?.appVersion||'Ältere Version',revision:Number(cloudProfile.app_state?.meta?.revision||0),summary:dataSummary(cloudProfile.app_state)}:null,
    sameData,cloudNewer,localNewer,appOutdated,appVersionDifferent,refreshApplication,formatTime:formatSyncTime,
    deviceName:deviceNameState,setDeviceName:value=>{const name=setDeviceName(value);setDeviceNameState(name)}
  }),[configured,email,password,user,autoSync,state,cloudProfile,cloudBusy,cloudError,sameData,cloudNewer,localNewer,deviceNameState,syncStatus,appOutdated,appVersionDifferent])

  const props={state,setState}
  const pages={dashboard:<Dashboard {...props} cloud={cloud}/>,budget:<Budget {...props}/>,savings:<Savings {...props}/>,timeline:<Timeline {...props}/>,statistics:<Statistics {...props}/>,coach:<Coach {...props}/>,assets:<Assets {...props}/>,financing:<Financing {...props}/>,journey:<Journey {...props}/>,properties:<Properties {...props}/>,housingFinance:<HousingFinance {...props}/>,documents:<Documents {...props}/>,cloud:<Cloud cloud={cloud}/>,settings:<Settings {...props} onLockChange={setLocked}/>} 
  return <>
    {locked&&<LockScreen pinHash={state.security.pinHash} onUnlock={()=>setLocked(false)}/>} 
    <Layout active={active} onNavigate={setActive} title={titles[active]} syncStatus={syncStatus}>{pages[active]}</Layout>
  </>
}
