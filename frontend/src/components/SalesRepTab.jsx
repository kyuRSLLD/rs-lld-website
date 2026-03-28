import React, { useState, useEffect, useCallback } from 'react'
import { Phone, ShoppingCart, FileText, BarChart2, ChevronDown, ChevronUp, Plus, Trash2, Search, X, Edit3, Save, Trophy } from 'lucide-react'
import { staffFetch } from '@/lib/staffApi'

const formatPrice = (v) => `$${(parseFloat(v) || 0).toFixed(2)}`
const formatDate = (d) => d ? new Date(d).toLocaleDateString() : '—'

// ─────────────────────────────────────────────────────────────────────────────
// Call List Sub-tab
// ─────────────────────────────────────────────────────────────────────────────
function CallListPanel({ t, onSelectCustomer, selectedCustomer }) {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [viewInvoicesFor, setViewInvoicesFor] = useState(null)
  const [invoices, setInvoices] = useState([])
  const [invoicesLoading, setInvoicesLoading] = useState(false)

  useEffect(() => {
    staffFetch('/api/staff/customers')
      .then(r => r.json())
      .then(d => { setCustomers(d.customers || d || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = customers.filter(c => {
    const q = search.toLowerCase()
    return (
      (c.full_name || '').toLowerCase().includes(q) ||
      (c.company_name || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q) ||
      (c.email || '').toLowerCase().includes(q)
    )
  })

  const handleViewInvoices = async (customer) => {
    setViewInvoicesFor(customer)
    setInvoicesLoading(true)
    try {
      const r = await staffFetch(`/api/sales/customer/${customer.id}/invoices`)
      const d = await r.json()
      setInvoices(d.orders || [])
    } catch {
      setInvoices([])
    }
    setInvoicesLoading(false)
  }

  if (viewInvoicesFor) {
    return (
      <div>
        <button
          onClick={() => setViewInvoicesFor(null)}
          className="mb-4 text-sm text-stone-500 hover:text-stone-900 flex items-center gap-1"
        >
          ← {t.backToCallList}
        </button>
        <h3 className="text-lg font-semibold text-stone-900 mb-4">
          {t.invoicesFor} {viewInvoicesFor.full_name || viewInvoicesFor.company_name}
        </h3>
        {invoicesLoading ? (
          <p className="text-stone-400 text-sm">Loading...</p>
        ) : invoices.length === 0 ? (
          <p className="text-stone-400 text-sm">{t.noInvoices}</p>
        ) : (
          <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 border-b border-stone-100">
                <tr>
                  <th className="text-left px-4 py-3 text-stone-500 font-medium">{t.orderNumber}</th>
                  <th className="text-left px-4 py-3 text-stone-500 font-medium">{t.orderDate}</th>
                  <th className="text-left px-4 py-3 text-stone-500 font-medium">{t.orderTotal}</th>
                  <th className="text-left px-4 py-3 text-stone-500 font-medium">{t.orderStatus}</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(o => (
                  <tr key={o.id} className="border-b border-stone-50 hover:bg-stone-50">
                    <td className="px-4 py-3 font-mono text-xs text-stone-600">{o.order_number}</td>
                    <td className="px-4 py-3 text-stone-600">{formatDate(o.created_at)}</td>
                    <td className="px-4 py-3 font-semibold text-stone-900">{formatPrice(o.total_amount)}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-600 capitalize">
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t.searchProducts}
            className="w-full pl-9 pr-4 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
          />
        </div>
      </div>
      {loading ? (
        <p className="text-stone-400 text-sm">Loading...</p>
      ) : (
        <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-100">
              <tr>
                <th className="text-left px-4 py-3 text-stone-500 font-medium">{t.customerName}</th>
                <th className="text-left px-4 py-3 text-stone-500 font-medium hidden sm:table-cell">{t.company}</th>
                <th className="text-left px-4 py-3 text-stone-500 font-medium">{t.phone}</th>
                <th className="text-left px-4 py-3 text-stone-500 font-medium hidden md:table-cell">{t.lastOrder}</th>
                <th className="text-left px-4 py-3 text-stone-500 font-medium hidden md:table-cell">{t.totalSpend}</th>
                <th className="text-right px-4 py-3 text-stone-500 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr
                  key={c.id}
                  className={`border-b border-stone-50 hover:bg-stone-50 ${selectedCustomer?.id === c.id ? 'bg-blue-50' : ''}`}
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-stone-900">{c.full_name || '—'}</span>
                    {c.email && <div className="text-xs text-stone-400">{c.email}</div>}
                  </td>
                  <td className="px-4 py-3 text-stone-600 hidden sm:table-cell">{c.company_name || '—'}</td>
                  <td className="px-4 py-3">
                    {c.phone ? (
                      <a href={`tel:${c.phone}`} className="text-blue-600 hover:underline font-mono text-xs">
                        {c.phone}
                      </a>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-stone-500 text-xs hidden md:table-cell">
                    {c.last_order_date ? formatDate(c.last_order_date) : t.neverOrdered}
                  </td>
                  <td className="px-4 py-3 text-stone-600 hidden md:table-cell">{formatPrice(c.total_spent || 0)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleViewInvoices(c)}
                        className="text-xs px-2 py-1 rounded border border-stone-200 text-stone-600 hover:bg-stone-50"
                      >
                        {t.viewInvoices}
                      </button>
                      <button
                        onClick={() => onSelectCustomer(c)}
                        className="text-xs px-2 py-1 rounded bg-stone-900 text-white hover:bg-stone-700"
                      >
                        {t.placeOrder}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Place Order Sub-tab
// ─────────────────────────────────────────────────────────────────────────────
function PlaceOrderPanel({ t, selectedCustomer, onOrderPlaced }) {
  const [productSearch, setProductSearch] = useState('')
  const [productResults, setProductResults] = useState([])
  const [items, setItems] = useState([])
  const [notes, setNotes] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('net30')
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const searchProducts = useCallback(async (q) => {
    if (!q.trim()) { setProductResults([]); return }
    try {
      const r = await staffFetch(`/api/staff/products?search=${encodeURIComponent(q)}&limit=10`)
      const d = await r.json()
      setProductResults(d.products || [])
    } catch { setProductResults([]) }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => searchProducts(productSearch), 300)
    return () => clearTimeout(timer)
  }, [productSearch, searchProducts])

  const addItem = (product) => {
    setItems(prev => {
      const existing = prev.find(i => i.product_id === product.id)
      if (existing) {
        return prev.map(i => i.product_id === product.id ? { ...i, qty: i.qty + 1 } : i)
      }
      return [...prev, {
        product_id: product.id,
        name: product.name,
        sku: product.sku,
        qty: 1,
        unit_price: parseFloat(product.unit_price) || 0,
      }]
    })
    setProductSearch('')
    setProductResults([])
  }

  const updateQty = (idx, val) => {
    const q = parseInt(val)
    if (q < 1) return
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, qty: q } : it))
  }

  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx))

  const subtotal = items.reduce((s, i) => s + i.qty * i.unit_price, 0)

  const handleSubmit = async () => {
    if (!selectedCustomer) return
    if (items.length === 0) { setErrorMsg(t.noItems); return }
    setSubmitting(true)
    setErrorMsg('')
    try {
      const r = await staffFetch('/api/sales/place-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: selectedCustomer.id,
          items: items.map(i => ({ product_id: i.product_id, quantity: i.qty, unit_price: i.unit_price })),
          notes,
          payment_method: paymentMethod,
          delivery_address: selectedCustomer.shipping_address || '',
          customer_name: selectedCustomer.full_name || selectedCustomer.company_name || '',
          customer_phone: selectedCustomer.phone || '',
          customer_company: selectedCustomer.company_name || '',
        }),
      })
      const d = await r.json()
      if (r.ok) {
        setSuccessMsg(t.orderSuccess + ' ' + (d.order_number || ''))
        setItems([])
        setNotes('')
        if (onOrderPlaced) onOrderPlaced()
      } else {
        setErrorMsg(d.error || t.orderError)
      }
    } catch {
      setErrorMsg(t.orderError)
    }
    setSubmitting(false)
  }

  if (!selectedCustomer) {
    return (
      <div className="text-center py-20">
        <Phone className="w-12 h-12 text-stone-200 mx-auto mb-3" />
        <p className="text-stone-400">{t.selectCustomer}</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      {/* Customer header */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-5">
        <p className="text-sm font-semibold text-blue-900">{t.placeOrderFor}: {selectedCustomer.full_name || selectedCustomer.company_name}</p>
        {selectedCustomer.phone && <p className="text-xs text-blue-600 mt-0.5">{selectedCustomer.phone}</p>}
      </div>

      {/* Product search */}
      <div className="mb-4 relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            value={productSearch}
            onChange={e => setProductSearch(e.target.value)}
            placeholder={t.searchProducts}
            className="w-full pl-9 pr-4 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
          />
        </div>
        {productResults.length > 0 && (
          <div className="absolute z-10 w-full bg-white border border-stone-200 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
            {productResults.map(p => (
              <button
                key={p.id}
                onClick={() => addItem(p)}
                className="w-full text-left px-4 py-2.5 hover:bg-stone-50 border-b border-stone-50 last:border-0"
              >
                <span className="font-medium text-stone-900 text-sm">{p.name}</span>
                <span className="text-stone-400 text-xs ml-2">{p.sku}</span>
                <span className="float-right text-stone-700 text-sm font-semibold">{formatPrice(p.unit_price)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Items table */}
      {items.length > 0 && (
        <div className="bg-white rounded-xl border border-stone-100 mb-4 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-100">
              <tr>
                <th className="text-left px-4 py-2.5 text-stone-500 font-medium">Item</th>
                <th className="text-center px-3 py-2.5 text-stone-500 font-medium w-20">{t.qty}</th>
                <th className="text-right px-4 py-2.5 text-stone-500 font-medium">{t.unitPrice}</th>
                <th className="text-right px-4 py-2.5 text-stone-500 font-medium">{t.lineTotal}</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} className="border-b border-stone-50">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-stone-900">{item.name}</p>
                    {item.sku && <p className="text-xs text-stone-400">{item.sku}</p>}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <input
                      type="number"
                      min="1"
                      value={item.qty}
                      onChange={e => updateQty(idx, e.target.value)}
                      className="w-16 text-center border border-stone-200 rounded px-1 py-0.5 text-sm"
                    />
                  </td>
                  <td className="px-4 py-2.5 text-right text-stone-600">{formatPrice(item.unit_price)}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-stone-900">{formatPrice(item.qty * item.unit_price)}</td>
                  <td className="pr-3">
                    <button onClick={() => removeItem(idx)} className="text-stone-300 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-stone-50 border-t border-stone-100">
              <tr>
                <td colSpan={3} className="px-4 py-2.5 text-right font-semibold text-stone-700">Subtotal</td>
                <td className="px-4 py-2.5 text-right font-bold text-stone-900">{formatPrice(subtotal)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Notes + payment */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">{t.notes}</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 resize-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">{t.paymentMethod}</label>
          <select
            value={paymentMethod}
            onChange={e => setPaymentMethod(e.target.value)}
            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
          >
            <option value="net30">Net 30</option>
            <option value="check">Check</option>
            <option value="credit_card">Credit Card</option>
            <option value="cash">Cash</option>
          </select>
        </div>
      </div>

      {successMsg && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">{successMsg}</div>
      )}
      {errorMsg && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">{errorMsg}</div>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting || items.length === 0}
        className="px-6 py-2.5 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? t.submitting : t.submitOrder}
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Script Sub-tab
// ─────────────────────────────────────────────────────────────────────────────
function ScriptPanel({ t, canEdit }) {
  const [script, setScript] = useState('')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    staffFetch('/api/sales/script')
      .then(r => r.json())
      .then(d => setScript(d.content || ''))
      .catch(() => {})
  }, [])

  const handleEdit = () => { setDraft(script); setEditing(true) }
  const handleCancel = () => setEditing(false)
  const handleSave = async () => {
    setSaving(true)
    try {
      const r = await staffFetch('/api/sales/script', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: draft }),
      })
      if (r.ok) { setScript(draft); setEditing(false); setMsg(t.scriptUpdated) }
    } catch {}
    setSaving(false)
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-stone-900">{t.scriptTitle}</h3>
        {canEdit && !editing && (
          <button
            onClick={handleEdit}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50"
          >
            <Edit3 className="w-3.5 h-3.5" /> {t.scriptEditBtn} <span className="text-stone-400">{t.scriptEditNote}</span>
          </button>
        )}
      </div>
      {msg && <p className="text-green-600 text-sm mb-3">{msg}</p>}
      {editing ? (
        <div>
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            rows={20}
            className="w-full border border-stone-200 rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-stone-900 resize-y"
          />
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-700 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : t.scriptSaveBtn}
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 border border-stone-200 rounded-lg text-sm text-stone-600 hover:bg-stone-50"
            >
              {t.scriptCancelBtn}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-100 p-5">
          {script ? (
            <pre className="text-sm text-stone-700 whitespace-pre-wrap font-sans leading-relaxed">{script}</pre>
          ) : (
            <p className="text-stone-400 text-sm italic">No script set yet. {canEdit ? 'Click "Edit Script" to add one.' : 'Ask your manager to set up the call script.'}</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// My Sales Sub-tab
// ─────────────────────────────────────────────────────────────────────────────
function MySalesPanel({ t, showLeaderboard }) {
  const [period, setPeriod] = useState('30')
  const [stats, setStats] = useState(null)
  const [orders, setOrders] = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchSales = useCallback(async (p) => {
    setLoading(true)
    try {
      const [statsRes, ordersRes] = await Promise.all([
        staffFetch(`/api/sales/my-sales?days=${p}`),
        staffFetch(`/api/sales/my-sales?days=${p}`),
      ])
      const [statsData, ordersData] = await Promise.all([statsRes.json(), ordersRes.json()])
      setStats(statsData)
      setOrders(ordersData.orders || [])
    } catch {}
    setLoading(false)
  }, [])

  const fetchLeaderboard = useCallback(async () => {
    try {
      const r = await staffFetch('/api/sales/leaderboard')
      const d = await r.json()
      setLeaderboard(d.leaderboard || [])
    } catch {}
  }, [])

  useEffect(() => { fetchSales(period) }, [period, fetchSales])
  useEffect(() => { if (showLeaderboard) fetchLeaderboard() }, [showLeaderboard, fetchLeaderboard])

  return (
    <div>
      {/* Period selector */}
      <div className="flex items-center gap-2 mb-5">
        <span className="text-sm text-stone-500">{t.periodLabel}:</span>
        {[['7', t.last7], ['30', t.last30], ['90', t.last90]].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setPeriod(val)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              period === val
                ? 'bg-stone-900 text-white border-stone-900'
                : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* KPI cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: t.periodOrders, value: stats.period_orders ?? 0 },
            { label: t.periodRevenue, value: formatPrice(stats.period_revenue ?? 0) },
            { label: t.allTimeOrders, value: stats.all_time_orders ?? 0 },
            { label: t.allTimeRevenue, value: formatPrice(stats.all_time_revenue ?? 0) },
          ].map(kpi => (
            <div key={kpi.label} className="bg-white rounded-xl border border-stone-100 p-4">
              <p className="text-2xl font-bold text-stone-900">{kpi.value}</p>
              <p className="text-xs text-stone-500 mt-0.5">{kpi.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Orders table */}
      <div className="bg-white rounded-xl border border-stone-100 overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-stone-100">
          <h3 className="font-semibold text-stone-900 text-sm">{t.salesTitle}</h3>
        </div>
        {loading ? (
          <p className="text-stone-400 text-sm p-4">Loading...</p>
        ) : orders.length === 0 ? (
          <p className="text-stone-400 text-sm p-4">{t.noSales}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-100">
              <tr>
                <th className="text-left px-4 py-2.5 text-stone-500 font-medium">{t.orderNumber}</th>
                <th className="text-left px-4 py-2.5 text-stone-500 font-medium hidden sm:table-cell">{t.customerName}</th>
                <th className="text-left px-4 py-2.5 text-stone-500 font-medium">{t.orderDate}</th>
                <th className="text-right px-4 py-2.5 text-stone-500 font-medium">{t.orderTotal}</th>
                <th className="text-left px-4 py-2.5 text-stone-500 font-medium">{t.orderStatus}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} className="border-b border-stone-50 hover:bg-stone-50">
                  <td className="px-4 py-2.5 font-mono text-xs text-stone-600">{o.order_number}</td>
                  <td className="px-4 py-2.5 text-stone-700 hidden sm:table-cell">{o.customer_name || '—'}</td>
                  <td className="px-4 py-2.5 text-stone-500 text-xs">{formatDate(o.created_at)}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-stone-900">{formatPrice(o.total_amount)}</td>
                  <td className="px-4 py-2.5">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-600 capitalize">{o.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Leaderboard (admin/manager only) */}
      {showLeaderboard && leaderboard.length > 0 && (
        <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-100 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <h3 className="font-semibold text-stone-900 text-sm">{t.leaderboard}</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-100">
              <tr>
                <th className="text-left px-4 py-2.5 text-stone-500 font-medium w-12">{t.rank}</th>
                <th className="text-left px-4 py-2.5 text-stone-500 font-medium">{t.repName}</th>
                <th className="text-right px-4 py-2.5 text-stone-500 font-medium">{t.orders}</th>
                <th className="text-right px-4 py-2.5 text-stone-500 font-medium">{t.revenue}</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((rep, idx) => (
                <tr key={rep.id} className="border-b border-stone-50">
                  <td className="px-4 py-2.5 font-bold text-stone-400">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-stone-900">{rep.full_name || rep.username}</td>
                  <td className="px-4 py-2.5 text-right text-stone-600">{rep.order_count}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-stone-900">{formatPrice(rep.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main SalesRepTab export
// ─────────────────────────────────────────────────────────────────────────────
export function SalesRepTab({ t, staff }) {
  const [subTab, setSubTab] = useState('callList')
  const [selectedCustomer, setSelectedCustomer] = useState(null)

  const isAdmin = staff?.role === 'admin'
  const isManager = staff?.role === 'manager'
  const canEditScript = isAdmin || isManager
  const showLeaderboard = isAdmin || isManager

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer)
    setSubTab('placeOrder')
  }

  const subTabs = [
    { id: 'callList', label: t.callList, icon: Phone },
    { id: 'placeOrder', label: t.placeOrder, icon: ShoppingCart },
    { id: 'script', label: t.myScript, icon: FileText },
    { id: 'mySales', label: t.mySales, icon: BarChart2 },
  ]

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-stone-900">{t.title}</h2>
        <p className="text-sm text-stone-500 mt-0.5">{t.subtitle}</p>
      </div>

      {/* Sub-tab bar */}
      <div className="flex gap-1 mb-6 bg-stone-100 p-1 rounded-xl w-fit">
        {subTabs.map(st => (
          <button
            key={st.id}
            onClick={() => setSubTab(st.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              subTab === st.id
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            <st.icon className="w-3.5 h-3.5" />
            {st.label}
          </button>
        ))}
      </div>

      {subTab === 'callList' && (
        <CallListPanel t={t} onSelectCustomer={handleSelectCustomer} selectedCustomer={selectedCustomer} />
      )}
      {subTab === 'placeOrder' && (
        <PlaceOrderPanel t={t} selectedCustomer={selectedCustomer} onOrderPlaced={() => {}} />
      )}
      {subTab === 'script' && (
        <ScriptPanel t={t} canEdit={canEditScript} />
      )}
      {subTab === 'mySales' && (
        <MySalesPanel t={t} showLeaderboard={showLeaderboard} />
      )}
    </div>
  )
}

export default SalesRepTab
