import API_BASE from '../config/api'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../contexts/CartContext'
import { useLanguage } from '../contexts/LanguageContext'
import { Button } from '@/components/ui/button'
import {
  ShoppingCart, Truck, CreditCard, FileText, ChevronRight,
  Minus, Plus, Trash2, CheckCircle, Tag, Upload, Camera, Lock
} from 'lucide-react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'

// Stripe publishable key - uses VITE_STRIPE_PUBLISHABLE_KEY env var
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_live_51T7GH2PbWfdV8QXTNrRtKUC4lMWiQFOPTROowvgHj8scemBG1SPA2ryuhZ9ShBu6xVA6VQVj9dHIn4CEVeWD98KV00YvqGo4Nd')

// ─── Stripe Card Form Component ───────────────────────────────────────────────
const StripeCardForm = ({ orderTotal, orderNumber, onSuccess, onError, t }) => {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)
  const [cardError, setCardError] = useState('')

  const handlePay = async (e) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setProcessing(true)
    setCardError('')

    try {
      // Create payment intent on backend
      const intentRes = await fetch(`${API_BASE}/api/payments/create-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ amount: orderTotal, order_number: orderNumber }),
      })
      const intentData = await intentRes.json()
      if (!intentData.success) {
        setCardError(intentData.error || 'Failed to initialize payment')
        setProcessing(false)
        return
      }

      // Confirm payment with Stripe
      const result = await stripe.confirmCardPayment(intentData.client_secret, {
        payment_method: { card: elements.getElement(CardElement) },
      })

      if (result.error) {
        setCardError(result.error.message)
        setProcessing(false)
        return
      }

      if (result.paymentIntent.status === 'succeeded') {
        // Confirm with backend
        await fetch(`${API_BASE}/api/payments/confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            order_number: orderNumber,
            payment_intent_id: result.paymentIntent.id,
          }),
        })
        onSuccess(result.paymentIntent.id)
      }
    } catch (err) {
      setCardError('Payment failed. Please try again.')
      if (onError) onError(err)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <form onSubmit={handlePay} className="space-y-4">
      <div className="border border-gray-300 rounded-lg p-4 bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#1f2937',
                fontFamily: 'system-ui, sans-serif',
                '::placeholder': { color: '#9ca3af' },
              },
              invalid: { color: '#ef4444' },
            },
          }}
        />
      </div>
      {cardError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {cardError}
        </div>
      )}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Lock className="w-3 h-3" />
        <span>Payments are secured and encrypted by Stripe</span>
      </div>
      <Button
        type="submit"
        disabled={!stripe || processing}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 text-base"
      >
        {processing ? (
          <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div> Processing...</>
        ) : (
          <><Lock className="w-4 h-4 mr-2" /> Pay ${orderTotal.toFixed(2)} Now</>
        )}
      </Button>
    </form>
  )
}

// ─── Check Upload Component ───────────────────────────────────────────────────
// ─── Single photo capture panel (reusable for front/back) ────────────────────
const CheckPhotoPanel = ({ label, side, file, preview, onCamera, onGallery, onRetake, fileInputRef }) => (
  <div className="flex-1 min-w-0">
    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 flex items-center gap-1">
      {side === 'front' ? '🔵' : '🟢'} {label}
    </p>
    {preview ? (
      <div className="border-2 border-green-400 bg-green-50 rounded-xl p-3 text-center">
        <img src={preview} alt={`Check ${side}`} className="max-h-40 mx-auto rounded-lg mb-2 object-contain shadow" />
        <p className="text-xs text-green-700 font-semibold mb-2">✓ Captured</p>
        <div className="flex gap-2 justify-center flex-wrap">
          <button onClick={onRetake} className="text-xs text-blue-600 underline hover:text-blue-800">📷 Retake</button>
          <span className="text-gray-300">|</span>
          <button onClick={onGallery} className="text-xs text-blue-600 underline hover:text-blue-800">🖼 Gallery</button>
        </div>
      </div>
    ) : (
      <div className="border-2 border-dashed border-amber-300 bg-amber-50 rounded-xl p-4 text-center">
        <Camera className="w-8 h-8 text-amber-400 mx-auto mb-2" />
        <p className="text-xs text-gray-500 mb-3">No photo yet</p>
        <div className="flex flex-col gap-2">
          <button
            onClick={onCamera}
            className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors"
          >
            <Camera className="w-3 h-3" /> Open Camera
          </button>
          <button
            onClick={onGallery}
            className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium px-3 py-2 rounded-lg transition-colors"
          >
            <Upload className="w-3 h-3" /> Choose from Gallery
          </button>
        </div>
      </div>
    )}
    {/* Hidden file input for this side */}
    <input ref={fileInputRef} type="file" accept="image/*" onChange={() => {}} className="hidden" />
  </div>
)

