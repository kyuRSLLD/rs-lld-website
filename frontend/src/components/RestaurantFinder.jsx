/**
 * RestaurantFinder.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Multi-ethnic restaurant lead database for LLD Staff Portal.
 * Allows staff to browse, search, filter, add, edit, and export restaurant
 * leads with full contact info, owner name, and hours of operation.
 *
 * Bilingual: English + Simplified Chinese
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Search, Plus, Download, RefreshCw, X, ChevronDown, ChevronUp,
  Phone, MapPin, Clock, User, Globe, Star, Edit3, Trash2,
  Filter, BarChart2, Upload, CheckCircle, AlertCircle, Building2
} from 'lucide-react'
import { staffFetch } from '@/lib/staffApi'

const API_BASE = import.meta.env.VITE_API_URL || ''

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_LABELS_EN = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' }
const DAY_LABELS_ZH = { monday: '周一', tuesday: '周二', wednesday: '周三', thursday: '周四', friday: '周五', saturday: '周六', sunday: '周日' }

const LEAD_STATUS_COLORS = {
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-yellow-100 text-yellow-800',
  interested: 'bg-green-100 text-green-800',
  not_interested: 'bg-gray-100 text-gray-600',
  customer: 'bg-emerald-100 text-emerald-800',
  do_not_contact: 'bg-red-100 text-red-800',
}

const LEAD_STATUS_LABELS_EN = {
  new: 'New', contacted: 'Contacted', interested: 'Interested',
  not_interested: 'Not Interested', customer: 'Customer', do_not_contact: 'Do Not Contact'
}
const LEAD_STATUS_LABELS_ZH = {
  new: '新线索', contacted: '已联系', interested: '感兴趣',
  not_interested: '无兴趣', customer: '已成客户', do_not_contact: '请勿联系'
}

const T = {
  en: {
    title: 'Restaurant Finder',
    subtitle: 'Multi-ethnic restaurant lead database',
    search: 'Search name, owner, city, phone...',
    allGroups: 'All Ethnic Groups',
    allStates: 'All States',
    allStatuses: 'All Statuses',
    addRestaurant: 'Add Restaurant',
    scrape: 'Scrape Google Maps',
    export: 'Export CSV',
    refresh: 'Refresh',
    stats: 'Stats',
    total: 'Total Leads',
    withOwner: 'With Owner Name',
    withPhone: 'With Phone',
    verified: 'Verified',
    noResults: 'No restaurants found. Try adjusting your filters or add one.',
    loading: 'Loading restaurants...',
    name: 'Restaurant Name',
    ethnicGroup: 'Ethnic Group',
    cuisineDetail: 'Cuisine Detail',
    address: 'Address',
    phone: 'Phone',
    owner: 'Owner',
    hours: 'Hours',
    status: 'Status',
    rating: 'Rating',
    actions: 'Actions',
    edit: 'Edit',
    delete: 'Delete',
    deleteConfirm: 'Delete this restaurant lead?',
    save: 'Save',
    cancel: 'Cancel',
    close: 'Close',
    // Form fields
    restaurantName: 'Restaurant Name *',
    dbaName: 'DBA Name',
    group: 'Ethnic Group *',
    cuisine: 'Cuisine Detail (e.g. Cantonese, Sichuan)',
    street: 'Street Address',
    city: 'City',
    state: 'State',
    zip: 'ZIP Code',
    phone1: 'Phone',
    phone2: 'Phone 2',
    email: 'Email',
    website: 'Website',
    ownerName: 'Owner Name',
    ownerEmail: 'Owner Email',
    ownerPhone: 'Owner Phone',
    contactTitle: 'Title (Owner / Manager)',
    hoursLabel: 'Hours of Operation',
    open: 'Open',
    closed: 'Closed',
    hoursNotes: 'Hours Notes',
    leadStatus: 'Lead Status',
    salesNotes: 'Sales Notes',
    assignedRep: 'Assigned Rep',
    dataSource: 'Data Source',
    // Scrape modal
    scrapeTitle: 'Scrape Google Maps',
    scrapeGroup: 'Ethnic Group',
    scrapeCity: 'City',
    scrapeState: 'State',
    scrapeLimit: 'Max Results',
    scrapeEnrich: 'Find Owner Name & Email (uses extra credits)',
    scrapeEnrichHint: 'Visits each restaurant website to extract owner/contact info. Slower and uses more Outscraper credits.',
    scrapeBtn: 'Start Scrape',
    scraping: 'Scraping...',
    scrapeSuccess: 'Scrape complete',
    scrapeError: 'Scrape failed',
    scrapeNoKey: 'OUTSCRAPER_API_KEY not configured on Railway. Add it to enable scraping.',
    imported: 'imported',
    skipped: 'skipped (duplicates)',
    errors: 'errors',
    // Stats
    byGroup: 'By Ethnic Group',
    byState: 'By State',
    byStatus: 'By Lead Status',
  },
  zh: {
    title: '餐厅查找器',
    subtitle: '多族裔餐厅线索数据库',
    search: '搜索名称、负责人、城市、电话...',
    allGroups: '全部族裔',
    allStates: '全部州份',
    allStatuses: '全部状态',
    addRestaurant: '添加餐厅',
    scrape: '抓取谷歌地图',
    export: '导出 CSV',
    refresh: '刷新',
    stats: '统计',
    total: '总线索数',
    withOwner: '含负责人姓名',
    withPhone: '含电话号码',
    verified: '已核实',
    noResults: '未找到餐厅，请调整筛选条件或手动添加。',
    loading: '加载中...',
    name: '餐厅名称',
    ethnicGroup: '族裔类型',
    cuisineDetail: '菜系细分',
    address: '地址',
    phone: '电话',
    owner: '负责人',
    hours: '营业时间',
    status: '状态',
    rating: '评分',
    actions: '操作',
    edit: '编辑',
    delete: '删除',
    deleteConfirm: '确定删除此餐厅线索？',
    save: '保存',
    cancel: '取消',
    close: '关闭',
    restaurantName: '餐厅名称 *',
    dbaName: '营业名称',
    group: '族裔类型 *',
    cuisine: '菜系细分（如：粤菜、川菜）',
    street: '街道地址',
    city: '城市',
    state: '州',
    zip: '邮编',
    phone1: '电话',
    phone2: '备用电话',
    email: '邮箱',
    website: '网站',
    ownerName: '负责人姓名',
    ownerEmail: '负责人邮箱',
    ownerPhone: '负责人电话',
    contactTitle: '职位（老板/经理）',
    hoursLabel: '营业时间',
    open: '开门',
    closed: '休息',
    hoursNotes: '营业时间备注',
    leadStatus: '线索状态',
    salesNotes: '销售备注',
    assignedRep: '负责销售',
    dataSource: '数据来源',
    scrapeTitle: '抓取谷歌地图',
    scrapeGroup: '族裔类型',
    scrapeCity: '城市',
    scrapeState: '州',
    scrapeLimit: '最大数量',
    scrapeEnrich: '查找负责人姓名和邮箱（消耗额外积分）',
    scrapeEnrichHint: '访问每家餐厅网站以提取负责人/联系人信息。速度较慢，消耗更多 Outscraper 积分。',
    scrapeBtn: '开始抓取',
    scraping: '抓取中...',
    scrapeSuccess: '抓取完成',
    scrapeError: '抓取失败',
    scrapeNoKey: 'Railway 未配置 OUTSCRAPER_API_KEY，请添加后启用抓取功能。',
    imported: '已导入',
    skipped: '已跳过（重复）',
    errors: '错误',
    byGroup: '按族裔分类',
    byState: '按州分类',
    byStatus: '按状态分类',
  }
}

// ── Stat Card ──────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, color = 'text-stone-800' }) => (
  <div className="bg-white rounded-xl border border-stone-200 p-4 text-center">
    <div className={`text-2xl font-bold ${color}`}>{value?.toLocaleString() ?? '—'}</div>
    <div className="text-xs text-stone-500 mt-1">{label}</div>
  </div>
)

// ── Hours Display ──────────────────────────────────────────────────────────────
const HoursDisplay = ({ hours, lang }) => {
  const dayLabels = lang === 'zh' ? DAY_LABELS_ZH : DAY_LABELS_EN
  const hasAny = DAYS.some(d => hours?.[d])
  if (!hasAny) return <span className="text-stone-400 text-xs">—</span>
  return (
    <div className="text-xs space-y-0.5">
      {DAYS.map(day => {
        const h = hours?.[day]
        if (!h) return null
        return (
          <div key={day} className="flex gap-1">
            <span className="text-stone-500 w-7 shrink-0">{dayLabels[day]}</span>
            <span className="text-stone-700">{h.open}–{h.close}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Restaurant Form Modal ──────────────────────────────────────────────────────
const RestaurantFormModal = ({ restaurant, ethnicGroups, eastCoastStates, lang, onSave, onClose }) => {
  const t = T[lang]
  const isEdit = !!restaurant?.id
  const [form, setForm] = useState(() => {
    if (restaurant) return { ...restaurant }
    return {
      name: '', dba_name: '', ethnic_group: '', cuisine_detail: '',
      address_street: '', address_city: '', address_state: '', address_zip: '',
      phone: '', phone_2: '', email: '', website: '',
      owner_name: '', owner_email: '', owner_phone: '', contact_title: '',
      hours: {}, hours_notes: '',
      lead_status: 'new', sales_notes: '', assigned_rep: '',
      data_source: 'Manual',
    }
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }))
  const setHour = (day, type, val) => setForm(f => ({
    ...f,
    hours: { ...f.hours, [day]: { ...(f.hours?.[day] || {}), [type]: val } }
  }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const url = isEdit ? `${API_BASE}/api/restaurants/${restaurant.id}` : `${API_BASE}/api/restaurants`
      const method = isEdit ? 'PUT' : 'POST'
      const res = await staffFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Save failed')
      }
      const saved = await res.json()
      onSave(saved)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const inputCls = "w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
  const labelCls = "block text-xs font-medium text-stone-600 mb-1"

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-semibold text-stone-800">
            {isEdit ? t.edit : t.addRestaurant}
          </h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Core Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className={labelCls}>{t.restaurantName}</label>
              <input className={inputCls} value={form.name || ''} onChange={e => set('name', e.target.value)} required />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className={labelCls}>{t.dbaName}</label>
              <input className={inputCls} value={form.dba_name || ''} onChange={e => set('dba_name', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>{t.group}</label>
              <select className={inputCls} value={form.ethnic_group || ''} onChange={e => set('ethnic_group', e.target.value)} required>
                <option value="">— Select —</option>
                {ethnicGroups.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>{t.cuisine}</label>
              <input className={inputCls} value={form.cuisine_detail || ''} onChange={e => set('cuisine_detail', e.target.value)} placeholder="e.g. Cantonese, Dim Sum" />
            </div>
          </div>

          {/* Address */}
          <div>
            <div className="text-sm font-semibold text-stone-700 mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4" />{t.address}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={labelCls}>{t.street}</label>
                <input className={inputCls} value={form.address_street || ''} onChange={e => set('address_street', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>{t.city}</label>
                <input className={inputCls} value={form.address_city || ''} onChange={e => set('address_city', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>{t.state}</label>
                  <select className={inputCls} value={form.address_state || ''} onChange={e => set('address_state', e.target.value)}>
                    <option value="">—</option>
                    {eastCoastStates.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>{t.zip}</label>
                  <input className={inputCls} value={form.address_zip || ''} onChange={e => set('address_zip', e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div>
            <div className="text-sm font-semibold text-stone-700 mb-3 flex items-center gap-2">
              <Phone className="w-4 h-4" />{t.phone}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>{t.phone1}</label>
                <input className={inputCls} value={form.phone || ''} onChange={e => set('phone', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>{t.phone2}</label>
                <input className={inputCls} value={form.phone_2 || ''} onChange={e => set('phone_2', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>{t.email}</label>
                <input className={inputCls} type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>{t.website}</label>
                <input className={inputCls} value={form.website || ''} onChange={e => set('website', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Owner */}
          <div>
            <div className="text-sm font-semibold text-stone-700 mb-3 flex items-center gap-2">
              <User className="w-4 h-4" />{t.owner}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>{t.ownerName}</label>
                <input className={inputCls} value={form.owner_name || ''} onChange={e => set('owner_name', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>{t.contactTitle}</label>
                <input className={inputCls} value={form.contact_title || ''} onChange={e => set('contact_title', e.target.value)} placeholder="Owner / Manager" />
              </div>
              <div>
                <label className={labelCls}>{t.ownerEmail}</label>
                <input className={inputCls} type="email" value={form.owner_email || ''} onChange={e => set('owner_email', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>{t.ownerPhone}</label>
                <input className={inputCls} value={form.owner_phone || ''} onChange={e => set('owner_phone', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Hours */}
          <div>
            <div className="text-sm font-semibold text-stone-700 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />{t.hoursLabel}
            </div>
            <div className="space-y-2">
              {DAYS.map(day => {
                const dayLabels = lang === 'zh' ? DAY_LABELS_ZH : DAY_LABELS_EN
                const h = form.hours?.[day] || {}
                const isClosed = !h.open && !h.close
                return (
                  <div key={day} className="flex items-center gap-3">
                    <span className="text-sm text-stone-600 w-10 shrink-0">{dayLabels[day]}</span>
                    <input
                      type="time"
                      className="border border-stone-300 rounded px-2 py-1 text-sm w-28"
                      value={h.open || ''}
                      onChange={e => setHour(day, 'open', e.target.value)}
                    />
                    <span className="text-stone-400 text-sm">–</span>
                    <input
                      type="time"
                      className="border border-stone-300 rounded px-2 py-1 text-sm w-28"
                      value={h.close || ''}
                      onChange={e => setHour(day, 'close', e.target.value)}
                    />
                    {isClosed && <span className="text-xs text-stone-400">{t.closed}</span>}
                  </div>
                )
              })}
              <div className="mt-2">
                <label className={labelCls}>{t.hoursNotes}</label>
                <input className={inputCls} value={form.hours_notes || ''} onChange={e => set('hours_notes', e.target.value)} placeholder="e.g. Closed Tuesdays, Lunch only" />
              </div>
            </div>
          </div>

          {/* CRM */}
          <div>
            <div className="text-sm font-semibold text-stone-700 mb-3">CRM</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>{t.leadStatus}</label>
                <select className={inputCls} value={form.lead_status || 'new'} onChange={e => set('lead_status', e.target.value)}>
                  {Object.entries(LEAD_STATUS_LABELS_EN).map(([val, lbl]) => (
                    <option key={val} value={val}>{lbl}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>{t.assignedRep}</label>
                <input className={inputCls} value={form.assigned_rep || ''} onChange={e => set('assigned_rep', e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>{t.salesNotes}</label>
                <textarea className={inputCls + ' resize-none'} rows={3} value={form.sales_notes || ''} onChange={e => set('sales_notes', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>{t.dataSource}</label>
                <input className={inputCls} value={form.data_source || 'Manual'} onChange={e => set('data_source', e.target.value)} />
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-lg px-4 py-3">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="flex-1 bg-stone-800 hover:bg-stone-700 text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50">
              {saving ? '...' : t.save}
            </button>
            <button type="button" onClick={onClose}
              className="flex-1 border border-stone-300 text-stone-700 rounded-lg py-2.5 text-sm font-medium hover:bg-stone-50">
              {t.cancel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Scrape Modal ───────────────────────────────────────────────────────────────
const ScrapeModal = ({ ethnicGroups, eastCoastStates, lang, onClose, onDone }) => {
  const t = T[lang]
  const [form, setForm] = useState({ ethnic_group: 'Chinese', city: 'New York', state: 'NY', limit: 50, enrich_contacts: false })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const handleScrape = async () => {
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await staffFetch(`${API_BASE}/api/restaurants/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.error?.includes('OUTSCRAPER_API_KEY')) {
          setError(t.scrapeNoKey)
        } else {
          setError(data.error || t.scrapeError)
        }
        return
      }
      setResult(data)
      onDone()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const inputCls = "w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="border-b border-stone-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-800">{t.scrapeTitle}</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">{t.scrapeGroup}</label>
            <select className={inputCls} value={form.ethnic_group} onChange={e => setForm(f => ({ ...f, ethnic_group: e.target.value }))}>
              {ethnicGroups.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">{t.scrapeCity}</label>
              <input className={inputCls} value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">{t.scrapeState}</label>
              <select className={inputCls} value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))}>
                {eastCoastStates.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">{t.scrapeLimit}</label>
            <input className={inputCls} type="number" min={1} max={500} value={form.limit} onChange={e => setForm(f => ({ ...f, limit: parseInt(e.target.value) || 50 }))} />
          </div>

          {/* Owner Name / Email Enrichment Toggle */}
          <div className="flex items-start gap-3 bg-stone-50 border border-stone-200 rounded-lg px-4 py-3">
            <input
              id="enrich-toggle"
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-stone-300 cursor-pointer accent-stone-800"
              checked={form.enrich_contacts}
              onChange={e => setForm(f => ({ ...f, enrich_contacts: e.target.checked }))}
            />
            <div>
              <label htmlFor="enrich-toggle" className="text-sm font-medium text-stone-700 cursor-pointer">{t.scrapeEnrich}</label>
              <p className="text-xs text-stone-500 mt-0.5">{t.scrapeEnrichHint}</p>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-amber-700 text-sm bg-amber-50 rounded-lg px-4 py-3">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className="flex items-center gap-2 text-green-700 text-sm bg-green-50 rounded-lg px-4 py-3">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>
                {t.scrapeSuccess}: <strong>{result.imported}</strong> {t.imported},&nbsp;
                <strong>{result.skipped_duplicates}</strong> {t.skipped}
                {result.errors > 0 ? `, ${result.errors} ${t.errors}` : ''}
              </span>
            </div>
          )}

          <button onClick={handleScrape} disabled={loading}
            className="w-full bg-stone-800 hover:bg-stone-700 text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <><RefreshCw className="w-4 h-4 animate-spin" />{t.scraping}</> : t.scrapeBtn}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Stats Panel ────────────────────────────────────────────────────────────────
const StatsPanel = ({ stats, lang, onClose }) => {
  const t = T[lang]
  if (!stats) return null
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-semibold text-stone-800">{t.stats}</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label={t.total} value={stats.total} color="text-stone-800" />
            <StatCard label={t.withOwner} value={stats.with_owner_name} color="text-blue-700" />
            <StatCard label={t.withPhone} value={stats.with_phone} color="text-green-700" />
            <StatCard label={t.verified} value={stats.verified} color="text-emerald-700" />
          </div>

          <div>
            <div className="text-sm font-semibold text-stone-700 mb-3">{t.byGroup}</div>
            <div className="space-y-1.5">
              {stats.by_ethnic_group?.slice(0, 15).map(({ group, count }) => (
                <div key={group} className="flex items-center gap-2">
                  <span className="text-sm text-stone-600 w-36 shrink-0">{group}</span>
                  <div className="flex-1 bg-stone-100 rounded-full h-2">
                    <div className="bg-stone-600 h-2 rounded-full" style={{ width: `${Math.min(100, (count / (stats.total || 1)) * 100)}%` }} />
                  </div>
                  <span className="text-sm font-medium text-stone-700 w-8 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-sm font-semibold text-stone-700 mb-3">{t.byState}</div>
              <div className="space-y-1">
                {stats.by_state?.slice(0, 10).map(({ state, count }) => (
                  <div key={state} className="flex justify-between text-sm">
                    <span className="text-stone-600">{state}</span>
                    <span className="font-medium text-stone-800">{count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold text-stone-700 mb-3">{t.byStatus}</div>
              <div className="space-y-1">
                {stats.by_lead_status?.map(({ status, count }) => (
                  <div key={status} className="flex justify-between text-sm">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${LEAD_STATUS_COLORS[status] || 'bg-stone-100 text-stone-600'}`}>
                      {LEAD_STATUS_LABELS_EN[status] || status}
                    </span>
                    <span className="font-medium text-stone-800">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export const RestaurantFinderTab = ({ lang = 'en' }) => {
  const t = T[lang]
  const [restaurants, setRestaurants] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(false)

  const [search, setSearch] = useState('')
  const [filterGroup, setFilterGroup] = useState('')
  const [filterState, setFilterState] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [sortField, setSortField] = useState('created_at')
  const [sortOrder, setSortOrder] = useState('desc')

  const [meta, setMeta] = useState({ ethnic_groups: [], east_coast_states: [], lead_statuses: [] })
  const [stats, setStats] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  const [showForm, setShowForm] = useState(false)
  const [editRestaurant, setEditRestaurant] = useState(null)
  const [showScrape, setShowScrape] = useState(false)
  const [showStats, setShowStats] = useState(false)

  const searchTimer = useRef(null)

  // Load metadata
  useEffect(() => {
    fetch(`${API_BASE}/api/restaurants/meta`)
      .then(r => r.json())
      .then(setMeta)
      .catch(() => {})
  }, [])

  const loadRestaurants = useCallback(async (pg = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pg,
        per_page: 50,
        sort: sortField,
        order: sortOrder,
      })
      if (search) params.set('q', search)
      if (filterGroup) params.set('ethnic_group', filterGroup)
      if (filterState) params.set('state', filterState)
      if (filterStatus) params.set('lead_status', filterStatus)

      const res = await staffFetch(`${API_BASE}/api/restaurants?${params}`)
      if (res.ok) {
        const data = await res.json()
        setRestaurants(data.restaurants || [])
        setTotal(data.total || 0)
        setPages(data.pages || 1)
        setPage(pg)
      }
    } catch (err) {
      console.error('Load error:', err)
    } finally {
      setLoading(false)
    }
  }, [search, filterGroup, filterState, filterStatus, sortField, sortOrder])

  useEffect(() => {
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => loadRestaurants(1), 400)
    return () => clearTimeout(searchTimer.current)
  }, [loadRestaurants])

  const loadStats = async () => {
    try {
      const res = await staffFetch(`${API_BASE}/api/restaurants/stats`)
      if (res.ok) setStats(await res.json())
    } catch {}
  }

  const handleDelete = async (id) => {
    if (!window.confirm(t.deleteConfirm)) return
    try {
      await staffFetch(`${API_BASE}/api/restaurants/${id}`, { method: 'DELETE' })
      loadRestaurants(page)
    } catch {}
  }

  const handleSaved = (saved) => {
    setShowForm(false)
    setEditRestaurant(null)
    loadRestaurants(page)
  }

  const handleExport = () => {
    const params = new URLSearchParams()
    if (filterGroup) params.set('ethnic_group', filterGroup)
    if (filterState) params.set('state', filterState)
    if (filterStatus) params.set('lead_status', filterStatus)
    // Build URL with auth token
    const token = localStorage.getItem('staffToken') || ''
    const url = `${API_BASE}/api/restaurants/export/csv?${params}&_token=${token}`
    window.open(url, '_blank')
  }

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortOrder(o => o === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronDown className="w-3 h-3 text-stone-300" />
    return sortOrder === 'asc'
      ? <ChevronUp className="w-3 h-3 text-stone-600" />
      : <ChevronDown className="w-3 h-3 text-stone-600" />
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-stone-800 flex items-center gap-2">
            <Building2 className="w-5 h-5" />{t.title}
          </h2>
          <p className="text-sm text-stone-500 mt-0.5">{t.subtitle} — <strong>{total.toLocaleString()}</strong> total</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { loadStats(); setShowStats(true) }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-stone-300 rounded-lg hover:bg-stone-50 text-stone-700">
            <BarChart2 className="w-4 h-4" />{t.stats}
          </button>
          <button onClick={() => setShowScrape(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-stone-300 rounded-lg hover:bg-stone-50 text-stone-700">
            <Globe className="w-4 h-4" />{t.scrape}
          </button>
          <button onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-stone-300 rounded-lg hover:bg-stone-50 text-stone-700">
            <Download className="w-4 h-4" />{t.export}
          </button>
          <button onClick={() => { setEditRestaurant(null); setShowForm(true) }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-stone-800 text-white rounded-lg hover:bg-stone-700">
            <Plus className="w-4 h-4" />{t.addRestaurant}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
            placeholder={t.search}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
          value={filterGroup}
          onChange={e => setFilterGroup(e.target.value)}
        >
          <option value="">{t.allGroups}</option>
          {meta.ethnic_groups.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
          value={filterState}
          onChange={e => setFilterState(e.target.value)}
        >
          <option value="">{t.allStates}</option>
          {meta.east_coast_states.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="">{t.allStatuses}</option>
          {meta.lead_statuses.map(s => <option key={s} value={s}>{LEAD_STATUS_LABELS_EN[s] || s}</option>)}
        </select>
        <button onClick={() => loadRestaurants(1)} className="p-2 border border-stone-300 rounded-lg hover:bg-stone-50 text-stone-600">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-stone-400">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" />{t.loading}
          </div>
        ) : restaurants.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-stone-400">
            <Building2 className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">{t.noResults}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-stone-600 cursor-pointer hover:text-stone-800" onClick={() => toggleSort('name')}>
                    <span className="flex items-center gap-1">{t.name}<SortIcon field="name" /></span>
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-stone-600 cursor-pointer hover:text-stone-800" onClick={() => toggleSort('ethnic_group')}>
                    <span className="flex items-center gap-1">{t.ethnicGroup}<SortIcon field="ethnic_group" /></span>
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-stone-600 cursor-pointer hover:text-stone-800" onClick={() => toggleSort('city')}>
                    <span className="flex items-center gap-1">{t.address}<SortIcon field="city" /></span>
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-stone-600">{t.phone}</th>
                  <th className="text-left px-4 py-3 font-medium text-stone-600 cursor-pointer hover:text-stone-800" onClick={() => toggleSort('owner_name')}>
                    <span className="flex items-center gap-1">{t.owner}<SortIcon field="owner_name" /></span>
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-stone-600 cursor-pointer hover:text-stone-800" onClick={() => toggleSort('lead_status')}>
                    <span className="flex items-center gap-1">{t.status}<SortIcon field="lead_status" /></span>
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-stone-600">{t.rating}</th>
                  <th className="text-right px-4 py-3 font-medium text-stone-600">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {restaurants.map(r => (
                  <>
                    <tr key={r.id} className="hover:bg-stone-50 transition-colors">
                      <td className="px-4 py-3">
                        <button
                          className="text-left font-medium text-stone-800 hover:text-stone-600"
                          onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                        >
                          {r.name}
                          {r.dba_name && <span className="block text-xs text-stone-400">dba {r.dba_name}</span>}
                        </button>
                        {r.cuisine_detail && <span className="text-xs text-stone-500 block">{r.cuisine_detail}</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block bg-stone-100 text-stone-700 text-xs px-2 py-0.5 rounded-full">
                          {r.ethnic_group}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-stone-600 text-xs">
                        {r.address?.street && <div>{r.address.street}</div>}
                        <div>{[r.address?.city, r.address?.state, r.address?.zip].filter(Boolean).join(', ')}</div>
                      </td>
                      <td className="px-4 py-3 text-stone-700 text-xs">
                        {r.phone ? <a href={`tel:${r.phone}`} className="hover:text-stone-900">{r.phone}</a> : <span className="text-stone-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-stone-700 text-xs">
                        {r.owner?.name ? (
                          <div>
                            <div className="font-medium">{r.owner.name}</div>
                            {r.owner.title && <div className="text-stone-400">{r.owner.title}</div>}
                          </div>
                        ) : <span className="text-stone-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${LEAD_STATUS_COLORS[r.lead_status] || 'bg-stone-100 text-stone-600'}`}>
                          {lang === 'zh' ? LEAD_STATUS_LABELS_ZH[r.lead_status] : LEAD_STATUS_LABELS_EN[r.lead_status] || r.lead_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-stone-600 text-xs">
                        {r.google_rating ? (
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                            {r.google_rating.toFixed(1)}
                            {r.google_review_count && <span className="text-stone-400">({r.google_review_count})</span>}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => { setEditRestaurant(r); setShowForm(true) }}
                            className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded">
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(r.id)}
                            className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedId === r.id && (
                      <tr key={`${r.id}-expanded`} className="bg-stone-50">
                        <td colSpan={8} className="px-6 py-4">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                            {r.phone_2 && (
                              <div>
                                <div className="text-xs text-stone-400 mb-1">{t.phone2}</div>
                                <div className="text-stone-700">{r.phone_2}</div>
                              </div>
                            )}
                            {r.email && (
                              <div>
                                <div className="text-xs text-stone-400 mb-1">{t.email}</div>
                                <a href={`mailto:${r.email}`} className="text-blue-600 hover:underline">{r.email}</a>
                              </div>
                            )}
                            {r.owner?.email && (
                              <div>
                                <div className="text-xs text-stone-400 mb-1">{t.ownerEmail}</div>
                                <a href={`mailto:${r.owner.email}`} className="text-blue-600 hover:underline">{r.owner.email}</a>
                              </div>
                            )}
                            {r.website && (
                              <div>
                                <div className="text-xs text-stone-400 mb-1">{t.website}</div>
                                <a href={r.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate block max-w-xs">{r.website}</a>
                              </div>
                            )}
                            <div>
                              <div className="text-xs text-stone-400 mb-1">{t.hours}</div>
                              <HoursDisplay hours={r.hours} lang={lang} />
                              {r.hours_notes && <div className="text-xs text-stone-500 mt-1 italic">{r.hours_notes}</div>}
                            </div>
                            {r.sales_notes && (
                              <div className="col-span-2">
                                <div className="text-xs text-stone-400 mb-1">{t.salesNotes}</div>
                                <div className="text-stone-700">{r.sales_notes}</div>
                              </div>
                            )}
                            {r.data_source && (
                              <div>
                                <div className="text-xs text-stone-400 mb-1">{t.dataSource}</div>
                                <div className="text-stone-600">{r.data_source}</div>
                              </div>
                            )}
                            {r.google_maps_url && (
                              <div>
                                <a href={r.google_maps_url} target="_blank" rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />View on Google Maps
                                </a>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => loadRestaurants(page - 1)}
            className="px-3 py-1.5 text-sm border border-stone-300 rounded-lg disabled:opacity-40 hover:bg-stone-50">
            ← Prev
          </button>
          <span className="text-sm text-stone-600">Page {page} of {pages}</span>
          <button disabled={page >= pages} onClick={() => loadRestaurants(page + 1)}
            className="px-3 py-1.5 text-sm border border-stone-300 rounded-lg disabled:opacity-40 hover:bg-stone-50">
            Next →
          </button>
        </div>
      )}

      {/* Modals */}
      {showForm && (
        <RestaurantFormModal
          restaurant={editRestaurant}
          ethnicGroups={meta.ethnic_groups}
          eastCoastStates={meta.east_coast_states}
          lang={lang}
          onSave={handleSaved}
          onClose={() => { setShowForm(false); setEditRestaurant(null) }}
        />
      )}
      {showScrape && (
        <ScrapeModal
          ethnicGroups={meta.ethnic_groups}
          eastCoastStates={meta.east_coast_states}
          lang={lang}
          onClose={() => setShowScrape(false)}
          onDone={() => loadRestaurants(1)}
        />
      )}
      {showStats && stats && (
        <StatsPanel stats={stats} lang={lang} onClose={() => setShowStats(false)} />
      )}
    </div>
  )
}

export default RestaurantFinderTab
