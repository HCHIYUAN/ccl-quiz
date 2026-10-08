import { QUESTIONS, TIEBREAK, GROUPS } from '../data/questions'

const entries = (o) => Object.entries(o || {}).filter(([, v]) => v != null)

function tally(players, answers, qs, upto) {
  const out = {}
  for (const [pid] of entries(players)) out[pid] = { score: 0, correct: 0, ms: 0, answered: 0 }
  for (const [qk, row] of entries(answers)) {
    const qi = Number(qk)
    if (qi > upto || !qs[qi]) continue
    for (const [pid, a] of entries(row)) {
      const p = out[pid]
      if (!p) continue
      p.answered += 1
      if (a.choice === qs[qi].ans) { p.score += 10; p.correct += 1; p.ms += a.ms || 0 }
    }
  }
  return out
}

// answers[qi][pid] = { choice, ms }；小組成績＝組員平均；同分時先比加賽平均，再比平均作答時間
export function computeScores(players, answers, upto = QUESTIONS.length - 1, tb = null) {
  const main = tally(players, answers, QUESTIONS, upto)
  const tbt = tb ? tally(players, tb.answers, TIEBREAK, tb.upto ?? TIEBREAK.length - 1) : null
  const byPlayer = {}
  for (const [pid, p] of entries(players)) {
    byPlayer[pid] = { pid, name: p.name, group: p.group, ...main[pid], tb: tbt ? tbt[pid].score : 0 }
  }
  const ranking = Object.values(byPlayer).sort((a, b) => b.score - a.score || a.ms - b.ms)
  ranking.forEach((p, i) => { p.rank = i + 1 })
  const tbGroups = tb?.groups || []
  const groups = GROUPS.map((g) => {
    const m = ranking.filter((p) => p.group === g.id)
    const n = m.length
    const sum = (k) => m.reduce((s, p) => s + p[k], 0)
    const inTb = tbGroups.includes(g.id)
    return { ...g, members: m, count: n, total: sum('score'),
      avg: n ? Math.round((sum('score') / n) * 10) / 10 : 0,
      avgMs: n ? sum('ms') / n : 0, inTb,
      tbAvg: inTb && n ? Math.round((sum('tb') / n) * 10) / 10 : null, best: m[0] }
  }).sort((a, b) => (b.count > 0) - (a.count > 0) || b.avg - a.avg
    || ((a.inTb && b.inTb) ? (b.tbAvg - a.tbAvg) : 0) || a.avgMs - b.avgMs)
  groups.forEach((g, i) => { g.rank = i + 1 })
  return { byPlayer, ranking, groups }
}

// 平均分相同的組別（只看有人參加的組）
export function tiedSets(groups) {
  const gs = groups.filter((g) => g.count > 0)
  const by = {}
  gs.forEach((g) => { (by[g.avg] = by[g.avg] || []).push(g) })
  return Object.values(by).filter((s) => s.length > 1)
}

export function distribution(answers, qi) {
  const d = [0, 0, 0, 0]
  for (const [, a] of entries(answers?.[qi])) if (a.choice >= 0 && a.choice < 4) d[a.choice] += 1
  return d
}
