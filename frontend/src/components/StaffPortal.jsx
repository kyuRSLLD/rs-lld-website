import { useState, useEffect, useCallback, useRef } from 'react'
import { InvoicesTab } from './InvoiceBuilder'
import { StaffManagementTab } from './StaffManagement'
import CreateOrderModal from './CreateOrderModal'
import { ApiKeyManagerTab } from './ApiKeyManager'
import { BillAnalyzerTab } from './BillAnalyzer'
import {
  Package, Truck, CheckCircle, Clock, XCircle, Users, BarChart2,
  RefreshCw, LogOut, Search, ChevronDown, ChevronUp, Edit3,
  Home, ClipboardList, ShoppingBag, AlertCircle, Tag, Eye, EyeOff,
  Plus, Save, X, Upload, Download, Trash2, ToggleLeft, ToggleRight,
  PenLine, Check, Globe, FileText, Shield, Key, TrendingDown, Star, Images
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { staffPortalTranslations } from '@/i18n/staffPortal'
import { staffFetch, saveStaffToken, clearStaffToken, getStaffToken, STAFF_TOKEN_KEY } from '@/lib/staffApi'

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
  const [showLoginPwd, setShowLoginPwd] = useState(false)
  const [showNewPwd, setShowNewPwd] = useState(false)
  const [showConfirmPwd, setShowConfirmPwd] = useState(false)
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
      const res = await staffFetch(`/api/staff/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.success) {
        // Save JWT token for cross-domain auth (Bluehost frontend → Railway backend)
        if (data.token) saveStaffToken(data.token)
        onLogin(data.staff)
      } else setError(t.login.error)
    } catch { setError(t.common.error) }
    finally { setLoading(false) }
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await staffFetch(`/api/staff/forgot-password`, {
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
      const res = await staffFetch(`/api/staff/forgot-username`, {
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
      const res = await staffFetch(`/api/staff/reset-password`, {
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
                <div className="relative">
                  <input type={showLoginPwd ? 'text' : 'password'} value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    className={`${inputClass} pr-10`} placeholder={t.login.passwordPlaceholder} />
                  <button type="button" onClick={() => setShowLoginPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                    title={showLoginPwd ? (lang === 'zh' ? '隐藏密码' : 'Hide password') : (lang === 'zh' ? '显示密码' : 'Show password')}>
                    {showLoginPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
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
                <div className="relative">
                  <input type={showNewPwd ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)}
                    className={`${inputClass} pr-10`} placeholder={lang === 'zh' ? '请输入新密码' : 'New password'} />
                  <button type="button" onClick={() => setShowNewPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                    title={showNewPwd ? (lang === 'zh' ? '隐藏密码' : 'Hide password') : (lang === 'zh' ? '显示密码' : 'Show password')}>
                    {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className={labelClass}>{lang === 'zh' ? '确认密码' : 'Confirm Password'}</label>
                <div className="relative">
                  <input type={showConfirmPwd ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    className={`${inputClass} pr-10`} placeholder={lang === 'zh' ? '再次输入新密码' : 'Confirm new password'} />
                  <button type="button" onClick={() => setShowConfirmPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                    title={showConfirmPwd ? (lang === 'zh' ? '隐藏密码' : 'Hide password') : (lang === 'zh' ? '显示密码' : 'Show password')}>
                    {showConfirmPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
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
const OrderCard = ({ order, onStatusUpdate, onNotesUpdate, onDelete, t, lang }) => {
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
  const prevStatus = STATUS_FLOW[STATUS_FLOW.indexOf(order.status) - 1]
  const prevCfg = prevStatus ? statusConfig[prevStatus] : null

  // Use translated status labels
  const statusLabel = (s) => t.status[s] || s

  const handleAdvanceStatus = async () => {
    if (!nextStatus) return
    setUpdating(true)
    await onStatusUpdate(order.id, nextStatus)
    setUpdating(false)
  }

  const handleMoveBack = async () => {
    if (!prevStatus) return
    if (!window.confirm(`${t.orders.moveBackConfirm} "${statusLabel(prevStatus)}"?`)) return
    setUpdating(true)
    await onStatusUpdate(order.id, prevStatus)
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
          {prevStatus && order.status !== 'cancelled' && (
            <Button size="sm" variant="outline" onClick={handleMoveBack} disabled={updating}
              className="text-amber-600 border-amber-200 hover:bg-amber-50 text-xs">
              {prevCfg && <prevCfg.icon className="w-3 h-3 mr-1" />}
              {t.orders.moveBack}
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
          {onDelete && (
            <Button size="sm" variant="outline" onClick={() => onDelete(order.id, order.order_number)} disabled={updating}
              className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-700 text-xs">
              <Trash2 className="w-3 h-3 mr-1" /> {t.orders.deleteOrder || 'Delete'}
            </Button>
          )}
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
                {/* Front and back check images side by side */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-stone-500 font-medium mb-1">🔵 Front</p>
                    <a href={`${API_BASE}/api/staff/checks/${order.order_number}`} target="_blank" rel="noreferrer">
                      <img
                        src={`${API_BASE}/api/staff/checks/${order.order_number}`}
                        alt="Check front"
                        className="max-h-40 rounded-lg border border-stone-200 object-contain w-full hover:opacity-90 cursor-pointer"
                        onError={(e) => { e.target.style.display='none' }}
                      />
                    </a>
                  </div>
                  {order.has_check_back_image && (
                    <div>
                      <p className="text-xs text-stone-500 font-medium mb-1">🟢 Back</p>
                      <a href={`${API_BASE}/api/staff/checks/${order.order_number}/back`} target="_blank" rel="noreferrer">
                        <img
                          src={`${API_BASE}/api/staff/checks/${order.order_number}/back`}
                          alt="Check back"
                          className="max-h-40 rounded-lg border border-stone-200 object-contain w-full hover:opacity-90 cursor-pointer"
                          onError={(e) => { e.target.style.display='none' }}
                        />
                      </a>
                    </div>
                  )}
                </div>
                {order.payment_status === 'pending_review' && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={async () => {
                        if (!window.confirm(t.orders.approveConfirm)) return
                        const res = await staffFetch(`/api/staff/checks/${order.order_number}/approve`, {
                          method: 'POST'
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
                        const res = await staffFetch(`/api/staff/checks/${order.order_number}/reject`, {
                          method: 'POST'
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
const ProductRow = ({ product, categories, onSave, onDelete, onToggleStock, onImageUpdate, onMarkDirty, lang, t, isAdmin }) => {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [imageUploading, setImageUploading] = useState(false)
  const [currentImageUrl, setCurrentImageUrl] = useState(product.image_url || null)
  // Multi-image gallery state
  const [gallery, setGallery] = useState(product.images || [])
  const [galleryLoading, setGalleryLoading] = useState(false)
  const galleryFileInputRef = useRef(null)
  const [form, setForm] = useState({
    name: product.name,
    sku: product.sku,
    brand: product.brand || '',
    unit_size: product.unit_size || '',
    unit_price: product.unit_price,
    bulk_price: product.bulk_price || '',
    bulk_quantity: product.bulk_quantity || '',
    stock_quantity: product.stock_quantity ?? 0,
    category_id: product.category_id,
    description: product.description || '',
    offer_bulk: !!(product.bulk_price && product.bulk_quantity),
  })
  const [error, setError] = useState('')

  // Mark this row as having pending changes so the parent can show Save All
  const updateForm = (updates) => {
    setForm(prev => {
      const next = { ...prev, ...updates }
      if (onMarkDirty) onMarkDirty(product.id, next)
      return next
    })
  }

  // ── Single primary image upload (replaces image_url) ──────────────────────
  const handleImageUpload = async (file) => {
    if (!file) return
    setImageUploading(true)
    try {
      const formData = new FormData()
      formData.append('image', file)
      const res = await staffFetch(`/api/staff/products/${product.id}/image`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (data.image_url) {
        setCurrentImageUrl(data.image_url)
        if (onImageUpdate) onImageUpdate(product.id, data.image_url)
      }
    } catch {}
    finally { setImageUploading(false) }
  }

  const handleImageRemove = async () => {
    setImageUploading(true)
    try {
      await staffFetch(`/api/staff/products/${product.id}/image`, {
        method: 'DELETE',
      })
      setCurrentImageUrl(null)
      if (onImageUpdate) onImageUpdate(product.id, null)
    } catch {}
    finally { setImageUploading(false) }
  }

  // ── Multi-image gallery: add a new image ──────────────────────────────────
  const handleAddGalleryImage = async (file) => {
    if (!file) return
    setGalleryLoading(true)
    try {
      const formData = new FormData()
      formData.append('image', file)
      const res = await staffFetch(`/api/staff/products/${product.id}/images`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (data.product) {
        setGallery(data.product.images || [])
        setCurrentImageUrl(data.product.image_url)
        if (onImageUpdate) onImageUpdate(product.id, data.product.image_url)
      }
    } catch {}
    finally { setGalleryLoading(false) }
  }

  // ── Multi-image gallery: remove a specific image ──────────────────────────
  const handleRemoveGalleryImage = async (imgId) => {
    setGalleryLoading(true)
    try {
      const res = await staffFetch(`/api/staff/products/${product.id}/images/${imgId}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (data.product) {
        setGallery(data.product.images || [])
        setCurrentImageUrl(data.product.image_url)
        if (onImageUpdate) onImageUpdate(product.id, data.product.image_url)
      }
    } catch {}
    finally { setGalleryLoading(false) }
  }

  // ── Multi-image gallery: set an image as primary ──────────────────────────
  const handleSetPrimary = async (imgId) => {
    setGalleryLoading(true)
    try {
      const res = await staffFetch(`/api/staff/products/${product.id}/images/${imgId}/set-primary`, {
        method: 'POST',
      })
      const data = await res.json()
      if (data.product) {
        setCurrentImageUrl(data.product.image_url)
        if (onImageUpdate) onImageUpdate(product.id, data.product.image_url)
      }
    } catch {}
    finally { setGalleryLoading(false) }
  }

  const formatPrice = (p) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(p)
  const imgSrc = (url) => url && (url.startsWith('data:') || url.startsWith('http')) ? url : url ? `${API_BASE}${url}` : null

  const handleSave = async () => {
    setSaving(true)
    setError('')
    const result = await onSave(product.id, form)
    if (result?.error) setError(result.error)
    else setEditing(false)
    setSaving(false)
  }

  const handleCancel = () => {
    const reset = {
      name: product.name, sku: product.sku, brand: product.brand || '',
      unit_size: product.unit_size || '', unit_price: product.unit_price,
      bulk_price: product.bulk_price || '', bulk_quantity: product.bulk_quantity || '',
      stock_quantity: product.stock_quantity ?? 0,
      category_id: product.category_id, description: product.description || '',
      offer_bulk: !!(product.bulk_price && product.bulk_quantity),
    }
    setForm(reset)
    if (onMarkDirty) onMarkDirty(product.id, null)
    setEditing(false)
    setError('')
  }

  const inp = 'border border-stone-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-stone-400 w-full'
  const colCount = 11 // total columns in the products table

  if (editing) {
    return (
      <>
        {/* Main editing row */}
        <tr className="bg-blue-50 border-l-4 border-blue-500">
          <td className="px-3 py-2"><input className={inp} value={form.name} onChange={e => updateForm({name:e.target.value})} placeholder={t.products.productName} /></td>
          <td className="px-3 py-2"><input className={`${inp} font-mono uppercase`} value={form.sku} onChange={e => updateForm({sku:e.target.value})} placeholder={t.products.enterSku} /></td>
          <td className="px-3 py-2"><input className={inp} value={form.brand} onChange={e => updateForm({brand:e.target.value})} placeholder={t.products.enterBrand} /></td>
          <td className="px-3 py-2"><input className={inp} value={form.unit_size} onChange={e => updateForm({unit_size:e.target.value})} placeholder={t.products.enterSize} /></td>
          <td className="px-3 py-2">
            <select className={inp} value={form.category_id} onChange={e => updateForm({category_id:parseInt(e.target.value)})}>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </td>
          <td className="px-3 py-2">
            {isAdmin ? (
              <input className={inp} type="number" step="0.01" value={form.unit_price} onChange={e => updateForm({unit_price:e.target.value})} placeholder={t.products.enterPrice} />
            ) : (
              <span className="text-xs text-stone-500 italic" title={t.products.priceLockedAdmin}>{new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(form.unit_price)} 🔒</span>
            )}
          </td>
          <td className="px-3 py-2">
            {isAdmin ? (
              <div className="space-y-1">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={!!form.offer_bulk} onChange={e => updateForm({ offer_bulk: e.target.checked, bulk_price: e.target.checked ? form.bulk_price : '', bulk_quantity: e.target.checked ? form.bulk_quantity : '' })} className="w-3 h-3 rounded" />
                  <span className="text-xs text-stone-500">{lang === 'zh' ? '提供批量价' : 'Offer bulk'}</span>
                </label>
                {form.offer_bulk && <input className={inp} type="number" step="0.01" value={form.bulk_price} onChange={e => updateForm({bulk_price:e.target.value})} placeholder={t.products.enterPrice} />}
              </div>
            ) : (
              <span className="text-xs text-stone-500 italic" title={t.products.priceLockedAdmin}>{form.bulk_price ? new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(form.bulk_price) : '—'} 🔒</span>
            )}
          </td>
          <td className="px-3 py-2">
            {form.offer_bulk
              ? <input className={inp} type="number" value={form.bulk_quantity} onChange={e => updateForm({bulk_quantity:e.target.value})} placeholder={t.products.minQty} />
              : <span className="text-xs text-stone-400 italic">{lang === 'zh' ? '无批量' : 'No bulk'}</span>
            }
          </td>
          <td className="px-3 py-2">
            <input className={inp} type="number" min="0" value={form.stock_quantity}
              onChange={e => updateForm({stock_quantity: Math.max(0, parseInt(e.target.value) || 0)})}
              placeholder="0" title={lang === 'zh' ? '库存数量' : 'Units in stock'}
            />
          </td>
          <td className="px-3 py-2" colSpan={2}>
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

        {/* Description + Image Gallery expansion row */}
        <tr className="bg-blue-50 border-l-4 border-blue-400">
          <td colSpan={colCount} className="px-4 pb-4 pt-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">
                  {lang === 'zh' ? '产品描述' : 'Product Description'}
                </label>
                <textarea
                  className="border border-stone-200 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-stone-400 w-full resize-y"
                  rows={6}
                  value={form.description}
                  onChange={e => updateForm({description: e.target.value})}
                  placeholder={lang === 'zh' ? '输入产品详细描述（支持多行）...' : 'Enter a detailed product description (supports multiple lines)...'}
                />
                <p className="text-xs text-stone-400 mt-0.5">{form.description.length} {lang === 'zh' ? '字符' : 'characters'}</p>
              </div>

              {/* Image Gallery */}
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1 flex items-center gap-1">
                  <Images className="w-3.5 h-3.5" />
                  {lang === 'zh' ? '产品图片库' : 'Product Image Gallery'}
                  <span className="text-stone-400 font-normal ml-1">({gallery.length} {lang === 'zh' ? '张' : 'photo(s)'})</span>
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {gallery.map(img => (
                    <div key={img.id} className="relative group">
                      <img
                        src={imgSrc(img.image_url)}
                        alt="product"
                        className={`w-16 h-16 object-cover rounded-lg border-2 transition-all ${
                          currentImageUrl === img.image_url ? 'border-blue-500' : 'border-stone-200'
                        }`}
                      />
                      {/* Primary badge */}
                      {currentImageUrl === img.image_url && (
                        <span className="absolute top-0.5 left-0.5 bg-blue-500 text-white text-[9px] px-1 rounded">
                          {lang === 'zh' ? '主图' : 'Main'}
                        </span>
                      )}
                      {/* Hover controls */}
                      <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                        {currentImageUrl !== img.image_url && (
                          <button
                            onClick={() => handleSetPrimary(img.id)}
                            className="bg-white/90 hover:bg-yellow-100 text-yellow-600 p-1 rounded"
                            title={lang === 'zh' ? '设为主图' : 'Set as main image'}
                            disabled={galleryLoading}
                          >
                            <Star className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveGalleryImage(img.id)}
                          className="bg-white/90 hover:bg-red-100 text-red-500 p-1 rounded"
                          title={lang === 'zh' ? '删除' : 'Remove'}
                          disabled={galleryLoading}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Add photo button */}
                  <button
                    type="button"
                    onClick={() => galleryFileInputRef.current && galleryFileInputRef.current.click()}
                    disabled={galleryLoading}
                    className={`w-16 h-16 rounded-lg border-2 border-dashed flex flex-col items-center justify-center transition-all ${
                      galleryLoading ? 'border-stone-200 text-stone-300 cursor-not-allowed' : 'border-blue-300 text-blue-500 hover:bg-blue-50 cursor-pointer'
                    }`}
                  >
                    {galleryLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span className="text-[9px] mt-0.5">{lang === 'zh' ? '添加' : 'Add'}</span>
                      </>
                    )}
                  </button>
                  <input
                    ref={galleryFileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
                    disabled={galleryLoading}
                    onChange={e => {
                      handleAddGalleryImage(e.target.files[0])
                      e.target.value = '' // reset so same file can be re-selected
                    }}
                  />
                </div>
                <p className="text-xs text-stone-400">
                  {lang === 'zh'
                    ? '点击图片可设为主图或删除。主图显示在产品列表和网站上。'
                    : 'Hover over an image to set it as the main display image or remove it. The main image appears on the product listing and website.'}
                </p>
              </div>

            </div>
          </td>
        </tr>
      </>
    )
  }

  return (
    <tr className={`hover:bg-stone-50 transition-colors ${!product.in_stock ? 'opacity-60' : ''}`}>
      {/* Image cell — shows primary image with gallery count badge */}
      <td className="px-3 py-2.5">
        <div className="flex flex-col items-center gap-1" style={{minWidth: 64}}>
          <div className="relative">
            {currentImageUrl ? (
              <img
                src={imgSrc(currentImageUrl)}
                alt={product.name}
                className="w-12 h-12 object-cover rounded-lg border border-stone-200 bg-stone-50"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg border border-dashed border-stone-300 bg-stone-50 flex items-center justify-center">
                <Package className="w-4 h-4 text-stone-300" />
              </div>
            )}
            {gallery.length > 1 && (
              <span className="absolute -bottom-1 -right-1 bg-blue-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {gallery.length}
              </span>
            )}
          </div>
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-blue-500 hover:text-blue-700 underline whitespace-nowrap"
          >
            {lang === 'zh' ? '编辑图片' : 'Edit photos'}
          </button>
        </div>
      </td>
      <td className="px-3 py-2.5">
        <div>
          <div className="font-medium text-stone-900 text-sm">{product.name}</div>
          {product.description && (
            <div className="text-stone-400 text-xs mt-0.5 line-clamp-1" title={product.description}>
              {product.description.length > 60 ? product.description.slice(0, 60) + '…' : product.description}
            </div>
          )}
        </div>
      </td>
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
        <div className="flex flex-col items-start gap-0.5">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            product.stock_quantity > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {product.stock_quantity > 0 ? `${product.stock_quantity} ${lang === 'zh' ? '件' : 'units'}` : (lang === 'zh' ? '无库存' : 'Out of stock')}
          </span>
        </div>
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
    offer_bulk: false,
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
        const imgRes = await staffFetch(`/api/staff/products/upload-image`, {
          method: 'POST',
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
            <div className="col-span-2">
              <label className="flex items-center gap-2 cursor-pointer mb-2">
                <input type="checkbox" checked={form.offer_bulk} onChange={e => setForm(p => ({ ...p, offer_bulk: e.target.checked, bulk_price: e.target.checked ? p.bulk_price : '', bulk_quantity: e.target.checked ? p.bulk_quantity : '' }))} className="w-4 h-4 rounded" />
                <span className="text-sm font-medium text-stone-700">{t.products.bulkPrice ? `${t.products.bulkPrice} (${t.products.bulkQty})` : 'Offer Bulk Pricing'}</span>
              </label>
              {form.offer_bulk && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-stone-500 mb-1">{t.products.bulkPrice} ($)</label>
                    <input className={inp} type="number" step="0.01" min="0" value={form.bulk_price} onChange={e=>setForm(p=>({...p,bulk_price:e.target.value}))} placeholder={t.products.enterPrice} />
                  </div>
                  <div>
                    <label className="block text-xs text-stone-500 mb-1">{t.products.bulkQty}</label>
                    <input className={inp} type="number" min="1" value={form.bulk_quantity} onChange={e=>setForm(p=>({...p,bulk_quantity:e.target.value}))} placeholder={t.products.minQty} />
                  </div>
                </div>
              )}
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

// ─── Combined Invoices Tab (Invoice Builder + Bill Analyzer) ─────────────────
const CombinedInvoicesTab = ({ t, lang, isAdmin }) => {
  const [subTab, setSubTab] = useState('invoices')
  const subTabs = [
    { id: 'invoices', label: lang === 'zh' ? '发票生成' : 'Custom Invoices', icon: FileText },
    ...(isAdmin ? [{ id: 'billAnalyzer', label: lang === 'zh' ? '账单分析' : 'Bill Analyzer', icon: TrendingDown }] : []),
  ]
  return (
    <div>
      <div className="border-b border-stone-200 bg-white px-4 sm:px-6">
        <div className="flex gap-0">
          {subTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                subTab === tab.id
                  ? 'border-stone-900 text-stone-900'
                  : 'border-transparent text-stone-400 hover:text-stone-600'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
      {subTab === 'invoices' && <InvoicesTab t={t} lang={lang} />}
      {subTab === 'billAnalyzer' && isAdmin && <BillAnalyzerTab t={t.billAnalyzer} />}
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
  const [dbImporting, setDbImporting] = useState(false)
  const [dbMessage, setDbMessage] = useState(null)
  const [customerImporting, setCustomerImporting] = useState(false)
  const [customerMessage, setCustomerMessage] = useState(null)
  const [pendingProductEdits, setPendingProductEdits] = useState({}) // { productId: formData }
  const [savingAllProducts, setSavingAllProducts] = useState(false)
  const [saveAllResult, setSaveAllResult] = useState(null)
  const [inventoryRefreshKey, setInventoryRefreshKey] = useState(0)
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateOrder, setShowCreateOrder] = useState(false)
  const [lang, setLang] = useState(() => localStorage.getItem('staffLang') || 'en')
  const [statsDateRange, setStatsDateRange] = useState('all')
  const [customerOrdersView, setCustomerOrdersView] = useState(null) // { name, orders }
  const [customerOrdersLoading, setCustomerOrdersLoading] = useState(false)
  const [expandedCustomer, setExpandedCustomer] = useState(null) // customer id for address expansion

  const t = staffPortalTranslations[lang]

  const toggleLang = () => {
    const next = lang === 'en' ? 'zh' : 'en'
    setLang(next)
    localStorage.setItem('staffLang', next)
  }

  const formatPrice = (p) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(p)

  // Check if already logged in (via JWT token or session cookie)
  useEffect(() => {
    staffFetch('/api/staff/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setStaff(d) })
      .catch(() => {})
  }, [])

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const url = statusFilter ? `${API_BASE}/api/staff/orders?status=${statusFilter}` : `${API_BASE}/api/staff/orders`
      const res = await staffFetch(url)
      const data = await res.json()
      setOrders(Array.isArray(data) ? data : [])
    } catch {}
    finally { setLoading(false) }
  }, [statusFilter])

  const fetchStats = useCallback(async (range) => {
    try {
      const r = range || statsDateRange
      const url = r && r !== 'all' ? `${API_BASE}/api/staff/stats?range=${r}` : `${API_BASE}/api/staff/stats`
      const res = await staffFetch(url)
      const data = await res.json()
      setStats(data)
    } catch {}
  }, [statsDateRange])

  const fetchCustomerOrders = async (customerName) => {
    setCustomerOrdersLoading(true)
    try {
      const res = await staffFetch(`/api/staff/orders`, {})
      const data = await res.json()
      const filtered = Array.isArray(data) ? data.filter(o =>
        (o.customer_name || '').toLowerCase() === customerName.toLowerCase() ||
        (o.customer_company || '').toLowerCase() === customerName.toLowerCase()
      ) : []
      setCustomerOrdersView({ name: customerName, orders: filtered })
    } catch {}
    setCustomerOrdersLoading(false)
  }

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await staffFetch(`/api/staff/customers`, {})
      const data = await res.json()
      setCustomers(Array.isArray(data) ? data : [])
    } catch {}
  }, [])

  const fetchInventory = useCallback(async () => {
    try {
      const res = await staffFetch(`/api/staff/inventory`, {})
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
      const res = await staffFetch(url)
      const data = await res.json()
      setProducts(Array.isArray(data) ? data : [])
    } catch {}
  }, [productSearch, productCategoryFilter])

  const fetchProductCategories = useCallback(async () => {
    try {
      const res = await staffFetch(`/api/staff/categories`, {})
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
  }, [staff, activeTab, fetchOrders, fetchStats, fetchCustomers, fetchInventory, fetchProducts, fetchProductCategories, inventoryRefreshKey])

  useEffect(() => {
    if (activeTab === 'products') fetchProducts()
  }, [productSearch, productCategoryFilter, activeTab, fetchProducts])

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      const res = await staffFetch(`/api/staff/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()
      fetchOrders()
      fetchStats()
      // Show refund notification if a Stripe refund was processed
      if (newStatus === 'cancelled' && data.refund) {
        if (data.refund.error) {
          alert(
            lang === 'zh'
              ? `订单已取消，但 Stripe 退款失败：${data.refund.error}\n请在 Stripe 控制台手动处理退款。`
              : `Order cancelled, but Stripe refund failed: ${data.refund.error}\nPlease process the refund manually in the Stripe dashboard.`
          )
        } else {
          alert(
            lang === 'zh'
              ? `订单已取消。已向客户退款 $${Number(data.refund.amount).toFixed(2)}（退款编号：${data.refund.refund_id}）。`
              : `Order cancelled. A refund of $${Number(data.refund.amount).toFixed(2)} has been issued to the customer (Refund ID: ${data.refund.refund_id}).`
          )
        }
      }
    } catch {}
  }

  const handleNotesUpdate = async (orderId, notes, assignedTo) => {
    try {
      await staffFetch(`/api/staff/orders/${orderId}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_notes: notes, assigned_to: assignedTo }),
      })
      fetchOrders()
    } catch {}
  }

  const handleDeleteOrder = async (orderId, orderNumber) => {
    const confirmMsg = lang === 'zh'
      ? `确定要永久删除订单 ${orderNumber} 吗？此操作无法撤销。`
      : `Permanently delete order ${orderNumber}? This cannot be undone.`
    if (!window.confirm(confirmMsg)) return
    try {
      await staffFetch(`/api/staff/orders/${orderId}`, { method: 'DELETE' })
      fetchOrders()
      fetchStats()
    } catch (e) {
      alert('Failed to delete order: ' + e.message)
    }
  }

  const handleDeleteCustomer = async (userId, name) => {
    const confirmMsg = lang === 'zh'
      ? `确定要永久删除客户 "${name}" 吗？其订单记录将被保留但取消关联。`
      : `Permanently delete customer "${name}"? Their order history will be kept but unlinked.`
    if (!window.confirm(confirmMsg)) return
    try {
      await staffFetch(`/api/staff/customers/${userId}`, { method: 'DELETE' })
      fetchCustomers()
      fetchStats()
    } catch (e) {
      alert('Failed to delete customer: ' + e.message)
    }
  }

  const handleInventoryToggle = async (productId, inStock) => {
    try {
      await staffFetch(`/api/staff/inventory/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ in_stock: inStock }),
      })
      fetchInventory()
    } catch {}
  }

  const [inventoryStockEdits, setInventoryStockEdits] = useState({})
  const [inventoryStockSaving, setInventoryStockSaving] = useState(false)
  const handleSaveAllInventory = async () => {
    const edits = Object.entries(inventoryStockEdits)
    if (edits.length === 0) return
    setInventoryStockSaving(true)
    try {
      const results = await Promise.all(edits.map(([productId, qty]) =>
        staffFetch(`/api/staff/inventory/${productId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stock_quantity: parseInt(qty, 10) || 0 }),
        }).then(r => r.json())
      ))
      setInventoryStockEdits({})
      // Force a fresh fetch by incrementing the refresh key
      setInventoryRefreshKey(k => k + 1)
    } catch (e) { console.error('Inventory save error', e) }
    setInventoryStockSaving(false)
  }

  const [inventoryImageUploading, setInventoryImageUploading] = useState({})

  const handleInventoryImageUpload = async (productId, file) => {
    if (!file) return
    setInventoryImageUploading(s => ({ ...s, [productId]: true }))
    try {
      const formData = new FormData()
      formData.append('image', file)
      const res = await staffFetch(`/api/staff/products/${productId}/image`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (data.success) { fetchInventory(); fetchProducts() }
    } catch {}
    setInventoryImageUploading(s => ({ ...s, [productId]: false }))
  }

  const handleInventoryImageRemove = async (productId) => {
    try {
      await staffFetch(`/api/staff/products/${productId}/image`, {
        method: 'DELETE',
      })
      fetchInventory()
      fetchProducts()
    } catch {}
  }

  const handleProductSave = async (productId, form) => {
    try {
      const res = await staffFetch(`/api/staff/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.success) { fetchProducts(); return null }
      return { error: data.error || t.common.error }
    } catch { return { error: t.common.error } }
  }

  const handleProductAdd = async (form) => {
    try {
      const res = await staffFetch(`/api/staff/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const res = await staffFetch(`/api/staff/products/${productId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.blocked) {
        // Inventory remaining — show a clear warning
        const msg = lang === 'zh'
          ? `无法删除「${name}」——库存中还有 ${data.stock_quantity} 件商品。请先将库存数量调整为 0。`
          : `Cannot delete "${name}" — there are still ${data.stock_quantity} unit(s) in inventory. Please set the stock quantity to 0 first.`
        alert(msg)
        return
      }
      if (data.success) fetchProducts()
    } catch {}
  }

  // Called by ProductRow whenever a field changes
  const handleMarkProductDirty = (productId, formData) => {
    setPendingProductEdits(prev => {
      if (formData === null) {
        // null means the row was cancelled — remove from pending
        const next = { ...prev }
        delete next[productId]
        return next
      }
      return { ...prev, [productId]: { id: productId, ...formData } }
    })
  }

  const handleSaveAllProducts = async () => {
    const items = Object.values(pendingProductEdits)
    if (items.length === 0) return
    setSavingAllProducts(true)
    setSaveAllResult(null)
    try {
      const res = await staffFetch(`/api/staff/products/bulk-save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: items }),
      })
      const data = await res.json()
      if (data.success) {
        setPendingProductEdits({})
        setSaveAllResult({ type: 'success', text: lang === 'zh'
          ? `✅ 已保存 ${data.saved_count} 个产品。${data.error_count > 0 ? `错误：${data.errors.map(e=>e.error).join('; ')}` : ''}`
          : `✅ Saved ${data.saved_count} product${data.saved_count !== 1 ? 's' : ''}. ${data.error_count > 0 ? `Errors: ${data.errors.map(e=>e.error).join('; ')}` : ''}`
        })
        fetchProducts()
        fetchInventory()
      } else {
        setSaveAllResult({ type: 'error', text: `❌ ${data.error || t.common.error}` })
      }
    } catch {
      setSaveAllResult({ type: 'error', text: `❌ ${t.common.error}` })
    }
    finally { setSavingAllProducts(false) }
  }

  const handleProductToggleStock = async (productId) => {
    try {
      await staffFetch(`/api/staff/products/${productId}/toggle-stock`, { method: 'POST' })
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
      const res = await staffFetch(`/api/staff/products/import-csv`, {
        method: 'POST',
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

  const handleDbExport = async () => {
    try {
      const res = await staffFetch('/api/staff/export-db')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `lld-products-backup-${new Date().toISOString().slice(0,10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch { alert(t.products.backupError) }
  }

  const handleDbImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setDbImporting(true)
    setDbMessage(null)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await staffFetch('/api/staff/import-db', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.success) {
        setDbMessage({ type: 'success', text: `✅ ${data.message}` })
        fetchProducts()
      } else {
        setDbMessage({ type: 'error', text: `❌ ${data.error || t.products.backupError}` })
      }
    } catch { setDbMessage({ type: 'error', text: `❌ ${t.products.backupError}` }) }
    finally { setDbImporting(false); e.target.value = '' }
  }

  const handleCustomerExport = async () => {
    try {
      const res = await staffFetch('/api/staff/customers/export-csv')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `lld-customers-${new Date().toISOString().slice(0,10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch { alert(t.customers.importError) }
  }

  const handleCustomerTemplateDownload = async () => {
    try {
      const res = await staffFetch('/api/staff/customers/csv-template')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'lld_customers_template.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch { alert(t.customers.importError) }
  }

  const handleCustomerImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setCustomerImporting(true)
    setCustomerMessage(null)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await staffFetch('/api/staff/customers/import-csv', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.success) {
        const parts = [
          `${data.created} ${t.customers.created}`,
          `${data.updated} ${t.customers.updated}`,
          `${data.skipped} ${t.customers.skipped}`,
        ]
        setCustomerMessage({ type: 'success', text: `✅ ${t.customers.importSuccess}: ${parts.join(', ')}` })
        fetchCustomers()
      } else {
        setCustomerMessage({ type: 'error', text: `❌ ${data.error || t.customers.importError}` })
      }
    } catch { setCustomerMessage({ type: 'error', text: `❌ ${t.customers.importError}` }) }
    finally { setCustomerImporting(false); e.target.value = '' }
  }

  const handleLogout = async () => {
    await staffFetch(`/api/staff/logout`, { method: 'POST' })
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
    ...(isAdmin ? [{ id: 'staffMgmt', label: t.tabs.staffMgmt, icon: Shield, adminOnly: true }, { id: 'apiKeys', label: t.tabs.apiKeys, icon: Key, adminOnly: true }] : []),
  ]

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Top Nav */}
      <div className="bg-white border-b border-stone-200 text-stone-900 px-3 sm:px-6 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 bg-stone-900 rounded-lg flex items-center justify-center font-bold text-sm text-white flex-shrink-0">RS</div>
          <div className="min-w-0">
            <span className="font-semibold text-stone-900 text-sm sm:text-base truncate block">RS LLD <span className="hidden sm:inline">{t.header.title}</span></span>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
          {stats?.needs_attention > 0 && (
            <div className="hidden sm:flex items-center gap-1 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              <AlertCircle className="w-3 h-3" /> {stats.needs_attention} {lang === 'zh' ? '需处理' : 'need attention'}
            </div>
          )}
          <LangToggle lang={lang} onToggle={toggleLang} />
          <span className="hidden sm:inline text-stone-500 text-sm truncate max-w-[120px]">👤 {staff.full_name || staff.username}</span>
          <Button size="sm" variant="ghost" onClick={handleLogout} className="text-stone-500 hover:text-stone-900 text-xs px-2">
            <LogOut className="w-3 h-3 sm:mr-1" /> <span className="hidden sm:inline">{t.header.logout}</span>
          </Button>
        </div>
      </div>
      {/* Tab Bar - scrollable on mobile */}
      <div className="bg-white border-b border-stone-200 px-2 sm:px-6">
        <div className="flex gap-0 overflow-x-auto" style={{WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none'}}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium border-b-2 transition-all whitespace-nowrap flex-shrink-0 ${
                activeTab === tab.id
                  ? 'border-stone-900 text-stone-900'
                  : 'border-transparent text-stone-400 hover:text-stone-700'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>{tab.label}</span>
              {tab.adminOnly && (
                <span className="text-xs bg-stone-900 text-white px-1 py-0.5 rounded-full font-semibold">A</span>
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
                    onDelete={handleDeleteOrder}
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
            {customerOrdersView ? (
              <div>
                <button onClick={() => setCustomerOrdersView(null)}
                  className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-900 mb-4">
                  {t.customers.backToCustomers}
                </button>
                <h2 className="text-xl font-bold text-stone-900 mb-4">{t.customers.ordersFor} {customerOrdersView.name}</h2>
                {customerOrdersLoading ? (
                  <div className="text-center py-12"><RefreshCw className="w-8 h-8 animate-spin text-stone-400 mx-auto" /></div>
                ) : customerOrdersView.orders.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-xl border border-stone-100">
                    <ClipboardList className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-stone-500">{t.customers.noOrdersForCustomer}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {customerOrdersView.orders.map(order => (
                      <OrderCard key={order.id} order={order} onStatusUpdate={handleStatusUpdate} onNotesUpdate={handleNotesUpdate} t={t} lang={lang} />
                    ))}
                  </div>
                )}
              </div>
            ) : (
            <div>
              {/* ── Customers toolbar ── */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h2 className="text-xl font-bold text-stone-900">{t.customers.title}</h2>
                <div className="flex flex-wrap gap-2">
                  {/* Download template */}
                  <button onClick={handleCustomerTemplateDownload} className="flex items-center gap-2 px-3 py-2 border border-stone-200 rounded-lg text-sm text-stone-700 hover:bg-stone-50">
                    <Download className="w-4 h-4" /> {t.customers.downloadTemplate}
                  </button>
                  {/* Export CSV */}
                  <button onClick={handleCustomerExport} className="flex items-center gap-2 px-3 py-2 border border-stone-200 rounded-lg text-sm text-stone-700 hover:bg-stone-50">
                    <Download className="w-4 h-4" /> {t.customers.exportCsv}
                  </button>
                  {/* Import CSV */}
                  <label className={`flex items-center gap-2 px-3 py-2 border border-blue-300 bg-blue-50 rounded-lg text-sm text-blue-800 hover:bg-blue-100 cursor-pointer ${customerImporting ? 'opacity-50' : ''}`}>
                    {customerImporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {customerImporting ? t.customers.importing : t.customers.importCsv}
                    <input type="file" accept=".csv" className="hidden" onChange={handleCustomerImport} disabled={customerImporting} />
                  </label>
                </div>
              </div>
              {/* Import result message */}
              {customerMessage && (
                <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
                  customerMessage.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                  {customerMessage.text}
                  <button onClick={() => setCustomerMessage(null)} className="ml-3 text-xs underline opacity-70 hover:opacity-100">Dismiss</button>
                </div>
              )}
            {customers.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-stone-100">
                <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-stone-500">{t.customers.noCustomers}</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-stone-100 overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead className="bg-stone-50 border-b border-stone-100">
                    <tr>
                      {[t.customers.name, t.customers.company, t.customers.email, t.customers.phone, t.customers.orders, t.customers.spent, t.customers.joined, ''].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {customers.map(c => (
                      <>
                        <tr key={c.id} className="hover:bg-stone-50 transition-colors cursor-pointer" onClick={() => setExpandedCustomer(expandedCustomer === c.id ? null : c.id)}>
                          <td className="px-4 py-3 font-medium text-stone-900">{c.username}</td>
                          <td className="px-4 py-3 text-stone-600">{c.company_name || '—'}</td>
                          <td className="px-4 py-3 text-stone-600">{c.email}</td>
                          <td className="px-4 py-3 text-stone-600">{c.phone || '—'}</td>
                          <td className="px-4 py-3">
                            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">{c.order_count}</span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-stone-900">{formatPrice(c.total_spent)}</td>
                          <td className="px-4 py-3 text-stone-500 text-xs">{new Date(c.created_at).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US')}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={e => { e.stopPropagation(); fetchCustomerOrders(c.company_name || c.username) }}
                                className="text-xs px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors">
                                {t.customers.viewOrders}
                              </button>
                              <button
                                onClick={e => { e.stopPropagation(); handleDeleteCustomer(c.id, c.username) }}
                                className="text-xs px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors flex items-center gap-1">
                                <Trash2 className="w-3 h-3" /> {lang === 'zh' ? '删除' : 'Delete'}
                              </button>
                            </div>
                          </td>
                        </tr>
                        {expandedCustomer === c.id && (
                          <tr key={`${c.id}-addr`} className="bg-blue-50">
                            <td colSpan={8} className="px-6 py-4">
                              <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">{t.customers.shippingAddress}</p>
                                  <p className="text-sm text-stone-800">{c.shipping_address || <span className="text-stone-400 italic">{t.customers.noAddress}</span>}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">{t.customers.billingAddress}</p>
                                  <p className="text-sm text-stone-800">{c.billing_address || <span className="text-stone-400 italic">{t.customers.noAddress}</span>}</p>
                                </div>
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
            )}
          </div>
        )}

        {/* ── PRODUCTS TAB ── */}
        {activeTab === 'products' && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <h2 className="text-xl font-bold text-stone-900">{t.products.title}</h2>
              <div className="flex flex-wrap gap-2 items-center">
                <button onClick={handleCsvExport} className="flex items-center gap-2 px-3 py-2 border border-stone-200 rounded-lg text-sm text-stone-700 hover:bg-stone-50">
                  <Download className="w-4 h-4" /> {t.products.exportCsv}
                </button>
                <label className={`flex items-center gap-2 px-3 py-2 border border-stone-200 rounded-lg text-sm text-stone-700 hover:bg-stone-50 cursor-pointer ${csvImporting ? 'opacity-50' : ''}`}>
                  {csvImporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {csvImporting ? t.products.importing : t.products.importCsv}
                  <input type="file" accept=".csv" className="hidden" onChange={handleCsvImport} disabled={csvImporting} />
                </label>
                {/* ── DB Backup / Restore ── */}
                <button onClick={handleDbExport} className="flex items-center gap-2 px-3 py-2 border border-emerald-300 bg-emerald-50 rounded-lg text-sm text-emerald-800 hover:bg-emerald-100">
                  <Download className="w-4 h-4" /> {t.products.exportDb}
                </button>
                <label className={`flex items-center gap-2 px-3 py-2 border border-emerald-300 bg-emerald-50 rounded-lg text-sm text-emerald-800 hover:bg-emerald-100 cursor-pointer ${dbImporting ? 'opacity-50' : ''}`}>
                  {dbImporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {dbImporting ? t.products.importingDb : t.products.importDb}
                  <input type="file" accept=".json" style={{opacity:0,position:'absolute',width:0,height:0}} onChange={handleDbImport} disabled={dbImporting} />
                </label>
                <button onClick={() => setShowAddProduct(true)} className="flex items-center gap-2 px-4 py-2 bg-stone-900 hover:bg-stone-700 text-white rounded-lg text-sm font-medium">
                  <Plus className="w-4 h-4" /> {t.products.addProduct}
                </button>
                {/* ── Save All Changes Button (always visible, greyed when no pending edits) ── */}
                <button
                  onClick={handleSaveAllProducts}
                  disabled={savingAllProducts || Object.keys(pendingProductEdits).length === 0}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    Object.keys(pendingProductEdits).length > 0
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                      : 'bg-stone-100 text-stone-400 cursor-not-allowed'
                  }`}
                >
                  {savingAllProducts
                    ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> {lang === 'zh' ? '保存中...' : 'Saving...'}</>
                    : <><Save className="w-3.5 h-3.5" /> {lang === 'zh' ? `保存所有更改${Object.keys(pendingProductEdits).length > 0 ? ` (${Object.keys(pendingProductEdits).length})` : ''}` : `Save All Changes${Object.keys(pendingProductEdits).length > 0 ? ` (${Object.keys(pendingProductEdits).length})` : ''}`}</>
                  }
                </button>
              </div>
            </div>

            {saveAllResult && (
              <div className={`mb-4 p-3 rounded-lg text-sm ${saveAllResult.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                {saveAllResult.text}
                <button onClick={() => setSaveAllResult(null)} className="ml-2 opacity-60 hover:opacity-100"><X className="w-3 h-3 inline" /></button>
              </div>
            )}

            {csvMessage && (
              <div className={`mb-4 p-3 rounded-lg text-sm ${csvMessage.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                {csvMessage.text}
                <button onClick={() => setCsvMessage(null)} className="ml-2 opacity-60 hover:opacity-100"><X className="w-3 h-3 inline" /></button>
              </div>
            )}
            {dbMessage && (
              <div className={`mb-4 p-3 rounded-lg text-sm ${dbMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                {dbMessage.text}
                <button onClick={() => setDbMessage(null)} className="ml-2 opacity-60 hover:opacity-100"><X className="w-3 h-3 inline" /></button>
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
              <table className="w-full text-sm min-w-[900px]">
                <thead className="bg-stone-50 border-b border-stone-100">
                  <tr>
                    {[lang === 'zh' ? '图片' : 'Image', t.products.name, t.products.sku, t.products.brand, t.products.size, t.products.category, t.products.unitPrice, t.products.bulkPrice, t.products.bulkQty, lang === 'zh' ? '库存数量' : 'Inventory', t.products.actions].map(h => (
                      <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {products.length === 0 ? (
                    <tr><td colSpan={11} className="text-center py-12 text-stone-400">{lang === 'zh' ? '未找到产品' : 'No products found'}</td></tr>
                  ) : products.map(p => (
                    <ProductRow
                      key={p.id}
                      product={p}
                      categories={productCategories}
                      onSave={handleProductSave}
                      onDelete={handleProductDelete}
                      onToggleStock={handleProductToggleStock}
                      onImageUpdate={(id, url) => { setProducts(prev => prev.map(pr => pr.id === id ? {...pr, image_url: url} : pr)); fetchInventory() }}
                      onMarkDirty={handleMarkProductDirty}
                      lang={lang}
                      t={t}
                      isAdmin={isAdmin}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-stone-400 mt-2">{products.length} {lang === 'zh' ? '个产品。点击 ✏️ 图标内联编辑，编辑后点击《保存所有更改》同步到库存和产品目录。' : 'products shown. Click the ✏️ edit icon to edit inline. When done, click "Save All Changes" to sync updates across the product catalog and inventory.'}</p>

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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-stone-900">{t.inventory.title}</h2>
              <button
                onClick={handleSaveAllInventory}
                disabled={inventoryStockSaving || Object.keys(inventoryStockEdits).length === 0}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  Object.keys(inventoryStockEdits).length > 0
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                    : 'bg-stone-100 text-stone-400 cursor-not-allowed'
                }`}
              >
                {inventoryStockSaving ? (
                  <><div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" /> {lang === 'zh' ? '保存中...' : 'Saving...'}</>
                ) : (
                  <>{lang === 'zh' ? `更新库存${Object.keys(inventoryStockEdits).length > 0 ? ` (${Object.keys(inventoryStockEdits).length})` : ''}` : `Update Inventory${Object.keys(inventoryStockEdits).length > 0 ? ` (${Object.keys(inventoryStockEdits).length})` : ''}`}</>
                )}
              </button>
            </div>
            <div className="bg-white rounded-xl border border-stone-100 overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-stone-50 border-b border-stone-100">
                  <tr>
                    {[t.inventory.image, t.inventory.name, t.inventory.sku, t.inventory.brand, t.inventory.price, t.inventory.bulkPrice, t.inventory.bulkQty, t.inventory.stockCount, t.inventory.status, t.inventory.action].map(h => (
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
                              src={p.image_url.startsWith('data:') || p.image_url.startsWith('http') ? p.image_url : `${API_BASE}${p.image_url}`}
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
                      {/* Stock Count cell */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1" style={{minWidth: 90}}>
                          <input
                            type="number"
                            min="0"
                            value={inventoryStockEdits[p.id] !== undefined ? inventoryStockEdits[p.id] : (p.stock_quantity ?? 0)}
                            onChange={e => setInventoryStockEdits(s => ({ ...s, [p.id]: e.target.value }))}
                            className="w-14 border border-stone-200 rounded px-1.5 py-0.5 text-xs text-center focus:ring-1 focus:ring-blue-400 focus:border-transparent"
                          />
                          {inventoryStockEdits[p.id] !== undefined && (
                            <span className="text-xs text-blue-500 font-medium">✎</span>
                          )}
                          {(p.stock_quantity !== null && p.stock_quantity !== undefined && p.stock_quantity <= 5 && p.stock_quantity > 0) && inventoryStockEdits[p.id] === undefined && (
                            <span className="text-xs text-orange-500 font-medium">{t.inventory.lowStock}</span>
                          )}
                        </div>
                      </td>
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

        {/* ── INVOICES TAB (with Bill Analyzer sub-tab) ── */}
        {activeTab === 'invoices' && (
          <CombinedInvoicesTab t={t} lang={lang} isAdmin={isAdmin} />
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
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <h2 className="text-xl font-bold text-stone-900">{t.stats.title}</h2>
              <div className="flex gap-2">
                {['all', '7d', '30d', 'month'].map(r => (
                  <button
                    key={r}
                    onClick={() => { setStatsDateRange(r); fetchStats(r) }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      statsDateRange === r
                        ? 'bg-stone-900 text-white border-stone-900'
                        : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    {t.stats[`range_${r}`]}
                  </button>
                ))}
              </div>
            </div>
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
