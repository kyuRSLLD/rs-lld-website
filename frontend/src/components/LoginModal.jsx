import API_BASE from '../config/api'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { X, Eye, EyeOff, User, Mail, Building, Phone } from 'lucide-react'
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
  const { t } = useLanguage()
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState('')
  const [error, setError] = useState('')
  const [providers, setProviders] = useState({ google: false, facebook: false, twitter: false })
  const [formData, setFormData] = useState({ username: '', email: '', password: '', company_name: '', phone: '' })

  useEffect(() => {
    fetch(`${API_BASE}/api/auth/providers`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => setProviders(data))
      .catch(() => {})
  }, [])

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const endpoint = isLogin ? `${API_BASE}/api/login` : `${API_BASE}/api/register`
      const payload = isLogin ? { username: formData.username, password: formData.password } : formData
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

  const handleSocialLogin = (provider) => {
    setSocialLoading(provider)
    window.location.href = `${API_BASE}/api/auth/${provider}`
  }

  const toggleMode = () => {
    setIsLogin(!isLogin)
    setError('')
    setFormData({ username: '', email: '', password: '', company_name: '', phone: '' })
  }

  const anySocialProvider = providers.google || providers.facebook || providers.twitter

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {isLogin ? t('login.title') : 'Create Account'}
            </h2>
            <Button variant="ghost" size="sm" onClick={onClose}><X className="w-5 h-5" /></Button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>
          )}

          {anySocialProvider && (
            <div className="mb-5 space-y-2">
              {providers.google && (
                <button type="button" onClick={() => handleSocialLogin('google')} disabled={!!socialLoading}
                  className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 text-gray-700 font-medium text-sm transition-colors disabled:opacity-60">
                  <GoogleIcon />
                  {socialLoading === 'google' ? 'Redirecting...' : (isLogin ? 'Continue with Google' : 'Sign up with Google')}
                </button>
              )}
              {providers.facebook && (
                <button type="button" onClick={() => handleSocialLogin('facebook')} disabled={!!socialLoading}
                  className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 text-gray-700 font-medium text-sm transition-colors disabled:opacity-60">
                  <FacebookIcon />
                  {socialLoading === 'facebook' ? 'Redirecting...' : (isLogin ? 'Continue with Facebook' : 'Sign up with Facebook')}
                </button>
              )}
              {providers.twitter && (
                <button type="button" onClick={() => handleSocialLogin('twitter')} disabled={!!socialLoading}
                  className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 text-gray-700 font-medium text-sm transition-colors disabled:opacity-60">
                  <XIcon />
                  {socialLoading === 'twitter' ? 'Redirecting...' : (isLogin ? 'Continue with X' : 'Sign up with X')}
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('login.username')}</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input type="text" name="username" value={formData.username} onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('login.usernamePlaceholder')} required />
              </div>
            </div>
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your email" required />
                </div>
              </div>
            )}
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Restaurant/Company Name</label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input type="text" name="company_name" value={formData.company_name} onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Your restaurant name" />
                </div>
              </div>
            )}
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Your phone number" />
                </div>
              </div>
            )}
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
              {loading ? 'Please wait...' : (isLogin ? t('login.signIn') : 'Create Account')}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              {isLogin ? t('login.noAccount') + ' ' : 'Already have an account? '}
              <button onClick={toggleMode} className="text-blue-600 hover:text-blue-700 font-medium">
                {isLogin ? t('login.signUp') : 'Sign in'}
              </button>
            </p>
          </div>
          {isLogin && (
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-600 text-center">{t('login.demo')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default LoginModal
