import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { staffFetch } from '@/lib/staffApi'
import { X, Plus, Trash2, Search, Package, User } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || ''

const US_STATES = [
  ['AL','Alabama'],['AK','Alaska'],['AZ','Arizona'],['AR','Arkansas'],['CA','California'],
  ['CO','Colorado'],['CT','Connecticut'],['DE','Delaware'],['FL','Florida'],['GA','Georgia'],
  ['HI','Hawaii'],['ID','Idaho'],['IL','Illinois'],['IN','Indiana'],['IA','Iowa'],
  ['KS','Kansas'],['KY','Kentucky'],['LA','Louisiana'],['ME','Maine'],['MD','Maryland'],
  ['MA','Massachusetts'],['MI','Michigan'],['MN','Minnesota'],['MS','Mississippi'],['MO','Missouri'],
  ['MT','Montana'],['NE','Nebraska'],['NV','Nevada'],['NH','New Hampshire'],['NJ','New Jersey'],
  ['NM','New Mexico'],['NY','New York'],['NC','North Carolina'],['ND','North Dakota'],['OH','Ohio'],
  ['OK','Oklahoma'],['OR','Oregon'],['PA','Pennsylvania'],['RI','Rhode Island'],['SC','South Carolina'],
  ['SD','South Dakota'],['TN','Tennessee'],['TX','Texas'],['UT','Utah'],['VT','Vermont'],
  ['VA','Virginia'],['WA','Washington'],['WV','West Virginia'],['WI','Wisconsin'],['WY','Wyoming'],
]

const EMPTY_ITEM = {
  product_id: null,
  product_name: '',
  product_sku: '',
  product_brand: '',
  product_unit_size: '',
  quantity: 1,
  unit_price: 0,
  bulk_price: null,
  bulk_quantity: null,
  is_bulk_price: false,
}

