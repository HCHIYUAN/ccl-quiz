import { useEffect, useState } from 'react'
import { onValue, ref } from 'firebase/database'
import { db, r } from '../firebase'
import { TIMER } from '../data/questions'

// 即時訂閱遊戲狀態、玩家與作答；以 Firebase 伺服器時間校正倒數
// 預覽用：網址加 ?demo=waiting|question|reveal|leaderboard|final 可看假資料畫面（不連 Firebase）
function demoData(state) {
  const names = ['王小明', '陳怡君', '林志豪', '張雅婷', '李建宏', '黃淑芬', '吳承恩', '劉佳穎', '蔡宗翰', '鄭雅文', '許志明', '周家豪', '謝佩珊', '郭俊傑', '洪詩涵', '曾柏翰']
  const players = {}
  names.forEach((n, i) => { players['p' + i] = { name: n, group: (i % 4) + 1, joinedAt: i } })
  const qi = state === 'final' ? 9 : state === 'leaderboard' ? 2 : 3
  const answers = {}
  for (let q = 0; q <= qi; q++) {
    answers[q] = {}
    names.forEach((_, i) => { if (state === 'question' && q === qi && i % 3 === 0) return
      answers[q]['p' + i] = { choice: (i * 7 + q * 3) % 5 === 0 ? (q + 1) % 4 : [0, 1, 1, 2, 1, 1, 1, 3, 1, 2][q], ms: 3000 + i * 400 } })
  }
  if (state.startsWith('tb')) {
    const tbGroups = [2, 4]
    const tbAnswers = { 0: {}, 1: {} }
    names.forEach((_, i) => { if (tbGroups.includes((i % 4) + 1)) { tbAnswers[0]['p' + i] = { choice: i % 2 ? 0 : 1, ms: 4000 }; tbAnswers[1]['p' + i] = { choice: 1, ms: 5000 } } })
    const st = state.slice(2) || 'question'
    return { game: { state: st, currentQ: 1, startTime: Date.now() - 6000, mode: 'tb', tbGroups }, players, answers, tbAnswers, offset: 0 }
  }
  return { game: { state: state === 'join' ? 'waiting' : state, currentQ: qi, startTime: Date.now() - 6000 }, players, answers, tbAnswers: {}, offset: 0 }
}

export function useQuiz({ withAnswers = true } = {}) {
  const demo = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('demo')
  const [demoState] = useState(() => (demo ? demoData(demo) : null))
  const live = useLive(withAnswers, !!demo)
  if (demoState) return demoState
  return live
}

function useLive(withAnswers, off) {
  const [game, setGame] = useState(undefined)
  const [players, setPlayers] = useState({})
  const [answers, setAnswers] = useState({})
  const [tbAnswers, setTbAnswers] = useState({})
  const [offset, setOffset] = useState(0)
  useEffect(() => {
    if (off) return
    const u = [
      onValue(r('game'), (s) => setGame(s.val() || { state: 'waiting', currentQ: 0 })),
      onValue(r('players'), (s) => setPlayers(s.val() || {})),
      onValue(ref(db, '.info/serverTimeOffset'), (s) => setOffset(s.val() || 0)),
    ]
    if (withAnswers) {
      u.push(onValue(r('answers'), (s) => setAnswers(s.val() || {})))
      u.push(onValue(r('tbAnswers'), (s) => setTbAnswers(s.val() || {})))
    }
    return () => u.forEach((f) => f())
  }, [withAnswers, off])
  return { game, players, answers, tbAnswers, offset }
}

export function useCountdown(game, offset) {
  const [left, setLeft] = useState(TIMER)
  useEffect(() => {
    if (game?.state !== 'question' || !game?.startTime) { setLeft(TIMER); return }
    const tick = () => setLeft(Math.max(0, TIMER - (Date.now() + offset - game.startTime) / 1000))
    tick()
    const id = setInterval(tick, 200)
    return () => clearInterval(id)
  }, [game?.state, game?.startTime, game?.currentQ, offset])
  return left
}
