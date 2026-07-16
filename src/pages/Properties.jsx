import { useMemo, useState } from 'react'
import { Panel } from '../components/Cards'
import { euro } from '../lib/calculations'

const emptyProperty=()=>({
  id:crypto.randomUUID(),name:'Neue Wohnung',location:'Berlin 12555',price:450000,
  hausgeld:300,kfw:true,energy:'A+',link:'',notes:'',favorite:false,images:[],
  size:0,rooms:0,floor:'',rating:5,status:'Beobachten',viewingDate:'',
  broker:'',phone:'',email:'',mapLink:'',documents:[]
})
const normalise=p=>({...emptyProperty(),...p,images:Array.isArray(p.images)?p.images:(p.image?[p.image]:[]),documents:Array.isArray(p.documents)?p.documents:[]})

export default function Properties({state,setState}) {
 const [filter,setFilter]=useState('Alle')
 const [search,setSearch]=useState('')
 const properties=useMemo(()=>state.properties.map(normalise),[state.properties])
 const update=(id,key,value)=>setState(s=>({...s,properties:s.properties.map(x=>x.id===id?{...normalise(x),[key]:value}:x)}))
 const add=()=>setState(s=>({...s,properties:[...s.properties,emptyProperty()]}))
 const remove=id=>setState(s=>({...s,properties:s.properties.filter(x=>x.id!==id)}))
 const duplicate=p=>setState(s=>({...s,properties:[...s.properties,{...normalise(p),id:crypto.randomUUID(),name:`${p.name} Kopie`,favorite:false}]}))

 const uploadImages=(id,files)=>{
   const list=[...files]
   if(list.some(file=>file.size>1_500_000)){alert('Bitte nur Bilder unter 1,5 MB verwenden.');return}
   Promise.all(list.slice(0,6).map(file=>new Promise(resolve=>{
     const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsDataURL(file)
   }))).then(images=>{
     const old=properties.find(p=>p.id===id)?.images||[]
     update(id,'images',[...old,...images].slice(0,8))
   })
 }
 const removeImage=(id,index)=>{
   const old=properties.find(p=>p.id===id)?.images||[]
   update(id,'images',old.filter((_,i)=>i!==index))
 }
 const uploadDocuments=(id,files)=>{
   const list=[...files]
   if(list.some(file=>file.size>2_500_000)){alert('Bitte Dokumente unter 2,5 MB verwenden.');return}
   Promise.all(list.slice(0,4).map(file=>new Promise(resolve=>{
     const reader=new FileReader()
     reader.onload=()=>resolve({id:crypto.randomUUID(),name:file.name,type:file.type,data:reader.result})
     reader.readAsDataURL(file)
   }))).then(docs=>{
     const old=properties.find(p=>p.id===id)?.documents||[]
     update(id,'documents',[...old,...docs].slice(0,10))
   })
 }
 const removeDocument=(id,docId)=>{
   const old=properties.find(p=>p.id===id)?.documents||[]
   update(id,'documents',old.filter(doc=>doc.id!==docId))
 }
 const visible=properties.filter(p=>{
   const matchesFilter=filter==='Alle'||filter==='Favoriten'&&p.favorite||filter===p.status
   return matchesFilter&&`${p.name} ${p.location} ${p.energy} ${p.broker}`.toLowerCase().includes(search.toLowerCase())
 })
 const compare=properties.filter(p=>p.favorite).slice(0,3)

 return <>
  <section className="property-hero">
   <div><span>Immobilien-Cockpit Pro</span><h2>{properties.length} Wohnungen gespeichert</h2><p>Fotos, Dokumente, Termine, Kontakte und Bewertungen an einem Ort.</p></div>
   <button onClick={add}>+ Wohnung anlegen</button>
  </section>

  <div className="property-toolbar">
   <input placeholder="Wohnungen durchsuchen …" value={search} onChange={e=>setSearch(e.target.value)}/>
   <div className="property-filters">{['Alle','Favoriten','Beobachten','Besichtigung','Favorit','Absage'].map(item=><button key={item} className={filter===item?'active':''} onClick={()=>setFilter(item)}>{item}</button>)}</div>
  </div>

  {compare.length>1&&<Panel title="Favoriten im Vergleich" subtitle="Bis zu drei Favoriten auf einen Blick">
   <div className="property-compare">{compare.map(p=><article key={p.id}><h3>{p.name}</h3><div><span>Kaufpreis</span><b>{euro(p.price)}</b></div><div><span>Hausgeld</span><b>{euro(p.hausgeld)}</b></div><div><span>Wohnfläche</span><b>{p.size||0} m²</b></div><div><span>Zimmer</span><b>{p.rooms||0}</b></div><div><span>Bewertung</span><b>{p.rating||0}/10</b></div></article>)}</div>
  </Panel>}

  <div className="property-grid pro-properties">
   {visible.map(p=><article className={`property property-pro ${p.favorite?'favorite':''}`} key={p.id}>
    <div className="property-gallery">
     {p.images.length?<div className="gallery-main"><img src={p.images[0]} alt={p.name}/></div>:<div className="property-placeholder">🏢</div>}
     <div className="gallery-thumbs">
      {p.images.slice(0,4).map((img,index)=><button key={index} onClick={()=>removeImage(p.id,index)} title="Bild entfernen"><img src={img} alt="Wohnung"/></button>)}
      <label className="gallery-add">+<input hidden multiple type="file" accept="image/*" onChange={e=>uploadImages(p.id,e.target.files)}/></label>
     </div>
    </div>

    <div className="property-pro-head"><input className="property-name" value={p.name} onChange={e=>update(p.id,'name',e.target.value)}/><button className="favorite-button" onClick={()=>update(p.id,'favorite',!p.favorite)}>{p.favorite?'★':'☆'}</button></div>

    <div className="property-status-row">
     <select value={p.status} onChange={e=>update(p.id,'status',e.target.value)}>{['Beobachten','Besichtigung','Favorit','Absage'].map(x=><option key={x}>{x}</option>)}</select>
     <label>Bewertung<input type="range" min="1" max="10" value={p.rating||5} onChange={e=>update(p.id,'rating',Number(e.target.value))}/><b>{p.rating||5}/10</b></label>
    </div>

    <label>Adresse / Lage<input value={p.location} onChange={e=>update(p.id,'location',e.target.value)}/></label>
    <div className="property-form-grid">
     <label>Kaufpreis<input type="number" value={p.price} onChange={e=>update(p.id,'price',Number(e.target.value))}/></label>
     <label>Hausgeld<input type="number" value={p.hausgeld} onChange={e=>update(p.id,'hausgeld',Number(e.target.value))}/></label>
     <label>Wohnfläche m²<input type="number" value={p.size||0} onChange={e=>update(p.id,'size',Number(e.target.value))}/></label>
     <label>Zimmer<input type="number" step=".5" value={p.rooms||0} onChange={e=>update(p.id,'rooms',Number(e.target.value))}/></label>
     <label>Etage<input value={p.floor||''} onChange={e=>update(p.id,'floor',e.target.value)}/></label>
     <label>Energieklasse<input value={p.energy||''} onChange={e=>update(p.id,'energy',e.target.value)}/></label>
    </div>
    <label className="property-check"><input type="checkbox" checked={Boolean(p.kfw)} onChange={e=>update(p.id,'kfw',e.target.checked)}/> KfW-förderfähig</label>

    <div className="property-section"><h4>Besichtigung & Makler</h4><div className="property-form-grid">
     <label>Besichtigung<input type="datetime-local" value={p.viewingDate||''} onChange={e=>update(p.id,'viewingDate',e.target.value)}/></label>
     <label>Makler<input value={p.broker||''} onChange={e=>update(p.id,'broker',e.target.value)}/></label>
     <label>Telefon<input value={p.phone||''} onChange={e=>update(p.id,'phone',e.target.value)}/></label>
     <label>E-Mail<input type="email" value={p.email||''} onChange={e=>update(p.id,'email',e.target.value)}/></label>
    </div></div>

    <div className="property-section"><h4>Links</h4>
     <label>Exposé-Link<input value={p.link||''} onChange={e=>update(p.id,'link',e.target.value)}/></label>
     <label>Google-Maps-Link<input value={p.mapLink||''} onChange={e=>update(p.id,'mapLink',e.target.value)}/></label>
     <div className="property-links">{p.link&&<a href={p.link} target="_blank" rel="noreferrer">Exposé öffnen ↗</a>}{p.mapLink&&<a href={p.mapLink} target="_blank" rel="noreferrer">Karte öffnen ↗</a>}</div>
    </div>

    <div className="property-section"><h4>Dokumente</h4>
     <label className="document-upload">PDF oder Bild hinzufügen<input hidden multiple type="file" accept=".pdf,image/*" onChange={e=>uploadDocuments(p.id,e.target.files)}/></label>
     <div className="property-documents">{p.documents.map(doc=><div key={doc.id}><a href={doc.data} download={doc.name}>{doc.name}</a><button className="danger" onClick={()=>removeDocument(p.id,doc.id)}>×</button></div>)}</div>
    </div>

    <textarea value={p.notes||''} placeholder="Notizen zur Wohnung" onChange={e=>update(p.id,'notes',e.target.value)}/>
    <div className="property-footer"><strong>{euro(p.price)}</strong><div><button onClick={()=>duplicate(p)}>Duplizieren</button><button className="danger" onClick={()=>remove(p.id)}>Löschen</button></div></div>
   </article>)}
  </div>

  {!visible.length&&<div className="empty-state"><b>Keine Wohnungen gefunden.</b><span>Lege eine neue Wohnung an oder ändere den Filter.</span></div>}
 </>
}
