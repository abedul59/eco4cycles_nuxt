<template>
  <div class="container py-3">
    
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

    <div v-if="isLoading" class="text-center py-5 my-5">
      <div class="spinner-border text-primary" style="width: 3rem; height: 3rem;" role="status"></div>
      <h5 class="mt-4 text-muted fw-bold">🚀 系統處理中...</h5>
    </div>

    <div v-else-if="errorMessage || !currentData" class="alert alert-danger shadow-sm mt-4">
      發生錯誤: {{ errorMessage || '無法取得資料' }}
    </div>

    <div v-else>
      <div v-if="dbWarning" class="alert alert-warning shadow-sm small mb-3">⚠️ {{ dbWarning }}</div>

      <ul class="nav nav-pills mb-3" id="pills-tab">
        <li class="nav-item"><button class="nav-link" :class="{ 'active fw-bold': activeTab === 'overview', 'text-secondary': activeTab !== 'overview' }" @click="activeTab = 'overview'">👑 終極統整</button></li>
        <li class="nav-item"><button class="nav-link" :class="{ 'bg-success text-white fw-bold': activeTab === 'recovery', 'text-success': activeTab !== 'recovery' }" @click="activeTab = 'recovery'">🌱 復甦</button></li>
        <li class="nav-item"><button class="nav-link" :class="{ 'bg-info text-white fw-bold': activeTab === 'growth', 'text-info': activeTab !== 'growth' }" @click="activeTab = 'growth'">📈 成長</button></li>
        <li class="nav-item"><button class="nav-link" :class="{ 'bg-danger text-white fw-bold': activeTab === 'boom', 'text-danger': activeTab !== 'boom' }" @click="activeTab = 'boom'">🔥 榮景</button></li>
        <li class="nav-item"><button class="nav-link" :class="{ 'bg-primary text-white fw-bold': activeTab === 'recession', 'text-primary': activeTab !== 'recession' }" @click="activeTab = 'recession'">🥶 衰退</button></li>
      </ul>

      <div class="tab-content">
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

          <div v-if="currentData.details?.trend_stats" class="card shadow-sm mb-4 border-0">
            <div class="card-header bg-white fw-bold border-bottom-0 pb-0 pt-3 text-dark">
              <span class="fs-5 me-1">📊</span> 過去 120 天景氣趨勢比重 (含基底)
            </div>
            <div class="card-body row align-items-center pt-2">
              <div class="col-md-5 text-center mb-3 mb-md-0">
                 <ClientOnly>
                   <Doughnut :data="trendChartData" :options="trendChartOptions" style="max-height: 180px;" />
                 </ClientOnly>
              </div>
              <div class="col-md-7">
                 <ul class="list-group list-group-flush small mb-3">
                   <li class="list-group-item d-flex justify-content-between align-items-center px-1 py-1 border-0">
                     <span class="text-success fw-bold">🌱 復甦期天數</span> <span class="badge bg-success rounded-pill">{{ currentData.details.trend_stats.recovery }}</span>
                   </li>
                   <li class="list-group-item d-flex justify-content-between align-items-center px-1 py-1 border-0">
                     <span class="text-info text-dark fw-bold">📈 成長期天數</span> <span class="badge bg-info text-dark rounded-pill">{{ currentData.details.trend_stats.growth }}</span>
                   </li>
                   <li class="list-group-item d-flex justify-content-between align-items-center px-1 py-1 border-0">
                     <span class="text-danger fw-bold">🔥 榮景期天數</span> <span class="badge bg-danger rounded-pill">{{ currentData.details.trend_stats.boom }}</span>
                   </li>
                   <li class="list-group-item d-flex justify-content-between align-items-center px-1 py-1 border-0 border-bottom">
                     <span class="text-primary fw-bold">🥶 衰退期天數</span> <span class="badge bg-primary rounded-pill">{{ currentData.details.trend_stats.recession }}</span>
                   </li>
                 </ul>
                 
                 <div class="alert py-2 mb-0" :class="isTransitionAlert ? 'alert-warning' : 'alert-success'" style="font-size: 0.85rem;">
                   <strong>🤖 判定建議：</strong><br>
                   {{ isTransitionAlert
                      ? `單日數據短暫波動，導致當前進入「過渡期」。但過去四個月的絕對多數為【${currentData.details.trend_stats.dominant}】。建議不輕易隨雜訊改變配置，維持防禦並靜待下月數據表態。`
                      : `當前單日數據與過去四個月的趨勢吻合。主流狀態已確立為【${currentData.details.trend_stats.dominant}】，請放心堅定執行該時期的策略配置。`
                   }}
                 </div>
              </div>
            </div>
          </div>

          <h6 class="mb-2 fw-bold px-1 mt-4">📉 全時期 20 大指標最新數據 <span class="small text-primary">(點擊卡片查看圖表)</span></h6>
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

        <div v-show="activeTab === 'recovery'">
          <div class="card border-success mb-3 shadow-sm">
            <div class="card-header bg-success text-white fw-bold">🌱 復甦期指標狀態 ({{ currentData.scores.recovery }}/4)</div>
            <ul class="list-group list-group-flush">
              <li v-for="(item, i) in currentData.details.recovery" :key="i" class="list-group-item d-flex justify-content-between align-items-center" :class="item.met ? 'bg-success-subtle fw-bold' : 'text-muted opacity-75'">
                <span style="font-size:0.9rem;">{{ item.met ? '✔️' : '❌' }} {{ item.desc }}</span>
                <span class="badge" :class="item.met ? 'bg-success' : 'bg-secondary'">{{ item.val }}</span>
              </li>
            </ul>
          </div>
          <div class="theory-box mb-4"><div class="theory-title">📖 復甦期理論與判斷說明</div><b>正確解讀 4 大現象，確認最壞情況已過：</b><br>1. 貨幣政策寬鬆走向極致<br>2. 財政刺激政策陸續推出<br>3. 油價和原物料價格處於谷底<br>4. 經濟數據都已走到極低基期<br><br><b>🎯 投資策略：</b>此時股市已被相對低估，應勇敢錢進股市，放大曝險！將無風險債券獲利了結，適度轉入高收益債。</div>
        </div>

        <div v-show="activeTab === 'growth'">
          <div class="card border-info mb-3 shadow-sm">
            <div class="card-header bg-info text-white fw-bold">📈 成長期指標狀態 ({{ currentData.scores.growth }}/4)</div>
            <ul class="list-group list-group-flush">
              <li v-for="(item, i) in currentData.details.growth" :key="i" class="list-group-item d-flex justify-content-between align-items-center" :class="item.met ? 'bg-info-subtle fw-bold' : 'text-muted opacity-75'">
                <span style="font-size:0.9rem;">{{ item.met ? '✔️' : '❌' }} {{ item.desc }}</span>
                <span class="badge" :class="item.met ? 'bg-info text-dark' : 'bg-secondary'">{{ item.val }}</span>
              </li>
            </ul>
          </div>
          <div class="theory-box mb-4"><div class="theory-title">📖 成長期理論與判斷說明</div><b>觀察關鍵 4 大現象，確認景氣進入穩定增長期：</b><br>1. 撙節開支結束，遞延消費挹注內需動能成長。<br>2. 就業增長顯著改善，民間消費穩定擴增。<br>3. 民間投資擴張，迎來固定資本投入熱潮。<br>4. 通膨回升至可持續增長水準 (1.5%~4%)。<br><br><b>🎯 投資策略：</b>股市看似昂貴其實不貴，策略為「持續買進與持有風險資產」。無風險債券應避免持有。</div>
        </div>

        <div v-show="activeTab === 'boom'">
          <div class="card border-danger mb-3 shadow-sm">
            <div class="card-header bg-danger text-white fw-bold">🔥 榮景轉折警訊狀態 ({{ currentData.scores.boom_warning }}/8)</div>
            <ul class="list-group list-group-flush">
              <li v-for="(item, i) in currentData.details.boom_warning" :key="i" class="list-group-item d-flex justify-content-between align-items-center" :class="item.met ? 'bg-danger-subtle fw-bold text-danger' : 'text-muted opacity-75'">
                <span style="font-size:0.9rem;">{{ item.met ? '🚨' : '🟢' }} {{ item.desc }}</span>
                <span class="badge" :class="item.met ? 'bg-danger' : 'bg-secondary'">{{ item.val }}</span>
              </li>
            </ul>
          </div>
          <div class="theory-box mb-4"><div class="theory-title">📖 榮景期理論與判斷說明</div>景氣擴張最迷人時期，過度熱絡後走向盛極而衰。<br><b>🎯 高階資產配置策略：</b>股市面臨高風險，末升段伴隨驚人報酬。依循高階模式逐年調降持股。無風險債券在榮景期中後期正是布局長天期公債的【最佳甜蜜點】。</div>
        </div>

        <div v-show="activeTab === 'recession'">
          <div class="card border-primary mb-3 shadow-sm">
            <div class="card-header bg-primary text-white fw-bold">🥶 衰退與落底指標狀態</div>
            <ul class="list-group list-group-flush">
              <li class="list-group-item bg-light text-dark fw-bold small">【衰退確認指標】 ({{ currentData.scores.recession }}/2)</li>
              <li v-for="(item, i) in currentData.details.recession" :key="'rec'+i" class="list-group-item d-flex justify-content-between align-items-center" :class="item.met ? 'bg-primary-subtle fw-bold text-primary' : 'text-muted opacity-75'">
                <span style="font-size:0.9rem;">{{ item.met ? '🚨' : '🟢' }} {{ item.desc }}</span>
                <span class="badge" :class="item.met ? 'bg-primary' : 'bg-secondary'">{{ item.val }}</span>
              </li>
              <li class="list-group-item bg-light text-dark fw-bold small">【落底曙光指標】 ({{ currentData.scores.bottom }}/3)</li>
              <li v-for="(item, i) in currentData.details.bottom" :key="'bot'+i" class="list-group-item d-flex justify-content-between align-items-center" :class="item.met ? 'bg-success-subtle fw-bold text-success' : 'text-muted opacity-75'">
                <span style="font-size:0.9rem;">{{ item.met ? '🌱' : '❌' }} {{ item.desc }}</span>
                <span class="badge" :class="item.met ? 'bg-success' : 'bg-secondary'">{{ item.val }}</span>
              </li>
            </ul>
          </div>
          <div class="theory-box mb-4"><div class="theory-title">📖 衰退期理論與判斷說明</div>景氣從榮景期走入衰退期，是必經過程。<br><b>🎯 絕佳投資策略：</b>債市為避風港；股市分批布局，採用「U型扣款」定期定額向下買進。</div>
        </div>

      </div>

      <div class="card mb-5 shadow-sm border-0 bg-white">
        <div class="card-body">
          <label class="form-label fw-bold text-dark">✏️ 手動更新 ISM PMI (製造業採購經理人)</label>
          <div class="input-group mb-0">
            <input type="number" step="0.1" v-model="manualPmiInput" class="form-control" placeholder="例如: 48.5 (若無更新可留空)">
            <button @click="forceSyncNewData" class="btn btn-dark" :disabled="isLoading">🔄 執行分析與抓取</button>
          </div>
        </div>
      </div>

    </div>

    <div class="modal fade" id="chartModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content">
          <div class="modal-header bg-light">
            <h6 class="modal-title fw-bold text-dark">{{ activeChartTitle }} 近五年走勢</h6>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div v-if="isChartLoading" class="text-center py-5"><div class="spinner-border text-primary" role="status"></div></div>
            <div v-else-if="chartError" class="alert alert-danger">{{ chartError }}</div>
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
import { ref, onMounted, computed } from 'vue'

