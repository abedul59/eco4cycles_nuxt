// server/api/sync.ts
import { defineEventHandler } from 'h3'
import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const apiKey = process.env.FRED_API_KEY
  const now = new Date()
  
  // ================= 1. 底層爬蟲與時間序列演算法 =================
  async function fetchFredData(seriesId: string, daysBack: number) {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - daysBack)
      const startStr = startDate.toISOString().split('T')[0]
      const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&observation_start=${startStr}`
      const response = await fetch(url)
      const data = await response.json()
      return data.observations.filter((obs: any) => obs.value !== '.').map((obs: any) => ({
        date: new Date(obs.date), value: parseFloat(obs.value)
      }))
    } catch { return [] }
  }

  function getNearestObs(data: any[], targetDate: Date) {
    if (data.length === 0) return { date: targetDate, value: 0 };
    return data.reduce((closest, current) => {
      const currentDiff = Math.abs(current.date.getTime() - targetDate.getTime())
      const closestDiff = Math.abs(closest.date.getTime() - targetDate.getTime())
      return currentDiff < closestDiff ? current : closest
    })
  }

  async function fetchAnnualGrowth(seriesId: string) {
    const data = await fetchFredData(seriesId, 1825)
    if (data.length < 4) return null
    const latest = data[data.length - 1]
    const targetDate = new Date(latest.date); targetDate.setFullYear(targetDate.getFullYear() - 1)
    const obs1y = getNearestObs(data, targetDate)
    const yoy = ((latest.value - obs1y.value) / obs1y.value) * 100
    return { latest: Number(latest.value.toFixed(2)), yoy: Number(yoy.toFixed(2)) }
  }

  async function fetchTrendData(seriesId: string, days = 365) {
    const data = await fetchFredData(seriesId, days)
    if (data.length < 2) return null
    const latest = data[data.length - 1]
    const targetDate = new Date(latest.date); targetDate.setDate(targetDate.getDate() - 90)
    const obs3m = getNearestObs(data, targetDate)
    const change = ((latest.value - obs3m.value) / obs3m.value) * 100
    return { latest: Number(latest.value.toFixed(2)), change_3m: Number(change.toFixed(2)), trend_down: change < 0 }
  }

  async function fetchYoyData(seriesId: string) {
    const data = await fetchFredData(seriesId, 1095)
    if (data.length < 16) return null
    const monthlyMap = new Map()
    data.forEach(obs => { monthlyMap.set(`${obs.date.getFullYear()}-${obs.date.getMonth()}`, obs) })
    const dataM = Array.from(monthlyMap.values())
    if (dataM.length < 16) return null
    const latest = dataM[dataM.length - 1]
    const m12Ago = dataM[dataM.length - 13]; const m3Ago = dataM[dataM.length - 4]; const m15Ago = dataM[dataM.length - 16]
    const yoy_now = ((latest.value - m12Ago.value) / m12Ago.value) * 100
    const yoy_3m_ago = ((m3Ago.value - m15Ago.value) / m15Ago.value) * 100
    return { latest: Number(latest.value.toFixed(2)), yoy_now: Number(yoy_now.toFixed(2)), trend_rebound: yoy_now > yoy_3m_ago, yoy_3m_ago: Number(yoy_3m_ago.toFixed(2)) }
  }

  async function fetchPeakReversal(seriesId: string, lookbackYears = 3) {
    const data = await fetchFredData(seriesId, lookbackYears * 365 + 90)
    if (data.length < 3) return null
    const latest = data[data.length - 1]
    const cutoffDate = new Date(latest.date); cutoffDate.setFullYear(cutoffDate.getFullYear() - lookbackYears)
    const periodData = data.filter(obs => obs.date >= cutoffDate)
    const values = (periodData.length > 0 ? periodData : data).map(obs => obs.value)
    const min = Math.min(...values); const max = Math.max(...values)
    return { latest: Number(latest.value.toFixed(2)), min: Number(min.toFixed(2)), max: Number(max.toFixed(2)), pct_from_min: Number((((latest.value - min) / min) * 100).toFixed(2)), pct_from_max: Number((((latest.value - max) / max) * 100).toFixed(2)) }
  }

  async function fetchSaarData(seriesId: string) {
    const data = await fetchFredData(seriesId, 730)
    if (data.length < 3) return null
    const quarterlyMap = new Map()
    data.forEach(obs => { quarterlyMap.set(`${obs.date.getFullYear()}-Q${Math.floor(obs.date.getMonth() / 3) + 1}`, obs) })
    const dataQ = Array.from(quarterlyMap.values())
    if (dataQ.length < 3) return null
    const curr = dataQ[dataQ.length - 1].value; const prev1 = dataQ[dataQ.length - 2].value; const prev2 = dataQ[dataQ.length - 3].value
    const saar_now = (Math.pow(curr / prev1, 4) - 1) * 100; const saar_prev = (Math.pow(prev1 / prev2, 4) - 1) * 100
    return { latest: Number(curr.toFixed(2)), saar_now: Number(saar_now.toFixed(2)), saar_prev: Number(saar_prev.toFixed(2)), rebounding: saar_now > saar_prev }
  }

  // ================= 2. 平行發送 20 個 API 請求 =================
  const [fed, icsa_peak, payems, retail_yoy, retail_ann, pce_ann, pcec96_ann, sentiment, dgorder_yoy, dgorder_ann, pnfi, prfi, gpdic1_ann, gpdic1_saar, pmi, cpi, t10y2y, govt, isratio, dr_con, dr_bus] = await Promise.all([
    fetchTrendData('FEDFUNDS'), fetchPeakReversal('ICSA', 2), fetchAnnualGrowth('PAYEMS'), fetchYoyData('RSAFS'), fetchAnnualGrowth('RSAFS'), fetchAnnualGrowth('PCE'), fetchAnnualGrowth('PCEC96'), fetchPeakReversal('UMCSENT', 1), fetchYoyData('DGORDER'), fetchAnnualGrowth('DGORDER'), fetchAnnualGrowth('PNFI'), fetchAnnualGrowth('PRFI'), fetchAnnualGrowth('GPDIC1'), fetchSaarData('GPDIC1'), fetchTrendData('NAPM', 180), fetchAnnualGrowth('CPIAUCSL'), fetchTrendData('T10Y2Y'), fetchAnnualGrowth('SLEXND'), fetchPeakReversal('ISRATIO', 1), fetchAnnualGrowth('DRCLACBS'), fetchAnnualGrowth('DRBLACBS')
  ])

  // ================= 3. 邏輯判斷 (原始數據計分) =================
  const scores = { recovery: 0, growth: 0, boom_warning: 0, recession: 0, bottom: 0 }
  const details: Record<string, string[]> = { recovery: [], growth: [], boom_warning: [], recession: [], bottom: [] }

  if (fed && (fed.trend_down || fed.latest < 2.5)) { scores.recovery++; details.recovery.push(`貨幣政策寬鬆：聯邦基金利率 ${fed.latest}%`); }
  if (icsa_peak && icsa_peak.pct_from_min < 5.0) { scores.recovery++; details.recovery.push(`就業落底反轉：初領失業金距離谷底僅 ${icsa_peak.pct_from_min}%`); }
  if (retail_yoy && retail_yoy.trend_rebound) { scores.recovery++; details.recovery.push(`零售提早反彈：最新YoY ${retail_yoy.yoy_now}% > 3個月前`); }
  if (dgorder_yoy && (dgorder_yoy.trend_rebound || dgorder_yoy.yoy_now > 0)) { scores.recovery++; details.recovery.push(`投資信心恢復：耐久財訂單不再惡化`); }

  if (payems && payems.yoy > 1.0) { scores.growth++; details.growth.push(`就業穩健擴張：非農就業YoY ${payems.yoy}%`); }
  if (pnfi && pnfi.yoy > 2.0) { scores.growth++; details.growth.push(`企業資本支出強勁：民間固定投資YoY ${pnfi.yoy}%`); }
  if (prfi && prfi.yoy > 2.0) { scores.growth++; details.growth.push(`房產投資升溫：私人住宅投資YoY ${prfi.yoy}%`); }
  if (cpi && cpi.yoy >= 1.5 && cpi.yoy <= 4.0) { scores.growth++; details.growth.push(`通膨溫和：CPI YoY ${cpi.yoy}%`); }

  if (t10y2y && t10y2y.latest < 0) { scores.boom_warning++; details.boom_warning.push(`殖利率倒掛 (末升段訊號)：10減2年利差 ${t10y2y.latest}% < 0`); }
  if (icsa_peak && icsa_peak.pct_from_min > 15.0) { scores.boom_warning++; details.boom_warning.push(`就業U型反轉：初領失業金反彈 ${icsa_peak.pct_from_min}%`); }
  if (retail_ann && pce_ann && retail_ann.yoy < pce_ann.yoy && retail_ann.yoy < 2.0) { scores.boom_warning++; details.boom_warning.push(`零售領先走弱：零售 YoY < PCE YoY`); }
  if (sentiment && sentiment.pct_from_max < -10.0) { scores.boom_warning++; details.boom_warning.push(`信心顯著下滑：距離高點滑落 ${sentiment.pct_from_max}%`); }
  if (dgorder_ann && dgorder_ann.yoy < 0) { scores.boom_warning++; details.boom_warning.push(`民間投資衰退：耐久財 YoY < 0`); }
  if (govt && govt.yoy < 0) { scores.boom_warning++; details.boom_warning.push(`地方政府支出下滑：YoY ${govt.yoy}%`); }
  if (isratio && isratio.min > 0 && isratio.latest > isratio.min * 1.05) { scores.boom_warning++; details.boom_warning.push(`庫存水位攀升：高於低點5%以上`); }
  if (dr_con && dr_bus && dr_con.yoy > 10.0 && dr_bus.yoy > 10.0) { scores.boom_warning++; details.boom_warning.push(`違約率雙破表：皆大於10%`); }

  if (pcec96_ann && pcec96_ann.yoy < 1.0) { scores.recession++; details.recession.push(`消費陡降：實質個人消費 YoY ${pcec96_ann.yoy}% < 1.0%`); }
  if (gpdic1_ann && gpdic1_ann.yoy < 0) { scores.recession++; details.recession.push(`民間投資陷入衰退：實質民間投資 YoY ${gpdic1_ann.yoy}% < 0`); }

  if (gpdic1_saar && gpdic1_saar.rebounding) { scores.bottom++; details.bottom.push(`投資動能轉強：季增年率 ${gpdic1_saar.saar_now}% > 上季`); }
  if (retail_yoy && retail_yoy.trend_rebound) { scores.bottom++; details.bottom.push(`零售提早反彈：最新YoY ${retail_yoy.yoy_now}% > 3個月前`); }
  if (pmi && pmi.latest > 42.0 && !pmi.trend_down) { scores.bottom++; details.bottom.push(`PMI 觸底回升：最新 ${pmi.latest}`); }

  let baseVerdict = "", strategy = ""
  if (scores.recession >= 1) {
    if (scores.bottom >= 2) { baseVerdict = "🥶 衰退期 (末端) - 底部反轉曙光已現"; strategy = "絕佳入市時機！執行 U 型扣款分批大買股票，持有長債享受降息紅利，高收益債亦可搶跌深反彈。"; } 
    else { baseVerdict = "🥶 衰退期 (主跌段) - 景氣嚴冬"; strategy = "重壓無風險長天期公債與美元避險，股市僅限小額定期定額，切勿輕易 All-in 猜底。"; }
  } else if (scores.boom_warning >= 4 || (t10y2y && t10y2y.latest < 0 && scores.boom_warning >= 2)) {
    baseVerdict = "🔥 榮景期 (末端) - 衰退轉折危機"
    strategy = "午夜12點即將到來！迅速將持股降至 30%~50%，重壓長天期公債準備迎接衰退，全面避開高收益債與原物料。"
  } else if (scores.growth >= 3) {
    baseVerdict = "📈 穩定成長期"; strategy = "維持高持股部位，享受時間複利。避開面臨跌價風險的無風險公債，保守者可持有高收益債。"
  } else if (scores.recovery >= 3) {
    baseVerdict = "🌱 景氣復甦期"; strategy = "股市被低估，勇敢錢進風險資產，適度放大槓桿！無風險債券準備獲利了結轉出。"
  } else if (scores.boom_warning >= 1) {
    baseVerdict = "🥂 榮景期 (高檔熱絡)"; strategy = "享受最後的末升段，維持 70% 持股，但不可失去戒心，隨時觀察警訊變化。"
  } else {
    baseVerdict = "🌀 週期過渡期 (多空交雜)"; strategy = "目前多空數據交雜，可能正處於階段轉換的過渡期。建議維持股債平衡配置，靜待更明確的信號。"
  }

  // ================= 4. 🚀 狀態記憶與「60天主流趨勢」嚴格攔截邏輯 =================
  const supabase = await serverSupabaseClient(event)
  let finalVerdict = baseVerdict;

  try {
    // 計算 60 天前的日期，找出這兩個月的軌跡
    const sixtyDaysAgo = new Date(now);
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const sixtyDaysAgoStr = sixtyDaysAgo.toISOString().split('T')[0];

    // 一次撈取過去 60 天的所有紀錄
    const { data: recentRecords } = await supabase
      .from('economic_records')
      .select('verdict')
      .gte('date', sixtyDaysAgoStr)
      .order('date', { ascending: false });

    if (recentRecords && recentRecords.length > 0) {
      const cycleOrder: Record<string, number> = {
        "🌱 景氣復甦期": 1,
        "📈 穩定成長期": 2,
        "🥂 榮景期 (高檔熱絡)": 3,
        "🔥 榮景期 (末端) - 衰退轉折危機": 3,
        "🥶 衰退期 (主跌段) - 景氣嚴冬": 4,
        "🥶 衰退期 (末端) - 底部反轉曙光已現": 4,
        "🌀 週期過渡期 (Transition)": 0,
        "🌀 週期過渡期 (多空交雜)": 0
      }

      // 🔍 核心邏輯：找出這 60 天最常出現的「主流狀態」(排除過渡期)
      const counts: Record<string, number> = {};
      let dominantVerdict = recentRecords[0].verdict; // 若無主流，預設為最新一筆
      let maxCount = 0;

      for (const record of recentRecords) {
        const v = record.verdict;
        if (cycleOrder[v] !== 0) { // 只統計確認的四大階段
          counts[v] = (counts[v] || 0) + 1;
          if (counts[v] > maxCount) {
            maxCount = counts[v];
            dominantVerdict = v;
          }
        }
      }

      // 將主流狀態與今日計算結果做權重比對
      const prevWeight = cycleOrder[dominantVerdict] || 0;
      const currentWeight = cycleOrder[baseVerdict] || 0;

      if (prevWeight !== 0 && currentWeight !== 0) {
        // 🚨 規則 1：【榮景期特判】過去兩個月的主流是榮景，就不可能跌回復甦/成長！
        if (prevWeight === 3 && (currentWeight === 1 || currentWeight === 2)) {
          finalVerdict = "🌀 週期過渡期 (Transition)";
          strategy = `⚠️ 【Izzax 理論：雜訊過濾】過去兩個月的景氣主流為【${dominantVerdict}】。依據景氣循環理論，榮景過後必為衰退，不可能倒退回復甦或成長。今日數據 (${baseVerdict}) 判定為短期雜訊干擾。建議維持「榮景期」部位策略，靜待數據確認。`;
        } 
        // 🚨 規則 2：【一般逆行攔截】(排除 4變1 正常的落底復甦)
        else if (currentWeight < prevWeight && !(prevWeight === 4 && currentWeight === 1)) {
          finalVerdict = "🌀 週期過渡期 (Transition)";
          strategy = `⚠️ 【順序逆行警報】過去兩個月的主流狀態為【${dominantVerdict}】，景氣無法時空逆行回【${baseVerdict}】。判定為短期數據雜訊，建議維持觀望。`;
        }
        // 🚨 規則 3：【過度跳躍攔截】
        else if (currentWeight - prevWeight > 1 && !(prevWeight === 4 && currentWeight === 1)) {
          finalVerdict = "🌀 週期過渡期 (Transition)";
          strategy = `⚠️ 【過度跳躍警報】指標從主流的【${dominantVerdict}】直接跳級至【${baseVerdict}】。缺乏中間傳導過程，判定為過渡期。`;
        }
      }
    }
  } catch (err) {
    console.log("無法取得歷史紀錄進行主流狀態比對", err)
  }

  const raw_data = {
    "FEDFUNDS (聯邦基準利率)": fed ? `${fed.latest}%` : "N/A", "ICSA (初領失業金反彈)": icsa_peak ? `${icsa_peak.pct_from_min}%` : "N/A",
    "PAYEMS (非農就業 YoY)": payems ? `${payems.yoy}%` : "N/A", "RSAFS (零售銷售 YoY)": retail_ann ? `${retail_ann.yoy}%` : "N/A",
    "PCE (個人消費 YoY)": pce_ann ? `${pce_ann.yoy}%` : "N/A", "PCEC96 (實質消費 YoY)": pcec96_ann ? `${pcec96_ann.yoy}%` : "N/A",
    "UMCSENT (信心高點滑落)": sentiment ? `${sentiment.pct_from_max}%` : "N/A", "DGORDER (耐久財 YoY)": dgorder_ann ? `${dgorder_ann.yoy}%` : "N/A",
    "PNFI (民間固定投資 YoY)": pnfi ? `${pnfi.yoy}%` : "N/A", "PRFI (私人住宅 YoY)": prfi ? `${prfi.yoy}%` : "N/A",
    "GPDIC1 (實質民間投資 YoY)": gpdic1_ann ? `${gpdic1_ann.yoy}%` : "N/A", "GPDIC1 Saar (季增年率)": gpdic1_saar ? `${gpdic1_saar.saar_now}%` : "N/A",
    "NAPM (採購經理人 PMI)": pmi ? `${pmi.latest}` : "N/A", "CPIAUCSL (通膨 YoY)": cpi ? `${cpi.yoy}%` : "N/A",
    "T10Y2Y (10減2年利差)": t10y2y ? `${t10y2y.latest}%` : "N/A", "SLEXND (地方政府支出 YoY)": govt ? `${govt.yoy}%` : "N/A",
    "ISRATIO (庫存銷售比)": isratio ? `${isratio.latest}` : "N/A", "DRCLACBS (消費違約 YoY)": dr_con ? `${dr_con.yoy}%` : "N/A",
    "DRBLACBS (企業違約 YoY)": dr_bus ? `${dr_bus.yoy}%` : "N/A",
  }

  const today = now.toLocaleDateString('en-CA')
  const record = { date: today, verdict: finalVerdict, strategy, scores, details, raw_data }
  const { error } = await supabase.from('economic_records').upsert(record, { onConflict: 'date' })

  return { success: true, db_error: error ? error.message : null, data: record }
})
