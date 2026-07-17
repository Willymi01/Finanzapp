export const APP_VERSION = '10.8.0'

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
  return {
    sparplan:(state?.monthlySavings||[]).flat().filter(value=>Number(value)!==0).length,
    sonderzahlungen:(state?.specialPayments||[]).length,
    zwischenstaende:(state?.snapshots||[]).length,
    immobilien:(state?.properties||[]).length,
    dokumente:(state?.documents||[]).length
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
