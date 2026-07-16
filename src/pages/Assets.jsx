import { MetricCard, Panel } from '../components/Cards'
import SimpleChart from '../components/SimpleChart'
import { euro, percent, projection } from '../lib/calculations'

export default function Assets({state,setState}) {
  const projected=projection(state).filter(x=>x.total!=null)
  const vals=projected.map(x=>x.total)
  const final=projected.at(-1)
  const total=state.assets.home+state.assets.pension+state.assets.emergency

  const noReturnState={
    ...state,
    assumptions:{...state.assumptions,investmentReturn:0,pensionGrowth:0}
  }
  const finalWithoutReturns=projection(noReturnState).filter(x=>x.total!=null).at(-1)
  const returnGain=Math.max(0,(final?.total||0)-(finalWithoutReturns?.total||0))

  const updateAsset=(key,value)=>setState(s=>({
    ...s,
    assets:{...s.assets,[key]:Math.max(0,Number(value)||0)}
  }))

  const updateRate=(key,value)=>setState(s=>({
    ...s,
    assumptions:{...s.assumptions,[key]:Math.max(0,Number(value)||0)/100}
  }))

  const setEtfPreset=rate=>setState(s=>({
    ...s,
    assumptions:{...s.assumptions,investmentReturn:rate}
  }))

  return <>
    <div className="metric-grid">
      <MetricCard label="Wohnungssparen / ETF" value={euro(state.assets.home)} hint={`Renditeannahme ${percent(state.assumptions.investmentReturn)}`}/>
      <MetricCard label="Rente" value={euro(state.assets.pension)} hint={`Wertzuwachs ${percent(state.assumptions.pensionGrowth)}`}/>
      <MetricCard label="Notgroschen" value={euro(state.assets.emergency)}/>
      <MetricCard label="Gesamt" value={euro(total)} accent/>
    </div>

    <div className="content-grid">
      <Panel title="Aktuelle Vermögenswerte bearbeiten" subtitle="Änderungen wirken sofort auf Dashboard, Finanzierung und Statistiken" className="span-5">
        <div className="asset-edit-form">
          <label>Wohnungssparen / ETF
            <input type="number" min="0" step="100" value={state.assets.home} onChange={e=>updateAsset('home',e.target.value)}/>
          </label>
          <label>Rentenversicherung
            <input type="number" min="0" step="100" value={state.assets.pension} onChange={e=>updateAsset('pension',e.target.value)}/>
          </label>
          <label>Notgroschen
            <input type="number" min="0" step="100" value={state.assets.emergency} onChange={e=>updateAsset('emergency',e.target.value)}/>
          </label>
          <button onClick={()=>updateAsset('emergency',0)}>Notgroschen auf 0 € setzen</button>
        </div>
      </Panel>

      <Panel title="Renditeannahmen" subtitle="Die ETF-Rendite wird monatlich mit Zinseszinseffekt in der Prognose berücksichtigt" className="span-7">
        <div className="return-presets">
          <button className={state.assumptions.investmentReturn===.05?'active':''} onClick={()=>setEtfPreset(.05)}>
            <span>Vorsichtig</span><b>5 % p. a.</b>
          </button>
          <button className={state.assumptions.investmentReturn===.07?'active':''} onClick={()=>setEtfPreset(.07)}>
            <span>Realistisch</span><b>7 % p. a.</b>
          </button>
          <button className={state.assumptions.investmentReturn===.09?'active':''} onClick={()=>setEtfPreset(.09)}>
            <span>Optimistisch</span><b>9 % p. a.</b>
          </button>
        </div>

        <div className="return-inputs">
          <label>ETF-Rendite pro Jahr in %
            <input type="number" min="0" max="20" step=".1" value={(state.assumptions.investmentReturn*100).toFixed(1)} onChange={e=>updateRate('investmentReturn',e.target.value)}/>
          </label>
          <label>Renten-Wertzuwachs pro Jahr in %
            <input type="number" min="0" max="15" step=".1" value={(state.assumptions.pensionGrowth*100).toFixed(1)} onChange={e=>updateRate('pensionGrowth',e.target.value)}/>
          </label>
        </div>

        <div className="return-explanation">
          <div><span>Prognose ohne Rendite</span><b>{euro(finalWithoutReturns?.total||0)}</b></div>
          <div><span>Geschätzter Renditeeffekt</span><b className="return-positive">+ {euro(returnGain)}</b></div>
          <div><span>Prognose mit Rendite</span><b>{euro(final?.total||0)}</b></div>
        </div>
        <p className="note">Die Rendite ist eine Annahme und nicht garantiert. Für einen Wohnungskauf in fünf Jahren kann der tatsächliche ETF-Wert deutlich schwanken.</p>
      </Panel>

      <Panel title="Vermögensaufteilung" subtitle="Aktuelle Verteilung deines Gesamtvermögens" className="span-7">
        <div className="asset-bars">
          {[['Wohnungssparen / ETF',state.assets.home],['Rentenversicherung',state.assets.pension],['Notgroschen',state.assets.emergency]].map(([label,value])=>
            <div className="asset-bar-row" key={label}>
              <div><span>{label}</span><b>{euro(value)}</b></div>
              <div className="asset-bar"><i style={{width:`${total?Math.min(100,value/total*100):0}%`}}/></div>
            </div>
          )}
        </div>
      </Panel>

      <Panel title="So wird gerechnet" subtitle="Monatliche Verzinsung plus monatliche Sparrate" className="span-5">
        <div className="calculation-note">
          <div><span>ETF</span><b>Bestand × (1 + Jahresrendite ÷ 12) + Sparrate</b></div>
          <div><span>Rente</span><b>Bestand × (1 + Wertzuwachs ÷ 12)</b></div>
          <div><span>Notgroschen</span><b>Aktuell ohne Verzinsung</b></div>
        </div>
      </Panel>

      <Panel title="Vermögensprognose" subtitle={`Mit ${percent(state.assumptions.investmentReturn)} ETF-Rendite und ${percent(state.assumptions.pensionGrowth)} Renten-Wertzuwachs`} className="span-12">
        <SimpleChart values={vals} goal={state.project.goal}/>
      </Panel>
    </div>
  </>
}
