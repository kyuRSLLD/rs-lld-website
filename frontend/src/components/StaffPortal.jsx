import { useState, useEffect, useCallback } from 'react'
import {
  Package, Truck, CheckCircle, Clock, XCircle, Users, BarChart2,
  RefreshCw, LogOut, Search, ChevronDown, ChevronUp, Edit3,
  Home, ClipboardList, ShoppingBag, AlertCircle, Tag, Eye
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const STATUS_FLOW = ['pending', 'confirmed', 'packed', 'shipped', 'delivered']

const statusConfig = {
  pending:   { label: 'Pending',    color: 'text-yellow-700', bg: 'bg-yellow-50',  border: 'border-yellow-200', icon: Clock },
  confirmed: { label: 'Confirmed',  color: 'text-blue-700',   bg: 'bg-blue-50',    border: 'border-blue-200',   icon: CheckCircle },
  packed:    { label: 'Packed',     color: 'text-purple-700', bg: 'bg-purple-50',  border: 'border-purple-200', icon: Package },
  shipped:   { label: 'Shipped',    color: 'text-orange-700', bg: 'bg-orange-50',  border: 'border-orange-200', icon: Truck },
  delivered: { label: 'Delivered',  color: 'text-green-700',  bg: 'bg-green-50',   border: 'border-green-200',  icon: Home },
  cancelled: { label: 'Cancelled',  color: 'text-red-700',    bg: 'bg-red-50',     border: 'border-red-200',    icon: XCircle },
}

const paymentLabels = { net30: 'Net 30', net15: 'Net 15', cod: 'COD', credit_card: 'Credit Card' }

// ─── Login Screen ─────────────────────────────────────────────────────────────
const StaffLogin = ({ onLogin }) => {
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/staff/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.success) onLogin(data.staff)
      else setError(data.error || 'Invalid credentials')
    } catch { setError('Network error. Please try again.') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
            <span className="text-white font-bold text-xl">RS</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">RS LLD Staff Portal</h1>
          <p className="text-gray-500 text-sm mt-1">Internal Order Management System</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text" value={form.username}
              onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="admin"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password" value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
            Sign In
          </Button>
        </form>
        <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-500">
          <p className="font-medium mb-1">Demo Credentials:</p>
          <p>Admin: <code>admin</code> / <code>rslld2024</code></p>
          <p>Staff: <code>staff</code> / <code>staff2024</code></p>
        </div>
      </div>
    </div>
  )
}

