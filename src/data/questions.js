// 10 題 × 10 分 = 100 分；ans 為正確選項索引（0=A）
export const TIMER = 30 // 每題秒數

export const QUESTIONS = [
  { cat: '基礎', q: '電路板業說的「PP」是指什麼？',
    opts: ['聚丙烯（Polypropylene）薄膜', '玻纖布含浸樹脂、半硬化的膠片', '銅箔表面的保護膜', '壓合用的離型紙'], ans: 1,
    exp: 'PP＝Prepreg（預浸材、膠片）：玻纖布含浸樹脂後烘到半硬化，多層板壓合時再熔融、交聯，把各層黏在一起。不是聚丙烯！' },
  { cat: '電性', q: '高速伺服器用的板材，最在意下列哪個電性指標要低？',
    opts: ['體積電阻率', '介電強度（耐電壓）', '介質損耗因子 Df', '表面電阻'], ans: 2,
    exp: 'Df 是訊號每走一步被材料吸走的能量比例，被吸走的能量變成熱。頻率越高、Df 的影響越大。' },
  { cat: '化學', q: 'CCL 壓合硬化，和 UV 硬化、不飽和聚酯（苯乙烯＋過氧化物）硬化，三者的共同點是？',
    opts: ['都是自由基加成交聯', '都是縮合反應、會放出水', '都需要胺類硬化劑', '都是陽離子聚合'], ans: 0,
    exp: '三者都是自由基打開雙鍵交聯，差在起始方式：UV 用光起始劑；不飽和聚酯與 CCL 用過氧化物，CCL 在約 200 °C 壓合時分解。' },
  { cat: '化學', q: '環氧樹脂用胺硬化後，Df 偏高的「主要」原因是？',
    opts: ['胺基殘留未反應', '交聯密度不足', '芳香環比例太高', '開環後產生二級羥基（OH）'], ans: 3,
    exp: '每開一個環氧環就留下一個 OH，強極性基會隨電場轉動、吸收能量。高速 CCL 的共通原則是「交聯時不新增 OH」。' },
  { cat: '化學', q: '想做 Df 最低的樹脂，下列哪一種主骨架最合適？',
    opts: ['雙酚 A 型環氧', '酚醛樹脂', '苯乙烯系碳氫樹脂', '脂肪族聚氨酯'], ans: 2,
    exp: '環氧、酚醛帶 OH，聚氨酯帶 N–H 與 C=O；苯乙烯系碳氫幾乎沒有極性基，Df 可到 0.001 等級。' },
  { cat: '電性', q: 'Dk（介電常數）主要影響的是？',
    opts: ['訊號傳遞速度與阻抗', '訊號能量的損耗', '板材的耐熱性', '銅箔的密著力'], ans: 0,
    exp: 'Dk 決定訊號走多快與阻抗，可以靠線寬、介電層厚度補償；損耗是 Df 的事，補不回來，所以業界最在意 Df。' },
  { cat: '量測', q: '同一片 CCL，在 1 GHz 和 10 GHz 量到的 Df，通常會怎樣？',
    opts: ['完全相同', '10 GHz 一定比較低', '只和板厚有關', '不同；比較數據必須註明頻率與測法'], ans: 3,
    exp: 'Df 隨頻率改變，量測方法（共振腔、SPDR 等）也有差異；同一料號換測法就可能差 0.0003，跨廠比較只能看數量級。' },
  { cat: '材料', q: 'SMA（苯乙烯–馬來酸酐共聚物）在 CCL 配方中常扮演什麼角色？',
    opts: ['阻燃劑', '環氧的硬化劑', '增韌劑', '玻纖的偶合劑'], ans: 1,
    exp: 'SMA 以酸酐與環氧反應，取代 Dicy 等胺類硬化劑，Df 較低，可把環氧系 CCL 推進中低損耗等級。' },
  { cat: '產業', q: 'AI 伺服器用的 M8 級 CCL，Df 大約是多少（10 GHz）？',
    opts: ['0.0002', '0.002', '0.008', '0.02'], ans: 1,
    exp: 'M8 級約 0.0012–0.002；一般 FR-4 約 0.015 以上。速率每翻倍，Df 就要再降一級。' },
  { cat: '產業', q: '終端客戶對 CCL 樹脂最強烈的要求是？',
    opts: ['高剝離強度', '低 CTE', '高 Tg', '低 Df（含熱老化後的穩定性）'], ans: 3,
    exp: '要求順序是低 Df、低 CTE、高剝離，其中低 Df 最強烈，而且要看熱老化後是否仍然穩定。' },
]

// 加賽 3 題：只有同分者作答
export const TIEBREAK = [
  { cat: '加賽', q: '高速 CCL 的交聯基團，從丙烯酸酯走向苯乙烯基，「主要」原因是？',
    opts: ['酯基的 C=O 極性高，會推高 Df', '丙烯酸酯耐熱不足', '苯乙烯基反應速率較快', '丙烯酸酯價格較高'], ans: 0,
    exp: '苯乙烯基、乙烯苄基是全碳氫結構，極性低；丙烯酸酯的酯基 C=O 會推高 Df。' },
  { cat: '加賽', q: '改用極低粗糙度的 HVLP 銅箔，最主要的代價是？',
    opts: ['Df 上升', '剝離強度下降', 'CTE 上升', '蝕刻變困難'], ans: 1,
    exp: '銅面越平，樹脂越咬不住，剝離強度要靠樹脂本身的極性與密著設計。' },
  { cat: '加賽', q: '無布 CCL 拿掉玻纖布之後，原本由玻纖負責壓住的 CTE，改由誰承擔？',
    opts: ['銅箔', '交聯劑', '樹脂與填料', '阻燃劑'], ans: 2,
    exp: '沒有玻纖壓住膨脹，就要靠低 CTE 的樹脂與高填充的球形填料。' },
]

export const GROUPS = [
  { id: 1, name: '研究本部', lead: '黃建龍課長', color: '#6BAEF0', soft: '#DDEBFB', emoji: '🔬' },
  { id: 2, name: '能量固化樹脂部', lead: '吳文杰課長', color: '#4FC3A1', soft: '#D8F3EA', emoji: '💡' },
  { id: 3, name: '功能性樹脂部', lead: '盧義雄課長', color: '#FF8C7A', soft: '#FFE3DD', emoji: '🧴' },
  { id: 4, name: '電子化學部', lead: '葉子正課長', color: '#F2B632', soft: '#FDF0CC', emoji: '⚡' },
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

// 依遊戲模式取題目與作答路徑（main＝正式 10 題，tb＝加賽）
export const isTb = (game) => game?.mode === 'tb'
export const qsetOf = (game) => (isTb(game) ? TIEBREAK : QUESTIONS)
export const ansKeyOf = (game) => (isTb(game) ? 'tbAnswers' : 'answers')
export const tbEligible = (game, pid, player) =>
  (game?.tbGroups || []).includes(player?.group) || (game?.tbPlayers || []).includes(pid)