const CheckUploadForm = ({ orderNumber, onSuccess, t, autoOpen }) => {
  // Front photo state
  const [frontFile, setFrontFile] = useState(null)
  const [frontPreview, setFrontPreview] = useState(null)
  // Back photo state
  const [backFile, setBackFile] = useState(null)
  const [backPreview, setBackPreview] = useState(null)

  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  // Camera states — track which side is being captured
  const [cameraTarget, setCameraTarget] = useState(null) // 'front' | 'back'
  const [showCamera, setShowCamera] = useState(false)
  const [stream, setStream] = useState(null)
  const [cameraError, setCameraError] = useState('')

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const frontFileRef = useRef(null)
  const backFileRef = useRef(null)

  // Stop camera stream on unmount
  useEffect(() => {
    return () => { if (stream) stream.getTracks().forEach(tr => tr.stop()) }
  }, [stream])

  const openCamera = async (side) => {
    setCameraError('')
    setError('')
    setCameraTarget(side)
    if (!navigator.mediaDevices?.getUserMedia) {
      // Fallback to file input
      ;(side === 'front' ? frontFileRef : backFileRef).current?.click()
      return
    }
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }
      })
      setStream(mediaStream)
      setShowCamera(true)
      setTimeout(() => {
        if (videoRef.current) { videoRef.current.srcObject = mediaStream; videoRef.current.play() }
      }, 100)
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setCameraError('Camera permission denied. Please use "Choose from Gallery" instead.')
      } else if (err.name === 'NotFoundError') {
        setCameraError('No camera found. Please use "Choose from Gallery" instead.')
      } else {
        ;(side === 'front' ? frontFileRef : backFileRef).current?.click()
      }
    }
  }

  const capturePhoto = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    canvas.toBlob((blob) => {
      const filename = cameraTarget === 'front' ? 'check-front.jpg' : 'check-back.jpg'
      const capturedFile = new File([blob], filename, { type: 'image/jpeg' })
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
      if (cameraTarget === 'front') { setFrontFile(capturedFile); setFrontPreview(dataUrl) }
      else { setBackFile(capturedFile); setBackPreview(dataUrl) }
      if (stream) stream.getTracks().forEach(tr => tr.stop())
      setStream(null)
      setShowCamera(false)
    }, 'image/jpeg', 0.92)
  }

  const closeCamera = () => {
    if (stream) stream.getTracks().forEach(tr => tr.stop())
    setStream(null)
    setShowCamera(false)
  }

  const handleFileChange = (side) => (e) => {
    const f = e.target.files[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      if (side === 'front') { setFrontFile(f); setFrontPreview(ev.target.result) }
      else { setBackFile(f); setBackPreview(ev.target.result) }
    }
    reader.readAsDataURL(f)
    // Reset input so same file can be re-selected
    e.target.value = ''
  }

  const handleUpload = async () => {
    if (!frontFile) { setError('Please provide a photo of the front of the check'); return }
    if (!backFile) { setError('Please provide a photo of the back of the check'); return }
    setUploading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('check_front', frontFile)
      formData.append('check_back', backFile)
      formData.append('order_number', orderNumber)
      const res = await fetch(`${API_BASE}/api/payments/upload-check`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })
      const data = await res.json()
      if (data.success) {
        onSuccess()
      } else {
        setError(data.error || 'Upload failed')
      }
    } catch (err) {
      setError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const bothCaptured = frontFile && backFile

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
        <p className="font-semibold mb-1">📋 How check payment works:</p>
        <ol className="list-decimal list-inside space-y-1 text-xs">
          <li>Make your check payable to: <strong>LLD Restaurant Supply</strong></li>
          <li>Take a clear photo of <strong>both the front and back</strong> of the check</li>
          <li>Your order will be confirmed once we review and verify your check</li>
        </ol>
      </div>

      {/* Hidden canvases */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Hidden file inputs */}
      <input ref={frontFileRef} type="file" accept="image/*" onChange={handleFileChange('front')} className="hidden" />
      <input ref={backFileRef} type="file" accept="image/*" onChange={handleFileChange('back')} className="hidden" />

      {/* Live camera viewfinder */}
      {showCamera && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
          <p className="absolute top-6 text-white text-sm font-semibold drop-shadow bg-black/40 px-4 py-1 rounded-full">
            {cameraTarget === 'front' ? '📸 Front of Check' : '📸 Back of Check'} — tap the button to capture
          </p>
          <video ref={videoRef} autoPlay playsInline muted className="w-full max-h-[70vh] object-cover" />
          <div className="absolute bottom-8 flex gap-6 items-center">
            <button onClick={closeCamera} className="bg-white/20 hover:bg-white/30 text-white text-sm px-5 py-2 rounded-full border border-white/40">
              Cancel
            </button>
            <button
              onClick={capturePhoto}
              className="w-16 h-16 rounded-full bg-white border-4 border-amber-400 shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
            >
              <Camera className="w-7 h-7 text-amber-600" />
            </button>
          </div>
        </div>
      )}

      {cameraError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{cameraError}</div>
      )}

      {/* Two photo panels side by side */}
      <div className="flex gap-3">
        {/* Front */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">🔵 Front of Check <span className="text-red-500">*</span></p>
          {frontPreview ? (
            <div className="border-2 border-green-400 bg-green-50 rounded-xl p-3 text-center">
              <img src={frontPreview} alt="Check front" className="max-h-36 mx-auto rounded-lg mb-2 object-contain shadow" />
              <p className="text-xs text-green-700 font-semibold mb-2">✓ Captured</p>
              <div className="flex gap-2 justify-center">
                <button onClick={() => openCamera('front')} className="text-xs text-blue-600 underline">📷 Retake</button>
                <span className="text-gray-300">|</span>
                <button onClick={() => frontFileRef.current?.click()} className="text-xs text-blue-600 underline">🖼 Gallery</button>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-amber-300 bg-amber-50 rounded-xl p-4 text-center">
              <Camera className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <p className="text-xs text-gray-500 mb-3">No photo yet</p>
              <div className="flex flex-col gap-2">
                <button onClick={() => openCamera('front')} className="flex items-center justify-center gap-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium px-3 py-2 rounded-lg">
                  <Camera className="w-3 h-3" /> Camera
                </button>
                <button onClick={() => frontFileRef.current?.click()} className="flex items-center justify-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium px-3 py-2 rounded-lg">
                  <Upload className="w-3 h-3" /> Gallery
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Back */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">🟢 Back of Check <span className="text-red-500">*</span></p>
          {backPreview ? (
            <div className="border-2 border-green-400 bg-green-50 rounded-xl p-3 text-center">
              <img src={backPreview} alt="Check back" className="max-h-36 mx-auto rounded-lg mb-2 object-contain shadow" />
              <p className="text-xs text-green-700 font-semibold mb-2">✓ Captured</p>
              <div className="flex gap-2 justify-center">
                <button onClick={() => openCamera('back')} className="text-xs text-blue-600 underline">📷 Retake</button>
                <span className="text-gray-300">|</span>
                <button onClick={() => backFileRef.current?.click()} className="text-xs text-blue-600 underline">🖼 Gallery</button>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 bg-gray-50 rounded-xl p-4 text-center">
              <Camera className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-400 mb-3">{frontFile ? 'Now add back' : 'Add front first'}</p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => openCamera('back')}
                  disabled={!frontFile}
                  className="flex items-center justify-center gap-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors"
                >
                  <Camera className="w-3 h-3" /> Camera
                </button>
                <button
                  onClick={() => backFileRef.current?.click()}
                  disabled={!frontFile}
                  className="flex items-center justify-center gap-1 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 text-gray-700 text-xs font-medium px-3 py-2 rounded-lg transition-colors"
                >
                  <Upload className="w-3 h-3" /> Gallery
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <div className={`w-2 h-2 rounded-full ${frontFile ? 'bg-green-500' : 'bg-gray-300'}`} />
        <span className={frontFile ? 'text-green-700 font-medium' : ''}>Front photo</span>
        <div className={`w-2 h-2 rounded-full ml-2 ${backFile ? 'bg-green-500' : 'bg-gray-300'}`} />
        <span className={backFile ? 'text-green-700 font-medium' : ''}>Back photo</span>
        {bothCaptured && <span className="ml-auto text-green-600 font-semibold">✓ Ready to submit</span>}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
      )}

      <Button
        onClick={handleUpload}
        disabled={!bothCaptured || uploading}
        className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold py-3"
      >
        {uploading ? (
          <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div> Uploading...</>
        ) : (
          <><Upload className="w-4 h-4 mr-2" /> Submit Check for Review</>
        )}
      </Button>
    </div>
  )
}

// ─── Main CheckoutPage ────────────────────────────────────────────────────────
const CheckoutPage = ({ user }) => {
  const { cart, updateQuantity, removeFromCart, clearCart, cartTotal, deliveryFee, orderTotal, getEffectivePrice } = useCart()
  const { currentLanguage } = useLanguage()
  const navigate = useNavigate()

  // Steps: 1=cart, 2=delivery, 3=review, 4=payment, 5=confirmed
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmedOrder, setConfirmedOrder] = useState(null)
  const [paymentDone, setPaymentDone] = useState(false)
  const [checkJustSelected, setCheckJustSelected] = useState(false)

  const [form, setForm] = useState({
    delivery_name: user?.username || '',
    delivery_company: user?.company_name || '',
    delivery_address: '',
    delivery_city: '',
    delivery_state: '',
    delivery_zip: '',
    delivery_phone: user?.phone || '',
    special_notes: '',
    payment_method: 'credit_card',
    billing_address: '',
  })
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true)
  const [phoneError, setPhoneError] = useState('')

  // ─── Phone helpers ────────────────────────────────────────────────────────────
  const formatPhoneNumber = (raw) => {
    // Strip everything except digits
    const digits = raw.replace(/\D/g, '').slice(0, 10)
    if (digits.length === 0) return ''
    if (digits.length <= 3) return `(${digits}`
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }

  const isValidPhone = (val) => {
    if (!val) return true // phone is optional
    const digits = val.replace(/\D/g, '')
    return digits.length === 10
  }

  const L = {
    en: {
      title: 'Checkout', cart: 'Cart', delivery: 'Delivery', review: 'Review', payment: 'Payment', confirmed: 'Confirmed',
      emptyCart: 'Your cart is empty', browseProducts: 'Browse Products',
      subtotal: 'Subtotal', deliveryFee: 'Delivery Fee', freeDelivery: 'FREE (orders $100+)',
      total: 'Total', proceedDelivery: 'Proceed to Delivery', placeOrder: 'Review Order',
      backToCart: 'Back to Cart', backToDelivery: 'Back to Delivery', backToReview: 'Back to Review',
      deliveryInfo: 'Delivery Information', contactName: 'Contact Name', company: 'Restaurant / Company',
      address: 'Street Address', city: 'City', state: 'State', zip: 'ZIP Code', phone: 'Phone',
      notes: 'Special Notes / Instructions',
      notesPlaceholder: 'e.g. Deliver to back entrance, call before arrival...',
      paymentMethod: 'Payment Method',
      creditCard: 'Credit Card', creditCardDesc: 'Pay securely with Visa, Mastercard, Amex, or Discover',
      checkPayment: 'Pay by Check', checkDesc: 'Upload a photo of your check — we\'ll confirm once reviewed',
      net30: 'Net 30 (Invoice)', net30Desc: 'For approved accounts — pay within 30 days',
      reviewOrder: 'Review Your Order', orderSummary: 'Order Summary',
      deliverTo: 'Deliver To', proceedPayment: 'Proceed to Payment',
      orderPlaced: 'Order Received!', orderNumber: 'Order Number',
      orderConfirmMsg: 'Thank you! Your order has been received.',
      orderPaidMsg: 'Payment confirmed! Your order is being processed.',
      orderCheckMsg: 'Your check has been submitted for review. We\'ll confirm your order once verified.',
      trackOrder: 'Track Your Order', continueShopping: 'Continue Shopping',
      bulkSavings: 'Bulk savings applied!', qty: 'Qty',
      payNow: 'Pay Now', payByCheck: 'Pay by Check',
      billingAddress: 'Billing Address', billingSame: 'Same as shipping address',
      billingAddressPlaceholder: 'e.g. 123 Main St, Suite 100, New York, NY 10001',
    },
    zh: {
      title: '结账', cart: '购物车', delivery: '配送', review: '确认', payment: '付款', confirmed: '已确认',
      emptyCart: '购物车为空', browseProducts: '浏览产品',
      subtotal: '小计', deliveryFee: '配送费', freeDelivery: '免费 (订单满$100)',
      total: '总计', proceedDelivery: '继续填写配送信息', placeOrder: '确认订单',
      backToCart: '返回购物车', backToDelivery: '返回配送信息', backToReview: '返回确认',
      deliveryInfo: '配送信息', contactName: '联系人姓名', company: '餐厅/公司名称',
      address: '街道地址', city: '城市', state: '州', zip: '邮政编码', phone: '电话',
      notes: '特殊说明/备注',
      notesPlaceholder: '例如：请送到后门，到达前请致电...',
      paymentMethod: '付款方式',
      creditCard: '信用卡', creditCardDesc: '使用Visa、Mastercard、Amex或Discover安全支付',
      checkPayment: '支票付款', checkDesc: '上传支票照片 — 我们核实后确认订单',
      net30: 'Net 30（发票）', net30Desc: '已审批账户 — 30天内付款',
      reviewOrder: '确认您的订单', orderSummary: '订单摘要',
      deliverTo: '配送至', proceedPayment: '继续付款',
      orderPlaced: '订单已提交！', orderNumber: '订单号',
      orderConfirmMsg: '感谢您的订购！您的订单已收到。',
      orderPaidMsg: '付款已确认！您的订单正在处理中。',
      orderCheckMsg: '您的支票已提交审核，我们核实后将确认您的订单。',
      trackOrder: '跟踪订单', continueShopping: '继续购物',
      bulkSavings: '已享受批量优惠！', qty: '数量',
      payNow: '立即付款', payByCheck: '支票付款',
      billingAddress: '账单地址', billingSame: '与送货地址相同',
      billingAddressPlaceholder: '例如：123 Main St, Suite 100, New York, NY 10001',
    },
    ko: {
      title: '결제', cart: '장바구니', delivery: '배송', review: '확인', payment: '결제', confirmed: '완료',
      emptyCart: '장바구니가 비어 있습니다', browseProducts: '제품 둘러보기',
      subtotal: '소계', deliveryFee: '배송비', freeDelivery: '무료 ($100 이상 주문)',
      total: '합계', proceedDelivery: '배송 정보 입력', placeOrder: '주문 확인',
      backToCart: '장바구니로 돌아가기', backToDelivery: '배송 정보로 돌아가기', backToReview: '확인으로 돌아가기',
      deliveryInfo: '배송 정보', contactName: '담당자 이름', company: '레스토랑/회사명',
      address: '도로명 주소', city: '도시', state: '주', zip: '우편번호', phone: '전화번호',
      notes: '특별 요청사항',
      notesPlaceholder: '예: 뒷문으로 배송, 도착 전 전화 부탁드립니다...',
      paymentMethod: '결제 방법',
      creditCard: '신용카드', creditCardDesc: 'Visa, Mastercard, Amex, Discover로 안전하게 결제',
      checkPayment: '수표 결제', checkDesc: '수표 사진을 업로드하세요 — 검토 후 주문을 확인합니다',
      net30: 'Net 30 (청구서)', net30Desc: '승인된 계정 — 30일 이내 결제',
      reviewOrder: '주문 확인', orderSummary: '주문 요약',
      deliverTo: '배송지', proceedPayment: '결제 진행',
      orderPlaced: '주문 접수!', orderNumber: '주문 번호',
      orderConfirmMsg: '감사합니다! 주문이 접수되었습니다.',
      orderPaidMsg: '결제가 확인되었습니다! 주문이 처리 중입니다.',
      orderCheckMsg: '수표가 검토를 위해 제출되었습니다. 확인 후 주문을 확인해 드리겠습니다.',
      trackOrder: '주문 추적', continueShopping: '쇼핑 계속하기',
      bulkSavings: '대량 할인 적용!', qty: '수량',
      payNow: '지금 결제', payByCheck: '수표로 결제',
      billingAddress: '청구지 주소', billingSame: '배송지와 동일',
      billingAddressPlaceholder: '예: 123 Main St, Suite 100, New York, NY 10001',
    }
  }
  const t = L[currentLanguage] || L.en

  const formatPrice = (p) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(p)

  const categoryIcons = {
    'Disposable Goods': '🧤', 'Kitchen Tools': '🔪', 'Cleaning Supplies': '🧹',
    'Packaging Supplies': '📦', 'Pest Control': '🐜', 'Dry Ingredients': '🌾',
  }

  const steps = [
    { num: 1, label: t.cart, icon: ShoppingCart },
    { num: 2, label: t.delivery, icon: Truck },
    { num: 3, label: t.review, icon: FileText },
    { num: 4, label: t.payment, icon: CreditCard },
    { num: 5, label: t.confirmed, icon: CheckCircle },
  ]

  const handleFormChange = (e) => {
    const { name, value } = e.target
    // When user selects 'check' payment, flag autoOpen so camera opens immediately
    if (name === 'payment_method' && value === 'check') {
      setCheckJustSelected(true)
    } else if (name === 'payment_method') {
      setCheckJustSelected(false)
    }
    // Auto-format phone number as user types
    if (name === 'delivery_phone') {
      const formatted = formatPhoneNumber(value)
      setForm(prev => ({ ...prev, [name]: formatted }))
      if (phoneError && isValidPhone(formatted)) setPhoneError('')
      return
    }
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handlePhoneBlur = () => {
    if (form.delivery_phone && !isValidPhone(form.delivery_phone)) {
      setPhoneError('Please enter a valid 10-digit US phone number')
    } else {
      setPhoneError('')
    }
  }
  const validateDelivery = () =>
    form.delivery_name &&
    form.delivery_address &&
    form.delivery_city &&
    form.delivery_state &&
    form.delivery_zip &&
    isValidPhone(form.delivery_phone)

  // Place order (creates order in DB, then goes to payment step)
  const handlePlaceOrder = async () => {
    setIsSubmitting(true)
    try {
      const payload = {
        ...form,
        items: cart.map(item => ({ product_id: item.product_id, quantity: item.quantity }))
      }
      const res = await fetch(`${API_BASE}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (data.success) {
        setConfirmedOrder(data.order)
        setStep(4) // Go to payment step
      } else {
        alert(data.error || 'Failed to place order')
      }
    } catch (err) {
      alert('Network error. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCardSuccess = (paymentIntentId) => {
    clearCart()
    setPaymentDone(true)
    setStep(5)
  }

  const handleCheckSuccess = () => {
    clearCart()
    setPaymentDone(false) // check pending review
    setStep(5)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Page Title */}
        <h1 className="text-3xl font-bold text-gray-900 mb-6">{t.title}</h1>

        {/* Step Indicator */}
        <div className="flex items-center mb-8 overflow-x-auto pb-2">
          {steps.map((s, i) => (
            <div key={s.num} className="flex items-center flex-shrink-0">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                step === s.num ? 'bg-blue-600 text-white' :
                step > s.num ? 'bg-green-100 text-green-700' :
                'bg-gray-100 text-gray-400'
              }`}>
                {step > s.num ? <CheckCircle className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={`h-0.5 w-6 mx-1 flex-shrink-0 ${step > s.num ? 'bg-green-400' : 'bg-gray-200'}`} />
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
            {cart.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 p-5 h-fit">
                <h3 className="font-semibold text-gray-900 mb-3">{t.orderSummary}</h3>
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
                    💡 Add {formatPrice(100 - cartTotal)} more for free delivery!
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
                {/* Phone field with validation */}
                <div className="sm:col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t.phone}
                  </label>
                  <input
                    type="tel"
                    name="delivery_phone"
                    value={form.delivery_phone}
                    onChange={handleFormChange}
                    onBlur={handlePhoneBlur}
                    placeholder="(555) 123-4567"
                    inputMode="numeric"
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:border-transparent ${
                      phoneError
                        ? 'border-red-400 focus:ring-red-400 bg-red-50'
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                  />
                  {phoneError && (
                    <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                      <span>⚠</span> {phoneError}
                    </p>
                  )}
                </div>
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

                {/* Billing Address */}
                <div className="sm:col-span-2 border-t pt-4 mt-2">
                  <label className="block text-sm font-semibold text-gray-800 mb-2">{t.billingAddress}</label>
                  <label className="flex items-center gap-2 text-sm text-gray-600 mb-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={billingSameAsShipping}
                      onChange={e => {
                        setBillingSameAsShipping(e.target.checked)
                        if (e.target.checked) setForm(prev => ({ ...prev, billing_address: '' }))
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600"
                    />
                    {t.billingSame}
                  </label>
                  {!billingSameAsShipping && (
                    <textarea
                      name="billing_address"
                      value={form.billing_address}
                      onChange={handleFormChange}
                      placeholder={t.billingAddressPlaceholder}
                      rows={2}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                  )}
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
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-600" /> {t.deliverTo}
                </h3>
                <p className="text-sm text-gray-700 font-medium">{form.delivery_name}</p>
                {form.delivery_company && <p className="text-sm text-gray-600">{form.delivery_company}</p>}
                <p className="text-sm text-gray-600">{form.delivery_address}</p>
                <p className="text-sm text-gray-600">{form.delivery_city}, {form.delivery_state} {form.delivery_zip}</p>
                {form.delivery_phone && <p className="text-sm text-gray-600">{form.delivery_phone}</p>}

                {form.special_notes && <p className="text-sm text-gray-500 mt-1 italic">"{form.special_notes}"</p>}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)}>{t.backToDelivery}</Button>
                <Button
                  onClick={handlePlaceOrder}
                  disabled={isSubmitting}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold"
                >
                  {isSubmitting ? (
                    <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div> Creating Order...</>
                  ) : (
                    <>{t.proceedPayment} <ChevronRight className="w-4 h-4 ml-1" /></>
                  )}
                </Button>
              </div>
            </div>
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
            </div>
          </div>
        )}

        {/* ── STEP 4: PAYMENT ── */}
        {step === 4 && confirmedOrder && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {/* Order number banner */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
                <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <div>
                  <p className="text-sm text-blue-700 font-medium">Order created: <span className="font-bold tracking-wider">{confirmedOrder.order_number}</span></p>
                  <p className="text-xs text-blue-600">Complete payment below to confirm your order</p>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-600" /> {t.paymentMethod}
                </h3>
                <div className="grid sm:grid-cols-2 gap-3 mb-6">
                  {[
                    { value: 'credit_card', label: t.creditCard, desc: t.creditCardDesc, icon: '💳', color: 'blue' },
                    { value: 'check', label: t.checkPayment, desc: t.checkDesc, icon: '📋', color: 'amber' },
                  ].map(opt => (
                    <label key={opt.value} className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      form.payment_method === opt.value
                        ? opt.color === 'blue' ? 'border-blue-500 bg-blue-50' : 'border-amber-500 bg-amber-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <input type="radio" name="payment_method" value={opt.value}
                        checked={form.payment_method === opt.value} onChange={handleFormChange} className="mt-0.5" />
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{opt.icon} {opt.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>

                {/* Credit Card Form */}
                {form.payment_method === 'credit_card' && (
                  <Elements stripe={stripePromise}>
                    <StripeCardForm
                      orderTotal={confirmedOrder.total_amount}
                      orderNumber={confirmedOrder.order_number}
                      onSuccess={handleCardSuccess}
                      t={t}
                    />
                  </Elements>
                )}

                {/* Check Upload Form */}
                {form.payment_method === 'check' && (
                  <CheckUploadForm
                    orderNumber={confirmedOrder.order_number}
                    onSuccess={handleCheckSuccess}
                    t={t}
                    autoOpen={checkJustSelected}
                  />
                )}
              </div>
            </div>

            {/* Order Summary Sidebar */}
            <div className="bg-white rounded-xl border border-gray-100 p-5 h-fit">
              <h3 className="font-semibold text-gray-900 mb-4">{t.orderSummary}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>{t.subtotal}</span><span>{formatPrice(confirmedOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>{t.deliveryFee}</span>
                  <span className={confirmedOrder.delivery_fee === 0 ? 'text-green-600' : ''}>
                    {confirmedOrder.delivery_fee === 0 ? t.freeDelivery : formatPrice(confirmedOrder.delivery_fee)}
                  </span>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold text-gray-900 text-lg">
                  <span>{t.total}</span><span>{formatPrice(confirmedOrder.total_amount)}</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Lock className="w-3 h-3" />
                  <span>256-bit SSL encryption</span>
                </div>
                <div className="flex items-center gap-1 mt-2">
                  {['VISA', 'MC', 'AMEX'].map(card => (
                    <span key={card} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono font-bold">{card}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 5: CONFIRMED ── */}
        {step === 5 && confirmedOrder && (
          <div className="max-w-lg mx-auto text-center">
            <div className="bg-white rounded-2xl border border-gray-100 p-10 shadow-sm">
              <div className={`w-20 h-20 ${paymentDone ? 'bg-green-100' : 'bg-amber-100'} rounded-full flex items-center justify-center mx-auto mb-4`}>
                <CheckCircle className={`w-10 h-10 ${paymentDone ? 'text-green-600' : 'text-amber-600'}`} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{t.orderPlaced}</h2>
              <p className="text-gray-500 mb-4">
                {paymentDone ? t.orderPaidMsg : t.orderCheckMsg}
              </p>
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
