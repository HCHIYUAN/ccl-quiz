import { QUESTIONS, GROUPS } from '../data/questions'

const entries = (o) => Object.entries(o || {}).filter(([, v]) => v != null)

// answers[qi][pid] = { choice, ms }
export function computeScores(players, answers, upto = QUESTIONS.length - 1) {
  const byPlayer = {}
  for (const [pid, p] of entries(players)) {
    byPlayer[pid] = { pid, name: p.name, group: p.group, score: 0, correct: 0, ms: 0, answered: 0 }
  }
  for (const [qk, row] of entries(answers)) {
    const qi = Number(qk)
    if (qi > upto || !QUESTIONS[qi]) continue
    for (const [pid, a] of entries(row)) {
      const p = byPlayer[pid]
      if (!p) continue
      p.answered += 1
      if (a.choice === QUESTIONS[qi].ans) {
        p.score += 10; p.correct += 1; p.ms += a.ms || 0
      }
    }
  }
  const ranking = Object.values(byPlayer).sort((a, b) => b.score - a.score || a.ms - b.ms)
  ranking.forEach((p, i) => { p.rank = i + 1 })
  const groups = GROUPS.map((g) => {
    const m = ranking.filter((p) => p.group === g.id)
    const total = m.reduce((s, p) => s + p.score, 0)
    const ms = m.reduce((s, p) => s + p.ms, 0)
    return { ...g, members: m, count: m.length, total,
      avg: m.length ? Math.round((total / m.length) * 10) / 10 : 0,
      avgMs: m.length ? ms / m.length : 0, best: m[0] }
  }).sort((a, b) => (b.count > 0) - (a.count > 0) || b.avg - a.avg || a.avgMs - b.avgMs)
  groups.forEach((g, i) => { g.rank = i + 1 })
  return { byPlayer, ranking, groups }
}

export function distribution(answers, qi) {
  const d = [0, 0, 0, 0]
  for (const [, a] of entries(answers?.[qi])) if (a.choice >= 0 && a.choice < 4) d[a.choice] += 1
  return d
}
