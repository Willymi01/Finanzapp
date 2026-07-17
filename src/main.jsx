import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'
import { registerSW } from 'virtual:pwa-register'

let updateSW
updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    updateSW?.(true)
  },
  onRegisteredSW(_swUrl, registration) {
    registration?.update()
    window.setInterval(() => registration?.update(), 15 * 60 * 1000)
  }
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
)
