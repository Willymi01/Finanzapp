import { useState } from 'react'
import { hashPin } from '../lib/security'

export default function LockScreen({ pinHash, onUnlock }) {
  const [pin,setPin]=useState('')
  const [error,setError]=useState('')
  const unlock=async()=>{
    if(await hashPin(pin)===pinHash){sessionStorage.setItem('finanzzentrale_unlocked','1');onUnlock()}
    else setError('PIN ist nicht korrekt.')
  }
  return <div className="lock-screen">
    <div className="lock-card">
      <div className="logo lock-logo">€</div>
      <h1>Meine Finanzzentrale</h1>
      <p>Bitte lokale PIN eingeben.</p>
      <input autoFocus type="password" inputMode="numeric" maxLength="8" value={pin}
        onChange={e=>setPin(e.target.value)} onKeyDown={e=>e.key==='Enter'&&unlock()} placeholder="PIN"/>
      <button onClick={unlock}>Entsperren</button>
      {error&&<div className="lock-error">{error}</div>}
    </div>
  </div>
}
