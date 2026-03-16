import { useState, useEffect, useCallback } from 'react'
import { staffFetch } from '@/lib/staffApi'
import {
  Key, Plus, Copy, Eye, EyeOff, Trash2, ShieldOff, ShieldCheck,
  AlertTriangle, CheckCircle, Clock, RefreshCw, X, Info
} from 'lucide-react'

const API = import.meta.env.VITE_API_URL || ''

// ── Key type config ───────────────────────────────────────────────────────────
const KEY_TYPES = [
  {
    prefix: 'sk_live',
    label: 'Production Secret Key',
    labelZh: '生产环境密钥',
    badge: 'bg-red-100 text-red-700 border-red-200',
    desc: 'Full server-side access. Never expose in client code.',
    descZh: '完整服务端权限，切勿暴露在客户端代码中。',
    icon: '🔴',
  },
  {
    prefix: 'sk_test',
    label: 'Sandbox / Test Key',
    labelZh: '沙盒 / 测试密钥',
    badge: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    desc: 'Safe for development and testing environments.',
    descZh: '适用于开发和测试环境。',
    icon: '🟡',
  },
  {
    prefix: 'pk_live',
    label: 'Public Client Key',
    labelZh: '公开客户端密钥',
    badge: 'bg-blue-100 text-stone-900 border-blue-200',
    desc: 'Read-only public key. Safe to use in frontend/client code.',
    descZh: '只读公钥，可安全用于前端代码。',
    icon: '🔵',
  },
]

function prefixConfig(prefix) {
  return KEY_TYPES.find(k => k.prefix === prefix) || { label: prefix, badge: 'bg-stone-100 text-stone-600', icon: '⚪' }
}

// ── Copy to clipboard helper ──────────────────────────────────────────────────
function useCopy() {
  const [copied, setCopied] = useState(null)
  const copy = (text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id)
      setTimeout(() => setCopied(null), 2000)
    })
  }
  return { copy, copied }
}

