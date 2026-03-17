import API_BASE from '../config/api'
import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ShoppingCart, ArrowLeft, CheckCircle, Package, Tag, Star, Truck, Shield, RefreshCw } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import { useCart } from '../contexts/CartContext'

const ProductDetailPage = () => {
  const { sku } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [added, setAdded] = useState(false)
  const [qty, setQty] = useState(1)
  const { currentLanguage } = useLanguage()
  const { addToCart } = useCart()

  const L = {
    en: {
      back: 'Back to Products',
      addToCart: 'Add to Cart',
      added: 'Added to Cart!',
      inStock: 'In Stock',
      outOfStock: 'Out of Stock',
      sku: 'SKU',
      brand: 'Brand',
      unitSize: 'Unit Size',
      category: 'Category',
      unitPrice: 'Unit Price',
      bulkPrice: 'Bulk Price',
      bulkNote: 'per unit when ordering',
      orMore: 'or more',
      qty: 'Quantity',
      description: 'Product Description',
      whyUs: 'Why Buy From Us?',
      cheaper: '10% cheaper than Amazon',
      shipping: 'Free shipping on orders over $150',
      quality: 'Commercial-grade quality guaranteed',
      returns: '30-day hassle-free returns',
      notFound: 'Product not found.',
      loading: 'Loading product...',
      relatedTitle: 'You May Also Need',
    },
    zh: {
      back: '返回产品列表',
      addToCart: '加入购物车',
      added: '已加入购物车！',
      inStock: '有货',
      outOfStock: '缺货',
      sku: '货号',
      brand: '品牌',
      unitSize: '规格',
      category: '类别',
      unitPrice: '单价',
      bulkPrice: '批量价',
      bulkNote: '每件，订购',
      orMore: '件或以上',
      qty: '数量',
      description: '产品描述',
      whyUs: '为什么选择我们？',
      cheaper: '比亚马逊便宜10%',
      shipping: '订单满$150免运费',
      quality: '保证商业级品质',
      returns: '30天无忧退货',
      notFound: '未找到产品。',
      loading: '加载产品中...',
      relatedTitle: '您可能还需要',
    },
    ko: {
      back: '제품 목록으로',
      addToCart: '장바구니 추가',
      added: '장바구니에 추가됨!',
      inStock: '재고 있음',
      outOfStock: '품절',
      sku: '제품 코드',
      brand: '브랜드',
      unitSize: '단위',
      category: '카테고리',
      unitPrice: '단가',
      bulkPrice: '대량 가격',
      bulkNote: '개 이상 주문 시',
      orMore: '개 이상',
      qty: '수량',
      description: '제품 설명',
      whyUs: '왜 저희를 선택하나요?',
      cheaper: '아마존보다 10% 저렴',
      shipping: '$150 이상 주문 시 무료 배송',
      quality: '상업용 품질 보장',
      returns: '30일 무조건 반품',
      notFound: '제품을 찾을 수 없습니다.',
      loading: '제품 로딩 중...',
      relatedTitle: '함께 필요한 제품',
    },
  }
  const t = L[currentLanguage] || L.en

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
    if (!name || currentLanguage === 'en') return name
    return (categoryTranslations[currentLanguage] || {})[name] || name
  }

  const [related, setRelated] = useState([])

  useEffect(() => {
    setLoading(true)
    setError(null)
    setRelated([])
    fetch(`${API_BASE}/api/products/sku/${sku}`, { cache: 'no-store' })
      .then(r => {
        if (!r.ok) throw new Error('not found')
        return r.json()
      })
      .then(data => {
        setProduct(data)
        // Fetch related products from same category
        const catName = data.category_name || ''
        if (catName) {
          fetch(`${API_BASE}/api/products?category=${encodeURIComponent(catName)}&per_page=5`, { cache: 'no-store' })
            .then(r => r.ok ? r.json() : { products: [] })
            .then(res => {
              const others = (res.products || []).filter(p => p.sku !== sku).slice(0, 4)
              setRelated(others)
            })
            .catch(() => {})
        }
        setLoading(false)
      })
      .catch(() => {
        setError(t.notFound)
        setLoading(false)
      })
  }, [sku])

  const formatPrice = (p) => p != null ? `$${Number(p).toFixed(2)}` : ''

  const handleAddToCart = () => {
    if (!product) return
    addToCart(product, qty)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const effectivePrice = product && qty >= (product.bulk_quantity || 9999) && product.bulk_price
    ? product.bulk_price
    : product?.unit_price

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-500">{t.loading}</p>
      </div>
    </div>
  )

  if (error || !product) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 mb-4">{error || t.notFound}</p>
        <Button onClick={() => navigate('/products')} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" /> {t.back}
        </Button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link to="/" className="hover:text-blue-600">Home</Link>
          <span>/</span>
          <Link to="/products" className="hover:text-blue-600">Products</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium truncate">{product.name}</span>
        </nav>

        {/* Main Product Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
          <div className="grid md:grid-cols-2 gap-0">
            {/* Image */}
            <div className="bg-gray-50 flex items-center justify-center p-8 min-h-[320px] relative">
              {product.image_url ? (
                <img
                  src={product.image_url.startsWith('data:') || product.image_url.startsWith('http') ? product.image_url : `${API_BASE}${product.image_url}`}
                  alt={product.name}
                  className={`max-h-72 max-w-full object-contain rounded-lg transition-all duration-200 ${!product.in_stock ? 'grayscale opacity-50' : ''}`}
                  onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
                />
              ) : null}
              <div className={`${product.image_url ? 'hidden' : 'flex'} flex-col items-center justify-center text-gray-300 ${!product.in_stock ? 'opacity-50' : ''}`}>
                <Package className="w-24 h-24 mb-2" />
                <span className="text-sm">No image</span>
              </div>
              {!product.in_stock && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="bg-gray-700/70 text-white text-sm font-semibold px-4 py-2 rounded-full">{t.outOfStock}</span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-8 flex flex-col">
              {/* Category badge */}
              <span className="inline-block bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1 rounded-full mb-3 w-fit">
                {getCategoryName(product.category_name)}
              </span>

              <h1 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h1>

              {/* Stock */}
              <span className={`inline-flex items-center gap-1.5 text-sm font-medium mb-4 ${product.in_stock ? 'text-green-600' : 'text-red-500'}`}>
                <span className={`w-2 h-2 rounded-full ${product.in_stock ? 'bg-green-500' : 'bg-red-400'}`}></span>
                {product.in_stock ? t.inStock : t.outOfStock}
              </span>

              {/* Pricing */}
              <div className="bg-blue-50 rounded-xl p-4 mb-5">
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-bold text-blue-700">{formatPrice(effectivePrice)}</span>
                  <span className="text-sm text-gray-500">/ {product.unit_size || 'unit'}</span>
                </div>
                {product.bulk_price && product.bulk_quantity && (
                  <p className="text-sm text-green-700 font-medium mt-1">
                    {formatPrice(product.bulk_price)} {t.bulkNote} {product.bulk_quantity}+ {t.orMore}
                  </p>
                )}
                <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                  <Tag className="w-3 h-3" /> 10% cheaper than Amazon
                </p>
              </div>

              {/* Meta */}
              <div className="grid grid-cols-2 gap-3 text-sm mb-5">
                <div><span className="text-gray-500">{t.sku}:</span> <span className="font-medium text-gray-900">{product.sku}</span></div>
                {product.brand && <div><span className="text-gray-500">{t.brand}:</span> <span className="font-medium text-gray-900">{product.brand}</span></div>}
                {product.unit_size && <div><span className="text-gray-500">{t.unitSize}:</span> <span className="font-medium text-gray-900">{product.unit_size}</span></div>}
                {product.category_name && <div><span className="text-gray-500">{t.category}:</span> <span className="font-medium text-gray-900">{getCategoryName(product.category_name)}</span></div>}
              </div>

              {/* Qty + Add to Cart */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`flex items-center border rounded-lg overflow-hidden ${!product.in_stock ? 'border-gray-200 opacity-40 pointer-events-none' : 'border-gray-200'}`}>
                  <button
                    className="px-3 py-2 text-gray-600 hover:bg-gray-100 transition-colors text-lg font-medium"
                    onClick={() => setQty(q => Math.max(1, q - 1))}
                    disabled={!product.in_stock}
                  >−</button>
                  <span className="px-4 py-2 font-semibold text-gray-900 min-w-[3rem] text-center">{qty}</span>
                  <button
                    className="px-3 py-2 text-gray-600 hover:bg-gray-100 transition-colors text-lg font-medium"
                    onClick={() => setQty(q => q + 1)}
                    disabled={!product.in_stock}
                  >+</button>
                </div>
                <Button
                  className={`flex-1 text-white transition-all ${
                    !product.in_stock
                      ? 'bg-gray-400 hover:bg-gray-400 cursor-not-allowed'
                      : added
                        ? 'bg-green-500 hover:bg-green-500'
                        : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                  disabled={!product.in_stock}
                  onClick={handleAddToCart}
                >
                  {!product.in_stock ? (
                    t.outOfStock
                  ) : added ? (
                    <><CheckCircle className="w-4 h-4 mr-2" /> {t.added}</>
                  ) : (
                    <><ShoppingCart className="w-4 h-4 mr-2" /> {t.addToCart}</>
                  )}
                </Button>
              </div>

              <Button variant="outline" onClick={() => navigate('/products')} className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" /> {t.back}
              </Button>
            </div>
          </div>
        </div>

        {/* Description + Why Us */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Description */}
          <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" /> {t.description}
            </h2>
            <p className="text-gray-700 leading-relaxed text-base">
              {product.description || 'No description available.'}
            </p>
          </div>

          {/* Why Buy From Us */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl shadow-sm p-8 text-white">
            <h2 className="text-lg font-bold mb-5 flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-300" /> {t.whyUs}
            </h2>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <Tag className="w-5 h-5 text-yellow-300 flex-shrink-0 mt-0.5" />
                <span className="text-sm">{t.cheaper}</span>
              </li>
              <li className="flex items-start gap-3">
                <Truck className="w-5 h-5 text-yellow-300 flex-shrink-0 mt-0.5" />
                <span className="text-sm">{t.shipping}</span>
              </li>
              <li className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-yellow-300 flex-shrink-0 mt-0.5" />
                <span className="text-sm">{t.quality}</span>
              </li>
              <li className="flex items-start gap-3">
                <RefreshCw className="w-5 h-5 text-yellow-300 flex-shrink-0 mt-0.5" />
                <span className="text-sm">{t.returns}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{t.relatedTitle}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {related.map(p => (
                <Link
                  key={p.sku}
                  to={`/products/${p.sku}`}
                  className="bg-white rounded-xl border border-gray-100 hover:border-blue-300 hover:shadow-md transition-all overflow-hidden group"
                >
                  <div className="bg-gray-50 h-36 flex items-center justify-center p-3">
                    {p.image_url ? (
                      <img
                        src={p.image_url.startsWith('data:') || p.image_url.startsWith('http') ? p.image_url : `${API_BASE}${p.image_url}`}
                        alt={p.name}
                        className="max-h-28 max-w-full object-contain group-hover:scale-105 transition-transform"
                        onError={e => { e.target.style.display = 'none' }}
                      />
                    ) : (
                      <Package className="w-12 h-12 text-gray-300" />
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1">{p.name}</p>
                    <p className="text-sm font-bold text-blue-700">${Number(p.unit_price).toFixed(2)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProductDetailPage
