import { useState, useEffect, useCallback } from 'react'
import { staffFetch } from '@/lib/staffApi'
import { Users, Plus, Edit3, Trash2, RefreshCw, X, Check, Shield, UserCheck, UserX, Key, Eye, EyeOff } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || ''

const ROLE_CONFIG = {
  admin:     { color: 'text-purple-700', bg: 'bg-purple-50',  border: 'border-purple-200' },
  manager:   { color: 'text-stone-900',  bg: 'bg-blue-50',   border: 'border-blue-200' },
  staff:     { color: 'text-stone-700',  bg: 'bg-stone-100', border: 'border-stone-200' },
  sales_rep:        { color: 'text-green-700',  bg: 'bg-green-50',   border: 'border-green-200' },
  shipping_manager: { color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
}

const EMPTY_FORM = {
  username: '', email: '', first_name: '', last_name: '', role: 'staff', password: '', confirm_password: '',
}

// ─── Create / Edit Staff Modal ────────────────────────────────────────────────
const StaffFormModal = ({ user, t, onSave, onClose }) => {
  const isEdit = !!user
  const [form, setForm] = useState(
    isEdit
      ? {
          username: user.username,
          email: user.email,
          first_name: user.first_name || (user.full_name ? user.full_name.split(' ')[0] : ''),
          last_name: user.last_name || (user.full_name ? user.full_name.split(' ').slice(1).join(' ') : ''),
          role: user.role,
          password: '',
          confirm_password: '',
        }
      : { ...EMPTY_FORM }
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)

  const inp = 'border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-stone-400 w-full'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.username.trim()) { setError(t.staffMgmt.errorUsernameRequired); return }
    if (!isEdit && !form.password) { setError(t.staffMgmt.errorPasswordRequired); return }
    if (form.password && form.password.length < 6) { setError(t.staffMgmt.errorPasswordShort); return }
    if (form.password && form.password !== form.confirm_password) { setError(t.staffMgmt.errorPasswordMismatch); return }

    setSaving(true)
    const firstName = form.first_name.trim()
    const lastName = form.last_name.trim()
    const payload = {
      username: form.username.trim(),
      email: form.email.trim(),
      first_name: firstName,
      last_name: lastName,
      full_name: [firstName, lastName].filter(Boolean).join(' '),
      role: form.role,
    }
    if (form.password) payload.password = form.password

    try {
      const path = isEdit ? `/api/staff/users/${user.id}` : `/api/staff/users`
      const method = isEdit ? 'PUT' : 'POST'
      const res = await staffFetch(path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (res.ok) { onSave(data) }
      else { setError(data.error || t.common.error) }
    } catch { setError(t.common.error) }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-stone-900/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-stone-100">
          <h2 className="text-lg font-bold text-stone-900">
            {isEdit ? t.staffMgmt.editStaff : t.staffMgmt.createStaff}
          </h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 p-1 rounded-lg hover:bg-stone-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">{t.staffMgmt.username} *</label>
            <input
              className={inp}
              value={form.username}
              onChange={e => setForm(p => ({ ...p, username: e.target.value.toLowerCase().replace(/\s/g, '') }))}
              placeholder={t.staffMgmt.usernamePlaceholder}
              disabled={isEdit}
            />
            {isEdit && <p className="text-xs text-stone-400 mt-1">{t.staffMgmt.usernameCannotChange}</p>}
          </div>

          {/* First Name / Last Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t.staffMgmt.firstName || 'First Name'}</label>
              <input
                className={inp}
                value={form.first_name}
                onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))}
                placeholder={t.staffMgmt.firstNamePlaceholder || 'John'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t.staffMgmt.lastName || 'Last Name'}</label>
              <input
                className={inp}
                value={form.last_name}
                onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))}
                placeholder={t.staffMgmt.lastNamePlaceholder || 'Smith'}
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">{t.staffMgmt.email}</label>
            <input
              className={inp}
              type="email"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              placeholder={t.staffMgmt.emailPlaceholder}
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">{t.staffMgmt.role} *</label>
            <div className="flex gap-3">
              {['sales_rep', 'shipping_manager', 'staff', 'manager', 'admin'].map(r => {
                const cfg = ROLE_CONFIG[r]
                const label = t.staffMgmt[`role_${r}`]
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, role: r }))}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                      form.role === r
                        ? `${cfg.bg} ${cfg.color} ${cfg.border} ring-2 ring-offset-1 ring-blue-300`
                        : 'bg-stone-50 text-stone-500 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-stone-400 mt-1.5">{t.staffMgmt[`roleDesc_${form.role}`]}</p>
          </div>

          {/* Password */}
          <div className="border-t border-stone-100 pt-4">
            <label className="block text-sm font-medium text-stone-700 mb-1">
              {isEdit ? t.staffMgmt.newPassword : t.staffMgmt.password} {!isEdit && '*'}
            </label>
            {isEdit && <p className="text-xs text-stone-400 mb-2">{t.staffMgmt.leaveBlankPassword}</p>}
            <div className="relative">
              <input
                className={inp + ' pr-10'}
                type={showPw ? 'text' : 'password'}
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                placeholder={isEdit ? t.staffMgmt.leaveBlankPassword : t.staffMgmt.passwordPlaceholder}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                tabIndex={-1}
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {(form.password || !isEdit) && (
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">{t.staffMgmt.confirmPassword}</label>
              <div className="relative">
                <input
                  className={inp + ' pr-10'}
                  type={showConfirmPw ? 'text' : 'password'}
                  value={form.confirm_password}
                  onChange={e => setForm(p => ({ ...p, confirm_password: e.target.value }))}
                  placeholder={t.staffMgmt.confirmPasswordPlaceholder}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  tabIndex={-1}
                >
                  {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-stone-900 hover:bg-stone-700 text-white rounded-lg text-sm font-medium"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {saving ? t.staffMgmt.saving : (isEdit ? t.staffMgmt.saveChanges : t.staffMgmt.createAccount)}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-stone-200 rounded-lg text-sm text-stone-700 hover:bg-stone-50"
            >
              {t.common.close}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Staff Management Tab ─────────────────────────────────────────────────────
export const StaffManagementTab = ({ t, lang, currentStaff }) => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [actionMsg, setActionMsg] = useState(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await staffFetch(`/api/staff/users`, {})
      const data = await res.json()
      setUsers(Array.isArray(data) ? data : [])
    } catch { setUsers([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const showMsg = (text, type = 'success') => {
    setActionMsg({ text, type })
    setTimeout(() => setActionMsg(null), 3500)
  }

  const handleSaved = () => {
    setShowForm(false)
    setEditingUser(null)
    fetchUsers()
    showMsg(t.staffMgmt.savedSuccess)
  }

  const handleToggleActive = async (user) => {
    const action = user.is_active ? t.staffMgmt.deactivate : t.staffMgmt.activate
    if (!window.confirm(`${action} "${user.username}"?`)) return
    try {
      const res = await staffFetch(`/api/staff/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !user.is_active }),
      })
      const data = await res.json()
      if (res.ok) { fetchUsers(); showMsg(t.staffMgmt.savedSuccess) }
      else showMsg(data.error || t.common.error, 'error')
    } catch { showMsg(t.common.error, 'error') }
  }

  const handleDelete = async (user) => {
    if (!window.confirm(`${t.staffMgmt.deleteConfirm} "${user.username}"?`)) return
    try {
      const res = await staffFetch(`/api/staff/users/${user.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (res.ok) { fetchUsers(); showMsg(t.staffMgmt.deletedSuccess) }
      else showMsg(data.error || t.common.error, 'error')
    } catch { showMsg(t.common.error, 'error') }
  }

  const formatDate = (d) => d
    ? new Date(d).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : '—'

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-stone-900">{t.staffMgmt.title}</h2>
          <p className="text-sm text-stone-500 mt-0.5">{t.staffMgmt.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchUsers}
            className="flex items-center gap-1.5 px-3 py-2 border border-stone-200 rounded-lg text-sm text-stone-600 hover:bg-stone-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {t.header.refresh}
          </button>
          <button
            onClick={() => { setEditingUser(null); setShowForm(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-stone-900 hover:bg-stone-700 text-white rounded-lg text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> {t.staffMgmt.createStaff}
          </button>
        </div>
      </div>

      {/* Action message */}
      {actionMsg && (
        <div className={`mb-4 p-3 rounded-lg text-sm border ${
          actionMsg.type === 'error'
            ? 'bg-red-50 text-red-700 border-red-200'
            : 'bg-green-50 text-green-700 border-green-200'
        }`}>
          {actionMsg.text}
        </div>
      )}

      {/* Role Legend */}
      <div className="flex flex-wrap gap-3 mb-5 p-4 bg-white rounded-xl border border-stone-100">
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide w-full">{t.staffMgmt.roleLegend}</p>
        {['admin', 'manager', 'staff'].map(r => {
          const cfg = ROLE_CONFIG[r]
          return (
            <div key={r} className="flex items-start gap-2">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color} ${cfg.border} border`}>
                {t.staffMgmt[`role_${r}`]}
              </span>
              <span className="text-xs text-stone-500">{t.staffMgmt[`roleDesc_${r}`]}</span>
            </div>
          )
        })}
      </div>

      {/* Staff Table */}
      {loading ? (
        <div className="text-center py-12"><RefreshCw className="w-8 h-8 animate-spin text-stone-400 mx-auto" /></div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-100">
              <tr>
                {[t.staffMgmt.username, t.staffMgmt.fullName, t.staffMgmt.email, t.staffMgmt.role,
                  t.staffMgmt.status, t.staffMgmt.created, ''].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map(user => {
                const roleCfg = ROLE_CONFIG[user.role] || ROLE_CONFIG.staff
                const isSelf = user.id === currentStaff?.id
                return (
                  <tr key={user.id} className={`transition-colors ${!user.is_active ? 'opacity-50 bg-stone-50' : 'hover:bg-stone-50'}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${roleCfg.bg} ${roleCfg.color}`}>
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-stone-900 font-mono">{user.username}</span>
                        {isSelf && (
                          <span className="text-xs bg-blue-50 text-stone-900 px-1.5 py-0.5 rounded-full border border-blue-200">
                            {t.staffMgmt.you}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-stone-700">{user.full_name || '—'}</td>
                    <td className="px-4 py-3 text-stone-500 text-xs">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${roleCfg.bg} ${roleCfg.color} ${roleCfg.border}`}>
                        {t.staffMgmt[`role_${user.role}`] || user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        user.is_active
                          ? 'bg-green-50 text-green-700'
                          : 'bg-red-50 text-red-700'
                      }`}>
                        {user.is_active ? t.staffMgmt.active : t.staffMgmt.inactive}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-400 text-xs">{formatDate(user.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {/* Edit */}
                        <button
                          onClick={() => { setEditingUser(user); setShowForm(true) }}
                          className="p-1.5 text-stone-700 hover:text-stone-900 hover:bg-blue-50 rounded"
                          title={t.staffMgmt.editStaff}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {/* Toggle Active */}
                        {!isSelf && (
                          <button
                            onClick={() => handleToggleActive(user)}
                            className={`p-1.5 rounded ${
                              user.is_active
                                ? 'text-orange-500 hover:text-orange-700 hover:bg-orange-50'
                                : 'text-green-500 hover:text-green-700 hover:bg-green-50'
                            }`}
                            title={user.is_active ? t.staffMgmt.deactivate : t.staffMgmt.activate}
                          >
                            {user.is_active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        {/* Delete */}
                        {!isSelf && (
                          <button
                            onClick={() => handleDelete(user)}
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title={t.staffMgmt.delete}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="px-4 py-2 border-t border-gray-50 text-xs text-stone-400">
            {users.length} {t.staffMgmt.totalAccounts}
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showForm && (
        <StaffFormModal
          user={editingUser}
          t={t}
          onSave={handleSaved}
          onClose={() => { setShowForm(false); setEditingUser(null) }}
        />
      )}
    </div>
  )
}

export default StaffManagementTab
