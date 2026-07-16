export function MetricCard({ label, value, hint, accent=false, children }) {
  return <article className={`metric-card ${accent?'accent':''}`}>
    <span>{label}</span><strong>{value}</strong>{hint&&<small>{hint}</small>}{children}
  </article>
}
export function Panel({ title, subtitle, action, children, className='' }) {
  return <article className={`panel ${className}`}>
    <div className="panel-head"><div><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div>{action}</div>{children}
  </article>
}
