import { useMemo } from 'react'
export default function SimpleChart({ values, goal=0 }) {
  const points = useMemo(() => {
    if (!values.length) return ''
    const max = Math.max(goal, ...values, 1) * 1.08
    return values.map((v,i)=>`${(i/(values.length-1||1))*100},${100-(v/max)*100}`).join(' ')
  }, [values, goal])
  return <svg className="line-chart" viewBox="0 0 100 100" preserveAspectRatio="none">
    {[20,40,60,80].map(y=><line key={y} x1="0" x2="100" y1={y} y2={y}/>)}
    {goal>0 && <line className="goal-line" x1="0" x2="100" y1={100-(goal/(Math.max(goal,...values,1)*1.08))*100} y2={100-(goal/(Math.max(goal,...values,1)*1.08))*100}/>}
    <polyline points={points}/>
  </svg>
}
