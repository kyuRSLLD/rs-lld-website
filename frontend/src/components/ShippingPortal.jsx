/**
 * ShippingPortal.jsx
 * Dedicated warehouse / shipping manager portal at /shipping
 * Shows only what needs to be shipped — no sales info, no pricing.
 * Bilingual: English + Simplified Chinese
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { staffFetch, saveStaffToken, clearStaffToken, getStaffToken, STAFF_TOKEN_KEY } from '../lib/staffApi'

// ─── i18n ─────────────────────────────────────────────────────────────────────
const T = {
  en: {
    title: 'RS LLD Shipping Portal',
    subtitle: 'Warehouse Order Queue',
    username: 'Username',
    password: 'Password',
    login: 'Log In',
    logout: 'Log Out',
    loginError: 'Invalid credentials or no shipping access.',
    loading: 'Loading…',
    // Stats
    active: 'Active Orders',
    pending: 'Pending',
    confirmed: 'Confirmed',
    shippedToday: 'Shipped Today',
    // Filters
    all: 'All',
    allOrders: 'All Orders',
    pendingOrders: 'Pending',
    confirmedOrders: 'Confirmed',
    shippedOrders: 'Shipped',
    deliveredOrders: 'Delivered',
    search: 'Search order #, name, company…',
    // Table
    orderNumber: 'Order #',
    customer: 'Ship To',
    address: 'Address',
    items: 'Items',
    requestedDate: 'Requested',
    status: 'Status',
    actions: 'Actions',
    // Actions
    confirmPick: 'Confirm Pick',
    markShipped: 'Mark Shipped',
    markDelivered: 'Mark Delivered',
    printSlip: 'Packing Slip',
    // Ship modal
    shipOrder: 'Ship Order',
    trackingNumber: 'Tracking Number',
    carrier: 'Carrier',
    carrierPlaceholder: 'UPS, FedEx, USPS…',
    trackingPlaceholder: '1Z999AA10123456784',
    confirmShip: 'Confirm Shipped',
    cancel: 'Cancel',
    // Packing slip
    packingSlip: 'Packing Slip',
    shipTo: 'Ship To',
    orderDate: 'Order Date',
    specialNotes: 'Special Notes',
    qty: 'Qty',
    sku: 'SKU',
    product: 'Product',
    brand: 'Brand',
    size: 'Size',
    print: 'Print',
    close: 'Close',
    // Status badges
    statusPending: 'Pending',
    statusConfirmed: 'Confirmed',
    statusShipped: 'Shipped',
    statusDelivered: 'Delivered',
    noOrders: 'No orders found.',
    refreshing: 'Refreshing…',
    refresh: 'Refresh',
    lang: '中文',
  },
  zh: {
    title: 'RS LLD 发货管理系统',
    subtitle: '仓库发货队列',
    username: '用户名',
    password: '密码',
    login: '登录',
    logout: '退出',
    loginError: '用户名或密码错误，或无发货权限。',
    loading: '加载中…',
    active: '待处理订单',
    pending: '待确认',
    confirmed: '已确认',
    shippedToday: '今日已发货',
    all: '全部',
    allOrders: '全部订单',
    pendingOrders: '待确认',
    confirmedOrders: '已确认',
    shippedOrders: '已发货',
    deliveredOrders: '已送达',
    search: '搜索订单号、姓名、公司…',
    orderNumber: '订单号',
    customer: '收货人',
    address: '地址',
    items: '商品',
    requestedDate: '要求日期',
    status: '状态',
    actions: '操作',
    confirmPick: '确认拣货',
    markShipped: '标记发货',
    markDelivered: '标记送达',
    printSlip: '打印装箱单',
    shipOrder: '发货',
    trackingNumber: '快递单号',
    carrier: '快递公司',
    carrierPlaceholder: 'UPS、FedEx、USPS…',
    trackingPlaceholder: '1Z999AA10123456784',
    confirmShip: '确认发货',
    cancel: '取消',
    packingSlip: '装箱单',
    shipTo: '收货地址',
    orderDate: '下单日期',
    specialNotes: '备注',
    qty: '数量',
    sku: '货号',
    product: '商品名称',
    brand: '品牌',
    size: '规格',
    print: '打印',
    close: '关闭',
    statusPending: '待确认',
    statusConfirmed: '已确认',
    statusShipped: '已发货',
    statusDelivered: '已送达',
    noOrders: '暂无订单。',
    refreshing: '刷新中…',
    refresh: '刷新',
    lang: 'English',
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const SHIPPING_TOKEN_KEY = 'shipping_jwt_token'

function getShippingToken() {
  const v = localStorage.getItem(SHIPPING_TOKEN_KEY)
  return (!v || v === 'null' || v === 'undefined') ? null : v
}
function saveShippingToken(t) { if (t) localStorage.setItem(SHIPPING_TOKEN_KEY, t) }
function clearShippingToken() { localStorage.removeItem(SHIPPING_TOKEN_KEY) }

function shippingFetch(path, options = {}) {
  const token = getShippingToken()
  const headers = { ...(options.headers || {}) }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const API_BASE = import.meta.env.VITE_API_URL || ''
  const fullUrl = path.startsWith('http') ? path : `${API_BASE}${path}`
  return fetch(fullUrl, { ...options, headers, credentials: 'include' })
}

function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function StatusBadge({ status, t }) {
  const map = {
    pending:   'bg-amber-100 text-amber-700',
    confirmed: 'bg-blue-100 text-blue-700',
    shipped:   'bg-green-100 text-green-700',
    delivered: 'bg-stone-100 text-stone-500',
  }
  const label = {
    pending: t.statusPending,
    confirmed: t.statusConfirmed,
    shipped: t.statusShipped,
    delivered: t.statusDelivered,
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status] || 'bg-stone-100 text-stone-500'}`}>
      {label[status] || status}
    </span>
  )
}

// ─── Packing Slip Modal ───────────────────────────────────────────────────────
function PackingSlipModal({ order, t, onClose }) {
  const slipRef = useRef()
  const handlePrint = () => {
    const content = slipRef.current.innerHTML
    const w = window.open('', '_blank')
    w.document.write(`
      <html><head><title>Packing Slip ${order.order_number}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; font-size: 13px; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        h2 { font-size: 14px; margin: 16px 0 4px; color: #555; text-transform: uppercase; letter-spacing: 0.05em; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th { text-align: left; border-bottom: 2px solid #333; padding: 6px 4px; font-size: 12px; }
        td { padding: 6px 4px; border-bottom: 1px solid #eee; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; }
        .brand { font-size: 18px; font-weight: bold; color: #1d4ed8; }
        .notes { background: #fffbeb; border: 1px solid #fcd34d; padding: 8px; border-radius: 4px; margin-top: 8px; }
        @media print { button { display: none; } }
      </style></head><body>${content}</body></html>
    `)
    w.document.close()
    w.focus()
    w.print()
    w.close()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold text-stone-900">{t.packingSlip} — {order.order_number}</h2>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              🖨 {t.print}
            </button>
            <button onClick={onClose} className="px-3 py-1.5 border border-stone-200 rounded-lg text-sm text-stone-600 hover:bg-stone-50">
              {t.close}
            </button>
          </div>
        </div>
        <div ref={slipRef} className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="text-xl font-bold text-blue-700">RS LLD Restaurant Supply</div>
              <div className="text-sm text-stone-500 mt-1">{t.packingSlip}</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-stone-900">{order.order_number}</div>
              <div className="text-sm text-stone-500">{fmtDate(order.created_at)}</div>
            </div>
          </div>

          {/* Ship To */}
          <div className="bg-stone-50 rounded-lg p-4 mb-4">
            <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">{t.shipTo}</div>
            <div className="font-semibold text-stone-900">{order.delivery_name}</div>
            {order.delivery_company && <div className="text-stone-700">{order.delivery_company}</div>}
            <div className="text-stone-600">{order.delivery_address}</div>
            <div className="text-stone-600">{order.delivery_city}, {order.delivery_state} {order.delivery_zip}</div>
            {order.delivery_phone && <div className="text-stone-500 text-sm mt-1">📞 {order.delivery_phone}</div>}
          </div>

          {/* Special Notes */}
          {order.special_notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <div className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">{t.specialNotes}</div>
              <div className="text-sm text-amber-900">{order.special_notes}</div>
            </div>
          )}

          {/* Requested Delivery Date */}
          {order.preferred_delivery_date && (
            <div className="text-sm text-stone-600 mb-4">
              <span className="font-medium">{t.requestedDate}:</span> {order.preferred_delivery_date}
            </div>
          )}

          {/* Items */}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-stone-300">
                <th className="text-left py-2 pr-4">{t.qty}</th>
                <th className="text-left py-2 pr-4">{t.sku}</th>
                <th className="text-left py-2 pr-4">{t.product}</th>
                <th className="text-left py-2 pr-4">{t.brand}</th>
                <th className="text-left py-2">{t.size}</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, i) => (
                <tr key={i} className="border-b border-stone-100">
                  <td className="py-2 pr-4 font-bold text-stone-900">{item.quantity}</td>
                  <td className="py-2 pr-4 font-mono text-xs text-stone-500">{item.product_sku}</td>
                  <td className="py-2 pr-4 text-stone-900">{item.product_name}</td>
                  <td className="py-2 pr-4 text-stone-600">{item.product_brand || '—'}</td>
                  <td className="py-2 text-stone-600">{item.product_unit_size || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Total item count */}
          <div className="mt-4 text-right text-sm text-stone-500">
            Total items: <span className="font-bold text-stone-900">{order.items.reduce((s, i) => s + i.quantity, 0)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Ship Modal ───────────────────────────────────────────────────────────────
function ShipModal({ order, t, onConfirm, onClose }) {
  const [tracking, setTracking] = useState('')
  const [carrier, setCarrier] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    await onConfirm(order.order_number, tracking, carrier)
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-stone-900 mb-4">{t.shipOrder} — {order.order_number}</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">{t.carrier}</label>
            <input
              value={carrier}
              onChange={e => setCarrier(e.target.value)}
              placeholder={t.carrierPlaceholder}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">{t.trackingNumber}</label>
            <input
              value={tracking}
              onChange={e => setTracking(e.target.value)}
              placeholder={t.trackingPlaceholder}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 bg-green-600 text-white rounded-lg py-2 font-semibold hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? '…' : `✓ ${t.confirmShip}`}
          </button>
          <button onClick={onClose} className="flex-1 border border-stone-200 rounded-lg py-2 text-stone-600 hover:bg-stone-50">
            {t.cancel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Order Row ────────────────────────────────────────────────────────────────
function OrderRow({ order, t, onConfirm, onShip, onDeliver, onPrint }) {
  return (
    <tr className="border-b border-stone-100 hover:bg-stone-50">
      {/* Order # */}
      <td className="px-4 py-3">
        <span className="font-mono font-bold text-stone-900 text-sm">{order.order_number}</span>
        <div className="text-xs text-stone-400 mt-0.5">{fmtDateTime(order.created_at)}</div>
      </td>
      {/* Ship To */}
      <td className="px-4 py-3">
        <div className="font-medium text-stone-900 text-sm">{order.delivery_name}</div>
        {order.delivery_company && <div className="text-xs text-stone-500">{order.delivery_company}</div>}
        {order.delivery_phone && <div className="text-xs text-stone-400">{order.delivery_phone}</div>}
      </td>
      {/* Address */}
      <td className="px-4 py-3 hidden md:table-cell">
        <div className="text-sm text-stone-700">{order.delivery_address}</div>
        <div className="text-xs text-stone-500">{order.delivery_city}, {order.delivery_state} {order.delivery_zip}</div>
      </td>
      {/* Items */}
      <td className="px-4 py-3">
        <div className="space-y-0.5">
          {order.items.slice(0, 3).map((item, i) => (
            <div key={i} className="text-xs text-stone-700">
              <span className="font-bold text-stone-900">{item.quantity}×</span> {item.product_name}
              {item.product_unit_size && <span className="text-stone-400"> ({item.product_unit_size})</span>}
            </div>
          ))}
          {order.items.length > 3 && (
            <div className="text-xs text-stone-400">+{order.items.length - 3} more…</div>
          )}
        </div>
      </td>
      {/* Requested Date */}
      <td className="px-4 py-3 hidden lg:table-cell text-xs text-stone-500">
        {order.preferred_delivery_date || '—'}
      </td>
      {/* Status */}
      <td className="px-4 py-3">
        <StatusBadge status={order.status} t={t} />
        {order.special_notes && (
          <div className="text-xs text-amber-600 mt-1 max-w-[120px] truncate" title={order.special_notes}>
            ⚠ {order.special_notes}
          </div>
        )}
      </td>
      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex flex-col gap-1.5 items-end">
          {/* Packing Slip — always visible */}
          <button
            onClick={() => onPrint(order)}
            className="text-xs px-2.5 py-1 rounded border border-stone-200 text-stone-600 hover:bg-stone-50 flex items-center gap-1"
          >
            🖨 {t.printSlip}
          </button>
          {/* Confirm Pick */}
          {order.status === 'pending' && (
            <button
              onClick={() => onConfirm(order.order_number)}
              className="text-xs px-2.5 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 flex items-center gap-1 font-medium"
            >
              ✓ {t.confirmPick}
            </button>
          )}
          {/* Mark Shipped */}
          {(order.status === 'pending' || order.status === 'confirmed') && (
            <button
              onClick={() => onShip(order)}
              className="text-xs px-2.5 py-1 rounded bg-green-600 text-white hover:bg-green-700 flex items-center gap-1 font-semibold"
            >
              🚚 {t.markShipped}
            </button>
          )}
          {/* Mark Delivered */}
          {order.status === 'shipped' && (
            <button
              onClick={() => onDeliver(order.order_number)}
              className="text-xs px-2.5 py-1 rounded bg-stone-800 text-white hover:bg-stone-700 flex items-center gap-1 font-medium"
            >
              🏠 {t.markDelivered}
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

// ─── Main Portal ──────────────────────────────────────────────────────────────
export default function ShippingPortal() {
  const [lang, setLang] = useState('en')
  const t = T[lang]

  const [staff, setStaff] = useState(null)
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  const [orders, setOrders] = useState([])
  const [stats, setStats] = useState({ pending: 0, confirmed: 0, shipped_today: 0, active: 0 })
  const [statusFilter, setStatusFilter] = useState('active')
  const [searchQ, setSearchQ] = useState('')
  const [loadingOrders, setLoadingOrders] = useState(false)

  const [shipTarget, setShipTarget] = useState(null)   // order to show ship modal for
  const [slipTarget, setSlipTarget] = useState(null)   // order to show packing slip for

  // ── Check existing token on mount ──
  useEffect(() => {
    const token = getShippingToken()
    if (token) {
      shippingFetch('/api/shipping/me')
        .then(r => r.json())
        .then(d => { if (d.id) setStaff(d) })
        .catch(() => clearShippingToken())
    }
  }, [])

  // ── Load orders ──
  const loadOrders = useCallback(async () => {
    if (!staff) return
    setLoadingOrders(true)
    try {
      const params = new URLSearchParams({ status: statusFilter })
      if (searchQ) params.set('q', searchQ)
      const [ordersRes, statsRes] = await Promise.all([
        shippingFetch(`/api/shipping/orders?${params}`),
        shippingFetch('/api/shipping/stats'),
      ])
      const ordersData = await ordersRes.json()
      const statsData = await statsRes.json()
      setOrders(ordersData.orders || [])
      setStats(statsData)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingOrders(false)
    }
  }, [staff, statusFilter, searchQ])

  useEffect(() => { loadOrders() }, [loadOrders])

  // ── Auto-refresh every 60s ──
  useEffect(() => {
    if (!staff) return
    const interval = setInterval(loadOrders, 60000)
    return () => clearInterval(interval)
  }, [staff, loadOrders])

  // ── Login ──
  const handleLogin = async e => {
    e.preventDefault()
    setLoginLoading(true)
    setLoginError('')
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/shipping/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(loginForm),
      })
      const data = await res.json()
      if (data.success) {
        saveShippingToken(data.token)
        setStaff(data.staff)
      } else {
        setLoginError(data.error || t.loginError)
      }
    } catch {
      setLoginError(t.loginError)
    } finally {
      setLoginLoading(false)
    }
  }

  // ── Logout ──
  const handleLogout = async () => {
    await shippingFetch('/api/shipping/logout', { method: 'POST' })
    clearShippingToken()
    setStaff(null)
    setOrders([])
  }

  // ── Confirm Pick ──
  const handleConfirm = async (orderNumber) => {
    await shippingFetch(`/api/shipping/orders/${orderNumber}/confirm`, { method: 'POST' })
    loadOrders()
  }

  // ── Mark Shipped ──
  const handleShipConfirm = async (orderNumber, tracking, carrier) => {
    await shippingFetch(`/api/shipping/orders/${orderNumber}/ship`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tracking_number: tracking, carrier }),
    })
    setShipTarget(null)
    loadOrders()
  }

  // ── Mark Delivered ──
  const handleDeliver = async (orderNumber) => {
    await shippingFetch(`/api/shipping/orders/${orderNumber}/deliver`, { method: 'POST' })
    loadOrders()
  }

  // ─── Login Screen ──────────────────────────────────────────────────────────
  if (!staff) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-100 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8">
          {/* Logo / Title */}
          <div className="text-center mb-8">
            <div className="text-3xl font-black text-blue-700 tracking-tight">RS LLD</div>
            <div className="text-sm font-semibold text-stone-500 mt-1 uppercase tracking-widest">Shipping Portal</div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t.username}</label>
              <input
                type="text"
                value={loginForm.username}
                onChange={e => setLoginForm(f => ({ ...f, username: e.target.value }))}
                className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoComplete="username"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t.password}</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
                className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoComplete="current-password"
                required
              />
            </div>
            {loginError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {loginError}
              </div>
            )}
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-blue-700 text-white rounded-lg py-2.5 font-semibold hover:bg-blue-800 disabled:opacity-50 transition-colors"
            >
              {loginLoading ? t.loading : t.login}
            </button>
          </form>

          {/* Language toggle */}
          <button
            onClick={() => setLang(l => l === 'en' ? 'zh' : 'en')}
            className="mt-6 w-full text-xs text-stone-400 hover:text-stone-600 text-center"
          >
            {t.lang}
          </button>
        </div>
      </div>
    )
  }

  // ─── Main Portal ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-stone-50">
      {/* Modals */}
      {shipTarget && (
        <ShipModal
          order={shipTarget}
          t={t}
          onConfirm={handleShipConfirm}
          onClose={() => setShipTarget(null)}
        />
      )}
      {slipTarget && (
        <PackingSlipModal
          order={slipTarget}
          t={t}
          onClose={() => setSlipTarget(null)}
        />
      )}

      {/* Header */}
      <header className="bg-white border-b border-stone-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-xl font-black text-blue-700">RS LLD</div>
          <div className="text-sm font-semibold text-stone-500 hidden sm:block">{t.subtitle}</div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-stone-600 hidden sm:block">{staff.full_name || staff.username}</span>
          <button
            onClick={() => setLang(l => l === 'en' ? 'zh' : 'en')}
            className="text-xs px-2 py-1 border border-stone-200 rounded text-stone-500 hover:bg-stone-50"
          >
            {t.lang}
          </button>
          <button
            onClick={handleLogout}
            className="text-sm px-3 py-1.5 border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50"
          >
            {t.logout}
          </button>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="bg-white border-b border-stone-100 px-4 py-3">
        <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: t.active, value: stats.active, color: 'text-blue-700' },
            { label: t.pending, value: stats.pending, color: 'text-amber-600' },
            { label: t.confirmed, value: stats.confirmed, color: 'text-blue-600' },
            { label: t.shippedToday, value: stats.shipped_today, color: 'text-green-600' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
              <div className="text-xs text-stone-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Status tabs */}
          <div className="flex rounded-lg border border-stone-200 overflow-hidden bg-white">
            {[
              { key: 'active', label: t.active },
              { key: 'pending', label: t.pendingOrders },
              { key: 'confirmed', label: t.confirmedOrders },
              { key: 'shipped', label: t.shippedOrders },
              { key: 'all', label: t.allOrders },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  statusFilter === tab.key
                    ? 'bg-blue-600 text-white'
                    : 'text-stone-600 hover:bg-stone-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <input
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            placeholder={t.search}
            className="flex-1 min-w-[200px] border border-stone-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />

          {/* Refresh */}
          <button
            onClick={loadOrders}
            disabled={loadingOrders}
            className="px-3 py-1.5 border border-stone-200 rounded-lg text-sm text-stone-600 hover:bg-stone-50 disabled:opacity-50"
          >
            {loadingOrders ? t.refreshing : `↻ ${t.refresh}`}
          </button>
        </div>
      </div>

      {/* Order Table */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">{t.orderNumber}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">{t.customer}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide hidden md:table-cell">{t.address}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">{t.items}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide hidden lg:table-cell">{t.requestedDate}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">{t.status}</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {loadingOrders ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-stone-400">{t.loading}</td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-stone-400">{t.noOrders}</td>
                  </tr>
                ) : (
                  orders.map(order => (
                    <OrderRow
                      key={order.id}
                      order={order}
                      t={t}
                      onConfirm={handleConfirm}
                      onShip={setShipTarget}
                      onDeliver={handleDeliver}
                      onPrint={setSlipTarget}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
          {orders.length > 0 && (
            <div className="px-4 py-2 bg-stone-50 border-t border-stone-100 text-xs text-stone-400">
              {orders.length} order{orders.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
