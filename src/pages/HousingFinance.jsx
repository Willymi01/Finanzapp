import { useEffect, useMemo, useRef, useState } from 'react'
import { Building2, Plus, Trash2, Landmark, Home, CalendarClock, TrendingDown, CircleCheck, TriangleAlert, CircleX } from 'lucide-react'
import { MetricCard, Panel } from '../components/Cards'
import { euro, incomeTotal, fixedTotal, variableTotal } from '../lib/calculations'

const number = value => Math.max(0, Number(value || 0))
const pct = value => number(value) / 100
const currentMonth = () => new Date().toISOString().slice(0, 7)

const parseNumberInput = value => {
  const normalized = String(value ?? '').trim().replace(',', '.')
  if (normalized === '') return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? Math.max(0, parsed) : null
}

function NumberInput({ value, onValueChange, min = 0, max, step = 'any', ...props }) {
  const [draft, setDraft] = useState(value === null || value === undefined ? '' : String(value).replace('.', ','))
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setDraft(value === null || value === undefined ? '' : String(value).replace('.', ','))
  }, [value, focused])

  const commit = rawValue => {
    const parsed = parseNumberInput(rawValue)
    if (parsed === null) return
    const lower = min == null ? parsed : Math.max(Number(min), parsed)
    const clamped = max == null ? lower : Math.min(Number(max), lower)
    onValueChange(clamped)
  }

  return <input
    {...props}
    type="text"
    inputMode="decimal"
    autoComplete="off"
    value={draft}
    onFocus={event => {
      setFocused(true)
      event.currentTarget.select()
    }}
    onChange={event => {
      const raw = event.currentTarget.value
      if (!/^\d*(?:[.,]\d*)?$/.test(raw)) return
      setDraft(raw)
      if (raw !== '' && !/[.,]$/.test(raw)) commit(raw)
    }}
    onBlur={() => {
      setFocused(false)
      if (draft === '') {
        const fallback = Number(min || 0)
        setDraft(String(fallback).replace('.', ','))
        onValueChange(fallback)
      } else {
        commit(draft)
      }
    }}
    onKeyDown={event => {
      if (event.key === 'Enter') event.currentTarget.blur()
    }}
  />
}

export const createHousingFinanceProject = (state, index = 1) => ({
  id: crypto.randomUUID(),
  name: `Finanzierung ${index}`,
  startDate: currentMonth(),
  property: {
    purchasePrice: Number(state?.project?.purchasePrice || 0),
    livingArea: 0,
    address: '',
    buildYear: '',
  },
  equity: {
    useCurrent: true,
    manualAmount: 0,
    includePension: true,
    includeEmergency: false,
  },
  purchaseCosts: {
    transferTaxPct: 3.5,
    notaryPct: 1.5,
    landRegisterPct: 0.5,
    brokerPct: 0,
    renovation: 0,
    furnishing: Number(state?.project?.furnishing || 0),
    other: 0,
  },
  bank: {
    interestPct: Number(state?.assumptions?.bankInterest || 0.035) * 100,
    repaymentPct: Number(state?.assumptions?.bankRepayment || 0.02) * 100,
    fixedYears: 10,
    termYears: 30,
    annualRateIncreasePct: 0,
    increaseStartYear: 2,
    maxMonthlyRate: 0,
  },
  kfw: {
    enabled: true,
    program: 'KfW-Wohneigentum',
    amount: Number(state?.assumptions?.kfw || 0),
    interestPct: Number(state?.assumptions?.kfwInterest || 0.025) * 100,
    repaymentPct: Number(state?.assumptions?.kfwRepayment || 0.02) * 100,
    graceYears: 1,
    fixedYears: 10,
    termYears: 25,
    annualRateIncreasePct: 0,
    increaseStartYear: 2,
    maxMonthlyRate: 0,
  },
  monthlyCosts: {
    houseFee: 250,
    heating: 0,
    electricity: 75,
    internet: 45,
    insurance: 25,
    maintenance: 100,
    propertyTax: 25,
    parking: 0,
    other: 0,
  },
  rateChanges: [],
  extraRepayments: [],
  scenarioBudget: {
    income: structuredClone(state?.budget?.income || []),
    fixed: structuredClone(state?.budget?.fixed || []),
    variable: structuredClone(state?.budget?.variable || []),
  },
  scenarioEvolution: { years: 30, incomeIncreasePct: 2, costIncreasePct: 2, housingCostIncreasePct: 2, events: [] },
  notes: '',
  createdAt: new Date().toISOString(),
})

export function buildLoanSchedule({ principal, interestPct, repaymentPct, graceMonths = 0, termYears = 0, rateChanges = [], extraRepayments = [], annualRateIncreasePct = 0, increaseStartYear = 2, maxMonthlyRate = 0, maxMonths = 720 }) {
  const amount = number(principal)
  const monthlyInterest = pct(interestPct) / 12
  const initialRate = amount > 0 ? amount * (pct(interestPct) + pct(repaymentPct)) / 12 : 0
  const requestedMonths = Math.max(0, Math.round(number(termYears) * 12) - Math.round(number(graceMonths)))
  const termRate = amount <= 0 || requestedMonths <= 0
    ? 0
    : monthlyInterest > 0
      ? amount * monthlyInterest / (1 - Math.pow(1 + monthlyInterest, -requestedMonths))
      : amount / requestedMonths
  const regularRate = Math.max(initialRate, termRate)
  const sortedRateChanges = [...(rateChanges || [])]
    .map(item => ({ ...item, startMonth: Math.max(1, Math.round(number(item.startYear) * 12 - 11)), monthlyRate: number(item.monthlyRate) }))
    .filter(item => item.monthlyRate > 0)
    .sort((a, b) => a.startMonth - b.startMonth)
  const extraByMonth = new Map()
  for (const item of extraRepayments || []) {
    const month = Math.max(1, Math.round(number(item.year) * 12))
    extraByMonth.set(month, (extraByMonth.get(month) || 0) + number(item.amount))
  }
  let balance = amount
  let totalInterest = 0
  let totalPaid = 0
  let totalExtraRepayment = 0
  const rows = []

  if (amount <= 0) return { rows, regularRate: 0, firstRate: 0, payoffMonths: 0, totalInterest: 0, totalPaid: 0, totalExtraRepayment: 0, residual: () => 0, paidOff: true }

  for (let month = 1; month <= maxMonths && balance > 0.005; month += 1) {
    const opening = balance
    const interest = opening * monthlyInterest
    const grace = month <= graceMonths
    const activeChange = sortedRateChanges.filter(item => item.startMonth <= month).at(-1)
    const baseChosenRate = activeChange?.monthlyRate || regularRate
    const currentYear = Math.floor((month - 1) / 12) + 1
    const firstIncreaseYear = Math.max(1, Math.round(number(increaseStartYear) || 2))
    const increaseSteps = currentYear >= firstIncreaseYear ? currentYear - firstIncreaseYear + 1 : 0
    const increasedRate = baseChosenRate * Math.pow(1 + pct(annualRateIncreasePct), increaseSteps)
    const chosenRate = number(maxMonthlyRate) > 0 ? Math.min(increasedRate, number(maxMonthlyRate)) : increasedRate
    const plannedPayment = grace ? interest : Math.max(chosenRate, interest)
    const payment = Math.min(opening + interest, plannedPayment)
    const repayment = Math.max(0, payment - interest)
    let afterRegular = Math.max(0, opening - repayment)
    const extraRepayment = Math.min(afterRegular, extraByMonth.get(month) || 0)
    balance = Math.max(0, afterRegular - extraRepayment)
    totalInterest += interest
    totalPaid += payment + extraRepayment
    totalExtraRepayment += extraRepayment
    rows.push({ month, opening, interest, repayment, extraRepayment, payment, totalPayment: payment + extraRepayment, balance, grace, monthlyRate: chosenRate })

    // Nicht abbrechen, wenn die aktuelle Rate zunächst nur die Zinsen deckt.
    // Spätere Ratenänderungen, jährliche Erhöhungen oder Sondertilgungen können
    // das Darlehen trotzdem in die Tilgung bringen. Der Plan läuft daher bis
    // maxMonths weiter und wird anschließend korrekt als nicht vollständig
    // getilgt gekennzeichnet, falls die Restschuld bestehen bleibt.
  }

  const paidOff = balance <= 0.005
  const payoffMonths = paidOff ? rows.length : null
  const residual = month => {
    if (month <= 0) return amount
    return rows[Math.min(rows.length, Math.round(month)) - 1]?.balance ?? balance
  }
  return {
    rows,
    regularRate,
    firstRate: rows[0]?.payment || 0,
    payoffMonths,
    totalInterest,
    totalPaid,
    totalExtraRepayment,
    residual,
    paidOff,
  }
}

