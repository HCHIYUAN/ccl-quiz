import React, { useEffect, useMemo, useState } from 'react'
import { push, set, get } from 'firebase/database'
import { r } from '../firebase'
import { QUESTIONS, GROUPS, OPTS, TIMER, levelOf } from '../data/questions'
import { computeScores } from '../lib/score'
import { useQuiz, useCountdown } from '../lib/useQuiz'
import { Blobs, Confetti, groupOf } from '../lib/ui'

const LS = 'ccl-quiz-pid'
const DEMO = new URLSearchParams(window.location.search).get('demo')

export default function PlayerPage() {
  const { game, players, answers, offset } = useQuiz()
  const left = useCountdown(game, offset)
  const [pid, setPid] = useState(() => (DEMO ? (DEMO === 'join' ? '' : 'p1') : localStorage.getItem(LS) || ''))
  const [name, setName] = useState('')
  const [group, setGroup] = useState(0)
  const [busy, setBusy] = useState(false)

  const me = pid ? players[pid] : null
  // 主持人重置後，舊 pid 失效
  useEffect(() => {
    if (DEMO || !pid || players[pid]) return
    get(r(`players/${pid}`)).then((s) => { if (!s.exists()) { localStorage.removeItem(LS); setPid('') } })
  }, [pid, players])

  const qi = game?.currentQ ?? 0
  const q = QUESTIONS[qi]
  const myAns = pid ? answers?.[qi]?.[pid] : null
  const scores = useMemo(() => {
    const upto = game?.state === 'question' ? qi - 1 : qi
    return computeScores(players, answers, upto)
  }, [players, answers, qi, game?.state])
  const mine = scores.byPlayer[pid]

  async function join() {
    if (!name.trim() || !group || busy) return
    setBusy(true)
    const ref = push(r('players'))
    await set(ref, { name: name.trim().slice(0, 12), group, joinedAt: Date.now() })
    localStorage.setItem(LS, ref.key)
    setPid(ref.key)
    setBusy(false)
  }

  async function answer(i) {
    if (myAns || left <= 0 || game?.state !== 'question') return
    const ms = Math.max(0, Math.round(Date.now() + offset - game.startTime))
    await set(r(`answers/${qi}/${pid}`), { choice: i, ms })
  }

  const shell = (children, bg) => (
    <div style={{ minHeight: '100dvh', background: bg || 'var(--bg)', overflow: 'hidden' }}>
      <Blobs />
      <div className="wrap" style={{ maxWidth: 480, margin: '0 auto', padding: '20px 18px 32px' }}>{children}</div>
    </div>
  )

  if (game === undefined) return shell(<Center>連線中…</Center>)

  // ── 加入 ──
  if (!me) return shell(<>
    <div style={{ textAlign: 'center', marginTop: 18 }}>
      <div className="floaty" style={{ fontSize: 56 }}>🧪</div>
      <h1 style={{ fontSize: 28, fontWeight: 900, margin: '6px 0 4px' }}>CCL 知識小測驗</h1>
      <div style={{ color: 'var(--body)' }}>10 題 · 每題 10 分 · 滿分 100</div>
    </div>
    <div className="card" style={{ padding: 22, marginTop: 22 }}>
      <label style={{ fontWeight: 700 }}>你的名字</label>
      <input value={name} onChange={(e) => setName(e.target.value)} maxLength={12} placeholder="輸入姓名"
        style={{ width: '100%', marginTop: 8, padding: '14px 16px', fontSize: 18, borderRadius: 14, border: '2px solid var(--line)', outline: 'none', background: '#FFFCF8' }} />
      <div style={{ fontWeight: 700, margin: '18px 0 10px' }}>選擇組別</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {GROUPS.map((g) => (
          <button key={g.id} onClick={() => setGroup(g.id)}
            style={{ padding: '16px 8px', borderRadius: 18, background: group === g.id ? g.color : g.soft,
              color: group === g.id ? '#fff' : 'var(--ink)', fontWeight: 800, fontSize: 17,
              boxShadow: group === g.id ? `0 6px 16px ${g.color}66` : 'none', transition: 'all .2s' }}>
            <div style={{ fontSize: 26 }}>{g.emoji}</div>{g.name}<div style={{ fontSize: 13, fontWeight: 500, opacity: .85 }}>{g.nick}</div>
          </button>
        ))}
      </div>
      <button onClick={join} disabled={!name.trim() || !group || busy}
        style={{ width: '100%', marginTop: 20, padding: 16, borderRadius: 16, fontSize: 18, fontWeight: 800, color: '#fff',
          background: name.trim() && group ? 'var(--accent)' : '#CFCBE0' }}>
        {busy ? '加入中…' : '加入測驗'}
      </button>
    </div>
  </>)

  const g = groupOf(me.group)
  const header = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
      <span className="pill" style={{ background: g.soft, color: 'var(--ink)' }}>{g.emoji} {g.name}・{me.name}</span>
      <span className="pill num" style={{ background: '#fff', fontSize: 16 }}>{mine?.score ?? 0} 分</span>
    </div>
  )
  const state = game.state

  // ── 等待開始 ──
  if (state === 'waiting') return shell(<>
    {header}
    <Center>
      <div className="floaty" style={{ fontSize: 64 }}>{g.emoji}</div>
      <div style={{ fontSize: 22, fontWeight: 800, marginTop: 10 }}>已加入，等待主持人開始</div>
      <div style={{ color: 'var(--body)', marginTop: 8 }}>請看大螢幕 👀</div>
    </Center>
  </>)

  // ── 作答中 ──
  if (state === 'question' && q) {
    const timeUp = left <= 0
    return shell(<>
      {header}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span className="pill" style={{ background: '#fff' }}>第 {qi + 1} / {QUESTIONS.length} 題</span>
        <span className="pill num" style={{ background: timeUp ? 'var(--bad-soft)' : '#fff', fontSize: 18 }}>⏱ {Math.ceil(left)}</span>
      </div>
      <div style={{ height: 8, background: '#F3EADF', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ height: '100%', width: `${(left / TIMER) * 100}%`, background: left > TIMER / 2 ? '#4FC3A1' : left > TIMER / 4 ? '#F2B632' : '#EF7A6A', transition: 'width .2s linear' }} />
      </div>
      <div className="card" style={{ padding: '18px 18px', fontSize: 19, fontWeight: 700, lineHeight: 1.5, marginBottom: 16 }}>{q.q}</div>
      {myAns ? (
        <Center small>
          <div className="pop" style={{ fontSize: 52 }}>✅</div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>已作答：{OPTS[myAns.choice].label}. {q.opts[myAns.choice]}</div>
          <div style={{ color: 'var(--body)', marginTop: 6 }}>等待公布答案…</div>
        </Center>
      ) : timeUp ? (
        <Center small><div style={{ fontSize: 48 }}>⌛</div><div style={{ fontSize: 20, fontWeight: 800 }}>時間到</div></Center>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {q.opts.map((o, i) => (
            <button key={i} onClick={() => answer(i)}
              style={{ display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', padding: '16px 16px', borderRadius: 18,
                background: OPTS[i].soft, color: 'var(--ink)', fontSize: 17, fontWeight: 700, border: `2px solid ${OPTS[i].color}55` }}>
              <span className="num" style={{ flex: '0 0 40px', height: 40, borderRadius: 12, background: OPTS[i].color, color: '#fff',
                display: 'grid', placeItems: 'center', fontSize: 22 }}>{OPTS[i].label}</span>{o}
            </button>
          ))}
        </div>
      )}
    </>)
  }

  // ── 公布答案 / 中場排行 ──
  if ((state === 'reveal' || state === 'leaderboard') && q) {
    const ok = myAns && myAns.choice === q.ans
    return shell(<>
      {header}
      <Center small>
        <div className="pop" style={{ fontSize: 64 }}>{!myAns ? '😶' : ok ? '🎉' : '💪'}</div>
        <div style={{ fontSize: 24, fontWeight: 900, color: !myAns ? 'var(--body)' : ok ? 'var(--ok)' : 'var(--bad)' }}>
          {!myAns ? '這題沒有作答' : ok ? '答對了！+10 分' : '可惜，答錯了'}
        </div>
      </Center>
      <div className="card" style={{ padding: 18, marginTop: 8 }}>
        <div style={{ color: 'var(--muted)', fontWeight: 700, fontSize: 14 }}>第 {qi + 1} 題・正確答案</div>
        <div style={{ fontSize: 18, fontWeight: 800, margin: '6px 0 10px', color: 'var(--ok)' }}>{OPTS[q.ans].label}. {q.opts[q.ans]}</div>
        <div style={{ color: 'var(--body)', lineHeight: 1.6 }}>{q.exp}</div>
      </div>
      <div style={{ textAlign: 'center', marginTop: 16, color: 'var(--body)' }}>
        目前 <b className="num" style={{ fontSize: 22, color: 'var(--ink)' }}>{mine?.score ?? 0}</b> 分・個人第 <b className="num">{mine?.rank ?? '-'}</b> 名
      </div>
    </>)
  }

  // ── 最終結果 ──
  if (state === 'final') {
    const lv = levelOf(mine?.score ?? 0)
    const gr = scores.groups.find((x) => x.id === me.group)
    return shell(<>
      <Confetti n={24} />
      {header}
      <div className="card pop" style={{ padding: 26, textAlign: 'center' }}>
        <div style={{ fontSize: 60 }}>{lv.e}</div>
        <div style={{ color: 'var(--body)', fontWeight: 700 }}>你的成績</div>
        <div className="num" style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.1 }}>{mine?.score ?? 0}<span style={{ fontSize: 24 }}> / 100</span></div>
        <div className="pill" style={{ background: g.soft, marginTop: 8, fontSize: 16 }}>{lv.t}</div>
        <div style={{ marginTop: 16, color: 'var(--body)' }}>答對 {mine?.correct ?? 0} 題・個人第 {mine?.rank ?? '-'} 名（共 {scores.ranking.length} 人）</div>
      </div>
      {gr && <div className="card" style={{ padding: 18, marginTop: 14, textAlign: 'center', background: g.soft }}>
        <div style={{ fontWeight: 800 }}>{g.emoji} {g.name} 平均 <span className="num" style={{ fontSize: 26 }}>{gr.avg}</span> 分</div>
        <div style={{ color: 'var(--body)', marginTop: 4 }}>小組排名第 {gr.rank} 名</div>
      </div>}
    </>)
  }

  return shell(<>{header}<Center>請稍候…</Center></>)
}

function Center({ children, small }) {
  return <div style={{ textAlign: 'center', padding: small ? '18px 0' : '70px 0', color: 'var(--ink)' }}>{children}</div>
}
