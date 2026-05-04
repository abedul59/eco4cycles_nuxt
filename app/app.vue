<template>
  <div class="container py-3">
    
    <!-- 頂部：歷史日期選單 -->
    <div class="card shadow-sm border-0 mb-4 bg-light">
      <div class="card-body py-2 px-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div class="fw-bold text-secondary">📅 檢視歷史判定紀錄：</div>
        <div class="d-flex gap-2 flex-grow-1" style="max-width: 300px;">
          <select class="form-select form-select-sm" v-model="selectedDate" @change="loadHistoricalData" :disabled="isLoading">
            <option value="" disabled>請選擇歷史日期...</option>
            <option v-for="date in historyDates" :key="date" :value="date">{{ date }}</option>
          </select>
        </div>
      </div>
    </div>

    <!-- 載入中動畫 -->
    <div v-if="isLoading" class="text-center py-5 my-5">
      <div class="spinner-border text-primary" style="width: 3rem; height: 3rem;" role="status"></div>
      <h5 class="mt-4 text-muted fw-bold">🚀 系統處理中...</h5>
    </div>

    <!-- 錯誤狀態 -->
    <div v-else-if="errorMessage || !currentData" class="alert alert-danger shadow-sm mt-4">
      發生錯誤: {{ errorMessage || '無法取得資料' }}
    </div>

    <!-- 成功載入畫面 -->
    <div v-else>
      <div v-if="dbWarning" class="alert alert-warning shadow-sm small mb-3">⚠️ {{ dbWarning }}</div>

      <!-- 頁籤導覽 -->
      <ul class="nav nav-pills mb-3" id="pills-tab">
        <li class="nav-item"><button class="nav-link" :class="{ 'active fw-bold': activeTab === 'overview', 'text-secondary': activeTab !== 'overview' }" @click="activeTab = 'overview'">👑 終極統整</button></li>
        <li class="nav-item"><button class="nav-link" :class="{ 'bg-success text-white fw-bold': activeTab === 'recovery', 'text-success': activeTab !== 'recovery' }" @click="activeTab = 'recovery'">🌱 復甦</button></li>
        <li class="nav-item"><button class="nav-link" :class="{ 'bg-info text-white fw-bold': activeTab === 'growth', 'text-info': activeTab !== 'growth' }" @click="activeTab = 'growth'">📈 成長</button></li>
        <li class="nav-item"><button class="nav-link" :class="{ 'bg-danger text-white fw-bold': activeTab === 'boom', 'text-danger': activeTab !== 'boom' }" @click="activeTab = 'boom'">🔥 榮景</button></li>
        <li class="nav-item"><button class="nav-link" :class="{ 'bg-primary text-white fw-bold': activeTab === 'recession', 'text-primary': activeTab !== 'recession' }" @click="activeTab = 'recession'">🥶 衰退</button></li>
      </ul>

      <!-- 頁籤內容區 -->
      <div class="tab-content">
        <!-- ==================== [Tab 1] 👑 終極統整 ==================== -->
        <div v-show="activeTab === 'overview'">
          <div class="card verdict-card shadow-sm mb-3">
            <div class="card-body text-center py-4">
              <h6 class="text-uppercase opacity-75">當前全球經濟週期 ({{ currentData.date }})</h6>
              <h2 class="fw-bold my-3">{{ currentData.verdict }}</h2>
              <span v-if="isHistoryView" class="badge bg-warning text-dark mb-2">此為歷史紀錄快取</span>
            </div>
          </div>

          <div class="strategy-box mb-3 shadow-sm">
            <h6 class="fw-bold text-dark mb-2">💡 投資策略最高指導</h6>
            <p class="mb-0 text-secondary" style="font-size: 0.95rem;">{{ currentData.strategy }}</p>
          </div>

          <h6 class="mb-2 fw-bold px-1 mt-4">📊 全時期 20 大指標最新數據 <span class="small text-primary">(點擊卡片查看圖表)</span></h6>
          <div class="row g-2 mb-4">
            <div class="col-6" v-for="(val, key) in currentData.raw_data" :key="key">
              <div class="card data-card shadow-sm h-100 border clickable-card" @click="openChart(key)">
                <div class="card-body p-2 text-center">
                  <div class="text-muted" style="font-size: 0.70rem;">{{ key }}</div>
                  <div class="val-text">{{ val }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ==================== [Tab 2~5] 保留原本的詳細說明 ==================== -->
        <!-- (為節省閱讀空間，此處邏輯與上版完全相同) -->
        <div v-show="activeTab === 'recovery'"><div class="card border-success mb-3 shadow-sm"><div class="card-header bg-success text-white fw-bold">🌱 復甦期觸發條件 ({{ currentData.scores.recovery }}/4)</div><ul class="list-group list-group-flush"><li v-for="(detail, i) in currentData.details.recovery" :key="i" class="list-group-item text-success fw-bold" style="font-size:0.9rem;">✔️ {{ detail }}</li><li v-if="!currentData.details.recovery.length" class="list-group-item text-muted small">目前未觸發任何復甦期條件</li></ul></div><div class="theory-box mb-4"><div class="theory-title">📖 復甦期理論與判斷說明</div><b>正確解讀 4 大現象，確認最壞情況已過：</b><br>1. 貨幣政策寬鬆走向極致：聯邦基金利率、長期公債利率下滑，減輕負債並刺激投資。<br>2. 財政刺激政策陸續推出：撐起消費與投資信心。<br>3. 油價和原物料價格處於谷底：形同實質減稅，刺激民眾消費需求。<br>4. 經濟數據都已走到極低基期：低基期走完後，數據將顯著反彈。<br><br><b>判斷復甦期關鍵 4 指標：</b><br>• 就業：「初領失業救濟金人數」由高點反轉下降。<br>• 消費：「零售銷售」與「個人耐久財消費」提早落底反彈。<br>• 投資：「製造業耐久財新訂單」走出低迷，不再惡化。<br>• 進出口：「進口金額年增率」從低基期反轉回溫。<br><br><b>🎯 投資策略 (風險低、報酬高)：</b><br>此時股市已被相對低估，應勇敢錢進股市，放大曝險！將無風險債券獲利了結，適度轉入高收益債或布局短線原物料。黃金應考慮出清。</div></div>
        <div v-show="activeTab === 'growth'"><div class="card border-info mb-3 shadow-sm"><div class="card-header bg-info text-white fw-bold">📈 成長期觸發條件 ({{ currentData.scores.growth }}/4)</div><ul class="list-group list-group-flush"><li v-for="(detail, i) in currentData.details.growth" :key="i" class="list-group-item text-info fw-bold" style="font-size:0.9rem;">✔️ {{ detail }}</li><li v-if="!currentData.details.growth.length" class="list-group-item text-muted small">目前未觸發任何成長期條件</li></ul></div><div class="theory-box mb-4"><div class="theory-title">📖 成長期理論與判斷說明</div><b>觀察關鍵 4 大現象，確認景氣進入穩定增長期：</b><br>1. 撙節開支結束，遞延消費挹注內需動能成長。<br>2. 就業增長顯著改善，民間消費穩定擴增。<br>3. 民間投資擴張，迎來固定資本投入與房地產熱潮。<br>4. 通膨回升至可持續增長水準 (1.5%~4%)，鞏固消費與投資信心。<br><br><b>💡 常見迷思：</b><br>害怕景氣驟然轉向。事實上，只要經濟增長的巨輪開始轉動，民間投資和消費動能鞏固後，就不容易因偶發風險因子轉向。<br><br><b>🎯 投資策略：</b><br>• 股市：看似昂貴其實不貴，企業獲利不斷增長為最大支撐。策略為「持續買進與持有風險資產」。<br>• 高收益債：違約率維持穩定低檔，可持續買進持有。<br>• 無風險債券：升息循環使價格下降，應避免持有，建議轉出。<br>• 原物料：初期價格上揚，後期則會因高油價排擠消費而走跌。</div></div>
        <div v-show="activeTab === 'boom'"><div class="card border-danger mb-3 shadow-sm"><div class="card-header bg-danger text-white fw-bold">🔥 榮景轉折警訊條件 ({{ currentData.scores.boom_warning }}/8)</div><ul class="list-group list-group-flush"><li v-for="(detail, i) in currentData.details.boom_warning" :key="i" class="list-group-item text-danger fw-bold" style="font-size:0.9rem;">🚨 {{ detail }}</li><li v-if="!currentData.details.boom_warning.length" class="list-group-item text-muted small">未觸發警訊，擴張依舊健康</li></ul></div><div class="theory-box mb-4"><div class="theory-title">📖 榮景期理論與判斷說明</div>景氣擴張最迷人時期，過度熱絡後走向盛極而衰。特徵包含：景氣加速成長、資本市場熱絡、樂觀情緒高昂、風險意識極低。<br><br><b>解讀 8 大指標，確立榮景期起訖關鍵點：</b><br>1. 殖利率曲線倒掛 (T10Y2Y < 0)：意味瘋狂的末升段即將到來。<br>2. 初領失業金人數：U型結構確立 (自谷底反彈翹起)，可預測衰退期將至。<br>3. 民間消費：零售銷售領先整體個人消費支出 (PCE) 下滑。<br>4. 消費者信心指數：若顯著自高點滑落，則為警訊。<br>5. 民間投資：第 2 次耐久財支出暴衝期預告尾聲，隨後衰退。<br>6. 政府支出：地方政府支出年增率顯著增加後轉向。<br>7. 庫存增減：庫存銷售比攀升，面臨供過於求壓力。<br>8. 債務違約率：消費與企業貸款違約率雙雙顯著攀升 (雙破表)。<br><br><b>🎯 高階資產配置策略：</b><br>• 股市：面臨高風險，但末升段往往伴隨驚人報酬。依循高階模式逐年調降持股，切忌全空，持股最低水位應保持 30%。<br>• 無風險債券：在榮景期中後期，長債會迎來「再修正」的末跌段，此時正是布局長天期公債的【最佳甜蜜點】。</div></div>
        <div v-show="activeTab === 'recession'"><div class="card border-primary mb-3 shadow-sm"><div class="card-header bg-primary text-white fw-bold">🥶 衰退與落底條件 (衰退:{{ currentData.scores.recession }}/2, 曙光:{{ currentData.scores.bottom }}/3)</div><ul class="list-group list-group-flush"><li class="list-group-item bg-light text-dark fw-bold small">【衰退確認指標】</li><li v-for="(detail, i) in currentData.details.recession" :key="'rec'+i" class="list-group-item text-primary fw-bold" style="font-size:0.9rem;">🚨 {{ detail }}</li><li v-if="!currentData.details.recession.length" class="list-group-item text-muted small">未確認陷入衰退</li><li class="list-group-item bg-light text-dark fw-bold small">【落底曙光指標】</li><li v-for="(detail, i) in currentData.details.bottom" :key="'bot'+i" class="list-group-item text-success fw-bold" style="font-size:0.9rem;">🌱 {{ detail }}</li><li v-if="!currentData.details.bottom.length" class="list-group-item text-muted small">無落底反轉跡象</li></ul></div><div class="theory-box mb-4"><div class="theory-title">📖 衰退期理論與判斷說明</div>景氣從榮景期走入衰退期，是景氣循環的必經過程。市場充斥悲觀氛圍、資本市場急凍。<br><br><b>緊盯 2 數據，確認衰退期是否來臨：</b><br>1. 個人消費支出 (PCE)：出現「2 次消費陡降」(基期走低後仍繼續下修，小於1%)。<br>2. 民間投資年增率 (GPDIC1)：比經濟成長率更早反轉，並出現超過 10% 以上的雙位數深度衰退。<br><br><b>留意 3 指標低檔反轉，簡易判斷景氣落底 (曙光)：</b><br>1. 民間投資 (季增年率 Saar)：只要季增年率開始好轉，意味短期衰退動能消退，景氣谷底浮現。<br>2. 民間消費 (零售銷售)：月增年率或 YoY 提早反彈，是景氣落底轉強的基石。<br>3. 採購經理人指數 (PMI)：在底部出現反彈跡象，暗示擴張倒數計時。<br><br><b>🎯 絕佳投資策略：</b><br>• 債市 (避風港)：無風險公債會走出一波長多走勢。<br>• 股市 (入市時機)：分批布局、把氣拉長。採用「U型扣款」定期定額向下買進，降低成本，切勿在低檔殺出！<br>• 美元：避險心態會推升美元升值，為保全資產的必要手段。</div></div>
      </div>

      <!-- 🌟 底部操作區塊：手動輸入 PMI + 重新抓取 -->
      <div class="card mb-5 shadow-sm border-0 bg-white">
        <div class="card-body">
          <label class="form-label fw-bold text-dark">✏️ 手動更新 ISM PMI (製造業採購經理人)</label>
          <p class="small text-muted mb-2">由於 Investing.com 反爬蟲機制嚴格，請手動輸入最新 PMI 數值。若無更新請留空，系統將自動沿用上次數值並抓取其他 19 項指標。</p>
          <div class="input-group mb-0">
            <input type="number" step="0.1" v-model="manualPmiInput" class="form-control" placeholder="例如: 48.5 (若無更新可留空)">
            <button @click="forceSyncNewData" class="btn btn-dark" :disabled="isLoading">
              🔄 執行分析與抓取
            </button>
          </div>
        </div>
      </div>

    </div>

    <!-- Bootstrap 圖表彈出視窗 (Modal) -->
    <div class="modal fade" id="chartModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content">
          <div class="modal-header bg-light">
            <h6 class="modal-title fw-bold text-dark">{{ activeChartTitle }} 近五年走勢</h6>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div v-if="isChartLoading" class="text-center py-5">
              <div class="spinner-border text-primary" role="status"></div>
              <p class="mt-2 text-muted small">抓取 FRED 歷史圖表資料中...</p>
            </div>
            <div v-else-if="chartError" class="alert alert-danger">{{ chartError }}</div>
            <!-- ClientOnly 確保 Chart.js 只在瀏覽器端渲染 -->
            <ClientOnly v-else>
              <Line :data="chartData" :options="chartOptions" style="max-height: 300px;" />
            </ClientOnly>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

// ====== 引入 Chart.js ======
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js'
import { Line } from 'vue-chartjs'
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)
// ==========================

