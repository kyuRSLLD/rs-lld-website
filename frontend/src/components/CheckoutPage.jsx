import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../contexts/CartContext'
import { useLanguage } from '../contexts/LanguageContext'
import { Button } from '@/components/ui/button'
import {
  ShoppingCart, Truck, CreditCard, FileText, ChevronRight,
  Minus, Plus, Trash2, CheckCircle, Tag
} from 'lucide-react'

const CheckoutPage = ({ user }) => {
  const { cart, updateQuantity, removeFromCart, clearCart, cartTotal, deliveryFee, orderTotal, getEffectivePrice } = useCart()
  const { currentLanguage } = useLanguage()
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // 1=cart, 2=delivery, 3=review, 4=confirmed
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmedOrder, setConfirmedOrder] = useState(null)

  const [form, setForm] = useState({
    delivery_name: user?.username || '',
    delivery_company: user?.company_name || '',
    delivery_address: '',
    delivery_city: '',
    delivery_state: '',
    delivery_zip: '',
    delivery_phone: user?.phone || '',
    preferred_delivery_date: '',
    special_notes: '',
    payment_method: 'net30',
  })

  const L = {
    en: {
      title: 'Checkout', cart: 'Cart', delivery: 'Delivery', review: 'Review', confirmed: 'Confirmed',
      emptyCart: 'Your cart is empty', browseProducts: 'Browse Products',
      subtotal: 'Subtotal', deliveryFee: 'Delivery Fee', freeDelivery: 'FREE (orders $200+)',
      total: 'Total', proceedDelivery: 'Proceed to Delivery', placeOrder: 'Place Order',
      backToCart: 'Back to Cart', backToDelivery: 'Back to Delivery',
      deliveryInfo: 'Delivery Information', contactName: 'Contact Name', company: 'Restaurant / Company',
      address: 'Street Address', city: 'City', state: 'State', zip: 'ZIP Code', phone: 'Phone',
      preferredDate: 'Preferred Delivery Date (optional)', notes: 'Special Notes / Instructions',
      notesPlaceholder: 'e.g. Deliver to back entrance, call before arrival...',
      payment: 'Payment Method', net30: 'Net 30 (Invoice)', net15: 'Net 15 (Invoice)',
      cod: 'Cash on Delivery', creditCard: 'Credit Card on File',
      reviewOrder: 'Review Your Order', orderSummary: 'Order Summary',
      deliverTo: 'Deliver To', paymentMethod: 'Payment Method',
      orderPlaced: 'Order Placed!', orderNumber: 'Order Number',
      orderConfirmMsg: 'Thank you! Your order has been received. Our team will confirm it shortly.',
      trackOrder: 'Track Your Order', continueShopping: 'Continue Shopping',
      bulkSavings: 'Bulk savings applied!', qty: 'Qty',
      required: 'This field is required',
    },
    zh: {
      title: '结账', cart: '购物车', delivery: '配送', review: '确认', confirmed: '已确认',
      emptyCart: '购物车为空', browseProducts: '浏览产品',
      subtotal: '小计', deliveryFee: '配送费', freeDelivery: '免费 (订单满$200)',
      total: '总计', proceedDelivery: '继续填写配送信息', placeOrder: '下单',
      backToCart: '返回购物车', backToDelivery: '返回配送信息',
      deliveryInfo: '配送信息', contactName: '联系人姓名', company: '餐厅/公司名称',
      address: '街道地址', city: '城市', state: '州', zip: '邮政编码', phone: '电话',
      preferredDate: '期望配送日期（可选）', notes: '特殊说明/备注',
      notesPlaceholder: '例如：请送到后门，到达前请致电...',
      payment: '付款方式', net30: 'Net 30（发票）', net15: 'Net 15（发票）',
      cod: '货到付款', creditCard: '信用卡',
      reviewOrder: '确认您的订单', orderSummary: '订单摘要',
      deliverTo: '配送至', paymentMethod: '付款方式',
      orderPlaced: '订单已提交！', orderNumber: '订单号',
      orderConfirmMsg: '感谢您的订购！我们的团队将尽快确认您的订单。',
      trackOrder: '跟踪订单', continueShopping: '继续购物',
      bulkSavings: '已享受批量优惠！', qty: '数量',
      required: '此字段为必填项',
    },
    ko: {
      title: '결제', cart: '장바구니', delivery: '배송', review: '확인', confirmed: '확인됨',
      emptyCart: '장바구니가 비어 있습니다', browseProducts: '제품 둘러보기',
      subtotal: '소계', deliveryFee: '배송비', freeDelivery: '무료 ($200 이상 주문)',
      total: '합계', proceedDelivery: '배송 정보 입력', placeOrder: '주문하기',
      backToCart: '장바구니로 돌아가기', backToDelivery: '배송 정보로 돌아가기',
      deliveryInfo: '배송 정보', contactName: '담당자 이름', company: '레스토랑/회사명',
      address: '도로명 주소', city: '도시', state: '주', zip: '우편번호', phone: '전화번호',
      preferredDate: '희망 배송일 (선택사항)', notes: '특별 요청사항',
      notesPlaceholder: '예: 뒷문으로 배송, 도착 전 전화 부탁드립니다...',
      payment: '결제 방법', net30: 'Net 30 (청구서)', net15: 'Net 15 (청구서)',
      cod: '착불', creditCard: '신용카드',
      reviewOrder: '주문 확인', orderSummary: '주문 요약',
      deliverTo: '배송지', paymentMethod: '결제 방법',
      orderPlaced: '주문 완료!', orderNumber: '주문 번호',
      orderConfirmMsg: '감사합니다! 주문이 접수되었습니다. 팀에서 곧 확인해 드리겠습니다.',
      trackOrder: '주문 추적', continueShopping: '쇼핑 계속하기',
      bulkSavings: '대량 할인 적용!', qty: '수량',
      required: '필수 입력 항목입니다',
    }
  }
  const t = L[currentLanguage] || L.en

  const formatPrice = (p) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(p)

  const categoryIcons = {
    'Canned Goods': '🥫', 'Dry Ingredients': '🌾', 'Condiments & Sauces': '🍶',
    'Cleaning Supplies': '🧹', 'Paper Products': '🧻', 'Packaging Materials': '📦',
  }

  const steps = [
    { num: 1, label: t.cart, icon: ShoppingCart },
    { num: 2, label: t.delivery, icon: Truck },
    { num: 3, label: t.review, icon: FileText },
    { num: 4, label: t.confirmed, icon: CheckCircle },
  ]

  const handleFormChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const validateDelivery = () => {
    return form.delivery_name && form.delivery_address && form.delivery_city && form.delivery_state && form.delivery_zip
  }

  const handlePlaceOrder = async () => {
    setIsSubmitting(true)
    try {
      const payload = {
        ...form,
        items: cart.map(item => ({ product_id: item.product_id, quantity: item.quantity }))
      }
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (data.success) {
        setConfirmedOrder(data.order)
        clearCart()
        setStep(4)
      } else {
        alert(data.error || 'Failed to place order')
      }
    } catch (err) {
      alert('Network error. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Page Title */}
        <h1 className="text-3xl font-bold text-gray-900 mb-6">{t.title}</h1>

        {/* Step Indicator */}
        <div className="flex items-center mb-8">
          {steps.map((s, i) => (
            <div key={s.num} className="flex items-center">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                step === s.num ? 'bg-blue-600 text-white' :
                step > s.num ? 'bg-green-100 text-green-700' :
                'bg-gray-100 text-gray-400'
              }`}>
                {step > s.num ? <CheckCircle className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={`h-0.5 w-8 mx-1 ${step > s.num ? 'bg-green-400' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* ── STEP 1: CART ── */}
        {step === 1 && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3">
              {cart.length === 0 ? (
                <div className="bg-white rounded-xl p-12 text-center border border-gray-100">
                  <ShoppingCart className="w-14 h-14 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-500 mb-4">{t.emptyCart}</p>
                  <Button onClick={() => navigate('/products')} className="bg-blue-600 hover:bg-blue-700 text-white">
                    {t.browseProducts}
                  </Button>
                </div>
              ) : (
                cart.map(item => {
                  const price = getEffectivePrice(item)
                  const isBulk = item.bulk_price && item.bulk_quantity && item.quantity >= item.bulk_quantity
                  return (
                    <div key={item.product_id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
                      <div className="w-14 h-14 bg-gray-50 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">
                        {categoryIcons[item.category_name] || '📦'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{item.product_name}</p>
                        <p className="text-xs text-gray-500">{item.product_brand} · {item.product_unit_size}</p>
                        {isBulk && (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                            <Tag className="w-3 h-3" /> {t.bulkSavings}
                          </span>
                        )}
                      </div>
                      {/* Qty Controls */}
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                          className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center font-medium text-sm">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                          className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="text-right w-20 flex-shrink-0">
                        <p className="font-bold text-gray-900 text-sm">{formatPrice(price * item.quantity)}</p>
                        <p className="text-xs text-gray-400">{formatPrice(price)} ea.</p>
                      </div>
                      <button onClick={() => removeFromCart(item.product_id)} className="text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )
                })
              )}
            </div>

            {/* Order Summary */}
            {cart.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 p-5 h-fit">
                <h3 className="font-semibold text-gray-900 mb-4">{t.orderSummary}</h3>
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between text-gray-600">
                    <span>{t.subtotal}</span><span>{formatPrice(cartTotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>{t.deliveryFee}</span>
                    <span className={deliveryFee === 0 ? 'text-green-600 font-medium' : ''}>
                      {deliveryFee === 0 ? t.freeDelivery : formatPrice(deliveryFee)}
                    </span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold text-gray-900 text-base">
                    <span>{t.total}</span><span>{formatPrice(orderTotal)}</span>
                  </div>
                </div>
                {deliveryFee > 0 && (
                  <p className="text-xs text-blue-600 bg-blue-50 rounded-lg p-2 mb-4">
                    💡 Add {formatPrice(200 - cartTotal)} more for free delivery!
                  </p>
                )}
                <Button onClick={() => setStep(2)} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  {t.proceedDelivery} <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: DELIVERY ── */}
        {step === 2 && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-5 flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-600" /> {t.deliveryInfo}
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { name: 'delivery_name', label: t.contactName, required: true },
                  { name: 'delivery_company', label: t.company, required: false },
                  { name: 'delivery_address', label: t.address, required: true, full: true },
                  { name: 'delivery_city', label: t.city, required: true },
                  { name: 'delivery_state', label: t.state, required: true },
                  { name: 'delivery_zip', label: t.zip, required: true },
                  { name: 'delivery_phone', label: t.phone, required: false },
                  { name: 'preferred_delivery_date', label: t.preferredDate, required: false, type: 'date' },
                ].map(field => (
                  <div key={field.name} className={field.full ? 'sm:col-span-2' : ''}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type={field.type || 'text'}
                      name={field.name}
                      value={form[field.name]}
                      onChange={handleFormChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                ))}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.notes}</label>
                  <textarea
                    name="special_notes"
                    value={form.special_notes}
                    onChange={handleFormChange}
                    placeholder={t.notesPlaceholder}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <CreditCard className="w-4 h-4 inline mr-1" /> {t.payment}
                  </label>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {[
                      { value: 'net30', label: t.net30 },
                      { value: 'net15', label: t.net15 },
                      { value: 'cod', label: t.cod },
                      { value: 'credit_card', label: t.creditCard },
                    ].map(opt => (
                      <label key={opt.value} className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                        form.payment_method === opt.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                      }`}>
                        <input type="radio" name="payment_method" value={opt.value}
                          checked={form.payment_method === opt.value} onChange={handleFormChange} className="text-blue-600" />
                        <span className="text-sm font-medium">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button variant="outline" onClick={() => setStep(1)}>{t.backToCart}</Button>
                <Button
                  onClick={() => validateDelivery() && setStep(3)}
                  disabled={!validateDelivery()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {t.reviewOrder} <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>

            {/* Mini summary */}
            <div className="bg-white rounded-xl border border-gray-100 p-5 h-fit">
              <h3 className="font-semibold text-gray-900 mb-3">{t.orderSummary}</h3>
              <div className="space-y-1 text-sm text-gray-600 mb-3">
                {cart.map(item => (
                  <div key={item.product_id} className="flex justify-between">
                    <span className="truncate mr-2">{item.product_name} ×{item.quantity}</span>
                    <span className="flex-shrink-0">{formatPrice(getEffectivePrice(item) * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-2 flex justify-between font-bold text-gray-900">
                <span>{t.total}</span><span>{formatPrice(orderTotal)}</span>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: REVIEW ── */}
        {step === 3 && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {/* Items */}
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-900 mb-4">{t.orderSummary}</h3>
                <div className="space-y-3">
                  {cart.map(item => {
                    const price = getEffectivePrice(item)
                    return (
                      <div key={item.product_id} className="flex items-center gap-3">
                        <span className="text-xl">{categoryIcons[item.category_name] || '📦'}</span>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{item.product_name}</p>
                          <p className="text-xs text-gray-500">{t.qty}: {item.quantity} × {formatPrice(price)}</p>
                        </div>
                        <p className="font-semibold text-sm">{formatPrice(price * item.quantity)}</p>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Delivery Info */}
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-600" /> {t.deliverTo}
                </h3>
                <p className="text-sm text-gray-700 font-medium">{form.delivery_name}</p>
                {form.delivery_company && <p className="text-sm text-gray-600">{form.delivery_company}</p>}
                <p className="text-sm text-gray-600">{form.delivery_address}</p>
                <p className="text-sm text-gray-600">{form.delivery_city}, {form.delivery_state} {form.delivery_zip}</p>
                {form.delivery_phone && <p className="text-sm text-gray-600">{form.delivery_phone}</p>}
                {form.preferred_delivery_date && <p className="text-sm text-blue-600 mt-1">📅 {form.preferred_delivery_date}</p>}
                {form.special_notes && <p className="text-sm text-gray-500 mt-1 italic">"{form.special_notes}"</p>}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)}>{t.backToDelivery}</Button>
                <Button
                  onClick={handlePlaceOrder}
                  disabled={isSubmitting}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold"
                >
                  {isSubmitting ? '...' : t.placeOrder}
                </Button>
              </div>
            </div>

            {/* Final total */}
            <div className="bg-white rounded-xl border border-gray-100 p-5 h-fit">
              <h3 className="font-semibold text-gray-900 mb-4">{t.orderSummary}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>{t.subtotal}</span><span>{formatPrice(cartTotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>{t.deliveryFee}</span>
                  <span className={deliveryFee === 0 ? 'text-green-600' : ''}>{deliveryFee === 0 ? t.freeDelivery : formatPrice(deliveryFee)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold text-gray-900 text-base">
                  <span>{t.total}</span><span>{formatPrice(orderTotal)}</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <CreditCard className="w-3 h-3" />
                  {form.payment_method === 'net30' ? t.net30 :
                   form.payment_method === 'net15' ? t.net15 :
                   form.payment_method === 'cod' ? t.cod : t.creditCard}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 4: CONFIRMED ── */}
        {step === 4 && confirmedOrder && (
          <div className="max-w-lg mx-auto text-center">
            <div className="bg-white rounded-2xl border border-gray-100 p-10 shadow-sm">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{t.orderPlaced}</h2>
              <p className="text-gray-500 mb-4">{t.orderConfirmMsg}</p>
              <div className="bg-blue-50 rounded-xl p-4 mb-6">
                <p className="text-sm text-gray-500 mb-1">{t.orderNumber}</p>
                <p className="text-2xl font-bold text-blue-700 tracking-wider">{confirmedOrder.order_number}</p>
              </div>
              <div className="space-y-3">
                <Button
                  onClick={() => navigate(`/track/${confirmedOrder.order_number}`)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {t.trackOrder}
                </Button>
                <Button variant="outline" onClick={() => navigate('/products')} className="w-full">
                  {t.continueShopping}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CheckoutPage
