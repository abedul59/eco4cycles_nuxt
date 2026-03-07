// server/api/record.ts
import { defineEventHandler, getQuery } from 'h3'
import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const date = query.date as string

  if (!date) {
    return { success: false, error: '缺少日期參數' }
  }

  const supabase = await serverSupabaseClient(event)
  
  // 撈取符合該日期的單筆完整紀錄
  const { data, error } = await supabase
    .from('economic_records')
    .select('*')
    .eq('date', date)
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data }
})