// ── Create Key Modal ──────────────────────────────────────────────────────────
function CreateKeyModal({ t, lang, onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', prefix: 'sk_live', description: '', expires_at: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) { setError(t?.nameRequired || 'Key name is required'); return }
    setSaving(true)
    try {
      const res = await staffFetch(`/api/admin/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to create key'); setSaving(false); return }
      onCreated(data)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-stone-900/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
          <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
            <Key className="w-4 h-4 text-purple-600" />
            {t?.createTitle || 'Create API Key'}
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-stone-100"><X className="w-5 h-5 text-stone-500" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Key type selector */}
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-2">{t?.keyType || 'Key Type'}</label>
            <div className="space-y-2">
              {KEY_TYPES.map(kt => (
                <label key={kt.prefix}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    form.prefix === kt.prefix ? 'border-purple-400 bg-purple-50' : 'border-stone-200 hover:border-stone-200'
                  }`}>
                  <input type="radio" name="prefix" value={kt.prefix}
                    checked={form.prefix === kt.prefix}
                    onChange={e => setForm(f => ({ ...f, prefix: e.target.value }))}
                    className="mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{kt.icon}</span>
                      <code className="text-xs font-mono font-bold text-stone-800">{kt.prefix}_...</code>
                      <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${kt.badge}`}>
                        {lang === 'zh' ? kt.labelZh : kt.label}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5">{lang === 'zh' ? kt.descZh : kt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">{t?.keyName || 'Key Name'} *</label>
            <input required
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder={t?.keyNamePlaceholder || 'e.g. Mobile App Integration, Partner API'}
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">{t?.description || 'Description (optional)'}</label>
            <textarea rows={2}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              placeholder={t?.descriptionPlaceholder || 'What is this key used for?'}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>

          {/* Expiry */}
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">{t?.expiresAt || 'Expiry Date (optional — leave blank for no expiry)'}</label>
            <input type="date"
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              value={form.expires_at}
              onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} />
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">{error}</div>}

          <div className="flex justify-end gap-3 pt-2 border-t border-stone-100">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-stone-600 border border-stone-200 rounded-lg hover:bg-stone-50">
              {t?.cancel || 'Cancel'}
            </button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium">
              {saving ? (t?.generating || 'Generating...') : (t?.generate || 'Generate Key')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── New Key Display Modal (shown once after creation) ─────────────────────────
function NewKeyDisplay({ keyData, t, lang, onClose }) {
  const { copy, copied } = useCopy()
  const [revealed, setRevealed] = useState(true)
  const cfg = prefixConfig(keyData.prefix)

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            {t?.keyCreated || 'API Key Created'}
          </h3>
        </div>

        <div className="p-6 space-y-4">
          {/* Warning banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">{t?.copyWarningTitle || 'Copy this key now'}</p>
              <p className="text-xs text-amber-700 mt-0.5">{t?.copyWarning || 'This key will never be shown again. Store it securely.'}</p>
            </div>
          </div>

          {/* Key info */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded border font-medium ${cfg.badge}`}>
                {cfg.icon} {lang === 'zh' ? cfg.labelZh : cfg.label}
              </span>
              <span className="text-sm font-medium text-stone-800">{keyData.name}</span>
            </div>
          </div>

          {/* Raw key display */}
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">{t?.rawKey || 'Your API Key'}</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-stone-950 rounded-lg px-3 py-2.5 font-mono text-xs text-green-400 overflow-x-auto whitespace-nowrap">
                {revealed ? keyData.raw_key : '•'.repeat(Math.min(keyData.raw_key.length, 60))}
              </div>
              <button onClick={() => setRevealed(r => !r)}
                className="p-2 text-stone-500 hover:text-stone-700 border border-stone-200 rounded-lg hover:bg-stone-50">
                {revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button onClick={() => copy(keyData.raw_key, 'new')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-all ${
                  copied === 'new' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                }`}>
                {copied === 'new' ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied === 'new' ? (t?.copied || 'Copied!') : (t?.copy || 'Copy')}
              </button>
            </div>
          </div>

          {/* Key hash (for reference) */}
          <div className="bg-stone-50 rounded-lg px-4 py-3">
            <p className="text-xs text-stone-500 mb-1">{t?.storedAs || 'Stored in database as SHA-256 hash:'}</p>
            <p className="font-mono text-xs text-stone-600 break-all">{keyData.key_preview}</p>
          </div>

          <div className="flex justify-end pt-2 border-t border-stone-100">
            <button onClick={onClose}
              className="px-5 py-2 text-sm bg-stone-950 text-white rounded-lg hover:bg-stone-900 font-medium">
              {t?.iSavedIt || "I've saved the key — Close"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main API Key Manager Tab ──────────────────────────────────────────────────
export function ApiKeyManagerTab({ t: tAll, lang }) {
  const t = tAll?.apiKeys || {}
  const [keys, setKeys] = useState([])
  const [loading, setLoading] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newKeyData, setNewKeyData] = useState(null)
  const [filterActive, setFilterActive] = useState('all')
  const { copy, copied } = useCopy()

  const fetchKeys = useCallback(async () => {
    setLoading(true)
    try {
      const res = await staffFetch(`/api/admin/keys`, {})
      const data = await res.json()
      setKeys(Array.isArray(data) ? data : [])
    } catch { setKeys([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchKeys() }, [fetchKeys])

  async function revokeKey(id) {
    if (!confirm(t?.revokeConfirm || 'Revoke this key? It will stop working immediately.')) return
    await staffFetch(`/api/admin/keys/${id}/revoke`, { method: 'POST' })
    fetchKeys()
  }

  async function activateKey(id) {
    await staffFetch(`/api/admin/keys/${id}/activate`, { method: 'POST' })
    fetchKeys()
  }

  async function deleteKey(id) {
    if (!confirm(t?.deleteConfirm || 'Permanently delete this key record?')) return
    await staffFetch(`/api/admin/keys/${id}`, { method: 'DELETE' })
    fetchKeys()
  }

  function handleCreated(keyData) {
    setShowCreate(false)
    setNewKeyData(keyData)
    fetchKeys()
  }

  const filtered = keys.filter(k => {
    if (filterActive === 'active') return k.is_active && !k.is_expired
    if (filterActive === 'revoked') return !k.is_active
    if (filterActive === 'expired') return k.is_expired
    return true
  })

  const activeCount = keys.filter(k => k.is_active && !k.is_expired).length

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <Key className="w-5 h-5 text-purple-600" />
            {t?.title || 'API Key Management'}
          </h2>
          <p className="text-sm text-stone-500 mt-0.5">
            {t?.subtitle || 'Create and manage API keys for external integrations. Keys are stored as SHA-256 hashes.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchKeys}
            className="p-2 text-stone-500 hover:text-stone-700 border border-stone-200 rounded-lg hover:bg-stone-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors">
            <Plus className="w-4 h-4" /> {t?.createKey || 'Create API Key'}
          </button>
        </div>
      </div>

      {/* Security notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-5 flex items-start gap-3">
        <Info className="w-4 h-4 text-stone-700 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-stone-900">
          {t?.securityNote || 'Keys are generated with 256 bits of entropy and stored as SHA-256 hashes. The raw key is shown only once at creation. RS LLD never stores plaintext keys.'}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: t?.totalKeys || 'Total Keys', value: keys.length, color: 'text-stone-700', bg: 'bg-stone-50' },
          { label: t?.activeKeys || 'Active', value: activeCount, color: 'text-green-700', bg: 'bg-green-50' },
          { label: t?.revokedKeys || 'Revoked / Expired', value: keys.length - activeCount, color: 'text-red-700', bg: 'bg-red-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-lg px-4 py-3`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-stone-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {['all', 'active', 'revoked', 'expired'].map(f => (
          <button key={f} onClick={() => setFilterActive(f)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
              filterActive === f ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-stone-600 border-stone-200 hover:border-stone-200'
            }`}>
            {t?.[`filter_${f}`] || f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Keys list */}
      {loading ? (
        <div className="text-center py-12"><RefreshCw className="w-8 h-8 animate-spin text-stone-300 mx-auto" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-stone-100">
          <Key className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-stone-400 text-sm">{t?.noKeys || 'No API keys yet. Create your first key above.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(key => {
            const cfg = prefixConfig(key.prefix)
            const isValid = key.is_active && !key.is_expired

            return (
              <div key={key.id}
                className={`bg-white rounded-xl border p-4 transition-all ${
                  isValid ? 'border-stone-200' : 'border-stone-100 opacity-70'
                }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Top row: name + badges */}
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-stone-900 text-sm">{key.name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${cfg.badge}`}>
                        {cfg.icon} {lang === 'zh' ? cfg.labelZh : cfg.label}
                      </span>
                      {isValid ? (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-green-50 text-green-700 border border-green-200 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> {t?.active || 'Active'}
                        </span>
                      ) : !key.is_active ? (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 flex items-center gap-1">
                          <ShieldOff className="w-3 h-3" /> {t?.revoked || 'Revoked'}
                        </span>
                      ) : (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {t?.expired || 'Expired'}
                        </span>
                      )}
                    </div>

                    {/* Key preview */}
                    <div className="flex items-center gap-2 mb-2">
                      <code className="text-xs font-mono bg-stone-100 text-stone-700 px-2 py-0.5 rounded">
                        {key.key_preview}
                      </code>
                      <button onClick={() => copy(key.key_preview, key.id)}
                        className="text-stone-400 hover:text-stone-600 transition-colors">
                        {copied === key.id
                          ? <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                          : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Meta info */}
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-stone-400">
                      <span>{t?.createdBy || 'Created by'} <span className="text-stone-600 font-medium">{key.created_by}</span></span>
                      <span>{t?.createdAt || 'on'} {new Date(key.created_at).toLocaleDateString()}</span>
                      {key.last_used_at && (
                        <span>{t?.lastUsed || 'Last used'} {new Date(key.last_used_at).toLocaleDateString()}</span>
                      )}
                      {key.use_count > 0 && (
                        <span>{key.use_count} {t?.uses || 'uses'}</span>
                      )}
                      {key.expires_at && (
                        <span className={key.is_expired ? 'text-red-500' : 'text-orange-500'}>
                          {key.is_expired ? (t?.expiredOn || 'Expired') : (t?.expiresOn || 'Expires')} {new Date(key.expires_at).toLocaleDateString()}
                        </span>
                      )}
                      {key.revoked_by && (
                        <span className="text-red-400">{t?.revokedBy || 'Revoked by'} {key.revoked_by}</span>
                      )}
                    </div>

                    {key.description && (
                      <p className="text-xs text-stone-500 mt-1 italic">{key.description}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {key.is_active ? (
                      <button onClick={() => revokeKey(key.id)}
                        title={t?.revoke || 'Revoke key'}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-orange-600 border border-orange-200 rounded-lg hover:bg-orange-50 transition-colors">
                        <ShieldOff className="w-3.5 h-3.5" /> {t?.revoke || 'Revoke'}
                      </button>
                    ) : (
                      <button onClick={() => activateKey(key.id)}
                        title={t?.reactivate || 'Reactivate key'}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-green-600 border border-green-200 rounded-lg hover:bg-green-50 transition-colors">
                        <ShieldCheck className="w-3.5 h-3.5" /> {t?.reactivate || 'Reactivate'}
                      </button>
                    )}
                    <button onClick={() => deleteKey(key.id)}
                      title={t?.delete || 'Delete record'}
                      className="p-1.5 text-red-400 hover:text-red-600 border border-red-100 rounded-lg hover:bg-red-50 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modals */}
      {showCreate && (
        <CreateKeyModal t={t} lang={lang} onClose={() => setShowCreate(false)} onCreated={handleCreated} />
      )}
      {newKeyData && (
        <NewKeyDisplay keyData={newKeyData} t={t} lang={lang} onClose={() => setNewKeyData(null)} />
      )}
    </div>
  )
}

export default ApiKeyManagerTab
