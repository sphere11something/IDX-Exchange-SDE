import { useState } from 'react'
import Shell from '../ui/Chrome.jsx'
import { usd } from '../utils/format.js'

export default function MortgagePage() {
  const [price, setPrice] = useState(800000)
  const [downPct, setDownPct] = useState(20)
  const [rate, setRate] = useState(6.5)
  const [years, setYears] = useState(30)

  const down = price * (downPct / 100)
  const loan = price - down
  const monthlyRate = rate / 1200
  const months = years * 12
  const payment = monthlyRate
    ? (loan * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months))
    : loan / months
  const total = (payment || 0) * months

  const fields = [
    ['Home price', price, setPrice, { type: 'number', min: 0, step: 1000 }],
    ['Down payment (%)', downPct, setDownPct, { type: 'number', min: 0, max: 100, step: 1 }],
    ['Interest rate (%)', rate, setRate, { type: 'number', min: 0, step: 0.01 }],
  ]

  return (
    <Shell>
      <div className="calc">
        <div>
          <h1>What will it cost each month?</h1>
          <p className="calc__note" style={{ margin: '12px 0 24px' }}>
            Principal and interest only. Taxes, insurance and HOA dues are not included.
          </p>
          <div className="calc__form">
            {fields.map(([label, value, setValue, attrs]) => (
              <label key={label}>
                <span className="label">{label}</span>
                <input
                  className="field num"
                  value={value}
                  onChange={(e) => setValue(+e.target.value)}
                  {...attrs}
                />
              </label>
            ))}
            <label>
              <span className="label">Loan term</span>
              <select className="select" value={years} onChange={(e) => setYears(+e.target.value)}>
                <option value={30}>30 years</option>
                <option value={20}>20 years</option>
                <option value={15}>15 years</option>
              </select>
            </label>
          </div>
        </div>

        <div className="calc__out">
          <span className="calc__note">Estimated monthly payment</span>
          <div className="calc__figure num">
            {usd(Math.round(payment || 0))}
            <small>/mo</small>
          </div>
          <div className="calc__split num">
            <div>
              <span>Down payment</span>
              <b>{usd(Math.round(down))}</b>
            </div>
            <div>
              <span>Amount borrowed</span>
              <b>{usd(Math.round(loan))}</b>
            </div>
            <div>
              <span>Paid over {years} years</span>
              <b>{usd(Math.round(total))}</b>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  )
}
