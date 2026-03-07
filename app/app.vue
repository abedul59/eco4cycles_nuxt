<template>
  <div class="container py-3">
    
    <div class="card shadow-sm border-0 mb-4 bg-light">
      <div class="card-body py-2 px-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div class="fw-bold text-secondary">
          📅 檢視歷史判定紀錄：
        </div>
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
      <div v-if="dbWarning" class="alert alert-warning shadow-sm small mb-3">
        ⚠️ {{ dbWarning }}
      </div>

      <ul class="nav nav-pills mb-3" id="pills-tab">
        <li class="nav-item">
          <button class="nav-link" :class="{ 'active fw-bold': activeTab === 'overview', 'text-secondary': activeTab !== 'overview' }" @click="activeTab = 'overview'">👑 終極統整</button>
        </li>
        <li class="nav-item">
          <button class="nav-link" :class="{ 'bg-success text-white fw-bold': activeTab === 'recovery', 'text-success': activeTab !== 'recovery' }" @click="activeTab = 'recovery'">🌱 復甦</button>
        </li>
        <li class="nav-item">
          <button class="nav-link" :class="{ 'bg-info text-white fw-bold': activeTab === 'growth', 'text-info': activeTab !== 'growth' }" @click="activeTab = 'growth'">📈 成長</button>
        </li>
        <li class="nav-item">
          <button class="nav-link" :class="{ 'bg-danger text-white fw-bold': activeTab === 'boom', 'text-danger': activeTab !== 'boom' }" @click="activeTab = 'boom'">🔥 榮景</button>
        </li>
        <li class="nav-item">
          <button class="nav-link" :class="{ 'bg-primary text-white fw-bold': activeTab === 'recession', 'text-primary': activeTab !== 'recession' }" @click="activeTab = 'recession'">🥶 衰退</button>
        </li>
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

          <h6 class="mb-2 fw-bold px-1 mt-4">📊 全時期 20 大指標最新數據</h6>
          <div class="row g-2 mb-4">
            <div class="col-6" v-for="(val, key) in currentData.raw_data" :key="key">
              <div class="card data-card shadow-sm h-100 border">
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
            <div class="card-header bg-success text-white fw-bold">
              🌱 復甦期觸發條件 ({{ currentData.scores.recovery }}/4)
            </div>
            <ul class="list-group list-group-flush">
              <li v-for="(detail, i) in currentData.details.recovery" :key="i" class="list-group-item text-success fw-bold" style="font-size:0.9rem;">✔️ {{ detail }}</li>
              <li v-if="!currentData.details.recovery.length" class="list-group-item text-muted small">目前未觸發任何復甦期條件</li>
            </ul>
          </div>
        </div>

        <div v-show="activeTab === 'growth'">
          <div class="card border-info mb-3 shadow-sm">
            <div class="card-header bg-info text-white fw-bold">
              📈 成長期觸發條件 ({{ currentData.scores.growth }}/4)
            </div>
            <ul class="list-group list-group-flush">
              <li v-for="(detail, i) in currentData.details.growth" :key="i" class="list-group-item text-info fw-bold" style="font-size:0.9rem;">✔️ {{ detail }}</li>
              <li v-if="!currentData.details.growth.length" class="list-group-item text-muted small">目前未觸發任何成長期條件</li>
            </ul>
          </div>
        </div>

        <div v-show="activeTab === 'boom'">
          <div class="card border-danger mb-3 shadow-sm">
            <div class="card-header bg-danger text-white fw-bold">
              🔥 榮景轉折警訊條件 ({{ currentData.scores.boom_warning }}/8)
            </div>
            <ul class="list-group list-group-flush">
              <li v-for="(detail, i) in currentData.details.boom_warning" :key="i" class="list-group-item text-danger fw-bold" style="font-size:0.9rem;">🚨 {{ detail }}</li>
              <li v-if="!currentData.details.boom_warning.length" class="list-group-item text-muted small">未觸發警訊，擴張依舊健康</li>
            </ul>
          </div>
        </div>

        <div v-show="activeTab === 'recession'">
          <div class="card border-primary mb-3 shadow-sm">
            <div class="card-header bg-primary text-white fw-bold">
              🥶 衰退與落底條件 (衰退:{{ currentData.scores.recession }}/2, 曙光:{{ currentData.scores.bottom }}/3)
            </div>
            <ul class="list-group list-group-flush">
              <li class="list-group-item bg-light text-dark fw-bold small">【衰退確認指標】</li>
              <li v-for="(detail, i) in currentData.details.recession" :key="'rec'+i" class="list-group-item text-primary fw-bold" style="font-size:0.9rem;">🚨 {{ detail }}</li>
              <li v-if="!currentData.details.recession.length" class="list-group-item text-muted small">未確認陷入衰退</li>
              
              <li class="list-group-item bg-light text-dark fw-bold small">【落底曙光指標】</li>
              <li v-for="(detail, i) in currentData.details.bottom" :key="'bot'+i" class="list-group-item text-success fw-bold" style="font-size:0.9rem;">🌱 {{ detail }}</li>
              <li v-if="!currentData.details.bottom.length" class="list-group-item text-muted small">無落底反轉跡象</li>
            </ul>
          </div>
        </div>

      </div>

      <div class="d-grid gap-2 mt-4 mb-5">
        <button @click="forceSyncNewData" class="btn btn-dark btn-lg shadow-sm" :disabled="isLoading">
          🔄 強制重新抓取今日最新 FRED 數據
        </button>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const activeTab = ref('overview')
const isLoading = ref(true)
const errorMessage = ref('')
const dbWarning = ref('')

const currentData = ref(null)
const historyDates = ref([])
const selectedDate = ref('')
const isHistoryView = ref(false)

// 1. 初始化：取得可用日期列表，並決定要讀取哪天
const initApp = async () => {
  isLoading.value = true
  try {
    // 撈取歷史日期列表
    const { data: dateRes } = await useFetch('/api/history-dates')
    if (dateRes.value?.success) {
      historyDates.value = dateRes.value.dates
    }

    // 預設讀取最新的一天，如果沒有資料就執行全新爬蟲
    if (historyDates.value.length > 0) {
      selectedDate.value = historyDates.value[0]
      await loadHistoricalData()
    } else {
      await forceSyncNewData()
    }
  } catch (err) {
    errorMessage.value = err.message
  }
}

// 2. 讀取所選歷史紀錄
const loadHistoricalData = async () => {
  if (!selectedDate.value) return
  isLoading.value = true
  isHistoryView.value = true
  dbWarning.value = ''
  
  try {
    const { data: recordRes } = await useFetch(`/api/record?date=${selectedDate.value}`)
    if (recordRes.value?.success) {
      currentData.value = recordRes.value.data
      activeTab.value = 'overview'
    } else {
      errorMessage.value = recordRes.value?.error || '讀取失敗'
    }
  } catch (err) {
    errorMessage.value = err.message
  } finally {
    isLoading.value = false
  }
}

// 3. 強制執行今日最新爬蟲 (呼叫 sync.ts)
const forceSyncNewData = async () => {
  isLoading.value = true
  isHistoryView.value = false
  errorMessage.value = ''
  dbWarning.value = ''
  selectedDate.value = '' // 清空下拉選單

  try {
    const { data: syncRes } = await useFetch('/api/sync')
    if (syncRes.value?.success) {
      currentData.value = syncRes.value.data
      activeTab.value = 'overview'
      if (syncRes.value.db_error) {
        dbWarning.value = `即時爬蟲已成功，但 Supabase 存檔失敗！原因：${syncRes.value.db_error}`
      } else {
        // 成功存檔後，重新整理一下日期列表
        const { data: dateRes } = await useFetch('/api/history-dates')
        if (dateRes.value?.success) historyDates.value = dateRes.value.dates
        selectedDate.value = currentData.value.date
      }
    } else {
      errorMessage.value = syncRes.value?.error || '爬蟲執行失敗'
    }
  } catch (err) {
    errorMessage.value = err.message
  } finally {
    isLoading.value = false
  }
}

// 網頁載入時啟動
onMounted(() => {
  initApp()
})
</script>

<style>
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