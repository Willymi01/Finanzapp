import { Panel } from '../components/Cards'
import { euro, financing } from '../lib/calculations'

const steps = [
  ['equityPrepared','Eigenkapital vorbereitet','Sparziel und Notgroschen im Blick'],
  ['financingConfirmed','Finanzierung geprüft','Finanzierungsrahmen oder Zusage vorhanden'],
  ['propertyFound','Wohnung gefunden','Favorit ausgewählt und Kosten geprüft'],
  ['documentsChecked','Unterlagen geprüft','Teilungserklärung, Energieausweis und Grundriss'],
  ['contractSigned','Kaufvertrag unterschrieben','Notartermin erfolgreich abgeschlossen'],
  ['keysReceived','Schlüssel erhalten','Übergabe und Einzug organisiert'],
]

export default function Journey({state,setState}) {
  const completed = steps.filter(([key])=>state.purchaseJourney?.[key]).length
  const progress = completed / steps.length
  const fin = financing(state)
  const toggle=key=>setState(s=>({...s,purchaseJourney:{...s.purchaseJourney,[key]:!s.purchaseJourney?.[key]}}))
  const setNotes=value=>setState(s=>({...s,purchaseJourney:{...s.purchaseJourney,notes:value}}))

  return <>
    <div className="journey-hero">
      <div>
        <span>Mein Weg zur eigenen Wohnung</span>
        <strong>{completed} von {steps.length} Etappen</strong>
        <small>{Math.round(progress*100)} % abgeschlossen</small>
      </div>
      <div className="journey-ring" style={{'--journey-progress':`${progress*360}deg`}}>
        <b>{Math.round(progress*100)}%</b>
      </div>
    </div>

    <div className="content-grid">
      <Panel title="Meilensteine" subtitle="Hake erledigte Schritte einfach ab" className="span-8">
        <div className="journey-list">
          {steps.map(([key,title,hint],index)=>
            <button key={key} className={`journey-step ${state.purchaseJourney?.[key]?'done':''}`} onClick={()=>toggle(key)}>
              <span className="journey-number">{state.purchaseJourney?.[key]?'✓':index+1}</span>
              <span><b>{title}</b><small>{hint}</small></span>
            </button>
          )}
        </div>
      </Panel>
      <Panel title="Aktueller Rahmen" subtitle="Automatisch aus deinen Finanzdaten" className="span-4">
        <div className="journey-metrics">
          <div><span>Eigenkapital am Ziel</span><b>{euro(fin.equity)}</b></div>
          <div><span>Finanzierungsbedarf</span><b>{euro(fin.need)}</b></div>
          <div><span>Kreditrate</span><b>{euro(fin.rate)}</b></div>
          <div><span>Kaufziel</span><b>{euro(state.project.purchasePrice)}</b></div>
        </div>
      </Panel>
      <Panel title="Notizen zum Wohnungskauf" className="span-12">
        <textarea className="journey-notes" value={state.purchaseJourney?.notes||''} onChange={e=>setNotes(e.target.value)} placeholder="Termine, Fragen an Bank oder Bauträger, nächste Aufgaben …"/>
      </Panel>
    </div>
  </>
}
