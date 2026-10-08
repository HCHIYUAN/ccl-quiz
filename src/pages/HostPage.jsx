import React, { useMemo, useState } from 'react'
import { set, remove, serverTimestamp } from 'firebase/database'
import { r, HOST_PIN } from '../firebase'
import { QUESTIONS, TIEBREAK, GROUPS, OPTS, TIMER, isTb, qsetOf, tbEligible } from '../data/questions'
import { computeScores, distribution, awards } from '../lib/score'
import { useQuiz, useCountdown } from '../lib/useQuiz'

const LS = 'ccl-quiz-host'
const STAGES = [2, 6] // 第 3、7 題公布後顯示階段排名

export default function HostPage() {
  const [authed, setAuthed] = useState(() => localStorage.getItem(LS) === HOST_PIN)
  const [pin, setPin] = useState('')
  const [err, setErr] = useState(false)
  if (!authed) return (
    <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 20 }}>
      <div className="card" style={{ padding: 28, width: 320, textAlign: 'center' }}>
        <div style={{ fontSize: 44 }}>🎛️</div>
        <div style={{ fontWeight: 900, fontSize: 20, margin: '6px 0 16px' }}>主持人控制台</div>
        <input type="password" inputMode="numeric" value={pin} autoFocus onChange={(e) => setPin(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && go()} placeholder="PIN"
          style={{ width: '100%', padding: 14, fontSize: 24, textAlign: 'center', letterSpacing: '.3em', borderRadius: 14, border: `2px solid ${err ? 'var(--bad)' : 'var(--line)'}`, outline: 'none' }} />
        {err && <div style={{ color: 'var(--bad)', marginTop: 8 }}>PIN 錯誤</div>}
        <button onClick={go} style={{ width: '100%', marginTop: 14, padding: 14, borderRadius: 14, background: 'var(--accent)', color: '#fff', fontWeight: 800, fontSize: 16 }}>進入</button>
      </div>
    </div>
  )
  function go() {
    if (pin === HOST_PIN) { localStorage.setItem(LS, pin); setAuthed(true) } else { setErr(true); setPin('') }
  }
  return <Console />
}

