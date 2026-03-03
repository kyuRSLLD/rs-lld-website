import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { LanguageProvider } from './contexts/LanguageContext'
import { CartProvider } from './contexts/CartContext'
import Header from './components/Header'
import HomePage from './components/HomePage'
import ProductsPage from './components/ProductsPage'
import AboutPage from './components/AboutPage'
import ContactPage from './components/ContactPage'
import LoginModal from './components/LoginModal'
import Dashboard from './components/Dashboard'
import ChatBot from './components/ChatBot'
import CheckoutPage from './components/CheckoutPage'
import OrderTrackingPage from './components/OrderTrackingPage'
import StaffPortal from './components/StaffPortal'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [showLoginModal, setShowLoginModal] = useState(false)

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/me', { credentials: 'include' })
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
      await fetch('/api/logout', { method: 'POST', credentials: 'include' })
      setUser(null)
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <LanguageProvider>
      <CartProvider>
        <Router>
          <div className="min-h-screen bg-background">
            {/* Staff portal has its own full-screen layout, no shared header */}
            <Routes>
              <Route path="/staff/*" element={<StaffPortal />} />
              <Route path="*" element={
                <>
                  <Header
                    user={user}
                    onLoginClick={() => setShowLoginModal(true)}
                    onLogout={handleLogout}
                  />
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/products" element={<ProductsPage />} />
                    <Route path="/about" element={<AboutPage />} />
                    <Route path="/contact" element={<ContactPage />} />
                    <Route path="/dashboard" element={user ? <Dashboard user={user} /> : <HomePage />} />
                    <Route path="/checkout" element={<CheckoutPage user={user} />} />
                    <Route path="/track" element={<OrderTrackingPage user={user} />} />
                    <Route path="/track/:orderNumber" element={<OrderTrackingPage user={user} />} />
                  </Routes>

                  {showLoginModal && (
                    <LoginModal
                      onClose={() => setShowLoginModal(false)}
                      onLogin={handleLogin}
                    />
                  )}

                  <ChatBot />
                </>
              } />
            </Routes>
          </div>
        </Router>
      </CartProvider>
    </LanguageProvider>
  )
}

export default App
