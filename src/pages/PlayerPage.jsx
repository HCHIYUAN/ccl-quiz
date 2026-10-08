import React, { useEffect, useMemo, useState } from 'react'
import { push, set, get } from 'firebase/database'
import { r } from '../firebase'
import { QUESTIONS, GROUPS, OPTS, TIMER, levelOf, isTb, qsetOf, ansKeyOf, tbEligible } from '../data/questions'
import { computeScores, awards } from '../lib/score'
import { useQuiz, useCountdown } from '../lib/useQuiz'
import { Blobs, Confetti, groupOf } from '../lib/ui'

const LS = 'ccl-quiz-pid'
const DEMO = new URLSearchParams(window.location.search).get('demo')

export default function PlayerPage() {
  const { game, players, answers, tbAnswers, offset } = useQuiz()
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
  const tb = isTb(game)
  const QS = qsetOf(game)
  const q = QS[qi]
  const rowAll = tb ? tbAnswers : answers
  const myAns = pid ? rowAll?.[qi]?.[pid] : null
  const tbGroups = game?.tbGroups || []
  const tbPlayers = game?.tbPlayers || []
  const hasTb = tbGroups.length + tbPlayers.length > 0
  const scores = useMemo(() => {
    const upto = tb ? QUESTIONS.length - 1 : game?.state === 'question' ? qi - 1 : qi
    return computeScores(players, answers, upto, hasTb ? { answers: tbAnswers, groups: tbGroups } : null)
  }, [players, answers, tbAnswers, qi, game?.state, tb, tbGroups.join(), hasTb])
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
    await set(r(`${ansKeyOf(game)}/${qi}/${pid}`), { choice: i, ms })
  }

  const shell = (children, bg) => (
    <div style={{ minHeight: '100dvh', background: bg || 'var(--bg)', overflow: 'hidden' }}>
      <Blobs />
      <div className="wrap" style={{ maxWidth: 480, margin: '0 auto', padding: '20px 18px 32px' }}>{children}</div>
    </div>
  )

  if (game === undefined) return shell(<Center>連線中…</Center>)

  // ── 測驗開始後不開放加入 ──
  if (!me && game.state !== 'waiting') return shell(<Center>
    <div style={{ fontSize: 56 }}>🙈</div>
    <div style={{ fontSize: 22, fontWeight: 800, marginTop: 8 }}>測驗已經開始</div>
    <div style={{ color: 'var(--body)', marginTop: 8 }}>這一輪不開放加入，請看大螢幕一起參與</div>
  </Center>)

  // ── 加入：先選組別，再輸入姓名 ──
  if (!me && !group) return shell(<>
    <div style={{ textAlign: 'center', margin: '8px 0 18px' }}>
      <div style={{ fontSize: 24, fontWeight: 900 }}>🧪 CCL 知識小測驗</div>
      <div style={{ color: 'var(--body)', marginTop: 4 }}>請選擇你的部門</div>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      {GROUPS.map((gg) => (
        <button key={gg.id} onClick={() => setGroup(gg.id)} className="pop"
          style={{ aspectRatio: '1 / 1.1', borderRadius: 26, background: gg.soft, border: `3px solid ${gg.color}`, color: 'var(--ink)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: `0 8px 20px ${gg.color}33` }}>
          <div style={{ fontSize: 46 }}>{gg.emoji}</div>
          <div style={{ fontWeight: 900, fontSize: 18 }}>{gg.name}</div>
          <div style={{ fontSize: 13, color: 'var(--body)' }}>{gg.lead}</div>
        </button>
      ))}
    </div>
  </>)

  if (!me) {
    const gg = groupOf(group)
    return shell(<>
      <button onClick={() => setGroup(0)} className="pill" style={{ background: '#fff', marginBottom: 14 }}>← 重選部門</button>
      <div className="card pop" style={{ padding: 24, textAlign: 'center', background: gg.soft, border: `3px solid ${gg.color}` }}>
        <div style={{ fontSize: 52 }}>{gg.emoji}</div>
        <div style={{ fontWeight: 900, fontSize: 22 }}>{gg.name}</div>
      </div>
      <div className="card" style={{ padding: 22, marginTop: 16 }}>
        <label style={{ fontWeight: 800, fontSize: 17 }}>輸入你的姓名</label>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={12} placeholder="例如：王小明" autoFocus
          onKeyDown={(e) => e.key === 'Enter' && join()}
          style={{ width: '100%', marginTop: 10, padding: '16px', fontSize: 20, borderRadius: 16, border: `2px solid ${gg.color}`, outline: 'none', background: '#FFFCF8' }} />
        <button onClick={join} disabled={!name.trim() || busy}
          style={{ width: '100%', marginTop: 16, padding: 18, borderRadius: 16, fontSize: 19, fontWeight: 900, color: '#fff',
            background: name.trim() ? gg.color : '#CFCBE0' }}>
          {busy ? '加入中…' : '進入測驗 →'}
        </button>
      </div>
    </>)
  }

  const g = groupOf(me.group)
  const header = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
      <span className="pill" style={{ background: g.soft, color: 'var(--ink)' }}>{g.emoji} {g.name}・{me.name}</span>
      <span className="pill num" style={{ background: '#fff', fontSize: 16 }}>{mine?.score ?? 0} 分</span>
    </div>
  )
  const state = game.state

  // ── 測驗封面（等待開始）──
  if (state === 'waiting') return shell(<>
    {header}
    <div className="card pop" style={{ padding: '28px 22px', textAlign: 'center', marginTop: 10 }}>
      <div className="floaty" style={{ fontSize: 64 }}>🧪</div>
      <div style={{ fontSize: 26, fontWeight: 900, marginTop: 6 }}>CCL 知識小測驗</div>
      <div style={{ color: 'var(--body)', marginTop: 6 }}>歡迎 {me.name}！</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 20 }}>
        {[['10', '題'], [String(TIMER), '秒／題'], ['100', '分滿分']].map(([n, t]) => (
          <div key={t} style={{ background: g.soft, borderRadius: 16, padding: '10px 4px' }}>
            <div className="num" style={{ fontSize: 26, fontWeight: 800 }}>{n}</div><div style={{ fontSize: 13, color: 'var(--body)' }}>{t}</div>
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'left', marginTop: 18, display: 'grid', gap: 8 }}>
        {[['🟢', '第 1–3 題　簡單'], ['🟡', '第 4–7 題　中等'], ['🔴', '第 8–10 題　挑戰'],
          ['📊', '第 3、7 題後公布階段排名'], ['🏆', '第 10 題後公布總成績'], ['👥', '團體賽比組員平均，個人賽比總分']].map(([e, t]) => (
          <div key={t} style={{ display: 'flex', gap: 10, alignItems: 'center', color: 'var(--body)', fontSize: 15 }}><span>{e}</span><span>{t}</span></div>
        ))}
      </div>
    </div>
    <div style={{ textAlign: 'center', marginTop: 18, color: 'var(--body)', fontWeight: 700 }}>等待主持人開始…請看大螢幕 👀</div>
  </>)

  // ── 加賽：非同分組只觀看 ──
  if (tb && (state === 'question' || state === 'reveal') && !tbEligible(game, pid, me)) return shell(<>
    {header}
    <Center>
      <div className="floaty" style={{ fontSize: 60 }}>⚔️</div>
      <div style={{ fontSize: 22, fontWeight: 900, marginTop: 8 }}>加賽進行中</div>
      <div style={{ color: 'var(--body)', marginTop: 8 }}>{[tbGroups.length ? `團體：${tbGroups.map((id) => groupOf(id).name).join(' vs ')}` : '', tbPlayers.length ? `個人：${tbPlayers.length} 人爭前三` : ''].filter(Boolean).join('｜')}</div>
      <div style={{ color: 'var(--body)', marginTop: 4 }}>請看大螢幕幫忙加油 📣</div>
    </Center>
  </>)

  // ── 作答中 ──
  if (state === 'question' && q) {
    const timeUp = left <= 0
    return shell(<>
      {header}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span className="pill" style={{ background: tb ? '#FDE5E1' : '#fff' }}>{tb ? '⚔️ 加賽 ' : ''}第 {qi + 1} / {QS.length} 題</span>
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

  // ── 階段排名 ──
  if (state === 'leaderboard') {
    const gr = scores.groups.find((x) => x.id === me.group)
    return shell(<>
      {header}
      <Center small>
        <div className="pop" style={{ fontSize: 56 }}>📊</div>
        <div style={{ fontSize: 22, fontWeight: 900 }}>{qi <= 2 ? '第一階段' : qi <= 6 ? '第二階段' : `第 ${qi + 1} 題後`}排名</div>
        <div style={{ color: 'var(--body)', marginTop: 4 }}>已完成第 1–{qi + 1} 題</div>
      </Center>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="card" style={{ padding: 18, textAlign: 'center' }}>
          <div style={{ color: 'var(--body)', fontWeight: 700 }}>個人賽</div>
          <div style={{ fontSize: 30, fontWeight: 900, lineHeight: 1.3, whiteSpace: 'nowrap' }}>第 <span className="num" style={{ fontSize: 40 }}>{mine?.rank ?? '-'}</span> 名</div>
          <div style={{ color: 'var(--body)' }}>{mine?.score ?? 0} 分・共 {scores.ranking.length} 人</div>
        </div>
        <div className="card" style={{ padding: 18, textAlign: 'center', background: g.soft }}>
          <div style={{ color: 'var(--body)', fontWeight: 700 }}>團體賽</div>
          <div style={{ fontSize: 30, fontWeight: 900, lineHeight: 1.3, whiteSpace: 'nowrap' }}>第 <span className="num" style={{ fontSize: 40 }}>{gr?.rank ?? '-'}</span> 名</div>
          <div style={{ color: 'var(--body)' }}>平均 {gr?.avg ?? 0} 分</div>
        </div>
      </div>
      <div style={{ textAlign: 'center', color: 'var(--body)', marginTop: 16 }}>完整排名請看大螢幕 👀</div>
    </>)
  }

  // ── 公布答案 ──
  if (state === 'reveal' && q) {
    const ok = myAns && myAns.choice === q.ans
    return shell(<>
      {header}
      <Center small>
        <div className="pop" style={{ fontSize: 64 }}>{!myAns ? '😶' : ok ? '🎉' : '💪'}</div>
        <div style={{ fontSize: 24, fontWeight: 900, color: !myAns ? 'var(--body)' : ok ? 'var(--ok)' : 'var(--bad)' }}>
          {!myAns ? '這題沒有作答' : ok ? (tb ? '答對了！加賽 +10' : '答對了！+10 分') : '可惜，答錯了'}
        </div>
      </Center>
      <div className="card" style={{ padding: 18, marginTop: 8 }}>
        <div style={{ color: 'var(--muted)', fontWeight: 700, fontSize: 14 }}>{tb ? '加賽' : ''}第 {qi + 1} 題・正確答案</div>
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
    const aw = awards(scores, !!game.tbDone)
    const iWin = aw.indiv.some((p) => p.pid === pid)
    const gWin = aw.groupWinner?.id === me.group
    const pending = !game.tbDone && aw.needTb && (aw.contenders.some((p) => p.pid === pid) || aw.topGroups.some((x) => x.id === me.group) && aw.needGroupTb)
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
      {(iWin || gWin || pending) && <div className="card pop" style={{ padding: 16, marginTop: 14, textAlign: 'center', background: '#FFF6DA', fontWeight: 900, fontSize: 18, lineHeight: 1.7 }}>
        {iWin && <div>⭐ 個人賽前三名！</div>}
        {gWin && <div>👑 {g.name} 團體賽冠軍！</div>}
        {pending && <div style={{ color: '#C0583F' }}>⚔️ 同分，準備加賽！</div>}
      </div>}
      {gr && <div className="card" style={{ padding: 18, marginTop: 14, textAlign: 'center', background: g.soft }}>
        <div style={{ fontWeight: 800 }}>{g.emoji} {g.name} 平均 <span className="num" style={{ fontSize: 26 }}>{gr.avg}</span> 分</div>
        <div style={{ color: 'var(--body)', marginTop: 4 }}>小組排名第 {gr.rank} 名{gr.inTb && game.tbDone ? `（加賽平均 ${gr.tbAvg}）` : ''}</div>
      </div>}
    </>)
  }

  return shell(<>{header}<Center>請稍候…</Center></>)
}

function Center({ children, small }) {
  return <div style={{ textAlign: 'center', padding: small ? '18px 0' : '70px 0', color: 'var(--ink)' }}>{children}</div>
}
