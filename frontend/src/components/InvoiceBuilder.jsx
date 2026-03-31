import { useState, useEffect, useRef, useCallback } from 'react'
import { staffFetch } from '@/lib/staffApi'
import {
  Plus, Trash2, X, Search, RefreshCw, Printer,
  FileText, ChevronDown, ChevronUp, Check, Save, Download
} from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const todayPlusDays = (days) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0] // YYYY-MM-DD
}

const API_BASE = import.meta.env.VITE_API_URL || ''
const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0)

const EMPTY_ITEM = { description: '', sku: '', quantity: 1, unit_price: 0, line_total: 0 }

const invoiceStatusConfig = {
  draft:     { color: 'text-stone-600',  bg: 'bg-stone-100',  border: 'border-stone-200' },
  sent:      { color: 'text-stone-900',  bg: 'bg-blue-50',   border: 'border-blue-200' },
  paid:      { color: 'text-green-700', bg: 'bg-green-50',  border: 'border-green-200' },
  cancelled: { color: 'text-red-700',   bg: 'bg-red-50',    border: 'border-red-200' },
}

// ─── Product Search Dropdown ──────────────────────────────────────────────────
const ProductSearchDropdown = ({ t, onSelect, onClose }) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const ref = useRef(null)

  const search = useCallback(async (q) => {
    setLoading(true)
    try {
      const url = q
        ? `${API_BASE}/api/invoices/products/search?q=${encodeURIComponent(q)}`
        : `${API_BASE}/api/invoices/products/search`
      const res = await staffFetch(url)
      const data = await res.json()
      setResults(Array.isArray(data) ? data : [])
    } catch { setResults([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { search('') }, [search])

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300)
    return () => clearTimeout(timer)
  }, [query, search])

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div ref={ref} className="absolute z-50 top-full left-0 w-80 bg-white rounded-xl shadow-2xl border border-stone-200 mt-1 overflow-hidden">
      <div className="p-3 border-b border-stone-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t.invoices.productSearch}
            className="w-full pl-8 pr-3 py-1.5 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-stone-400"
          />
        </div>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center"><RefreshCw className="w-4 h-4 animate-spin text-stone-400 mx-auto" /></div>
        ) : results.length === 0 ? (
          <p className="p-4 text-sm text-stone-400 text-center">{t.common.loading}</p>
        ) : results.map(p => (
          <button
            key={p.id}
            onClick={() => onSelect(p)}
            className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-stone-900">{p.name}</p>
                <p className="text-xs text-stone-400 font-mono">{p.sku}</p>
              </div>
              <div className="text-right ml-3 flex-shrink-0">
                <p className="text-sm font-semibold text-stone-900">{fmt(p.unit_price)}</p>
                {p.bulk_price && <p className="text-xs text-green-600">{fmt(p.bulk_price)} bulk</p>}
              </div>
            </div>
          </button>
        ))}
      </div>
      <div className="p-2 border-t border-stone-100">
        <button
          onClick={() => onSelect(null)}
          className="w-full text-left px-3 py-2 text-sm text-stone-900 hover:bg-blue-50 rounded-lg transition-colors font-medium"
        >
          + {t.invoices.customItem}
        </button>
      </div>
    </div>
  )
}

