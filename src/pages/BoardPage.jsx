import React, { useEffect, useMemo, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { QUESTIONS, GROUPS, OPTS, TIMER, levelOf, isTb, qsetOf } from '../data/questions'
import { computeScores, distribution, tiedSets } from '../lib/score'
import { useQuiz, useCountdown } from '../lib/useQuiz'
import { Blobs, Confetti, TimerRing } from '../lib/ui'

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
  const allPlayers = Object.entries(players || {}).filter(([, p]) => p)
  const plist = tb ? allPlayers.filter(([, p]) => tbGroups.includes(p.group)) : allPlayers
  const pCount = plist.length
  const curAns = tb ? tbAnswers : answers
  const row = curAns?.[qi] || {}
  const aCount = Object.keys(row).length
  const scores = useMemo(() => computeScores(players, answers,
    tb ? QUESTIONS.length - 1 : state === 'question' ? qi - 1 : qi,
    tbGroups.length ? { answers: tbAnswers, groups: tbGroups, upto: tb && state === 'question' ? qi - 1 : qi } : null),
  [players, answers, tbAnswers, qi, state, tb, tbGroups.join()])
  const tbTitle = tbGroups.map((id) => GROUPS.find((g) => g.id === id)?.name).join(' vs ')

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

  // ── 作答中 ──
  if (state === 'question' && q) return page(
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '2vw' }}>
        <div style={{ flex: 1 }}>
          <span className="pill" style={{ background: tb ? '#FDE5E1' : '#fff', fontSize: 'clamp(14px,1.2vw,22px)' }}>{tb ? `⚔️ 加賽 ${qi + 1} / ${QS.length}・${tbTitle}` : `第 ${qi + 1} / ${QS.length} 題・${q.cat}`}</span>
          <div style={{ fontSize: 'clamp(28px,3.1vw,58px)', fontWeight: 900, lineHeight: 1.3, marginTop: '1.5vh' }}>{q.q}</div>
        </div>
        <TimerRing left={left} total={TIMER} size={Math.round(Math.min(window.innerWidth * 0.11, 180))} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.6vw', marginTop: '4vh' }}>
        {q.opts.map((o, i) => (
          <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.4vw', padding: '2.6vh 1.6vw', background: OPTS[i].soft, border: `3px solid ${OPTS[i].color}66` }}>
            <span className="num" style={{ flex: '0 0 auto', width: '4.2vw', height: '4.2vw', minWidth: 48, minHeight: 48, borderRadius: 16, background: OPTS[i].color, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 'clamp(24px,2.2vw,40px)' }}>{OPTS[i].label}</span>
            <span style={{ fontSize: 'clamp(20px,2vw,38px)', fontWeight: 800 }}>{o}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 'auto', paddingTop: '3vh', display: 'flex', gap: '1.2vw', alignItems: 'center' }}>
        <div style={{ fontWeight: 800, fontSize: 'clamp(16px,1.4vw,26px)', marginRight: 8 }}>
          已作答 <span className="num">{aCount}</span> / <span className="num">{pCount}</span>
        </div>
        {GROUPS.filter((g) => !tb || tbGroups.includes(g.id)).map((g) => {
          const m = plist.filter(([, p]) => p.group === g.id)
          const done = m.filter(([id]) => row[id]).length
          return (
            <div key={g.id} style={{ flex: 1 }}>
              <div style={{ fontSize: 'clamp(13px,1vw,18px)', fontWeight: 700, marginBottom: 4 }}>{g.emoji} {g.name} {done}/{m.length}</div>
              <div style={{ height: 12, background: '#fff', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ width: `${m.length ? (done / m.length) * 100 : 0}%`, height: '100%', background: g.color, transition: 'width .4s' }} />
              </div>
            </div>
          )
        })}
      </div>
      {left <= 0 && <div className="pop" style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(255,247,238,.6)', zIndex: 5 }}>
        <div className="card" style={{ padding: '4vh 5vw', fontSize: 'clamp(32px,4vw,72px)', fontWeight: 900 }}>⌛ 時間到！</div>
      </div>}
    </div>
  )

  // ── 公布答案 ──
  if (state === 'reveal' && q) {
    const d = distribution(curAns, qi)
    const max = Math.max(1, ...d)
    const okN = d[q.ans]
    return page(
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: '3vw' }}>
        <div>
          <span className="pill" style={{ background: tb ? '#FDE5E1' : '#fff', fontSize: 'clamp(14px,1.2vw,22px)' }}>{tb ? `⚔️ 加賽第 ${qi + 1} 題` : `第 ${qi + 1} 題`}・答對率 {aCount ? Math.round((okN / aCount) * 100) : 0}%</span>
          <div style={{ fontSize: 'clamp(24px,2.4vw,44px)', fontWeight: 900, lineHeight: 1.3, margin: '1.5vh 0 3vh' }}>{q.q}</div>
          <div style={{ display: 'grid', gap: '1.6vh' }}>
            {q.opts.map((o, i) => {
              const ok = i === q.ans
              return (
                <div key={i} className={ok ? 'card pop' : 'card'} style={{ padding: '1.6vh 1.4vw', display: 'flex', alignItems: 'center', gap: '1.2vw',
                  background: ok ? 'var(--ok-soft)' : '#fff', border: ok ? '3px solid var(--ok)' : '3px solid transparent', opacity: ok ? 1 : 0.75 }}>
                  <span className="num" style={{ width: 46, height: 46, borderRadius: 14, background: ok ? 'var(--ok)' : OPTS[i].color, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 24, flex: '0 0 auto' }}>{ok ? '✓' : OPTS[i].label}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 'clamp(16px,1.5vw,28px)' }}>{o}</div>
                    <div style={{ height: 10, background: '#F3EADF', borderRadius: 8, marginTop: 6, overflow: 'hidden' }}>
                      <div style={{ width: `${(d[i] / max) * 100}%`, height: '100%', background: ok ? 'var(--ok)' : OPTS[i].color, transition: 'width .6s' }} />
                    </div>
                  </div>
                  <span className="num" style={{ fontSize: 'clamp(18px,1.6vw,30px)', fontWeight: 800, width: '3vw', textAlign: 'right' }}>{d[i]}</span>
                </div>
              )
            })}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2vh' }}>
          <div className="card" style={{ padding: '2.4vh 1.6vw', background: '#FFFDF6' }}>
            <div style={{ fontWeight: 900, fontSize: 'clamp(16px,1.4vw,26px)', marginBottom: 8 }}>💡 解說</div>
            <div style={{ fontSize: 'clamp(16px,1.35vw,26px)', lineHeight: 1.6, color: 'var(--body)' }}>{q.exp}</div>
          </div>
          {tb ? <TbBars groups={scores.groups.filter((g) => g.inTb)} /> : <GroupBars groups={scores.groups} compact />}
        </div>
      </div>
    )
  }

  // ── 中場排行 ──
  if (state === 'leaderboard') return page(
    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '3vw' }}>
      <div>
        <div style={{ fontSize: 'clamp(28px,3vw,54px)', fontWeight: 900, marginBottom: '3vh' }}>📊 第 {qi + 1} 題後・小組平均</div>
        <GroupBars groups={scores.groups} />
      </div>
      <TopList ranking={scores.ranking} n={8} title="個人前 8 名" />
    </div>
  )

  // ── 最終結果 ──
  if (state === 'final') {
    const gs = scores.groups.filter((g) => g.count > 0)
    const hist = Array(11).fill(0)
    scores.ranking.forEach((p) => { hist[Math.round(p.score / 10)] += 1 })
    const hmax = Math.max(1, ...hist)
    const avgAll = scores.ranking.length ? Math.round(scores.ranking.reduce((s, p) => s + p.score, 0) / scores.ranking.length) : 0
    const order = [1, 0, 2, 3]
    return page(<>
      <Confetti n={44} />
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: '3vw' }}>
        <div>
          <div style={{ fontSize: 'clamp(30px,3.2vw,58px)', fontWeight: 900 }}>🏆 最終成績</div>
          {!game.tbDone && tiedSets(scores.groups).length > 0 && <div className="pill" style={{ background: '#FDE5E1', marginTop: 8, fontSize: 'clamp(13px,1.1vw,20px)' }}>⚔️ 有同分組別，準備加賽：{tiedSets(scores.groups).map((t) => t.map((g) => g.name).join(' vs ')).join('；')}</div>}
          {game.tbDone && <div className="pill" style={{ background: '#FDE5E1', marginTop: 8, fontSize: 'clamp(13px,1.1vw,20px)' }}>⚔️ 同分組別已由加賽決定名次：{scores.groups.filter((g) => g.inTb).map((g) => `${g.name} ${g.tbAvg}`).join('｜')}</div>}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1.4vw', height: '42vh', marginTop: '3vh' }}>
            {order.map((k) => gs[k]).filter(Boolean).map((g) => {
              const h = [100, 78, 60, 46][g.rank - 1]
              return (
                <div key={g.id} className="pop" style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 'clamp(26px,2.6vw,48px)' }}>{['🥇', '🥈', '🥉', '🎖️'][g.rank - 1]}</div>
                  <div style={{ fontWeight: 800, fontSize: 'clamp(15px,1.3vw,24px)' }}>{g.emoji} {g.name}</div>
                  <div style={{ height: `${h * 0.32}vh`, background: g.color, borderRadius: '20px 20px 8px 8px', marginTop: 8, display: 'grid', placeItems: 'center', color: '#fff' }}>
                    <div><div className="num" style={{ fontSize: 'clamp(28px,3vw,56px)', fontWeight: 800, lineHeight: 1 }}>{g.avg}</div>
                      <div style={{ fontSize: 'clamp(12px,0.95vw,18px)' }}>平均・{g.count} 人</div></div>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="card" style={{ marginTop: '3vh', padding: '2vh 1.6vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 'clamp(14px,1.2vw,22px)' }}>
              <span>全體分數分布</span><span>全體平均 <span className="num">{avgAll}</span> 分</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: '12vh', marginTop: 10 }}>
              {hist.map((n, i) => (
                <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                  <div className="num" style={{ fontSize: 14, color: 'var(--body)' }}>{n || ''}</div>
                  <div style={{ height: `${(n / hmax) * 8}vh`, background: i >= 9 ? '#A98BEF' : i >= 7 ? '#4FC3A1' : i >= 4 ? '#6BAEF0' : '#FFB38A', borderRadius: 6 }} />
                  <div className="num" style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{i * 10}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <TopList ranking={scores.ranking} n={10} title="個人前 10 名" showLevel />
      </div>
    </>)
  }

  return page(<div>請稍候…</div>)
}

function GroupBars({ groups, compact }) {
  const gs = groups.filter((g) => g.count > 0)
  return (
    <div className="card" style={{ padding: compact ? '2vh 1.6vw' : '3vh 2vw' }}>
      {compact && <div style={{ fontWeight: 900, fontSize: 'clamp(16px,1.4vw,26px)', marginBottom: 10 }}>📊 小組平均</div>}
      {gs.map((g) => (
        <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: '1vw', margin: compact ? '1.2vh 0' : '2.4vh 0' }}>
          <div style={{ width: compact ? '11vw' : '14vw', fontWeight: 800, fontSize: compact ? 'clamp(14px,1.2vw,22px)' : 'clamp(18px,1.6vw,30px)' }}>{g.emoji} {g.name}</div>
          <div style={{ flex: 1, height: compact ? 22 : 40, background: '#F6EFE6', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ width: `${g.avg}%`, height: '100%', background: g.color, borderRadius: 14, transition: 'width .8s' }} />
          </div>
          <div className="num" style={{ width: '5vw', textAlign: 'right', fontWeight: 800, fontSize: compact ? 'clamp(18px,1.5vw,28px)' : 'clamp(24px,2.2vw,42px)' }}>{g.avg}</div>
        </div>
      ))}
    </div>
  )
}

function TopList({ ranking, n, title, showLevel }) {
  return (
    <div className="card" style={{ padding: '2.4vh 1.6vw', alignSelf: 'start' }}>
      <div style={{ fontWeight: 900, fontSize: 'clamp(16px,1.5vw,28px)', marginBottom: '1.4vh' }}>⭐ {title}</div>
      {ranking.slice(0, n).map((p, i) => {
        const g = GROUPS.find((x) => x.id === p.group)
        return (
          <div key={p.pid} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '1vh 0.6vw', borderRadius: 14, background: i < 3 ? g?.soft : 'transparent', marginBottom: 4 }}>
            <span className="num" style={{ width: 34, fontWeight: 800, fontSize: 'clamp(16px,1.4vw,26px)', color: 'var(--muted)' }}>{i + 1}</span>
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