const activeTab = ref('overview')
const isLoading = ref(true)
const errorMessage = ref('')
const dbWarning = ref('')

const currentData = ref(null)
const historyDates = ref([])
const selectedDate = ref('')
const isHistoryView = ref(false)

// 🌟 手動輸入狀態
const manualPmiInput = ref('')

// 圖表專用狀態
const isChartLoading = ref(false)
const chartError = ref('')
const activeChartTitle = ref('')
const chartData = ref({ labels: [], datasets: [] })
const chartOptions = ref({
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } }, 
  scales: { x: { ticks: { maxTicksLimit: 6 } } } 
})

// === 原有的資料存取邏輯 ===
const initApp = async () => {
  isLoading.value = true
  try {
    const { data: dateRes } = await useFetch('/api/history-dates')
    if (dateRes.value?.success) historyDates.value = dateRes.value.dates

    if (historyDates.value.length > 0) {
      selectedDate.value = historyDates.value[0]
      await loadHistoricalData()
    } else {
      await forceSyncNewData()
    }
  } catch (err) { errorMessage.value = err.message }
}

const loadHistoricalData = async () => {
  if (!selectedDate.value) return
  isLoading.value = true; isHistoryView.value = true; dbWarning.value = ''
  try {
    const { data: recordRes } = await useFetch(`/api/record?date=${selectedDate.value}`)
    if (recordRes.value?.success) {
      currentData.value = recordRes.value.data
      activeTab.value = 'overview'
    } else { errorMessage.value = recordRes.value?.error || '讀取失敗' }
  } catch (err) { errorMessage.value = err.message } finally { isLoading.value = false }
}