// ─── Invoice Print View ───────────────────────────────────────────────────────
const InvoicePrintView = ({ invoice, t, lang, onClose }) => {
  const handlePrint = () => window.print()

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 print:p-0 print:bg-white print:fixed print:inset-0">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm w-full max-w-3xl max-h-[90vh] overflow-y-auto print:shadow-none print:rounded-none print:max-h-none print:overflow-visible">
        {/* Print controls — hidden when printing */}
        <div className="flex items-center justify-between p-4 border-b border-stone-200 print:hidden">
          <h2 className="font-bold text-stone-900">{t.invoices.printInvoice}</h2>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-stone-900 hover:bg-stone-700 text-white rounded-lg text-sm font-medium"
            >
              <Printer className="w-4 h-4" /> {t.invoices.printInvoice}
            </button>
            <button onClick={onClose} className="p-2 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Invoice Document */}
        <div className="p-8 print:p-6" id="invoice-print-area">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-2">
                <span className="text-white font-bold text-lg">RS</span>
              </div>
              <h1 className="text-2xl font-bold text-stone-900">RS LLD</h1>
              <p className="text-stone-500 text-xs font-medium">Restaurant Supply Leading Logistics &amp; Distribution</p>
              <p className="text-stone-500 text-sm">info@lldrestaurantsupply.com</p>
              <p className="text-stone-500 text-sm">lldrestaurantsupply.com</p>
            </div>
            <div className="text-right">
              <h2 className="text-3xl font-bold text-stone-900 uppercase tracking-wide">
                {lang === 'zh' ? '发票' : 'INVOICE'}
              </h2>
              <p className="text-stone-700 font-semibold mt-1">{invoice.invoice_number}</p>
              <div className="mt-2 text-sm text-stone-500">
                <p>{lang === 'zh' ? '创建日期' : 'Date'}: {new Date(invoice.created_at).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US')}</p>
                {invoice.due_date && <p>{lang === 'zh' ? '到期日' : 'Due'}: {invoice.due_date}</p>}
              </div>
              <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold uppercase ${invoiceStatusConfig[invoice.status]?.bg} ${invoiceStatusConfig[invoice.status]?.color}`}>
                {t.invoices[`status${invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}`] || invoice.status}
              </span>
            </div>
          </div>

          {/* Bill To */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">
                {lang === 'zh' ? '账单寄送至' : 'Bill To'}
              </h3>
              <p className="font-semibold text-stone-900">{invoice.customer_name}</p>
              {invoice.customer_company && <p className="text-stone-700">{invoice.customer_company}</p>}
              {invoice.customer_email && <p className="text-stone-500 text-sm">{invoice.customer_email}</p>}
              {invoice.customer_phone && <p className="text-stone-500 text-sm">{invoice.customer_phone}</p>}
              {invoice.customer_address && (
                <div className="text-stone-500 text-sm mt-1">
                  <p>{invoice.customer_address}</p>
                  {(invoice.customer_city || invoice.customer_state) && (
                    <p>{[invoice.customer_city, invoice.customer_state, invoice.customer_zip].filter(Boolean).join(', ')}</p>
                  )}
                </div>
              )}
            </div>
            <div>
              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">
                {lang === 'zh' ? '付款信息' : 'Payment Info'}
              </h3>
              {invoice.payment_terms && <p className="text-stone-700">{invoice.payment_terms}</p>}
              {invoice.payment_method && <p className="text-stone-500 text-sm capitalize">{invoice.payment_method.replace('_', ' ')}</p>}
            </div>
          </div>

          {/* Line Items Table */}
          <table className="w-full mb-6 text-sm">
            <thead>
              <tr className="bg-stone-950 text-white">
                <th className="text-left px-4 py-3 rounded-tl-lg font-medium">{t.invoices.itemDescription}</th>
                <th className="text-left px-4 py-3 font-medium w-24">{t.invoices.itemSku}</th>
                <th className="text-center px-4 py-3 font-medium w-16">{t.invoices.itemQty}</th>
                <th className="text-right px-4 py-3 font-medium w-28">{t.invoices.itemUnitPrice}</th>
                <th className="text-right px-4 py-3 rounded-tr-lg font-medium w-28">{t.invoices.itemTotal}</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items?.map((item, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-stone-50'}>
                  <td className="px-4 py-3 text-stone-900 font-medium">{item.description}</td>
                  <td className="px-4 py-3 text-stone-400 font-mono text-xs">{item.sku || '—'}</td>
                  <td className="px-4 py-3 text-center text-stone-700">{item.quantity}</td>
                  <td className="px-4 py-3 text-right text-stone-700">{fmt(item.unit_price)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-stone-900">{fmt(item.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-64 space-y-2 text-sm">
              <div className="flex justify-between text-stone-600">
                <span>{t.invoices.subtotal}</span>
                <span>{fmt(invoice.subtotal)}</span>
              </div>
              {invoice.discount_amount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>{t.invoices.discount}</span>
                  <span>-{fmt(invoice.discount_amount)}</span>
                </div>
              )}
              {invoice.tax_rate > 0 && (
                <div className="flex justify-between text-stone-600">
                  <span>{t.invoices.taxAmount} ({invoice.tax_rate}%)</span>
                  <span>{fmt(invoice.tax_amount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-stone-900 text-base border-t pt-2">
                <span>{t.invoices.total}</span>
                <span>{fmt(invoice.total_amount)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="border-t border-stone-200 pt-6">
              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">
                {t.invoices.notes}
              </h3>
              <p className="text-stone-600 text-sm whitespace-pre-line">{invoice.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-stone-100 text-center text-xs text-stone-400">
            <p>RS LLD — Restaurant Supply Leading Logistics &amp; Distribution · lldrestaurantsupply.com · info@lldrestaurantsupply.com</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Invoice Form (Create / Edit) ─────────────────────────────────────────────
const InvoiceForm = ({ invoice: existingInvoice, t, lang, onSave, onCancel }) => {
  const isEdit = !!existingInvoice
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showProductSearch, setShowProductSearch] = useState(false)
  const [showPrint, setShowPrint] = useState(false)
  const [savedInvoice, setSavedInvoice] = useState(existingInvoice || null)

  const [form, setForm] = useState({
    customer_name: existingInvoice?.customer_name || '',
    customer_company: existingInvoice?.customer_company || '',
    customer_email: existingInvoice?.customer_email || '',
    customer_phone: existingInvoice?.customer_phone || '',
    customer_address: existingInvoice?.customer_address || '',
    customer_city: existingInvoice?.customer_city || '',
    customer_state: existingInvoice?.customer_state || '',
    customer_zip: existingInvoice?.customer_zip || '',
    payment_method: existingInvoice?.payment_method || 'ach',
    payment_terms: existingInvoice?.payment_terms || 'Net 30',
    due_date: existingInvoice?.due_date || todayPlusDays(30),
    discount_amount: existingInvoice?.discount_amount || 0,
    tax_rate: existingInvoice?.tax_rate || 0,
    shipping_fee: existingInvoice?.shipping_fee || 0,
    notes: existingInvoice?.notes || '',
    internal_notes: existingInvoice?.internal_notes || '',
    status: existingInvoice?.status || 'draft',
  })

  const [items, setItems] = useState(
    existingInvoice?.items?.length > 0
      ? existingInvoice.items
      : [{ ...EMPTY_ITEM }]
  )

  const inp = 'border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-stone-400 w-full'

  const recalcItem = (item) => ({
    ...item,
    line_total: Math.round(parseFloat(item.quantity || 0) * parseFloat(item.unit_price || 0) * 100) / 100,
  })

  const updateItem = (idx, field, value) => {
    setItems(prev => {
      const next = [...prev]
      next[idx] = recalcItem({ ...next[idx], [field]: value })
      return next
    })
  }

  const addItem = () => setItems(prev => [...prev, { ...EMPTY_ITEM }])

  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx))

  const handleProductSelect = (product) => {
    setShowProductSearch(false)
    if (!product) {
      addItem()
      return
    }
    setItems(prev => [...prev, recalcItem({
      description: product.name,
      sku: product.sku,
      quantity: 1,
      unit_price: product.unit_price,
    })])
  }

  const subtotal = items.reduce((s, i) => s + (parseFloat(i.line_total) || 0), 0)
  const discount = parseFloat(form.discount_amount) || 0
  const shippingFee = parseFloat(form.shipping_fee) || 0
  const taxRate = parseFloat(form.tax_rate) || 0
  const taxAmount = Math.round((subtotal - discount + shippingFee) * taxRate / 100 * 100) / 100
  const total = Math.round((subtotal - discount + shippingFee + taxAmount) * 100) / 100

  const handleSave = async (statusOverride) => {
    setError('')
    if (!form.customer_name.trim()) { setError(t.invoices.requiredField); return }
    const validItems = items.filter(i => i.description.trim())
    if (validItems.length === 0) { setError(t.invoices.atLeastOneItem); return }

    setSaving(true)
    const payload = {
      ...form,
      status: statusOverride || form.status,
      items: validItems,
      discount_amount: discount,
      tax_rate: taxRate,
    }

    try {
      const url = isEdit
        ? `${API_BASE}/api/invoices/${existingInvoice.id}`
        : `${API_BASE}/api/invoices`
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (res.ok) {
        setSavedInvoice(data)
        onSave(data)
      } else {
        setError(data.error || t.common.error)
      }
    } catch { setError(t.common.error) }
    finally { setSaving(false) }
  }

  const handleDownloadPdf = async () => {
    if (!savedInvoice) return
    try {
      const res = await staffFetch(`${API_BASE}/api/invoices/${savedInvoice.id}/pdf`)
      if (!res.ok) throw new Error('PDF generation failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${savedInvoice.invoice_number}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('Could not download PDF. Please try again.')
    }
  }

  const paymentTermsOptions = [
    { value: 'Net 30', label: t.invoices.net30 },
    { value: 'Net 15', label: t.invoices.net15 },
    { value: 'Due on Receipt', label: t.invoices.dueOnReceipt },
  ]

  const paymentMethodOptions = [
    { value: 'ach', label: 'ACH' },
    { value: 'net30', label: t.invoices.net30 },
    { value: 'check', label: t.invoices.check },
    { value: 'credit_card', label: t.invoices.creditCard },
    { value: 'cash', label: t.invoices.cash },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button onClick={onCancel} className="text-sm text-stone-900 hover:underline mb-1 block">
            {t.invoices.backToList}
          </button>
          <h2 className="text-xl font-bold text-stone-900">
            {isEdit ? `${t.invoices.editInvoice} — ${existingInvoice.invoice_number}` : t.invoices.newInvoice}
          </h2>
        </div>
        <div className="flex gap-2 flex-wrap">
          {savedInvoice && (
            <>
              <button
                onClick={handleDownloadPdf}
                className="flex items-center gap-2 px-4 py-2 border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium"
              >
                <Download className="w-4 h-4" /> {t.invoices.downloadPdf || 'Download PDF'}
              </button>
              <button
                onClick={() => setShowPrint(true)}
                className="flex items-center gap-2 px-4 py-2 border border-stone-200 rounded-lg text-sm text-stone-700 hover:bg-stone-50"
              >
                <Printer className="w-4 h-4" /> {t.invoices.printInvoice}
              </button>
            </>
          )}
          <button
            onClick={() => handleSave('draft')}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 border border-stone-200 rounded-lg text-sm text-stone-700 hover:bg-stone-50"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {t.invoices.saveAsDraft}
          </button>
          <button
            onClick={() => handleSave('sent')}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-stone-900 hover:bg-stone-700 text-white rounded-lg text-sm font-medium"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {t.invoices.markAsSent}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Customer + Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Info */}
          <div className="bg-white rounded-xl border border-stone-100 p-5">
            <h3 className="font-semibold text-stone-800 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-stone-700" />
              {t.invoices.customerInfo}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-medium text-stone-600 mb-1">{t.invoices.customerName} *</label>
                <input className={inp} value={form.customer_name} onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))} />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-medium text-stone-600 mb-1">{t.invoices.customerCompany}</label>
                <input className={inp} value={form.customer_company} onChange={e => setForm(p => ({ ...p, customer_company: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">{t.invoices.customerEmail}</label>
                <input className={inp} type="email" value={form.customer_email} onChange={e => setForm(p => ({ ...p, customer_email: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">{t.invoices.customerPhone}</label>
                <input className={inp} value={form.customer_phone} onChange={e => setForm(p => ({ ...p, customer_phone: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-stone-600 mb-1">{t.invoices.customerAddress}</label>
                <input className={inp} value={form.customer_address} onChange={e => setForm(p => ({ ...p, customer_address: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">{t.invoices.customerCity}</label>
                <input className={inp} value={form.customer_city} onChange={e => setForm(p => ({ ...p, customer_city: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">{t.invoices.customerState}</label>
                  <input className={inp} value={form.customer_state} onChange={e => setForm(p => ({ ...p, customer_state: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">{t.invoices.customerZip}</label>
                  <input className={inp} value={form.customer_zip} onChange={e => setForm(p => ({ ...p, customer_zip: e.target.value }))} />
                </div>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-white rounded-xl border border-stone-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-stone-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-stone-700" />
                {t.invoices.lineItems}
              </h3>
              <div className="flex gap-2 relative">
                <button
                  type="button"
                  onClick={() => setShowProductSearch(p => !p)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-blue-300 text-stone-900 rounded-lg text-xs hover:bg-blue-50 font-medium"
                >
                  <Search className="w-3.5 h-3.5" /> {t.invoices.addFromInventory}
                </button>
                <button
                  type="button"
                  onClick={addItem}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 hover:bg-stone-700 text-white rounded-lg text-xs font-medium"
                >
                  <Plus className="w-3.5 h-3.5" /> {t.invoices.addItem}
                </button>
                {showProductSearch && (
                  <ProductSearchDropdown
                    t={t}
                    onSelect={handleProductSelect}
                    onClose={() => setShowProductSearch(false)}
                  />
                )}
              </div>
            </div>

            {items.length === 0 ? (
              <p className="text-sm text-stone-400 text-center py-6">{t.invoices.noItemsYet}</p>
            ) : (
              <div className="space-y-2">
                {/* Column Headers */}
                <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-stone-400 uppercase tracking-wide px-1">
                  <div className="col-span-5">{t.invoices.itemDescription}</div>
                  <div className="col-span-2">{t.invoices.itemSku}</div>
                  <div className="col-span-1 text-center">{t.invoices.itemQty}</div>
                  <div className="col-span-2 text-right">{t.invoices.itemUnitPrice}</div>
                  <div className="col-span-1 text-right">{t.invoices.itemTotal}</div>
                  <div className="col-span-1"></div>
                </div>

                {items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-stone-50 rounded-lg p-2">
                    <div className="col-span-5">
                      <input
                        className="border border-stone-200 rounded px-2 py-1.5 text-sm w-full focus:ring-1 focus:ring-stone-400"
                        value={item.description}
                        onChange={e => updateItem(idx, 'description', e.target.value)}
                        placeholder={t.invoices.itemDescription}
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        className="border border-stone-200 rounded px-2 py-1.5 text-xs font-mono w-full focus:ring-1 focus:ring-stone-400 uppercase"
                        value={item.sku}
                        onChange={e => updateItem(idx, 'sku', e.target.value.toUpperCase())}
                        placeholder="SKU"
                      />
                    </div>
                    <div className="col-span-1">
                      <input
                        className="border border-stone-200 rounded px-2 py-1.5 text-sm w-full text-center focus:ring-1 focus:ring-stone-400"
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={e => updateItem(idx, 'quantity', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-stone-400 text-sm">$</span>
                        <input
                          className="border border-stone-200 rounded pl-5 pr-2 py-1.5 text-sm w-full text-right focus:ring-1 focus:ring-stone-400"
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          onChange={e => updateItem(idx, 'unit_price', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="col-span-1 text-right text-sm font-semibold text-stone-900">
                      {fmt(item.line_total)}
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl border border-stone-100 p-5">
            <h3 className="font-semibold text-stone-800 mb-4">{t.invoices.notes}</h3>
            <textarea
              className={inp + ' resize-none'}
              rows={3}
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              placeholder={t.invoices.notes}
            />
            <h3 className="font-semibold text-stone-800 mt-4 mb-2">{t.invoices.internalNotes}</h3>
            <textarea
              className={inp + ' resize-none'}
              rows={2}
              value={form.internal_notes}
              onChange={e => setForm(p => ({ ...p, internal_notes: e.target.value }))}
              placeholder={t.invoices.internalNotes}
            />
          </div>
        </div>

        {/* Right: Totals + Payment */}
        <div className="space-y-4">
          {/* Totals Card */}
          <div className="bg-white rounded-xl border border-stone-100 p-5 sticky top-4">
            <h3 className="font-semibold text-stone-800 mb-4">{t.invoices.subtotal}</h3>

            <div className="space-y-3">
              <div className="flex justify-between text-sm text-stone-600">
                <span>{t.invoices.subtotal}</span>
                <span className="font-medium">{fmt(subtotal)}</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">{t.invoices.discount}</label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-stone-400 text-sm">$</span>
                  <input
                    className="border border-stone-200 rounded-lg pl-5 pr-3 py-1.5 text-sm w-full focus:ring-1 focus:ring-stone-400"
                    type="number" min="0" step="0.01"
                    value={form.discount_amount}
                    onChange={e => setForm(p => ({ ...p, discount_amount: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">{t.invoices.taxRate}</label>
                <div className="relative">
                  <input
                    className="border border-stone-200 rounded-lg px-3 pr-7 py-1.5 text-sm w-full focus:ring-1 focus:ring-stone-400"
                    type="number" min="0" step="0.1" max="100"
                    value={form.tax_rate}
                    onChange={e => setForm(p => ({ ...p, tax_rate: e.target.value }))}
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 text-sm">%</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">{t.invoices.shippingFee || 'Shipping Fee'}</label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-stone-400 text-sm">$</span>
                  <input
                    className="border border-stone-200 rounded-lg pl-5 pr-3 py-1.5 text-sm w-full focus:ring-1 focus:ring-stone-400"
                    type="number" min="0" step="0.01"
                    value={form.shipping_fee}
                    onChange={e => setForm(p => ({ ...p, shipping_fee: e.target.value }))}
                  />
                </div>
              </div>

              {shippingFee > 0 && (
                <div className="flex justify-between text-sm text-stone-600">
                  <span>{t.invoices.shippingFee || 'Shipping'}</span>
                  <span>{fmt(shippingFee)}</span>
                </div>
              )}

              {taxAmount > 0 && (
                <div className="flex justify-between text-sm text-stone-600">
                  <span>{t.invoices.taxAmount} ({taxRate}%)</span>
                  <span>{fmt(taxAmount)}</span>
                </div>
              )}

              <div className="flex justify-between font-bold text-stone-900 text-lg border-t pt-3">
                <span>{t.invoices.total}</span>
                <span>{fmt(total)}</span>
              </div>
            </div>

            {/* Payment */}
            <div className="mt-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">{t.invoices.paymentMethod}</label>
                <select
                  className="border border-stone-200 rounded-lg px-3 py-2 text-sm w-full focus:ring-2 focus:ring-stone-400"
                  value={form.payment_method}
                  onChange={e => setForm(p => ({ ...p, payment_method: e.target.value }))}
                >
                  {paymentMethodOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">{t.invoices.paymentTerms}</label>
                <select
                  className="border border-stone-200 rounded-lg px-3 py-2 text-sm w-full focus:ring-2 focus:ring-stone-400"
                  value={form.payment_terms}
                  onChange={e => setForm(p => ({ ...p, payment_terms: e.target.value }))}
                >
                  {paymentTermsOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">{t.invoices.dueDate}</label>
                <input
                  className="border border-stone-200 rounded-lg px-3 py-2 text-sm w-full focus:ring-2 focus:ring-stone-400"
                  type="date"
                  value={form.due_date}
                  onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
                />
              </div>
            </div>

            {/* Status */}
            {isEdit && (
              <div className="mt-4 pt-4 border-t border-stone-100">
                <label className="block text-xs font-medium text-stone-600 mb-2">{t.invoices.status}</label>
                <div className="flex flex-wrap gap-2">
                  {['draft', 'sent', 'paid', 'cancelled'].map(s => {
                    const cfg = invoiceStatusConfig[s]
                    const label = t.invoices[`status${s.charAt(0).toUpperCase() + s.slice(1)}`]
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setForm(p => ({ ...p, status: s }))}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                          form.status === s
                            ? `${cfg.bg} ${cfg.color} ${cfg.border} ring-2 ring-offset-1 ring-blue-300`
                            : 'bg-stone-50 text-stone-500 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Save Buttons */}
            <div className="mt-5 space-y-2">
              <button
                type="button"
                onClick={() => handleSave('sent')}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-stone-900 hover:bg-stone-700 text-white rounded-lg text-sm font-medium"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {t.invoices.markAsSent}
              </button>
              {isEdit && (
                <button
                  type="button"
                  onClick={() => handleSave('paid')}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-stone-900 hover:bg-stone-700 text-white rounded-lg text-sm font-medium"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {t.invoices.markAsPaid}
                </button>
              )}
              <button
                type="button"
                onClick={() => handleSave()}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-stone-200 rounded-lg text-sm text-stone-700 hover:bg-stone-50"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {t.invoices.saveAsDraft}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showPrint && savedInvoice && (
        <InvoicePrintView
          invoice={savedInvoice}
          t={t}
          lang={lang}
          onClose={() => setShowPrint(false)}
        />
      )}
    </div>
  )
}

// ─── Invoice List ─────────────────────────────────────────────────────────────
const InvoiceList = ({ t, lang, onNew, onEdit }) => {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [showPrint, setShowPrint] = useState(null)

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    try {
      const url = statusFilter
        ? `${API_BASE}/api/invoices?status=${statusFilter}`
        : `${API_BASE}/api/invoices`
      const res = await staffFetch(url)
      const data = await res.json()
      setInvoices(Array.isArray(data) ? data : [])
    } catch { setInvoices([]) }
    finally { setLoading(false) }
  }, [statusFilter])

  useEffect(() => { fetchInvoices() }, [fetchInvoices])

  const handleDelete = async (inv) => {
    if (!window.confirm(t.invoices.deleteConfirm)) return
    try {
      await staffFetch(`/api/invoices/${inv.id}`, { method: 'DELETE' })
      fetchInvoices()
    } catch {}
  }

  const handleQuickStatus = async (inv, newStatus) => {
    const confirmMsg = newStatus === 'cancelled'
      ? (t.invoices.cancelConfirm || 'Cancel this invoice?')
      : null
    if (confirmMsg && !window.confirm(confirmMsg)) return
    try {
      await staffFetch(`/api/invoices/${inv.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...inv, status: newStatus }),
      })
      fetchInvoices()
    } catch {}
  }

  const filtered = invoices.filter(inv => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      inv.invoice_number.toLowerCase().includes(q) ||
      inv.customer_name.toLowerCase().includes(q) ||
      (inv.customer_company || '').toLowerCase().includes(q)
    )
  })

  const statusLabel = (s) => t.invoices[`status${s.charAt(0).toUpperCase() + s.slice(1)}`] || s

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h2 className="text-xl font-bold text-stone-900">{t.invoices.customerInvoicesTitle || t.invoices.title}</h2>
        <button
          onClick={onNew}
          className="flex items-center gap-2 px-4 py-2 bg-stone-900 hover:bg-stone-700 text-white rounded-lg text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> {t.invoices.newInvoice}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t.invoices.searchPlaceholder}
            className="w-full pl-9 pr-3 py-2 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-stone-400"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['', 'draft', 'sent', 'paid', 'cancelled'].map(s => {
            const cfg = s ? invoiceStatusConfig[s] : null
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  statusFilter === s
                    ? 'bg-blue-600 text-white border-blue-600'
                    : cfg ? `${cfg.bg} ${cfg.color} ${cfg.border}` : 'bg-stone-100 text-stone-600 border-stone-200'
                }`}
              >
                {s ? statusLabel(s) : t.invoices.allStatuses}
              </button>
            )
          })}
        </div>
        <button onClick={fetchInvoices} className="flex items-center gap-1 px-3 py-2 border border-stone-200 rounded-lg text-sm text-stone-600 hover:bg-stone-50">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> {t.header.refresh}
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-12"><RefreshCw className="w-8 h-8 animate-spin text-stone-400 mx-auto" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-stone-100">
          <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-stone-500">{t.invoices.noInvoices}</p>
          <button
            onClick={onNew}
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-stone-900 hover:bg-stone-700 text-white rounded-lg text-sm font-medium mx-auto"
          >
            <Plus className="w-4 h-4" /> {t.invoices.newInvoice}
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-100">
              <tr>
                {[t.invoices.invoiceNumber, t.invoices.customerName, t.invoices.status,
                  t.invoices.total, t.invoices.dueDate, t.invoices.createdAt, ''].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(inv => {
                const cfg = invoiceStatusConfig[inv.status] || invoiceStatusConfig.draft
                return (
                  <tr key={inv.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-stone-900">{inv.invoice_number}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-stone-900">{inv.customer_name}</p>
                      {inv.customer_company && <p className="text-xs text-stone-400">{inv.customer_company}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                        {statusLabel(inv.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-stone-900">{fmt(inv.total_amount)}</td>
                    <td className="px-4 py-3 text-stone-500 text-xs">{inv.due_date || '—'}</td>
                    <td className="px-4 py-3 text-stone-400 text-xs">
                      {new Date(inv.created_at).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        <button
                          onClick={async () => {
                            try {
                              const res = await staffFetch(`${API_BASE}/api/invoices/${inv.id}/pdf`)
                              if (!res.ok) throw new Error()
                              const blob = await res.blob()
                              const url = URL.createObjectURL(blob)
                              const a = document.createElement('a')
                              a.href = url
                              a.download = `${inv.invoice_number}.pdf`
                              a.click()
                              URL.revokeObjectURL(url)
                            } catch { alert('PDF download failed') }
                          }}
                          className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded"
                          title={t.invoices.downloadPdf || 'Download PDF'}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setShowPrint(inv)}
                          className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded"
                          title={t.invoices.printInvoice}
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onEdit(inv)}
                          className="p-1.5 text-stone-700 hover:text-stone-900 hover:bg-blue-50 rounded"
                          title={t.invoices.editInvoice}
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        {inv.status !== 'sent' && inv.status !== 'paid' && inv.status !== 'cancelled' && (
                          <button
                            onClick={() => handleQuickStatus(inv, 'sent')}
                            className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 rounded border border-blue-200"
                            title={t.invoices.markAsSent}
                          >
                            {t.invoices.markAsSent || 'Mark Sent'}
                          </button>
                        )}
                        {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                          <button
                            onClick={() => handleQuickStatus(inv, 'paid')}
                            className="px-2 py-0.5 text-xs bg-green-50 text-green-700 hover:bg-green-100 rounded border border-green-200"
                            title={t.invoices.markAsPaid}
                          >
                            {t.invoices.markAsPaid || 'Mark Paid'}
                          </button>
                        )}
                        {inv.status !== 'cancelled' && (
                          <button
                            onClick={() => handleQuickStatus(inv, 'cancelled')}
                            className="px-2 py-0.5 text-xs bg-red-50 text-red-600 hover:bg-red-100 rounded border border-red-200"
                            title={t.invoices.cancelInvoice || 'Cancel'}
                          >
                            {t.invoices.cancelInvoice || 'Cancel'}
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(inv)}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                          title={t.invoices.deleteInvoice}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showPrint && (
        <InvoicePrintView
          invoice={showPrint}
          t={t}
          lang={lang}
          onClose={() => setShowPrint(null)}
        />
      )}
    </div>
  )
}

// ─── Invoices Tab (top-level) ─────────────────────────────────────────────────
export const InvoicesTab = ({ t, lang }) => {
  const [view, setView] = useState('list') // 'list' | 'new' | 'edit'
  const [editingInvoice, setEditingInvoice] = useState(null)

  const handleNew = () => { setEditingInvoice(null); setView('new') }
  const handleEdit = (inv) => { setEditingInvoice(inv); setView('edit') }
  const handleSaved = () => { setView('list') }
  const handleCancel = () => { setView('list') }

  if (view === 'new' || view === 'edit') {
    return (
      <InvoiceForm
        invoice={editingInvoice}
        t={t}
        lang={lang}
        onSave={handleSaved}
        onCancel={handleCancel}
      />
    )
  }

  return (
    <InvoiceList
      t={t}
      lang={lang}
      onNew={handleNew}
      onEdit={handleEdit}
    />
  )
}

export default InvoicesTab
