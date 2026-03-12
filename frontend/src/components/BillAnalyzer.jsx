import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Upload, FileText, TrendingDown, CheckCircle, AlertCircle,
  Clock, RefreshCw, Trash2, ChevronDown, ChevronUp, Eye,
  DollarSign, Package, Search, X, Download, Edit3, Save
} from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || ''

const fmt = (n) => n != null ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n) : '—'
const fmtPct = (n) => n != null ? `${n > 0 ? '-' : '+'}${Math.abs(n).toFixed(1)}%` : '—'

const confidenceBadge = {
  high:   { label: 'High Match',   cls: 'bg-green-50 text-green-700 border-green-200' },
  medium: { label: 'Likely Match', cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  low:    { label: 'Possible',     cls: 'bg-stone-100 text-stone-600 border-stone-200' },
  none:   { label: 'No Match',     cls: 'bg-stone-50 text-stone-400 border-stone-100' },
}

// ─── Upload Form ──────────────────────────────────────────────────────────────
const UploadForm = ({ onUploaded, t }) => {
  const [form, setForm] = useState({
    restaurant_name: '', restaurant_email: '', restaurant_phone: '',
    contact_name: '', supplier_name: '', notes: ''
  })
  const [file, setFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef()

  const handleFile = (f) => {
    if (!f) return
    const ext = f.name.split('.').pop().toLowerCase()
    if (!['pdf', 'png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
      setError('Please upload a PDF, PNG, JPG, or WEBP file.')
      return
    }
    setFile(f)
    setError('')
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files[0])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) { setError('Please select a file to upload.'); return }
    if (!form.restaurant_name.trim()) { setError('Restaurant name is required.'); return }

    setUploading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))

      const res = await fetch(`${API_BASE}/api/bills`, {
        method: 'POST', credentials: 'include', body: fd
      })
      const data = await res.json()
      if (data.success) {
        onUploaded(data.bill)
      } else {
        setError(data.error || 'Upload failed')
      }
    } catch (err) {
      setError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-6 max-w-2xl mx-auto">
      <h3 className="text-lg font-semibold text-stone-900 mb-1">{t.uploadTitle}</h3>
      <p className="text-sm text-stone-500 mb-5">{t.uploadSubtitle}</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* File Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            dragOver ? 'border-stone-400 bg-stone-50' : 'border-stone-200 hover:border-stone-400 hover:bg-stone-50'
          }`}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <input ref={fileRef} type="file" className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.webp"
            onChange={(e) => handleFile(e.target.files[0])} />
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <FileText className="w-8 h-8 text-stone-700" />
              <div className="text-left">
                <p className="font-medium text-stone-900">{file.name}</p>
                <p className="text-xs text-stone-500">{(file.size / 1024).toFixed(0)} KB</p>
              </div>
              <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null) }}
                className="ml-2 text-stone-400 hover:text-stone-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <Upload className="w-10 h-10 text-stone-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-stone-700">{t.dropZone}</p>
              <p className="text-xs text-stone-400 mt-1">{t.dropZoneSub}</p>
            </>
          )}
        </div>

        {/* Restaurant Info */}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-stone-700 mb-1">{t.restaurantName} <span className="text-red-500">*</span></label>
            <input value={form.restaurant_name} onChange={e => setForm(p => ({...p, restaurant_name: e.target.value}))}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
              placeholder="e.g. Mario's Italian Kitchen" />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">{t.contactName}</label>
            <input value={form.contact_name} onChange={e => setForm(p => ({...p, contact_name: e.target.value}))}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
              placeholder="Contact person" />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">{t.phone}</label>
            <input value={form.restaurant_phone} onChange={e => setForm(p => ({...p, restaurant_phone: e.target.value}))}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
              placeholder="555-0100" />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">{t.email}</label>
            <input type="email" value={form.restaurant_email} onChange={e => setForm(p => ({...p, restaurant_email: e.target.value}))}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
              placeholder="owner@restaurant.com" />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">{t.supplierName}</label>
            <input value={form.supplier_name} onChange={e => setForm(p => ({...p, supplier_name: e.target.value}))}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
              placeholder="e.g. Sysco, US Foods" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-stone-700 mb-1">{t.internalNotes}</label>
            <textarea value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))}
              rows={2}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 resize-none"
              placeholder="Internal notes for this analysis..." />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={uploading}
            className="flex-1 bg-stone-900 hover:bg-stone-700 text-white text-sm font-medium px-4 py-2.5 rounded-full flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
            {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? t.uploading : t.uploadBtn}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Processing Status Card ───────────────────────────────────────────────────
const ProcessingCard = ({ bill, onDone, t }) => {
  const [status, setStatus] = useState(bill.extraction_status)
  const [data, setData] = useState(bill)
  const intervalRef = useRef()

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/bills/${bill.id}/status`, { credentials: 'include' })
      const d = await res.json()
      setStatus(d.extraction_status)
      setData(d)
      if (d.extraction_status === 'done' || d.extraction_status === 'error') {
        clearInterval(intervalRef.current)
        if (d.extraction_status === 'done') onDone(bill.id)
      }
    } catch {}
  }, [bill.id, onDone])

  useEffect(() => {
    if (status === 'pending' || status === 'processing') {
      poll()
      intervalRef.current = setInterval(poll, 2500)
    }
    return () => clearInterval(intervalRef.current)
  }, [status, poll])

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-6 text-center">
      {status === 'error' ? (
        <>
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="font-semibold text-stone-900 mb-1">{t.extractionFailed}</p>
          <p className="text-sm text-stone-500">{data.extraction_error || t.unknownError}</p>
        </>
      ) : (
        <>
          <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-3">
            <RefreshCw className="w-6 h-6 text-stone-600 animate-spin" />
          </div>
          <p className="font-semibold text-stone-900 mb-1">
            {status === 'pending' ? t.waitingToProcess : t.extractingItems}
          </p>
          <p className="text-sm text-stone-500">{t.aiReading}</p>
          <p className="text-xs text-stone-400 mt-2">{t.takesAMoment}</p>
        </>
      )}
    </div>
  )
}