// ====== 引入 Chart.js，並新增 ArcElement 畫圓餅圖 ======
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler, ArcElement } from 'chart.js'
import { Line, Doughnut } from 'vue-chartjs'
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler, ArcElement)

const activeTab = ref('overview')
const isLoading = ref(true)
const errorMessage = ref('')
const dbWarning = ref('')

const currentData = ref(null)
const historyDates = ref([])
const selectedDate = ref('')
const isHistoryView = ref(false)
const manualPmiInput = ref('')

// ====== 🌟 計算趨勢圖表的資料 ======
const trendChartData = computed(() => {
  if (!currentData.value || !currentData.value.details?.trend_stats) return { labels: [], datasets: [] };
  const stats = currentData.value.details.trend_stats;
  return {
    labels: ['復甦期', '成長期', '榮景期', '衰退期'],
    datasets: [{
      data: [stats.recovery, stats.growth, stats.boom, stats.recession],
      backgroundColor: ['#198754', '#0dcaf0', '#dc3545', '#0d6efd'],
      borderWidth: 1,
      borderColor: '#ffffff'
    }]
  }
});

const trendChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 } } } }
};

const isTransitionAlert = computed(() => {
  if (!currentData.value) return false;
  return currentData.value.verdict.includes('過渡期');
});

