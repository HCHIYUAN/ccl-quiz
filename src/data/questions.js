// 10 題 × 10 分 = 100 分；ans 為正確選項索引（0=A）
export const TIMER = 20 // 每題秒數

export const QUESTIONS = [
  { cat: '基礎', q: 'CCL 的中文名稱是？',
    opts: ['銅箔基板', 'IC 載板', '軟性電路板', '陶瓷基板'], ans: 0,
    exp: 'CCL＝Copper Clad Laminate，銅箔基板。介質層兩面貼銅，是多層電路板的核心材料。' },
  { cat: '基礎', q: '在 CCL 裡，玻纖布主要扮演什麼角色？',
    opts: ['導電線路', '骨架：提供強度與尺寸穩定', '阻燃', '啟動交聯反應'], ans: 1,
    exp: '玻纖布是骨架；導電靠銅箔、阻燃靠阻燃劑、啟動交聯靠起始劑。' },
  { cat: '電性', q: '把訊號比喻成走路，Df 比較像什麼？',
    opts: ['路面讓你走多快', '每一步被吸走的力氣', '路線有多長', '路上的紅綠燈'], ans: 1,
    exp: 'Dk 決定走多快；Df 是每一步被吸走的力氣，被吸走的能量變成熱，訊號就變弱。' },
  { cat: '電性', q: '在 56 GHz，只把 Df 從 0.004 降到 0.002，介質損耗大約減少多少？',
    opts: ['約 7%', '約 25%', '約 50%', '約 90%'], ans: 2,
    exp: '介質損耗 ≈ 2.3 × f × Df × √Dk，Df 是一次方，減半就少一半；只降 Dk 3.5→3.0 約少 7%。' },
  { cat: '電性', q: '傳輸速率從 112G 升到 224G，材料 Df 通常要怎樣？',
    opts: ['維持不變', '再降一級', '可以升高', '只要降 Dk 就好'], ans: 1,
    exp: '速率翻倍、頻率翻倍，介質損耗也約翻倍，所以 Df 每一代都要再降一級。' },
  { cat: '材料', q: '石英布（Q-glass）相較於一般 E-glass 玻纖布，最大的優勢是？',
    opts: ['價格便宜', 'Dk 與 CTE 都更低', '比較好加工', '可以導電'], ans: 1,
    exp: '石英布 Dk 約 3.7、CTE 約 0.5 ppm/K（E-glass 約 6.8、5.6），但成本約為 E-glass 的 40 倍。' },
  { cat: '材料', q: 'HVLP 銅箔最主要的特徵是？',
    opts: ['特別厚', '表面粗糙度極低', '內含玻纖', '不需要樹脂'], ans: 1,
    exp: 'HVLP 是極低粗糙度銅箔，訊號路徑短、損耗低；代價是樹脂不容易咬住，剝離強度要靠樹脂本身。' },
  { cat: '產業', q: 'AI 伺服器電路板層數越來越多，下列哪一項「不是」原因？',
    opts: ['差動訊號線變多', '大電流需要多層厚銅', '高速訊號需要接地參考層', '為了降低材料成本'], ans: 3,
    exp: '層數變多是因為訊號、電源與參考層都在增加，成本反而上升；板越厚，Z 軸 CTE 越重要。' },
  { cat: '化學', q: 'CCL 壓合硬化與 UV 硬化的共同點是？',
    opts: ['都靠光起始劑', '都是自由基交聯', '都在室溫進行', '都靠環氧開環'], ans: 1,
    exp: '兩者都是自由基交聯；差別在起始方式：CCL 用過氧化物約 200 °C 受熱分解，UV 用光起始劑。' },
  { cat: '產業', q: '終端客戶（CCL 大廠）對樹脂最強烈的要求是？',
    opts: ['高剝離強度', '低 CTE', '低 Df（含熱處理後的穩定性）', '低價格'], ans: 2,
    exp: '要求順序是低 Df、低 CTE、高剝離，其中低 Df 最強烈，而且要看熱老化後是否穩定。' },
]

export const GROUPS = [
  { id: 1, name: '第 1 組', nick: '珊瑚', color: '#FF8C7A', soft: '#FFE3DD', emoji: '🪸' },
  { id: 2, name: '第 2 組', nick: '薄荷', color: '#4FC3A1', soft: '#D8F3EA', emoji: '🌿' },
  { id: 3, name: '第 3 組', nick: '天空', color: '#6BAEF0', soft: '#DDEBFB', emoji: '☁️' },
  { id: 4, name: '第 4 組', nick: '檸檬', color: '#F2B632', soft: '#FDF0CC', emoji: '🍋' },
]

export const OPTS = [
  { label: 'A', color: '#A98BEF', soft: '#EEE7FD' },
  { label: 'B', color: '#FF9E6D', soft: '#FFE9DC' },
  { label: 'C', color: '#4DBAD6', soft: '#DDF3F9' },
  { label: 'D', color: '#8CC152', soft: '#E9F5DC' },
]

export function levelOf(score) {
  if (score >= 90) return { t: 'CCL 達人', e: '🏆' }
  if (score >= 70) return { t: '漸入佳境', e: '🚀' }
  if (score >= 40) return { t: '入門有成', e: '🌱' }
  return { t: '新手上路', e: '🐣' }
}
