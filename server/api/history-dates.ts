// server/api/history-dates.ts
import { defineEventHandler } from 'h3'
import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)
  
  // 只撈取 date 欄位，並由大到小排序 (新到舊)
  const { data, error } = await supabase
    .from('economic_records')
    .select('date')
    .order('date', { ascending: false })

  if (error) {
    return { success: false, error: error.message }
  }

  // 將資料整理成單純的字串陣列回傳 (例如: ['2026-03-07', '2026-03-06'])
  return { success: true, dates: data.map(d => d.date) }
})