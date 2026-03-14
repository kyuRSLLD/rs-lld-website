import API_BASE from './config/api'
import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom'
import { LanguageProvider } from './contexts/LanguageContext'
import { CartProvider } from './contexts/CartContext'
import Header from './components/Header'
import HomePage from './components/HomePage'
import ProductsPage from './components/ProductsPage'
import ProductDetailPage from './components/ProductDetailPage'
import AboutPage from './components/AboutPage'
import ContactPage from './components/ContactPage'
import LoginModal from './components/LoginModal'
import Dashboard from './components/Dashboard'
import ChatBot from './components/ChatBot'
import CheckoutPage from './components/CheckoutPage'
import OrderTrackingPage from './components/OrderTrackingPage'
import StaffPortal from './components/StaffPortal'
import SaveMeMoneyPage from './components/SaveMeMoneyPage'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [showLoginModal, setShowLoginModal] = useState(false)

  useEffect(() => {
    checkAuthStatus()
    // Handle redirect back from social OAuth providers
    const params = new URLSearchParams(window.location.search)
    if (params.get('social_login') === 'success') {
      checkAuthStatus()
      window.history.replaceState({}, document.title, window.location.pathname)
    } else if (params.get('social_login') === 'error') {
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  const checkAuthStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/me`, { credentials: 'include' })
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
      }
    } catch (error) {
      console.log('Not logged in')
    }
  }

  const handleLogin = (userData) => {
    setUser(userData)
    setShowLoginModal(false)
  }

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/api/logout`, { method: 'POST', credentials: 'include' })
      setUser(null)
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  // Layout component for customer-facing pages (with header, chatbot, login modal)
  const CustomerLayout = () => (
    <>
      <Header
        user={user}
        onLoginClick={() => setShowLoginModal(true)}
        onLogout={handleLogout}
      />
      <Outlet />
      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onLogin={handleLogin}
        />
      )}
      <ChatBot />
    </>
  )

  return (
    <LanguageProvider>
      <CartProvider>
        <Router>
          <div className="min-h-screen bg-background">
            <Routes>
              {/* Staff portal — full-screen, no shared header */}
              <Route path="/staff/*" element={<StaffPortal />} />

              {/* Customer-facing pages — all share the Header/ChatBot layout */}
              <Route element={<CustomerLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/products/:sku" element={<ProductDetailPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/dashboard" element={user ? <Dashboard user={user} /> : <HomePage />} />
                <Route path="/checkout" element={<CheckoutPage user={user} />} />
                <Route path="/track" element={<OrderTrackingPage user={user} />} />
                <Route path="/track/:orderNumber" element={<OrderTrackingPage user={user} />} />
                <Route path="/save-me-money" element={<SaveMeMoneyPage />} />
              </Route>
            </Routes>
          </div>
        </Router>
      </CartProvider>
    </LanguageProvider>
  )
}

export default App
