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

        </div>

      <div class="d-grid gap-2 mt-4 mb-5">
        <button @click="forceSyncNewData" class="btn btn-dark btn-lg shadow-sm" :disabled="isLoading">
          🔄 強制重新抓取今日最新 FRED 數據
        </button>
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
            <div v-if="isChartLoading" class="text-center py-5">
              <div class="spinner-border text-primary" role="status"></div>
              <p class="mt-2 text-muted small">抓取 FRED 歷史圖表資料中...</p>
            </div>
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

// 圖表專用狀態
const isChartLoading = ref(false)
const chartError = ref('')
const activeChartTitle = ref('')
const chartData = ref({ labels: [], datasets: [] })
const chartOptions = ref({
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } }, // 隱藏多餘的圖例
  scales: { x: { ticks: { maxTicksLimit: 6 } } } // 讓X軸日期不要太擠
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
    const { data: syncRes } = await useFetch('/api/sync')
    if (syncRes.value?.success) {
      currentData.value = syncRes.value.data
      activeTab.value = 'overview'
      if (syncRes.value.db_error) dbWarning.value = `即時爬蟲已成功，但 Supabase 存檔失敗！原因：${syncRes.value.db_error}`
      else {
        const { data: dateRes } = await useFetch('/api/history-dates')
        if (dateRes.value?.success) historyDates.value = dateRes.value.dates
        selectedDate.value = currentData.value.date
      }
    } else { errorMessage.value = syncRes.value?.error || '爬蟲執行失敗' }
  } catch (err) { errorMessage.value = err.message } finally { isLoading.value = false }
}

// === 🌟 畫圖表的專屬邏輯 ===
let bsModal = null // 存放 Bootstrap Modal 實例

const openChart = async (keyName) => {
  activeChartTitle.value = keyName
  isChartLoading.value = true
  chartError.value = ''
  
  // 顯示 Modal
  if (!bsModal) {
    bsModal = new window.bootstrap.Modal(document.getElementById('chartModal'))
  }
  bsModal.show()

  // 解析 Series ID (例如從 "FEDFUNDS (聯邦基準利率)" 中取出 "FEDFUNDS")
  const seriesId = keyName.split(' ')[0]

  try {
    const { data: chartRes } = await useFetch(`/api/chart?seriesId=${seriesId}`)
    if (chartRes.value?.success) {
      // 填入 Chart.js 需要的資料格式
      chartData.value = {
        labels: chartRes.value.labels,
        datasets: [{
          label: seriesId,
          data: chartRes.value.values,
          borderColor: '#0d6efd',
          backgroundColor: 'rgba(13, 110, 253, 0.1)',
          borderWidth: 2,
          pointRadius: 0, // 隱藏點點，讓曲線更漂亮
          fill: true,
          tension: 0.1 // 讓線條微彎平滑
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
/* 加入卡片點擊的浮動效果 */
.clickable-card { cursor: pointer; transition: transform 0.2s ease, box-shadow 0.2s ease; }
.clickable-card:hover { transform: translateY(-3px); box-shadow: 0 4px 15px rgba(0,0,0,0.1) !important; border-color: #0d6efd !important; }
/* ...保留其他的 CSS... */

/* 樣式保持不變 */
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
</style>