const combinedAnnualSchedule = (bankPlan, kfwPlan, startDate) => {
  const maxMonths = Math.max(bankPlan.rows.length, kfwPlan.rows.length)
  const years = []
  const start = startDate ? new Date(`${startDate}-01T12:00:00`) : new Date()
  for (let month = 1; month <= maxMonths; month += 1) {
    const bank = bankPlan.rows[month - 1]
    const kfw = kfwPlan.rows[month - 1]
    const yearIndex = Math.floor((month - 1) / 12)
    if (!years[yearIndex]) {
      const date = new Date(start)
      date.setMonth(date.getMonth() + yearIndex * 12)
      years[yearIndex] = {
        year: yearIndex + 1,
        calendarYear: date.getFullYear(),
        payment: 0,
        interest: 0,
        repayment: 0,
        extraRepayment: 0,
        bankBalance: bank?.opening ?? 0,
        kfwBalance: kfw?.opening ?? 0,
        balance: (bank?.opening ?? 0) + (kfw?.opening ?? 0),
      }
    }
    const row = years[yearIndex]
    row.payment += (bank?.totalPayment || bank?.payment || 0) + (kfw?.totalPayment || kfw?.payment || 0)
    row.interest += (bank?.interest || 0) + (kfw?.interest || 0)
    row.repayment += (bank?.repayment || 0) + (kfw?.repayment || 0)
    row.extraRepayment += (bank?.extraRepayment || 0) + (kfw?.extraRepayment || 0)
    row.bankBalance = bank?.balance ?? 0
    row.kfwBalance = kfw?.balance ?? 0
    row.balance = row.bankBalance + row.kfwBalance
  }
  return years
}

const durationLabel = months => {
  if (months == null) return 'nicht vollständig getilgt'
  const years = Math.floor(months / 12)
  const rest = months % 12
  if (!years) return `${rest} Monate`
  return rest ? `${years} Jahre ${rest} Monate` : `${years} Jahre`
}