const forceSyncNewData = async () => {
  isLoading.value = true; isHistoryView.value = false; errorMessage.value = ''; dbWarning.value = ''; selectedDate.value = ''
  try {
    // 🌟 核心修改：將手動輸入的 PMI 數值附帶在網址後面傳給後端
    const url = manualPmiInput.value ? `/api/sync?pmi=${manualPmiInput.value}` : '/api/sync'
    
    const { data: syncRes } = await useFetch(url)
    
    if (syncRes.value?.success) {
      currentData.value = syncRes.value.data
      activeTab.value = 'overview'
      manualPmiInput.value = '' // 成功後清空輸入框
      
      if (syncRes.value.db_error) dbWarning.value = `即時爬蟲已成功，但 Supabase 存檔失敗！原因：${syncRes.value.db_error}`
      else {
        const { data: dateRes } = await useFetch('/api/history-dates')
        if (dateRes.value?.success) historyDates.value = dateRes.value.dates
        selectedDate.value = currentData.value.date
      }
    } else { errorMessage.value = syncRes.value?.error || '爬蟲執行失敗' }
  } catch (err) { errorMessage.value = err.message } finally { isLoading.value = false }
}

// === 畫圖表的專屬邏輯 ===
let bsModal = null

const openChart = async (keyName) => {
  if (keyName.includes('ISM PMI')) {
    alert('ISM PMI 數據已改為手動輸入與動態繼承機制，此指標暫不提供歷史折線圖。')
    return
  }

  activeChartTitle.value = keyName
  isChartLoading.value = true
  chartError.value = ''
  
  if (!bsModal) {
    bsModal = new window.bootstrap.Modal(document.getElementById('chartModal'))
  }
  bsModal.show()

  const seriesId = keyName.split(' ')[0]

  try {
    const { data: chartRes } = await useFetch(`/api/chart?seriesId=${seriesId}`)
    if (chartRes.value?.success) {
      chartData.value = {
        labels: chartRes.value.labels,
        datasets: [{
          label: seriesId,
          data: chartRes.value.values,
          borderColor: '#0d6efd',
          backgroundColor: 'rgba(13, 110, 253, 0.1)',
          borderWidth: 2,
          pointRadius: 0, 
          fill: true,
          tension: 0.1 
        }]
      }
    } else {
      chartError.value = chartRes.value?.error || '無法獲取該指標歷史資料'
    }
  } catch (err) {
    chartError.value = '網路連線錯誤'
  } finally {
    isChartLoading.value = false
  }
}

