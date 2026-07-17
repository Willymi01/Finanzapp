export const defaultState = {
  schemaVersion: 8,
  project: {
    start: '2026-07-01',
    target: '2031-07-01',
    goal: 90000,
    purchasePrice: 450000,
    ancillaryRate: 0.10,
    furnishing: 20000,
    emergencyTarget: 10000,
  },
  assumptions: {
    salaryGrowth: 0.05,
    investmentReturn: 0.05,
    pensionGrowth: 0.015,
    kfw: 150000,
    kfwInterest: 0.025,
    kfwRepayment: 0.02,
    bankInterest: 0.035,
    bankRepayment: 0.02,
    ownerCosts: 250,
    maintenance: 100,
  },
  assets: { home: 5000, pension: 15000, emergency: 0 },
  budget: {
    income: [{ id: crypto.randomUUID(), name: 'Nettoeinkommen', amount: 3300 }],
    fixed: [
      ['Warmmiete',1,910],['Private Rente',1,109.15],['Hausrat',1,8.26],
      ['Fitnessstudio',1,63],['Autokredit',1,468.52],['GEZ',3,55.08],
      ['Strom',1,75],['Handy',1,16.98],['Kabel/Internet',1,44.98],
      ['Kfz-Versicherung',3,296.32],['Kfz-Steuer',12,109],
      ['Haftpflicht',12,59.32],['Zahnreinigung',6,100],
      ['Heizkosten-Rücklage',12,400],['Auto-Inspektion',14,700]
    ].map(([name,factor,cost]) => ({ id: crypto.randomUUID(), name, factor, cost })),
    variable: [
      ['Lebensmittel',400],['Benzin',180],['Lotto',85],['Freizeit',200]
    ].map(([name,amount]) => ({ id: crypto.randomUUID(), name, amount })),
    annualIncome: [{ id: crypto.randomUUID(), name: 'Weihnachts-/Urlaubsgeld (Wohnungsanteil)', amount: 1500 }],
    annualExpense: [],
  },
  monthlySavings: [
    Array(12).fill(300), Array(12).fill(450), Array(12).fill(600),
    Array(12).fill(750), Array(12).fill(900),
  ],
  snapshots: [],
  specialPayments: [],
  properties: [],
  documents: [],
  purchaseJourney: {
    equityPrepared: false,
    financingConfirmed: false,
    propertyFound: false,
    documentsChecked: false,
    contractSigned: false,
    keysReceived: false,
    notes: ''
  },
  security: { pinHash: '' },
  meta: { updatedAt: null, createdAt: new Date().toISOString() },
}
