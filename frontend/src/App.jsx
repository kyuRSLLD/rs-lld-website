import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { LanguageProvider } from './contexts/LanguageContext'
import Header from './components/Header'
import HomePage from './components/HomePage'
import ProductsPage from './components/ProductsPage'
import AboutPage from './components/AboutPage'
import ContactPage from './components/ContactPage'
import LoginModal from './components/LoginModal'
import Dashboard from './components/Dashboard'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [showLoginModal, setShowLoginModal] = useState(false)

  useEffect(() => {
    // Check if user is logged in on app start
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/me', {
        credentials: 'include'
      })
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
      await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include'
      })
      setUser(null)
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <LanguageProvider>
      <Router>
        <div className="min-h-screen bg-background">
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
          </Routes>

          {showLoginModal && (
            <LoginModal 
              onClose={() => setShowLoginModal(false)}
              onLogin={handleLogin}
            />
          )}
        </div>
      </Router>
    </LanguageProvider>
  )
}

export default App