export function housingFinanceSummary(state, project) {
  if (!project) return null
  const purchasePrice = number(project.property?.purchasePrice)
  const costs = project.purchaseCosts || {}
  const percentageCosts = purchasePrice * (
    pct(costs.transferTaxPct) + pct(costs.notaryPct) + pct(costs.landRegisterPct) + pct(costs.brokerPct)
  )
  const purchaseCosts = percentageCosts + number(costs.renovation) + number(costs.furnishing) + number(costs.other)
  const totalCost = purchasePrice + purchaseCosts
  const baseEquity = project.equity?.useCurrent ? number(state.assets?.home) : number(project.equity?.manualAmount)
  const pensionEquity = project.equity?.includePension ? number(state.assets?.pension) : 0
  const emergencyEquity = project.equity?.includeEmergency ? number(state.assets?.emergency) : 0
  const equity = baseEquity + pensionEquity + emergencyEquity
  const financingNeed = Math.max(0, totalCost - equity)
  const kfwAmount = project.kfw?.enabled ? Math.min(financingNeed, number(project.kfw?.amount)) : 0
  const bankAmount = Math.max(0, financingNeed - kfwAmount)

  const bankPlan = buildLoanSchedule({
    principal: bankAmount,
    interestPct: project.bank?.interestPct,
    repaymentPct: project.bank?.repaymentPct,
    termYears: project.bank?.termYears,
    rateChanges: [],
    extraRepayments: (project.extraRepayments || []).filter(item => item.loan === 'bank'),
    annualRateIncreasePct: project.bank?.annualRateIncreasePct,
    increaseStartYear: project.bank?.increaseStartYear,
    maxMonthlyRate: project.bank?.maxMonthlyRate,
  })
  const kfwPlan = buildLoanSchedule({
    principal: kfwAmount,
    interestPct: project.kfw?.interestPct,
    repaymentPct: project.kfw?.repaymentPct,
    graceMonths: Math.round(number(project.kfw?.graceYears) * 12),
    termYears: project.kfw?.termYears,
    rateChanges: [],
    extraRepayments: (project.extraRepayments || []).filter(item => item.loan === 'kfw'),
    annualRateIncreasePct: project.kfw?.annualRateIncreasePct,
    increaseStartYear: project.kfw?.increaseStartYear,
    maxMonthlyRate: project.kfw?.maxMonthlyRate,
  })
  const baselineBankPlan = buildLoanSchedule({
    principal: bankAmount,
    interestPct: project.bank?.interestPct,
    repaymentPct: project.bank?.repaymentPct,
    termYears: project.bank?.termYears,
  })
  const baselineKfwPlan = buildLoanSchedule({
    principal: kfwAmount,
    interestPct: project.kfw?.interestPct,
    repaymentPct: project.kfw?.repaymentPct,
    graceMonths: Math.round(number(project.kfw?.graceYears) * 12),
    termYears: project.kfw?.termYears,
  })
  const baselinePayoffMonths = Math.max(baselineBankPlan.payoffMonths || 0, baselineKfwPlan.payoffMonths || 0) || (financingNeed ? null : 0)
  const baselineInterest = baselineBankPlan.totalInterest + baselineKfwPlan.totalInterest
  const plannedPayoffMonths = Math.max(bankPlan.payoffMonths || 0, kfwPlan.payoffMonths || 0) || (financingNeed ? null : 0)
  const interestSaved = Math.max(0, baselineInterest - (bankPlan.totalInterest + kfwPlan.totalInterest))
  const monthsSaved = baselinePayoffMonths != null && plannedPayoffMonths != null ? Math.max(0, baselinePayoffMonths - plannedPayoffMonths) : 0
  const bankMonthsSaved = baselineBankPlan.payoffMonths != null && bankPlan.payoffMonths != null
    ? Math.max(0, baselineBankPlan.payoffMonths - bankPlan.payoffMonths)
    : 0
  const kfwMonthsSaved = baselineKfwPlan.payoffMonths != null && kfwPlan.payoffMonths != null
    ? Math.max(0, baselineKfwPlan.payoffMonths - kfwPlan.payoffMonths)
    : 0
  const plannedExtraRepayment = (project.extraRepayments || []).reduce((sum, item) => sum + number(item.amount), 0)
  const comparisonFixedMonth = Math.round(Math.max(1, number(project.bank?.fixedYears || 10)) * 12)
  const baselineResidualAtFixed = baselineBankPlan.residual(comparisonFixedMonth) + baselineKfwPlan.residual(comparisonFixedMonth)

  const bankRate = bankPlan.firstRate
  const kfwRate = kfwPlan.firstRate
  const regularKfwRate = kfwPlan.regularRate
  const monthlyHousingCosts = Object.values(project.monthlyCosts || {}).reduce((sum, value) => sum + number(value), 0)
  const fixedYears = Math.max(1, number(project.bank?.fixedYears || 10))
  const fixedMonth = Math.round(fixedYears * 12)
  const residualAtFixed = bankPlan.residual(fixedMonth) + kfwPlan.residual(fixedMonth)
  const payoffMonths = Math.max(bankPlan.payoffMonths || 0, kfwPlan.payoffMonths || 0) || (financingNeed ? null : 0)
  const annualSchedule = combinedAnnualSchedule(bankPlan, kfwPlan, project.startDate)
  const creditRateAfterGrace = bankPlan.regularRate + regularKfwRate
  const totalMonthly = bankRate + kfwRate + monthlyHousingCosts
  const totalMonthlyAfterGrace = creditRateAfterGrace + monthlyHousingCosts

  // Für die Haushaltsrechnung werden erkannte heutige Wohnkosten ersetzt,
  // damit Miete, Strom oder Internet nicht doppelt angesetzt werden.
  const housingCostPattern = /(miete|warmmiete|kaltmiete|hausgeld|strom|heizung|internet|kabel)/i
  const currentHousingCosts = (state.budget?.fixed || []).reduce((sum, item) => {
    if (!housingCostPattern.test(String(item.name || ''))) return sum
    return sum + number(item.cost) / Math.max(1, number(item.factor) || 1)
  }, 0)
  const scenarioBudget = project.scenarioBudget || state.budget || { income: [], fixed: [], variable: [] }
  const monthlyIncome = (scenarioBudget.income || []).reduce((sum, item) => sum + number(item.amount), 0)
  const scenarioFixedCosts = (scenarioBudget.fixed || []).reduce((sum, item) => sum + number(item.cost) / Math.max(1, number(item.factor) || 1), 0)
  const scenarioVariableCosts = (scenarioBudget.variable || []).reduce((sum, item) => sum + number(item.amount), 0)
  const scenarioHousingCosts = (scenarioBudget.fixed || []).reduce((sum, item) => {
    if (!housingCostPattern.test(String(item.name || ''))) return sum
    return sum + number(item.cost) / Math.max(1, number(item.factor) || 1)
  }, 0)
  const otherLivingCosts = Math.max(0, scenarioFixedCosts - scenarioHousingCosts) + scenarioVariableCosts
  const stressHousingCost = Math.max(totalMonthly, totalMonthlyAfterGrace)
  const remainingBuffer = monthlyIncome - otherLivingCosts - stressHousingCost
  const housingRatio = monthlyIncome > 0 ? stressHousingCost / monthlyIncome : 1
  const debtServiceRatio = monthlyIncome > 0 ? Math.max(bankRate + kfwRate, creditRateAfterGrace) / monthlyIncome : 1

  const evolution = project.scenarioEvolution || {}
  const scenarioYears = Math.max(1, Math.min(50, Math.round(number(evolution.years) || 30)))
  const incomeIncreasePct = number(evolution.incomeIncreasePct)
  const costIncreasePct = number(evolution.costIncreasePct)
  const housingCostIncreasePct = number(evolution.housingCostIncreasePct)
  const scenarioEvents = evolution.events || []
  const timeline = Array.from({ length: scenarioYears }, (_, index) => {
    const year = index + 1
    const incomeDelta = scenarioEvents.filter(item => item.type === 'income' && number(item.startYear) <= year).reduce((sum, item) => sum + Number(item.monthlyDelta || 0), 0)
    const costDelta = scenarioEvents.filter(item => item.type === 'cost' && number(item.startYear) <= year).reduce((sum, item) => sum + Number(item.monthlyDelta || 0), 0)
    const income = monthlyIncome * Math.pow(1 + pct(incomeIncreasePct), index) + incomeDelta
    const livingCosts = Math.max(0, otherLivingCosts * Math.pow(1 + pct(costIncreasePct), index) + costDelta)
    const bankRows = bankPlan.rows.slice(index * 12, index * 12 + 12)
    const kfwRows = kfwPlan.rows.slice(index * 12, index * 12 + 12)
    const creditPayments = bankRows.reduce((sum, row) => sum + number(row.payment), 0) + kfwRows.reduce((sum, row) => sum + number(row.payment), 0)
    const specialPayments = bankRows.reduce((sum, row) => sum + number(row.extraRepayment), 0) + kfwRows.reduce((sum, row) => sum + number(row.extraRepayment), 0)
    const creditRate = creditPayments / 12
    const specialMonthly = specialPayments / 12
    const runningHousingCosts = monthlyHousingCosts * Math.pow(1 + pct(housingCostIncreasePct), index)
    const housingCost = creditRate + specialMonthly + runningHousingCosts
    const buffer = income - livingCosts - housingCost
    const housingRatio = income > 0 ? housingCost / income : 1
    return { year, income, livingCosts, creditRate, specialPayments, specialMonthly, runningHousingCosts, housingCost, buffer, housingRatio }
  })
  const worstYear = timeline.reduce((worst, row) => !worst || row.buffer < worst.buffer ? row : worst, null)
  const bestYear = timeline.reduce((best, row) => !best || row.buffer > best.buffer ? row : best, null)
  const averageBuffer = timeline.length ? timeline.reduce((sum, row) => sum + row.buffer, 0) / timeline.length : 0
  const firstCriticalYear = timeline.find(row => row.buffer < 0 || row.housingRatio > 0.5) || null
  const timelineRemainingBuffer = worstYear?.buffer ?? remainingBuffer
  const timelineHousingRatio = worstYear?.housingRatio ?? housingRatio

  let affordability = {
    kind: 'red',
    label: 'Nicht finanzierbar',
    headline: 'Die geplante Belastung ist aktuell zu hoch.',
  }
  if (monthlyIncome > 0 && timelineRemainingBuffer >= 500 && timelineHousingRatio <= 0.40) {
    affordability = {
      kind: 'green',
      label: 'Gut finanzierbar',
      headline: 'Die Finanzierung lässt einen soliden monatlichen Puffer.',
    }
  } else if (monthlyIncome > 0 && timelineRemainingBuffer >= 0 && timelineHousingRatio <= 0.50) {
    affordability = {
      kind: 'yellow',
      label: 'Knapp finanzierbar',
      headline: 'Die Finanzierung ist möglich, aber der Puffer ist begrenzt.',
    }
  }

  return {
    purchasePrice, purchaseCosts, totalCost, equity, baseEquity, pensionEquity, emergencyEquity, financingNeed, kfwAmount, bankAmount,
    bankRate, kfwRate, regularKfwRate, creditRate: bankRate + kfwRate,
    creditRateAfterGrace, monthlyHousingCosts, totalMonthly,
    totalMonthlyAfterGrace,
    bankPlan, kfwPlan, annualSchedule, residualAtFixed, payoffMonths,
    totalInterest: bankPlan.totalInterest + kfwPlan.totalInterest,
    totalPaid: bankPlan.totalPaid + kfwPlan.totalPaid,
    totalExtraRepayment: bankPlan.totalExtraRepayment + kfwPlan.totalExtraRepayment,
    planningImpact: {
      baselineInterest,
      interestSaved,
      monthsSaved,
      bankMonthsSaved,
      kfwMonthsSaved,
      baselinePayoffMonths,
      baselineResidualAtFixed,
      residualReductionAtFixed: Math.max(0, baselineResidualAtFixed - residualAtFixed),
      plannedExtraRepayment,
      unappliedExtraRepayment: Math.max(0, plannedExtraRepayment - (bankPlan.totalExtraRepayment + kfwPlan.totalExtraRepayment)),
      bankInterestSaved: Math.max(0, baselineBankPlan.totalInterest - bankPlan.totalInterest),
      kfwInterestSaved: Math.max(0, baselineKfwPlan.totalInterest - kfwPlan.totalInterest),
      hasPlanning: (project.extraRepayments || []).length > 0 || number(project.bank?.annualRateIncreasePct) > 0 || number(project.kfw?.annualRateIncreasePct) > 0,
    },
    affordability: {
      ...affordability,
      monthlyIncome,
      currentHousingCosts: scenarioHousingCosts,
      otherLivingCosts,
      scenarioFixedCosts,
      scenarioVariableCosts,
      stressHousingCost,
      remainingBuffer,
      housingRatio,
      debtServiceRatio, timeline, worstYear, bestYear, averageBuffer, firstCriticalYear, scenarioYears,
    },
  }
}

