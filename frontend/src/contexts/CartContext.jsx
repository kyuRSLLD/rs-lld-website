import { createContext, useContext, useState, useEffect } from 'react'

const CartContext = createContext()

export const useCart = () => {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('rs-lld-cart')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // Persist cart to localStorage
  useEffect(() => {
    localStorage.setItem('rs-lld-cart', JSON.stringify(cart))
  }, [cart])

  const addToCart = (product, qty = 1) => {
    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.id)
      if (existing) {
        return prev.map(i =>
          i.product_id === product.id ? { ...i, quantity: i.quantity + qty } : i
        )
      }
      return [...prev, {
        product_id: product.id,
        product_name: product.name,
        product_sku: product.sku,
        product_brand: product.brand,
        product_unit_size: product.unit_size,
        category_name: product.category_name,
        unit_price: product.unit_price,
        bulk_price: product.bulk_price,
        bulk_quantity: product.bulk_quantity,
        image_url: product.image_url,
        quantity: qty,
      }]
    })
  }

  const updateQuantity = (productId, qty) => {
    if (qty <= 0) {
      removeFromCart(productId)
      return
    }
    setCart(prev => prev.map(i => i.product_id === productId ? { ...i, quantity: qty } : i))
  }

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(i => i.product_id !== productId))
  }

  const clearCart = () => setCart([])

  const getEffectivePrice = (item) => {
    if (item.bulk_price && item.bulk_quantity && item.quantity >= item.bulk_quantity) {
      return item.bulk_price
    }
    return item.unit_price
  }

  const cartTotal = cart.reduce((sum, item) => sum + getEffectivePrice(item) * item.quantity, 0)
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const deliveryFee = cartTotal >= 100 ? 0 : (cart.length > 0 ? 25 : 0)
  const orderTotal = cartTotal + deliveryFee

  return (
    <CartContext.Provider value={{
      cart, addToCart, updateQuantity, removeFromCart, clearCart,
      cartTotal, cartCount, deliveryFee, orderTotal, getEffectivePrice
    }}>
      {children}
    </CartContext.Provider>
  )
}
