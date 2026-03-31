import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Phone, ShoppingCart, FileText, BarChart2, Plus, Trash2, Search,
  Trophy, Upload, ChevronUp, ChevronDown, Star, X, Edit3,
  Save, CheckCircle, Send, CreditCard, Banknote, Clock, UserPlus,
  ArrowLeft, RefreshCw, Tag,
} from 'lucide-react'
import { staffFetch } from '@/lib/staffApi'

const formatPrice = (v) => `$${(parseFloat(v) || 0).toFixed(2)}`
const formatDate  = (d) => {
  if (!d) return '—'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return '—'
  return dt.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
}

// ─────────────────────────────────────────────────────────────────────────────
// Calling List Sub-tab
// ─────────────────────────────────────────────────────────────────────────────
function CallingListPanel({ t, onSelectCustomer }) {
  const [entries, setEntries]           = useState([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [sortBy, setSortBy]             = useState('priority_score')
  const [sortDir, setSortDir]           = useState('desc')
  const [statusFilter, setStatusFilter] = useState('')
  const [showAddForm, setShowAddForm]   = useState(false)
  const [editEntry, setEditEntry]       = useState(null)
  const [uploading, setUploading]       = useState(false)
  const [uploadMsg, setUploadMsg]       = useState('')
  const fileInputRef = useRef(null)

  const [form, setForm] = useState({
    company_name: '', contact_name: '', phone: '', email: '',
    address: '', notes: '', priority_score: 50,
  })

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ sort: sortBy, dir: sortDir })
    if (statusFilter) params.set('status', statusFilter)
    if (search) params.set('q', search)
    staffFetch(`/api/sales/calling-list?${params}`)
      .then(r => r.json())
      .then(d => { setEntries(d.entries || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [sortBy, sortDir, statusFilter, search])

  useEffect(() => { load() }, [load])

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('desc') }
  }

  const SortIcon = ({ col }) => {
    if (sortBy !== col) return <ChevronDown className="w-3 h-3 text-stone-300 inline ml-1" />
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-stone-700 inline ml-1" />
      : <ChevronDown className="w-3 h-3 text-stone-700 inline ml-1" />
  }

  const handleSave = async () => {
    const url  = editEntry ? `/api/sales/calling-list/${editEntry.id}` : '/api/sales/calling-list'
    const meth = editEntry ? 'PUT' : 'POST'
    const r = await staffFetch(url, {
      method: meth,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (r.ok) {
      setShowAddForm(false)
      setEditEntry(null)
      setForm({ company_name: '', contact_name: '', phone: '', email: '', address: '', notes: '', priority_score: 50 })
      load()
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this entry?')) return
    await staffFetch(`/api/sales/calling-list/${id}`, { method: 'DELETE' })
    load()
  }

  const handleMarkCalled = async (id) => {
    await staffFetch(`/api/sales/calling-list/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mark_called: true, status: 'called' }),
    })
    load()
  }

  const handleCsvUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setUploadMsg('')
    const fd = new FormData()
    fd.append('file', file)
    try {
      const r = await staffFetch('/api/sales/calling-list/upload-csv', { method: 'POST', body: fd })
      const d = await r.json()
      if (r.ok) setUploadMsg(`Imported ${d.created} entries${d.skipped ? `, ${d.skipped} skipped` : ''}`)
      else setUploadMsg(`Error: ${d.error}`)
      load()
    } catch { setUploadMsg('Upload failed') }
    setUploading(false)
    e.target.value = ''
  }

  const openEdit = (entry) => {
    setEditEntry(entry)
    setForm({
      company_name: entry.company_name || '',
      contact_name: entry.contact_name || '',
      phone: entry.phone || '',
      email: entry.email || '',
      address: entry.address || '',
      notes: entry.notes || '',
      priority_score: entry.priority_score || 50,
    })
    setShowAddForm(true)
  }

  const statusBadge = (s) => {
    const map = {
      new:       'bg-blue-50 text-blue-700',
      called:    'bg-yellow-50 text-yellow-700',
      converted: 'bg-green-50 text-green-700',
      dnc:       'bg-red-50 text-red-700',
      customer:  'bg-purple-50 text-purple-700',
    }
    return `px-2 py-0.5 rounded-full text-xs font-medium ${map[s] || 'bg-stone-100 text-stone-600'}`
  }

  const priorityColor = (score) => {
    if (score >= 80) return 'text-green-600 font-bold'
    if (score >= 60) return 'text-yellow-600 font-semibold'
    return 'text-stone-400'
  }

  return (
    <div>
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t.searchCallList || 'Search name, company, phone…'}
              className="pl-9 pr-4 py-2 border border-stone-200 rounded-lg text-sm w-56 focus:outline-none focus:ring-2 focus:ring-stone-900"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
          >
            <option value="">{t.allStatuses || 'All Statuses'}</option>
            <option value="new">New</option>
            <option value="called">Called</option>
            <option value="converted">Converted</option>
            <option value="dnc">DNC</option>
            <option value="customer">Customer</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs font-medium text-amber-700">
            <Star className="w-3 h-3" />
            {t.smartFilter || 'Smart Sort: Best Conversion First'}
          </span>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-2 border border-stone-200 rounded-lg text-sm text-stone-600 hover:bg-stone-50"
          >
            <Upload className="w-4 h-4" />
            {uploading ? 'Uploading…' : (t.uploadCsv || 'Upload CSV')}
          </button>
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
          <button
            onClick={() => { setEditEntry(null); setForm({ company_name:'',contact_name:'',phone:'',email:'',address:'',notes:'',priority_score:50 }); setShowAddForm(true) }}
            className="flex items-center gap-1.5 px-3 py-2 bg-stone-900 text-white rounded-lg text-sm hover:bg-stone-700"
          >
            <Plus className="w-4 h-4" />
            {t.addEntry || 'Add Entry'}
          </button>
        </div>
      </div>

      {uploadMsg && (
        <div className={`mb-3 p-2 rounded-lg text-sm ${uploadMsg.startsWith('Imported') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {uploadMsg}
        </div>
      )}

      {/* Add / Edit form */}
      {showAddForm && (
        <div className="mb-4 bg-white border border-stone-200 rounded-xl p-5">
          <h3 className="font-semibold text-stone-900 mb-4 text-sm">
            {editEntry ? (t.editEntry || 'Edit Entry') : (t.addEntry || 'Add Entry')}
          </h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            {[
              ['company_name', t.company || 'Company'],
              ['contact_name', t.contactName || 'Contact Name'],
              ['phone', t.phone || 'Phone *'],
              ['email', t.email || 'Email'],
              ['address', t.address || 'Address'],
            ].map(([key, label]) => (
              <div key={key}>
                <label className="block text-xs font-medium text-stone-500 mb-1">{label}</label>
                <input
                  value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">
                {t.priorityScore || 'Priority Score (0–100)'}
              </label>
              <input
                type="number" min="0" max="100"
                value={form.priority_score}
                onChange={e => setForm(f => ({ ...f, priority_score: e.target.value }))}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs font-medium text-stone-500 mb-1">{t.notes || 'Notes'}</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 resize-none"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="px-4 py-2 bg-stone-900 text-white rounded-lg text-sm hover:bg-stone-700">
              <Save className="w-4 h-4 inline mr-1" />{t.save || 'Save'}
            </button>
            <button onClick={() => { setShowAddForm(false); setEditEntry(null) }} className="px-4 py-2 border border-stone-200 rounded-lg text-sm text-stone-600 hover:bg-stone-50">
              {t.cancel || 'Cancel'}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <p className="text-stone-400 text-sm py-8 text-center">Loading…</p>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <Phone className="w-10 h-10 mx-auto mb-3 text-stone-200" />
          <p className="text-sm">{t.noEntries || 'No entries yet. Upload a CSV or add manually.'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-100">
              <tr>
                <th className="text-left px-4 py-3 text-stone-500 font-medium cursor-pointer select-none" onClick={() => toggleSort('priority_score')}>
                  Score <SortIcon col="priority_score" />
                </th>
                <th className="text-left px-4 py-3 text-stone-500 font-medium cursor-pointer select-none" onClick={() => toggleSort('company_name')}>
                  {t.company || 'Company'} <SortIcon col="company_name" />
                </th>
                <th className="text-left px-4 py-3 text-stone-500 font-medium">{t.contactName || 'Contact'}</th>
                <th className="text-left px-4 py-3 text-stone-500 font-medium">{t.phone || 'Phone'}</th>
                <th className="text-left px-4 py-3 text-stone-500 font-medium cursor-pointer select-none hidden md:table-cell" onClick={() => toggleSort('status')}>
                  {t.status || 'Status'} <SortIcon col="status" />
                </th>
                <th className="text-left px-4 py-3 text-stone-500 font-medium hidden lg:table-cell cursor-pointer select-none" onClick={() => toggleSort('last_called')}>
                  {t.lastCalled || 'Last Called'} <SortIcon col="last_called" />
                </th>
                <th className="text-center px-4 py-3 text-stone-500 font-medium">{t.placeOrder || 'Place Order'}</th>
                <th className="text-right px-4 py-3 text-stone-500 font-medium">{t.actions || 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(e => (
                <tr key={e.id} className="border-b border-stone-50 hover:bg-stone-50">
                  <td className="px-4 py-3">
                    <span className={`text-sm ${priorityColor(e.priority_score)}`}>
                      {Math.round(e.priority_score)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-stone-900">{e.company_name || '—'}</p>
                    {e.notes && <p className="text-xs text-stone-400 truncate max-w-[160px]">{e.notes}</p>}
                  </td>
                  <td className="px-4 py-3 text-stone-600">{e.contact_name || '—'}</td>
                  <td className="px-4 py-3">
                    {e.phone ? (
                      <a href={`tel:${e.phone}`} className="text-blue-600 hover:underline font-mono text-xs">
                        {e.phone}
                      </a>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={statusBadge(e.status)}>{e.status}</span>
                  </td>
                  <td className="px-4 py-3 text-stone-400 text-xs hidden lg:table-cell">
                    {e.last_called ? formatDate(e.last_called) : '—'}
                  </td>
                  {/* Place Order — own column */}
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => onSelectCustomer({ id: e.customer_id || null, full_name: e.contact_name, company_name: e.company_name, phone: e.phone, email: e.email, shipping_address: e.address })}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-semibold text-sm shadow-sm"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      {t.placeOrder || 'Place Order'}
                    </button>
                  </td>
                  {/* Actions — Call, Edit, Delete */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      {!['converted','dnc','customer'].includes(e.status) && (
                        <button
                          onClick={() => handleMarkCalled(e.id)}
                          title="Mark as Called"
                          className="text-xs px-2.5 py-1 rounded border border-stone-200 text-stone-600 hover:bg-stone-50 flex items-center gap-1"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Call</span>
                        </button>
                      )}
                      <button onClick={() => openEdit(e)} className="text-xs px-2.5 py-1 rounded border border-stone-200 text-stone-600 hover:bg-stone-50 flex items-center gap-1">
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button onClick={() => handleDelete(e.id)} className="text-xs px-2.5 py-1 rounded border border-red-100 text-red-400 hover:bg-red-50 flex items-center gap-1">
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2 bg-stone-50 border-t border-stone-100 text-xs text-stone-400">
            {entries.length} {t.entries || 'entries'}
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Place Order Sub-tab
// ─────────────────────────────────────────────────────────────────────────────
function PlaceOrderPanel({ t, selectedCustomer: initialCustomer, onOrderPlaced }) {
  const normalizeCustomer = (c) => c ? ({
    id: c.id,
    full_name: c.full_name || c.name || c.username || '',
    username: c.username || c.name || '',
    company_name: c.company_name || c.company || '',
    phone: c.phone || '',
    email: c.email || '',
    shipping_address: c.shipping_address || c.address || '',
    source: c.source,
  }) : null

  const [customer, setCustomer]               = useState(() => normalizeCustomer(initialCustomer))
  const [custSearch, setCustSearch]           = useState('')
  const [custResults, setCustResults]         = useState([])
  const [custLoading, setCustLoading]         = useState(false)
  const [showNewCustForm, setShowNewCustForm] = useState(false)
  const [newCust, setNewCust]                 = useState({ first_name:'',last_name:'',company_name:'',email:'',phone:'',shipping_address:'',billing_address:'' })
  const [creatingCust, setCreatingCust]       = useState(false)
  const [custError, setCustError]             = useState('')

  // Catalog state
  const [catalog, setCatalog]         = useState([])   // [{id, name, products:[]}]
  const [catLoading, setCatLoading]   = useState(false)
  const [selectedCat, setSelectedCat] = useState(null)
  const [productSearch, setProductSearch] = useState('')

  // Cart state — each item: { product_id, name, sku, qty, unit_price, bulk_price, bulk_quantity, is_bulk }
  const [items, setItems]           = useState([])
  const [notes, setNotes]           = useState('')
  const [paymentMethod, setPaymentMethod] = useState('net30')
  const [discountType, setDiscountType]   = useState('amount')
  const [discountValue, setDiscountValue] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg]     = useState('')

  // Payment page state
  const [page, setPage]           = useState('order')
  const [placedOrder, setPlacedOrder] = useState(null)
  const [smsPhone, setSmsPhone]   = useState('')
  const [smsSending, setSmsSending] = useState(false)
  const [smsResult, setSmsResult] = useState(null)

  // Custom item form
  const [showCustomItem, setShowCustomItem] = useState(false)
  const [customItem, setCustomItem] = useState({ name: '', sku: '', unit_price: '' })

  // ACH state — pre-filled from customer record, editable before submit
  const emptyAch = { bank_name: '', account_name: '', routing_number: '', account_number: '', account_type: 'checking' }
  const [ach, setAch]               = useState(emptyAch)
  const [achOnFile, setAchOnFile]   = useState(null)   // { has_ach, ach_bank_name, ... } from server
  const [achLoading, setAchLoading] = useState(false)
  const [showAchForm, setShowAchForm] = useState(false)
  const [achError, setAchError]     = useState('')

  const isNetTerms = paymentMethod === 'net15' || paymentMethod === 'net30'

  // Load ACH info on file whenever customer changes
  useEffect(() => {
    if (!customer?.id) { setAchOnFile(null); setAch(emptyAch); return }
    setAchLoading(true)
    staffFetch(`/api/sales/customer/${customer.id}/ach`)
      .then(r => r.json())
      .then(d => {
        setAchOnFile(d)
        if (d.has_ach) {
          setAch(prev => ({
            ...prev,
            bank_name: d.ach_bank_name || '',
            account_name: d.ach_account_name || '',
            routing_number: d.ach_routing_number || '',
            account_number: '',   // never pre-fill full account number
            account_type: d.ach_account_type || 'checking',
          }))
        } else {
          setAch(emptyAch)
        }
      })
      .catch(() => setAchOnFile(null))
      .finally(() => setAchLoading(false))
  }, [customer?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (initialCustomer) {
      const n = normalizeCustomer(initialCustomer)
      setCustomer(n)
      setSmsPhone(n.phone || '')
    }
  }, [initialCustomer]) // eslint-disable-line react-hooks/exhaustive-deps

  // Customer search
  const searchCustomers = useCallback(async (q) => {
    if (!q || q.length < 2) { setCustResults([]); return }
    setCustLoading(true)
    try {
      const r = await staffFetch(`/api/staff/customers/search?q=${encodeURIComponent(q)}`)
      const d = await r.json()
      setCustResults(d.customers || d || [])
    } catch { setCustResults([]) }
    setCustLoading(false)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => searchCustomers(custSearch), 300)
    return () => clearTimeout(timer)
  }, [custSearch, searchCustomers])

  const selectCustomer = (c) => {
    const n = normalizeCustomer(c)
    setCustomer(n); setCustSearch(''); setCustResults([]); setSmsPhone(n.phone || '')
  }

  const handleCreateCustomer = async () => {
    if (!newCust.email) { setCustError('Email is required'); return }
    if (!newCust.first_name && !newCust.company_name) { setCustError('First name or company name is required'); return }
    setCreatingCust(true); setCustError('')
    try {
      const r = await staffFetch('/api/staff/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCust),
      })
      const d = await r.json()
      if (r.ok) {
        selectCustomer({
          id: d.id,
          full_name: `${newCust.first_name} ${newCust.last_name}`.trim() || d.username,
          username: d.username,
          company_name: d.company_name || '',
          phone: d.phone || newCust.phone || '',
          email: d.email || newCust.email || '',
          shipping_address: newCust.shipping_address || '',
          source: 'customer',
        })
        setShowNewCustForm(false)
        setNewCust({ first_name:'',last_name:'',company_name:'',email:'',phone:'',shipping_address:'',billing_address:'' })
      } else setCustError(d.error || 'Failed to create customer')
    } catch { setCustError('Network error') }
    setCreatingCust(false)
  }

  // Load full catalog once on mount
  useEffect(() => {
    setCatLoading(true)
    staffFetch('/api/products/sales-catalog')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setCatalog(data) })
      .catch(() => {})
      .finally(() => setCatLoading(false))
  }, [])

  // Derive products for selected category (instant — no network call)
  const catProducts = selectedCat
    ? (catalog.find(c => c.id === selectedCat.id)?.products || [])
    : []

  const filteredCatProducts = catProducts.filter(p =>
    !productSearch ||
    p.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.sku?.toLowerCase().includes(productSearch.toLowerCase())
  )

  // ── Cart helpers ────────────────────────────────────────────────────────────
  // Determine effective price for a given product + qty (auto bulk)
  const effectivePrice = (p, qty) => {
    if (p.bulk_price && p.bulk_quantity && qty >= p.bulk_quantity) return parseFloat(p.bulk_price)
    return parseFloat(p.unit_price) || 0
  }

  const addItem = (product) => {
    setItems(prev => {
      const existing = prev.find(i => i.product_id === product.id)
      if (existing) {
        // Increment qty and re-evaluate bulk pricing
        return prev.map(i => {
          if (i.product_id !== product.id) return i
          const newQty = i.qty + 1
          const newPrice = effectivePrice(product, newQty)
          return { ...i, qty: newQty, unit_price: newPrice, is_bulk: product.bulk_quantity ? newQty >= product.bulk_quantity : false }
        })
      }
      const price = effectivePrice(product, 1)
      return [...prev, {
        product_id: product.id,
        name: product.name,
        sku: product.sku || '',
        qty: 1,
        unit_price: price,
        bulk_price: product.bulk_price ? parseFloat(product.bulk_price) : null,
        bulk_quantity: product.bulk_quantity || null,
        is_bulk: false,
      }]
    })
  }

  const updateQty = (idx, val) => {
    const q = parseInt(val)
    if (isNaN(q) || q < 1) return
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it
      const isBulk = it.bulk_quantity ? q >= it.bulk_quantity : false
      const newPrice = (isBulk && it.bulk_price) ? it.bulk_price : (it.bulk_price && !isBulk ? parseFloat(it.bulk_price) / 1 : it.unit_price)
      // Re-derive price from original product prices stored on item
      const basePrice = it.bulk_price && it.bulk_quantity
        ? (q >= it.bulk_quantity ? it.bulk_price : (it._list_price || it.unit_price))
        : it.unit_price
      return { ...it, qty: q, unit_price: basePrice, is_bulk: isBulk }
    }))
  }

  // When adding an item, also store the list price so we can revert if qty drops below bulk threshold
  const addItemFull = (product) => {
    setItems(prev => {
      const existing = prev.find(i => i.product_id === product.id)
      const listPrice = parseFloat(product.unit_price) || 0
      const bulkPrice = product.bulk_price ? parseFloat(product.bulk_price) : null
      const bulkQty   = product.bulk_quantity || null
      if (existing) {
        return prev.map(i => {
          if (i.product_id !== product.id) return i
          const newQty  = i.qty + 1
          const isBulk  = bulkQty ? newQty >= bulkQty : false
          const newPrice = isBulk && bulkPrice ? bulkPrice : listPrice
          return { ...i, qty: newQty, unit_price: newPrice, is_bulk: isBulk }
        })
      }
      return [...prev, {
        product_id:   product.id,
        name:         product.name,
        sku:          product.sku || '',
        qty:          1,
        unit_price:   listPrice,
        _list_price:  listPrice,
        bulk_price:   bulkPrice,
        bulk_quantity: bulkQty,
        is_bulk:      false,
      }]
    })
  }

  const updateQtyFull = (idx, val) => {
    const q = parseInt(val)
    if (isNaN(q) || q < 1) return
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it
      const isBulk  = it.bulk_quantity ? q >= it.bulk_quantity : false
      const newPrice = isBulk && it.bulk_price ? it.bulk_price : (it._list_price || it.unit_price)
      return { ...it, qty: q, unit_price: newPrice, is_bulk: isBulk }
    }))
  }

  const updatePrice = (idx, val) => {
    const p = parseFloat(val)
    if (!isNaN(p) && p >= 0) setItems(prev => prev.map((it, i) => i === idx ? { ...it, unit_price: p } : it))
  }
  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx))

  const addCustomItem = () => {
    if (!customItem.name.trim()) return
    const price = parseFloat(customItem.unit_price) || 0
    setItems(prev => [...prev, { product_id: null, name: customItem.name.trim(), sku: customItem.sku.trim(), qty: 1, unit_price: price, _list_price: price, bulk_price: null, bulk_quantity: null, is_bulk: false }])
    setCustomItem({ name: '', sku: '', unit_price: '' })
    setShowCustomItem(false)
  }

  const subtotal    = items.reduce((s, i) => s + i.qty * i.unit_price, 0)
  const discountAmt = discountType === 'percent' ? subtotal * (parseFloat(discountValue) || 0) / 100 : parseFloat(discountValue) || 0
  const total       = Math.max(0, subtotal - discountAmt)

  const handleSubmit = async () => {
    if (!customer) { setErrorMsg(t.selectCustomer || 'Select a customer first'); return }
    if (items.length === 0) { setErrorMsg(t.noItems || 'Add at least one item'); return }
    // Require ACH for net terms
    if (isNetTerms) {
      const needsNew = !achOnFile?.has_ach
      const hasNewAch = ach.routing_number && ach.account_number
      if (needsNew && !hasNewAch) {
        setErrorMsg(t.achRequired || 'ACH bank information is required for Net 15 / Net 30. Please fill in the bank details below.')
        setShowAchForm(true)
        return
      }
    }
    setSubmitting(true); setErrorMsg('')
    try {
      // Build ACH payload: send new info if provided, otherwise signal to use info on file
      const achPayload = isNetTerms ? {
        bank_name: ach.bank_name,
        account_name: ach.account_name,
        routing_number: ach.routing_number,
        account_number: ach.account_number,
        account_type: ach.account_type,
      } : null
      const r = await staffFetch('/api/sales/place-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customer.id,
          items: items.map(i => ({ product_id: i.product_id, quantity: i.qty, unit_price: i.unit_price, is_bulk_price: i.is_bulk || false })),
          notes, payment_method: paymentMethod,
          discount_amount: discountAmt, delivery_fee: 0,
          ach: achPayload,
        }),
      })
      const d = await r.json()
      if (r.ok) { setPlacedOrder(d.order || d); setSmsPhone(customer.phone || ''); setPage('payment'); if (onOrderPlaced) onOrderPlaced() }
      else {
        setErrorMsg(d.error || t.orderError || 'Failed to place order')
        if (d.ach_required) setShowAchForm(true)
      }
    } catch { setErrorMsg(t.orderError || 'Failed to place order') }
    setSubmitting(false)
  }

  const handleSendSms = async (method) => {
    if (!smsPhone) { setSmsResult({ error: 'Phone number required' }); return }
    setSmsSending(true); setSmsResult(null)
    try {
      const r = await staffFetch('/api/sales/send-payment-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_number: placedOrder?.order_number, phone_number: smsPhone, payment_method: method }),
      })
      setSmsResult(await r.json())
    } catch { setSmsResult({ error: 'Network error' }) }
    setSmsSending(false)
  }

  // ── Payment Page ──────────────────────────────────────────────────────────
  if (page === 'payment' && placedOrder) {
    return (
      <div className="max-w-2xl">
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl mb-6">
          <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-green-900">{t.orderSuccess || 'Order placed!'}</p>
            <p className="text-sm text-green-700">
              Order <span className="font-mono font-bold">{placedOrder.order_number}</span> — Total: <strong>{formatPrice(placedOrder.total_amount)}</strong>
            </p>
          </div>
        </div>

        <h3 className="text-lg font-bold text-stone-900 mb-1">{t.paymentPageTitle || 'Send Payment Request'}</h3>
        <p className="text-sm text-stone-500 mb-5">{t.paymentPageSubtitle || 'Choose a payment method and send an SMS to the customer.'}</p>

        <div className="mb-5">
          <label className="block text-xs font-medium text-stone-600 mb-1">{t.customerPhone || "Customer's Phone Number"}</label>
          <input
            value={smsPhone}
            onChange={e => setSmsPhone(e.target.value)}
            placeholder="(555) 000-0000"
            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {[
            { method: 'net30',       icon: Clock,       label: t.net30       || 'Net 30',       desc: t.net30Desc       || 'Send confirmation. Invoice due in 30 days.',      color: 'border-blue-200 hover:bg-blue-50' },
            { method: 'credit_card', icon: CreditCard,  label: t.creditCard  || 'Credit Card',  desc: t.creditCardDesc  || 'Generate Stripe link and send via SMS.',           color: 'border-green-200 hover:bg-green-50' },
            { method: 'check',       icon: Banknote,    label: t.check       || 'Check',        desc: t.checkDesc       || 'Send check upload link via SMS.',                  color: 'border-amber-200 hover:bg-amber-50' },
          ].map(({ method, icon: Icon, label, desc, color }) => (
            <button
              key={method}
              onClick={() => handleSendSms(method)}
              disabled={smsSending}
              className={`flex flex-col items-start p-4 border-2 rounded-xl text-left transition-all ${color} disabled:opacity-50`}
            >
              <div className="flex items-center gap-2 mb-1 w-full">
                <Icon className="w-4 h-4 text-stone-700" />
                <span className="font-semibold text-stone-900 text-sm">{label}</span>
                <Send className="w-3.5 h-3.5 text-stone-400 ml-auto" />
              </div>
              <p className="text-xs text-stone-500">{desc}</p>
            </button>
          ))}
        </div>

        {smsSending && <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-600 mb-4">Sending SMS…</div>}
        {smsResult && (
          <div className={`p-3 rounded-lg text-sm mb-4 ${smsResult.success ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
            {smsResult.success
              ? `SMS sent to ${smsResult.to} (${smsResult.payment_method})`
              : `${smsResult.error || 'SMS failed'}${smsResult.sms_preview ? ` — Preview: "${smsResult.sms_preview}"` : ''}`}
          </div>
        )}

        <button
          onClick={() => { setPage('order'); setItems([]); setNotes(''); setDiscountValue(''); setPlacedOrder(null); setSmsResult(null) }}
          className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-900"
        >
          <ArrowLeft className="w-4 h-4" />
          {t.placeAnotherOrder || 'Place Another Order'}
        </button>
      </div>
    )
  }

  // ── Order Page ────────────────────────────────────────────────────────────
  return (
    <div>
      {/* ── Customer bar ── */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-stone-700">{t.customer || 'Customer'}</h3>
          <button
            onClick={() => setShowNewCustForm(v => !v)}
            className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-900 border border-stone-200 rounded-lg px-2 py-1"
          >
            <UserPlus className="w-3.5 h-3.5" />
            {t.newCustomer || 'New Customer'}
          </button>
        </div>

        {showNewCustForm && (
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 mb-3">
            <h4 className="text-xs font-semibold text-stone-700 mb-3">{t.newCustomer || 'New Customer'}</h4>
            <div className="grid grid-cols-2 gap-3 mb-3">
              {[
                ['first_name','First Name'],['last_name','Last Name'],
                ['company_name','Company'],['email','Email'],
                ['phone','Phone'],['shipping_address','Shipping Address'],
              ].map(([key, label]) => (
                <div key={key}>
                  <label className="block text-xs text-stone-500 mb-1">{label}</label>
                  <input value={newCust[key]} onChange={e => setNewCust(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900" />
                </div>
              ))}
            </div>
            {custError && <p className="text-red-600 text-xs mb-2">{custError}</p>}
            <div className="flex gap-2">
              <button onClick={handleCreateCustomer} disabled={creatingCust} className="px-4 py-2 bg-stone-900 text-white rounded-lg text-sm hover:bg-stone-700 disabled:opacity-50">
                {creatingCust ? 'Creating…' : (t.createAndSelect || 'Create & Select')}
              </button>
              <button onClick={() => setShowNewCustForm(false)} className="px-4 py-2 border border-stone-200 rounded-lg text-sm text-stone-600 hover:bg-stone-50">
                {t.cancel || 'Cancel'}
              </button>
            </div>
          </div>
        )}

        {!customer && !showNewCustForm && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              value={custSearch}
              onChange={e => setCustSearch(e.target.value)}
              placeholder={t.searchCustomers || 'Search customer by name, company, phone…'}
              className="w-full pl-9 pr-4 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
            />
            {custLoading && <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300 animate-spin" />}
            {custResults.length > 0 && (
              <div className="absolute z-10 w-full bg-white border border-stone-200 rounded-lg shadow-lg mt-1 max-h-64 overflow-y-auto">
                {custResults.map(c => (
                  <button key={c.id} onClick={() => selectCustomer(c)} className="w-full text-left px-4 py-3 hover:bg-stone-50 border-b border-stone-50 last:border-0">
                    <p className="font-medium text-stone-900 text-sm">{c.full_name || c.name || c.username}</p>
                    <p className="text-xs text-stone-400">{c.company_name || c.company || ''} {c.phone ? `· ${c.phone}` : ''}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {customer && (
          <div className="flex items-start justify-between bg-blue-50 border border-blue-100 rounded-xl p-3">
            <div>
              <p className="font-semibold text-blue-900 text-sm">{customer.full_name || customer.username}</p>
              {customer.company_name && <p className="text-xs text-blue-600">{customer.company_name}</p>}
              {customer.phone && <p className="text-xs text-blue-500 font-mono">{customer.phone}</p>}
            </div>
            <button onClick={() => { setCustomer(null); setSmsPhone('') }} className="text-blue-400 hover:text-blue-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* ── Two-column layout: Catalog browser (left) + Cart (right) ── */}
      <div className="flex gap-4 items-start">

        {/* ── LEFT: Catalog browser ── */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-stone-700">{t.catalog || 'Product Catalog'}</span>
            <button
              type="button"
              onClick={() => setShowCustomItem(v => !v)}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium border border-dashed border-stone-300 rounded-lg text-stone-500 hover:bg-stone-50"
            >
              <Plus className="w-3 h-3" />{t.customItem || 'Custom Item'}
            </button>
          </div>

          {/* Custom item form */}
          {showCustomItem && (
            <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-xs font-semibold text-amber-800 mb-2">{t.customItem || 'Custom Item'}</p>
              <div className="grid grid-cols-3 gap-2 mb-2">
                <div className="col-span-3">
                  <label className="block text-xs text-stone-500 mb-0.5">Item Name *</label>
                  <input value={customItem.name} onChange={e => setCustomItem(c => ({ ...c, name: e.target.value }))}
                    placeholder="e.g. Delivery Fee"
                    className="w-full border border-stone-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-0.5">SKU</label>
                  <input value={customItem.sku} onChange={e => setCustomItem(c => ({ ...c, sku: e.target.value }))}
                    placeholder="CUSTOM-001"
                    className="w-full border border-stone-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-0.5">Unit Price ($)</label>
                  <input type="number" min="0" step="0.01" value={customItem.unit_price}
                    onChange={e => setCustomItem(c => ({ ...c, unit_price: e.target.value }))}
                    placeholder="0.00"
                    className="w-full border border-stone-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={addCustomItem} className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-medium">
                  <Plus className="w-3 h-3 inline mr-1" />{t.addToCart || 'Add to Cart'}
                </button>
                <button onClick={() => setShowCustomItem(false)} className="px-3 py-1.5 border border-stone-200 rounded-lg text-xs text-stone-500 hover:bg-stone-50">{t.cancel || 'Cancel'}</button>
              </div>
            </div>
          )}

          {/* Category pills */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {catLoading && <span className="text-xs text-stone-400">Loading catalog…</span>}
            {!catLoading && catalog.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCat(selectedCat?.id === cat.id ? null : cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  selectedCat?.id === cat.id
                    ? 'bg-stone-900 text-white border-stone-900'
                    : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Product list for selected category */}
          {selectedCat ? (
            <div className="border border-stone-200 rounded-xl overflow-hidden">
              <div className="bg-stone-50 px-3 py-2 flex items-center justify-between border-b border-stone-100">
                <span className="text-xs font-semibold text-stone-700">{selectedCat.name}</span>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-stone-400" />
                  <input
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                    placeholder="Filter…"
                    className="pl-6 pr-3 py-1 text-xs border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-stone-400 w-32"
                  />
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {filteredCatProducts.length === 0 && (
                  <div className="text-center py-6 text-xs text-stone-400">No products found</div>
                )}
                {filteredCatProducts.map(p => {
                  const inCart = items.find(i => i.product_id === p.id)
                  const hasBulk = p.bulk_price && p.bulk_quantity
                  return (
                    <button
                      key={p.id}
                      onClick={() => addItemFull(p)}
                      className="w-full text-left px-3 py-2.5 hover:bg-blue-50 border-b border-stone-50 last:border-0 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium text-stone-900 text-sm truncate">{p.name}</span>
                          {inCart && (
                            <span className="shrink-0 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
                              ×{inCart.qty}
                            </span>
                          )}
                        </div>
                        {p.sku && <span className="text-stone-400 text-xs">{p.sku}</span>}
                        {hasBulk && (
                          <span className="ml-1 text-xs text-green-600">
                            · Bulk {p.bulk_quantity}+: {formatPrice(p.bulk_price)}
                          </span>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="text-stone-700 text-sm font-semibold">{formatPrice(p.unit_price)}</span>
                        <div className="text-xs text-stone-400">{t.tapToAdd || 'tap to add'}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            !catLoading && catalog.length > 0 && (
              <p className="text-xs text-stone-400 py-4 text-center">{t.selectCategoryHint || 'Select a category above to browse products'}</p>
            )
          )}
        </div>

        {/* ── RIGHT: Cart ── */}
        <div className="w-80 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-stone-700 flex items-center gap-1">
              <ShoppingCart className="w-3.5 h-3.5" />
              {t.cart || 'Cart'}
              {items.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-stone-900 text-white rounded-full text-xs">{items.length}</span>
              )}
            </span>
          </div>

          {items.length === 0 ? (
            <div className="bg-stone-50 border border-dashed border-stone-200 rounded-xl p-6 text-center">
              <ShoppingCart className="w-7 h-7 text-stone-200 mx-auto mb-2" />
              <p className="text-stone-400 text-xs">{t.cartEmpty || 'Cart is empty. Click a product to add.'}</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-stone-100 overflow-hidden mb-3">
              {items.map((item, idx) => (
                <div key={idx} className="px-3 py-2.5 border-b border-stone-50 last:border-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-stone-900 text-xs leading-tight truncate">{item.name}</p>
                      {item.sku && <p className="text-xs text-stone-400">{item.sku}</p>}
                      {item.is_bulk && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-green-50 text-green-700 rounded text-xs font-medium mt-0.5">
                          <Tag className="w-2.5 h-2.5" />{t.bulkPrice || 'Bulk Price'}
                        </span>
                      )}
                    </div>
                    <button onClick={() => removeItem(idx)} className="text-stone-300 hover:text-red-500 shrink-0 mt-0.5">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex items-center border border-stone-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => updateQtyFull(idx, item.qty - 1)}
                        disabled={item.qty <= 1}
                        className="px-2 py-0.5 text-stone-500 hover:bg-stone-100 disabled:opacity-30 text-sm font-bold"
                      >-</button>
                      <input
                        type="number" min="1" value={item.qty}
                        onChange={e => updateQtyFull(idx, e.target.value)}
                        className="w-10 text-center border-0 py-0.5 text-sm focus:outline-none"
                      />
                      <button
                        onClick={() => updateQtyFull(idx, item.qty + 1)}
                        className="px-2 py-0.5 text-stone-500 hover:bg-stone-100 text-sm font-bold"
                      >+</button>
                    </div>
                    <span className="text-xs text-stone-400">×</span>
                    <input
                      type="number" min="0" step="0.01" value={item.unit_price}
                      onChange={e => updatePrice(idx, e.target.value)}
                      className="w-20 text-right border border-stone-200 rounded-lg px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-stone-400"
                    />
                    <span className="text-xs font-semibold text-stone-700 ml-auto">{formatPrice(item.qty * item.unit_price)}</span>
                  </div>
                  {item.bulk_quantity && !item.is_bulk && (
                    <p className="text-xs text-amber-600 mt-1">
                      Add {item.bulk_quantity - item.qty} more for bulk price ({formatPrice(item.bulk_price)})
                    </p>
                  )}
                </div>
              ))}
              {/* Totals */}
              <div className="bg-stone-50 border-t border-stone-100 px-3 py-2 space-y-1">
                <div className="flex justify-between text-xs text-stone-500">
                  <span>Subtotal</span><span className="font-medium text-stone-700">{formatPrice(subtotal)}</span>
                </div>
                {discountAmt > 0 && (
                  <div className="flex justify-between text-xs text-green-600">
                    <span>Discount</span><span className="font-medium">−{formatPrice(discountAmt)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-stone-900 pt-1 border-t border-stone-200">
                  <span>Total</span><span>{formatPrice(total)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Discount */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-stone-600 mb-1">{t.discount || 'Discount'}</label>
            <div className="flex gap-1">
              <select value={discountType} onChange={e => setDiscountType(e.target.value)}
                className="border border-stone-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900">
                <option value="amount">$</option>
                <option value="percent">%</option>
              </select>
              <input type="number" min="0" step="0.01" value={discountValue} onChange={e => setDiscountValue(e.target.value)}
                placeholder={discountType === 'percent' ? '0' : '0.00'}
                className="flex-1 border border-stone-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900" />
            </div>
          </div>

          {/* Payment method */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-stone-600 mb-1">{t.paymentMethod || 'Payment Method'}</label>
            <select value={paymentMethod} onChange={e => { setPaymentMethod(e.target.value); setShowAchForm(false); setAchError('') }}
              className="w-full border border-stone-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900">
              <option value="net15">Net 15 (ACH)</option>
              <option value="net30">Net 30 (ACH)</option>
              <option value="check">Check</option>
              <option value="credit_card">Credit Card</option>
              <option value="cash">Cash</option>
            </select>
          </div>

          {/* ACH section — shown when Net 15 or Net 30 is selected */}
          {isNetTerms && (
            <div className="mb-3 border border-blue-100 rounded-xl overflow-hidden">
              <div className="bg-blue-50 px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Banknote className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-xs font-semibold text-blue-800">{t.achTitle || 'ACH Bank Account'}</span>
                  {achLoading && <RefreshCw className="w-3 h-3 text-blue-400 animate-spin" />}
                  {achOnFile?.has_ach && !showAchForm && (
                    <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">{t.achOnFile || 'On File'}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => { setShowAchForm(v => !v); setAchError('') }}
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  {showAchForm ? (t.achHide || 'Hide') : (achOnFile?.has_ach ? (t.achUpdate || 'Update') : (t.achAdd || 'Add'))}
                </button>
              </div>

              {/* ACH on file summary */}
              {achOnFile?.has_ach && !showAchForm && (
                <div className="px-3 py-2 text-xs text-stone-600 space-y-0.5">
                  {achOnFile.ach_bank_name && <p><span className="text-stone-400">{t.achBank || 'Bank'}:</span> {achOnFile.ach_bank_name}</p>}
                  {achOnFile.ach_account_name && <p><span className="text-stone-400">{t.achAccountName || 'Account Name'}:</span> {achOnFile.ach_account_name}</p>}
                  <p><span className="text-stone-400">{t.achRouting || 'Routing'}:</span> {achOnFile.ach_routing_number}</p>
                  <p><span className="text-stone-400">{t.achAccount || 'Account'}:</span> {achOnFile.ach_account_number_masked}</p>
                  {achOnFile.ach_account_type && <p><span className="text-stone-400">{t.achType || 'Type'}:</span> {achOnFile.ach_account_type}</p>}
                </div>
              )}

              {/* ACH entry form */}
              {(!achOnFile?.has_ach || showAchForm) && (
                <div className="px-3 py-3 space-y-2">
                  {!achOnFile?.has_ach && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
                      {t.achRequiredNote || 'Net 15 / Net 30 requires ACH bank info to collect payment after delivery.'}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                      <label className="block text-xs text-stone-500 mb-0.5">{t.achBank || 'Bank Name'}</label>
                      <input value={ach.bank_name} onChange={e => setAch(a => ({ ...a, bank_name: e.target.value }))}
                        placeholder="e.g. Chase, Bank of America"
                        className="w-full border border-stone-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-stone-500 mb-0.5">{t.achAccountName || 'Name on Account'} *</label>
                      <input value={ach.account_name} onChange={e => setAch(a => ({ ...a, account_name: e.target.value }))}
                        placeholder="Full name on bank account"
                        className="w-full border border-stone-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
                    </div>
                    <div>
                      <label className="block text-xs text-stone-500 mb-0.5">{t.achRouting || 'Routing #'} *</label>
                      <input value={ach.routing_number} onChange={e => setAch(a => ({ ...a, routing_number: e.target.value.replace(/\D/g, '').slice(0, 9) }))}
                        placeholder="9 digits"
                        maxLength={9}
                        className="w-full border border-stone-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 font-mono" />
                    </div>
                    <div>
                      <label className="block text-xs text-stone-500 mb-0.5">{t.achAccount || 'Account #'} *</label>
                      <input value={ach.account_number} onChange={e => setAch(a => ({ ...a, account_number: e.target.value.replace(/\D/g, '').slice(0, 17) }))}
                        placeholder="Account number"
                        className="w-full border border-stone-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 font-mono" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-stone-500 mb-0.5">{t.achType || 'Account Type'}</label>
                      <select value={ach.account_type} onChange={e => setAch(a => ({ ...a, account_type: e.target.value }))}
                        className="w-full border border-stone-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400">
                        <option value="checking">{t.achChecking || 'Checking'}</option>
                        <option value="savings">{t.achSavings || 'Savings'}</option>
                      </select>
                    </div>
                  </div>
                  {achError && <p className="text-xs text-red-600">{achError}</p>}
                  <p className="text-xs text-stone-400 italic">{t.achConsent || 'By providing ACH info, the customer authorizes RS LLD to debit this account for the order total after delivery.'}</p>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-stone-600 mb-1">{t.notes || 'Notes'}</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full border border-stone-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 resize-none" />
          </div>

          {errorMsg && <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-800 text-xs">{errorMsg}</div>}

          <button
            onClick={handleSubmit}
            disabled={submitting || items.length === 0 || !customer}
            className="w-full py-3 bg-stone-900 text-white rounded-xl text-sm font-bold hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            {submitting ? (t.submitting || 'Submitting…') : (t.submitOrder || 'Place Order')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Call Script Sub-tab
// ─────────────────────────────────────────────────────────────────────────────
function ScriptPanel({ t, canEdit }) {
  const [content, setContent] = useState('')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState('')
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)

  useEffect(() => {
    staffFetch('/api/sales/script').then(r => r.json()).then(d => setContent(d.content || '')).catch(() => {})
  }, [])

  const handleSave = async () => {
    setSaving(true)
    const r = await staffFetch('/api/sales/script', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: draft }) })
    if (r.ok) { setContent(draft); setEditing(false); setSaved(true); setTimeout(() => setSaved(false), 3000) }
    setSaving(false)
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-stone-900">{t.scriptTitle || 'Call Script'}</h3>
        {canEdit && !editing && (
          <button onClick={() => { setDraft(content); setEditing(true) }} className="flex items-center gap-1.5 text-sm text-stone-600 border border-stone-200 rounded-lg px-3 py-1.5 hover:bg-stone-50">
            <Edit3 className="w-3.5 h-3.5" />{t.scriptEditBtn || 'Edit'}
          </button>
        )}
        {!canEdit && <span className="text-xs text-stone-400">{t.scriptEditNote || '(Admin/Manager only)'}</span>}
      </div>
      {saved && <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{t.scriptUpdated || 'Script updated.'}</div>}
      {editing ? (
        <>
          <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={20}
            className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-stone-900 resize-none" />
          <div className="flex gap-2 mt-3">
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-stone-900 text-white rounded-lg text-sm hover:bg-stone-700 disabled:opacity-50">
              <Save className="w-4 h-4 inline mr-1" />{saving ? 'Saving…' : (t.scriptSaveBtn || 'Save')}
            </button>
            <button onClick={() => setEditing(false)} className="px-4 py-2 border border-stone-200 rounded-lg text-sm text-stone-600 hover:bg-stone-50">
              {t.scriptCancelBtn || 'Cancel'}
            </button>
          </div>
        </>
      ) : (
        <pre className="bg-stone-50 border border-stone-100 rounded-xl p-5 text-sm text-stone-700 whitespace-pre-wrap font-sans leading-relaxed">
          {content || 'No script set.'}
        </pre>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// My Sales Sub-tab
// ─────────────────────────────────────────────────────────────────────────────
function MySalesPanel({ t, showLeaderboard }) {
  const [period, setPeriod]       = useState(30)
  const [stats, setStats]         = useState(null)
  const [orders, setOrders]       = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      staffFetch(`/api/sales/my-sales?days=${period}`).then(r => r.json()),
      showLeaderboard ? staffFetch(`/api/sales/leaderboard?days=${period}`).then(r => r.json()) : Promise.resolve({ leaderboard: [] }),
    ]).then(([salesData, lbData]) => {
      setStats(salesData.stats || null)
      setOrders(salesData.orders || [])
      setLeaderboard(lbData.leaderboard || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [period, showLeaderboard])

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <h3 className="font-semibold text-stone-900">{t.salesTitle || 'My Sales'}</h3>
        <select value={period} onChange={e => setPeriod(Number(e.target.value))}
          className="border border-stone-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900">
          <option value={7}>{t.last7 || 'Last 7 Days'}</option>
          <option value={30}>{t.last30 || 'Last 30 Days'}</option>
          <option value={90}>{t.last90 || 'Last 90 Days'}</option>
        </select>
      </div>
      {loading ? <p className="text-stone-400 text-sm">Loading…</p> : (
        <>
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {[
                [t.periodOrders || 'Orders This Period', stats.period_orders],
                [t.periodRevenue || 'Revenue This Period', formatPrice(stats.period_revenue)],
                [t.allTimeOrders || 'All-Time Orders', stats.total_orders],
                [t.allTimeRevenue || 'All-Time Revenue', formatPrice(stats.total_revenue)],
              ].map(([label, val]) => (
                <div key={label} className="bg-white border border-stone-100 rounded-xl p-4">
                  <p className="text-xs text-stone-400 mb-1">{label}</p>
                  <p className="text-xl font-bold text-stone-900">{val}</p>
                </div>
              ))}
            </div>
          )}
          {orders.length === 0 ? <p className="text-stone-400 text-sm">{t.noSales || 'No sales yet.'}</p> : (
            <div className="bg-white rounded-xl border border-stone-100 overflow-hidden mb-6">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 border-b border-stone-100">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-stone-500 font-medium">{t.orderNumber || 'Order #'}</th>
                    <th className="text-left px-4 py-2.5 text-stone-500 font-medium hidden sm:table-cell">{t.customerName || 'Customer'}</th>
                    <th className="text-left px-4 py-2.5 text-stone-500 font-medium">{t.orderDate || 'Date'}</th>
                    <th className="text-right px-4 py-2.5 text-stone-500 font-medium">{t.orderTotal || 'Total'}</th>
                    <th className="text-left px-4 py-2.5 text-stone-500 font-medium">{t.orderStatus || 'Status'}</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id} className="border-b border-stone-50 hover:bg-stone-50">
                      <td className="px-4 py-2.5 font-mono text-xs text-stone-600">{o.order_number}</td>
                      <td className="px-4 py-2.5 text-stone-700 hidden sm:table-cell">{o.customer_name || '—'}</td>
                      <td className="px-4 py-2.5 text-stone-500 text-xs">{formatDate(o.created_at)}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-stone-900">{formatPrice(o.total_amount)}</td>
                      <td className="px-4 py-2.5"><span className="px-2 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-600 capitalize">{o.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {showLeaderboard && leaderboard.length > 0 && (
            <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-stone-100 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <h3 className="font-semibold text-stone-900 text-sm">{t.leaderboard || 'Team Leaderboard'}</h3>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-stone-50 border-b border-stone-100">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-stone-500 font-medium w-12">{t.rank || 'Rank'}</th>
                    <th className="text-left px-4 py-2.5 text-stone-500 font-medium">{t.repName || 'Rep'}</th>
                    <th className="text-right px-4 py-2.5 text-stone-500 font-medium">{t.orders || 'Orders'}</th>
                    <th className="text-right px-4 py-2.5 text-stone-500 font-medium">{t.revenue || 'Revenue'}</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((rep, idx) => (
                    <tr key={rep.rep_id} className="border-b border-stone-50">
                      <td className="px-4 py-2.5 font-bold text-stone-400">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}</td>
                      <td className="px-4 py-2.5 font-medium text-stone-900">{rep.rep_name}</td>
                      <td className="px-4 py-2.5 text-right text-stone-600">{rep.order_count}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-stone-900">{formatPrice(rep.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main SalesRepTab export
// ─────────────────────────────────────────────────────────────────────────────
export function SalesRepTab({ t, staff }) {
  const [subTab, setSubTab]                     = useState('callList')
  const [selectedCustomer, setSelectedCustomer] = useState(null)

  const isAdmin         = staff?.role === 'admin'
  const isManager       = staff?.role === 'manager'
  const canEditScript   = isAdmin || isManager
  const showLeaderboard = isAdmin || isManager

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer)
    setSubTab('placeOrder')
  }

  const subTabs = [
    { id: 'callList',   label: t.callList   || 'Call List',   icon: Phone },
    { id: 'placeOrder', label: t.placeOrder || 'Place Order', icon: ShoppingCart },
    { id: 'script',     label: t.myScript   || 'Call Script', icon: FileText },
    { id: 'mySales',    label: t.mySales    || 'My Sales',    icon: BarChart2 },
  ]

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-stone-900">{t.title || 'Sales Rep Portal'}</h2>
        <p className="text-sm text-stone-500 mt-0.5">{t.subtitle || 'Call customers and place orders on their behalf'}</p>
      </div>
      <div className="flex gap-1 mb-6 bg-stone-100 p-1 rounded-xl w-fit">
        {subTabs.map(st => (
          <button
            key={st.id}
            onClick={() => setSubTab(st.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              subTab === st.id ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            <st.icon className="w-3.5 h-3.5" />
            {st.label}
          </button>
        ))}
      </div>
      {subTab === 'callList'   && <CallingListPanel t={t} onSelectCustomer={handleSelectCustomer} />}
      {subTab === 'placeOrder' && <PlaceOrderPanel  key={selectedCustomer?.id || 'none'} t={t} selectedCustomer={selectedCustomer} onOrderPlaced={() => {}} />}
      {subTab === 'script'     && <ScriptPanel      t={t} canEdit={canEditScript} />}
      {subTab === 'mySales'    && <MySalesPanel     t={t} showLeaderboard={showLeaderboard} />}
    </div>
  )
}

export default SalesRepTab
