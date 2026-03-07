import { getServiceClient } from './supabase'

/**
 * Đọc/ghi cài đặt hệ thống từ bảng `settings` trong Supabase
 */

export async function getSetting(key) {
  const supabase = getServiceClient()
  const { data } = await supabase
    .from('settings')
    .select('value')
    .eq('key', key)
    .single()
  return data?.value ?? null
}

export async function setSetting(key, value) {
  const supabase = getServiceClient()
  const { error } = await supabase
    .from('settings')
    .upsert({ key, value: String(value), updated_at: new Date().toISOString() }, { onConflict: 'key' })
  if (error) throw error
}

export async function getAllSettings() {
  const supabase = getServiceClient()
  const { data } = await supabase.from('settings').select('*')
  const result = {}
  for (const row of data || []) result[row.key] = row.value
  return result
}

// Keys tắt/mở autoload
export const SETTING_AUTOLOAD_ENABLED = 'autoload_enabled'
export const SETTING_ODOO_URL         = 'odoo_url'
export const SETTING_ODOO_DB          = 'odoo_db'
export const SETTING_ODOO_USER        = 'odoo_user'
export const SETTING_ODOO_PASS        = 'odoo_api_key'