function Console() {
  const { game, players, answers, tbAnswers, offset } = useQuiz()
  const left = useCountdown(game, offset)
  const [tab, setTab] = useState('control')
  const state = game?.state ?? 'waiting'
  const qi = game?.currentQ ?? 0
  const tb = isTb(game)
  const QS = qsetOf(game)
  const q = QS[qi]
  const tbGroups = game?.tbGroups || []
  const tbPlayers = game?.tbPlayers || []
  const hasTb = tbGroups.length + tbPlayers.length > 0
  const allP = Object.entries(players || {}).filter(([, p]) => p)
  const plist = tb ? allP.filter(([id, p]) => tbEligible(game, id, p)) : allP
  const curAns = tb ? tbAnswers : answers
  const row = curAns?.[qi] || {}
  const scores = useMemo(() => computeScores(players, answers, QUESTIONS.length - 1,
    hasTb ? { answers: tbAnswers, groups: tbGroups } : null), [players, answers, tbAnswers, tbGroups.join(), hasTb])
  const base = useMemo(() => computeScores(players, answers), [players, answers])
  const aw = awards(base)
  const awFinal = awards(scores, !!game?.tbDone)
  const isLast = qi >= QS.length - 1

  const setGame = (g) => set(r('game'), g)
  const startQ = (i) => setGame({ state: 'question', currentQ: i, startTime: serverTimestamp(), mode: 'main' })
  const startTb = (i, groups, pids) => setGame({ state: 'question', currentQ: i, startTime: serverTimestamp(), mode: 'tb', tbGroups: groups, tbPlayers: pids })
  async function beginTb() {
    const gs = aw.needGroupTb ? aw.topGroups.map((g) => g.id) : []
    const ps = aw.needIndivTb ? aw.contenders.map((p) => p.pid) : []
    if (!gs.length && !ps.length) return alert('目前不需要加賽')
    if (!confirm('開始 3 題加賽？')) return
    await remove(r('tbAnswers')); await startTb(0, gs, ps)
  }
  const finishTb = () => setGame({ state: 'final', currentQ: QUESTIONS.length - 1, mode: 'main', tbGroups, tbPlayers, tbDone: true })
  const reveal = () => setGame({ ...game, state: 'reveal' })
  const board = () => setGame({ ...game, state: 'leaderboard' })
  const final = () => setGame({ ...game, state: 'final' })
  async function reset() {
    if (!confirm('確定重置？所有玩家與作答紀錄都會清除。')) return
    await remove(r('answers')); await remove(r('tbAnswers')); await remove(r('players'))
    await setGame({ state: 'waiting', currentQ: 0 })
  }
  async function resetAnswersOnly() {
    if (!confirm('保留已加入的玩家，只清除作答並回到等待畫面？')) return
    await remove(r('answers')); await remove(r('tbAnswers')); await setGame({ state: 'waiting', currentQ: 0 })
  }
  const kick = (id, name) => confirm(`移除「${name}」？`) && remove(r(`players/${id}`))

  function exportCsv() {
    const head = ['排名', '姓名', '組別', '總分', '答對題數', ...QUESTIONS.map((_, i) => `Q${i + 1}`)]
    const lines = scores.ranking.map((p) => [p.rank, p.name, GROUPS.find((x) => x.id === p.group)?.name, p.score, p.correct,
      ...QUESTIONS.map((qq, i) => { const a = answers?.[i]?.[p.pid]; return a ? (a.choice === qq.ans ? 'O' : OPTS[a.choice].label) : '-' })])
    const g = ['名次', '小組', '人數', '平均', '加賽平均']
    const glines = scores.groups.map((x) => [x.rank, x.name, x.count, x.avg, x.tbAvg ?? ''])
    const csv = '﻿' + [head, ...lines, [], g, ...glines].map((l) => l.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `CCL測驗成績_${new Date().toISOString().slice(0, 10)}.csv`; a.click()
  }

  // 下一步主按鈕
  let main = null
  if (tb && state === 'question') main = { t: left > 0 ? `📣 提前公布答案（剩 ${Math.ceil(left)} 秒）` : '📣 公布答案', f: reveal, c: left > 0 ? '#F2B632' : 'var(--ok)' }
  else if (tb && state === 'reveal') main = isLast ? { t: '🏆 公布加賽後最終成績', f: finishTb, c: 'var(--accent)' } : { t: `⚔️ 加賽下一題（第 ${qi + 2} 題）`, f: () => startTb(qi + 1, tbGroups, tbPlayers), c: '#EF7A6A' }
  else if (state === 'waiting') main = { t: `▶ 開始第 1 題（${plist.length} 人）`, f: () => startQ(0), c: 'var(--ok)' }
  else if (state === 'question') main = { t: left > 0 ? `📣 提前公布答案（剩 ${Math.ceil(left)} 秒）` : '📣 公布答案', f: reveal, c: left > 0 ? '#F2B632' : 'var(--ok)' }
  else if (state === 'reveal' && STAGES.includes(qi)) main = { t: `📊 公布${qi === 2 ? '第一' : '第二'}階段排名（個人＋團體）`, f: board, c: 'var(--accent)' }
  else if (state === 'reveal') main = isLast ? { t: '🏆 公布最終成績', f: final, c: 'var(--accent)' } : { t: `▶ 下一題（第 ${qi + 2} 題）`, f: () => startQ(qi + 1), c: 'var(--ok)' }
  else if (state === 'leaderboard') main = isLast ? { t: '🏆 公布最終成績', f: final, c: 'var(--accent)' } : { t: `▶ 下一題（第 ${qi + 2} 題）`, f: () => startQ(qi + 1), c: 'var(--ok)' }

  const label = tb ? `⚔️ 加賽第 ${qi + 1} 題${state === 'question' ? '作答中' : '已公布'}` : { waiting: '⏳ 等待加入', question: `🟢 第 ${qi + 1} 題作答中`, reveal: `📣 第 ${qi + 1} 題已公布`, leaderboard: `📊 第 ${qi + 1} 題後階段排名`, final: '🏆 最終成績' }[state]
  const d = distribution(curAns, qi)

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '16px 14px 40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><div style={{ fontWeight: 900, fontSize: 20 }}>🎛️ 主持人控制台</div>
          <div style={{ color: 'var(--body)', fontSize: 14 }}>{plist.length} 人加入・大螢幕請開 <b>/board</b></div></div>
        <span className="pill" style={{ background: '#fff' }}>{label}</span>
      </div>

      <div style={{ display: 'flex', gap: 8, margin: '14px 0' }}>
        {[['control', '控制'], ['people', '個人成績'], ['stats', '題目分析']].map(([k, t]) => (
          <button key={k} onClick={() => setTab(k)} className="pill" style={{ background: tab === k ? 'var(--ink)' : '#fff', color: tab === k ? '#fff' : 'var(--ink)' }}>{t}</button>
        ))}
      </div>

      {tab === 'control' && <>
        {main && <button onClick={main.f} style={{ width: '100%', padding: '20px 16px', borderRadius: 20, background: main.c, color: '#fff', fontWeight: 900, fontSize: 20, boxShadow: '0 6px 18px rgba(0,0,0,.12)' }}>{main.t}</button>}
        {(state === 'reveal' && !tb && !STAGES.includes(qi) && !isLast) && <button onClick={board} style={{ width: '100%', marginTop: 10, padding: 14, borderRadius: 16, background: '#fff', fontWeight: 800, fontSize: 16 }}>📊 大螢幕顯示小組排行</button>}
        {state === 'final' && <div className="card" style={{ padding: 16, textAlign: 'center', fontWeight: 800 }}>測驗結束 🎉 可到「個人成績」匯出 CSV</div>}
        {state === 'final' && (
          <div className="card" style={{ padding: 16, marginTop: 12, background: !game.tbDone && aw.needTb ? '#FFF1EE' : '#fff' }}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>🎁 得獎名單</div>
            <div style={{ fontSize: 15, lineHeight: 1.7 }}>
              <div>👑 團體賽冠軍：{awFinal.groupWinner ? <b>{awFinal.groupWinner.name}（平均 {awFinal.groupWinner.avg}）</b>
                : <span style={{ color: 'var(--bad)' }}>同分 {aw.topGroups.map((g) => g.name).join('、')}（{aw.topGroups[0]?.avg}）→ 需加賽</span>}</div>
              <div>⭐ 個人賽前三：{awFinal.indiv.map((p) => `${p.name}（${p.score}）`).join('、') || '—'}</div>
              {aw.needIndivTb && !game.tbDone && <div style={{ color: 'var(--bad)' }}>
                {aw.cutoff} 分同分 {aw.contenders.length} 人爭 {aw.slots} 個名額：{aw.contenders.map((p) => p.name).join('、')} → 需加賽</div>}
            </div>
            {!game.tbDone && aw.needTb && <button onClick={beginTb} style={{ width: '100%', marginTop: 12, padding: 14, borderRadius: 14, background: '#EF7A6A', color: '#fff', fontWeight: 900, fontSize: 17 }}>⚔️ 開始加賽（3 題）</button>}
            {!aw.needTb && <div style={{ color: 'var(--ok)', fontWeight: 700, marginTop: 6 }}>✓ 不需要加賽</div>}
          </div>
        )}

        {q && state !== 'waiting' && state !== 'final' && (
          <div className="card" style={{ padding: 18, marginTop: 14 }}>
            <div style={{ color: 'var(--muted)', fontWeight: 700, fontSize: 14 }}>{tb ? '⚔️ 加賽' : ''}第 {qi + 1} / {QS.length} 題・{q.cat}{state === 'question' && `・⏱ ${Math.ceil(left)} 秒`}</div>
            <div style={{ fontWeight: 800, fontSize: 18, margin: '6px 0 12px' }}>{q.q}</div>
            {q.opts.map((o, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 12, marginBottom: 6,
                background: i === q.ans ? 'var(--ok-soft)' : '#FBF7F2', fontWeight: i === q.ans ? 800 : 500 }}>
                <span>{OPTS[i].label}. {o} {i === q.ans && '✓'}</span><span className="num">{d[i]}</span>
              </div>
            ))}
            <div style={{ color: 'var(--body)', fontSize: 14, marginTop: 8 }}>💡 {q.exp}</div>
          </div>
        )}

        <div className="card" style={{ padding: 16, marginTop: 14 }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>本題作答：{Object.keys(row).length} / {plist.length}</div>
          {GROUPS.filter((g) => !tb || plist.some(([, p]) => p.group === g.id)).map((g) => {
            const m = plist.filter(([, p]) => p.group === g.id)
            return (
              <div key={g.id} style={{ marginBottom: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{g.emoji} {g.name}（{m.length}）</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {m.map(([id, p]) => {
                    const a = row[id]
                    const ok = a && q && a.choice === q.ans
                    const bg = !a ? '#F3EEE8' : state === 'question' ? g.soft : ok ? 'var(--ok-soft)' : 'var(--bad-soft)'
                    return <span key={id} className="pill" style={{ background: bg, fontSize: 13, padding: '4px 10px', opacity: a ? 1 : .6 }}>{p.name}{a && state !== 'question' ? (ok ? ' ✓' : ' ✗') : a ? ' ●' : ''}</span>
                  })}
                </div>
              </div>
            )
          })}
        </div>

        <div className="card" style={{ padding: 16, marginTop: 14 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>跳題 / 重來</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {QUESTIONS.map((_, i) => (
              <button key={i} onClick={() => confirm(`直接開始第 ${i + 1} 題？`) && startQ(i)} className="pill num" style={{ background: i === qi ? 'var(--ink)' : '#F3EEE8', color: i === qi ? '#fff' : 'var(--ink)' }}>Q{i + 1}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button onClick={resetAnswersOnly} style={{ flex: 1, padding: 12, borderRadius: 12, background: '#FDF0CC', fontWeight: 700 }}>🔁 保留玩家重來</button>
            <button onClick={reset} style={{ flex: 1, padding: 12, borderRadius: 12, background: 'var(--bad-soft)', color: '#B4473A', fontWeight: 700 }}>🗑 全部重置</button>
          </div>
        </div>
      </>}

      {tab === 'people' && <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginBottom: 12 }}>
          {scores.groups.map((g) => (
            <div key={g.id} className="card" style={{ padding: 12, background: g.soft, textAlign: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>{g.emoji} {g.name}</div>
              <div className="num" style={{ fontSize: 26, fontWeight: 800 }}>{g.avg}</div>
              <div style={{ fontSize: 12, color: 'var(--body)' }}>{g.count} 人・第 {g.rank} 名{g.tbAvg != null ? `・加賽 ${g.tbAvg}` : ''}</div>
            </div>
          ))}
        </div>
        <button onClick={exportCsv} style={{ width: '100%', padding: 12, borderRadius: 14, background: 'var(--accent)', color: '#fff', fontWeight: 800, marginBottom: 12 }}>⬇ 匯出成績 CSV</button>
        <div className="card" style={{ padding: 8 }}>
          {scores.ranking.map((p) => {
            const g = GROUPS.find((x) => x.id === p.group)
            return (
              <div key={p.pid} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderBottom: '1px solid var(--line)' }}>
                <span className="num" style={{ width: 28, color: 'var(--muted)', fontWeight: 800 }}>{p.rank}</span>
                <span style={{ flex: 1, fontWeight: 700 }}>{p.name} <span className="pill" style={{ background: g?.soft, fontSize: 12, padding: '2px 8px' }}>{g?.name}</span></span>
                <span style={{ color: 'var(--body)', fontSize: 13 }}>答對 {p.correct}</span>
                <span className="num" style={{ width: 40, textAlign: 'right', fontWeight: 800, fontSize: 18 }}>{p.score}</span>
                <button onClick={() => kick(p.pid, p.name)} title="移除" style={{ background: 'transparent', color: 'var(--muted)', fontSize: 16 }}>✕</button>
              </div>
            )
          })}
          {!scores.ranking.length && <div style={{ padding: 16, color: 'var(--muted)', textAlign: 'center' }}>尚無玩家</div>}
        </div>
      </>}

      {tab === 'stats' && (
        <div className="card" style={{ padding: 12 }}>
          {QUESTIONS.map((qq, i) => {
            const dd = distribution(answers, i); const n = dd.reduce((a, b) => a + b, 0)
            const rate = n ? Math.round((dd[qq.ans] / n) * 100) : null
            return (
              <div key={i} style={{ padding: '10px 6px', borderBottom: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>Q{i + 1}. {qq.q}</span>
                  <span className="num" style={{ fontWeight: 800, color: rate == null ? 'var(--muted)' : rate >= 70 ? 'var(--ok)' : rate >= 40 ? '#C9921C' : 'var(--bad)' }}>{rate == null ? '—' : `${rate}%`}</span>
                </div>
                {n > 0 && <div style={{ display: 'flex', height: 10, borderRadius: 6, overflow: 'hidden', marginTop: 6 }}>
                  {dd.map((v, k) => v ? <div key={k} style={{ width: `${(v / n) * 100}%`, background: k === qq.ans ? 'var(--ok)' : OPTS[k].color + '88' }} /> : null)}
                </div>}
              </div>
            )
          })}
          <div style={{ fontSize: 12, color: 'var(--muted)', padding: 8 }}>綠色＝答對比例；答對率低的題目，可以在簡報對應頁多講一點。</div>
        </div>
      )}
    </div>
  )
}
