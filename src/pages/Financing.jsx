import { Panel } from '../components/Cards'
import { euro, percent, financing } from '../lib/calculations'

function calculateScenario(state, price) {
  const copy={...state,project:{...state.project,purchasePrice:price}}
  return financing(copy)
}
export default function Financing({state,setState}) {
 const f=financing(state)
 const set=(section,key,value)=>setState(s=>({...s,[section]:{...s[section],[key]:Number(value)}}))
 const prices=[Math.max(100000,state.project.purchasePrice-50000),state.project.purchasePrice, state.project.purchasePrice+50000]
 return <>
  <div className="content-grid">
   <Panel title="Annahmen" className="span-5"><div className="form-grid">
    {[['Kaufpreis','project','purchasePrice',1],['Nebenkostenquote %','project','ancillaryRate',100],['Einrichtung','project','furnishing',1],['Notgroschen','project','emergencyTarget',1],['KfW','assumptions','kfw',1],['Bankzins %','assumptions','bankInterest',100],['Tilgung Bank %','assumptions','bankRepayment',100]].map(([l,s,k,m])=><label key={k}>{l}<input type="number" step=".01" value={state[s][k]*m} onChange={e=>set(s,k,Number(e.target.value)/m)}/></label>)}
   </div></Panel>
   <Panel title="Aktuelles Ergebnis" className="span-7"><div className="result-grid">
    {[['Eigenkapital am Ziel',f.equity],['Einsetzbares Eigenkapital',f.usable],['Finanzierungsbedarf',f.need],['KfW',f.kfw],['Bankdarlehen',f.bank],['Kreditrate',f.rate],['Gesamt-Wohnkosten',f.housing],['Wohnkostenquote',percent(f.ratio)]].map(([l,v])=><div className="result" key={l}><span>{l}</span><strong>{typeof v==='string'?v:euro(v)}</strong></div>)}
   </div></Panel>
  </div>
  <Panel title="Was-wäre-wenn-Szenarien" subtitle="Drei Kaufpreise im direkten Vergleich">
   <div className="scenario-grid">{prices.map((price,i)=>{const x=calculateScenario(state,price);return <article className={i===1?'scenario selected':'scenario'} key={price}><h3>{euro(price)}</h3><p>Finanzierung <b>{euro(x.need)}</b></p><p>Kreditrate <b>{euro(x.rate)}</b></p><p>Gesamtwohnen <b>{euro(x.housing)}</b></p><p>Quote <b>{percent(x.ratio)}</b></p></article>})}</div>
  </Panel>
 </>
}
