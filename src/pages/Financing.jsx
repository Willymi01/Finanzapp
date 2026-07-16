import { Panel } from '../components/Cards'
import { euro, percent, financing } from '../lib/calculations'
export default function Financing({state,setState}) {
 const f=financing(state)
 const set=(section,key,value)=>setState(s=>({...s,[section]:{...s[section],[key]:Number(value)}}))
 return <div className="content-grid"><Panel title="Annahmen" className="span-5"><div className="form-grid">{[['Kaufpreis','project','purchasePrice'],['Nebenkostenquote','project','ancillaryRate'],['Einrichtung','project','furnishing'],['KfW','assumptions','kfw'],['Bankzins','assumptions','bankInterest']].map(([l,s,k])=><label key={k}>{l}<input type="number" value={state[s][k]} onChange={e=>set(s,k,e.target.value)}/></label>)}</div></Panel><Panel title="Ergebnis" className="span-7"><div className="result-grid">{[['Eigenkapital am Ziel',f.equity],['Finanzierungsbedarf',f.need],['KfW',f.kfw],['Bankdarlehen',f.bank],['Kreditrate',f.rate],['Gesamt-Wohnkosten',f.housing],['Wohnkostenquote',percent(f.ratio)]].map(([l,v])=><div className="result" key={l}><span>{l}</span><strong>{typeof v==='string'?v:euro(v)}</strong></div>)}</div></Panel></div>
}
