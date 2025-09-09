import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Search, Filter, ShoppingCart } from 'lucide-react'

const ProductsPage = () => {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')

  useEffect(() => {
    fetchCategories()
    fetchProducts()
  }, [selectedCategory, searchTerm])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const fetchProducts = async () => {
    try {
      const params = new URLSearchParams()
      if (selectedCategory) params.append('category_id', selectedCategory)
      if (searchTerm) params.append('search', searchTerm)
      
      const response = await fetch(`/api/products?${params}`)
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

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Product Catalog</h1>
          <p className="text-gray-600">
            Browse our extensive selection of non-perishable goods for your restaurant
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="md:w-64">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading products...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <div key={product.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <div className="p-6">
                  {/* Product Image Placeholder */}
                  <div className="w-full h-48 bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
                    <span className="text-gray-400 text-sm">No Image</span>
                  </div>

                  {/* Product Info */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-900 line-clamp-2">{product.name}</h3>
                    <p className="text-sm text-gray-600">{product.brand}</p>
                    <p className="text-sm text-gray-500">{product.unit_size}</p>
                    
                    {/* Category */}
                    <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                      {product.category_name}
                    </span>

                    {/* Pricing */}
                    <div className="pt-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-lg font-bold text-gray-900">
                            {formatPrice(product.unit_price)}
                          </p>
                          {product.bulk_price && (
                            <p className="text-sm text-green-600">
                              {formatPrice(product.bulk_price)} bulk ({product.bulk_quantity}+ units)
                            </p>
                          )}
                        </div>
                        <div className={`text-xs px-2 py-1 rounded ${
                          product.in_stock 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {product.in_stock ? 'In Stock' : 'Out of Stock'}
                        </div>
                      </div>
                    </div>

                    {/* Add to Cart Button */}
                    <Button 
                      className="w-full mt-4" 
                      disabled={!product.in_stock}
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Add to Cart
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {products.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No products found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProductsPage

