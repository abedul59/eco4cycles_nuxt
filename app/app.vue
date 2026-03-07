<template>
  <div class="container py-3">
    
    <div v-if="pending" class="text-center py-5 my-5">
      <div class="spinner-border text-primary" style="width: 3rem; height: 3rem;" role="status"></div>
      <h5 class="mt-4 text-muted fw-bold">🚀 正在透過 Edge Network 進行全週期運算...</h5>
      <p class="text-secondary small">（同時發送 20 個 API 請求，預計只需 1~2 秒）</p>
    </div>

    <div v-else-if="error || !results?.data" class="alert alert-danger shadow-sm mt-4">
      伺服器發生錯誤: {{ error?.message || '無法取得資料' }}
    </div>

    <div v-else>
      <div v-if="results.db_error" class="alert alert-warning shadow-sm small mb-3">
        ⚠️ <b>注意：即時爬蟲已成功，但 Supabase 存檔失敗！</b><br>錯誤原因：{{ results.db_error }}
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
              <h6 class="text-uppercase opacity-75">當前全球經濟週期 ({{ results.data.date }})</h6>
              <h2 class="fw-bold my-3">{{ results.data.verdict }}</h2>
              <p class="mb-0 small opacity-75">資料庫更新於：{{ new Date(results.data.created_at || Date.now()).toLocaleString('zh-TW') }}</p>
            </div>
          </div>

          <div class="strategy-box mb-3 shadow-sm">
            <h6 class="fw-bold text-dark mb-2">💡 投資策略最高指導</h6>
            <p class="mb-0 text-secondary" style="font-size: 0.95rem;">{{ results.data.strategy }}</p>
          </div>

          <h6 class="mb-2 fw-bold px-1 mt-4">📊 全時期 20 大指標最新數據</h6>
          <div class="row g-2 mb-4">
            <div class="col-6" v-for="(val, key) in results.data.raw_data" :key="key">
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
              🌱 復甦期觸發條件 ({{ results.data.scores.recovery }}/4)
            </div>
            <ul class="list-group list-group-flush">
              <li v-for="(detail, i) in results.data.details.recovery" :key="i" class="list-group-item text-success fw-bold" style="font-size:0.9rem;">✔️ {{ detail }}</li>
              <li v-if="!results.data.details.recovery.length" class="list-group-item text-muted small">目前未觸發任何復甦期條件</li>
            </ul>
          </div>
          <div class="theory-box mb-4">
            <div class="theory-title">📖 復甦期理論與判斷說明</div>
            <b>正確解讀 4 大現象，確認最壞情況已過：</b><br>
            1. 貨幣政策寬鬆走向極致：聯邦基金利率、長期公債利率下滑，減輕負債並刺激投資。<br>
            2. 財政刺激政策陸續推出：撐起消費與投資信心。<br>
            3. 油價和原物料價格處於谷底：形同實質減稅，刺激民眾消費需求。<br>
            4. 經濟數據都已走到極低基期：低基期走完後，數據將顯著反彈。<br><br>
            <b>🎯 投資策略 (風險低、報酬高)：</b><br>
            此時股市已被相對低估，應勇敢錢進股市，放大曝險！將無風險債券獲利了結，適度轉入高收益債。
          </div>
        </div>

        <div v-show="activeTab === 'growth'">
          <div class="card border-info mb-3 shadow-sm">
            <div class="card-header bg-info text-white fw-bold">
              📈 成長期觸發條件 ({{ results.data.scores.growth }}/4)
            </div>
            <ul class="list-group list-group-flush">
              <li v-for="(detail, i) in results.data.details.growth" :key="i" class="list-group-item text-info fw-bold" style="font-size:0.9rem;">✔️ {{ detail }}</li>
              <li v-if="!results.data.details.growth.length" class="list-group-item text-muted small">目前未觸發任何成長期條件</li>
            </ul>
          </div>
          <div class="theory-box mb-4">
            <div class="theory-title">📖 成長期理論與判斷說明</div>
            <b>觀察關鍵 4 大現象，確認景氣進入穩定增長期：</b><br>
            1. 撙節開支結束，遞延消費挹注內需動能成長。<br>
            2. 就業增長顯著改善，民間消費穩定擴增。<br>
            3. 民間投資擴張，迎來固定資本投入與房地產熱潮。<br>
            4. 通膨回升至可持續增長水準 (1.5%~4%)，鞏固消費與投資信心。<br><br>
            <b>🎯 投資策略：</b><br>
            • 股市：看似昂貴其實不貴。策略為「持續買進與持有風險資產」。<br>
            • 無風險債券：升息循環使價格下降，應避免持有，建議轉出。
          </div>
        </div>

        <div v-show="activeTab === 'boom'">
          <div class="card border-danger mb-3 shadow-sm">
            <div class="card-header bg-danger text-white fw-bold">
              🔥 榮景轉折警訊條件 ({{ results.data.scores.boom_warning }}/8)
            </div>
            <ul class="list-group list-group-flush">
              <li v-for="(detail, i) in results.data.details.boom_warning" :key="i" class="list-group-item text-danger fw-bold" style="font-size:0.9rem;">🚨 {{ detail }}</li>
              <li v-if="!results.data.details.boom_warning.length" class="list-group-item text-muted small">未觸發警訊，擴張依舊健康</li>
            </ul>
          </div>
          <div class="theory-box mb-4">
            <div class="theory-title">📖 榮景期理論與判斷說明</div>
            景氣擴張最迷人時期，過度熱絡後走向盛極而衰。特徵包含：景氣加速成長、資本市場熱絡、樂觀情緒高昂、風險意識極低。<br><br>
            <b>🎯 高階資產配置策略：</b><br>
            • 股市：面臨高風險，但末升段往往伴隨驚人報酬。依循高階模式逐年調降持股，持股最低水位應保持 30%。<br>
            • 無風險債券：在榮景期中後期，長債會迎來「再修正」的末跌段，此時正是布局長天期公債的最佳甜蜜點。
          </div>
        </div>

        <div v-show="activeTab === 'recession'">
          <div class="card border-primary mb-3 shadow-sm">
            <div class="card-header bg-primary text-white fw-bold">
              🥶 衰退與落底條件 (衰退:{{ results.data.scores.recession }}/2, 曙光:{{ results.data.scores.bottom }}/3)
            </div>
            <ul class="list-group list-group-flush">
              <li class="list-group-item bg-light text-dark fw-bold small">【衰退確認指標】</li>
              <li v-for="(detail, i) in results.data.details.recession" :key="'rec'+i" class="list-group-item text-primary fw-bold" style="font-size:0.9rem;">🚨 {{ detail }}</li>
              <li v-if="!results.data.details.recession.length" class="list-group-item text-muted small">未確認陷入衰退</li>
              
              <li class="list-group-item bg-light text-dark fw-bold small">【落底曙光指標】</li>
              <li v-for="(detail, i) in results.data.details.bottom" :key="'bot'+i" class="list-group-item text-success fw-bold" style="font-size:0.9rem;">🌱 {{ detail }}</li>
              <li v-if="!results.data.details.bottom.length" class="list-group-item text-muted small">無落底反轉跡象</li>
            </ul>
          </div>
          <div class="theory-box mb-4">
            <div class="theory-title">📖 衰退期理論與判斷說明</div>
            景氣從榮景期走入衰退期，是景氣循環的必經過程。市場充斥悲觀氛圍、資本市場急凍。<br><br>
            <b>🎯 絕佳投資策略：</b><br>
            • 債市 (避風港)：無風險公債會走出一波長多走勢。<br>
            • 股市 (入市時機)：分批布局、把氣拉長。採用「U型扣款」定期定額向下買進，降低成本，切勿在低檔殺出！<br>
            • 美元：避險心態會推升美元升值，為保全資產的必要手段。
          </div>
        </div>

      </div>

      <div class="d-grid gap-2 mt-4 mb-5">
        <button @click="forceRefresh" class="btn btn-dark btn-lg shadow-sm" :disabled="pending">
          {{ pending ? '運算中...' : '🔄 強制重新抓取最新 FRED 數據' }}
        </button>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

