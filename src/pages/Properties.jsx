import { Panel } from '../components/Cards'
import { euro } from '../lib/calculations'

const emptyProperty=()=>({
  id:crypto.randomUUID(),name:'Neue Wohnung',location:'Berlin 12555',price:450000,
  hausgeld:300,kfw:true,energy:'A+',link:'',notes:'',favorite:false,image:'',size:0,rooms:0
})

export default function Properties({state,setState}) {
 const add=()=>setState(s=>({...s,properties:[...s.properties,emptyProperty()]}))
 const update=(id,key,value)=>setState(s=>({...s,properties:s.properties.map(x=>x.id===id?{...x,[key]:value}:x)}))
 const remove=id=>setState(s=>({...s,properties:s.properties.filter(x=>x.id!==id)}))
 const uploadImage=(id,file)=>{
   if(!file)return
   if(file.size>1_500_000){alert('Bitte ein Bild unter 1,5 MB verwenden.');return}
   const reader=new FileReader()
   reader.onload=()=>update(id,'image',reader.result)
   reader.readAsDataURL(file)
 }

 return <Panel title="Wohnungscockpit" subtitle="Favoriten, Bilder, Kosten, Energie und Notizen an einem Ort" action={<button onClick={add}>+ Wohnung</button>}>
  <div className="property-grid enhanced">
    {state.properties.map(p=><article className={`property enhanced-property ${p.favorite?'favorite':''}`} key={p.id}>
      <div className="property-image">
        {p.image?<img src={p.image} alt={p.name}/>:<div className="property-placeholder">🏢</div>}
        <label className="image-upload">Bild wählen<input hidden type="file" accept="image/*" onChange={e=>uploadImage(p.id,e.target.files[0])}/></label>
      </div>
      <div className="property-head">
        <input className="property-name" value={p.name} onChange={e=>update(p.id,'name',e.target.value)}/>
        <button className="favorite-button" onClick={()=>update(p.id,'favorite',!p.favorite)}>{p.favorite?'★':'☆'}</button>
      </div>
      <label>Adresse / Lage<input value={p.location} onChange={e=>update(p.id,'location',e.target.value)}/></label>
      <div className="property-form-grid">
        <label>Kaufpreis<input type="number" value={p.price} onChange={e=>update(p.id,'price',Number(e.target.value))}/></label>
        <label>Hausgeld<input type="number" value={p.hausgeld} onChange={e=>update(p.id,'hausgeld',Number(e.target.value))}/></label>
        <label>Wohnfläche m²<input type="number" value={p.size||0} onChange={e=>update(p.id,'size',Number(e.target.value))}/></label>
        <label>Zimmer<input type="number" step=".5" value={p.rooms||0} onChange={e=>update(p.id,'rooms',Number(e.target.value))}/></label>
        <label>Energieklasse<input value={p.energy||''} onChange={e=>update(p.id,'energy',e.target.value)}/></label>
        <label className="property-check"><input type="checkbox" checked={Boolean(p.kfw)} onChange={e=>update(p.id,'kfw',e.target.checked)}/> KfW-förderfähig</label>
      </div>
      <label>Exposé-Link<input value={p.link||''} onChange={e=>update(p.id,'link',e.target.value)}/></label>
      {p.link&&<a className="expose-link" href={p.link} target="_blank" rel="noreferrer">Exposé öffnen ↗</a>}
      <textarea value={p.notes||''} placeholder="Notizen zur Wohnung" onChange={e=>update(p.id,'notes',e.target.value)}/>
      <div className="property-footer"><strong>{euro(p.price)}</strong><button className="danger" onClick={()=>remove(p.id)}>Löschen</button></div>
    </article>)}
  </div>
  {!state.properties.length&&<div className="empty-state"><b>Noch keine Wohnung gespeichert.</b><span>Lege deine erste Wohnung an und vergleiche später Favoriten direkt miteinander.</span></div>}
 </Panel>
}
