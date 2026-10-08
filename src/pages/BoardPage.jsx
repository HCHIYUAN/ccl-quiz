import React, { useEffect, useMemo, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { QUESTIONS, GROUPS, OPTS, TIMER, levelOf, isTb, qsetOf, tbEligible } from '../data/questions'
import { computeScores, distribution, awards } from '../lib/score'
import { useQuiz, useCountdown } from '../lib/useQuiz'
import { Blobs, Confetti, TimerRing } from '../lib/ui'

const STAGE_OF = (i) => (i < 3 ? '簡單' : i < 7 ? '中等' : '挑戰')
const STAGE_TITLE = (i) => (i <= 2 ? '第一階段排名（簡單題 1–3）' : i <= 6 ? '第二階段排名（中等題 4–7）' : `第 ${i + 1} 題後排名`)

export default function BoardPage() {
  const { game, players, answers, tbAnswers, offset } = useQuiz()
  const left = useCountdown(game, offset)
  const [url, setUrl] = useState('')
  useEffect(() => setUrl(window.location.origin + '/'), [])

  const qi = game?.currentQ ?? 0
  const tb = isTb(game)
  const QS = qsetOf(game)
  const q = QS[qi]
  const state = game?.state ?? 'waiting'
  const tbGroups = game?.tbGroups || []
  const tbPlayers = game?.tbPlayers || []
  const hasTb = tbGroups.length + tbPlayers.length > 0
  const allPlayers = Object.entries(players || {}).filter(([, p]) => p)
  const plist = tb ? allPlayers.filter(([id, p]) => tbEligible(game, id, p)) : allPlayers
  const pCount = plist.length
  const curAns = tb ? tbAnswers : answers
  const row = curAns?.[qi] || {}
  const aCount = Object.keys(row).length
  const scores = useMemo(() => computeScores(players, answers,
    tb ? QUESTIONS.length - 1 : state === 'question' ? qi - 1 : qi,
    hasTb ? { answers: tbAnswers, groups: tbGroups, upto: tb && state === 'question' ? qi - 1 : qi } : null),
  [players, answers, tbAnswers, qi, state, tb, tbGroups.join(), hasTb])
  const tbTitle = [tbGroups.length ? `團體 ${tbGroups.map((id) => GROUPS.find((g) => g.id === id)?.name).join(' vs ')}` : '', tbPlayers.length ? `個人 ${tbPlayers.length} 人爭前三` : ''].filter(Boolean).join('＋')

  const page = (children) => (
    <div style={{ minHeight: '100vh', overflow: 'hidden', position: 'relative' }}>
      <Blobs />
      <div className="wrap" style={{ padding: '3.5vh 4vw', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5vh' }}>
          <div style={{ fontWeight: 900, fontSize: 'clamp(18px,1.6vw,28px)' }}>🧪 CCL 知識小測驗</div>
          <div className="pill" style={{ background: '#fff', fontSize: 'clamp(14px,1.1vw,20px)' }}>👥 {allPlayers.length} 人參加</div>
        </div>
        {children}
      </div>
    </div>
  )

  if (game === undefined) return page(<div>連線中…</div>)

  // ── 等待：QR Code ──
  if (state === 'waiting') return page(
    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1.15fr', gap: '4vw', alignItems: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="card" style={{ display: 'inline-block', padding: '3vh', borderRadius: 36 }}>
          {url && <QRCodeSVG value={url} size={Math.round(Math.min(window.innerHeight * 0.42, window.innerWidth * 0.3))}
            fgColor="#3B3A4A" bgColor="#FFFFFF" level="M" />}
        </div>
        <div style={{ marginTop: '2.5vh', fontSize: 'clamp(18px,1.6vw,30px)', fontWeight: 800 }}>手機掃描加入</div>
        <div className="num" style={{ color: 'var(--body)', fontSize: 'clamp(14px,1.2vw,22px)', marginTop: 4 }}>{url.replace(/^https?:\/\//, '').replace(/\/$/, '')}</div>
      </div>
      <div>
        <div style={{ fontSize: 'clamp(36px,4.2vw,76px)', fontWeight: 900, lineHeight: 1.15 }}>開場暖身<br />CCL 知識小測驗</div>
        <div style={{ color: 'var(--body)', fontSize: 'clamp(16px,1.5vw,26px)', margin: '1.5vh 0 3.5vh' }}>
          10 題・每題 10 分・每題 {TIMER} 秒<br />小組成績＝組員平均分數
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.6vw' }}>
          {GROUPS.map((g) => {
            const m = plist.filter(([, p]) => p.group === g.id)
            return (
              <div key={g.id} className="card" style={{ padding: '1.8vh 1.4vw', background: g.soft, minHeight: '14vh' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 'clamp(16px,1.4vw,24px)' }}>
                  <span>{g.emoji} {g.name}</span><span className="num">{m.length} 人</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                  {m.map(([id, p]) => (
                    <span key={id} className="pill pop" style={{ background: '#fff', fontSize: 'clamp(12px,0.95vw,17px)', padding: '4px 10px' }}>{p.name}</span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )

  const shownGroups = tb ? GROUPS.filter((g) => tbGroups.includes(g.id)) : GROUPS
  const tbIndiv = tb ? allPlayers.filter(([id]) => tbPlayers.includes(id)) : []

  // ── 作答中：左 2/3 題目，右 1/3 各組作答進度 ──
  if (state === 'question' && q) return page(
    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2.4vw' }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.6vw' }}>
          <div style={{ flex: 1 }}>
            <span className="pill" style={{ background: tb ? '#FDE5E1' : '#fff', fontSize: 'clamp(14px,1.2vw,22px)' }}>{tb ? `⚔️ 加賽 ${qi + 1} / ${QS.length}・${tbTitle}` : `第 ${qi + 1} / ${QS.length} 題・${STAGE_OF(qi)}`}</span>
            <div style={{ fontSize: 'clamp(26px,2.7vw,52px)', fontWeight: 900, lineHeight: 1.3, marginTop: '1.5vh' }}>{q.q}</div>
          </div>
          <TimerRing left={left} total={TIMER} size={Math.round(Math.min(window.innerWidth * 0.09, 160))} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridAutoRows: '1fr', gap: '1.4vw', marginTop: '4vh', flex: 1, maxHeight: '52vh' }}>
          {q.opts.map((o, i) => (
            <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.2vw', padding: '2.6vh 1.4vw', background: OPTS[i].soft, border: `3px solid ${OPTS[i].color}66` }}>
              <span className="num" style={{ flex: '0 0 auto', width: '3.6vw', height: '3.6vw', minWidth: 44, minHeight: 44, borderRadius: 16, background: OPTS[i].color, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 'clamp(22px,2vw,38px)' }}>{OPTS[i].label}</span>
              <span style={{ fontSize: 'clamp(20px,2vw,38px)', fontWeight: 800, lineHeight: 1.3 }}>{o}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.6vh' }}>
        <div className="card" style={{ padding: '1.8vh 1.4vw', textAlign: 'center' }}>
          <div style={{ color: 'var(--body)', fontWeight: 700, fontSize: 'clamp(14px,1.1vw,20px)' }}>已完成作答</div>
          <div className="num" style={{ fontSize: 'clamp(34px,3.4vw,64px)', fontWeight: 800, lineHeight: 1.1 }}>{aCount}<span style={{ fontSize: '0.5em', color: 'var(--muted)' }}> / {pCount}</span></div>
        </div>
        {shownGroups.map((g) => {
          const m = plist.filter(([, p]) => p.group === g.id)
          const done = m.filter(([id]) => row[id]).length
          const rest = m.length - done
          return (
            <div key={g.id} className="card" style={{ padding: '1.6vh 1.2vw', background: g.soft, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontWeight: 800, fontSize: 'clamp(15px,1.25vw,24px)' }}>
                <span>{g.emoji} {g.name}</span>
                <span className="num" style={{ fontSize: '1.3em' }}>{done}<span style={{ fontSize: '0.7em', color: 'var(--body)' }}> / {m.length}</span></span>
              </div>
              <div style={{ height: 12, background: '#fff', borderRadius: 8, overflow: 'hidden', margin: '1vh 0 0.6vh' }}>
                <div style={{ width: `${m.length ? (done / m.length) * 100 : 0}%`, height: '100%', background: g.color, transition: 'width .4s' }} />
              </div>
              <div style={{ fontSize: 'clamp(13px,1vw,18px)', color: rest ? 'var(--body)' : 'var(--ok)', fontWeight: 700 }}>{m.length === 0 ? '尚無組員' : rest ? `還有 ${rest} 人未作答` : '✓ 全員完成'}</div>
            </div>
          )
        })}
        {tbIndiv.length > 0 && <div className="card" style={{ padding: '1.6vh 1.2vw', background: '#FFF6DA' }}>
          <div style={{ fontWeight: 800, fontSize: 'clamp(15px,1.25vw,24px)', marginBottom: 6 }}>⭐ 個人加賽</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{tbIndiv.map(([id, p]) => <span key={id} className="pill" style={{ background: row[id] ? '#fff' : '#F3EEE8', fontSize: 'clamp(12px,1vw,18px)', opacity: row[id] ? 1 : .6 }}>{p.name}{row[id] ? ' ✓' : ''}</span>)}</div>
        </div>}
      </div>
      {left <= 0 && <div className="pop" style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(255,247,238,.6)', zIndex: 5 }}>
        <div className="card" style={{ padding: '4vh 5vw', fontSize: 'clamp(32px,4vw,72px)', fontWeight: 900 }}>⌛ 時間到！</div>
      </div>}
    </div>
  )

  // ── 公布答案：左 答案＋解說，右 各組答對人數 ──
  if (state === 'reveal' && q) {
    const okN = Object.values(row).filter((a) => a && a.choice === q.ans).length
    return page(
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2.4vw' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.4vh' }}>
          <div>
            <span className="pill" style={{ background: tb ? '#FDE5E1' : '#fff', fontSize: 'clamp(14px,1.2vw,22px)' }}>{tb ? `⚔️ 加賽第 ${qi + 1} 題` : `第 ${qi + 1} 題`}・全體答對率 {aCount ? Math.round((okN / aCount) * 100) : 0}%</span>
            <div style={{ fontSize: 'clamp(22px,2.2vw,40px)', fontWeight: 800, lineHeight: 1.35, marginTop: '1.5vh', color: 'var(--body)' }}>{q.q}</div>
          </div>
          <div className="card pop" style={{ padding: '3vh 2vw', background: 'var(--ok-soft)', border: '4px solid var(--ok)', display: 'flex', alignItems: 'center', gap: '1.6vw' }}>
            <span className="num" style={{ flex: '0 0 auto', width: '5vw', height: '5vw', minWidth: 56, minHeight: 56, borderRadius: 20, background: 'var(--ok)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 'clamp(28px,2.8vw,52px)' }}>{OPTS[q.ans].label}</span>
            <div>
              <div style={{ color: 'var(--ok)', fontWeight: 800, fontSize: 'clamp(14px,1.2vw,22px)' }}>正確答案</div>
              <div style={{ fontSize: 'clamp(26px,2.8vw,52px)', fontWeight: 900, lineHeight: 1.2 }}>{q.opts[q.ans]}</div>
            </div>
          </div>
          <div className="card" style={{ padding: '2.6vh 2vw', background: '#FFFDF6', flex: 1 }}>
            <div style={{ fontWeight: 900, fontSize: 'clamp(16px,1.4vw,26px)', marginBottom: 8 }}>💡 為什麼</div>
            <div style={{ fontSize: 'clamp(18px,1.6vw,30px)', lineHeight: 1.6, color: 'var(--body)' }}>{q.exp}</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.6vh' }}>
          <div className="card" style={{ padding: '1.8vh 1.4vw', textAlign: 'center' }}>
            <div style={{ color: 'var(--body)', fontWeight: 700, fontSize: 'clamp(14px,1.1vw,20px)' }}>全體答對</div>
            <div className="num" style={{ fontSize: 'clamp(34px,3.4vw,64px)', fontWeight: 800, lineHeight: 1.1, color: 'var(--ok)' }}>{okN}<span style={{ fontSize: '0.5em', color: 'var(--muted)' }}> / {pCount}</span></div>
          </div>
          {shownGroups.map((g) => {
            const m = plist.filter(([, p]) => p.group === g.id)
            const ok = m.filter(([id]) => row[id] && row[id].choice === q.ans).length
            return (
              <div key={g.id} className="card" style={{ padding: '1.6vh 1.2vw', background: g.soft, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontWeight: 800, fontSize: 'clamp(15px,1.25vw,24px)' }}>
                  <span>{g.emoji} {g.name}</span>
                  <span className="num" style={{ fontSize: '1.3em' }}>{ok}<span style={{ fontSize: '0.7em', color: 'var(--body)' }}> / {m.length}</span></span>
                </div>
                <div style={{ height: 12, background: '#fff', borderRadius: 8, overflow: 'hidden', marginTop: '1vh' }}>
                  <div style={{ width: `${m.length ? (ok / m.length) * 100 : 0}%`, height: '100%', background: g.color, transition: 'width .6s' }} />
                </div>
                <div style={{ fontSize: 'clamp(13px,1vw,18px)', color: 'var(--body)', fontWeight: 700, marginTop: '0.6vh' }}>答對率 {m.length ? Math.round((ok / m.length) * 100) : 0}%</div>
              </div>
            )
          })}
          {tbIndiv.length > 0 && <div className="card" style={{ padding: '1.6vh 1.2vw', background: '#FFF6DA' }}>
            <div style={{ fontWeight: 800, fontSize: 'clamp(15px,1.25vw,24px)', marginBottom: 6 }}>⭐ 個人加賽累計</div>
            {tbIndiv.map(([id, p]) => <div key={id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'clamp(13px,1.1vw,20px)', fontWeight: 700 }}>
              <span>{p.name}</span><span className="num">{scores.byPlayer[id]?.tb ?? 0}</span></div>)}
          </div>}
        </div>
      </div>
    )
  }

  // ── 階段排名（第 3、7 題後）──
  if (state === 'leaderboard') return page(
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: 'clamp(28px,3vw,54px)', fontWeight: 900 }}>📊 {STAGE_TITLE(qi)}</div>
      <div style={{ color: 'var(--body)', fontSize: 'clamp(15px,1.3vw,24px)', margin: '0.6vh 0 2.6vh' }}>已完成第 1–{qi + 1} 題・滿分 {(qi + 1) * 10} 分</div>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '3vw' }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 'clamp(18px,1.6vw,30px)', marginBottom: '1.4vh' }}>👥 團體賽（組員平均）</div>
          <GroupBars groups={scores.groups} max={(qi + 1) * 10} ranked />
        </div>
        <TopList ranking={scores.ranking} n={8} title="個人賽前 8 名" />
      </div>
    </div>
  )

  // ── 最終結果：團體賽冠軍＋個人賽前三 ──
  if (state === 'final') {
    const aw = awards(scores, !!game.tbDone)
    const gs = scores.groups.filter((g) => g.count > 0)
    const hist = Array(11).fill(0)
    scores.ranking.forEach((p) => { hist[Math.round(p.score / 10)] += 1 })
    const hmax = Math.max(1, ...hist)
    const avgAll = scores.ranking.length ? Math.round(scores.ranking.reduce((s2, p) => s2 + p.score, 0) / scores.ranking.length) : 0
    const W = aw.groupWinner
    const winIds = new Set(aw.indiv.map((p) => p.pid))
    return page(<>
      <Confetti n={44} />
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '3vw' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.2vh' }}>
          <div style={{ fontSize: 'clamp(30px,3.2vw,58px)', fontWeight: 900 }}>🏆 最終成績</div>
          <div className="card pop" style={{ padding: '3vh 2vw', background: W ? W.soft : '#FFF1EE', border: `4px solid ${W ? W.color : '#EF7A6A'}`, textAlign: 'center' }}>
            <div style={{ fontWeight: 900, fontSize: 'clamp(18px,1.6vw,30px)', color: 'var(--body)' }}>👑 團體賽冠軍</div>
            {W ? <>
              <div style={{ fontSize: 'clamp(40px,4.4vw,84px)', fontWeight: 900, lineHeight: 1.2 }}>{W.emoji} {W.name}</div>
              <div style={{ fontSize: 'clamp(16px,1.4vw,26px)', color: 'var(--body)' }}>平均 <span className="num" style={{ fontSize: '1.5em', color: 'var(--ink)' }}>{W.avg}</span> 分・{W.count} 人{game.tbDone && aw.needGroupTb ? `・加賽平均 ${W.tbAvg}` : ''}</div>
            </> : <div style={{ fontSize: 'clamp(28px,3vw,56px)', fontWeight: 900, color: '#C0583F', margin: '1vh 0' }}>⚔️ 同分加賽：{aw.topGroups.map((g) => g.name).join(' vs ')}</div>}
          </div>
          <GroupBars groups={gs} compact />
          <div className="card" style={{ padding: '1.8vh 1.6vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 'clamp(14px,1.2vw,22px)' }}>
              <span>全體分數分布</span><span>全體平均 <span className="num">{avgAll}</span> 分</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: '10vh', marginTop: 8 }}>
              {hist.map((n, i) => (
                <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                  <div className="num" style={{ fontSize: 14, color: 'var(--body)' }}>{n || ''}</div>
                  <div style={{ height: `${(n / hmax) * 6.5}vh`, background: i >= 9 ? '#A98BEF' : i >= 7 ? '#4FC3A1' : i >= 4 ? '#6BAEF0' : '#FFB38A', borderRadius: 6 }} />
                  <div className="num" style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{i * 10}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.2vh' }}>
          <div className="card pop" style={{ padding: '2.6vh 1.6vw', background: '#FFF6DA' }}>
            <div style={{ fontWeight: 900, fontSize: 'clamp(18px,1.6vw,30px)', marginBottom: '1.4vh' }}>⭐ 個人賽前三名</div>
            {aw.indiv.map((p) => {
              const g = GROUPS.find((x) => x.id === p.group)
              return <div key={p.pid} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '1.1vh 1vw', marginBottom: 6, borderRadius: 16, background: '#fff' }}>
                <span style={{ fontSize: 'clamp(22px,2vw,38px)' }}>🎁</span>
                <span style={{ flex: 1, fontWeight: 900, fontSize: 'clamp(20px,1.9vw,36px)' }}>{p.name} <span style={{ fontSize: '0.55em', color: 'var(--body)' }}>{g?.emoji} {g?.name}</span></span>
                <span className="num" style={{ fontWeight: 800, fontSize: 'clamp(22px,2vw,38px)' }}>{p.score}</span>
              </div>
            })}
            {aw.needIndivTb && !game.tbDone && <div style={{ marginTop: 8, padding: '1.2vh 1vw', borderRadius: 14, background: '#FFE7E1', fontWeight: 800, fontSize: 'clamp(15px,1.3vw,24px)' }}>
              ⚔️ {aw.cutoff} 分同分 {aw.contenders.length} 人，爭 {aw.slots} 個名額：{aw.contenders.map((p) => p.name).join('、')}</div>}
          </div>
          <TopList ranking={scores.ranking.filter((p) => !winIds.has(p.pid))} n={7} title="其他高分" showLevel start={aw.indiv.length} />
        </div>
      </div>
    </>)
  }

  return page(<div>請稍候…</div>)
}

function GroupBars({ groups, compact, max = 100, ranked }) {
  const gs = groups.filter((g) => g.count > 0)
  return (
    <div className="card" style={{ padding: compact ? '2vh 1.6vw' : '3vh 2vw' }}>
      {compact && <div style={{ fontWeight: 900, fontSize: 'clamp(16px,1.4vw,26px)', marginBottom: 10 }}>📊 小組平均</div>}
      {gs.map((g) => (
        <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: '1vw', margin: compact ? '1.2vh 0' : '2.4vh 0' }}>
          {ranked && <span style={{ fontSize: 'clamp(22px,2vw,36px)', width: '3vw' }}>{['🥇', '🥈', '🥉', '🎖️'][g.rank - 1]}</span>}
          <div style={{ width: compact ? '11vw' : '14vw', fontWeight: 800, fontSize: compact ? 'clamp(14px,1.2vw,22px)' : 'clamp(18px,1.6vw,30px)' }}>{g.emoji} {g.name}</div>
          <div style={{ flex: 1, height: compact ? 22 : 40, background: '#F6EFE6', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ width: `${(g.avg / max) * 100}%`, height: '100%', background: g.color, borderRadius: 14, transition: 'width .8s' }} />
          </div>
          <div className="num" style={{ width: '5vw', textAlign: 'right', fontWeight: 800, fontSize: compact ? 'clamp(18px,1.5vw,28px)' : 'clamp(24px,2.2vw,42px)' }}>{g.avg}</div>
        </div>
      ))}
    </div>
  )
}

function TopList({ ranking, n, title, showLevel, start = 0 }) {
  return (
    <div className="card" style={{ padding: '2.4vh 1.6vw', alignSelf: 'stretch' }}>
      <div style={{ fontWeight: 900, fontSize: 'clamp(16px,1.5vw,28px)', marginBottom: '1.4vh' }}>⭐ {title}</div>
      {ranking.slice(0, n).map((p, i) => {
        const g = GROUPS.find((x) => x.id === p.group)
        return (
          <div key={p.pid} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '1vh 0.6vw', borderRadius: 14, background: i < 3 && !start ? g?.soft : 'transparent', marginBottom: 4 }}>
            <span className="num" style={{ width: 34, fontWeight: 800, fontSize: 'clamp(16px,1.4vw,26px)', color: 'var(--muted)' }}>{p.rank}</span>
            <span style={{ flex: 1, fontWeight: 800, fontSize: 'clamp(15px,1.3vw,24px)' }}>{p.name} <span style={{ fontSize: '0.75em', color: 'var(--muted)' }}>{g?.emoji}</span></span>
            {showLevel && <span style={{ color: 'var(--body)', fontSize: 'clamp(12px,1vw,18px)' }}>{levelOf(p.score).t}</span>}
            <span className="num" style={{ fontWeight: 800, fontSize: 'clamp(18px,1.5vw,28px)' }}>{p.score}</span>
          </div>
        )
      })}
    </div>
  )
}

function TbBars({ groups }) {
  return (
    <div className="card" style={{ padding: '2vh 1.6vw', background: '#FFF5F2' }}>
      <div style={{ fontWeight: 900, fontSize: 'clamp(16px,1.4vw,26px)', marginBottom: 10 }}>⚔️ 加賽平均</div>
      {groups.map((g) => (
        <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: '1vw', margin: '1.4vh 0' }}>
          <div style={{ width: '11vw', fontWeight: 800, fontSize: 'clamp(14px,1.2vw,22px)' }}>{g.emoji} {g.name}</div>
          <div style={{ flex: 1, height: 22, background: '#F6EFE6', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ width: `${((g.tbAvg || 0) / 30) * 100}%`, height: '100%', background: g.color, transition: 'width .8s' }} />
          </div>
          <div className="num" style={{ width: '5vw', textAlign: 'right', fontWeight: 800, fontSize: 'clamp(18px,1.5vw,28px)' }}>{g.tbAvg ?? 0}</div>
        </div>
      ))}
    </div>
  )
}
