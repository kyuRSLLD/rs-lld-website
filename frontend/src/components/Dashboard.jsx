import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  User, Package, ShoppingCart, Clock, DollarSign, TrendingUp,
  Star, RefreshCw, Bell, FileText, ChevronRight, BarChart2,
  CheckCircle, Truck, AlertCircle, Heart
} from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import { Link } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts'

const Dashboard = ({ user }) => {
  const [activeTab, setActiveTab] = useState('overview')
  const [stats] = useState({
    totalOrders: 24,
    totalSpent: 15420.50,
    activeOrders: 3,
    savedAmount: 2340.75,
    favoriteItems: 8,
    pendingInvoices: 2
  })
  const { currentLanguage } = useLanguage()

  const labels = {
    en: {
      welcome: 'Welcome back',
      managing: 'Managing supplies for',
      defaultManage: 'Manage your restaurant supplies',
      tabs: { overview: 'Overview', orders: 'Orders', favorites: 'Saved Lists', analytics: 'Analytics' },
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
      orderStatus: { Delivered: 'Delivered', 'In Transit': 'In Transit', Processing: 'Processing' },
      notifications: 'Notifications',
      noNotifications: 'No new notifications',
      username: 'Username', email: 'Email', company: 'Company', phone: 'Phone',
      savedLists: 'Saved Shopping Lists',
      createList: 'Create New List',
      myList: 'My Regular Order',
      listItems: 'items',
      lastUpdated: 'Last updated',
      reorder: 'Reorder'
    },
    zh: {
      welcome: '欢迎回来',
      managing: '管理供应商',
      defaultManage: '管理您的餐厅供应',
      tabs: { overview: '概览', orders: '订单', favorites: '收藏清单', analytics: '数据分析' },
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
      orderStatus: { Delivered: '已送达', 'In Transit': '运输中', Processing: '处理中' },
      notifications: '通知',
      noNotifications: '没有新通知',
      username: '用户名', email: '邮箱', company: '公司', phone: '电话',
      savedLists: '已保存的购物清单',
      createList: '创建新清单',
      myList: '我的常规订单',
      listItems: '件商品',
      lastUpdated: '最后更新',
      reorder: '重新订购'
    },
    ko: {
      welcome: '다시 오신 것을 환영합니다',
      managing: '공급 관리',
      defaultManage: '레스토랑 공급품 관리',
      tabs: { overview: '개요', orders: '주문', favorites: '저장 목록', analytics: '분석' },
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
      orderStatus: { Delivered: '배송 완료', 'In Transit': '배송 중', Processing: '처리 중' },
      notifications: '알림',
      noNotifications: '새 알림 없음',
      username: '사용자명', email: '이메일', company: '회사', phone: '전화',
      savedLists: '저장된 쇼핑 목록',
      createList: '새 목록 만들기',
      myList: '정기 주문',
      listItems: '개 항목',
      lastUpdated: '마지막 업데이트',
      reorder: '재주문'
    }
  }

  const L = labels[currentLanguage] || labels.en

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)

  const recentOrders = [
    { id: 'ORD-2024-024', date: '2024-01-15', items: 12, total: 450.25, status: 'Delivered' },
    { id: 'ORD-2024-023', date: '2024-01-10', items: 8, total: 320.50, status: 'In Transit' },
    { id: 'ORD-2024-022', date: '2024-01-05', items: 15, total: 680.75, status: 'Processing' },
    { id: 'ORD-2024-021', date: '2023-12-28', items: 6, total: 210.00, status: 'Delivered' },
    { id: 'ORD-2024-020', date: '2023-12-20', items: 20, total: 890.40, status: 'Delivered' },
  ]

  const spendingData = [
    { month: 'Aug', amount: 1200 },
    { month: 'Sep', amount: 1850 },
    { month: 'Oct', amount: 1400 },
    { month: 'Nov', amount: 2100 },
    { month: 'Dec', amount: 1750 },
    { month: 'Jan', amount: 2340 },
  ]

  const categoryData = [
    { name: 'Canned', amount: 3200 },
    { name: 'Dry', amount: 2800 },
    { name: 'Condiments', amount: 1900 },
    { name: 'Cleaning', amount: 1400 },
    { name: 'Paper', amount: 1100 },
    { name: 'Packaging', amount: 900 },
  ]

  const statusIcon = (status) => {
    if (status === 'Delivered') return <CheckCircle className="w-4 h-4 text-green-500" />
    if (status === 'In Transit') return <Truck className="w-4 h-4 text-blue-500" />
    return <AlertCircle className="w-4 h-4 text-yellow-500" />
  }

  const statusColor = (status) => {
    if (status === 'Delivered') return 'bg-green-100 text-green-800'
    if (status === 'In Transit') return 'bg-blue-100 text-blue-800'
    return 'bg-yellow-100 text-yellow-800'
  }

  const savedLists = [
    { id: 1, name: L.myList, items: 14, lastUpdated: '2024-01-12', total: 520.00 },
    { id: 2, name: 'Weekly Essentials', items: 8, lastUpdated: '2024-01-08', total: 280.50 },
    { id: 3, name: 'Monthly Bulk Order', items: 22, lastUpdated: '2023-12-30', total: 1240.75 },
  ]

  const notifications = [
    { id: 1, type: 'info', message: 'Your order ORD-2024-023 is on its way!', time: '2h ago' },
    { id: 2, type: 'success', message: 'Bulk discount applied: saved $45 on your last order', time: '1d ago' },
    { id: 3, type: 'warning', message: 'Diced Tomatoes (DT-28) is running low in stock', time: '2d ago' },
  ]

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
            <button className="relative p-2 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
              <Bell className="w-5 h-5 text-gray-600" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {notifications.length}
              </span>
            </button>
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
            { label: L.stats.totalOrders, value: stats.totalOrders, icon: Package, color: 'blue', bg: 'bg-blue-50', iconColor: 'text-blue-600' },
            { label: L.stats.totalSpent, value: formatCurrency(stats.totalSpent), icon: DollarSign, color: 'green', bg: 'bg-green-50', iconColor: 'text-green-600' },
            { label: L.stats.activeOrders, value: stats.activeOrders, icon: Clock, color: 'orange', bg: 'bg-orange-50', iconColor: 'text-orange-600' },
            { label: L.stats.totalSaved, value: formatCurrency(stats.savedAmount), icon: TrendingUp, color: 'purple', bg: 'bg-purple-50', iconColor: 'text-purple-600', highlight: true },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">{stat.label}</p>
                  <p className={`text-2xl font-bold ${stat.highlight ? 'text-green-600' : 'text-gray-900'}`}>
                    {stat.value}
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

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Recent Orders */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">{L.recentOrders}</h2>
                <Button variant="outline" size="sm" className="text-xs">
                  {L.viewAll} <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
              <div className="divide-y divide-gray-50">
                {recentOrders.slice(0, 4).map((order) => (
                  <div key={order.id} className="px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      {statusIcon(order.status)}
                      <div>
                        <p className="font-medium text-sm text-gray-900">{order.id}</p>
                        <p className="text-xs text-gray-500">{order.date} · {order.items} items</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor(order.status)}`}>
                        {L.orderStatus[order.status] || order.status}
                      </span>
                      <span className="font-semibold text-sm text-gray-900">{formatCurrency(order.total)}</span>
                    </div>
                  </div>
                ))}
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
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-4 h-4 text-gray-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500">{item.label}</p>
                        <p className="font-medium text-sm text-gray-900 truncate">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full mt-4 text-sm">{L.editProfile}</Button>
              </div>

              {/* Savings Card */}
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-5 text-white">
                <TrendingUp className="w-8 h-8 mb-2 opacity-80" />
                <h3 className="text-lg font-semibold mb-1">{L.savingsHighlight}</h3>
                <p className="text-green-100 text-sm mb-3">
                  {L.savingsDesc} <strong>{formatCurrency(stats.savedAmount)}</strong> {L.savingsCompare}
                </p>
                <Button variant="outline" className="border-white text-green-700 bg-white hover:bg-green-50 text-sm w-full">
                  {L.viewReport}
                </Button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">{L.recentOrders}</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {recentOrders.map((order) => (
                <div key={order.id} className="px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    {statusIcon(order.status)}
                    <div>
                      <p className="font-medium text-sm text-gray-900">{order.id}</p>
                      <p className="text-xs text-gray-500">{order.date} · {order.items} items</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor(order.status)}`}>
                      {L.orderStatus[order.status] || order.status}
                    </span>
                    <span className="font-semibold text-sm">{formatCurrency(order.total)}</span>
                    <Button size="sm" variant="outline" className="text-xs">
                      <RefreshCw className="w-3 h-3 mr-1" /> {L.reorder}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'favorites' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">{L.savedLists}</h2>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white text-sm">
                + {L.createList}
              </Button>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedLists.map((list) => (
                <div key={list.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                      <Heart className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="text-xs text-gray-400">{L.lastUpdated}: {list.lastUpdated}</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{list.name}</h3>
                  <p className="text-sm text-gray-500 mb-3">{list.items} {L.listItems} · {formatCurrency(list.total)}</p>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm">
                    <RefreshCw className="w-3 h-3 mr-2" /> {L.reorder}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Spending Trend */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-blue-600" /> {L.spendingTrend}
              </h2>
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
            </div>

            {/* Category Breakdown */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-orange-500" /> {L.categoryBreakdown}
              </h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={categoryData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} />
                  <Tooltip formatter={(v) => [`$${v}`, 'Spent']} />
                  <Bar dataKey="amount" fill="#f97316" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
