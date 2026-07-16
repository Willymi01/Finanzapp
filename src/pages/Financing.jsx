import { Panel } from '../components/Cards'
import { euro, percent, financing } from '../lib/calculations'

function calculateScenario(state, price, usableEquityOverride=null) {
  const copy={...state,project:{...state.project,purchasePrice:price}}
  const result=financing(copy)
  if(usableEquityOverride===null) return result

  const ancillary=price*state.project.ancillaryRate
  const need=Math.max(0,price+ancillary-usableEquityOverride)
  const kfw=Math.min(state.assumptions.kfw,need)
  const bank=Math.max(0,need-kfw)
  const rate=kfw*(state.assumptions.kfwInterest+state.assumptions.kfwRepayment)/12
    +bank*(state.assumptions.bankInterest+state.assumptions.bankRepayment)/12
  const housing=rate+state.assumptions.ownerCosts+state.assumptions.maintenance
  return {...result,usable:usableEquityOverride,need,kfw,bank,rate,housing,ratio:housing/result.targetNet}
}

export default function Financing({state,setState}) {
 const f=financing(state)
 const set=(section,key,value)=>setState(s=>({...s,[section]:{...s[section],[key]:Number(value)}}))
 const prices=[Math.max(100000,state.project.purchasePrice-50000),state.project.purchasePrice,state.project.purchasePrice+50000]
 const purchaseCosts={
   grunderwerb:state.project.purchasePrice*.06,
   notar:state.project.purchasePrice*.015,
   grundbuch:state.project.purchasePrice*.005,
   sonstige:Math.max(0,state.project.purchasePrice*state.project.ancillaryRate-state.project.purchasePrice*.08)
 }

 return <>
  <div className="content-grid">
   <Panel title="Live-Annahmen" subtitle="Regler verändern die Berechnung sofort" className="span-5">
    <div className="slider-group">
      <label>Kaufpreis <b>{euro(state.project.purchasePrice)}</b>
        <input className="finance-slider" type="range" min="250000" max="650000" step="5000" value={state.project.purchasePrice} onChange={e=>set('project','purchasePrice',e.target.value)}/>
      </label>
      <label>KfW-Anteil <b>{euro(state.assumptions.kfw)}</b>
        <input className="finance-slider" type="range" min="0" max="200000" step="5000" value={state.assumptions.kfw} onChange={e=>set('assumptions','kfw',e.target.value)}/>
      </label>
      <label>Bankzins <b>{percent(state.assumptions.bankInterest)}</b>
        <input className="finance-slider" type="range" min="1" max="7" step=".05" value={state.assumptions.bankInterest*100} onChange={e=>set('assumptions','bankInterest',Number(e.target.value)/100)}/>
      </label>
      <label>Tilgung Bank <b>{percent(state.assumptions.bankRepayment)}</b>
        <input className="finance-slider" type="range" min="1" max="5" step=".1" value={state.assumptions.bankRepayment*100} onChange={e=>set('assumptions','bankRepayment',Number(e.target.value)/100)}/>
      </label>
    </div>
    <div className="form-grid">
      <label>Nebenkostenquote %<input type="number" step=".1" value={state.project.ancillaryRate*100} onChange={e=>set('project','ancillaryRate',Number(e.target.value)/100)}/></label>
      <label>Einrichtung<input type="number" value={state.project.furnishing} onChange={e=>set('project','furnishing',e.target.value)}/></label>
      <label>Notgroschen<input type="number" value={state.project.emergencyTarget} onChange={e=>set('project','emergencyTarget',e.target.value)}/></label>
      <label>Hausgeld / Eigentümerkosten<input type="number" value={state.assumptions.ownerCosts} onChange={e=>set('assumptions','ownerCosts',e.target.value)}/></label>
    </div>
   </Panel>

   <Panel title="Aktuelles Ergebnis" className="span-7">
    <div className="result-grid">
      {[['Eigenkapital am Ziel',f.equity],['Einsetzbares Eigenkapital',f.usable],['Finanzierungsbedarf',f.need],['KfW',f.kfw],['Bankdarlehen',f.bank],['Kreditrate',f.rate],['Gesamt-Wohnkosten',f.housing],['Wohnkostenquote',percent(f.ratio)]].map(([l,v])=><div className="result" key={l}><span>{l}</span><strong>{typeof v==='string'?v:euro(v)}</strong></div>)}
    </div>
   </Panel>
  </div>

  <div className="content-grid">
    <Panel title="Kaufnebenkosten" subtitle="Aufteilung der eingestellten Nebenkostenquote" className="span-5">
      <div className="cost-list">
        <div><span>Grunderwerbsteuer (Modell 6 %)</span><b>{euro(purchaseCosts.grunderwerb)}</b></div>
        <div><span>Notar (Modell 1,5 %)</span><b>{euro(purchaseCosts.notar)}</b></div>
        <div><span>Grundbuch (Modell 0,5 %)</span><b>{euro(purchaseCosts.grundbuch)}</b></div>
        <div><span>Sonstige / Makler-Puffer</span><b>{euro(purchaseCosts.sonstige)}</b></div>
        <div className="total"><span>Nebenkosten gesamt</span><b>{euro(f.ancillary)}</b></div>
      </div>
    </Panel>
    <Panel title="Was-wäre-wenn-Szenarien" subtitle="Drei Kaufpreise im direkten Vergleich" className="span-7">
      <div className="scenario-grid compact">{prices.map((price,i)=>{const x=calculateScenario(state,price);return <article className={i===1?'scenario selected':'scenario'} key={price}><h3>{euro(price)}</h3><p>Finanzierung <b>{euro(x.need)}</b></p><p>Kreditrate <b>{euro(x.rate)}</b></p><p>Gesamtwohnen <b>{euro(x.housing)}</b></p><p>Quote <b>{percent(x.ratio)}</b></p></article>})}</div>
    </Panel>
  </div>
 </>
}
