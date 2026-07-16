import { useMemo, useRef, useState } from 'react'
import { Panel } from '../components/Cards'

const categories = [
  'Immobilien','Finanzierung','Einkommen','Verträge',
  'Rechnungen','Versicherungen','Steuern','Sonstiges'
]

const bytes = size => {
  if (!size) return '0 KB'
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

const iconFor = type => {
  if (type?.startsWith('image/')) return '🖼️'
  if (type === 'application/pdf') return '📄'
  return '📎'
}

export default function Documents({state,setState}) {
  const [search,setSearch]=useState('')
  const [category,setCategory]=useState('Alle')
  const [favoritesOnly,setFavoritesOnly]=useState(false)
  const [preview,setPreview]=useState(null)
  const [dragging,setDragging]=useState(false)
  const inputRef=useRef(null)

  const documents=Array.isArray(state.documents)?state.documents:[]
  const properties=Array.isArray(state.properties)?state.properties:[]

  const update=(id,key,value)=>setState(s=>({
    ...s,
    documents:(s.documents||[]).map(doc=>doc.id===id?{...doc,[key]:value}:doc)
  }))

  const remove=id=>{
    if(!confirm('Dieses Dokument wirklich löschen?'))return
    setState(s=>({...s,documents:(s.documents||[]).filter(doc=>doc.id!==id)}))
    if(preview?.id===id)setPreview(null)
  }

  const addFiles=files=>{
    const list=[...files]
    if(!list.length)return
    const allowed=list.filter(file=>file.type==='application/pdf'||file.type.startsWith('image/'))
    if(allowed.length!==list.length)alert('Es werden derzeit nur PDF- und Bilddateien unterstützt.')
    const oversized=allowed.find(file=>file.size>2_000_000)
    if(oversized){alert(`„${oversized.name}“ ist größer als 2 MB. Bitte die Datei vorher verkleinern.`);return}

    Promise.all(allowed.slice(0,8).map(file=>new Promise(resolve=>{
      const reader=new FileReader()
      reader.onload=()=>resolve({
        id:crypto.randomUUID(),
        title:file.name.replace(/\.[^.]+$/,''),
        filename:file.name,
        category:'Sonstiges',
        description:'',
        tags:[],
        tagsText:'',
        favorite:false,
        sensitive:false,
        propertyId:'',
        documentDate:new Date().toISOString().slice(0,10),
        uploadedAt:new Date().toISOString(),
        size:file.size,
        type:file.type,
        data:reader.result
      })
      reader.readAsDataURL(file)
    }))).then(newDocs=>setState(s=>({...s,documents:[...(s.documents||[]),...newDocs]})))
  }

  const visible=useMemo(()=>documents
    .filter(doc=>category==='Alle'||doc.category===category)
    .filter(doc=>!favoritesOnly||doc.favorite)
    .filter(doc=>{
      const property=properties.find(p=>p.id===doc.propertyId)
      const haystack=[
        doc.title,doc.filename,doc.category,doc.description,
        ...(doc.tags||[]),property?.name,property?.location
      ].join(' ').toLowerCase()
      return haystack.includes(search.toLowerCase())
    })
    .sort((a,b)=>Number(b.favorite)-Number(a.favorite)||new Date(b.documentDate||b.uploadedAt)-new Date(a.documentDate||a.uploadedAt)),
  [documents,properties,category,favoritesOnly,search])

  const years=useMemo(()=>{
    const grouped={}
    visible.forEach(doc=>{
      const year=new Date(`${doc.documentDate||doc.uploadedAt}`).getFullYear()
      if(!grouped[year])grouped[year]=[]
      grouped[year].push(doc)
    })
    return Object.entries(grouped).sort((a,b)=>Number(b[0])-Number(a[0]))
  },[visible])

  const setTags=(id,text)=>{
    const tags=text.split(',').map(x=>x.trim()).filter(Boolean).slice(0,10)
    setState(s=>({...s,documents:(s.documents||[]).map(doc=>doc.id===id?{...doc,tags,tagsText:text}:doc)}))
  }

  return <>
    <section className="documents-hero">
      <div>
        <span>Dokumenten-Center Pro</span>
        <h2>{documents.length} Dokumente gespeichert</h2>
        <p>Exposés, Grundrisse, Angebote und Verträge zentral organisieren.</p>
      </div>
      <button onClick={()=>inputRef.current?.click()}>+ Dokumente hochladen</button>
      <input ref={inputRef} hidden multiple type="file" accept=".pdf,image/*" onChange={e=>addFiles(e.target.files)}/>
    </section>

    <div className="documents-toolbar">
      <input placeholder="Dokumente durchsuchen …" value={search} onChange={e=>setSearch(e.target.value)}/>
      <select value={category} onChange={e=>setCategory(e.target.value)}>
        <option>Alle</option>{categories.map(item=><option key={item}>{item}</option>)}
      </select>
      <button className={favoritesOnly?'active':''} onClick={()=>setFavoritesOnly(x=>!x)}>⭐ Nur Favoriten</button>
    </div>

    <div
      className={`document-dropzone ${dragging?'dragging':''}`}
      onDragOver={e=>{e.preventDefault();setDragging(true)}}
      onDragLeave={()=>setDragging(false)}
      onDrop={e=>{e.preventDefault();setDragging(false);addFiles(e.dataTransfer.files)}}
      onClick={()=>inputRef.current?.click()}
    >
      <strong>Dateien hier ablegen</strong>
      <span>oder antippen, um PDF- und Bilddateien auszuwählen · maximal 2 MB je Datei</span>
    </div>

    <div className="document-category-cards">
      {categories.map(item=>{
        const count=documents.filter(doc=>doc.category===item).length
        return <button key={item} className={category===item?'active':''} onClick={()=>setCategory(category===item?'Alle':item)}>
          <span>{item==='Immobilien'?'🏠':item==='Finanzierung'?'🏦':item==='Einkommen'?'💶':item==='Verträge'?'📝':item==='Rechnungen'?'🧾':item==='Versicherungen'?'🛡️':item==='Steuern'?'📊':'📁'}</span>
          <b>{item}</b><small>{count} Dokumente</small>
        </button>
      })}
    </div>

    <div className="content-grid">
      <Panel title="Dokumente" subtitle={`${visible.length} Treffer`} className="span-8">
        {visible.length===0
          ? <div className="empty-state"><b>Keine Dokumente gefunden.</b><span>Lade eine Datei hoch oder ändere Suche und Filter.</span></div>
          : <div className="document-grid">
            {visible.map(doc=>{
              const linkedProperty=properties.find(p=>p.id===doc.propertyId)
              return <article className={`document-card ${doc.favorite?'favorite':''}`} key={doc.id}>
                <button className="document-preview" onClick={()=>setPreview(doc)}>
                  {doc.type?.startsWith('image/')
                    ? <img src={doc.data} alt={doc.title}/>
                    : <div className="document-file-icon">{iconFor(doc.type)}</div>
                  }
                </button>

                <div className="document-card-head">
                  <input value={doc.title||''} onChange={e=>update(doc.id,'title',e.target.value)}/>
                  <button className="document-star" onClick={()=>update(doc.id,'favorite',!doc.favorite)}>{doc.favorite?'★':'☆'}</button>
                </div>

                <div className="document-meta">
                  <span>{doc.filename}</span><span>{bytes(doc.size)}</span>
                </div>

                <div className="document-fields">
                  <label>Kategorie
                    <select value={doc.category||'Sonstiges'} onChange={e=>update(doc.id,'category',e.target.value)}>
                      {categories.map(item=><option key={item}>{item}</option>)}
                    </select>
                  </label>
                  <label>Dokumentdatum
                    <input type="date" value={doc.documentDate||''} onChange={e=>update(doc.id,'documentDate',e.target.value)}/>
                  </label>
                  <label>Zugehörige Wohnung
                    <select value={doc.propertyId||''} onChange={e=>update(doc.id,'propertyId',e.target.value)}>
                      <option value="">Keine Zuordnung</option>
                      {properties.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}
                    </select>
                  </label>
                  <label>Tags, mit Komma getrennt
                    <input value={doc.tagsText??(doc.tags||[]).join(', ')} onChange={e=>setTags(doc.id,e.target.value)}/>
                  </label>
                </div>

                {linkedProperty&&<div className="linked-property">🏠 {linkedProperty.name}</div>}

                <textarea placeholder="Beschreibung oder Notiz" value={doc.description||''} onChange={e=>update(doc.id,'description',e.target.value)}/>

                <div className="document-tags">{(doc.tags||[]).map(tag=><span key={tag}>#{tag}</span>)}</div>

                <label className="document-sensitive">
                  <input type="checkbox" checked={Boolean(doc.sensitive)} onChange={e=>update(doc.id,'sensitive',e.target.checked)}/>
                  Als sensibel markieren
                </label>

                <div className="document-actions">
                  <button onClick={()=>setPreview(doc)}>Vorschau</button>
                  <a className="button" href={doc.data} download={doc.filename}>Herunterladen</a>
                  <button className="danger" onClick={()=>remove(doc.id)}>Löschen</button>
                </div>
              </article>
            })}
          </div>
        }
      </Panel>

      <Panel title="Dokumenten-Timeline" subtitle="Chronologisch nach Dokumentdatum" className="span-4">
        <div className="document-timeline">
          {years.length===0&&<p className="note">Noch keine Dokumente vorhanden.</p>}
          {years.map(([year,docs])=><div className="document-year" key={year}>
            <h3>{year}</h3>
            {docs.slice(0,12).map(doc=><button key={doc.id} onClick={()=>setPreview(doc)}>
              <i>{iconFor(doc.type)}</i>
              <span><b>{doc.title}</b><small>{new Date(`${doc.documentDate||doc.uploadedAt}`).toLocaleDateString('de-DE')} · {doc.category}</small></span>
              {doc.favorite&&<em>★</em>}
            </button>)}
          </div>)}
        </div>
      </Panel>
    </div>

    {preview&&<div className="document-modal" onClick={()=>setPreview(null)}>
      <div className="document-modal-card" onClick={e=>e.stopPropagation()}>
        <div className="document-modal-head">
          <div><h3>{preview.title}</h3><span>{preview.filename} · {bytes(preview.size)}</span></div>
          <button onClick={()=>setPreview(null)}>×</button>
        </div>
        <div className="document-modal-body">
          {preview.sensitive&&<div className="sensitive-banner">🔒 Sensibles Dokument – durch deine App-PIN und Cloud-Anmeldung geschützt.</div>}
          {preview.type?.startsWith('image/')
            ? <img src={preview.data} alt={preview.title}/>
            : preview.type==='application/pdf'
              ? <iframe title={preview.title} src={preview.data}/>
              : <div className="document-file-icon large">{iconFor(preview.type)}</div>
          }
        </div>
        <div className="document-modal-footer">
          <span>{preview.category} · {preview.documentDate&&new Date(`${preview.documentDate}T12:00:00`).toLocaleDateString('de-DE')}</span>
          <a className="button" href={preview.data} download={preview.filename}>Datei herunterladen</a>
        </div>
      </div>
    </div>}
  </>
}
