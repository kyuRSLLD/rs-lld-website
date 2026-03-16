import API_BASE from '../config/api'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Search, ShoppingCart, Sparkles, X, Tag, CheckCircle, Package } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import { useCart } from '../contexts/CartContext'

const ProductsPage = () => {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [aiLoading, setAiLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [aiSuggestion, setAiSuggestion] = useState('')
  const [isAiSearch, setIsAiSearch] = useState(false)
  const [addedProductId, setAddedProductId] = useState(null)
  const searchTimeout = useRef(null)
  const { currentLanguage } = useLanguage()
  const { addToCart, cartCount } = useCart()
  const navigate = useNavigate()

  const labels = {
    en: {
      title: 'Product Catalog',
      subtitle: 'Browse our full selection of restaurant supplies — from disposables to kitchen tools',
      searchPlaceholder: 'Search products or ask in natural language...',
      aiSearchPlaceholder: 'Try: "ingredients for Italian pasta" or "cleaning supplies"',
      allCategories: 'All Categories',
      inStock: 'In Stock',
      outOfStock: 'Out of Stock',
      addToCart: 'Add to Cart',
      noProducts: 'No products found matching your criteria.',
      bulk: 'bulk',
      aiPowered: 'AI-Powered Search',
      normalSearch: 'Normal Search',
      cartTitle: 'Shopping Cart',
      cartEmpty: 'Your cart is empty',
      total: 'Total',
      checkout: 'Request Quote',
      remove: 'Remove',
      loading: 'Loading products...',
      aiSearching: 'AI is searching...',
    },
    zh: {
      title: '产品目录',
      subtitle: '浏览我们为您的餐厅提供的大量非易腐商品',
      searchPlaceholder: '搜索产品或用自然语言提问...',
      aiSearchPlaceholder: '试试："意大利面食材" 或 "清洁用品"',
      allCategories: '所有类别',
      inStock: '有货',
      outOfStock: '缺货',
      addToCart: '加入购物车',
      noProducts: '未找到符合条件的产品。',
      bulk: '批量',
      aiPowered: 'AI 智能搜索',
      normalSearch: '普通搜索',
      cartTitle: '购物车',
      cartEmpty: '购物车为空',
      total: '总计',
      checkout: '请求报价',
      remove: '移除',
      loading: '加载产品中...',
      aiSearching: 'AI 正在搜索...',
    },
    ko: {
      title: '제품 카탈로그',
      subtitle: '레스토랑을 위한 다양한 비부패성 상품을 둘러보세요',
      searchPlaceholder: '제품 검색 또는 자연어로 질문...',
      aiSearchPlaceholder: '예: "이탈리아 파스타 재료" 또는 "청소 용품"',
      allCategories: '모든 카테고리',
      inStock: '재고 있음',
      outOfStock: '품절',
      addToCart: '장바구니 추가',
      noProducts: '조건에 맞는 제품이 없습니다.',
      bulk: '대량',
      aiPowered: 'AI 스마트 검색',
      normalSearch: '일반 검색',
      cartTitle: '장바구니',
      cartEmpty: '장바구니가 비어 있습니다',
      total: '합계',
      checkout: '견적 요청',
      remove: '제거',
      loading: '제품 로딩 중...',
      aiSearching: 'AI 검색 중...',
    }
  }

  const L = labels[currentLanguage] || labels.en

  useEffect(() => {
    fetchCategories()
    fetchProducts()
  }, [selectedCategory])

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/categories`, { cache: 'no-store' })
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const fetchProducts = async (search = '') => {
    setLoading(true)
    setIsAiSearch(false)
    setAiSuggestion('')
    try {
      const params = new URLSearchParams()
      if (selectedCategory) params.append('category_id', selectedCategory)
      if (search) params.append('search', search)
      const response = await fetch(`${API_BASE}/api/products?${params}`, { cache: 'no-store' })
      if (response.ok) {
        const data = await response.json()
        setProducts(data.products || [])
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const runAiSearch = async (query) => {
    if (!query.trim()) {
      fetchProducts()
      return
    }
    setAiLoading(true)
    setIsAiSearch(true)
    try {
      const response = await fetch(`${API_BASE}/api/search/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, language: currentLanguage })
      })
      const data = await response.json()
      if (data.success) {
        setProducts(data.products || [])
        setAiSuggestion(data.suggestion || '')
      }
    } catch (error) {
      console.error('AI search error:', error)
      fetchProducts(query)
    } finally {
      setAiLoading(false)
      setLoading(false)
    }
  }

  const handleSearchChange = (e) => {
    const val = e.target.value
    setSearchTerm(val)
    clearTimeout(searchTimeout.current)
    if (!val.trim()) {
      fetchProducts()
      return
    }
    // Debounce: use AI search after 600ms of no typing
    searchTimeout.current = setTimeout(() => {
      runAiSearch(val)
    }, 600)
  }

  const clearSearch = () => {
    setSearchTerm('')
    setAiSuggestion('')
    setIsAiSearch(false)
    fetchProducts()
  }

  const handleAddToCart = (product) => {
    addToCart(product, 1)
    setAddedProductId(product.id)
    setTimeout(() => setAddedProductId(null), 1500)
  }

  const formatPrice = (price) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price)

  const categoryIcons = {
    'Disposable Goods': '🧤',
    'Kitchen Tools': '🔪',
    'Cleaning Supplies': '🧹',
    'Packaging Supplies': '📦',
    'Pest Control': '🐜',
    'Dry Ingredients': '🌾',
  }

  // Translations for category names by language
  const categoryTranslations = {
    zh: {
      'Disposable Goods': '一次性用品',
      'Kitchen Tools': '厨房工具',
      'Cleaning Supplies': '清洁用品',
      'Packaging Supplies': '包装用品',
      'Pest Control': '害虫防治',
      'Dry Ingredients': '干货食材',
    },
    ko: {
      'Disposable Goods': '일회용품',
      'Kitchen Tools': '주방 도구',
      'Cleaning Supplies': '청소 용품',
      'Packaging Supplies': '포장 용품',
      'Pest Control': '해충 방제',
      'Dry Ingredients': '건조 식재료',
    },
  }

  const getCategoryName = (name) => {
    if (currentLanguage === 'en') return name
    return (categoryTranslations[currentLanguage] || {})[name] || name
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{L.title}</h1>
            <p className="text-gray-600">{L.subtitle}</p>
          </div>
          {/* Cart Button */}
          <button
            onClick={() => navigate('/checkout')}
            className="relative bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <ShoppingCart className="w-5 h-5" />
            <span className="font-medium">{cartCount}</span>
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white rounded-xl shadow-sm p-5 mb-8 border border-gray-100">
          <div className="flex flex-col md:flex-row gap-4">
            {/* AI Search Input */}
            <div className="flex-1 relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {aiLoading ? (
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                ) : isAiSearch ? (
                  <Sparkles className="w-4 h-4 text-purple-500" />
                ) : (
                  <Search className="w-4 h-4 text-gray-400" />
                )}
              </div>
              <input
                type="text"
                placeholder={isAiSearch ? L.aiSearchPlaceholder : L.searchPlaceholder}
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              {searchTerm && (
                <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category Filter */}
            <div className="md:w-56">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="">{L.allCategories}</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {categoryIcons[cat.name] || '📦'} {getCategoryName(cat.name)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* AI Search Badge & Suggestion */}
          {isAiSearch && (
            <div className="mt-3 flex items-start gap-2">
              <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full font-medium flex-shrink-0">
                <Sparkles className="w-3 h-3" /> {L.aiPowered}
              </span>
              {aiSuggestion && (
                <p className="text-sm text-gray-600 italic">{aiSuggestion}</p>
              )}
            </div>
          )}
        </div>

        {/* Category Quick Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory('')}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              !selectedCategory ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300'
            }`}
          >
            {L.allCategories}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(String(cat.id))}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === String(cat.id) ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300'
              }`}
            >
              {categoryIcons[cat.name] || '📦'} {getCategoryName(cat.name)}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        {loading || aiLoading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3"></div>
            <p className="text-gray-500">{aiLoading ? L.aiSearching : L.loading}</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-lg">{L.noProducts}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {products.map((product) => (
              <Link
                key={product.id}
                to={`/products/${product.sku}`}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 flex flex-col cursor-pointer group"
              >
                {/* Product Image */}
                <div className="w-full h-44 bg-gray-50 rounded-t-xl flex items-center justify-center overflow-hidden border-b border-gray-100 group-hover:opacity-90 transition-opacity">
                    {product.image_url ? (
                      <img
                        src={product.image_url.startsWith('data:') || product.image_url.startsWith('http') ? product.image_url : `${API_BASE}${product.image_url}`}
                        alt={product.name}
                        className="w-full h-full object-contain p-2"
                        onError={(e) => {
                          e.target.style.display = 'none'
                          e.target.parentElement.innerHTML = `<span class="text-4xl">${categoryIcons[product.category_name] || '📦'}</span>`
                        }}
                      />
                    ) : (
                      <span className="text-4xl">{categoryIcons[product.category_name] || '📦'}</span>
                    )}
                </div>

                {/* Product Info */}
                <div className="p-4 flex flex-col flex-1">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2 flex-1 group-hover:text-blue-600 transition-colors">
                      {product.name}
                    </h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                      product.in_stock ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {product.in_stock ? L.inStock : L.outOfStock}
                    </span>
                  </div>

                  <p className="text-xs text-gray-500 mb-1">{product.brand} · {product.unit_size}</p>

                  <span className="inline-block bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded mb-3 w-fit">
                    {categoryIcons[product.category_name] || ''} {getCategoryName(product.category_name)}
                  </span>

                  {/* Pricing */}
                  <div className="mt-auto">
                    <p className="text-xl font-bold text-gray-900">{formatPrice(product.unit_price)}</p>
                    {product.bulk_price && (
                      <p className="text-xs text-green-600 font-medium">
                        {formatPrice(product.bulk_price)} {L.bulk} ({product.bulk_quantity}+ units)
                      </p>
                    )}

                    <Button
                      className={`w-full mt-3 text-white text-sm transition-all ${
                        addedProductId === product.id
                          ? 'bg-green-500 hover:bg-green-500'
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                      disabled={!product.in_stock}
                      onClick={(e) => { e.preventDefault(); handleAddToCart(product); }}
                    >
                      {addedProductId === product.id ? (
                        <><CheckCircle className="w-4 h-4 mr-2" /> Added!</>
                      ) : (
                        <><ShoppingCart className="w-4 h-4 mr-2" /> {L.addToCart}</>
                      )}
                    </Button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Cart Sidebar removed - cart managed globally via CartContext and Header */}
      {false && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => {}} />
          <div className="relative bg-white w-full max-w-sm h-full flex flex-col shadow-2xl">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-blue-700 text-white">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" /> {L.cartTitle}
              </h2>
              <button onClick={() => setCartOpen(false)} className="hover:bg-blue-800 rounded-full p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>{L.cartEmpty}</p>
                </div>
              ) : (
                cart.map(item => {
                  const price = item.qty >= (item.bulk_quantity || 999) ? item.bulk_price : item.unit_price
                  return (
                    <div key={item.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">{item.name}</p>
                        <p className="text-xs text-gray-500">{item.qty} × {formatPrice(price)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">{formatPrice(price * item.qty)}</p>
                        <button onClick={() => removeFromCart(item.id)} className="text-xs text-red-500 hover:text-red-700">
                          {L.remove}
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
            {cart.length > 0 && (
              <div className="p-4 border-t border-gray-200">
                <div className="flex justify-between font-bold text-lg mb-3">
                  <span>{L.total}</span>
                  <span>{formatPrice(cartTotal)}</span>
                </div>
                <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                  {L.checkout}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ProductsPage
