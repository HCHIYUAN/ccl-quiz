import React from 'react'
import { GROUPS } from '../data/questions'

export function Blobs() {
  return (<>
    <div className="blob" style={{ width: 360, height: 360, background: '#FFD9C9', top: -120, left: -100 }} />
    <div className="blob" style={{ width: 300, height: 300, background: '#D6F1E6', bottom: -80, right: -60 }} />
    <div className="blob" style={{ width: 240, height: 240, background: '#E3DCFB', top: '40%', right: '30%' }} />
  </>)
}

export function Confetti({ n = 40 }) {
  const cols = ['#FF8C7A', '#4FC3A1', '#6BAEF0', '#F2B632', '#A98BEF']
  return (<>{Array.from({ length: n }, (_, i) => (
    <div key={i} className="confetti" style={{ left: `${(i * 37) % 100}%`, background: cols[i % cols.length],
      animationDuration: `${4 + (i % 5)}s`, animationDelay: `${(i % 9) * 0.4}s` }} />
  ))}</>)
}

export const groupOf = (id) => GROUPS.find((g) => g.id === id) || GROUPS[0]

export function TimerRing({ left, total, size = 120, stroke = 12 }) {
  const rr = (size - stroke) / 2, c = 2 * Math.PI * rr, pct = Math.max(0, left / total)
  const col = left > total * 0.5 ? '#4FC3A1' : left > total * 0.25 ? '#F2B632' : '#EF7A6A'
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={rr} fill="none" stroke="#F3EADF" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={rr} fill="none" stroke={col} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - pct)} style={{ transition: 'stroke-dashoffset .2s linear, stroke .3s' }} />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" className="num"
        style={{ transform: 'rotate(90deg)', transformOrigin: 'center', fontSize: size * 0.36, fontWeight: 800, fill: '#3B3A4A' }}>
        {Math.ceil(left)}
      </text>
    </svg>
  )
}