// ─── Order Card ───────────────────────────────────────────────────────────────
const OrderCard = ({ order, onStatusUpdate, onNotesUpdate }) => {
  const [expanded, setExpanded] = useState(false)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notes, setNotes] = useState(order.staff_notes || '')
  const [assignedTo, setAssignedTo] = useState(order.assigned_to || '')
  const [updating, setUpdating] = useState(false)
  const cfg = statusConfig[order.status] || statusConfig.pending
  const StatusIcon = cfg.icon

  const formatPrice = (p) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(p)
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

  const nextStatus = STATUS_FLOW[STATUS_FLOW.indexOf(order.status) + 1]
  const nextCfg = nextStatus ? statusConfig[nextStatus] : null

  const handleAdvanceStatus = async () => {
    if (!nextStatus) return
    setUpdating(true)
    await onStatusUpdate(order.id, nextStatus)
    setUpdating(false)
  }

  const handleCancel = async () => {
    if (!window.confirm('Cancel this order?')) return
    setUpdating(true)
    await onStatusUpdate(order.id, 'cancelled')
    setUpdating(false)
  }

  const handleSaveNotes = async () => {
    await onNotesUpdate(order.id, notes, assignedTo)
    setEditingNotes(false)
  }

  return (
    <div className={`bg-white rounded-xl border-2 ${cfg.border} overflow-hidden transition-all`}>
      {/* Card Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cfg.bg}`}>
              <StatusIcon className={`w-5 h-5 ${cfg.color}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900">{order.order_number}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
              </div>
              <p className="text-sm text-gray-600">{order.customer_company || order.customer_name}</p>
              {order.customer_email && <p className="text-xs text-gray-400">{order.customer_email}</p>}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="font-bold text-gray-900 text-lg">{formatPrice(order.total_amount)}</p>
            <p className="text-xs text-gray-500">{order.item_count} items</p>
            <p className="text-xs text-gray-400">{formatDate(order.created_at)}</p>
          </div>
        </div>

        {/* Quick Info Row */}
        <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Truck className="w-3 h-3" />
            {order.delivery_city}, {order.delivery_state}
          </span>
          <span className="flex items-center gap-1">
            <Tag className="w-3 h-3" />
            {paymentLabels[order.payment_method] || order.payment_method}
          </span>
          {order.preferred_delivery_date && (
            <span className="flex items-center gap-1 text-blue-600">
              📅 {order.preferred_delivery_date}
            </span>
          )}
          {order.assigned_to && (
            <span className="flex items-center gap-1 text-purple-600">
              👤 {order.assigned_to}
            </span>
          )}
        </div>

        {/* Special Notes Banner */}
        {order.special_notes && (
          <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 text-xs text-amber-800">
            📝 {order.special_notes}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 mt-3">
          {nextStatus && order.status !== 'cancelled' && (
            <Button
              size="sm"
              onClick={handleAdvanceStatus}
              disabled={updating}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
            >
              {updating ? <RefreshCw className="w-3 h-3 animate-spin mr-1" /> : <nextCfg.icon className="w-3 h-3 mr-1" />}
              Mark as {nextCfg?.label}
            </Button>
          )}
          {order.status !== 'cancelled' && order.status !== 'delivered' && (
            <Button size="sm" variant="outline" onClick={handleCancel} disabled={updating}
              className="text-red-600 border-red-200 hover:bg-red-50 text-xs">
              <XCircle className="w-3 h-3 mr-1" /> Cancel
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setEditingNotes(!editingNotes)}
            className="text-xs">
            <Edit3 className="w-3 h-3 mr-1" /> Notes
          </Button>
          <Button size="sm" variant="outline" onClick={() => setExpanded(!expanded)}
            className="text-xs ml-auto">
            <Eye className="w-3 h-3 mr-1" />
            {expanded ? 'Hide' : 'Details'}
            {expanded ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
          </Button>
        </div>

        {/* Staff Notes Editor */}
        {editingNotes && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-2">
            <input
              type="text" value={assignedTo}
              onChange={e => setAssignedTo(e.target.value)}
              placeholder="Assign to (staff name)"
              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Internal notes..."
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveNotes} className="bg-green-600 hover:bg-green-700 text-white text-xs">Save</Button>
              <Button size="sm" variant="outline" onClick={() => setEditingNotes(false)} className="text-xs">Cancel</Button>
            </div>
          </div>
        )}
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-4">
          {/* Line Items */}
          <div>
            <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Order Items</h4>
            <div className="space-y-1.5">
              {order.items?.map(item => (
                <div key={item.id} className="flex justify-between items-center text-sm bg-white rounded-lg px-3 py-2 border border-gray-100">
                  <div>
                    <span className="font-medium text-gray-800">{item.product_name}</span>
                    <span className="text-gray-400 text-xs ml-2">SKU: {item.product_sku}</span>
                    {item.is_bulk_price && <span className="text-green-600 text-xs ml-2">● Bulk</span>}
                  </div>
                  <div className="text-right text-xs">
                    <span className="text-gray-600">×{item.quantity} @ {formatPrice(item.unit_price)}</span>
                    <span className="font-bold text-gray-900 ml-3">{formatPrice(item.line_total)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery + Totals */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Delivery Address</h4>
              <div className="bg-white rounded-lg p-3 border border-gray-100 text-sm text-gray-700 space-y-0.5">
                <p className="font-medium">{order.delivery_name}</p>
                {order.delivery_company && <p>{order.delivery_company}</p>}
                <p>{order.delivery_address}</p>
                <p>{order.delivery_city}, {order.delivery_state} {order.delivery_zip}</p>
                {order.delivery_phone && <p className="text-gray-500">{order.delivery_phone}</p>}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Order Summary</h4>
              <div className="bg-white rounded-lg p-3 border border-gray-100 text-sm space-y-1">
                <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
                {order.discount_amount > 0 && (
                  <div className="flex justify-between text-green-600"><span>Bulk Savings</span><span>-{formatPrice(order.discount_amount)}</span></div>
                )}
                <div className="flex justify-between text-gray-600"><span>Delivery</span><span>{order.delivery_fee === 0 ? 'FREE' : formatPrice(order.delivery_fee)}</span></div>
                <div className="flex justify-between font-bold text-gray-900 border-t pt-1"><span>Total</span><span>{formatPrice(order.total_amount)}</span></div>
                <p className="text-xs text-gray-500 pt-1">Payment: {paymentLabels[order.payment_method]}</p>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div>
            <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Timeline</h4>
            <div className="space-y-1 text-xs text-gray-500">
              <p>📥 Placed: {formatDate(order.created_at)}</p>
              {order.confirmed_at && <p>✅ Confirmed: {formatDate(order.confirmed_at)}</p>}
              {order.shipped_at && <p>🚚 Shipped: {formatDate(order.shipped_at)}</p>}
              {order.delivered_at && <p>🏠 Delivered: {formatDate(order.delivered_at)}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Staff Portal ─────────────────────────────────────────────────────────
const StaffPortal = () => {
  const [staff, setStaff] = useState(null)
  const [activeTab, setActiveTab] = useState('orders')
  const [orders, setOrders] = useState([])
  const [stats, setStats] = useState(null)
  const [customers, setCustomers] = useState([])
  const [inventory, setInventory] = useState([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const formatPrice = (p) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(p)

  // Check if already logged in
  useEffect(() => {
    fetch('/api/staff/me', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setStaff(d) })
      .catch(() => {})
  }, [])

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const url = statusFilter ? `/api/staff/orders?status=${statusFilter}` : '/api/staff/orders'
      const res = await fetch(url, { credentials: 'include' })
      const data = await res.json()
      setOrders(Array.isArray(data) ? data : [])
    } catch {}
    finally { setLoading(false) }
  }, [statusFilter])

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/staff/stats', { credentials: 'include' })
      const data = await res.json()
      setStats(data)
    } catch {}
  }, [])

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await fetch('/api/staff/customers', { credentials: 'include' })
      const data = await res.json()
      setCustomers(Array.isArray(data) ? data : [])
    } catch {}
  }, [])

  const fetchInventory = useCallback(async () => {
    try {
      const res = await fetch('/api/staff/inventory', { credentials: 'include' })
      const data = await res.json()
      setInventory(Array.isArray(data) ? data : [])
    } catch {}
  }, [])

  useEffect(() => {
    if (!staff) return
    fetchStats()
    if (activeTab === 'orders') fetchOrders()
    if (activeTab === 'customers') fetchCustomers()
    if (activeTab === 'inventory') fetchInventory()
  }, [staff, activeTab, fetchOrders, fetchStats, fetchCustomers, fetchInventory])

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await fetch(`/api/staff/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      })
      fetchOrders()
      fetchStats()
    } catch {}
  }

  const handleNotesUpdate = async (orderId, notes, assignedTo) => {
    try {
      await fetch(`/api/staff/orders/${orderId}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ staff_notes: notes, assigned_to: assignedTo }),
      })
      fetchOrders()
    } catch {}
  }

  const handleInventoryToggle = async (productId, inStock) => {
    try {
      await fetch(`/api/staff/inventory/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ in_stock: inStock }),
      })
      fetchInventory()
    } catch {}
  }

  const handleLogout = async () => {
    await fetch('/api/staff/logout', { method: 'POST', credentials: 'include' })
    setStaff(null)
  }

  if (!staff) return <StaffLogin onLogin={setStaff} />

  const filteredOrders = orders.filter(o => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return o.order_number.toLowerCase().includes(q) ||
      (o.customer_name || '').toLowerCase().includes(q) ||
      (o.customer_company || '').toLowerCase().includes(q) ||
      (o.delivery_city || '').toLowerCase().includes(q)
  })

  const tabs = [
    { id: 'orders', label: 'Orders', icon: ClipboardList },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'inventory', label: 'Inventory', icon: ShoppingBag },
    { id: 'stats', label: 'Dashboard', icon: BarChart2 },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Nav */}
      <div className="bg-slate-800 text-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-sm">RS</div>
          <div>
            <span className="font-semibold">RS LLD Staff Portal</span>
            <span className="text-slate-400 text-xs ml-2">Internal</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {stats?.needs_attention > 0 && (
            <div className="flex items-center gap-1 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              <AlertCircle className="w-3 h-3" /> {stats.needs_attention} need attention
            </div>
          )}
          <span className="text-slate-300 text-sm">👤 {staff.full_name || staff.username}</span>
          <Button size="sm" variant="ghost" onClick={handleLogout} className="text-slate-300 hover:text-white text-xs">
            <LogOut className="w-3 h-3 mr-1" /> Logout
          </Button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex gap-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* ── ORDERS TAB ── */}
        {activeTab === 'orders' && (
          <div>
            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-5">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text" value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search orders, customers, cities..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {['', 'pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'].map(s => {
                  const cfg = s ? statusConfig[s] : null
                  return (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        statusFilter === s
                          ? 'bg-blue-600 text-white border-blue-600'
                          : cfg ? `${cfg.bg} ${cfg.color} ${cfg.border}` : 'bg-gray-100 text-gray-600 border-gray-200'
                      }`}
                    >
                      {s ? statusConfig[s].label : 'All Orders'}
                      {s && stats && ` (${stats[s] || 0})`}
                    </button>
                  )
                })}
              </div>
              <Button size="sm" variant="outline" onClick={fetchOrders} className="text-xs">
                <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-12"><RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto" /></div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
                <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500">No orders found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onStatusUpdate={handleStatusUpdate}
                    onNotesUpdate={handleNotesUpdate}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── CUSTOMERS TAB ── */}
        {activeTab === 'customers' && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Customer Accounts</h2>
            {customers.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
                <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500">No customers registered yet</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {['Customer', 'Company', 'Email', 'Phone', 'Orders', 'Total Spent', 'Joined'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {customers.map(c => (
                      <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{c.username}</td>
                        <td className="px-4 py-3 text-gray-600">{c.company_name || '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{c.email}</td>
                        <td className="px-4 py-3 text-gray-600">{c.phone || '—'}</td>
                        <td className="px-4 py-3">
                          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">{c.order_count}</span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900">{formatPrice(c.total_spent)}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{new Date(c.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── INVENTORY TAB ── */}
        {activeTab === 'inventory' && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Inventory Management</h2>
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Product', 'SKU', 'Brand', 'Unit Price', 'Bulk Price', 'Bulk Min', 'Status', 'Toggle'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {inventory.map(p => (
                    <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${!p.in_stock ? 'opacity-60' : ''}`}>
                      <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{p.sku}</td>
                      <td className="px-4 py-3 text-gray-600">{p.brand}</td>
                      <td className="px-4 py-3 text-gray-900">{formatPrice(p.unit_price)}</td>
                      <td className="px-4 py-3 text-green-700">{p.bulk_price ? formatPrice(p.bulk_price) : '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{p.bulk_quantity ? `${p.bulk_quantity}+` : '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.in_stock ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                          {p.in_stock ? 'In Stock' : 'Out of Stock'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleInventoryToggle(p.id, !p.in_stock)}
                          className={`text-xs px-2 py-1 rounded border transition-all ${
                            p.in_stock
                              ? 'border-red-200 text-red-600 hover:bg-red-50'
                              : 'border-green-200 text-green-600 hover:bg-green-50'
                          }`}
                        >
                          {p.in_stock ? 'Mark Out' : 'Mark In'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── STATS / DASHBOARD TAB ── */}
        {activeTab === 'stats' && stats && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-5">Operations Dashboard</h2>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Total Orders', value: stats.total_orders, icon: ClipboardList, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Needs Attention', value: stats.needs_attention, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
                { label: 'In Transit', value: stats.shipped, icon: Truck, color: 'text-orange-600', bg: 'bg-orange-50' },
                { label: 'Total Revenue', value: formatPrice(stats.total_revenue), icon: BarChart2, color: 'text-green-600', bg: 'bg-green-50' },
              ].map(kpi => (
                <div key={kpi.label} className="bg-white rounded-xl border border-gray-100 p-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${kpi.bg} mb-3`}>
                    <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{kpi.label}</p>
                </div>
              ))}
            </div>

            {/* Status Breakdown */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-800 mb-4">Order Status Breakdown</h3>
              <div className="space-y-3">
                {['pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'].map(s => {
                  const cfg = statusConfig[s]
                  const count = stats[s] || 0
                  const pct = stats.total_orders > 0 ? (count / stats.total_orders) * 100 : 0
                  return (
                    <div key={s} className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${cfg.bg}`}>
                        <cfg.icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700">{cfg.label}</span>
                          <span className="text-gray-500">{count} orders</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              s === 'pending' ? 'bg-yellow-400' :
                              s === 'confirmed' ? 'bg-blue-400' :
                              s === 'packed' ? 'bg-purple-400' :
                              s === 'shipped' ? 'bg-orange-400' :
                              s === 'delivered' ? 'bg-green-400' : 'bg-red-400'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default StaffPortal