// 圖表專用狀態
const isChartLoading = ref(false)
const chartError = ref('')
const activeChartTitle = ref('')
const chartData = ref({ labels: [], datasets: [] })
const chartOptions = ref({ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { maxTicksLimit: 6 } } } })

const initApp = async () => {
  isLoading.value = true
  try {
    const { data: dateRes } = await useFetch('/api/history-dates')
    if (dateRes.value?.success) historyDates.value = dateRes.value.dates
    if (historyDates.value.length > 0) { selectedDate.value = historyDates.value[0]; await loadHistoricalData() } 
    else { await forceSyncNewData() }
  } catch (err) { errorMessage.value = err.message }
}

const loadHistoricalData = async () => {
  if (!selectedDate.value) return
  isLoading.value = true; isHistoryView.value = true; dbWarning.value = ''
  try {
    const { data: recordRes } = await useFetch(`/api/record?date=${selectedDate.value}`)
    if (recordRes.value?.success) { currentData.value = recordRes.value.data; activeTab.value = 'overview' } 
    else { errorMessage.value = recordRes.value?.error || '讀取失敗' }
  } catch (err) { errorMessage.value = err.message } finally { isLoading.value = false }
}

const forceSyncNewData = async () => {
  isLoading.value = true; isHistoryView.value = false; errorMessage.value = ''; dbWarning.value = ''; selectedDate.value = ''
  try {
    const url = manualPmiInput.value ? `/api/sync?pmi=${manualPmiInput.value}` : '/api/sync'
    const { data: syncRes } = await useFetch(url)
    if (syncRes.value?.success) {
      currentData.value = syncRes.value.data; activeTab.value = 'overview'; manualPmiInput.value = ''
      if (syncRes.value.db_error) dbWarning.value = `存檔失敗！原因：${syncRes.value.db_error}`
      else {
        const { data: dateRes } = await useFetch('/api/history-dates')
        if (dateRes.value?.success) historyDates.value = dateRes.value.dates
        selectedDate.value = currentData.value.date
      }
    } else { errorMessage.value = syncRes.value?.error || '爬蟲執行失敗' }
  } catch (err) { errorMessage.value = err.message } finally { isLoading.value = false }
}

