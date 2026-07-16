import { Panel } from '../components/Cards'
import { euro } from '../lib/calculations'

export default function Properties({state,setState}) {
 const add=()=>{const name=prompt('Name der Wohnung?','Wohnung A');if(!name)return;setState(s=>({...s,properties:[...s.properties,{id:crypto.randomUUID(),name,location:prompt('Adresse / Lage?','Berlin 12555')||'',price:Number(prompt('Kaufpreis?','450000'))||0,hausgeld:Number(prompt('Hausgeld monatlich?','300'))||0,kfw:confirm('KfW-förderfähig?'),energy:prompt('Energieklasse?','A+')||'',link:prompt('Link zum Exposé?','')||'',notes:prompt('Notizen?','')||'',favorite:false}]}))}
 const update=(id,key,value)=>setState(s=>({...s,properties:s.properties.map(x=>x.id===id?{...x,[key]:value}:x)}))
 const remove=id=>setState(s=>({...s,properties:s.properties.filter(x=>x.id!==id)}))
 return <Panel title="Wohnungscockpit" subtitle="Favoriten, Kosten, Energie und Notizen an einem Ort" action={<button onClick={add}>+ Wohnung</button>}>
  <div className="property-grid">{state.properties.map(p=><article className={`property ${p.favorite?'favorite':''}`} key={p.id}>
    <div className="property-head"><h3>{p.name}</h3><button onClick={()=>update(p.id,'favorite',!p.favorite)}>{p.favorite?'★':'☆'}</button></div>
    <p>{p.location}</p><strong>{euro(p.price)}</strong>
    <div className="property-tags"><span>Hausgeld {euro(p.hausgeld)}</span><span>{p.kfw?'KfW-fähig':'KfW offen'}</span><span>Energie {p.energy||'–'}</span></div>
    {p.link&&<a href={p.link} target="_blank" rel="noreferrer">Exposé öffnen</a>}
    <textarea value={p.notes||''} placeholder="Notizen" onChange={e=>update(p.id,'notes',e.target.value)}/>
    <button className="danger" onClick={()=>remove(p.id)}>Löschen</button>
  </article>)}</div>
  {!state.properties.length&&<p className="note">Noch keine Wohnung gespeichert.</p>}
 </Panel>
}