onMounted(() => { initApp() })
</script>

<style>
body { background-color: #f8f9fa; font-family: "微軟正黑體", sans-serif; }
.verdict-card { border-radius: 15px; background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); color: white; }
.data-card { border: none; border-radius: 10px; background-color: #ffffff; }
.val-text { font-size: 1.1rem; font-weight: 700; color: #d9534f; margin-top: 5px; }
.strategy-box { border-left: 5px solid #ffc107; background-color: #fffbe6; padding: 15px; border-radius: 8px;}
.theory-box { background-color: #e9ecef; padding: 15px; border-radius: 8px; font-size: 0.9rem; color: #495057; line-height: 1.6; }
.theory-title { font-weight: 800; color: #212529; margin-bottom: 10px; border-bottom: 2px solid #adb5bd; padding-bottom: 5px;}
.nav-pills { flex-wrap: nowrap; overflow-x: auto; overflow-y: hidden; padding-bottom: 5px; -webkit-overflow-scrolling: touch; }
.nav-pills .nav-link { white-space: nowrap; border-radius: 20px; margin-right: 5px; background: #e9ecef; border: none; }
.nav-pills::-webkit-scrollbar { display: none; }
.clickable-card { cursor: pointer; transition: transform 0.2s ease, box-shadow 0.2s ease; }
.clickable-card:hover { transform: translateY(-3px); box-shadow: 0 4px 15px rgba(0,0,0,0.1) !important; border-color: #0d6efd !important; }
</style>