// ─── Bill Detail View ─────────────────────────────────────────────────────────
const BillDetail = ({ billId, onBack, onDelete, t }) => {
  const [bill, setBill] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all') // all | savings | no_match
  const [editingNotes, setEditingNotes] = useState(false)
  const [notes, setNotes] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/bills/${billId}`, { credentials: 'include' })
      const d = await res.json()
      setBill(d)
      setNotes(d.notes || '')
    } catch {}
    setLoading(false)
  }, [billId])

  useEffect(() => { load() }, [load])

  const handleSaveNotes = async () => {
    await fetch(`${API_BASE}/api/bills/${billId}/notes`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes })
    })
    setEditingNotes(false)
    setBill(p => ({ ...p, notes }))
  }

  const handleReprocess = async () => {
    await fetch(`${API_BASE}/api/bills/${billId}/reprocess`, { method: 'POST', credentials: 'include' })
    setBill(p => ({ ...p, extraction_status: 'processing' }))
    load()
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <RefreshCw className="w-6 h-6 animate-spin text-stone-400" />
    </div>
  )
  if (!bill) return null

  const items = bill.line_items || []
  const filtered = items.filter(item => {
    const matchSearch = !search || item.description?.toLowerCase().includes(search.toLowerCase()) || item.sku?.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' ||
      (filter === 'savings' && item.savings > 0) ||
      (filter === 'no_match' && item.match_confidence === 'none')
    return matchSearch && matchFilter
  })

  const totalSavings = items.reduce((s, i) => s + (i.savings > 0 ? i.savings * (i.quantity || 1) : 0), 0)
  const matchedCount = items.filter(i => i.match_confidence !== 'none').length

  return (
    <div className="space-y-4">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-stone-500 hover:text-stone-900 text-sm flex items-center gap-1">
          ← {t.backToList}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <p className="text-xs text-stone-500 mb-1">{t.restaurant}</p>
          <p className="font-semibold text-stone-900 text-sm truncate">{bill.restaurant_name}</p>
          {bill.supplier_name && <p className="text-xs text-stone-400 mt-0.5">{t.supplier}: {bill.supplier_name}</p>}
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <p className="text-xs text-stone-500 mb-1">{t.billTotal}</p>
          <p className="font-bold text-stone-900 text-lg">{fmt(bill.bill_total)}</p>
          {bill.bill_date && <p className="text-xs text-stone-400 mt-0.5">{bill.bill_date}</p>}
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <p className="text-xs text-stone-500 mb-1">{t.itemsWeCarry}</p>
          <p className="font-bold text-stone-900 text-lg">{matchedCount} <span className="text-sm font-normal text-stone-400">/ {items.length}</span></p>
          <p className="text-xs text-stone-400 mt-0.5">{t.productsMatched}</p>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-4">
          <p className="text-xs text-green-700 mb-1">{t.potentialSavings}</p>
          <p className="font-bold text-green-700 text-lg">{fmt(totalSavings)}</p>
          <p className="text-xs text-green-600 mt-0.5">{t.perOrder}</p>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-xl border border-stone-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-stone-600 uppercase tracking-wide">{t.staffNotes}</span>
          <button onClick={() => setEditingNotes(!editingNotes)}
            className="text-xs text-stone-500 hover:text-stone-900 flex items-center gap-1">
            <Edit3 className="w-3 h-3" /> {editingNotes ? t.cancel : t.edit}
          </button>
        </div>
        {editingNotes ? (
          <div className="space-y-2">
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 resize-none" />
            <button onClick={handleSaveNotes}
              className="bg-stone-900 hover:bg-stone-700 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1">
              <Save className="w-3 h-3" /> {t.save}
            </button>
          </div>
        ) : (
          <p className="text-sm text-stone-600">{bill.notes || <span className="text-stone-300 italic">{t.noNotes}</span>}</p>
        )}
      </div>

      {/* Line Items Table */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-stone-100 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder={t.searchItems}
              className="w-full pl-8 pr-3 py-1.5 border border-stone-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-stone-400" />
          </div>
          <div className="flex gap-1">
            {[['all', t.allItems], ['savings', t.withSavings], ['no_match', t.noMatch]].map(([v, label]) => (
              <button key={v} onClick={() => setFilter(v)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  filter === v ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}>
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 ml-auto">
            <button onClick={handleReprocess}
              className="text-xs text-stone-500 hover:text-stone-900 flex items-center gap-1 px-3 py-1.5 border border-stone-200 rounded-full">
              <RefreshCw className="w-3 h-3" /> {t.reprocess}
            </button>
            <button onClick={() => { if (window.confirm(t.deleteConfirm)) onDelete(bill.id) }}
              className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 px-3 py-1.5 border border-red-200 rounded-full">
              <Trash2 className="w-3 h-3" /> {t.delete}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-100">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-stone-600 uppercase tracking-wide">{t.item}</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-stone-600 uppercase tracking-wide">{t.qty}</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-stone-600 uppercase tracking-wide">{t.theirPrice}</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-stone-600 uppercase tracking-wide">{t.lineTotal}</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-stone-600 uppercase tracking-wide">{t.ourProduct}</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-stone-600 uppercase tracking-wide">{t.ourPrice}</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-green-700 uppercase tracking-wide">{t.savings}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-stone-400 text-sm">{t.noItems}</td></tr>
              ) : filtered.map((item, i) => {
                const conf = confidenceBadge[item.match_confidence] || confidenceBadge.none
                const hasSavings = item.savings != null && item.savings > 0
                return (
                  <tr key={i} className={`hover:bg-stone-50 transition-colors ${hasSavings ? 'bg-green-50/30' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-stone-900">{item.description}</p>
                      {item.sku && <p className="text-xs text-stone-400">SKU: {item.sku}</p>}
                    </td>
                    <td className="px-4 py-3 text-right text-stone-600">
                      {item.quantity} <span className="text-stone-400 text-xs">{item.unit}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-stone-900">{fmt(item.unit_price)}</td>
                    <td className="px-4 py-3 text-right text-stone-600">{fmt(item.line_total)}</td>
                    <td className="px-4 py-3">
                      {item.match_confidence !== 'none' ? (
                        <div>
                          <p className="text-stone-900 font-medium text-xs">{item.our_name}</p>
                          {item.our_sku && <p className="text-stone-400 text-xs">SKU: {item.our_sku}</p>}
                          <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full border font-medium ${conf.cls}`}>
                            {conf.label}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-stone-300 italic">{t.notInCatalog}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {item.our_price != null ? (
                        <span className={`font-medium ${item.savings > 0 ? 'text-green-700' : 'text-stone-900'}`}>
                          {fmt(item.our_price)}
                        </span>
                      ) : <span className="text-stone-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {hasSavings ? (
                        <div>
                          <span className="font-bold text-green-700">{fmt(item.savings)}</span>
                          <p className="text-xs text-green-600">{fmtPct(item.savings_pct)}</p>
                        </div>
                      ) : item.savings != null && item.savings < 0 ? (
                        <span className="text-xs text-stone-400">{t.theyreChaper}</span>
                      ) : (
                        <span className="text-stone-300">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Footer summary */}
        {totalSavings > 0 && (
          <div className="bg-green-50 border-t border-green-100 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-700">
              <TrendingDown className="w-4 h-4" />
              <span className="text-sm font-medium">{t.totalPotentialSavings}</span>
            </div>
            <span className="font-bold text-green-700 text-lg">{fmt(totalSavings)}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Bill List ────────────────────────────────────────────────────────────────
const BillList = ({ bills, onSelect, onDelete, t }) => {
  const [search, setSearch] = useState('')
  const filtered = bills.filter(b =>
    !search || b.restaurant_name?.toLowerCase().includes(search.toLowerCase()) ||
    b.supplier_name?.toLowerCase().includes(search.toLowerCase())
  )

  const statusIcon = (s) => {
    if (s === 'done') return <CheckCircle className="w-4 h-4 text-green-500" />
    if (s === 'error') return <AlertCircle className="w-4 h-4 text-red-400" />
    return <RefreshCw className="w-4 h-4 text-stone-400 animate-spin" />
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder={t.searchBills}
          className="w-full pl-9 pr-4 py-2 border border-stone-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-stone-400" />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-stone-400">
          <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">{search ? t.noResults : t.noBillsYet}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(bill => (
            <div key={bill.id}
              className="bg-white rounded-xl border border-stone-200 p-4 hover:border-stone-300 transition-colors cursor-pointer"
              onClick={() => onSelect(bill.id)}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-stone-100 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-stone-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-stone-900">{bill.restaurant_name}</span>
                      {statusIcon(bill.extraction_status)}
                    </div>
                    <p className="text-xs text-stone-500">
                      {bill.supplier_name || t.unknownSupplier}
                      {bill.bill_date ? ` · ${bill.bill_date}` : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  {bill.bill_total && <p className="font-bold text-stone-900">{fmt(bill.bill_total)}</p>}
                  {bill.extraction_status === 'done' && (
                    <p className="text-xs text-green-600 font-medium">
                      {fmt(bill.potential_savings)} {t.savingsAvail}
                    </p>
                  )}
                  <p className="text-xs text-stone-400 mt-0.5">
                    {bill.total_items} {t.items} · {t.uploadedBy} {bill.uploaded_by}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main BillAnalyzerTab ─────────────────────────────────────────────────────
export const BillAnalyzerTab = ({ t }) => {
  const [view, setView] = useState('list') // 'list' | 'upload' | 'processing' | 'detail'
  const [bills, setBills] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [processingBill, setProcessingBill] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadBills = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/bills`, { credentials: 'include' })
      const data = await res.json()
      setBills(Array.isArray(data) ? data : [])
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { loadBills() }, [loadBills])

  const handleUploaded = (bill) => {
    setProcessingBill(bill)
    setView('processing')
    loadBills()
  }

  const handleProcessingDone = (billId) => {
    setSelectedId(billId)
    setView('detail')
    loadBills()
  }

  const handleDelete = async (billId) => {
    await fetch(`${API_BASE}/api/bills/${billId}`, { method: 'DELETE', credentials: 'include' })
    setView('list')
    setSelectedId(null)
    loadBills()
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-stone-900">{t.title}</h2>
          <p className="text-sm text-stone-500 mt-0.5">{t.subtitle}</p>
        </div>
        {view !== 'upload' && (
          <button onClick={() => setView('upload')}
            className="bg-stone-900 hover:bg-stone-700 text-white text-sm px-4 py-2 rounded-full flex items-center gap-2 transition-colors">
            <Upload className="w-4 h-4" />
            {t.uploadBill}
          </button>
        )}
        {view === 'upload' && (
          <button onClick={() => setView('list')}
            className="text-sm text-stone-500 hover:text-stone-900 flex items-center gap-1 px-3 py-2 border border-stone-200 rounded-full">
            <X className="w-4 h-4" /> {t.cancel}
          </button>
        )}
      </div>

      {/* Content */}
      {view === 'upload' && (
        <UploadForm onUploaded={handleUploaded} t={t} />
      )}

      {view === 'processing' && processingBill && (
        <ProcessingCard bill={processingBill} onDone={handleProcessingDone} t={t} />
      )}

      {view === 'detail' && selectedId && (
        <BillDetail
          billId={selectedId}
          onBack={() => { setView('list'); loadBills() }}
          onDelete={handleDelete}
          t={t}
        />
      )}

      {view === 'list' && (
        loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-5 h-5 animate-spin text-stone-400" />
          </div>
        ) : (
          <BillList
            bills={bills}
            onSelect={(id) => { setSelectedId(id); setView('detail') }}
            onDelete={handleDelete}
            t={t}
          />
        )
      )}
    </div>
  )
}

export default BillAnalyzerTab
