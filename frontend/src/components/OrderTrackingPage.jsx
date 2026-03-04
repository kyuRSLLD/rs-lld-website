import API_BASE from '../config/api'
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import { Button } from '@/components/ui/button'
import {
  Package, CheckCircle, Truck, ClipboardList, Home,
  Search, Clock, XCircle, RefreshCw, ShoppingCart
} from 'lucide-react'

const STATUS_STEPS = ['pending', 'confirmed', 'packed', 'shipped', 'delivered']

const OrderTrackingPage = ({ user }) => {
  const { orderNumber: paramOrderNumber } = useParams()
  const navigate = useNavigate()
  const { currentLanguage } = useLanguage()
  const [orderNumber, setOrderNumber] = useState(paramOrderNumber || '')
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [myOrders, setMyOrders] = useState([])
  const [loadingMyOrders, setLoadingMyOrders] = useState(false)

  const L = {
    en: {
      title: 'Order Tracking', trackYourOrder: 'Track Your Order',
      enterOrderNumber: 'Enter your order number', search: 'Track Order',
      orderNumber: 'Order Number', status: 'Status', placedOn: 'Placed On',
      total: 'Total', items: 'Items', deliverTo: 'Deliver To',
      pending: 'Order Received', confirmed: 'Confirmed', packed: 'Packed',
      shipped: 'Out for Delivery', delivered: 'Delivered', cancelled: 'Cancelled',
      pendingDesc: 'Your order has been received and is awaiting confirmation.',
      confirmedDesc: 'Your order has been confirmed and is being prepared.',
      packedDesc: 'Your order has been packed and is ready for pickup.',
      shippedDesc: 'Your order is on its way to you!',
      deliveredDesc: 'Your order has been delivered. Enjoy!',
      cancelledDesc: 'This order has been cancelled.',
      orderNotFound: 'Order not found. Please check the order number.',
      myOrders: 'My Recent Orders', reorder: 'Reorder', viewDetails: 'View Details',
      noOrders: 'No orders yet.', browseProducts: 'Browse Products',
      specialNotes: 'Special Notes', paymentMethod: 'Payment Method',
      net30: 'Net 30', net15: 'Net 15', cod: 'Cash on Delivery', credit_card: 'Credit Card',
      qty: 'Qty', estimatedDelivery: 'Estimated Delivery',
    },
    zh: {
      title: '订单追踪', trackYourOrder: '追踪您的订单',
      enterOrderNumber: '请输入订单号', search: '追踪订单',
      orderNumber: '订单号', status: '状态', placedOn: '下单时间',
      total: '总计', items: '商品', deliverTo: '配送至',
      pending: '已收到订单', confirmed: '已确认', packed: '已打包',
      shipped: '配送中', delivered: '已送达', cancelled: '已取消',
      pendingDesc: '您的订单已收到，正在等待确认。',
      confirmedDesc: '您的订单已确认，正在准备中。',
      packedDesc: '您的订单已打包，等待取货。',
      shippedDesc: '您的订单正在配送中！',
      deliveredDesc: '您的订单已送达，感谢您的订购！',
      cancelledDesc: '此订单已取消。',
      orderNotFound: '未找到订单，请检查订单号。',
      myOrders: '我的最近订单', reorder: '再次订购', viewDetails: '查看详情',
      noOrders: '暂无订单。', browseProducts: '浏览产品',
      specialNotes: '特殊说明', paymentMethod: '付款方式',
      net30: 'Net 30', net15: 'Net 15', cod: '货到付款', credit_card: '信用卡',
      qty: '数量', estimatedDelivery: '预计送达',
    },
    ko: {
      title: '주문 추적', trackYourOrder: '주문 추적',
      enterOrderNumber: '주문 번호를 입력하세요', search: '주문 추적',
      orderNumber: '주문 번호', status: '상태', placedOn: '주문일',
      total: '합계', items: '상품', deliverTo: '배송지',
      pending: '주문 접수', confirmed: '확인됨', packed: '포장 완료',
      shipped: '배송 중', delivered: '배송 완료', cancelled: '취소됨',
      pendingDesc: '주문이 접수되었으며 확인 대기 중입니다.',
      confirmedDesc: '주문이 확인되었으며 준비 중입니다.',
      packedDesc: '주문이 포장되어 픽업 대기 중입니다.',
      shippedDesc: '주문이 배송 중입니다!',
      deliveredDesc: '주문이 배송되었습니다. 감사합니다!',
      cancelledDesc: '이 주문은 취소되었습니다.',
      orderNotFound: '주문을 찾을 수 없습니다. 주문 번호를 확인해주세요.',
      myOrders: '최근 주문', reorder: '재주문', viewDetails: '상세 보기',
      noOrders: '주문 내역이 없습니다.', browseProducts: '제품 둘러보기',
      specialNotes: '특별 요청', paymentMethod: '결제 방법',
      net30: 'Net 30', net15: 'Net 15', cod: '착불', credit_card: '신용카드',
      qty: '수량', estimatedDelivery: '예상 배송일',
    }
  }
  const t = L[currentLanguage] || L.en

  const formatPrice = (p) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(p)
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

  const statusConfig = {
    pending:   { icon: Clock,        color: 'text-yellow-600', bg: 'bg-yellow-50',  border: 'border-yellow-200', label: t.pending,   desc: t.pendingDesc },
    confirmed: { icon: CheckCircle,  color: 'text-blue-600',   bg: 'bg-blue-50',    border: 'border-blue-200',   label: t.confirmed, desc: t.confirmedDesc },
    packed:    { icon: Package,      color: 'text-purple-600', bg: 'bg-purple-50',  border: 'border-purple-200', label: t.packed,    desc: t.packedDesc },
    shipped:   { icon: Truck,        color: 'text-orange-600', bg: 'bg-orange-50',  border: 'border-orange-200', label: t.shipped,   desc: t.shippedDesc },
    delivered: { icon: Home,         color: 'text-green-600',  bg: 'bg-green-50',   border: 'border-green-200',  label: t.delivered, desc: t.deliveredDesc },
    cancelled: { icon: XCircle,      color: 'text-red-600',    bg: 'bg-red-50',     border: 'border-red-200',    label: t.cancelled, desc: t.cancelledDesc },
  }

  const fetchOrder = async (num) => {
    if (!num.trim()) return
    setLoading(true)
    setError('')
    setOrder(null)
    try {
      const res = await fetch(`${API_BASE}/api/orders/${num.trim()}`, { credentials: 'include' })
      if (!res.ok) { setError(t.orderNotFound); return }
      const data = await res.json()
      setOrder(data)
    } catch {
      setError(t.orderNotFound)
    } finally {
      setLoading(false)
    }
  }

  const fetchMyOrders = async () => {
    if (!user) return
    setLoadingMyOrders(true)
    try {
      const res = await fetch(`${API_BASE}/api/orders`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setMyOrders(data.slice(0, 5))
      }
    } catch {}
    finally { setLoadingMyOrders(false) }
  }

  const handleReorder = async (orderNum) => {
    try {
      const res = await fetch(`${API_BASE}/api/orders/${orderNum}/reorder`, { method: 'POST', credentials: 'include' })
      const data = await res.json()
      if (data.success) {
        // Store reorder items in localStorage for cart to pick up
        localStorage.setItem('rs-lld-reorder', JSON.stringify(data.items))
        navigate('/products?reorder=1')
      }
    } catch {}
  }

  useEffect(() => {
    if (paramOrderNumber) fetchOrder(paramOrderNumber)
    fetchMyOrders()
  }, [paramOrderNumber, user])

  const currentStepIndex = order ? STATUS_STEPS.indexOf(order.status) : -1

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">{t.title}</h1>

        {/* Search Box */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
          <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Search className="w-4 h-4 text-blue-600" /> {t.trackYourOrder}
          </h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={orderNumber}
              onChange={e => setOrderNumber(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchOrder(orderNumber)}
              placeholder={t.enterOrderNumber + ' (e.g. RS-2026-A3F7)'}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <Button onClick={() => fetchOrder(orderNumber)} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : t.search}
            </Button>
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>

        {/* Order Details */}
        {order && (
          <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-500">{t.orderNumber}</p>
                <p className="text-2xl font-bold text-blue-700">{order.order_number}</p>
                <p className="text-sm text-gray-500 mt-1">{t.placedOn}: {formatDate(order.created_at)}</p>
              </div>
              {order.status !== 'cancelled' && (
                <div className={`px-4 py-2 rounded-xl border ${statusConfig[order.status]?.bg} ${statusConfig[order.status]?.border}`}>
                  <p className={`font-semibold ${statusConfig[order.status]?.color}`}>
                    {statusConfig[order.status]?.label}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{statusConfig[order.status]?.desc}</p>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            {order.status !== 'cancelled' && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  {STATUS_STEPS.map((s, i) => {
                    const cfg = statusConfig[s]
                    const done = i <= currentStepIndex
                    const current = i === currentStepIndex
                    return (
                      <div key={s} className="flex flex-col items-center flex-1">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 transition-all ${
                          done ? (current ? 'bg-blue-600' : 'bg-green-500') : 'bg-gray-200'
                        }`}>
                          <cfg.icon className={`w-4 h-4 ${done ? 'text-white' : 'text-gray-400'}`} />
                        </div>
                        <span className={`text-xs text-center hidden sm:block ${done ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                          {cfg.label}
                        </span>
                        {i < STATUS_STEPS.length - 1 && (
                          <div className={`absolute h-0.5 w-full ${done && i < currentStepIndex ? 'bg-green-400' : 'bg-gray-200'}`} style={{ display: 'none' }} />
                        )}
                      </div>
                    )
                  })}
                </div>
                {/* Progress line */}
                <div className="relative h-1.5 bg-gray-200 rounded-full mt-1">
                  <div
                    className="absolute h-full bg-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(0, (currentStepIndex / (STATUS_STEPS.length - 1)) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {order.status === 'cancelled' && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex items-center gap-3">
                <XCircle className="w-5 h-5 text-red-500" />
                <p className="text-red-700 text-sm">{t.cancelledDesc}</p>
              </div>
            )}

            {/* Items */}
            <div className="border-t pt-4 mb-4">
              <h3 className="font-semibold text-gray-800 mb-3">{t.items}</h3>
              <div className="space-y-2">
                {order.items?.map(item => (
                  <div key={item.id} className="flex justify-between items-center text-sm">
                    <div>
                      <span className="font-medium text-gray-800">{item.product_name}</span>
                      <span className="text-gray-500 ml-2">{item.product_brand} · {item.product_unit_size}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-500">{t.qty}: {item.quantity} × {formatPrice(item.unit_price)}</span>
                      <span className="font-semibold text-gray-900 ml-3">{formatPrice(item.line_total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals + Delivery */}
            <div className="grid sm:grid-cols-2 gap-4 border-t pt-4">
              <div>
                <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-1">
                  <Truck className="w-4 h-4 text-blue-600" /> {t.deliverTo}
                </h3>
                <p className="text-sm text-gray-700">{order.delivery_name}</p>
                {order.delivery_company && <p className="text-sm text-gray-600">{order.delivery_company}</p>}
                <p className="text-sm text-gray-600">{order.delivery_address}</p>
                <p className="text-sm text-gray-600">{order.delivery_city}, {order.delivery_state} {order.delivery_zip}</p>
                {order.preferred_delivery_date && (
                  <p className="text-sm text-blue-600 mt-1">📅 {t.estimatedDelivery}: {order.preferred_delivery_date}</p>
                )}
                {order.special_notes && (
                  <p className="text-xs text-gray-500 mt-1 italic">"{order.special_notes}"</p>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">{t.orderNumber}</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span><span>{formatPrice(order.subtotal)}</span>
                  </div>
                  {order.discount_amount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Bulk Savings</span><span>-{formatPrice(order.discount_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-600">
                    <span>Delivery</span>
                    <span>{order.delivery_fee === 0 ? 'FREE' : formatPrice(order.delivery_fee)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-900 border-t pt-1">
                    <span>{t.total}</span><span>{formatPrice(order.total_amount)}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {t.paymentMethod}: {t[order.payment_method] || order.payment_method}
                </p>
              </div>
            </div>

            {/* Reorder Button */}
            {user && order.status === 'delivered' && (
              <div className="mt-4 pt-4 border-t">
                <Button
                  onClick={() => handleReorder(order.order_number)}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" /> {t.reorder}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* My Orders List */}
        {user && (
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-blue-600" /> {t.myOrders}
            </h2>
            {loadingMyOrders ? (
              <div className="text-center py-6"><RefreshCw className="w-6 h-6 animate-spin text-gray-400 mx-auto" /></div>
            ) : myOrders.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-3">{t.noOrders}</p>
                <Button onClick={() => navigate('/products')} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {t.browseProducts}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {myOrders.map(o => {
                  const cfg = statusConfig[o.status]
                  return (
                    <div key={o.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-blue-200 transition-all">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${cfg?.bg}`}>
                          {cfg && <cfg.icon className={`w-4 h-4 ${cfg.color}`} />}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-gray-900">{o.order_number}</p>
                          <p className="text-xs text-gray-500">{formatDate(o.created_at)} · {o.item_count} items · {formatPrice(o.total_amount)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg?.bg} ${cfg?.color}`}>
                          {cfg?.label}
                        </span>
                        <Button size="sm" variant="outline" onClick={() => { setOrderNumber(o.order_number); fetchOrder(o.order_number) }}>
                          {t.viewDetails}
                        </Button>
                        {o.status === 'delivered' && (
                          <Button size="sm" onClick={() => handleReorder(o.order_number)} className="bg-orange-500 hover:bg-orange-600 text-white text-xs">
                            <RefreshCw className="w-3 h-3 mr-1" /> {t.reorder}
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default OrderTrackingPage
