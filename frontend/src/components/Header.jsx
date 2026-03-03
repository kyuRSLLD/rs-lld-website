import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Menu, X, User, LogOut, Globe, ChevronDown, ShoppingCart, Package } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import { useCart } from '../contexts/CartContext'

const Header = ({ user, onLoginClick, onLogout }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showLanguageMenu, setShowLanguageMenu] = useState(false)
  const navigate = useNavigate()
  const { t, currentLanguage, changeLanguage, getLanguageLabel, availableLanguages } = useLanguage()
  const { cartCount } = useCart()

  const handleDashboardClick = () => {
    navigate('/dashboard')
    setShowUserMenu(false)
  }

  const handleLanguageChange = (language) => {
    changeLanguage(language)
    setShowLanguageMenu(false)
  }

  const trackLabel = currentLanguage === 'zh' ? '追踪订单' : currentLanguage === 'ko' ? '주문 추적' : 'Track Order'
  const checkoutLabel = currentLanguage === 'zh' ? '结账' : currentLanguage === 'ko' ? '결제' : 'Checkout'

  return (
    <header className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">RS</span>
            </div>
            <span className="text-xl font-bold text-gray-900">RS LLD</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link to="/" className="text-gray-700 hover:text-blue-600 transition-colors text-sm">
              {t('nav.home')}
            </Link>
            <Link to="/products" className="text-gray-700 hover:text-blue-600 transition-colors text-sm">
              {t('nav.products')}
            </Link>
            <Link to="/about" className="text-gray-700 hover:text-blue-600 transition-colors text-sm">
              {t('nav.about')}
            </Link>
            <Link to="/contact" className="text-gray-700 hover:text-blue-600 transition-colors text-sm">
              {t('nav.contact')}
            </Link>
            <Link to="/track" className="text-gray-700 hover:text-blue-600 transition-colors text-sm flex items-center gap-1">
              <Package className="w-3.5 h-3.5" /> {trackLabel}
            </Link>
          </nav>

          {/* Right side */}
          <div className="hidden md:flex items-center space-x-3">
            {/* Language Toggle */}
            <div className="relative language-toggle">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                className="flex items-center space-x-1"
              >
                <Globe className="w-4 h-4" />
                <span>{getLanguageLabel(currentLanguage)}</span>
                <ChevronDown className="w-3 h-3" />
              </Button>
              {showLanguageMenu && (
                <div className="language-dropdown">
                  {availableLanguages.map((lang) => (
                    <div
                      key={lang}
                      className={`language-option ${currentLanguage === lang ? 'active' : ''}`}
                      onClick={() => handleLanguageChange(lang)}
                    >
                      {getLanguageLabel(lang)}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cart Button */}
            <Link to="/checkout">
              <Button variant="outline" size="sm" className="relative flex items-center gap-1.5">
                <ShoppingCart className="w-4 h-4" />
                <span className="hidden sm:inline text-xs">{checkoutLabel}</span>
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </Button>
            </Link>

            {/* User Actions */}
            {user ? (
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2"
                >
                  <User className="w-4 h-4" />
                  <span>{user.username}</span>
                  <ChevronDown className="w-3 h-3" />
                </Button>
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border">
                    <button
                      onClick={handleDashboardClick}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <User className="w-4 h-4 mr-2" />
                      {t('nav.dashboard')}
                    </button>
                    <Link
                      to="/track"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Package className="w-4 h-4 mr-2" />
                      {trackLabel}
                    </Link>
                    <button
                      onClick={onLogout}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      {t('nav.logout')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Button onClick={onLoginClick} size="sm">
                {t('nav.login')}
              </Button>
            )}
          </div>

          {/* Mobile: cart + menu */}
          <div className="md:hidden flex items-center gap-2">
            <Link to="/checkout" className="relative">
              <Button variant="ghost" size="sm">
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t">
              {[
                { to: '/', label: t('nav.home') },
                { to: '/products', label: t('nav.products') },
                { to: '/about', label: t('nav.about') },
                { to: '/contact', label: t('nav.contact') },
                { to: '/track', label: trackLabel },
              ].map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}

              {/* Mobile Language Toggle */}
              <div className="px-3 py-2">
                <div className="text-sm font-medium text-gray-700 mb-2">Language</div>
                <div className="space-y-1">
                  {availableLanguages.map((lang) => (
                    <button
                      key={lang}
                      onClick={() => { handleLanguageChange(lang); setIsMenuOpen(false) }}
                      className={`block w-full text-left px-2 py-1 text-sm rounded ${
                        currentLanguage === lang ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {getLanguageLabel(lang)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mobile User Actions */}
              <div className="px-3 py-2 border-t">
                {user ? (
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-700 mb-2">{user.username}</div>
                    <button
                      onClick={() => { handleDashboardClick(); setIsMenuOpen(false) }}
                      className="flex items-center w-full px-2 py-1 text-sm text-gray-600 hover:bg-gray-50 rounded"
                    >
                      <User className="w-4 h-4 mr-2" /> {t('nav.dashboard')}
                    </button>
                    <button
                      onClick={() => { onLogout(); setIsMenuOpen(false) }}
                      className="flex items-center w-full px-2 py-1 text-sm text-gray-600 hover:bg-gray-50 rounded"
                    >
                      <LogOut className="w-4 h-4 mr-2" /> {t('nav.logout')}
                    </button>
                  </div>
                ) : (
                  <Button onClick={() => { onLoginClick(); setIsMenuOpen(false) }} size="sm" className="w-full">
                    {t('nav.login')}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}

export default Header
