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
    byPlayer[pid] = { pid, name: p.name, group: p.group, ...main[pid], tb: tbt ? tbt[pid].score : 0, tbMs: tbt ? tbt[pid].ms : 0 }
  }
  const ranking = Object.values(byPlayer).sort((a, b) => b.score - a.score || a.ms - b.ms)
  // 個人名次：同分同名次
  ranking.forEach((p) => { p.rank = 1 + ranking.filter((x) => x.score > p.score).length })
  const tbGroups = tb?.groups || []
  const groups = GROUPS.map((g) => {
    const m = ranking.filter((p) => p.group === g.id)
    const n = m.length
    const sum = (k) => m.reduce((s, p) => s + p[k], 0)
    const inTb = tbGroups.includes(g.id)
    return { ...g, members: m, count: n, total: sum('score'),
      avg: n ? Math.round((sum('score') / n) * 10) / 10 : 0,
      avgMs: n ? sum('ms') / n : 0, inTb,
      tbAvg: inTb && n ? Math.round((sum('tb') / n) * 10) / 10 : null, tbMs: n ? sum('tbMs') / n : 0, best: m[0] }
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

// 獎項：團體賽只取第 1 名；個人賽取前 3 名（同分同獎），名額不夠才加賽
export function awards(scores, tbDone = false) {
  const R = scores.ranking
  const gs = scores.groups.filter((g) => g.count > 0)
  const topAvg = gs.length ? Math.max(...gs.map((g) => g.avg)) : 0
  const topGroups = gs.filter((g) => g.avg === topAvg)
  let groupWinner = topGroups.length === 1 ? topGroups[0] : null
  if (!groupWinner && tbDone && topGroups.length) {
    groupWinner = [...topGroups].sort((a, b) => (b.tbAvg ?? 0) - (a.tbAvg ?? 0) || a.tbMs - b.tbMs)[0]
  }
  const cutoff = R.length >= 3 ? R[2].score : R.length ? R[R.length - 1].score : 0
  const above = R.filter((p) => p.score > cutoff)
  const atCut = R.filter((p) => p.score === cutoff)
  const slots = Math.max(0, 3 - above.length)
  let indiv = [], contenders = []
  if (above.length + atCut.length <= 3) indiv = [...above, ...atCut]
  else {
    contenders = atCut
    indiv = tbDone ? [...above, ...[...atCut].sort((a, b) => b.tb - a.tb || a.tbMs - b.tbMs).slice(0, slots)] : above
  }
  return { topGroups, groupWinner, needGroupTb: topGroups.length > 1, indiv, contenders, slots, cutoff,
    needIndivTb: contenders.length > 0, needTb: topGroups.length > 1 || contenders.length > 0 }
}
