// server/api/sync.ts
import { defineEventHandler, getQuery } from 'h3'
import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const apiKey = process.env.FRED_API_KEY
  const now = new Date()
  const supabase = await serverSupabaseClient(event)
  const query = getQuery(event)
  const manualPmiInput = query.pmi ? parseFloat(query.pmi as string) : null

  // 提前去資料庫撈取「最新一筆歷史紀錄」
  const { data: lastRecord } = await supabase
    .from('economic_records')
    .select('verdict, raw_data')
    .order('date', { ascending: false })
    .limit(1)
    .single()

  let prevPmiVal = null
  if (lastRecord?.raw_data?.['ISM PMI (製造業採購經理人)']) {
    const prevStr = lastRecord.raw_data['ISM PMI (製造業採購經理人)']
    const match = prevStr.match(/[\d.]+/)
    if (match) prevPmiVal = parseFloat(match[0])
  }

  // 智慧 PMI 處理邏輯
  let pmi = null
  if (manualPmiInput !== null && !isNaN(manualPmiInput)) {
    pmi = { latest: manualPmiInput, trend_down: prevPmiVal !== null ? manualPmiInput < prevPmiVal : false }
  } else if (prevPmiVal !== null) {
    pmi = { latest: prevPmiVal, trend_down: false }
  }

  // ================= 1. 底層爬蟲與時間序列演算法 =================
  async function fetchFredData(seriesId: string, daysBack: number) {
    try {
      const startDate = new Date(); startDate.setDate(startDate.getDate() - daysBack);
      const startStr = startDate.toISOString().split('T')[0];
      const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&observation_start=${startStr}`;
      const response = await fetch(url);
      const data = await response.json();
      return data.observations.filter((obs: any) => obs.value !== '.').map((obs: any) => ({
        date: new Date(obs.date), value: parseFloat(obs.value)
      }));
    } catch { return []; }
  }

  function getNearestObs(data: any[], targetDate: Date) {
    if (data.length === 0) return { date: targetDate, value: 0 };
    return data.reduce((closest, current) => {
      return Math.abs(current.date.getTime() - targetDate.getTime()) < Math.abs(closest.date.getTime() - targetDate.getTime()) ? current : closest;
    });
  }

  async function fetchAnnualGrowth(seriesId: string) {
    const data = await fetchFredData(seriesId, 1825);
    if (data.length < 4) return null;
    const latest = data[data.length - 1];
    const targetDate = new Date(latest.date); targetDate.setFullYear(targetDate.getFullYear() - 1);
    const obs1y = getNearestObs(data, targetDate);
    const yoy = ((latest.value - obs1y.value) / obs1y.value) * 100;
    return { latest: Number(latest.value.toFixed(2)), yoy: Number(yoy.toFixed(2)) };
  }

  async function fetchTrendData(seriesId: string, days = 365) {
    const data = await fetchFredData(seriesId, days);
    if (data.length < 2) return null;
    const latest = data[data.length - 1];
    const targetDate = new Date(latest.date); targetDate.setDate(targetDate.getDate() - 90);
    const obs3m = getNearestObs(data, targetDate);
    const change = ((latest.value - obs3m.value) / obs3m.value) * 100;
    // 🌟 修改：新增回傳 3 個月前的數值 (prev)
    return { latest: Number(latest.value.toFixed(2)), prev: Number(obs3m.value.toFixed(2)), change_3m: Number(change.toFixed(2)), trend_down: change < 0 };
  }

  async function fetchYoyData(seriesId: string) {
    const data = await fetchFredData(seriesId, 1095);
    if (data.length < 16) return null;
    const monthlyMap = new Map();
    data.forEach(obs => { monthlyMap.set(`${obs.date.getFullYear()}-${obs.date.getMonth()}`, obs) });
    const dataM = Array.from(monthlyMap.values());
    if (dataM.length < 16) return null;
    const latest = dataM[dataM.length - 1];
    const m12Ago = dataM[dataM.length - 13], m3Ago = dataM[dataM.length - 4], m15Ago = dataM[dataM.length - 16];
    const yoy_now = ((latest.value - m12Ago.value) / m12Ago.value) * 100;
    const yoy_3m_ago = ((m3Ago.value - m15Ago.value) / m15Ago.value) * 100;
    return { latest: Number(latest.value.toFixed(2)), yoy_now: Number(yoy_now.toFixed(2)), trend_rebound: yoy_now > yoy_3m_ago, yoy_3m_ago: Number(yoy_3m_ago.toFixed(2)) };
  }

  async function fetchPeakReversal(seriesId: string, lookbackYears = 3) {
    const data = await fetchFredData(seriesId, lookbackYears * 365 + 90);
    if (data.length < 3) return null;
    const latest = data[data.length - 1];
    const cutoffDate = new Date(latest.date); cutoffDate.setFullYear(cutoffDate.getFullYear() - lookbackYears);
    const periodData = data.filter(obs => obs.date >= cutoffDate);
    const values = (periodData.length > 0 ? periodData : data).map(obs => obs.value);
    const min = Math.min(...values), max = Math.max(...values);
    return { latest: Number(latest.value.toFixed(2)), min: Number(min.toFixed(2)), max: Number(max.toFixed(2)), pct_from_min: Number((((latest.value - min) / min) * 100).toFixed(2)), pct_from_max: Number((((latest.value - max) / max) * 100).toFixed(2)) };
  }

  async function fetchSaarData(seriesId: string) {
    const data = await fetchFredData(seriesId, 730);
    if (data.length < 3) return null;
    const quarterlyMap = new Map();
    data.forEach(obs => { quarterlyMap.set(`${obs.date.getFullYear()}-Q${Math.floor(obs.date.getMonth() / 3) + 1}`, obs) });
    const dataQ = Array.from(quarterlyMap.values());
    if (dataQ.length < 3) return null;
    const curr = dataQ[dataQ.length - 1].value, prev1 = dataQ[dataQ.length - 2].value, prev2 = dataQ[dataQ.length - 3].value;
    const saar_now = (Math.pow(curr / prev1, 4) - 1) * 100, saar_prev = (Math.pow(prev1 / prev2, 4) - 1) * 100;
    return { latest: Number(curr.toFixed(2)), saar_now: Number(saar_now.toFixed(2)), saar_prev: Number(saar_prev.toFixed(2)), rebounding: saar_now > saar_prev };
  }

  // ================= 2. 平行發送 19 個 API 請求 =================
  const [fed, icsa_peak, payems, retail_yoy, retail_ann, pce_ann, pcec96_ann, sentiment, dgorder_yoy, dgorder_ann, pnfi, prfi, gpdic1_ann, gpdic1_saar, cpi, t10y2y, govt, isratio, dr_con, dr_bus] = await Promise.all([
    fetchTrendData('FEDFUNDS'), fetchPeakReversal('ICSA', 2), fetchAnnualGrowth('PAYEMS'), fetchYoyData('RSAFS'), fetchAnnualGrowth('RSAFS'), fetchAnnualGrowth('PCE'), fetchAnnualGrowth('PCEC96'), fetchPeakReversal('UMCSENT', 1), fetchYoyData('DGORDER'), fetchAnnualGrowth('DGORDER'), fetchAnnualGrowth('PNFI'), fetchAnnualGrowth('PRFI'), fetchAnnualGrowth('GPDIC1'), fetchSaarData('GPDIC1'), fetchAnnualGrowth('CPIAUCSL'), fetchTrendData('T10Y2Y'), fetchAnnualGrowth('SLEXPND'), fetchPeakReversal('ISRATIO', 1), fetchAnnualGrowth('DRCLACBS'), fetchAnnualGrowth('DRBLACBS')
  ]);

  // ================= 3. 🌟 全透視診斷陣列 (包含「前值」顯示) =================
  const details = {
    recovery: [
      { desc: "貨幣政策寬鬆 (利率趨降或 < 2.5%)", val: fed ? `${fed.latest}% (3個月前: ${fed.prev}%)` : "N/A", met: !!(fed && (fed.trend_down || fed.latest < 2.5)) },
      { desc: "就業落底反轉 (初領失業金距低點 < 5%)", val: icsa_peak ? `反彈 ${icsa_peak.pct_from_min}% (谷底: ${icsa_peak.min})` : "N/A", met: !!(icsa_peak && icsa_peak.pct_from_min < 5.0) },
      { desc: "零售提早反彈 (YoY大於3個月前)", val: retail_yoy ? `YoY ${retail_yoy.yoy_now}% (3個月前: ${retail_yoy.yoy_3m_ago}%)` : "N/A", met: !!(retail_yoy && retail_yoy.trend_rebound) },
      { desc: "投資信心恢復 (耐久財YoY反彈或 > 0)", val: dgorder_yoy ? `YoY ${dgorder_yoy.yoy_now}% (3個月前: ${dgorder_yoy.yoy_3m_ago}%)` : "N/A", met: !!(dgorder_yoy && (dgorder_yoy.trend_rebound || dgorder_yoy.yoy_now > 0)) }
    ],
    growth: [
      { desc: "就業穩健擴張 (非農就業 YoY > 1.0%)", val: payems ? `YoY ${payems.yoy}%` : "N/A", met: !!(payems && payems.yoy > 1.0) },
      { desc: "企業資本支出強勁 (民間固定投資 YoY > 2.0%)", val: pnfi ? `YoY ${pnfi.yoy}%` : "N/A", met: !!(pnfi && pnfi.yoy > 2.0) },
      { desc: "房產投資升溫 (私人住宅投資 YoY > 2.0%)", val: prfi ? `YoY ${prfi.yoy}%` : "N/A", met: !!(prfi && prfi.yoy > 2.0) },
      { desc: "通膨溫和 (CPI YoY 介於 1.5% ~ 4.0%)", val: cpi ? `YoY ${cpi.yoy}%` : "N/A", met: !!(cpi && cpi.yoy >= 1.5 && cpi.yoy <= 4.0) }
    ],
    boom_warning: [
      { desc: "殖利率倒掛 (10減2年利差 < 0)", val: t10y2y ? `${t10y2y.latest}%` : "N/A", met: !!(t10y2y && t10y2y.latest < 0) },
      { desc: "就業U型反轉 (初領失業金距低點 > 15%)", val: icsa_peak ? `反彈 ${icsa_peak.pct_from_min}% (谷底: ${icsa_peak.min})` : "N/A", met: !!(icsa_peak && icsa_peak.pct_from_min > 15.0) },
      { desc: "零售領先走弱 (零售 YoY < PCE YoY 且 < 2%)", val: (retail_ann && pce_ann) ? `零售 ${retail_ann.yoy}% / PCE ${pce_ann.yoy}%` : "N/A", met: !!(retail_ann && pce_ann && retail_ann.yoy < pce_ann.yoy && retail_ann.yoy < 2.0) },
      { desc: "信心顯著下滑 (密大信心距高點跌 > 10%)", val: sentiment ? `跌 ${sentiment.pct_from_max}% (高點: ${sentiment.max})` : "N/A", met: !!(sentiment && sentiment.pct_from_max < -10.0) },
      { desc: "民間投資衰退 (耐久財 YoY < 0)", val: dgorder_ann ? `YoY ${dgorder_ann.yoy}%` : "N/A", met: !!(dgorder_ann && dgorder_ann.yoy < 0) },
      { desc: "政府支出下滑 (地方政府支出 YoY < 0)", val: govt ? `YoY ${govt.yoy}%` : "N/A", met: !!(govt && govt.yoy < 0) },
      { desc: "庫存水位攀升 (庫存比大於低點 5%)", val: isratio ? `${isratio.latest} (低點: ${isratio.min})` : "N/A", met: !!(isratio && isratio.min > 0 && isratio.latest > isratio.min * 1.05) },
      { desc: "違約率雙破表 (消費與企業違約皆 > 10%)", val: (dr_con && dr_bus) ? `消費 ${dr_con.yoy}% / 企業 ${dr_bus.yoy}%` : "N/A", met: !!(dr_con && dr_bus && dr_con.yoy > 10.0 && dr_bus.yoy > 10.0) }
    ],
    recession: [
      { desc: "消費陡降 (實質個人消費 YoY < 1.0%)", val: pcec96_ann ? `YoY ${pcec96_ann.yoy}%` : "N/A", met: !!(pcec96_ann && pcec96_ann.yoy < 1.0) },
      { desc: "民間投資陷入衰退 (實質民間投資 YoY < 0)", val: gpdic1_ann ? `YoY ${gpdic1_ann.yoy}%` : "N/A", met: !!(gpdic1_ann && gpdic1_ann.yoy < 0) }
    ],
    bottom: [
      { desc: "投資動能轉強 (GPDIC1 季增年率大於上季)", val: gpdic1_saar ? `SAAR ${gpdic1_saar.saar_now}% (上季: ${gpdic1_saar.saar_prev}%)` : "N/A", met: !!(gpdic1_saar && gpdic1_saar.rebounding) },
      { desc: "零售提早反彈 (YoY大於3個月前)", val: retail_yoy ? `YoY ${retail_yoy.yoy_now}% (3個月前: ${retail_yoy.yoy_3m_ago}%)` : "N/A", met: !!(retail_yoy && retail_yoy.trend_rebound) },
      { desc: "PMI 觸底回升 (大於 42 且未衰退)", val: pmi ? `${pmi.latest} (前值: ${prevPmiVal !== null ? prevPmiVal : '無'})` : "尚未輸入", met: !!(pmi && pmi.latest > 42.0 && !pmi.trend_down) }
    ]
  };

  // 自動統計得分
  const scores = {
    recovery: details.recovery.filter(d => d.met).length,
    growth: details.growth.filter(d => d.met).length,
    boom_warning: details.boom_warning.filter(d => d.met).length,
    recession: details.recession.filter(d => d.met).length,
    bottom: details.bottom.filter(d => d.met).length,
  };

  let baseVerdict = "", strategy = "";
  if (scores.recession >= 1) {
    if (scores.bottom >= 2) { baseVerdict = "🥶 衰退期 (末端) - 底部反轉曙光已現"; strategy = "絕佳入市時機！執行 U 型扣款分批大買股票，持有長債享受降息紅利，高收益債亦可搶跌深反彈。"; } 
    else { baseVerdict = "🥶 衰退期 (主跌段) - 景氣嚴冬"; strategy = "重壓無風險長天期公債與美元避險，股市僅限小額定期定額，切勿輕易 All-in 猜底。"; }
  } else if (scores.boom_warning >= 4 || (t10y2y && t10y2y.latest < 0 && scores.boom_warning >= 2)) {
    baseVerdict = "🔥 榮景期 (末端) - 衰退轉折危機"; strategy = "午夜12點即將到來！迅速將持股降至 30%~50%，重壓長天期公債準備迎接衰退。";
  } else if (scores.growth >= 3) {
    baseVerdict = "📈 穩定成長期"; strategy = "維持高持股部位，享受時間複利。避開面臨跌價風險的無風險公債，保守者可持有高收益債。";
  } else if (scores.recovery >= 3) {
    baseVerdict = "🌱 景氣復甦期"; strategy = "股市被低估，勇敢錢進風險資產，適度放大槓桿！無風險債券準備獲利了結轉出。";
  } else if (scores.boom_warning >= 1) {
    baseVerdict = "🥂 榮景期 (高檔熱絡)"; strategy = "享受最後的末升段，維持 70% 持股，但不可失去戒心，隨時觀察警訊變化。";
  } else {
    baseVerdict = "🌀 週期過渡期 (多空交雜)"; strategy = "目前多空數據交雜，可能正處於階段轉換的過渡期。建議維持股債平衡配置。";
  }

  // ================= 4. 🚀 狀態記憶與「基底注入」嚴格攔截邏輯 =================
  let finalVerdict = baseVerdict;
  try {
    const { data: recentRecords } = await supabase.from('economic_records').select('verdict').gte('date', new Date(now.setDate(now.getDate() - 120)).toISOString().split('T')[0]).order('date', { ascending: false });
    const cycleOrder: Record<string, number> = { "🌱 景氣復甦期": 1, "📈 穩定成長期": 2, "🥂 榮景期 (高檔熱絡)": 3, "🔥 榮景期 (末端) - 衰退轉折危機": 3, "🥶 衰退期 (主跌段) - 景氣嚴冬": 4, "🥶 衰退期 (末端) - 底部反轉曙光已現": 4, "🌀 週期過渡期 (Transition)": 0, "🌀 週期過渡期 (多空交雜)": 0 };
    const counts: Record<string, number> = { "🥂 榮景期 (高檔熱絡)": 90 };
    let dominantVerdict = "🥂 榮景期 (高檔熱絡)", maxCount = 90;

    if (recentRecords) {
      for (const r of recentRecords) {
        if (cycleOrder[r.verdict] !== 0) {
          counts[r.verdict] = (counts[r.verdict] || 0) + 1;
          if (counts[r.verdict] > maxCount) { maxCount = counts[r.verdict]; dominantVerdict = r.verdict; }
        }
      }
    }

    const prevW = cycleOrder[dominantVerdict] || 0, curW = cycleOrder[baseVerdict] || 0;
    if (prevW !== 0 && curW !== 0) {
      if (prevW === 3 && (curW === 1 || curW === 2)) {
        finalVerdict = "🌀 週期過渡期 (Transition)";
        strategy = `⚠️ 【雜訊過濾】過去四個月大趨勢為【${dominantVerdict}】。今日數據 (${baseVerdict}) 判定為短期雜訊。建議維持「榮景期」策略。`;
      } else if (curW < prevW && !(prevW === 4 && curW === 1)) {
        finalVerdict = "🌀 週期過渡期 (Transition)"; strategy = `⚠️ 【順序逆行】大趨勢為【${dominantVerdict}】，無法逆行回【${baseVerdict}】。`;
      } else if (curW - prevW > 1 && !(prevW === 4 && curW === 1)) {
        finalVerdict = "🌀 週期過渡期 (Transition)"; strategy = `⚠️ 【跳躍警報】從【${dominantVerdict}】跳至【${baseVerdict}】。判定為過渡期。`;
      }
    }
  } catch (err) { console.log("無法取得歷史", err) }

  const raw_data = {
    "FEDFUNDS (聯邦基準利率)": fed ? `${fed.latest}%` : "N/A", "ICSA (初領失業金反彈)": icsa_peak ? `${icsa_peak.pct_from_min}%` : "N/A",
    "PAYEMS (非農就業 YoY)": payems ? `${payems.yoy}%` : "N/A", "RSAFS (零售銷售 YoY)": retail_ann ? `${retail_ann.yoy}%` : "N/A",
    "PCE (個人消費 YoY)": pce_ann ? `${pce_ann.yoy}%` : "N/A", "PCEC96 (實質消費 YoY)": pcec96_ann ? `${pcec96_ann.yoy}%` : "N/A",
    "UMCSENT (信心高點滑落)": sentiment ? `${sentiment.pct_from_max}%` : "N/A", "DGORDER (耐久財 YoY)": dgorder_ann ? `${dgorder_ann.yoy}%` : "N/A",
    "PNFI (民間固定投資 YoY)": pnfi ? `${pnfi.yoy}%` : "N/A", "PRFI (私人住宅 YoY)": prfi ? `${prfi.yoy}%` : "N/A",
    "GPDIC1 (實質民間投資 YoY)": gpdic1_ann ? `${gpdic1_ann.yoy}%` : "N/A", "GPDIC1 Saar (季增年率)": gpdic1_saar ? `${gpdic1_saar.saar_now}%` : "N/A",
    "ISM PMI (製造業採購經理人)": pmi ? `${pmi.latest}` : "尚未輸入", "CPIAUCSL (通膨 YoY)": cpi ? `${cpi.yoy}%` : "N/A",
    "T10Y2Y (10減2年利差)": t10y2y ? `${t10y2y.latest}%` : "N/A", "SLEXPND (地方政府支出 YoY)": govt ? `${govt.yoy}%` : "N/A",
    "ISRATIO (庫存銷售比)": isratio ? `${isratio.latest}` : "N/A", "DRCLACBS (消費違約 YoY)": dr_con ? `${dr_con.yoy}%` : "N/A",
    "DRBLACBS (企業違約 YoY)": dr_bus ? `${dr_bus.yoy}%` : "N/A"
  };

  const record = { date: new Date().toLocaleDateString('en-CA'), verdict: finalVerdict, strategy, scores, details, raw_data };
  const { error } = await supabase.from('economic_records').upsert(record, { onConflict: 'date' });
  return { success: true, db_error: error ? error.message : null, data: record };
});
