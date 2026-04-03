import API_BASE from '../config/api'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { X, Eye, EyeOff, User, Mail, Building, Phone, CheckCircle } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
)
const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true" fill="#1877F2">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
)
const XIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.259 5.631 5.905-5.631zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
)

const LoginModal = ({ onClose, onLogin }) => {
  const { t, language } = useLanguage()
  const isZh = language === 'zh'

  // view: 'login' | 'register' | 'forgotPassword' | 'forgotUsername' | 'resetPassword' | 'success'
  const [view, setView] = useState('login')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState('')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [providers, setProviders] = useState({ google: false, facebook: false, twitter: false })
  const [formData, setFormData] = useState({ username: '', email: '', password: '', company_name: '', phone: '' })
  const [forgotIdentifier, setForgotIdentifier] = useState('')
  const [forgotEmail, setForgotEmail] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    fetch(`${API_BASE}/api/auth/providers`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => setProviders(data))
      .catch(() => {})
    // Check for password reset token in URL
    const params = new URLSearchParams(window.location.search)
    const token = params.get('reset_token')
    const type = params.get('type')
    if (token && type === 'customer') {
      setResetToken(token)
      setView('resetPassword')
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  // Auto-format phone number as (xxx)xxx-xxxx while user types digits
  const formatPhone = (raw) => {
    const digits = raw.replace(/\D/g, '').slice(0, 10)
    if (digits.length === 0) return ''
    if (digits.length <= 3) return `(${digits}`
    if (digits.length <= 6) return `(${digits.slice(0, 3)})${digits.slice(3)}`
    return `(${digits.slice(0, 3)})${digits.slice(3, 6)}-${digits.slice(6)}`
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    const formatted = name === 'phone' ? formatPhone(value) : value
    setFormData({ ...formData, [name]: formatted })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const endpoint = view === 'login' ? `${API_BASE}/api/login` : `${API_BASE}/api/register`
      const payload = view === 'login' ? { username: formData.username, password: formData.password } : formData
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      })
      const data = await response.json()
      if (response.ok) { onLogin(data.user) } else { setError(data.error || 'Authentication failed') }
    } catch { setError('Network error. Please try again.') } finally { setLoading(false) }
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API_BASE}/api/customer/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: forgotIdentifier }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Request failed'); return }
      setSuccessMessage(data.debug_token
        ? `Email not configured. Debug token: ${data.debug_token}`
        : (data.message || (isZh ? '请查收邮件，点击链接重置密码。' : 'Check your email for a password reset link.')))
      setView('success')
    } catch { setError('Request failed. Please try again.') }
    finally { setLoading(false) }
  }

  const handleForgotUsername = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API_BASE}/api/customer/forgot-username`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Request failed'); return }
      setSuccessMessage(data.debug_username
        ? `Email not configured. Your username is: ${data.debug_username}`
        : (data.message || (isZh ? '请查收邮件，您的用户名已发送。' : 'Check your email — your username has been sent.')))
      setView('success')
    } catch { setError('Request failed. Please try again.') }
    finally { setLoading(false) }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault(); setError('')
    if (newPassword !== confirmPassword) { setError(isZh ? '两次密码不一致' : 'Passwords do not match'); return }
    if (newPassword.length < 6) { setError(isZh ? '密码至少6位' : 'Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/customer/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, password: newPassword }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Reset failed'); return }
      setSuccessMessage(data.message || (isZh ? '密码已更新，请重新登录。' : 'Password updated. You can now sign in.'))
      setView('success')
    } catch { setError('Request failed. Please try again.') }
    finally { setLoading(false) }
  }

  const handleSocialLogin = (provider) => {
    setSocialLoading(provider)
    window.location.href = `${API_BASE}/api/auth/${provider}`
  }

  const goTo = (v) => { setView(v); setError(''); setSuccessMessage('') }
  const anySocialProvider = providers.google || providers.facebook || providers.twitter
  const inputClass = "w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start sm:items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[95vh] sm:max-h-[90vh] overflow-y-auto my-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">RS</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              {view === 'login' && t('login.title')}
              {view === 'register' && (isZh ? '创建账户' : 'Create Account')}
              {view === 'forgotPassword' && (isZh ? '重置密码' : 'Reset Password')}
              {view === 'forgotUsername' && (isZh ? '找回用户名' : 'Recover Username')}
              {view === 'resetPassword' && (isZh ? '设置新密码' : 'Set New Password')}
              {view === 'success' && (isZh ? '邮件已发送' : 'Email Sent')}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">

          {/* ── Login view ── */}
          {view === 'login' && (
            <>
              {anySocialProvider && (
                <div className="mb-4 space-y-2">
                  {providers.google && (
                    <button onClick={() => handleSocialLogin('google')} disabled={!!socialLoading}
                      className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm text-gray-700">
                      <GoogleIcon />
                      {socialLoading === 'google' ? (isZh ? '跳转中...' : 'Redirecting...') : (isZh ? '使用 Google 登录' : 'Continue with Google')}
                    </button>
                  )}
                  {providers.facebook && (
                    <button onClick={() => handleSocialLogin('facebook')} disabled={!!socialLoading}
                      className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm text-gray-700">
                      <FacebookIcon />
                      {socialLoading === 'facebook' ? (isZh ? '跳转中...' : 'Redirecting...') : (isZh ? '使用 Facebook 登录' : 'Continue with Facebook')}
                    </button>
                  )}
                  {providers.twitter && (
                    <button onClick={() => handleSocialLogin('twitter')} disabled={!!socialLoading}
                      className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm text-gray-700">
                      <XIcon />
                      {socialLoading === 'twitter' ? (isZh ? '跳转中...' : 'Redirecting...') : (isZh ? '使用 X 登录' : 'Continue with X')}
                    </button>
                  )}
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-white px-3 text-gray-400 uppercase tracking-wide">or</span>
                    </div>
                  </div>
                </div>
              )}
              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">{error}</div>}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('login.username')}</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input type="text" name="username" value={formData.username} onChange={handleInputChange}
                      className={inputClass} placeholder={t('login.usernamePlaceholder')} required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('login.password')}</label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleInputChange}
                      className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={t('login.passwordPlaceholder')} required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 py-2" disabled={loading}>
                  {loading ? (isZh ? '请稍候...' : 'Please wait...') : t('login.signIn')}
                </Button>
              </form>
              <div className="mt-3 flex flex-col items-center gap-1 text-sm">
                <button onClick={() => goTo('forgotPassword')} className="text-gray-500 hover:text-blue-600 transition-colors">
                  {isZh ? '忘记密码？' : 'Forgot password?'}
                </button>
                <button onClick={() => goTo('forgotUsername')} className="text-gray-500 hover:text-blue-600 transition-colors">
                  {isZh ? '忘记用户名？' : 'Forgot username?'}
                </button>
              </div>
              <div className="mt-4 text-center">
                <p className="text-gray-600 text-sm">
                  {t('login.noAccount')}{' '}
                  <button onClick={() => goTo('register')} className="text-blue-600 hover:text-blue-700 font-medium">
                    {t('login.signUp')}
                  </button>
                </p>
              </div>
            </>
          )}

          {/* ── Register view ── */}
          {view === 'register' && (
            <>
              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">{error}</div>}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('login.username')}</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input type="text" name="username" value={formData.username} onChange={handleInputChange}
                      className={inputClass} placeholder={t('login.usernamePlaceholder')} required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input type="email" name="email" value={formData.email} onChange={handleInputChange}
                      className={inputClass} placeholder="Enter your email" required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{isZh ? '餐厅/公司名称' : 'Restaurant/Company Name'}</label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input type="text" name="company_name" value={formData.company_name} onChange={handleInputChange}
                      className={inputClass} placeholder={isZh ? '您的餐厅名称' : 'Your restaurant name'} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{isZh ? '电话号码' : 'Phone Number'}</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange}
                      className={inputClass} placeholder={isZh ? '(xxx)xxx-xxxx' : '(xxx)xxx-xxxx'} maxLength={13} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('login.password')}</label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleInputChange}
                      className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={t('login.passwordPlaceholder')} required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 py-2" disabled={loading}>
                  {loading ? (isZh ? '请稍候...' : 'Please wait...') : (isZh ? '创建账户' : 'Create Account')}
                </Button>
              </form>
              <div className="mt-4 text-center">
                <p className="text-gray-600 text-sm">
                  {isZh ? '已有账户？' : 'Already have an account?'}{' '}
                  <button onClick={() => goTo('login')} className="text-blue-600 hover:text-blue-700 font-medium">
                    {t('login.signIn')}
                  </button>
                </p>
              </div>
            </>
          )}

          {/* ── Forgot Password view ── */}
          {view === 'forgotPassword' && (
            <>
              <p className="text-gray-500 text-sm mb-4">
                {isZh ? '请输入您的用户名或邮箱，我们将发送密码重置链接。' : "Enter your username or email and we'll send you a password reset link."}
              </p>
              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">{error}</div>}
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isZh ? '用户名或邮箱' : 'Username or Email'}
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input type="text" value={forgotIdentifier} onChange={e => setForgotIdentifier(e.target.value)}
                      className={inputClass} placeholder={isZh ? '请输入用户名或邮箱' : 'Enter username or email'} />
                  </div>
                </div>
                <Button type="submit" disabled={loading || !forgotIdentifier.trim()} className="w-full bg-blue-600 hover:bg-blue-700 py-2">
                  {loading ? (isZh ? '发送中...' : 'Sending...') : (isZh ? '发送重置链接' : 'Send Reset Link')}
                </Button>
              </form>
              <button onClick={() => goTo('login')} className="mt-3 text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1">
                ← {isZh ? '返回登录' : 'Back to sign in'}
              </button>
            </>
          )}

          {/* ── Forgot Username view ── */}
          {view === 'forgotUsername' && (
            <>
              <p className="text-gray-500 text-sm mb-4">
                {isZh ? '请输入您的注册邮箱，我们将发送您的用户名。' : "Enter your registered email and we'll send you your username."}
              </p>
              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">{error}</div>}
              <form onSubmit={handleForgotUsername} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isZh ? '邮箱地址' : 'Email Address'}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                      className={inputClass} placeholder={isZh ? '请输入邮箱' : 'Enter your email'} />
                  </div>
                </div>
                <Button type="submit" disabled={loading || !forgotEmail.trim()} className="w-full bg-blue-600 hover:bg-blue-700 py-2">
                  {loading ? (isZh ? '发送中...' : 'Sending...') : (isZh ? '发送用户名' : 'Send My Username')}
                </Button>
              </form>
              <button onClick={() => goTo('login')} className="mt-3 text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1">
                ← {isZh ? '返回登录' : 'Back to sign in'}
              </button>
            </>
          )}

          {/* ── Reset Password view (from email link) ── */}
          {view === 'resetPassword' && (
            <>
              <p className="text-gray-500 text-sm mb-4">
                {isZh ? '请输入您的新密码（至少6位）。' : 'Enter your new password (minimum 6 characters).'}
              </p>
              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">{error}</div>}
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{isZh ? '新密码' : 'New Password'}</label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)}
                      className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={isZh ? '请输入新密码' : 'New password'} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{isZh ? '确认密码' : 'Confirm Password'}</label>
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full pl-4 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={isZh ? '再次输入新密码' : 'Confirm new password'} />
                </div>
                <Button type="submit" disabled={loading || !newPassword || !confirmPassword} className="w-full bg-blue-600 hover:bg-blue-700 py-2">
                  {loading ? (isZh ? '更新中...' : 'Updating...') : (isZh ? '更新密码' : 'Update Password')}
                </Button>
              </form>
            </>
          )}

          {/* ── Success view ── */}
          {view === 'success' && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center">
                <CheckCircle className="w-7 h-7 text-green-600" />
              </div>
              <p className="text-gray-700 text-sm text-center">{successMessage}</p>
              <button onClick={() => goTo('login')} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                ← {isZh ? '返回登录' : 'Back to sign in'}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

export default LoginModal
