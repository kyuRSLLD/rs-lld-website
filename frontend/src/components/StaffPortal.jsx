import { useState, useEffect, useCallback } from 'react'
import { InvoicesTab } from './InvoiceBuilder'
import { StaffManagementTab } from './StaffManagement'
import CreateOrderModal from './CreateOrderModal'
import { ApiKeyManagerTab } from './ApiKeyManager'
import { BillAnalyzerTab } from './BillAnalyzer'
import {
  Package, Truck, CheckCircle, Clock, XCircle, Users, BarChart2,
  RefreshCw, LogOut, Search, ChevronDown, ChevronUp, Edit3,
  Home, ClipboardList, ShoppingBag, AlertCircle, Tag, Eye,
  Plus, Save, X, Upload, Download, Trash2, ToggleLeft, ToggleRight,
  PenLine, Check, Globe, FileText, Shield, Key
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { staffPortalTranslations } from '@/i18n/staffPortal'

const API_BASE = import.meta.env.VITE_API_URL || ''

const STATUS_FLOW = ['pending', 'confirmed', 'packed', 'shipped', 'delivered']

const statusConfig = {
  pending:   { label: 'Pending',    color: 'text-yellow-700', bg: 'bg-yellow-50',  border: 'border-yellow-200', icon: Clock },
  confirmed: { label: 'Confirmed',  color: 'text-blue-700',   bg: 'bg-blue-50',    border: 'border-blue-200',   icon: CheckCircle },
  packed:    { label: 'Packed',     color: 'text-purple-700', bg: 'bg-purple-50',  border: 'border-purple-200', icon: Package },
  shipped:   { label: 'Shipped',    color: 'text-orange-700', bg: 'bg-orange-50',  border: 'border-orange-200', icon: Truck },
  delivered: { label: 'Delivered',  color: 'text-green-700',  bg: 'bg-green-50',   border: 'border-green-200',  icon: Home },
  cancelled: { label: 'Cancelled',  color: 'text-red-700',    bg: 'bg-red-50',     border: 'border-red-200',    icon: XCircle },
}

const paymentLabels = { net30: 'Net 30', net15: 'Net 15', cod: 'COD', credit_card: 'Credit Card', check: 'Check' }

// ─── Language Toggle Button ───────────────────────────────────────────────────
const LangToggle = ({ lang, onToggle }) => (
  <button
    onClick={onToggle}
    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-800 hover:bg-stone-700 text-white text-xs font-medium transition-all"
    title="Switch language / 切换语言"
  >
    <Globe className="w-3.5 h-3.5" />
    {lang === 'en' ? '中文' : 'EN'}
  </button>
)

// ─── Login Screen ─────────────────────────────────────────────────────────────
const StaffLogin = ({ onLogin }) => {
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [lang, setLang] = useState(() => localStorage.getItem('staffLang') || 'en')
  const [view, setView] = useState('login')
  const [forgotIdentifier, setForgotIdentifier] = useState('')
  const [forgotEmail, setForgotEmail] = useState('')
  const [message, setMessage] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [resetToken, setResetToken] = useState('')
  const t = staffPortalTranslations[lang]

  const toggleLang = () => {
    const next = lang === 'en' ? 'zh' : 'en'
    setLang(next)
    localStorage.setItem('staffLang', next)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/staff/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.success) onLogin(data.staff)
      else setError(t.login.error)
    } catch { setError(t.common.error) }
    finally { setLoading(false) }
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/staff/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: forgotIdentifier }),
      })
      const data = await res.json()
      if (data.success) {
        setMessage(lang === 'zh' ? '重置链接已发送到您的邮箱。' : 'A reset link has been sent to your email.')
        setView('success')
      } else {
        setError(data.error || (lang === 'zh' ? '未找到该用户。' : 'User not found.'))
      }
    } catch { setError(lang === 'zh' ? '发送失败，请重试。' : 'Failed to send. Please try again.') }
    finally { setLoading(false) }
  }

  const handleForgotUsername = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/staff/forgot-username`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      })
      const data = await res.json()
      if (data.success) {
        setMessage(lang === 'zh' ? '您的用户名已发送到您的邮箱。' : 'Your username has been sent to your email.')
        setView('success')
      } else {
        setError(data.error || (lang === 'zh' ? '未找到该邮箱。' : 'Email not found.'))
      }
    } catch { setError(lang === 'zh' ? '发送失败，请重试。' : 'Failed to send. Please try again.') }
    finally { setLoading(false) }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setError(lang === 'zh' ? '两次密码不一致。' : 'Passwords do not match.')
      return
    }
    if (newPassword.length < 6) {
      setError(lang === 'zh' ? '密码至少需要6位。' : 'Password must be at least 6 characters.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/staff/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, new_password: newPassword }),
      })
      const data = await res.json()
      if (data.success) {
        setMessage(lang === 'zh' ? '密码已成功更新，请重新登录。' : 'Password updated successfully. Please log in.')
        setView('success')
      } else {
        setError(data.error || (lang === 'zh' ? '重置失败，链接可能已过期。' : 'Reset failed. Link may have expired.'))
      }
    } catch { setError(lang === 'zh' ? '更新失败，请重试。' : 'Failed to update. Please try again.') }
    finally { setLoading(false) }
  }

  const inputClass = "w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-stone-400 focus:border-transparent"
  const labelClass = "block text-sm font-medium text-stone-700 mb-1"
  const backBtn = () => (
    <button type="button" onClick={() => { setView('login'); setError(''); setMessage('') }}
      className="text-sm text-stone-500 hover:text-stone-800 flex items-center gap-1 mt-3">
      ← {lang === 'zh' ? '返回登录' : 'Back to login'}
    </button>
  )
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm w-full max-w-sm p-8">
        <div className="flex justify-end mb-2">
          <button onClick={toggleLang}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-medium transition-all">
            <Globe className="w-3.5 h-3.5" />
            {lang === 'en' ? '中文' : 'EN'}
          </button>
        </div>
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
            <span className="text-white font-bold text-xl">RS</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-900">RS LLD {t.login.title}</h1>
          {view === 'login' && <p className="text-stone-500 text-sm mt-1">{t.login.subtitle}</p>}
          {view === 'forgotPassword' && <p className="text-stone-500 text-sm mt-1">{lang === 'zh' ? '重置密码' : 'Reset Password'}</p>}
          {view === 'forgotUsername' && <p className="text-stone-500 text-sm mt-1">{lang === 'zh' ? '找回用户名' : 'Recover Username'}</p>}
          {view === 'resetPassword' && <p className="text-stone-500 text-sm mt-1">{lang === 'zh' ? '设置新密码' : 'Set New Password'}</p>}
          {view === 'success' && <p className="text-stone-500 text-sm mt-1">{lang === 'zh' ? '请查收邮件' : 'Check your email'}</p>}
        </div>

        {view === 'login' && (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={labelClass}>{t.login.username}</label>
                <input type="text" value={form.username}
                  onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                  className={inputClass} placeholder={t.login.usernamePlaceholder} />
              </div>
              <div>
                <label className={labelClass}>{t.login.password}</label>
                <input type="password" value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  className={inputClass} placeholder={t.login.passwordPlaceholder} />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <Button type="submit" disabled={loading} className="w-full bg-stone-900 hover:bg-stone-700 text-white">
                {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                {loading ? t.login.loggingIn : t.login.loginButton}
              </Button>
            </form>
            <div className="mt-4 flex flex-col items-center gap-1.5 text-sm">
              <button type="button" onClick={() => { setView('forgotPassword'); setError('') }}
                className="text-stone-500 hover:text-stone-800 transition-colors">
                {lang === 'zh' ? '忘记密码？' : 'Forgot password?'}
              </button>
              <button type="button" onClick={() => { setView('forgotUsername'); setError('') }}
                className="text-stone-500 hover:text-stone-800 transition-colors">
                {lang === 'zh' ? '忘记用户名？' : 'Forgot username?'}
              </button>
            </div>
          </>
        )}

        {view === 'forgotPassword' && (
          <>
            <p className="text-stone-500 text-sm mb-4">
              {lang === 'zh' ? '请输入您的用户名或邮箱，我们将发送重置链接。' : "Enter your username or email and we'll send you a reset link."}
            </p>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className={labelClass}>{lang === 'zh' ? '用户名或邮箱' : 'Username or Email'}</label>
                <input type="text" value={forgotIdentifier} onChange={e => setForgotIdentifier(e.target.value)}
                  className={inputClass} placeholder={lang === 'zh' ? '请输入用户名或邮箱' : 'Enter username or email'} />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <Button type="submit" disabled={loading || !forgotIdentifier.trim()} className="w-full bg-stone-900 hover:bg-stone-700 text-white">
                {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                {lang === 'zh' ? '发送重置链接' : 'Send Reset Link'}
              </Button>
            </form>
            {backBtn()}
          </>
        )}

        {view === 'forgotUsername' && (
          <>
            <p className="text-stone-500 text-sm mb-4">
              {lang === 'zh' ? '请输入您的注册邮箱，我们将发送您的用户名。' : "Enter your registered email and we'll send you your username."}
            </p>
            <form onSubmit={handleForgotUsername} className="space-y-4">
              <div>
                <label className={labelClass}>{lang === 'zh' ? '邮箱地址' : 'Email Address'}</label>
                <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                  className={inputClass} placeholder={lang === 'zh' ? '请输入邮箱' : 'Enter your email'} />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <Button type="submit" disabled={loading || !forgotEmail.trim()} className="w-full bg-stone-900 hover:bg-stone-700 text-white">
                {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                {lang === 'zh' ? '发送用户名' : 'Send My Username'}
              </Button>
            </form>
            {backBtn()}
          </>
        )}

        {view === 'resetPassword' && (
          <>
            <p className="text-stone-500 text-sm mb-4">
              {lang === 'zh' ? '请输入您的新密码（至少6位）。' : 'Enter your new password (minimum 6 characters).'}
            </p>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className={labelClass}>{lang === 'zh' ? '新密码' : 'New Password'}</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  className={inputClass} placeholder={lang === 'zh' ? '请输入新密码' : 'New password'} />
              </div>
              <div>
                <label className={labelClass}>{lang === 'zh' ? '确认密码' : 'Confirm Password'}</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  className={inputClass} placeholder={lang === 'zh' ? '再次输入新密码' : 'Confirm new password'} />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <Button type="submit" disabled={loading || !newPassword || !confirmPassword} className="w-full bg-stone-900 hover:bg-stone-700 text-white">
                {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                {lang === 'zh' ? '更新密码' : 'Update Password'}
              </Button>
            </form>
          </>
        )}

        {view === 'success' && (
          <>
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-stone-700 text-sm text-center">{message}</p>
            </div>
            {backBtn()}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Order Card ───────────────────────────────────────────────────────────────
const OrderCard = ({ order, onStatusUpdate, onNotesUpdate, t, lang }) => {
  const [expanded, setExpanded] = useState(false)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notes, setNotes] = useState(order.staff_notes || '')
  const [assignedTo, setAssignedTo] = useState(order.assigned_to || '')
  const [updating, setUpdating] = useState(false)

  const cfg = statusConfig[order.status] || statusConfig.pending
  const StatusIcon = cfg.icon

  const formatPrice = (p) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(p)
  const formatDate = (d) => d ? new Date(d).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

  const nextStatus = STATUS_FLOW[STATUS_FLOW.indexOf(order.status) + 1]
  const nextCfg = nextStatus ? statusConfig[nextStatus] : null

  // Use translated status labels
  const statusLabel = (s) => t.status[s] || s

  const handleAdvanceStatus = async () => {
    if (!nextStatus) return
    setUpdating(true)
    await onStatusUpdate(order.id, nextStatus)
    setUpdating(false)
  }

  const handleCancel = async () => {
    if (!window.confirm(t.orders.cancelConfirm)) return
    setUpdating(true)
    await onStatusUpdate(order.id, 'cancelled')
    setUpdating(false)
  }

  const handleSaveNotes = async () => {
    await onNotesUpdate(order.id, notes, assignedTo)
    setEditingNotes(false)
  }

  return (
    <div className={`bg-white rounded-xl border ${cfg.border} overflow-hidden transition-all`}>
      {/* Card Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cfg.bg}`}>
              <StatusIcon className={`w-5 h-5 ${cfg.color}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-stone-900">{order.order_number}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.color}`}>{statusLabel(order.status)}</span>
              </div>
              <p className="text-sm text-stone-600">{order.customer_company || order.customer_name}</p>
              {order.customer_email && <p className="text-xs text-stone-400">{order.customer_email}</p>}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="font-bold text-stone-900 text-lg">{formatPrice(order.total_amount)}</p>
            <p className="text-xs text-stone-500">{order.item_count} items</p>
            <p className="text-xs text-stone-400">{formatDate(order.created_at)}</p>
          </div>
        </div>

        {/* Quick Info Row */}
        <div className="flex flex-wrap gap-3 mt-3 text-xs text-stone-500">
          <span className="flex items-center gap-1">
            <Truck className="w-3 h-3" />
            {order.delivery_city}, {order.delivery_state}
          </span>
          <span className="flex items-center gap-1">
            <Tag className="w-3 h-3" />
            {t.payment[order.payment_method] || paymentLabels[order.payment_method] || order.payment_method}
          </span>

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
              className="bg-stone-900 hover:bg-stone-700 text-white text-xs"
            >
              {updating ? <RefreshCw className="w-3 h-3 animate-spin mr-1" /> : <nextCfg.icon className="w-3 h-3 mr-1" />}
              {t.orders.markAs} {statusLabel(nextStatus)}
            </Button>
          )}
          {order.status !== 'cancelled' && order.status !== 'delivered' && (
            <Button size="sm" variant="outline" onClick={handleCancel} disabled={updating}
              className="text-red-600 border-red-200 hover:bg-red-50 text-xs">
              <XCircle className="w-3 h-3 mr-1" /> {t.orders.cancel}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setEditingNotes(!editingNotes)}
            className="text-xs">
            <Edit3 className="w-3 h-3 mr-1" /> {t.orders.notes}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setExpanded(!expanded)}
            className="text-xs ml-auto">
            <Eye className="w-3 h-3 mr-1" />
            {expanded ? t.orders.hideDetails : t.orders.details}
            {expanded ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
          </Button>
        </div>

        {/* Staff Notes Editor */}
        {editingNotes && (
          <div className="mt-3 p-3 bg-stone-50 rounded-lg space-y-2">
            <input
              type="text" value={assignedTo}
              onChange={e => setAssignedTo(e.target.value)}
              placeholder={t.orders.assignTo}
              className="w-full border border-stone-200 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-stone-400 focus:border-stone-400"
            />
            <textarea
              value={notes} onChange={e => setNotes(e.target.value)}
              placeholder={t.orders.internalNotes}
              rows={2}
              className="w-full border border-stone-200 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-stone-400 focus:border-stone-400 resize-none"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveNotes} className="bg-stone-900 hover:bg-stone-700 text-white text-xs">{t.orders.save}</Button>
              <Button size="sm" variant="outline" onClick={() => setEditingNotes(false)} className="text-xs">{t.orders.cancelEdit}</Button>
            </div>
          </div>
        )}
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-stone-100 p-4 bg-stone-50 space-y-4">
          {/* Line Items */}
          <div>
            <h4 className="text-xs font-semibold text-stone-600 uppercase tracking-wide mb-2">{t.orders.orderItems}</h4>
            <div className="space-y-1.5">
              {order.items?.map(item => (
                <div key={item.id} className="flex justify-between items-center text-sm bg-white rounded-lg px-3 py-2 border border-stone-100">
                  <div>
                    <span className="font-medium text-gray-800">{item.product_name}</span>
                    <span className="text-stone-400 text-xs ml-2">{t.orders.sku}: {item.product_sku}</span>
                    {item.is_bulk_price && <span className="text-green-600 text-xs ml-2">● {t.orders.bulk}</span>}
                  </div>
                  <div className="text-right text-xs">
                    <span className="text-stone-600">×{item.quantity} @ {formatPrice(item.unit_price)}</span>
                    <span className="font-bold text-stone-900 ml-3">{formatPrice(item.line_total)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery + Totals */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-semibold text-stone-600 uppercase tracking-wide mb-2">{t.orders.deliveryAddress}</h4>
              <div className="bg-white rounded-lg p-3 border border-stone-100 text-sm text-stone-700 space-y-0.5">
                <p className="font-medium">{order.delivery_name}</p>
                {order.delivery_company && <p>{order.delivery_company}</p>}
                <p>{order.delivery_address}</p>
                <p>{order.delivery_city}, {order.delivery_state} {order.delivery_zip}</p>
                {order.delivery_phone && <p className="text-stone-500">{order.delivery_phone}</p>}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-stone-600 uppercase tracking-wide mb-2">{t.orders.orderSummary}</h4>
              <div className="bg-white rounded-lg p-3 border border-stone-100 text-sm space-y-1">
                <div className="flex justify-between text-stone-600"><span>{t.orders.subtotal}</span><span>{formatPrice(order.subtotal)}</span></div>
                {order.discount_amount > 0 && (
                  <div className="flex justify-between text-green-600"><span>{t.orders.bulkSavings}</span><span>-{formatPrice(order.discount_amount)}</span></div>
                )}
                <div className="flex justify-between text-stone-600"><span>{t.orders.delivery}</span><span>{order.delivery_fee === 0 ? t.orders.free : formatPrice(order.delivery_fee)}</span></div>
                <div className="flex justify-between font-bold text-stone-900 border-t pt-1"><span>{t.orders.total}</span><span>{formatPrice(order.total_amount)}</span></div>
                <p className="text-xs text-stone-500 pt-1">{t.orders.payment}: {t.payment[order.payment_method] || paymentLabels[order.payment_method]}</p>
              </div>
            </div>
          </div>

          {/* Check Image Review */}
          {order.has_check_image && (
            <div>
              <h4 className="text-xs font-semibold text-stone-600 uppercase tracking-wide mb-2">{t.orders.checkReview}</h4>
              <div className="bg-white rounded-lg p-3 border border-amber-200 space-y-3">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    order.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
                    order.payment_status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {order.payment_status === 'paid' ? t.orders.checkApproved :
                     order.payment_status === 'rejected' ? t.orders.checkRejected :
                     t.orders.pendingReview}
                  </span>
                </div>
                <img
                  src={`${API_BASE}/api/staff/checks/${order.order_number}`}
                  alt="Check image"
                  className="max-h-48 rounded-lg border border-stone-200 object-contain w-full"
                  onError={(e) => { e.target.style.display='none' }}
                />
                {order.payment_status === 'pending_review' && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={async () => {
                        if (!window.confirm(t.orders.approveConfirm)) return
                        const res = await fetch(`${API_BASE}/api/staff/checks/${order.order_number}/approve`, {
                          method: 'POST', credentials: 'include'
                        })
                        const d = await res.json()
                        if (d.success) window.location.reload()
                        else alert(d.error)
                      }}
                      className="bg-stone-900 hover:bg-stone-700 text-white text-xs"
                    >
                      ✓ {t.orders.approveCheck}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        if (!window.confirm(t.orders.rejectConfirm)) return
                        const res = await fetch(`${API_BASE}/api/staff/checks/${order.order_number}/reject`, {
                          method: 'POST', credentials: 'include'
                        })
                        const d = await res.json()
                        if (d.success) window.location.reload()
                        else alert(d.error)
                      }}
                      className="text-red-600 border-red-200 hover:bg-red-50 text-xs"
                    >
                      ✗ {t.orders.rejectCheck}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div>
            <h4 className="text-xs font-semibold text-stone-600 uppercase tracking-wide mb-2">{t.orders.timeline}</h4>
            <div className="space-y-1 text-xs text-stone-500">
              <p>📥 {formatDate(order.created_at)}</p>
              {order.confirmed_at && <p>✅ {t.status.confirmed}: {formatDate(order.confirmed_at)}</p>}
              {order.shipped_at && <p>🚚 {t.status.shipped}: {formatDate(order.shipped_at)}</p>}
              {order.delivered_at && <p>🏠 {t.status.delivered}: {formatDate(order.delivered_at)}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Product Row (inline editable) ──────────────────────────────────────────
const ProductRow = ({ product, categories, onSave, onDelete, onToggleStock, t }) => {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: product.name,
    sku: product.sku,
    brand: product.brand || '',
    unit_size: product.unit_size || '',
    unit_price: product.unit_price,
    bulk_price: product.bulk_price || '',
    bulk_quantity: product.bulk_quantity || '',
    category_id: product.category_id,
    description: product.description || '',
  })
  const [error, setError] = useState('')
  const formatPrice = (p) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(p)

  const handleSave = async () => {
    setSaving(true)
    setError('')
    const result = await onSave(product.id, form)
    if (result?.error) setError(result.error)
    else setEditing(false)
    setSaving(false)
  }

  const handleCancel = () => {
    setForm({
      name: product.name, sku: product.sku, brand: product.brand || '',
      unit_size: product.unit_size || '', unit_price: product.unit_price,
      bulk_price: product.bulk_price || '', bulk_quantity: product.bulk_quantity || '',
      category_id: product.category_id, description: product.description || '',
    })
    setEditing(false)
    setError('')
  }

  const inp = 'border border-stone-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-stone-400 w-full'

  if (editing) {
    return (
      <>
        <tr className="bg-blue-50 border-l-4 border-blue-500">
          <td className="px-3 py-2"><input className={inp} value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))} placeholder={t.products.productName} /></td>
          <td className="px-3 py-2"><input className={`${inp} font-mono uppercase`} value={form.sku} onChange={e => setForm(p=>({...p,sku:e.target.value}))} placeholder={t.products.enterSku} /></td>
          <td className="px-3 py-2"><input className={inp} value={form.brand} onChange={e => setForm(p=>({...p,brand:e.target.value}))} placeholder={t.products.enterBrand} /></td>
          <td className="px-3 py-2"><input className={inp} value={form.unit_size} onChange={e => setForm(p=>({...p,unit_size:e.target.value}))} placeholder={t.products.enterSize} /></td>
          <td className="px-3 py-2">
            <select className={inp} value={form.category_id} onChange={e => setForm(p=>({...p,category_id:parseInt(e.target.value)}))}>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </td>
          <td className="px-3 py-2"><input className={inp} type="number" step="0.01" value={form.unit_price} onChange={e => setForm(p=>({...p,unit_price:e.target.value}))} placeholder={t.products.enterPrice} /></td>
          <td className="px-3 py-2"><input className={inp} type="number" step="0.01" value={form.bulk_price} onChange={e => setForm(p=>({...p,bulk_price:e.target.value}))} placeholder={t.products.enterPrice} /></td>
          <td className="px-3 py-2"><input className={inp} type="number" value={form.bulk_quantity} onChange={e => setForm(p=>({...p,bulk_quantity:e.target.value}))} placeholder={t.products.minQty} /></td>
          <td className="px-3 py-2">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${product.in_stock ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {product.in_stock ? t.products.inStock : t.products.outOfStock}
            </span>
          </td>
          <td className="px-3 py-2">
            <div className="flex gap-1">
              <button onClick={handleSave} disabled={saving} className="bg-stone-900 hover:bg-stone-700 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} {t.products.saving.replace('...', '') || 'Save'}
              </button>
              <button onClick={handleCancel} className="bg-stone-200 hover:bg-gray-300 text-stone-700 text-xs px-2 py-1 rounded">
                <X className="w-3 h-3" />
              </button>
            </div>
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
          </td>
        </tr>
      </>
    )
  }

  return (
    <tr className={`hover:bg-stone-50 transition-colors ${!product.in_stock ? 'opacity-60' : ''}`}>
      <td className="px-3 py-2.5 font-medium text-stone-900 text-sm">{product.name}</td>
      <td className="px-3 py-2.5 text-stone-500 font-mono text-xs">{product.sku}</td>
      <td className="px-3 py-2.5 text-stone-600 text-sm">{product.brand || '—'}</td>
      <td className="px-3 py-2.5 text-stone-500 text-xs">{product.unit_size || '—'}</td>
      <td className="px-3 py-2.5 text-xs">
        <span className="bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full">{product.category_name}</span>
      </td>
      <td className="px-3 py-2.5 text-stone-900 font-semibold text-sm">{formatPrice(product.unit_price)}</td>
      <td className="px-3 py-2.5 text-green-700 text-sm">{product.bulk_price ? formatPrice(product.bulk_price) : '—'}</td>
      <td className="px-3 py-2.5 text-stone-500 text-sm">{product.bulk_quantity ? `${product.bulk_quantity}+` : '—'}</td>
      <td className="px-3 py-2.5">
        <button onClick={() => onToggleStock(product.id)} className={`px-2 py-0.5 rounded-full text-xs font-medium transition-all ${
          product.in_stock ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-red-50 text-red-700 hover:bg-red-100'
        }`}>
          {product.in_stock ? `✓ ${t.products.inStock}` : `✗ ${t.products.outOfStock}`}
        </button>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex gap-1">
          <button onClick={() => setEditing(true)} className="text-blue-600 hover:bg-blue-50 p-1 rounded" title={t.products.edit}>
            <PenLine className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(product.id, product.name)} className="text-red-500 hover:bg-red-50 p-1 rounded" title={t.products.delete}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  )
}

// ─── Add Product Form ─────────────────────────────────────────────────────────
const AddProductForm = ({ categories, onAdd, onClose, t }) => {
  const [form, setForm] = useState({
    name: '', sku: '', brand: '', unit_size: '', description: '',
    category_id: categories[0]?.id || '',
    unit_price: '', bulk_price: '', bulk_quantity: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const inp = 'border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-stone-400 w-full'

  useEffect(() => {
    if (categories.length > 0 && !form.category_id) {
      setForm(p => ({ ...p, category_id: categories[0].id }))
    }
  }, [categories])

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setError(t.lang === 'zh' ? '图片必须小于 5MB' : 'Image must be under 5MB')
      return
    }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setError('')
  }

  const handleRemoveImage = () => {
    setImageFile(null)
    setImagePreview(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    let imageUrl = null
    if (imageFile) {
      setUploadingImage(true)
      const imgData = new FormData()
      imgData.append('image', imageFile)
      try {
        const imgRes = await fetch(`${API_BASE}/api/staff/products/upload-image`, {
          method: 'POST',
          credentials: 'include',
          body: imgData,
        })
        const imgJson = await imgRes.json()
        if (imgJson.success) {
          imageUrl = imgJson.image_url
        } else {
          setError(imgJson.error || t.products.uploading)
          setSaving(false)
          setUploadingImage(false)
          return
        }
      } catch {
        setError(t.common.error)
        setSaving(false)
        setUploadingImage(false)
        return
      }
      setUploadingImage(false)
    }
    const result = await onAdd({ ...form, image_url: imageUrl })
    if (result?.error) setError(result.error)
    else onClose()
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-bold text-stone-900">{t.products.addProductTitle}</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-stone-700 mb-1">{t.products.name} *</label>
              <input className={inp} value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} required placeholder={t.products.productName} />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t.products.sku} *</label>
              <input className={`${inp} font-mono uppercase`} value={form.sku} onChange={e=>setForm(p=>({...p,sku:e.target.value.toUpperCase()}))} required placeholder={t.products.enterSku} />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t.products.category} *</label>
              <select className={inp} value={form.category_id} onChange={e=>setForm(p=>({...p,category_id:parseInt(e.target.value)}))} required>
                {categories.length === 0 && <option value="">{t.common.loading}</option>}
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t.products.brand}</label>
              <input className={inp} value={form.brand} onChange={e=>setForm(p=>({...p,brand:e.target.value}))} placeholder={t.products.enterBrand} />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t.products.size}</label>
              <input className={inp} value={form.unit_size} onChange={e=>setForm(p=>({...p,unit_size:e.target.value}))} placeholder={t.products.enterSize} />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t.products.unitPrice} ($) *</label>
              <input className={inp} type="number" step="0.01" min="0" value={form.unit_price} onChange={e=>setForm(p=>({...p,unit_price:e.target.value}))} required placeholder={t.products.enterPrice} />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t.products.bulkPrice} ($)</label>
              <input className={inp} type="number" step="0.01" min="0" value={form.bulk_price} onChange={e=>setForm(p=>({...p,bulk_price:e.target.value}))} placeholder={t.products.enterPrice} />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t.products.bulkQty}</label>
              <input className={inp} type="number" min="1" value={form.bulk_quantity} onChange={e=>setForm(p=>({...p,bulk_quantity:e.target.value}))} placeholder={t.products.minQty} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-stone-700 mb-1">{t.products.description}</label>
              <textarea className={inp} rows={2} value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder={t.products.description} />
            </div>
            {/* ── Product Image Upload ── */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-stone-700 mb-2">{t.products.uploadImage}</label>
              {imagePreview ? (
                <div className="relative inline-block">
                  <img src={imagePreview} alt="Preview" className="w-32 h-32 object-cover rounded-xl border-2 border-blue-200 shadow" />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow hover:bg-red-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <p className="text-xs text-stone-500 mt-1">{imageFile?.name}</p>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all">
                  <div className="flex flex-col items-center gap-1 text-stone-400">
                    <Upload className="w-8 h-8" />
                    <span className="text-sm font-medium">{t.products.uploadImage}</span>
                    <span className="text-xs">JPG, PNG, WEBP — max 5MB</span>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>
              )}
            </div>
          </div>
          {error && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving || uploadingImage} className="flex-1 bg-stone-900 hover:bg-stone-700 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2">
              {saving || uploadingImage ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {uploadingImage ? t.products.uploading : saving ? t.products.adding : t.products.addProduct}
            </button>
            <button type="button" onClick={onClose} className="px-6 py-2.5 border border-stone-200 rounded-lg text-stone-700 hover:bg-stone-50">
              {t.products.cancelAdd}
            </button>
          </div>
        </form>
      </div>
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
  const [products, setProducts] = useState([])
  const [productCategories, setProductCategories] = useState([])
  const [productSearch, setProductSearch] = useState('')
  const [productCategoryFilter, setProductCategoryFilter] = useState('')
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [csvImporting, setCsvImporting] = useState(false)
  const [csvMessage, setCsvMessage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateOrder, setShowCreateOrder] = useState(false)
  const [lang, setLang] = useState(() => localStorage.getItem('staffLang') || 'en')

  const t = staffPortalTranslations[lang]

  const toggleLang = () => {
    const next = lang === 'en' ? 'zh' : 'en'
    setLang(next)
    localStorage.setItem('staffLang', next)
  }

  const formatPrice = (p) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(p)

  // Check if already logged in
  useEffect(() => {
    fetch(`${API_BASE}/api/staff/me`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setStaff(d) })
      .catch(() => {})
  }, [])

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const url = statusFilter ? `${API_BASE}/api/staff/orders?status=${statusFilter}` : `${API_BASE}/api/staff/orders`
      const res = await fetch(url, { credentials: 'include' })
      const data = await res.json()
      setOrders(Array.isArray(data) ? data : [])
    } catch {}
    finally { setLoading(false) }
  }, [statusFilter])

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/staff/stats`, { credentials: 'include' })
      const data = await res.json()
      setStats(data)
    } catch {}
  }, [])

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/staff/customers`, { credentials: 'include' })
      const data = await res.json()
      setCustomers(Array.isArray(data) ? data : [])
    } catch {}
  }, [])

  const fetchInventory = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/staff/inventory`, { credentials: 'include' })
      const data = await res.json()
      setInventory(Array.isArray(data) ? data : [])
    } catch {}
  }, [])

  const fetchProducts = useCallback(async () => {
    try {
      let url = `${API_BASE}/api/staff/products`
      const params = []
      if (productSearch) params.push(`search=${encodeURIComponent(productSearch)}`)
      if (productCategoryFilter) params.push(`category_id=${productCategoryFilter}`)
      if (params.length) url += '?' + params.join('&')
      const res = await fetch(url, { credentials: 'include' })
      const data = await res.json()
      setProducts(Array.isArray(data) ? data : [])
    } catch {}
  }, [productSearch, productCategoryFilter])

  const fetchProductCategories = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/staff/categories`, { credentials: 'include' })
      const data = await res.json()
      setProductCategories(Array.isArray(data) ? data : [])
    } catch {}
  }, [])

  useEffect(() => {
    if (!staff) return
    fetchStats()
    if (activeTab === 'orders') fetchOrders()
    if (activeTab === 'customers') fetchCustomers()
    if (activeTab === 'inventory') fetchInventory()
    if (activeTab === 'products') { fetchProducts(); fetchProductCategories() }
    // invoices tab fetches its own data internally via InvoicesTab component
  }, [staff, activeTab, fetchOrders, fetchStats, fetchCustomers, fetchInventory, fetchProducts, fetchProductCategories])

  useEffect(() => {
    if (activeTab === 'products') fetchProducts()
  }, [productSearch, productCategoryFilter, activeTab, fetchProducts])

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await fetch(`${API_BASE}/api/staff/orders/${orderId}/status`, {
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
      await fetch(`${API_BASE}/api/staff/orders/${orderId}/notes`, {
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
      await fetch(`${API_BASE}/api/staff/inventory/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ in_stock: inStock }),
      })
      fetchInventory()
    } catch {}
  }

  const [inventoryImageUploading, setInventoryImageUploading] = useState({})

  const handleInventoryImageUpload = async (productId, file) => {
    if (!file) return
    setInventoryImageUploading(s => ({ ...s, [productId]: true }))
    try {
      const formData = new FormData()
      formData.append('image', file)
      const res = await fetch(`${API_BASE}/api/staff/products/${productId}/image`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })
      const data = await res.json()
      if (data.success) fetchInventory()
    } catch {}
    setInventoryImageUploading(s => ({ ...s, [productId]: false }))
  }

  const handleInventoryImageRemove = async (productId) => {
    try {
      await fetch(`${API_BASE}/api/staff/products/${productId}/image`, {
        method: 'DELETE',
        credentials: 'include',
      })
      fetchInventory()
    } catch {}
  }

  const handleProductSave = async (productId, form) => {
    try {
      const res = await fetch(`${API_BASE}/api/staff/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.success) { fetchProducts(); return null }
      return { error: data.error || t.common.error }
    } catch { return { error: t.common.error } }
  }

  const handleProductAdd = async (form) => {
    try {
      const res = await fetch(`${API_BASE}/api/staff/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.success) { fetchProducts(); return null }
      return { error: data.error || t.common.error }
    } catch { return { error: t.common.error } }
  }

  const handleProductDelete = async (productId, name) => {
    if (!window.confirm(`${t.products.deleteConfirm} "${name}"?`)) return
    try {
      await fetch(`${API_BASE}/api/staff/products/${productId}`, { method: 'DELETE', credentials: 'include' })
      fetchProducts()
    } catch {}
  }

  const handleProductToggleStock = async (productId) => {
    try {
      await fetch(`${API_BASE}/api/staff/products/${productId}/toggle-stock`, { method: 'POST', credentials: 'include' })
      fetchProducts()
    } catch {}
  }

  const handleCsvExport = () => {
    window.open(`${API_BASE}/api/staff/products/export-csv`, '_blank')
  }

  const handleCsvImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setCsvImporting(true)
    setCsvMessage(null)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch(`${API_BASE}/api/staff/products/import-csv`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })
      const data = await res.json()
      if (data.success) {
        setCsvMessage({ type: 'success', text: `✅ ${lang === 'zh' ? `已更新 ${data.updated} 个产品。跳过：${data.skipped}。` : `Updated ${data.updated} products. Skipped: ${data.skipped}.`}${data.errors?.length ? (lang === 'zh' ? ' 错误: ' : ' Errors: ') + data.errors.join('; ') : ''}` })
        fetchProducts()
      } else {
        setCsvMessage({ type: 'error', text: `❌ ${data.error}` })
      }
    } catch { setCsvMessage({ type: 'error', text: `❌ ${t.common.error}` }) }
    finally { setCsvImporting(false); e.target.value = '' }
  }

  const handleLogout = async () => {
    await fetch(`${API_BASE}/api/staff/logout`, { method: 'POST', credentials: 'include' })
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

  const isAdmin = staff?.role === 'admin'

  const tabs = [
    { id: 'orders', label: t.tabs.orders, icon: ClipboardList },
    { id: 'customers', label: t.tabs.customers, icon: Users },
    { id: 'products', label: t.tabs.products, icon: Tag },
    { id: 'inventory', label: t.tabs.inventory, icon: ShoppingBag },
    { id: 'invoices', label: t.tabs.invoices, icon: FileText },
    { id: 'stats', label: t.tabs.stats, icon: BarChart2 },
    ...(isAdmin ? [{ id: 'staffMgmt', label: t.tabs.staffMgmt, icon: Shield, adminOnly: true }, { id: 'apiKeys', label: t.tabs.apiKeys, icon: Key, adminOnly: true },
    { id: 'billAnalyzer', label: t.tabs.billAnalyzer, icon: TrendingDown }] : []),
  ]

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Top Nav */}
      <div className="bg-white border-b border-stone-200 text-stone-900 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-stone-900 rounded-lg flex items-center justify-center font-bold text-sm text-white">RS</div>
          <div>
            <span className="font-semibold text-stone-900">RS LLD {t.header.title}</span>
            <span className="text-stone-400 text-xs ml-2">Internal</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {stats?.needs_attention > 0 && (
            <div className="flex items-center gap-1 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              <AlertCircle className="w-3 h-3" /> {stats.needs_attention} {lang === 'zh' ? '需处理' : 'need attention'}
            </div>
          )}
          <LangToggle lang={lang} onToggle={toggleLang} />
          <span className="text-stone-500 text-sm">👤 {staff.full_name || staff.username}</span>
          <Button size="sm" variant="ghost" onClick={handleLogout} className="text-stone-500 hover:text-stone-900 text-xs">
            <LogOut className="w-3 h-3 mr-1" /> {t.header.logout}
          </Button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="bg-white border-b border-stone-200 px-6">
        <div className="flex gap-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                activeTab === tab.id
                  ? tab.adminOnly ? 'border-stone-900 text-stone-900' : 'border-stone-900 text-stone-900'
                  : tab.adminOnly ? 'border-transparent text-stone-400 hover:text-stone-700' : 'border-transparent text-stone-400 hover:text-stone-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.adminOnly && (
                <span className="text-xs bg-stone-900 text-white px-1.5 py-0.5 rounded-full font-semibold ml-0.5">A</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* ── ORDERS TAB ── */}
        {activeTab === 'orders' && (
          <div>
            <div className="flex flex-wrap gap-3 mb-5">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="text" value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={t.orders.searchPlaceholder}
                  className="w-full pl-9 pr-3 py-2 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-stone-400"
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
                          : cfg ? `${cfg.bg} ${cfg.color} ${cfg.border}` : 'bg-stone-100 text-stone-600 border-stone-200'
                      }`}
                    >
                      {s ? t.status[s] : t.status.all}
                      {s && stats && ` (${stats[s] || 0})`}
                    </button>
                  )
                })}
              </div>
              <button onClick={() => setShowCreateOrder(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors">
                <Plus className="w-3.5 h-3.5" /> {t.createOrder?.buttonLabel || 'Create Order'}
              </button>
              <Button size="sm" variant="outline" onClick={fetchOrders} className="text-xs">
                <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} /> {t.header.refresh}
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-12"><RefreshCw className="w-8 h-8 animate-spin text-stone-400 mx-auto" /></div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-stone-100">
                <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-stone-500">{t.orders.noOrders}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onStatusUpdate={handleStatusUpdate}
                    onNotesUpdate={handleNotesUpdate}
                    t={t}
                    lang={lang}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── CUSTOMERS TAB ── */}
        {activeTab === 'customers' && (
          <div>
            <h2 className="text-xl font-bold text-stone-900 mb-4">{t.customers.title}</h2>
            {customers.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-stone-100">
                <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-stone-500">{t.customers.noCustomers}</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-stone-50 border-b border-stone-100">
                    <tr>
                      {[t.customers.name, t.customers.company, t.customers.email, t.customers.phone, t.customers.orders, t.customers.spent, t.customers.joined].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {customers.map(c => (
                      <tr key={c.id} className="hover:bg-stone-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-stone-900">{c.username}</td>
                        <td className="px-4 py-3 text-stone-600">{c.company_name || '—'}</td>
                        <td className="px-4 py-3 text-stone-600">{c.email}</td>
                        <td className="px-4 py-3 text-stone-600">{c.phone || '—'}</td>
                        <td className="px-4 py-3">
                          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">{c.order_count}</span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-stone-900">{formatPrice(c.total_spent)}</td>
                        <td className="px-4 py-3 text-stone-500 text-xs">{new Date(c.created_at).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── PRODUCTS TAB ── */}
        {activeTab === 'products' && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <h2 className="text-xl font-bold text-stone-900">{t.products.title}</h2>
              <div className="flex flex-wrap gap-2">
                <button onClick={handleCsvExport} className="flex items-center gap-2 px-3 py-2 border border-stone-200 rounded-lg text-sm text-stone-700 hover:bg-stone-50">
                  <Download className="w-4 h-4" /> {t.products.exportCsv}
                </button>
                <label className={`flex items-center gap-2 px-3 py-2 border border-stone-200 rounded-lg text-sm text-stone-700 hover:bg-stone-50 cursor-pointer ${csvImporting ? 'opacity-50' : ''}`}>
                  {csvImporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {csvImporting ? t.products.importing : t.products.importCsv}
                  <input type="file" accept=".csv" className="hidden" onChange={handleCsvImport} disabled={csvImporting} />
                </label>
                <button onClick={() => setShowAddProduct(true)} className="flex items-center gap-2 px-4 py-2 bg-stone-900 hover:bg-stone-700 text-white rounded-lg text-sm font-medium">
                  <Plus className="w-4 h-4" /> {t.products.addProduct}
                </button>
              </div>
            </div>

            {csvMessage && (
              <div className={`mb-4 p-3 rounded-lg text-sm ${csvMessage.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                {csvMessage.text}
                <button onClick={() => setCsvMessage(null)} className="ml-2 opacity-60 hover:opacity-100"><X className="w-3 h-3 inline" /></button>
              </div>
            )}

            <div className="flex flex-wrap gap-3 mb-4">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="text" value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  placeholder={t.products.searchPlaceholder}
                  className="w-full pl-9 pr-3 py-2 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-stone-400"
                />
              </div>
              <select
                value={productCategoryFilter}
                onChange={e => setProductCategoryFilter(e.target.value)}
                className="border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-stone-400"
              >
                <option value="">{t.products.allCategories}</option>
                {productCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button onClick={fetchProducts} className="flex items-center gap-1 px-3 py-2 border border-stone-200 rounded-lg text-sm text-stone-600 hover:bg-stone-50">
                <RefreshCw className="w-3.5 h-3.5" /> {t.header.refresh}
              </button>
            </div>

            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
              <strong>{t.products.importCsv}:</strong> {lang === 'zh' ? '请先下载 CSV 作为模板，在电子表格中更新价格/货号后重新导入。只有已存在的货号会被更新，新行将被忽略。' : 'Download the CSV first to use as a template. Update prices/SKUs in the spreadsheet and re-import. Only existing SKUs will be updated — new rows are ignored.'}
            </div>

            <div className="bg-white rounded-xl border border-stone-100 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 border-b border-stone-100">
                  <tr>
                    {[t.products.name, t.products.sku, t.products.brand, t.products.size, t.products.category, t.products.unitPrice, t.products.bulkPrice, t.products.bulkQty, t.products.stock, t.products.actions].map(h => (
                      <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {products.length === 0 ? (
                    <tr><td colSpan={10} className="text-center py-12 text-stone-400">{lang === 'zh' ? '未找到产品' : 'No products found'}</td></tr>
                  ) : products.map(p => (
                    <ProductRow
                      key={p.id}
                      product={p}
                      categories={productCategories}
                      onSave={handleProductSave}
                      onDelete={handleProductDelete}
                      onToggleStock={handleProductToggleStock}
                      t={t}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-stone-400 mt-2">{products.length} {lang === 'zh' ? '个产品。点击 ✏️ 图标可内联编辑。' : 'products shown. Click the ✏️ edit icon on any row to edit inline.'}</p>

            {showAddProduct && (
              <AddProductForm
                categories={productCategories}
                onAdd={handleProductAdd}
                onClose={() => setShowAddProduct(false)}
                t={t}
              />
            )}
          </div>
        )}

        {/* ── INVENTORY TAB ── */}
        {activeTab === 'inventory' && (
          <div>
            <h2 className="text-xl font-bold text-stone-900 mb-4">{t.inventory.title}</h2>
            <div className="bg-white rounded-xl border border-stone-100 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 border-b border-stone-100">
                  <tr>
                    {[t.inventory.image, t.inventory.name, t.inventory.sku, t.inventory.brand, t.inventory.price, t.inventory.bulkPrice, t.inventory.bulkQty, t.inventory.status, t.inventory.action].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {inventory.map(p => (
                    <tr key={p.id} className={`hover:bg-stone-50 transition-colors ${!p.in_stock ? 'opacity-60' : ''}`}>
                      {/* Image cell */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-center gap-1.5" style={{minWidth: 72}}>
                          {p.image_url ? (
                            <img
                              src={p.image_url.startsWith('/api') ? `${API_BASE}${p.image_url}` : p.image_url}
                              alt={p.name}
                              className="w-14 h-14 object-cover rounded-lg border border-stone-200 bg-stone-50"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-lg border border-dashed border-stone-300 bg-stone-50 flex items-center justify-center">
                              <Package className="w-5 h-5 text-stone-300" />
                            </div>
                          )}
                          <label className={`cursor-pointer text-xs px-2 py-0.5 rounded border transition-all ${
                            inventoryImageUploading[p.id]
                              ? 'border-stone-200 text-stone-400 cursor-not-allowed'
                              : 'border-blue-200 text-blue-600 hover:bg-blue-50'
                          }`}>
                            {inventoryImageUploading[p.id]
                              ? t.inventory.uploading
                              : p.image_url ? t.inventory.changeImage : t.inventory.uploadImage}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={inventoryImageUploading[p.id]}
                              onChange={e => handleInventoryImageUpload(p.id, e.target.files[0])}
                            />
                          </label>
                          {p.image_url && (
                            <button
                              onClick={() => handleInventoryImageRemove(p.id)}
                              className="text-xs text-red-400 hover:text-red-600 underline"
                            >
                              {t.inventory.removeImage}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-stone-900">{p.name}</td>
                      <td className="px-4 py-3 text-stone-500 font-mono text-xs">{p.sku}</td>
                      <td className="px-4 py-3 text-stone-600">{p.brand}</td>
                      <td className="px-4 py-3 text-stone-900">{formatPrice(p.unit_price)}</td>
                      <td className="px-4 py-3 text-green-700">{p.bulk_price ? formatPrice(p.bulk_price) : '—'}</td>
                      <td className="px-4 py-3 text-stone-500">{p.bulk_quantity ? `${p.bulk_quantity}+` : '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.in_stock ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                          {p.in_stock ? t.inventory.inStock : t.inventory.outOfStock}
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
                          {p.in_stock ? t.inventory.markOut : t.inventory.markIn}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── INVOICES TAB ── */}
        {activeTab === 'invoices' && (
          <InvoicesTab t={t} lang={lang} />
        )}

        {/* ── STAFF MANAGEMENT TAB (admin only) ── */}
        {activeTab === 'staffMgmt' && isAdmin && (
          <StaffManagementTab t={t} lang={lang} currentStaff={staff} />
        )}
        {activeTab === 'staffMgmt' && !isAdmin && (
          <div className="text-center py-20">
            <Shield className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-stone-400 text-sm">Admin access required</p>
          </div>
        )}

        {/* ── API KEYS TAB (admin only) ── */}
        {activeTab === 'billAnalyzer' && (
          <BillAnalyzerTab t={t.billAnalyzer} />
        )}
        {activeTab === 'apiKeys' && isAdmin && (
          <ApiKeyManagerTab t={t} lang={lang} />
        )}
        {activeTab === 'apiKeys' && !isAdmin && (
          <div className="text-center py-20">
            <Shield className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-stone-400">Admin access required.</p>
          </div>
        )}

        {/* ── STATS / DASHBOARD TAB ── */}
        {activeTab === 'stats' && stats && (
          <div>
            <h2 className="text-xl font-bold text-stone-900 mb-5">{t.stats.title}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {[
                { label: t.stats.totalOrders, value: stats.total_orders, icon: ClipboardList, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: t.stats.needsAttention, value: stats.needs_attention, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
                { label: t.stats.inTransit, value: stats.shipped, icon: Truck, color: 'text-orange-600', bg: 'bg-orange-50' },
                { label: t.stats.totalRevenue, value: formatPrice(stats.total_revenue), icon: BarChart2, color: 'text-green-600', bg: 'bg-green-50' },
              ].map(kpi => (
                <div key={kpi.label} className="bg-white rounded-xl border border-stone-100 p-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${kpi.bg} mb-3`}>
                    <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                  </div>
                  <p className="text-2xl font-bold text-stone-900">{kpi.value}</p>
                  <p className="text-xs text-stone-500 mt-0.5">{kpi.label}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl border border-stone-100 p-5">
              <h3 className="font-semibold text-gray-800 mb-4">{t.stats.statusBreakdown}</h3>
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
                          <span className="font-medium text-stone-700">{t.status[s]}</span>
                          <span className="text-stone-500">{count} {t.stats.orders}</span>
                        </div>
                        <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
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

      {/* ── CREATE ORDER MODAL ── */}
      {showCreateOrder && (
        <CreateOrderModal
          t={t}
          lang={lang}
          onClose={() => setShowCreateOrder(false)}
          onCreated={(newOrder) => {
            setShowCreateOrder(false)
            fetchOrders()
            fetchStats()
          }}
        />
      )}
    </div>
  )
}

export default StaffPortal
