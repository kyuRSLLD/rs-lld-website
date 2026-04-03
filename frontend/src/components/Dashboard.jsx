import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  User, Package, ShoppingCart, Clock, DollarSign, TrendingUp,
  Star, RefreshCw, Bell, FileText, ChevronRight, BarChart2,
  CheckCircle, Truck, AlertCircle, Heart, MapPin, X, Save, Eye, EyeOff
} from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import { Link } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts'
import API_BASE from '../config/api'

const Dashboard = ({ user: initialUser, onUserUpdate }) => {
  const [activeTab, setActiveTab] = useState('overview')
  const [user, setUser] = useState(initialUser)
  const [orders, setOrders] = useState([])
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalSpent: 0,
    activeOrders: 0,
    savedAmount: 0,
  })

  // Edit Profile modal state
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [sameAsShipping, setSameAsShipping] = useState(false)

  const { currentLanguage } = useLanguage()

  const labels = {
    en: {
      welcome: 'Welcome back',
      managing: 'Managing supplies for',
      defaultManage: 'Manage your restaurant supplies',
      tabs: { overview: 'Overview', orders: 'Orders', analytics: 'Analytics' },
      stats: {
        totalOrders: 'Total Orders', totalSpent: 'Total Spent',
        activeOrders: 'Active Orders', totalSaved: 'Total Saved'
      },
      recentOrders: 'Recent Orders',
      viewAll: 'View All Orders',
      quickActions: 'Quick Actions',
      accountInfo: 'Account Information',
      editProfile: 'Edit Profile',
      savingsHighlight: "You're Saving Money!",
      savingsDesc: "With our bulk pricing, you've saved",
      savingsCompare: 'compared to retail prices.',
      viewReport: 'View Savings Report',
      browseProducts: 'Browse Products',
      reorderFav: 'Reorder Favorites',
      trackOrders: 'Track Orders',
      requestQuote: 'Request Quote',
      spendingTrend: 'Monthly Spending Trend',
      categoryBreakdown: 'Spending by Category',
      orderStatus: {
        pending: 'Pending', confirmed: 'Confirmed', packed: 'Packed',
        shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled'
      },
      notifications: 'Notifications',
      noNotifications: 'No new notifications',
      username: 'Username', email: 'Email', company: 'Company/Restaurant', phone: 'Phone',
      shippingAddress: 'Shipping Address', billingAddress: 'Billing Address',
      sameAsShipping: 'Same as shipping address',
      noOrders: 'No orders yet',
      noOrdersDesc: 'Your order history will appear here.',
      loading: 'Loading...',
      reorder: 'Reorder',
      items: 'items',
      // Edit modal
      editProfileTitle: 'Edit Profile',
      saveChanges: 'Save Changes',
      cancel: 'Cancel',
      profileUpdated: 'Profile updated successfully!',
      addressPlaceholder: 'Street, City, State ZIP',
    },
    zh: {
      welcome: '欢迎回来',
      managing: '管理供应商',
      defaultManage: '管理您的餐厅供应',
      tabs: { overview: '概览', orders: '订单', analytics: '数据分析' },
      stats: {
        totalOrders: '总订单数', totalSpent: '总消费',
        activeOrders: '活跃订单', totalSaved: '总节省'
      },
      recentOrders: '最近订单',
      viewAll: '查看所有订单',
      quickActions: '快捷操作',
      accountInfo: '账户信息',
      editProfile: '编辑资料',
      savingsHighlight: '您正在省钱！',
      savingsDesc: '通过我们的批量定价，您已节省',
      savingsCompare: '与零售价相比。',
      viewReport: '查看节省报告',
      browseProducts: '浏览产品',
      reorderFav: '重新订购收藏',
      trackOrders: '跟踪订单',
      requestQuote: '请求报价',
      spendingTrend: '月度消费趋势',
      categoryBreakdown: '按类别消费',
      orderStatus: {
        pending: '待处理', confirmed: '已确认', packed: '已打包',
        shipped: '已发货', delivered: '已送达', cancelled: '已取消'
      },
      notifications: '通知',
      noNotifications: '没有新通知',
      username: '用户名', email: '邮箱', company: '公司/餐厅', phone: '电话',
      shippingAddress: '送货地址', billingAddress: '账单地址',
      sameAsShipping: '与送货地址相同',
      noOrders: '暂无订单',
      noOrdersDesc: '您的订单历史将显示在这里。',
      loading: '加载中...',
      reorder: '重新订购',
      items: '件商品',
      editProfileTitle: '编辑资料',
      saveChanges: '保存更改',
      cancel: '取消',
      profileUpdated: '资料更新成功！',
      addressPlaceholder: '街道, 城市, 州 邮编',
    },
    ko: {
      welcome: '다시 오신 것을 환영합니다',
      managing: '공급 관리',
      defaultManage: '레스토랑 공급품 관리',
      tabs: { overview: '개요', orders: '주문', analytics: '분석' },
      stats: {
        totalOrders: '총 주문', totalSpent: '총 지출',
        activeOrders: '활성 주문', totalSaved: '총 절약'
      },
      recentOrders: '최근 주문',
      viewAll: '모든 주문 보기',
      quickActions: '빠른 작업',
      accountInfo: '계정 정보',
      editProfile: '프로필 편집',
      savingsHighlight: '절약하고 계십니다!',
      savingsDesc: '대량 구매 가격으로 절약한 금액:',
      savingsCompare: '소매가 대비.',
      viewReport: '절약 보고서 보기',
      browseProducts: '제품 둘러보기',
      reorderFav: '즐겨찾기 재주문',
      trackOrders: '주문 추적',
      requestQuote: '견적 요청',
      spendingTrend: '월별 지출 추세',
      categoryBreakdown: '카테고리별 지출',
      orderStatus: {
        pending: '대기 중', confirmed: '확인됨', packed: '포장됨',
        shipped: '배송 중', delivered: '배송 완료', cancelled: '취소됨'
      },
      notifications: '알림',
      noNotifications: '새 알림 없음',
      username: '사용자명', email: '이메일', company: '회사/식당', phone: '전화',
      shippingAddress: '배송 주소', billingAddress: '청구 주소',
      sameAsShipping: '배송 주소와 동일',
      noOrders: '주문 없음',
      noOrdersDesc: '주문 내역이 여기에 표시됩니다.',
      loading: '로딩 중...',
      reorder: '재주문',
      items: '개 항목',
      editProfileTitle: '프로필 편집',
      saveChanges: '변경 사항 저장',
      cancel: '취소',
      profileUpdated: '프로필이 성공적으로 업데이트되었습니다!',
      addressPlaceholder: '도로명, 시, 주 우편번호',
    }
  }

  const L = labels[currentLanguage] || labels.en

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0)

  // Fetch real orders from API
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/orders`, { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          setOrders(data)
          // Compute real stats
          const total = data.reduce((sum, o) => sum + (o.total_amount || 0), 0)
          const active = data.filter(o => ['pending', 'confirmed', 'packed', 'shipped'].includes(o.status)).length
          setStats({
            totalOrders: data.length,
            totalSpent: total,
            activeOrders: active,
            savedAmount: 0, // no savings tracking yet
          })
        }
      } catch (e) {
        console.error('Failed to fetch orders', e)
      } finally {
        setLoadingOrders(false)
      }
    }
    fetchOrders()
  }, [])

  // Open edit modal — pre-fill form with current user data
  const openEditModal = () => {
    setEditForm({
      username: user.username || '',
      email: user.email || '',
      company_name: user.company_name || '',
      phone: user.phone || '',
      shipping_address: user.shipping_address || '',
      billing_address: user.billing_address || '',
    })
    setSameAsShipping(false)
    setSaveError('')
    setSaveSuccess(false)
    setShowEditModal(true)
  }

  // Auto-format phone number as (xxx)xxx-xxxx while user types digits
  const formatPhone = (raw) => {
    const digits = raw.replace(/\D/g, '').slice(0, 10)
    if (digits.length === 0) return ''
    if (digits.length <= 3) return `(${digits}`
    if (digits.length <= 6) return `(${digits.slice(0, 3)})${digits.slice(3)}`
    return `(${digits.slice(0, 3)})${digits.slice(3, 6)}-${digits.slice(6)}`
  }

  const handleEditChange = (field, value) => {
    const formatted = field === 'phone' ? formatPhone(value) : value
    setEditForm(prev => {
      const updated = { ...prev, [field]: formatted }
      if (field === 'shipping_address' && sameAsShipping) {
        updated.billing_address = formatted
      }
      return updated
    })
  }

  const handleSameAsShipping = (checked) => {
    setSameAsShipping(checked)
    if (checked) {
      setEditForm(prev => ({ ...prev, billing_address: prev.shipping_address }))
    }
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    setSaveError('')
    setSaveSuccess(false)
    try {
      const res = await fetch(`${API_BASE}/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editForm),
      })
      const data = await res.json()
      if (res.ok) {
        setUser(data)
        if (onUserUpdate) onUserUpdate(data)
        setSaveSuccess(true)
        setTimeout(() => setShowEditModal(false), 1200)
      } else {
        setSaveError(data.error || 'Failed to save profile')
      }
    } catch (e) {
      setSaveError('Network error — please try again')
    } finally {
      setSaving(false)
    }
  }

  const statusIcon = (status) => {
    if (status === 'delivered') return <CheckCircle className="w-4 h-4 text-green-500" />
    if (status === 'shipped') return <Truck className="w-4 h-4 text-blue-500" />
    if (status === 'cancelled') return <X className="w-4 h-4 text-red-500" />
    return <AlertCircle className="w-4 h-4 text-yellow-500" />
  }

  const statusColor = (status) => {
    if (status === 'delivered') return 'bg-green-100 text-green-800'
    if (status === 'shipped') return 'bg-blue-100 text-blue-800'
    if (status === 'cancelled') return 'bg-red-100 text-red-800'
    if (status === 'confirmed') return 'bg-purple-100 text-purple-800'
    if (status === 'packed') return 'bg-indigo-100 text-indigo-800'
    return 'bg-yellow-100 text-yellow-800'
  }

  // Build monthly spending data from real orders
  const buildSpendingData = () => {
    const months = {}
    orders.forEach(o => {
      if (!o.created_at) return
      const d = new Date(o.created_at)
      const key = d.toLocaleString('en-US', { month: 'short', year: '2-digit' })
      months[key] = (months[key] || 0) + (o.total_amount || 0)
    })
    return Object.entries(months).slice(-6).map(([month, amount]) => ({ month, amount: Math.round(amount) }))
  }

  const spendingData = buildSpendingData()

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {L.welcome}, {user.username}!
            </h1>
            <p className="text-gray-500 mt-1">
              {user.company_name ? `${L.managing} ${user.company_name}` : L.defaultManage}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/products">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <ShoppingCart className="w-4 h-4 mr-2" />
                {L.browseProducts}
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: L.stats.totalOrders, value: stats.totalOrders, icon: Package, bg: 'bg-blue-50', iconColor: 'text-blue-600' },
            { label: L.stats.totalSpent, value: formatCurrency(stats.totalSpent), icon: DollarSign, bg: 'bg-green-50', iconColor: 'text-green-600' },
            { label: L.stats.activeOrders, value: stats.activeOrders, icon: Clock, bg: 'bg-orange-50', iconColor: 'text-orange-600' },
            { label: L.stats.totalSaved, value: formatCurrency(stats.savedAmount), icon: TrendingUp, bg: 'bg-purple-50', iconColor: 'text-purple-600', highlight: true },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">{stat.label}</p>
                  <p className={`text-2xl font-bold ${stat.highlight ? 'text-green-600' : 'text-gray-900'}`}>
                    {loadingOrders ? '—' : stat.value}
                  </p>
                </div>
                <div className={`w-11 h-11 ${stat.bg} rounded-xl flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl p-1 border border-gray-200 mb-6 w-fit">
          {Object.entries(L.tabs).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Recent Orders */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">{L.recentOrders}</h2>
                <button
                  onClick={() => setActiveTab('orders')}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  {L.viewAll} <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="divide-y divide-gray-50">
                {loadingOrders ? (
                  <div className="p-8 text-center text-gray-400">{L.loading}</div>
                ) : orders.length === 0 ? (
                  <div className="p-8 text-center">
                    <Package className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 font-medium">{L.noOrders}</p>
                    <p className="text-gray-400 text-sm">{L.noOrdersDesc}</p>
                  </div>
                ) : (
                  orders.slice(0, 5).map((order) => (
                    <div key={order.id} className="px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        {statusIcon(order.status)}
                        <div>
                          <p className="font-medium text-sm text-gray-900">{order.order_number}</p>
                          <p className="text-xs text-gray-500">
                            {order.created_at ? new Date(order.created_at).toLocaleDateString() : ''} · {order.item_count || 0} {L.items}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor(order.status)}`}>
                          {L.orderStatus[order.status] || order.status}
                        </span>
                        <span className="font-semibold text-sm text-gray-900">{formatCurrency(order.total_amount)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-5">
              {/* Account Info */}
              <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">{L.accountInfo}</h2>
                <div className="space-y-3">
                  {[
                    { icon: User, label: L.username, value: user.username },
                    { icon: FileText, label: L.email, value: user.email },
                    ...(user.company_name ? [{ icon: Package, label: L.company, value: user.company_name }] : []),
                    ...(user.phone ? [{ icon: Bell, label: L.phone, value: user.phone }] : []),
                    ...(user.shipping_address ? [{ icon: MapPin, label: L.shippingAddress, value: user.shipping_address }] : []),
                    ...(user.billing_address && user.billing_address !== user.shipping_address
                      ? [{ icon: MapPin, label: L.billingAddress, value: user.billing_address }] : []),
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <item.icon className="w-4 h-4 text-gray-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500">{item.label}</p>
                        <p className="font-medium text-sm text-gray-900">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  className="w-full mt-4 text-sm"
                  onClick={openEditModal}
                >
                  {L.editProfile}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">{L.recentOrders}</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {loadingOrders ? (
                <div className="p-8 text-center text-gray-400">{L.loading}</div>
              ) : orders.length === 0 ? (
                <div className="p-8 text-center">
                  <Package className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 font-medium">{L.noOrders}</p>
                  <p className="text-gray-400 text-sm">{L.noOrdersDesc}</p>
                </div>
              ) : (
                orders.map((order) => (
                  <div key={order.id} className="px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      {statusIcon(order.status)}
                      <div>
                        <p className="font-medium text-sm text-gray-900">{order.order_number}</p>
                        <p className="text-xs text-gray-500">
                          {order.created_at ? new Date(order.created_at).toLocaleDateString() : ''} · {order.item_count || 0} {L.items}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor(order.status)}`}>
                        {L.orderStatus[order.status] || order.status}
                      </span>
                      <span className="font-semibold text-sm">{formatCurrency(order.total_amount)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-blue-600" /> {L.spendingTrend}
              </h2>
              {spendingData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-gray-400">{L.noOrders}</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={spendingData}>
                    <defs>
                      <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                    <Tooltip formatter={(v) => [`$${v}`, 'Spent']} />
                    <Area type="monotone" dataKey="amount" stroke="#2563eb" strokeWidth={2} fill="url(#colorAmt)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
              <div className="space-y-3">
                {[
                  { label: L.orderStatus.delivered, count: orders.filter(o => o.status === 'delivered').length, color: 'bg-green-500' },
                  { label: L.orderStatus.shipped, count: orders.filter(o => o.status === 'shipped').length, color: 'bg-blue-500' },
                  { label: L.orderStatus.confirmed, count: orders.filter(o => o.status === 'confirmed').length, color: 'bg-purple-500' },
                  { label: L.orderStatus.pending, count: orders.filter(o => o.status === 'pending').length, color: 'bg-yellow-500' },
                  { label: L.orderStatus.cancelled, count: orders.filter(o => o.status === 'cancelled').length, color: 'bg-red-500' },
                ].filter(s => s.count > 0).map((s, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${s.color}`} />
                    <span className="text-sm text-gray-700 flex-1">{s.label}</span>
                    <span className="font-semibold text-sm text-gray-900">{s.count}</span>
                  </div>
                ))}
                {orders.length === 0 && <p className="text-gray-400 text-sm">{L.noOrders}</p>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[95vh] sm:max-h-[90vh] overflow-y-auto my-auto">
            <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">{L.editProfileTitle}</h2>
              <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{L.username}</label>
                <input
                  type="text"
                  value={editForm.username}
                  onChange={e => handleEditChange('username', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{L.email}</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={e => handleEditChange('email', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Company */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{L.company}</label>
                <input
                  type="text"
                  value={editForm.company_name}
                  onChange={e => handleEditChange('company_name', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{L.phone}</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={e => handleEditChange('phone', e.target.value)}
                  placeholder="(xxx)xxx-xxxx"
                  maxLength={13}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Shipping Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-gray-400" /> {L.shippingAddress}
                </label>
                <textarea
                  value={editForm.shipping_address}
                  onChange={e => handleEditChange('shipping_address', e.target.value)}
                  placeholder={L.addressPlaceholder}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Billing Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-gray-400" /> {L.billingAddress}
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    id="sameAsShipping"
                    checked={sameAsShipping}
                    onChange={e => handleSameAsShipping(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="sameAsShipping" className="text-sm text-gray-600 cursor-pointer">
                    {L.sameAsShipping}
                  </label>
                </div>
                {!sameAsShipping && (
                  <textarea
                    value={editForm.billing_address}
                    onChange={e => handleEditChange('billing_address', e.target.value)}
                    placeholder={L.addressPlaceholder}
                    rows={2}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                )}
              </div>

              {/* Error / Success */}
              {saveError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                  {saveError}
                </div>
              )}
              {saveSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> {L.profileUpdated}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowEditModal(false)}
                disabled={saving}
              >
                {L.cancel}
              </Button>
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleSaveProfile}
                disabled={saving}
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {L.saveChanges}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