const Field = ({ label, suffix, children }) => <label>{label}<div className="input-suffix-wrap">{children}{suffix && <span>{suffix}</span>}</div></label>

function ResidualChart({ rows, initial }) {
  const visible = rows.filter((_, index) => index === 0 || (index + 1) % 2 === 0 || index === rows.length - 1).slice(0, 26)
  const width = 760
  const height = 230
  const pad = 28
  const max = Math.max(initial, 1)
  const points = visible.map((row, index) => {
    const x = pad + (visible.length <= 1 ? 0 : index / (visible.length - 1)) * (width - pad * 2)
    const y = pad + (1 - row.balance / max) * (height - pad * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  return <div className="repayment-chart-wrap">
    <svg className="repayment-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Entwicklung der Restschuld">
      {[0, .25, .5, .75, 1].map(value => <line key={value} x1={pad} x2={width-pad} y1={pad + value*(height-pad*2)} y2={pad + value*(height-pad*2)} />)}
      <polyline points={points}/>
      {visible.map((row,index) => {
        const [x,y] = points.split(' ')[index].split(',')
        return <circle key={row.year} cx={x} cy={y} r="3"/>
      })}
    </svg>
    <div className="repayment-chart-labels"><span>Start {euro(initial)}</span><span>{visible.at(-1)?.calendarYear || ''}: {euro(visible.at(-1)?.balance || 0)}</span></div>
  </div>
}

export default function HousingFinance({ state, setState }) {
  const projects = state.housingFinance?.projects || []
  const activeId = state.housingFinance?.activeProjectId || projects[0]?.id || null
  const project = projects.find(item => item.id === activeId) || projects[0] || null
  const summary = useMemo(() => housingFinanceSummary(state, project), [state, project])

  const updateRoot = value => setState(current => ({
    ...current,
    housingFinance: { ...(current.housingFinance || {}), ...value },
  }))
  const updateActiveProject = updater => {
    if (!project?.id) return
    const displayedProjectId = project.id
    setState(current => {
      const finance = current.housingFinance || { projects: [], activeProjectId: null }
      const currentProjects = finance.projects || []
      const targetId = currentProjects.some(item => item.id === displayedProjectId)
        ? displayedProjectId
        : currentProjects[0]?.id
      if (!targetId) return current
      return {
        ...current,
        housingFinance: {
          ...finance,
          activeProjectId: targetId,
          projects: currentProjects.map(item => item.id === targetId ? updater(item) : item),
        },
      }
    })
  }
  const updateProject = patch => updateActiveProject(item => ({ ...item, ...patch }))
  const updateSection = (section, field, value) => updateActiveProject(item => ({
    ...item,
    [section]: { ...(item[section] || {}), [field]: value },
  }))
  const addProject = () => {
    const item = createHousingFinanceProject(state, projects.length + 1)
    setState(current => ({
      ...current,
      housingFinance: { projects: [...(current.housingFinance?.projects || []), item], activeProjectId: item.id },
    }))
  }
  const removeProject = () => {
    if (!project || !confirm(`„${project.name}“ wirklich löschen?`)) return
    setState(current => {
      const remaining = (current.housingFinance?.projects || []).filter(item => item.id !== project.id)
      return { ...current, housingFinance: { projects: remaining, activeProjectId: remaining[0]?.id || null } }
    })
  }

  const addExtraRepayment = () => updateActiveProject(item => ({
    ...item,
    extraRepayments: [...(item.extraRepayments || []), { id: crypto.randomUUID(), loan: 'bank', year: 1, amount: 5000 }],
  }))
  const updateExtraRepayment = (id, patch) => updateActiveProject(item => ({
    ...item,
    extraRepayments: (item.extraRepayments || []).map(entry => entry.id === id ? { ...entry, ...patch } : entry),
  }))
  const removeExtraRepayment = id => updateActiveProject(item => ({ ...item, extraRepayments: (item.extraRepayments || []).filter(entry => entry.id !== id) }))

  const copyCurrentBudget = () => updateActiveProject(item => ({
    ...item,
    scenarioBudget: {
      income: structuredClone(state.budget?.income || []),
      fixed: structuredClone(state.budget?.fixed || []),
      variable: structuredClone(state.budget?.variable || []),
    },
  }))
  const updateScenarioItem = (group, id, key, value) => updateActiveProject(item => ({
    ...item,
    scenarioBudget: {
      ...(item.scenarioBudget || {}),
      [group]: (item.scenarioBudget?.[group] || []).map(entry => entry.id === id ? { ...entry, [key]: key === 'name' ? value : number(value) } : entry),
    },
  }))
  const addScenarioItem = group => updateActiveProject(item => ({
    ...item,
    scenarioBudget: {
      ...(item.scenarioBudget || {}),
      [group]: [...(item.scenarioBudget?.[group] || []), group === 'fixed'
        ? { id: crypto.randomUUID(), name: 'Neue Fixkosten', factor: 1, cost: 0 }
        : { id: crypto.randomUUID(), name: group === 'income' ? 'Neues Einkommen' : 'Neue variable Ausgabe', amount: 0 }],
    },
  }))
  const removeScenarioItem = (group, id) => updateActiveProject(item => ({
    ...item,
    scenarioBudget: { ...(item.scenarioBudget || {}), [group]: (item.scenarioBudget?.[group] || []).filter(entry => entry.id !== id) },
  }))
  const updateScenarioEvolution = (field, value) => updateActiveProject(item => ({ ...item, scenarioEvolution: { ...(item.scenarioEvolution || {}), [field]: value } }))
  const addScenarioEvent = type => updateActiveProject(item => ({ ...item, scenarioEvolution: { ...(item.scenarioEvolution || {}), events: [...(item.scenarioEvolution?.events || []), { id: crypto.randomUUID(), type, name: type === 'income' ? 'Gehaltssprung' : 'Lebensereignis', startYear: 2, monthlyDelta: 0 }] } }))
  const updateScenarioEvent = (id, patch) => updateActiveProject(item => ({ ...item, scenarioEvolution: { ...(item.scenarioEvolution || {}), events: (item.scenarioEvolution?.events || []).map(entry => entry.id === id ? { ...entry, ...patch } : entry) } }))
  const removeScenarioEvent = id => updateActiveProject(item => ({ ...item, scenarioEvolution: { ...(item.scenarioEvolution || {}), events: (item.scenarioEvolution?.events || []).filter(entry => entry.id !== id) } }))

  if (!project) return <Panel title="Wohnungsfinanzierung Pro" subtitle="Berechne eine konkrete Wohnung vom Kaufpreis bis zur vollständigen Tilgung.">
    <div className="housing-empty"><Building2 size={48}/><h3>Noch keine Finanzierung angelegt</h3><p>Lege dein erstes Projekt an. Deine aktuellen Vermögenswerte können automatisch als Eigenkapital übernommen werden.</p><button className="primary" onClick={addProject}><Plus size={18}/> Erste Finanzierung anlegen</button></div>
  </Panel>

  return <>
    <section className="housing-project-bar">
      <div>
        <span>Aktives Projekt</span>
        <select value={project.id} onChange={event => updateRoot({ activeProjectId: event.target.value })}>
          {projects.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </div>
      <button onClick={addProject}><Plus size={18}/> Neues Projekt</button>
      <button className="danger" onClick={removeProject}><Trash2 size={18}/> Löschen</button>
    </section>

    <div className="housing-title-edit">
      <Field label="Bezeichnung"><input value={project.name} onChange={event => updateProject({ name: event.target.value })}/></Field>
      <Field label="Adresse / Notiz zum Objekt"><input placeholder="z. B. Musterstraße 12, Augsburg" value={project.property.address} onChange={event => updateSection('property','address',event.target.value)}/></Field>
      <Field label="Finanzierungsbeginn"><input type="month" value={project.startDate || currentMonth()} onChange={event => updateProject({ startDate: event.target.value })}/></Field>
    </div>

    <div className="metric-grid housing-metrics housing-kpi-grid">
      <MetricCard label="Monatliche Kreditrate" value={euro(summary.creditRate)} hint={`Bank ${euro(summary.bankRate)} · KfW ${euro(summary.kfwRate)}`} accent/>
      <MetricCard label="Gesamte Monatskosten" value={euro(summary.totalMonthly)} hint={`inkl. ${euro(summary.monthlyHousingCosts)} laufender Kosten`}/>
      <MetricCard label="Gesamte Zinsen" value={euro(summary.totalInterest)} hint={`Ersparnis durch Planung ${euro(summary.planningImpact.interestSaved)}`}/>
      <MetricCard label="Vollständig abbezahlt" value={durationLabel(summary.payoffMonths)} hint={`Sondertilgungen ${euro(summary.totalExtraRepayment)}`}/>
      <MetricCard label="Finanzierungsbedarf" value={euro(summary.financingNeed)} hint={`Eigenkapital ${euro(summary.equity)}`}/>
      <MetricCard label="Restschuld nach Zinsbindung" value={euro(summary.residualAtFixed)} hint={`nach ${number(project.bank.fixedYears || 10)} Jahren`}/>
    </div>

    <Panel title="Deine Finanzierung auf einen Blick" subtitle="Die wichtigsten Kennzahlen ohne Fachchinesisch" className="housing-overview-panel">
      <div className="housing-overview-grid">
        <div><span>Kaufpreis + Nebenkosten</span><b>{euro(summary.totalCost)}</b></div>
        <div><span>Eigenkapital</span><b>{euro(summary.equity)}</b></div>
        <div><span>Bankdarlehen</span><b>{euro(summary.bankAmount)}</b></div>
        <div><span>KfW-Darlehen</span><b>{euro(summary.kfwAmount)}</b></div>
        <div className="highlight"><span>Kreditrate zu Beginn</span><b>{euro(summary.creditRate)}</b></div>
        <div className="highlight"><span>Alle Wohnkosten pro Monat</span><b>{euro(summary.totalMonthly)}</b></div>
        <div><span>Zinsen über die gesamte Laufzeit</span><b>{euro(summary.totalInterest)}</b></div>
        <div><span>Voraussichtlich schuldenfrei</span><b>{durationLabel(summary.payoffMonths)}</b></div>
      </div>
    </Panel>

    <div className="content-grid housing-grid simplified-housing-grid">
      <Panel title="Objekt & Eigenkapital" subtitle="Grunddaten der Wohnung und vorhandenes Eigenkapital" className="span-6">
        <div className="form-grid two">
          <Field label="Kaufpreis" suffix="€"><NumberInput value={project.property.purchasePrice} onValueChange={value => updateSection('property','purchasePrice',value)}/></Field>
          <Field label="Wohnfläche" suffix="m²"><NumberInput value={project.property.livingArea} onValueChange={value => updateSection('property','livingArea',value)}/></Field>
          <Field label="Baujahr"><NumberInput min={1800} max={2100} value={project.property.buildYear} onValueChange={value => updateSection('property','buildYear',value)}/></Field>
          <label className="check-field"><input type="checkbox" checked={Boolean(project.equity.useCurrent)} onChange={event => updateSection('equity','useCurrent',event.target.checked)}/><span>Aktuelles Vermögen automatisch übernehmen</span></label>
          {!project.equity.useCurrent && <Field label="Eigenkapital manuell" suffix="€"><NumberInput value={project.equity.manualAmount} onValueChange={value => updateSection('equity','manualAmount',value)}/></Field>}
          <label className="check-field"><input type="checkbox" checked={Boolean(project.equity.includePension)} onChange={event => updateSection('equity','includePension',event.target.checked)}/><span>Rentenvermögen einbeziehen</span></label>
          <label className="check-field"><input type="checkbox" checked={Boolean(project.equity.includeEmergency)} onChange={event => updateSection('equity','includeEmergency',event.target.checked)}/><span>Notgroschen einbeziehen</span></label>
        </div>
        <div className="equity-breakdown">
          <span>Basis-Eigenkapital <b>{euro(summary.baseEquity)}</b></span>
          <span>Rentenvermögen <b>{euro(summary.pensionEquity)}</b></span>
          <span>Notgroschen <b>{euro(summary.emergencyEquity)}</b></span>
        </div>
      </Panel>

      <Panel title="Kaufnebenkosten" subtitle="Prozentsätze und einmalige Zusatzkosten" className="span-6">
        <div className="form-grid two">
          <Field label="Grunderwerbsteuer" suffix="%"><NumberInput value={project.purchaseCosts.transferTaxPct} onValueChange={value => updateSection('purchaseCosts','transferTaxPct',value)} step="0.1"/></Field>
          <Field label="Notar" suffix="%"><NumberInput value={project.purchaseCosts.notaryPct} onValueChange={value => updateSection('purchaseCosts','notaryPct',value)} step="0.1"/></Field>
          <Field label="Grundbuch" suffix="%"><NumberInput value={project.purchaseCosts.landRegisterPct} onValueChange={value => updateSection('purchaseCosts','landRegisterPct',value)} step="0.1"/></Field>
          <Field label="Makler" suffix="%"><NumberInput value={project.purchaseCosts.brokerPct} onValueChange={value => updateSection('purchaseCosts','brokerPct',value)} step="0.1"/></Field>
          <Field label="Renovierung" suffix="€"><NumberInput value={project.purchaseCosts.renovation} onValueChange={value => updateSection('purchaseCosts','renovation',value)}/></Field>
          <Field label="Möbel / Einrichtung" suffix="€"><NumberInput value={project.purchaseCosts.furnishing} onValueChange={value => updateSection('purchaseCosts','furnishing',value)}/></Field>
          <Field label="Sonstige Kosten" suffix="€"><NumberInput value={project.purchaseCosts.other} onValueChange={value => updateSection('purchaseCosts','other',value)}/></Field>
        </div>
      </Panel>

      <Panel title="Bankdarlehen" subtitle={`Automatisch verbleibender Betrag: ${euro(summary.bankAmount)} · Rate reagiert auf Tilgung und Wunschlaufzeit`} className="span-6">
        <div className="loan-heading"><Landmark size={22}/><strong>Monatliche Annuität: {euro(summary.bankPlan.regularRate)}</strong></div>
        <div className="form-grid two">
          <Field label="Sollzins" suffix="%"><NumberInput value={project.bank.interestPct} onValueChange={value => updateSection('bank','interestPct',value)} step="0.01"/></Field>
          <Field label="Anfangstilgung" suffix="%"><NumberInput value={project.bank.repaymentPct} onValueChange={value => updateSection('bank','repaymentPct',value)} step="0.01"/></Field>
          <Field label="Zinsbindung" suffix="Jahre"><NumberInput value={project.bank.fixedYears} onValueChange={value => updateSection('bank','fixedYears',value)}/></Field>
          <Field label="Gewünschte Laufzeit" suffix="Jahre"><NumberInput value={project.bank.termYears} onValueChange={value => updateSection('bank','termYears',value)}/></Field>
          <Field label="Monatsrate steigt jährlich um" suffix="%"><NumberInput value={project.bank.annualRateIncreasePct ?? 0} onValueChange={value => updateSection('bank','annualRateIncreasePct',value)} step="0.1"/></Field>
          <Field label="Steigerung ab Finanzierungsjahr"><NumberInput min={1} value={project.bank.increaseStartYear ?? 2} onValueChange={value => updateSection('bank','increaseStartYear',value)}/></Field>
          <Field label="Obergrenze Monatsrate" suffix="€"><NumberInput value={project.bank.maxMonthlyRate ?? 0} onValueChange={value => updateSection('bank','maxMonthlyRate',value)}/></Field>
        </div>
        <p className="calculation-note">Die Rate steigt jeweils zu Beginn eines Finanzierungsjahres um den eingestellten Prozentsatz. 0 % deaktiviert die automatische Erhöhung; 0 € bedeutet keine Obergrenze.</p>
        <div className="loan-result-strip"><span>Restschuld nach Zinsbindung <b>{euro(summary.bankPlan.residual(number(project.bank.fixedYears) * 12))}</b></span><span>Gesamtzins <b>{euro(summary.bankPlan.totalInterest)}</b></span><span>Laufzeit <b>{durationLabel(summary.bankPlan.payoffMonths)}</b></span></div>
      </Panel>

      <Panel title="KfW-Darlehen" subtitle="Anlaufjahre, Anfangstilgung und Wunschlaufzeit werden gemeinsam berechnet" className="span-6">
        <label className="check-field kfw-switch"><input type="checkbox" checked={Boolean(project.kfw.enabled)} onChange={event => updateSection('kfw','enabled',event.target.checked)}/><span>KfW-Darlehen verwenden</span></label>
        <div className={`loan-fields ${project.kfw.enabled ? '' : 'disabled'}`}>
          <div className="loan-heading"><Home size={22}/><strong>{number(project.kfw.graceYears) > 0 ? `Start ${euro(summary.kfwRate)} · danach ${euro(summary.regularKfwRate)}` : `Monatliche Annuität: ${euro(summary.regularKfwRate)}`}</strong></div>
          <div className="form-grid two">
            <Field label="Programm"><input value={project.kfw.program} onChange={event => updateSection('kfw','program',event.target.value)}/></Field>
            <Field label="Darlehensbetrag" suffix="€"><NumberInput value={project.kfw.amount} onValueChange={value => updateSection('kfw','amount',value)}/></Field>
            <Field label="Sollzins" suffix="%"><NumberInput value={project.kfw.interestPct} onValueChange={value => updateSection('kfw','interestPct',value)} step="0.01"/></Field>
            <Field label="Anfangstilgung" suffix="%"><NumberInput value={project.kfw.repaymentPct} onValueChange={value => updateSection('kfw','repaymentPct',value)} step="0.01"/></Field>
            <Field label="Tilgungsfreie Jahre" suffix="Jahre"><NumberInput value={project.kfw.graceYears} onValueChange={value => updateSection('kfw','graceYears',value)}/></Field>
            <Field label="Zinsbindung" suffix="Jahre"><NumberInput min={1} value={project.kfw.fixedYears ?? 10} onValueChange={value => updateSection('kfw','fixedYears',value)}/></Field>
            <Field label="Gewünschte Laufzeit" suffix="Jahre"><NumberInput value={project.kfw.termYears} onValueChange={value => updateSection('kfw','termYears',value)}/></Field>
            <Field label="Monatsrate steigt jährlich um" suffix="%"><NumberInput value={project.kfw.annualRateIncreasePct ?? 0} onValueChange={value => updateSection('kfw','annualRateIncreasePct',value)} step="0.1"/></Field>
            <Field label="Steigerung ab Finanzierungsjahr"><NumberInput min={1} value={project.kfw.increaseStartYear ?? 2} onValueChange={value => updateSection('kfw','increaseStartYear',value)}/></Field>
            <Field label="Obergrenze Monatsrate" suffix="€"><NumberInput value={project.kfw.maxMonthlyRate ?? 0} onValueChange={value => updateSection('kfw','maxMonthlyRate',value)}/></Field>
          </div>
          <div className="loan-result-strip"><span>Restschuld nach Zinsbindung <b>{euro(summary.kfwPlan.residual(number(project.kfw.fixedYears ?? 10) * 12))}</b></span><span>Gesamtzins <b>{euro(summary.kfwPlan.totalInterest)}</b></span><span>Laufzeit <b>{durationLabel(summary.kfwPlan.payoffMonths)}</b></span></div>
        </div>
      </Panel>

      <Panel title="Sonderzahlungen" subtitle="Einmalige zusätzliche Zahlung am Ende eines Finanzierungsjahres" className="span-12">
        <div className="finance-action-list">
          {(project.extraRepayments || []).length === 0 && <p className="finance-empty-note">Noch keine Sonderzahlung eingetragen.</p>}
          {(project.extraRepayments || []).map(entry => <div className="finance-action-row" key={entry.id}>
            <Field label="Darlehen"><select value={entry.loan || 'bank'} onChange={event => updateExtraRepayment(entry.id, { loan: event.target.value })}><option value="bank">Bank</option><option value="kfw">KfW</option></select></Field>
            <Field label="Finanzierungsjahr"><NumberInput min={1} value={entry.year} onValueChange={value => updateExtraRepayment(entry.id, { year: value })}/></Field>
            <Field label="Betrag" suffix="€"><NumberInput value={entry.amount} onValueChange={value => updateExtraRepayment(entry.id, { amount: value })}/></Field>
            <button className="icon-danger" title="Sonderzahlung löschen" onClick={() => removeExtraRepayment(entry.id)}><Trash2 size={18}/></button>
          </div>)}
        </div>
        <button onClick={addExtraRepayment}><Plus size={18}/> Sonderzahlung hinzufügen</button>
        {(summary.totalExtraRepayment > 0) && <p className="finance-summary-note">Tatsächlich in der Berechnung berücksichtigt: <b>{euro(summary.totalExtraRepayment)}</b> Sondertilgungen.</p>}
      </Panel>

      <Panel title="Was bringen Tilgungssteigerung und Sonderzahlungen?" subtitle="Direkter Vergleich mit der Finanzierung ohne zusätzliche Tilgung" className="span-12 planning-impact-panel">
        {!summary.planningImpact.hasPlanning ? <p className="finance-empty-note">Noch keine zusätzliche Tilgung aktiv. Lege eine jährliche Ratenerhöhung oder eine Sonderzahlung fest.</p> : <>
          <div className="planning-impact-grid">
            <div><span>Sonderzahlungen geplant</span><b>{euro(summary.planningImpact.plannedExtraRepayment)}</b></div>
            <div><span>Davon tatsächlich abgezogen</span><b>{euro(summary.totalExtraRepayment)}</b></div>
            <div><span>Gesparte Zinsen</span><b>{euro(summary.planningImpact.interestSaved)}</b></div>
            <div><span>Weniger Restschuld nach Zinsbindung</span><b>{euro(summary.planningImpact.residualReductionAtFixed)}</b></div>
            <div><span>Bankdarlehen früher fertig</span><b>{durationLabel(summary.planningImpact.bankMonthsSaved)}</b></div>
            <div><span>KfW-Darlehen früher fertig</span><b>{durationLabel(summary.planningImpact.kfwMonthsSaved)}</b></div>
          </div>
          {summary.planningImpact.unappliedExtraRepayment > 0 && <p className="finance-warning-note">
            {euro(summary.planningImpact.unappliedExtraRepayment)} der geplanten Sondertilgungen wurden nicht mehr benötigt, weil das gewählte Darlehen vorher vollständig getilgt war.
          </p>}
          <div className="planning-comparison">
            <span>Ohne zusätzliche Tilgung: <b>{durationLabel(summary.planningImpact.baselinePayoffMonths)}</b> · {euro(summary.planningImpact.baselineInterest)} Zinsen</span>
            <span>Mit deiner Tilgungsplanung: <b>{durationLabel(summary.payoffMonths)}</b> · {euro(summary.totalInterest)} Zinsen</span>
          </div>
        </>}
      </Panel>

      <Panel title="Monatliche Wohnungskosten" subtitle="Alle laufenden Kosten zusätzlich zu den Kreditraten" className="span-8">
        <div className="form-grid three housing-cost-form">
          {[
            ['houseFee','Hausgeld'],['heating','Heizung'],['electricity','Strom'],['internet','Internet'],
            ['insurance','Versicherungen'],['maintenance','Instandhaltungsrücklage'],['propertyTax','Grundsteuer'],
            ['parking','Stellplatz / Garage'],['other','Sonstige Kosten'],
          ].map(([key,label]) => <Field key={key} label={label} suffix="€/Monat"><NumberInput value={project.monthlyCosts[key]} onValueChange={value => updateSection('monthlyCosts',key,value)}/></Field>)}
        </div>
      </Panel>

      <Panel title="Monatsübersicht" subtitle="Exakte Aufteilung aus den Tilgungsplänen" className="span-4">
        <div className="housing-monthly-breakdown">
          <div><span>Bankrate</span><b>{euro(summary.bankRate)}</b></div>
          <div><span>KfW-Rate zu Beginn</span><b>{euro(summary.kfwRate)}</b></div>
          {number(project.kfw.graceYears) > 0 && <div><span>KfW nach Anlaufzeit</span><b>{euro(summary.regularKfwRate)}</b></div>}
          <div><span>Wohnungskosten</span><b>{euro(summary.monthlyHousingCosts)}</b></div>
          <div className="total"><span>Gesamt zu Beginn</span><b>{euro(summary.totalMonthly)}</b></div>
          {number(project.kfw.graceYears) > 0 && <div className="total secondary"><span>Nach KfW-Anlaufzeit</span><b>{euro(summary.totalMonthlyAfterGrace)}</b></div>}
        </div>
        <p className="calculation-note">Ohne Tilgungssteigerung bleibt die Annuität konstant. Jährliche Ratenerhöhungen und Sonderzahlungen werden monatsgenau berücksichtigt. Zinsen werden monatlich auf die jeweilige Restschuld berechnet. Der eingegebene Sollzins wird für die gesamte Modelllaufzeit verwendet.</p>
      </Panel>

      <Panel title="Machbarkeits-Finanzplan" subtitle="Separate Kopie deines Finanzplans – Änderungen gelten nur für diese Wohnungsfinanzierung" className="span-12 scenario-budget-panel" action={<button onClick={copyCurrentBudget}>Aktuellen Finanzplan neu kopieren</button>}>
        <p className="calculation-note">Hier kannst du Einkommen und Kosten für ein mögliches Leben nach dem Wohnungskauf verändern. Dein normaler Finanzplan bleibt vollständig unverändert.</p>
        <div className="scenario-budget-summary">
          <div><span>Einkommen</span><b>{euro(summary.affordability.monthlyIncome)}</b></div>
          <div><span>Fixkosten im Szenario</span><b>{euro(summary.affordability.scenarioFixedCosts)}</b></div>
          <div><span>Variable Kosten</span><b>{euro(summary.affordability.scenarioVariableCosts)}</b></div>
          <div className="highlight"><span>Puffer nach neuer Wohnung</span><b>{euro(summary.affordability.remainingBuffer)}</b></div>
        </div>
        <div className="scenario-budget-columns">
          <div>
            <div className="scenario-section-head"><h3>Einkommen</h3><button onClick={() => addScenarioItem('income')}><Plus size={16}/> Position</button></div>
            <div className="scenario-list">{(project.scenarioBudget?.income || []).map(entry => <div className="scenario-row simple" key={entry.id}>
              <input aria-label="Bezeichnung Einkommen" value={entry.name} onChange={event => updateScenarioItem('income', entry.id, 'name', event.target.value)}/>
              <Field label="Monatlich" suffix="€"><NumberInput value={entry.amount} onValueChange={value => updateScenarioItem('income', entry.id, 'amount', value)}/></Field>
              <button className="icon-danger" onClick={() => removeScenarioItem('income', entry.id)}><Trash2 size={17}/></button>
            </div>)}</div>
          </div>
          <div>
            <div className="scenario-section-head"><h3>Variable Ausgaben</h3><button onClick={() => addScenarioItem('variable')}><Plus size={16}/> Position</button></div>
            <div className="scenario-list">{(project.scenarioBudget?.variable || []).map(entry => <div className="scenario-row simple" key={entry.id}>
              <input aria-label="Bezeichnung variable Ausgabe" value={entry.name} onChange={event => updateScenarioItem('variable', entry.id, 'name', event.target.value)}/>
              <Field label="Monatlich" suffix="€"><NumberInput value={entry.amount} onValueChange={value => updateScenarioItem('variable', entry.id, 'amount', value)}/></Field>
              <button className="icon-danger" onClick={() => removeScenarioItem('variable', entry.id)}><Trash2 size={17}/></button>
            </div>)}</div>
          </div>
        </div>
        <div className="scenario-section-head fixed-head"><h3>Fixkosten</h3><button onClick={() => addScenarioItem('fixed')}><Plus size={16}/> Fixkosten</button></div>
        <div className="scenario-fixed-list">{(project.scenarioBudget?.fixed || []).map(entry => <div className="scenario-row fixed" key={entry.id}>
          <input aria-label="Bezeichnung Fixkosten" value={entry.name} onChange={event => updateScenarioItem('fixed', entry.id, 'name', event.target.value)}/>
          <Field label="Alle … Monate"><NumberInput min={1} value={entry.factor} onValueChange={value => updateScenarioItem('fixed', entry.id, 'factor', value)}/></Field>
          <Field label="Betrag" suffix="€"><NumberInput value={entry.cost} onValueChange={value => updateScenarioItem('fixed', entry.id, 'cost', value)}/></Field>
          <div className="scenario-monthly-value"><span>Monatlich</span><b>{euro(number(entry.cost) / Math.max(1, number(entry.factor) || 1))}</b></div>
          <button className="icon-danger" onClick={() => removeScenarioItem('fixed', entry.id)}><Trash2 size={17}/></button>
        </div>)}</div>
      </Panel>

      <Panel title="Jahres-Szenarioplan & Machbarkeitsampel" subtitle="Einkommen, Lebenshaltung und Kreditbelastung über die Zeit" className="span-12 affordability-panel">
        <div className="scenario-evolution-settings">
          <Field label="Planungszeitraum" suffix="Jahre"><NumberInput min={1} max={50} value={project.scenarioEvolution?.years ?? 30} onValueChange={value => updateScenarioEvolution('years', value)}/></Field>
          <Field label="Einkommen steigt jährlich" suffix="%"><NumberInput value={project.scenarioEvolution?.incomeIncreasePct ?? 2} onValueChange={value => updateScenarioEvolution('incomeIncreasePct', value)}/></Field>
          <Field label="Lebenshaltung steigt jährlich" suffix="%"><NumberInput value={project.scenarioEvolution?.costIncreasePct ?? 2} onValueChange={value => updateScenarioEvolution('costIncreasePct', value)}/></Field>
          <Field label="Wohnnebenkosten steigen jährlich" suffix="%"><NumberInput value={project.scenarioEvolution?.housingCostIncreasePct ?? 2} onValueChange={value => updateScenarioEvolution('housingCostIncreasePct', value)}/></Field>
        </div>
        <div className={`affordability-hero ${summary.affordability.kind}`}>
          <div className="affordability-icon">{summary.affordability.kind === 'green' ? <CircleCheck size={42}/> : summary.affordability.kind === 'yellow' ? <TriangleAlert size={42}/> : <CircleX size={42}/>}</div>
          <div><span className="affordability-label">{summary.affordability.label}</span><h3>{summary.affordability.headline}</h3><p>Bewertet wird das schwächste Jahr. Der niedrigste Puffer liegt bei <b>{euro(summary.affordability.worstYear?.buffer || 0)}</b> pro Monat.</p></div>
        </div>
        <div className="affordability-grid timeline-kpis">
          <div><span>Schlechtestes Jahr</span><b>Jahr {summary.affordability.worstYear?.year || 1}</b></div>
          <div><span>Niedrigster Puffer</span><b>{euro(summary.affordability.worstYear?.buffer || 0)}</b></div>
          <div><span>Durchschnittlicher Puffer</span><b>{euro(summary.affordability.averageBuffer)}</b></div>
          <div><span>Höchste Wohnkostenquote</span><b>{((summary.affordability.worstYear?.housingRatio || 0) * 100).toLocaleString('de-DE', { maximumFractionDigits: 1 })} %</b></div>
          <div><span>Bestes Jahr</span><b>Jahr {summary.affordability.bestYear?.year || 1} · {euro(summary.affordability.bestYear?.buffer || 0)}</b></div>
          <div className="highlight"><span>Erstes kritisches Jahr</span><b>{summary.affordability.firstCriticalYear ? `Jahr ${summary.affordability.firstCriticalYear.year}` : 'Keines'}</b></div>
        </div>
        <div className="scenario-events-grid">
          <div><div className="scenario-section-head"><h3>Einkommenssprünge</h3><button onClick={() => addScenarioEvent('income')}><Plus size={16}/> Sprung</button></div><p className="calculation-note">Beispiel: ab Jahr 4 monatlich 300 € mehr Einkommen.</p><div className="scenario-list">{(project.scenarioEvolution?.events || []).filter(item => item.type === 'income').map(entry => <div className="scenario-event-row" key={entry.id}><input value={entry.name} onChange={event => updateScenarioEvent(entry.id, { name: event.target.value })}/><Field label="Ab Jahr"><NumberInput min={1} value={entry.startYear} onValueChange={value => updateScenarioEvent(entry.id, { startYear: value })}/></Field><Field label="Mehr pro Monat" suffix="€"><NumberInput value={entry.monthlyDelta} onValueChange={value => updateScenarioEvent(entry.id, { monthlyDelta: value })}/></Field><button className="icon-danger" onClick={() => removeScenarioEvent(entry.id)}><Trash2 size={17}/></button></div>)}</div></div>
          <div><div className="scenario-section-head"><h3>Kostenänderungen & Lebensereignisse</h3><button onClick={() => addScenarioEvent('cost')}><Plus size={16}/> Ereignis</button></div><p className="calculation-note">Positive Beträge erhöhen die Kosten. Negative Beträge lassen Kosten entfallen.</p><div className="scenario-list">{(project.scenarioEvolution?.events || []).filter(item => item.type === 'cost').map(entry => <div className="scenario-event-row" key={entry.id}><input value={entry.name} onChange={event => updateScenarioEvent(entry.id, { name: event.target.value })}/><Field label="Ab Jahr"><NumberInput min={1} value={entry.startYear} onValueChange={value => updateScenarioEvent(entry.id, { startYear: value })}/></Field><Field label="Änderung pro Monat" suffix="€"><input type="number" step="any" value={entry.monthlyDelta ?? 0} onChange={event => updateScenarioEvent(entry.id, { monthlyDelta: Number(event.target.value || 0) })}/></Field><button className="icon-danger" onClick={() => removeScenarioEvent(entry.id)}><Trash2 size={17}/></button></div>)}</div></div>
        </div>
        <div className="timeline-table-wrap"><table className="timeline-table"><thead><tr><th>Jahr</th><th>Einkommen / Monat</th><th>Übrige Kosten</th><th>Kreditrate</th><th>Wohnnebenkosten</th><th>Sonderzahlung</th><th>Puffer / Monat</th></tr></thead><tbody>{summary.affordability.timeline.map(row => <tr key={row.year} className={row.buffer < 0 ? 'critical' : row.buffer < 500 ? 'tight' : ''}><td>{row.year}</td><td>{euro(row.income)}</td><td>{euro(row.livingCosts)}</td><td>{euro(row.creditRate)}</td><td>{euro(row.runningHousingCosts)}</td><td>{euro(row.specialPayments)}</td><td><b>{euro(row.buffer)}</b></td></tr>)}</tbody></table></div>
        <p className="calculation-note">Die Kreditrate wird automatisch aus dem Tilgungsplan übernommen und berücksichtigt KfW-Anlaufjahre, jährliche Tilgungssteigerungen und Sonderzahlungen. Sonderzahlungen werden für die Machbarkeit auf zwölf Monate des jeweiligen Jahres verteilt.</p>
      </Panel>

      <Panel title="Restschuldentwicklung" subtitle="Bank- und KfW-Darlehen zusammen" className="span-12">
        <div className="repayment-insights">
          <div><CalendarClock size={20}/><span>Vollständig getilgt</span><b>{durationLabel(summary.payoffMonths)}</b></div>
          <div><TrendingDown size={20}/><span>Gesamte Zinskosten</span><b>{euro(summary.totalInterest)}</b></div>
          <div><Landmark size={20}/><span>Restschuld nach {number(project.bank.fixedYears)} Jahren</span><b>{euro(summary.residualAtFixed)}</b></div>
        </div>
        <ResidualChart rows={summary.annualSchedule} initial={summary.financingNeed}/>
      </Panel>

      <Panel title="Jährlicher Tilgungsplan" subtitle="Rate, Zins, Tilgung und Restschuld für jedes Finanzierungsjahr" className="span-12">
        <div className="table-scroll repayment-table-wrap">
          <table className="repayment-table">
            <thead><tr><th>Jahr</th><th>Kalenderjahr</th><th>Ø Monatszahlung</th><th>Gesamtzahlungen</th><th>Zinsen</th><th>Reguläre Tilgung</th><th>Sondertilgung</th><th>Bank-Restschuld</th><th>KfW-Restschuld</th><th>Gesamt-Restschuld</th></tr></thead>
            <tbody>{summary.annualSchedule.map(row => <tr key={row.year}>
              <td><b>{row.year}</b></td><td>{row.calendarYear}</td><td>{euro(row.payment / 12)}</td><td>{euro(row.payment)}</td><td>{euro(row.interest)}</td><td>{euro(row.repayment)}</td><td>{euro(row.extraRepayment)}</td><td>{euro(row.bankBalance)}</td><td>{euro(row.kfwBalance)}</td><td><b>{euro(row.balance)}</b></td>
            </tr>)}</tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Notizen" subtitle="Besichtigung, Bankgespräch oder offene Punkte" className="span-12">
        <textarea rows="4" placeholder="Eigene Notizen zur Finanzierung …" value={project.notes} onChange={event => updateProject({ notes: event.target.value })}/>
      </Panel>
    </div>
  </>
}