// 定義目前選中的頁籤
const activeTab = ref('overview')

// 呼叫我們寫好的 server/api/sync.ts 
// 這行就是 Nuxt 3 最強的 useFetch，會自動處理 Loading 和 Error 狀態！
const { data: results, pending, error, refresh } = await useFetch('/api/sync')

// 強制刷新按鈕的動作
const forceRefresh = () => {
  activeTab.value = 'overview'
  refresh()
}
</script>

<style>
body { background-color: #f8f9fa; font-family: "微軟正黑體", sans-serif; }
.verdict-card { border-radius: 15px; background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); color: white; }
.data-card { border: none; border-radius: 10px; background-color: #ffffff; }
.val-text { font-size: 1.1rem; font-weight: 700; color: #d9534f; margin-top: 5px; }
.strategy-box { border-left: 5px solid #ffc107; background-color: #fffbe6; padding: 15px; border-radius: 8px;}
.theory-box { background-color: #e9ecef; padding: 15px; border-radius: 8px; font-size: 0.9rem; color: #495057; line-height: 1.6; }
.theory-title { font-weight: 800; color: #212529; margin-bottom: 10px; border-bottom: 2px solid #adb5bd; padding-bottom: 5px;}
/* 讓頁籤在手機上可以橫向滑動 */
.nav-pills { flex-wrap: nowrap; overflow-x: auto; overflow-y: hidden; padding-bottom: 5px; -webkit-overflow-scrolling: touch; }
.nav-pills .nav-link { white-space: nowrap; border-radius: 20px; margin-right: 5px; background: #e9ecef; border: none; }
.nav-pills::-webkit-scrollbar { display: none; }
</style>