let bsModal = null
const openChart = async (keyName) => {
  if (keyName.includes('ISM PMI')) { alert('ISM PMI 此指標暫不提供歷史折線圖。'); return }
  activeChartTitle.value = keyName; isChartLoading.value = true; chartError.value = ''
  if (!bsModal) bsModal = new window.bootstrap.Modal(document.getElementById('chartModal'))
  bsModal.show()
  const seriesId = keyName.split(' ')[0]
  try {
    const { data: chartRes } = await useFetch(`/api/chart?seriesId=${seriesId}`)
    if (chartRes.value?.success) {
      chartData.value = { labels: chartRes.value.labels, datasets: [{ label: seriesId, data: chartRes.value.values, borderColor: '#0d6efd', backgroundColor: 'rgba(13, 110, 253, 0.1)', borderWidth: 2, pointRadius: 0, fill: true, tension: 0.1 }] }
    } else { chartError.value = chartRes.value?.error || '無法獲取歷史資料' }
  } catch (err) { chartError.value = '連線錯誤' } finally { isChartLoading.value = false }
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
.bg-success-subtle { background-color: #d1e7dd; }
.bg-info-subtle { background-color: #cff4fc; }
.bg-danger-subtle { background-color: #f8d7da; }
.bg-primary-subtle { background-color: #cfe2ff; }
</style>