export default function CreateOrderModal({ t, lang, onClose, onCreated }) {
  const tO = t?.createOrder || {}

  const [form, setForm] = useState({
    delivery_name: '',
    delivery_company: '',
    delivery_address: '',
    delivery_city: '',
    delivery_state: 'IL',
    delivery_zip: '',
    delivery_phone: '',
    special_notes: '',
    payment_method: 'net30',
    payment_status: 'pending',
    status: 'pending',
    discount_amount: '',
    delivery_fee: '',
    staff_notes: '',
    order_number: '',
    created_at: new Date().toISOString().slice(0, 10),
  })

  const [items, setItems] = useState([{ ...EMPTY_ITEM }])
  const [productSearch, setProductSearch] = useState({})
  const [searchResults, setSearchResults] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Customer autofill
  const [customerQuery, setCustomerQuery] = useState('')
  const [customerResults, setCustomerResults] = useState([])
  const [customerSearching, setCustomerSearching] = useState(false)
  const customerSearchTimer = useRef(null)

  // ── Totals ──────────────────────────────────────────────────────────────────
  const subtotal = items.reduce((s, it) => s + (parseFloat(it.unit_price) || 0) * (parseInt(it.quantity) || 0), 0)
  const discount = parseFloat(form.discount_amount) || 0
  const deliveryFee = form.delivery_fee !== '' ? parseFloat(form.delivery_fee) : (subtotal >= 100 ? 0 : 25)
  const total = subtotal - discount + deliveryFee

  // ── Customer search ──────────────────────────────────────────────────────────
  function handleCustomerQueryChange(q) {
    setCustomerQuery(q)
    clearTimeout(customerSearchTimer.current)
    if (!q || q.length < 2) { setCustomerResults([]); return }
    setCustomerSearching(true)
    customerSearchTimer.current = setTimeout(async () => {
      try {
        const res = await staffFetch(`/api/staff/customers/search?q=${encodeURIComponent(q)}`, {})
        const data = await res.json()
        setCustomerResults(Array.isArray(data) ? data : [])
      } catch { setCustomerResults([]) }
      setCustomerSearching(false)
    }, 300)
  }

  function pickCustomer(c) {
    setForm(f => ({
      ...f,
      delivery_name: c.name || f.delivery_name,
      delivery_company: c.company || f.delivery_company,
      delivery_phone: c.phone || f.delivery_phone,
      delivery_address: c.address || f.delivery_address,
      delivery_city: c.city || f.delivery_city,
      delivery_state: c.state || f.delivery_state,
      delivery_zip: c.zip || f.delivery_zip,
    }))
    setCustomerQuery('')
    setCustomerResults([])
  }

  // ── Product search ───────────────────────────────────────────────────────────
  const productSearchTimers = useRef({})
  // Track the input element position for each row so we can portal the dropdown
  const searchInputRefs = useRef({})
  const [dropdownPos, setDropdownPos] = useState({})

  async function searchProducts(idx, query) {
    // Clear any pending timer for this row
    clearTimeout(productSearchTimers.current[idx])
    if (!query || query.length < 2) { setSearchResults(r => ({ ...r, [idx]: [] })); return }
    // Calculate dropdown position from the input element
    const el = searchInputRefs.current[idx]
    if (el) {
      const rect = el.getBoundingClientRect()
      setDropdownPos(p => ({
        ...p,
        [idx]: { top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX, width: rect.width }
      }))
    }
    productSearchTimers.current[idx] = setTimeout(async () => {
      try {
        // Try staff endpoint first (has ilike + SKU/brand search); fall back to public
        let res = await staffFetch(`/api/staff/products?search=${encodeURIComponent(query)}&per_page=20`, {})
        if (!res.ok) {
          // Fall back to public endpoint (now also uses ilike)
          res = await fetch(`${API}/api/products?search=${encodeURIComponent(query)}&per_page=20`)
        }
        const data = await res.json()
        setSearchResults(r => ({ ...r, [idx]: data.products || data || [] }))
      } catch { setSearchResults(r => ({ ...r, [idx]: [] })) }
    }, 250)
  }

  function pickProduct(idx, product) {
    setItems(prev => prev.map((it, i) => i !== idx ? it : {
      ...it,
      product_id: product.id,
      product_name: product.name,
      product_sku: product.sku || '',
      product_brand: product.brand || '',
      product_unit_size: product.unit_size || '',
      unit_price: product.unit_price || 0,
      bulk_price: product.bulk_price || null,
      bulk_quantity: product.bulk_quantity || null,
      is_bulk_price: false,
    }))
    setProductSearch(s => ({ ...s, [idx]: '' }))
    setSearchResults(r => ({ ...r, [idx]: [] }))
  }

  function updateItem(idx, field, value) {
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it
      const updated = { ...it, [field]: value }
      // Auto-apply bulk pricing when quantity changes
      if (field === 'quantity' && it.bulk_price && it.bulk_quantity) {
        const qty = parseInt(value) || 0
        const isBulk = qty >= parseInt(it.bulk_quantity)
        updated.unit_price = isBulk ? it.bulk_price : (it._base_price || it.unit_price)
        updated.is_bulk_price = isBulk
        if (!it._base_price) updated._base_price = it.unit_price
      }
      return updated
    }))
  }

  function addItem() { setItems(prev => [...prev, { ...EMPTY_ITEM }]) }
  function removeItem(idx) { setItems(prev => prev.filter((_, i) => i !== idx)) }

  // ── Submit ───────────────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (items.length === 0 || items.every(it => !it.product_name.trim())) {
      setError(tO.errorNoItems || 'Add at least one item.')
      return
    }

    const validItems = items.filter(it => it.product_name.trim())
    if (!form.delivery_name.trim() || !form.delivery_address.trim() || !form.delivery_city.trim()) {
      setError(tO.errorMissingFields || 'Customer name and address are required.')
      return
    }

    setSaving(true)
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 30000) // 30s timeout
    try {
      const payload = {
        ...form,
        discount_amount: discount,
        delivery_fee: deliveryFee,
        items: validItems.map(it => ({
          product_id: it.product_id,
          product_name: it.product_name,
          product_sku: it.product_sku,
          product_brand: it.product_brand,
          product_unit_size: it.product_unit_size,
          quantity: parseInt(it.quantity) || 1,
          unit_price: parseFloat(it.unit_price) || 0,
          is_bulk_price: it.is_bulk_price || false,
        })),
      }

      const res = await staffFetch(`/api/staff/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
      clearTimeout(timer)
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to create order'); setSaving(false); return }
      onCreated(data.order)
    } catch (err) {
      clearTimeout(timer)
      if (err.name === 'AbortError') {
        setError('Request timed out. The server may be waking up — please try again.')
      } else {
        setError(err.message)
      }
      setSaving(false)
    }
  }

  const inp = 'w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-stone-400 focus:border-transparent'

  return (
    <div className="fixed inset-0 bg-stone-900/40 z-50 flex items-start justify-center overflow-y-auto py-8 px-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
          <h2 className="text-lg font-bold text-stone-900">{tO.title || 'Create Order'}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-stone-100"><X className="w-5 h-5 text-stone-500" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* ── Row 1: Order meta ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">{tO.orderNumber || 'Order # (leave blank to auto-generate)'}</label>
              <input className={inp} placeholder="RS-2025-XXXX"
                value={form.order_number}
                onChange={e => setForm(f => ({ ...f, order_number: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">{tO.orderDate || 'Order Date'}</label>
              <input type="date" className={inp}
                value={form.created_at}
                onChange={e => setForm(f => ({ ...f, created_at: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">{tO.orderStatus || 'Order Status'}</label>
              <select className={inp} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="pending">{tO.statusPending || 'Pending'}</option>
                <option value="confirmed">{tO.statusConfirmed || 'Confirmed'}</option>
                <option value="packed">{tO.statusPacked || 'Packed'}</option>
                <option value="shipped">{tO.statusShipped || 'Shipped'}</option>
                <option value="delivered">{tO.statusDelivered || 'Delivered'}</option>
                <option value="cancelled">{tO.statusCancelled || 'Cancelled'}</option>
              </select>
            </div>
          </div>

          {/* ── Customer Autofill Search ── */}
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">
              <User className="w-3 h-3 inline mr-1" />
              {tO.searchCustomer || 'Search existing customers...'}
            </label>
            <div className="relative">
              <input
                className={inp}
                placeholder={tO.searchCustomerPlaceholder || 'Type name, company, or phone...'}
                value={customerQuery}
                onChange={e => handleCustomerQueryChange(e.target.value)}
              />
              {customerResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-20 bg-white border border-stone-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                  {customerResults.map((c, i) => (
                    <button key={i} type="button"
                      className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 flex items-start gap-2"
                      onClick={() => pickCustomer(c)}>
                      <User className="w-3 h-3 text-stone-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-medium text-stone-800">{c.name}</span>
                        {c.company && <span className="text-stone-500 ml-1">— {c.company}</span>}
                        {c.phone && <span className="text-stone-400 ml-1">· {c.phone}</span>}
                        {c.address && <div className="text-stone-400">{c.address}, {c.city}, {c.state}</div>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Customer Info ── */}
          <div>
            <h3 className="text-sm font-semibold text-stone-700 mb-3">{tO.customerInfo || 'Customer Information'}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">{tO.customerName || 'Contact Name'} *</label>
                <input required className={inp}
                  value={form.delivery_name}
                  onChange={e => setForm(f => ({ ...f, delivery_name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">{tO.company || 'Company / Restaurant'}</label>
                <input className={inp}
                  value={form.delivery_company}
                  onChange={e => setForm(f => ({ ...f, delivery_company: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">{tO.phone || 'Phone'}</label>
                <input className={inp}
                  value={form.delivery_phone}
                  onChange={e => setForm(f => ({ ...f, delivery_phone: e.target.value }))} />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-stone-600 mb-1">{tO.address || 'Street Address'} *</label>
                <input required className={inp}
                  value={form.delivery_address}
                  onChange={e => setForm(f => ({ ...f, delivery_address: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">{tO.city || 'City'} *</label>
                <input required className={inp}
                  value={form.delivery_city}
                  onChange={e => setForm(f => ({ ...f, delivery_city: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">{tO.state || 'State'}</label>
                  <select className={inp}
                    value={form.delivery_state}
                    onChange={e => setForm(f => ({ ...f, delivery_state: e.target.value }))}>
                    {US_STATES.map(([code, name]) => (
                      <option key={code} value={code}>{code} — {name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">{tO.zip || 'ZIP'}</label>
                  <input className={inp}
                    value={form.delivery_zip}
                    onChange={e => setForm(f => ({ ...f, delivery_zip: e.target.value }))} />
                </div>
              </div>
            </div>
          </div>

          {/* ── Line Items ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-stone-700">{tO.items || 'Order Items'}</h3>
              <button type="button" onClick={addItem}
                className="flex items-center gap-1 text-xs bg-blue-50 text-stone-900 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-medium transition-colors">
                <Plus className="w-3.5 h-3.5" /> {tO.addItem || 'Add Item'}
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className={`border rounded-lg p-3 ${item.is_bulk_price ? 'border-green-300 bg-green-50' : 'border-stone-200 bg-stone-50'}`}>
                  {/* Product search row */}
                  <div className="flex gap-2 mb-2">
                    <div className="flex-1 relative">
                      <div
                        ref={el => { searchInputRefs.current[idx] = el }}
                        className="flex items-center gap-2 border border-stone-200 rounded-lg px-3 py-1.5 bg-white"
                      >
                        <Search className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />
                        <input
                          className="flex-1 py-0.5 text-xs focus:outline-none bg-transparent"
                          placeholder={tO.searchInventory || 'Search inventory to auto-fill...'}
                          value={productSearch[idx] || ''}
                          onChange={e => {
                            const q = e.target.value
                            setProductSearch(s => ({ ...s, [idx]: q }))
                            searchProducts(idx, q)
                          }}
                          onBlur={() => setTimeout(() => setSearchResults(r => ({ ...r, [idx]: [] })), 200)}
                        />
                        {productSearch[idx] && (
                          <button type="button" onClick={() => { setProductSearch(s => ({ ...s, [idx]: '' })); setSearchResults(r => ({ ...r, [idx]: [] })) }}
                            className="text-stone-300 hover:text-stone-500">
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      {/* Portal dropdown — renders outside overflow container to avoid clipping */}
                      {(searchResults[idx] || []).length > 0 && dropdownPos[idx] && createPortal(
                        <div
                          style={{
                            position: 'fixed',
                            top: dropdownPos[idx].top - window.scrollY,
                            left: dropdownPos[idx].left,
                            width: dropdownPos[idx].width,
                            zIndex: 9999,
                          }}
                          className="bg-white border border-stone-200 rounded-lg shadow-2xl max-h-52 overflow-y-auto"
                        >
                          {searchResults[idx].map(p => (
                            <button key={p.id} type="button"
                              className="w-full text-left px-3 py-2.5 text-xs hover:bg-blue-50 flex items-start gap-2 border-b border-stone-50 last:border-0"
                              onMouseDown={e => { e.preventDefault(); pickProduct(idx, p) }}>
                              <Package className="w-3 h-3 text-stone-400 flex-shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-stone-800 truncate">{p.name}</div>
                                <div className="text-stone-400 flex gap-2 mt-0.5">
                                  {p.sku && <span>SKU: {p.sku}</span>}
                                  {p.brand && <span>{p.brand}</span>}
                                  {p.bulk_price && p.bulk_quantity && (
                                    <span className="text-green-600">Bulk {p.bulk_quantity}+: ${p.bulk_price}</span>
                                  )}
                                </div>
                              </div>
                              <span className="text-stone-600 font-medium ml-auto flex-shrink-0">${p.unit_price}</span>
                            </button>
                          ))}
                        </div>,
                        document.body
                      )}
                    </div>
                    {items.length > 1 && (
                      <button type="button" onClick={() => removeItem(idx)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Bulk pricing badge */}
                  {item.is_bulk_price && (
                    <div className="mb-2 text-xs text-green-700 font-medium flex items-center gap-1">
                      ✓ {lang === 'zh' ? '批量价格已应用' : 'Bulk price applied'}
                    </div>
                  )}
                  {item.bulk_price && item.bulk_quantity && !item.is_bulk_price && (parseInt(item.quantity) || 0) > 0 && (
                    <div className="mb-2 text-xs text-stone-500">
                      {lang === 'zh' ? `订购 ${item.bulk_quantity}+ 件可享批量价 $${item.bulk_price}` : `Order ${item.bulk_quantity}+ for bulk price $${item.bulk_price}`}
                    </div>
                  )}

                  {/* Item detail fields */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="sm:col-span-2">
                      <label className="block text-xs text-stone-500 mb-0.5">{tO.itemName || 'Item Name'} *</label>
                      <input required className="w-full border border-stone-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-stone-400 bg-white"
                        value={item.product_name}
                        onChange={e => updateItem(idx, 'product_name', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs text-stone-500 mb-0.5">{tO.sku || 'SKU'}</label>
                      <input className="w-full border border-stone-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-stone-400 bg-white"
                        value={item.product_sku}
                        onChange={e => updateItem(idx, 'product_sku', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs text-stone-500 mb-0.5">{tO.brand || 'Brand'}</label>
                      <input className="w-full border border-stone-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-stone-400 bg-white"
                        value={item.product_brand}
                        onChange={e => updateItem(idx, 'product_brand', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs text-stone-500 mb-0.5">{tO.qty || 'Qty'}</label>
                      <input type="number" min="1" className="w-full border border-stone-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-stone-400 bg-white"
                        value={item.quantity}
                        onChange={e => updateItem(idx, 'quantity', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs text-stone-500 mb-0.5">{tO.unitPrice || 'Unit Price ($)'}</label>
                      <input type="number" min="0" step="0.01" className="w-full border border-stone-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-stone-400 bg-white"
                        value={item.unit_price}
                        onChange={e => updateItem(idx, 'unit_price', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs text-stone-500 mb-0.5">{tO.lineTotal || 'Line Total'}</label>
                      <div className="w-full border border-stone-200 rounded px-2 py-1 text-xs bg-stone-100 text-stone-600">
                        ${((parseFloat(item.unit_price) || 0) * (parseInt(item.quantity) || 0)).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Financials ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">{tO.discount || 'Discount ($)'}</label>
              <input type="number" min="0" step="0.01" className={inp}
                placeholder="0.00"
                value={form.discount_amount}
                onChange={e => setForm(f => ({ ...f, discount_amount: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">{tO.deliveryFee || 'Delivery Fee ($)'}</label>
              <input type="number" min="0" step="0.01" className={inp}
                placeholder={subtotal >= 100 ? '0.00 (free shipping)' : '25.00'}
                value={form.delivery_fee}
                onChange={e => setForm(f => ({ ...f, delivery_fee: e.target.value }))} />
            </div>
            <div className="flex flex-col justify-end">
              <div className="bg-blue-50 rounded-lg px-4 py-3 text-right">
                <div className="text-xs text-stone-500">{tO.subtotal || 'Subtotal'}: <span className="font-medium text-stone-700">${subtotal.toFixed(2)}</span></div>
                {discount > 0 && <div className="text-xs text-green-600">- ${discount.toFixed(2)} {tO.discount || 'discount'}</div>}
                <div className="text-xs text-stone-500">{tO.deliveryFee || 'Delivery'}: <span className="font-medium text-stone-700">${deliveryFee.toFixed(2)}</span></div>
                <div className="text-sm font-bold text-stone-900 mt-1">{tO.total || 'Total'}: ${total.toFixed(2)}</div>
              </div>
            </div>
          </div>

          {/* ── Payment ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">{tO.paymentMethod || 'Payment Method'}</label>
              <select className={inp} value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}>
                <option value="net30">Net 30</option>
                <option value="ach">ACH</option>
                <option value="credit_card">Credit Card</option>
                <option value="check">Check</option>
                <option value="cash">Cash</option>
                <option value="cod">COD</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">{tO.paymentStatus || 'Payment Status'}</label>
              <select className={inp} value={form.payment_status} onChange={e => setForm(f => ({ ...f, payment_status: e.target.value }))}>
                <option value="paid">{tO.paid || 'Paid'}</option>
                <option value="pending">{tO.paymentPending || 'Pending'}</option>
                <option value="overdue">{tO.overdue || 'Overdue'}</option>
              </select>
            </div>
          </div>

          {/* ── Notes ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">{tO.specialNotes || 'Customer Notes'}</label>
              <textarea rows={2} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-stone-400 focus:border-transparent resize-none"
                value={form.special_notes}
                onChange={e => setForm(f => ({ ...f, special_notes: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">{tO.staffNotes || 'Internal Staff Notes'}</label>
              <textarea rows={2} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-stone-400 focus:border-transparent resize-none"
                placeholder={tO.staffNotesPlaceholder || 'e.g. Manually entered from paper records'}
                value={form.staff_notes}
                onChange={e => setForm(f => ({ ...f, staff_notes: e.target.value }))} />
            </div>
          </div>

          {/* ── Error & Actions ── */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">{error}</div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-stone-100">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-stone-600 hover:text-stone-800 border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors">
              {tO.cancel || 'Cancel'}
            </button>
            <button type="submit" disabled={saving}
              className="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors">
              {saving ? (tO.saving || 'Saving...') : (tO.saveOrder || 'Save Order')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
