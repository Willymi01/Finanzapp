import { Panel } from '../components/Cards'
import { euro } from '../lib/calculations'
export default function Properties({state,setState}) {
 const add=()=>{const name=prompt('Name der Wohnung?','Wohnung A');if(!name)return;setState(s=>({...s,properties:[...s.properties,{id:crypto.randomUUID(),name,location:prompt('Lage?','Berlin 12555')||'',price:Number(prompt('Kaufpreis?','450000'))||0,hausgeld:Number(prompt('Hausgeld?','300'))||0,kfw:confirm('KfW-förderfähig?'),favorite:false}]}))}
 const toggle=id=>setState(s=>({...s,properties:s.properties.map(x=>x.id===id?{...x,favorite:!x.favorite}:x)}))
 return <Panel title="Wohnungen vergleichen" action={<button onClick={add}>+ Wohnung</button>}><div className="property-grid">{state.properties.map(p=><article className={`property ${p.favorite?'favorite':''}`} key={p.id}><h3>{p.name}</h3><p>{p.location}</p><strong>{euro(p.price)}</strong><small>Hausgeld {euro(p.hausgeld)} · {p.kfw?'KfW-fähig':'KfW offen'}</small><button onClick={()=>toggle(p.id)}>{p.favorite?'★ Favorit':'☆ Favorit'}</button></article>)}</div></Panel>
}
