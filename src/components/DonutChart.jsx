export default function DonutChart({segments,centerLabel,centerValue}) {
  const total=segments.reduce((sum,item)=>sum+Math.max(0,Number(item.value)||0),0)||1
  let cursor=0
  const gradient=segments.map((item,index)=>{
    const start=cursor
    cursor+=Math.max(0,Number(item.value)||0)/total*360
    return `${item.color||`hsl(${index*65} 60% 55%)`} ${start}deg ${cursor}deg`
  }).join(',')
  return <div className="donut-wrap">
    <div className="donut-chart" style={{background:`conic-gradient(${gradient})`}}>
      <div><strong>{centerValue}</strong><span>{centerLabel}</span></div>
    </div>
    <div className="donut-legend">
      {segments.map((item,index)=><div key={item.label}>
        <i style={{background:item.color||`hsl(${index*65} 60% 55%)`}}/>
        <span>{item.label}</span><b>{item.display??item.value}</b>
      </div>)}
    </div>
  </div>
}
