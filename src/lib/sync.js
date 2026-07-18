export const APP_VERSION = '10.9.2a'
export const APP_BUILD = '2026-07-18-housing-finance-input-calculation-fix'

const DEVICE_ID_KEY = 'finance_device_id'
const DEVICE_NAME_KEY = 'finance_device_name'

export function getDeviceId(){
  let id=localStorage.getItem(DEVICE_ID_KEY)
  if(!id){id=crypto.randomUUID();localStorage.setItem(DEVICE_ID_KEY,id)}
  return id
}

export function detectDeviceName(){
  const saved=localStorage.getItem(DEVICE_NAME_KEY)
  if(saved)return saved
  const ua=navigator.userAgent||''
  const mobile=/Android|iPhone|iPad|Mobile/i.test(ua)
  const platform=navigator.platform||''
  const name=mobile?( /iPhone|iPad/i.test(ua)?'iPhone / iPad':'Android-Handy'):(/Win/i.test(platform)?'Windows-PC':/Mac/i.test(platform)?'Mac':'Computer')
  localStorage.setItem(DEVICE_NAME_KEY,name)
  return name
}

export function setDeviceName(name){
  const clean=String(name||'').trim()||detectDeviceName()
  localStorage.setItem(DEVICE_NAME_KEY,clean)
  return clean
}

export function dataFingerprint(state){
  const copy=structuredClone(state||{})
  delete copy.meta
  delete copy.security
  return JSON.stringify(copy)
}

export function dataSummary(state){
  const specialPayments=state?.specialPayments||[]
  return {
    sparplan:(state?.monthlySavings||[]).flat().filter(value=>Number(value)!==0).length,
    sonderzahlungen:specialPayments.length,
    sonderzahlungenSumme:specialPayments.reduce((sum,item)=>sum+Math.max(0,Number(item.amount||0)),0),
    zwischenstaende:(state?.snapshots||[]).length,
    immobilien:(state?.properties||[]).length,
    dokumente:(state?.documents||[]).length,
    finanzierungen:(state?.housingFinance?.projects||[]).length
  }
}

export function formatSyncTime(value){
  if(!value)return 'Noch nie'
  const date=new Date(value)
  if(Number.isNaN(date.getTime()))return 'Unbekannt'
  return date.toLocaleString('de-DE',{dateStyle:'medium',timeStyle:'medium'})
}

export function withLocalMeta(state,previousMeta={}){
  return {
    ...state,
    meta:{
      ...previousMeta,
      ...state.meta,
      updatedAt:new Date().toISOString(),
      deviceId:getDeviceId(),
      deviceName:detectDeviceName(),
      appVersion:APP_VERSION,
      revision:Number(previousMeta.revision||state.meta?.revision||0)+1
    }
  }
}


export function compareVersions(left='0',right='0'){
  const a=String(left).split('.').map(value=>Number(value)||0)
  const b=String(right).split('.').map(value=>Number(value)||0)
  for(let i=0;i<Math.max(a.length,b.length);i++){
    if((a[i]||0)>(b[i]||0))return 1
    if((a[i]||0)<(b[i]||0))return -1
  }
  return 0
}
