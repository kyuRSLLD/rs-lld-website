import { useState, useEffect } from 'react'
import { X, Plus, Trash2, Search, Package } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || ''

const EMPTY_ITEM = {
  product_id: null,
  product_name: '',
  product_sku: '',
  product_brand: '',
  product_unit_size: '',
  quantity: 1,
  unit_price: 0,
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
    preferred_delivery_date: '',
    special_notes: '',
    payment_method: 'net30',
    payment_status: 'paid',
    status: 'delivered',
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

  // ── Totals ──────────────────────────────────────────────────────────────────
  const subtotal = items.reduce((s, it) => s + (parseFloat(it.unit_price) || 0) * (parseInt(it.quantity) || 0), 0)
  const discount = parseFloat(form.discount_amount) || 0
  const deliveryFee = form.delivery_fee !== '' ? parseFloat(form.delivery_fee) : (subtotal >= 200 ? 0 : 25)
  const total = subtotal - discount + deliveryFee

  // ── Product search ───────────────────────────────────────────────────────────
  async function searchProducts(idx, query) {
    if (!query || query.length < 2) { setSearchResults(r => ({ ...r, [idx]: [] })); return }
    try {
      const res = await fetch(`${API}/api/products?search=${encodeURIComponent(query)}`, { credentials: 'include' })
      const data = await res.json()
      setSearchResults(r => ({ ...r, [idx]: data.products || data || [] }))
    } catch { setSearchResults(r => ({ ...r, [idx]: [] })) }
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
    }))
    setProductSearch(s => ({ ...s, [idx]: '' }))
    setSearchResults(r => ({ ...r, [idx]: [] }))
  }

  function updateItem(idx, field, value) {
    setItems(prev => prev.map((it, i) => i !== idx ? it : { ...it, [field]: value }))
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
    try {
      const payload = {
        ...form,
        discount_amount: discount,
        delivery_fee: deliveryFee,
        items: validItems.map(it => ({
          ...it,
          quantity: parseInt(it.quantity) || 1,
          unit_price: parseFloat(it.unit_price) || 0,
        })),
      }

      const res = await fetch(`${API}/api/staff/orders`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to create order'); setSaving(false); return }
      onCreated(data.order)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto py-8 px-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">{tO.title || 'Create Order'}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* ── Row 1: Order meta ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{tO.orderNumber || 'Order # (leave blank to auto-generate)'}</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="RS-2025-XXXX"
                value={form.order_number}
                onChange={e => setForm(f => ({ ...f, order_number: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{tO.orderDate || 'Order Date'}</label>
              <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={form.created_at}
                onChange={e => setForm(f => ({ ...f, created_at: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{tO.orderStatus || 'Order Status'}</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="pending">{tO.statusPending || 'Pending'}</option>
                <option value="confirmed">{tO.statusConfirmed || 'Confirmed'}</option>
                <option value="packed">{tO.statusPacked || 'Packed'}</option>
                <option value="shipped">{tO.statusShipped || 'Shipped'}</option>
                <option value="delivered">{tO.statusDelivered || 'Delivered'}</option>
                <option value="cancelled">{tO.statusCancelled || 'Cancelled'}</option>
              </select>
            </div>
          </div>

          {/* ── Customer Info ── */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">{tO.customerInfo || 'Customer Information'}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{tO.customerName || 'Contact Name'} *</label>
                <input required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={form.delivery_name}
                  onChange={e => setForm(f => ({ ...f, delivery_name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{tO.company || 'Company / Restaurant'}</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={form.delivery_company}
                  onChange={e => setForm(f => ({ ...f, delivery_company: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{tO.phone || 'Phone'}</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={form.delivery_phone}
                  onChange={e => setForm(f => ({ ...f, delivery_phone: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{tO.deliveryDate || 'Delivery Date'}</label>
                <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={form.preferred_delivery_date}
                  onChange={e => setForm(f => ({ ...f, preferred_delivery_date: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">{tO.address || 'Street Address'} *</label>
                <input required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={form.delivery_address}
                  onChange={e => setForm(f => ({ ...f, delivery_address: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{tO.city || 'City'} *</label>
                <input required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={form.delivery_city}
                  onChange={e => setForm(f => ({ ...f, delivery_city: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{tO.state || 'State'}</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={form.delivery_state}
                    onChange={e => setForm(f => ({ ...f, delivery_state: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{tO.zip || 'ZIP'}</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={form.delivery_zip}
                    onChange={e => setForm(f => ({ ...f, delivery_zip: e.target.value }))} />
                </div>
              </div>
            </div>
          </div>

          {/* ── Line Items ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">{tO.items || 'Order Items'}</h3>
              <button type="button" onClick={addItem}
                className="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-medium transition-colors">
                <Plus className="w-3.5 h-3.5" /> {tO.addItem || 'Add Item'}
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  {/* Product search row */}
                  <div className="flex gap-2 mb-2">
                    <div className="flex-1 relative">
                      <div className="flex items-center gap-1 border border-gray-300 rounded-lg px-2 bg-white">
                        <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <input
                          className="flex-1 py-1.5 text-xs focus:outline-none bg-transparent"
                          placeholder={tO.searchInventory || 'Search inventory to auto-fill...'}
                          value={productSearch[idx] || ''}
                          onChange={e => {
                            const q = e.target.value
                            setProductSearch(s => ({ ...s, [idx]: q }))
                            searchProducts(idx, q)
                          }}
                        />
                      </div>
                      {(searchResults[idx] || []).length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-20 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
                          {searchResults[idx].map(p => (
                            <button key={p.id} type="button"
                              className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 flex items-center gap-2"
                              onClick={() => pickProduct(idx, p)}>
                              <Package className="w-3 h-3 text-gray-400 flex-shrink-0" />
                              <span className="font-medium">{p.name}</span>
                              <span className="text-gray-400 ml-auto">${p.unit_price}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {items.length > 1 && (
                      <button type="button" onClick={() => removeItem(idx)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Item detail fields */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="sm:col-span-2">
                      <label className="block text-xs text-gray-500 mb-0.5">{tO.itemName || 'Item Name'} *</label>
                      <input required className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 bg-white"
                        value={item.product_name}
                        onChange={e => updateItem(idx, 'product_name', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-0.5">{tO.sku || 'SKU'}</label>
                      <input className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 bg-white"
                        value={item.product_sku}
                        onChange={e => updateItem(idx, 'product_sku', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-0.5">{tO.brand || 'Brand'}</label>
                      <input className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 bg-white"
                        value={item.product_brand}
                        onChange={e => updateItem(idx, 'product_brand', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-0.5">{tO.qty || 'Qty'}</label>
                      <input type="number" min="1" className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 bg-white"
                        value={item.quantity}
                        onChange={e => updateItem(idx, 'quantity', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-0.5">{tO.unitPrice || 'Unit Price ($)'}</label>
                      <input type="number" min="0" step="0.01" className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 bg-white"
                        value={item.unit_price}
                        onChange={e => updateItem(idx, 'unit_price', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-0.5">{tO.lineTotal || 'Line Total'}</label>
                      <div className="w-full border border-gray-200 rounded px-2 py-1 text-xs bg-gray-100 text-gray-600">
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
              <label className="block text-xs font-medium text-gray-600 mb-1">{tO.discount || 'Discount ($)'}</label>
              <input type="number" min="0" step="0.01" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
                value={form.discount_amount}
                onChange={e => setForm(f => ({ ...f, discount_amount: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{tO.deliveryFee || 'Delivery Fee ($)'}</label>
              <input type="number" min="0" step="0.01" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={subtotal >= 200 ? '0.00 (free)' : '25.00'}
                value={form.delivery_fee}
                onChange={e => setForm(f => ({ ...f, delivery_fee: e.target.value }))} />
            </div>
            <div className="flex flex-col justify-end">
              <div className="bg-blue-50 rounded-lg px-4 py-3 text-right">
                <div className="text-xs text-gray-500">{tO.subtotal || 'Subtotal'}: <span className="font-medium text-gray-700">${subtotal.toFixed(2)}</span></div>
                {discount > 0 && <div className="text-xs text-green-600">- ${discount.toFixed(2)} {tO.discount || 'discount'}</div>}
                <div className="text-xs text-gray-500">{tO.deliveryFee || 'Delivery'}: <span className="font-medium text-gray-700">${deliveryFee.toFixed(2)}</span></div>
                <div className="text-sm font-bold text-blue-700 mt-1">{tO.total || 'Total'}: ${total.toFixed(2)}</div>
              </div>
            </div>
          </div>

          {/* ── Payment ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{tO.paymentMethod || 'Payment Method'}</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={form.payment_method}
                onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}>
                <option value="net30">Net 30</option>
                <option value="net15">Net 15</option>
                <option value="credit_card">Credit Card</option>
                <option value="check">Check</option>
                <option value="cash">Cash</option>
                <option value="cod">COD</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{tO.paymentStatus || 'Payment Status'}</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={form.payment_status}
                onChange={e => setForm(f => ({ ...f, payment_status: e.target.value }))}>
                <option value="paid">{tO.paid || 'Paid'}</option>
                <option value="pending">{tO.paymentPending || 'Pending'}</option>
                <option value="overdue">{tO.overdue || 'Overdue'}</option>
              </select>
            </div>
          </div>

          {/* ── Notes ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{tO.specialNotes || 'Customer Notes'}</label>
              <textarea rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                value={form.special_notes}
                onChange={e => setForm(f => ({ ...f, special_notes: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{tO.staffNotes || 'Internal Staff Notes'}</label>
              <textarea rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder={tO.staffNotesPlaceholder || 'e.g. Manually entered from paper records'}
                value={form.staff_notes}
                onChange={e => setForm(f => ({ ...f, staff_notes: e.target.value }))} />
            </div>
          </div>

          {/* ── Error & Actions ── */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">{error}</div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
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
