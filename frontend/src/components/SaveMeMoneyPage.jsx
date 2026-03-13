import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import { ArrowLeft, Upload, CheckCircle, DollarSign, Globe, TrendingDown } from 'lucide-react'

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'
]

const API_BASE = import.meta.env.VITE_API_URL || ''

const SaveMeMoneyPage = () => {
  const { language } = useLanguage()

  const copy = {
    en: {
      badge: 'Free Cost Analysis',
      title: 'How Much Can I Save?',
      subtitle: 'Our consultants based in China work directly with manufacturers to find you better pricing on the supplies you already buy.',
      bullets: [
        'Direct access to Chinese manufacturers',
        'No middleman markup — factory-direct pricing',
        'We analyze your current invoices and find savings',
      ],
      formTitle: 'Submit Your Invoice for a Free Analysis',
      name: 'Your Name',
      restaurantName: 'Restaurant Name',
      address: 'Street Address',
      city: 'City',
      state: 'State',
      phone: 'Phone',
      email: 'Email',
      rdCustomer: 'RD Customer # (optional)',
      attachInvoice: 'Attach Invoice (optional)',
      fileHint: 'JPG, PNG, or PDF — max 10 MB',
      submit: 'Submit for Free Analysis',
      submitting: 'Submitting…',
      successTitle: 'Thank You!',
      successMsg: 'We received your submission. Our team will review your invoice and reach out within 1–2 business days with a savings estimate.',
      backHome: '← Back to Home',
      required: 'Required',
    },
    zh: {
      badge: '免费成本分析',
      title: '我能省多少钱？',
      subtitle: '我们驻中国的顾问直接与制造商合作，为您找到更优惠的供应品价格。',
      bullets: [
        '直接接触中国制造商',
        '无中间商加价——工厂直供价格',
        '我们分析您的现有发票，寻找节省空间',
      ],
      formTitle: '提交发票，获取免费分析',
      name: '您的姓名',
      restaurantName: '餐厅名称',
      address: '街道地址',
      city: '城市',
      state: '州',
      phone: '电话',
      email: '电子邮件',
      rdCustomer: 'RD 客户编号（选填）',
      attachInvoice: '附上发票（选填）',
      fileHint: 'JPG、PNG 或 PDF — 最大 10 MB',
      submit: '提交免费分析',
      submitting: '提交中…',
      successTitle: '感谢您！',
      successMsg: '我们已收到您的提交。我们的团队将审核您的发票，并在 1-2 个工作日内与您联系，提供节省估算。',
      backHome: '← 返回首页',
      required: '必填',
    },
    ko: {
      badge: '무료 비용 분석',
      title: '얼마나 절약할 수 있나요?',
      subtitle: '중국에 주재한 저희 컨설턴트들이 제조업체와 직접 협력하여 더 나은 가격을 찾아드립니다.',
      bullets: [
        '중국 제조업체 직접 접근',
        '중간 마진 없음 — 공장 직접 가격',
        '현재 청구서를 분석하여 절감 방법 찾기',
      ],
      formTitle: '무료 분석을 위해 청구서를 제출하세요',
      name: '이름',
      restaurantName: '레스토랑 이름',
      address: '주소',
      city: '도시',
      state: '주',
      phone: '전화번호',
      email: '이메일',
      rdCustomer: 'RD 고객 번호 (선택)',
      attachInvoice: '청구서 첨부 (선택)',
      fileHint: 'JPG, PNG 또는 PDF — 최대 10 MB',
      submit: '무료 분석 제출',
      submitting: '제출 중…',
      successTitle: '감사합니다!',
      successMsg: '제출을 받았습니다. 저희 팀이 청구서를 검토하고 1-2 영업일 내에 절감 예상액을 알려드리겠습니다.',
      backHome: '← 홈으로 돌아가기',
      required: '필수',
    },
  }

  const t = copy[language] || copy.en

  const [form, setForm] = useState({
    name: '', restaurant_name: '', address: '', city: '',
    state: '', phone: '', email: '', rd_customer_number: '',
  })
  const [invoiceFile, setInvoiceFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleFileChange = (e) => {
    setInvoiceFile(e.target.files[0] || null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      if (invoiceFile) fd.append('invoice', invoiceFile)

      const res = await fetch(`${API_BASE}/api/save-me-money`, {
        method: 'POST',
        body: fd,
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setSuccess(true)
      } else {
        setError(data.error || 'Something went wrong. Please try again.')
      }
    } catch (err) {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-10 max-w-lg w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-3">{t.successTitle}</h2>
          <p className="text-gray-600 mb-6">{t.successMsg}</p>
          <Link to="/" className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium">
            <ArrowLeft className="w-4 h-4 mr-1" /> {t.backHome.replace('← ', '')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block bg-orange-500 text-white text-sm font-semibold px-4 py-1 rounded-full mb-4">
            {t.badge}
          </span>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{t.title}</h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-8">{t.subtitle}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {[
              { icon: Globe, text: t.bullets[0] },
              { icon: TrendingDown, text: t.bullets[1] },
              { icon: DollarSign, text: t.bullets[2] },
            ].map(({ icon: Icon, text }, i) => (
              <div key={i} className="flex items-center gap-2 bg-white/10 rounded-lg px-4 py-2 text-sm">
                <Icon className="w-4 h-4 text-orange-400 flex-shrink-0" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{t.formTitle}</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name + Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.name} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text" name="name" required
                  value={form.name} onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.phone} <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel" name="phone" required
                  value={form.phone} onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Restaurant Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.restaurantName} <span className="text-red-500">*</span>
              </label>
              <input
                type="text" name="restaurant_name" required
                value={form.restaurant_name} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.address} <span className="text-red-500">*</span>
              </label>
              <input
                type="text" name="address" required
                value={form.address} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* City + State */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.city} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text" name="city" required
                  value={form.city} onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.state} <span className="text-red-500">*</span>
                </label>
                <select
                  name="state" required
                  value={form.state} onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value=""></option>
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Email + RD Customer */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.email} <span className="text-red-500">*</span>
                </label>
                <input
                  type="email" name="email" required
                  value={form.email} onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.rdCustomer}
                </label>
                <input
                  type="text" name="rd_customer_number"
                  value={form.rd_customer_number} onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Invoice Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.attachInvoice}</label>
              <label className="flex items-center gap-3 border-2 border-dashed border-gray-300 rounded-lg px-4 py-4 cursor-pointer hover:border-blue-400 transition-colors">
                <Upload className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-500">
                  {invoiceFile ? invoiceFile.name : t.fileHint}
                </span>
                <input
                  type="file" accept=".jpg,.jpeg,.png,.pdf"
                  onChange={handleFileChange} className="hidden"
                />
              </label>
            </div>

            <button
              type="submit" disabled={submitting}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold py-3 rounded-lg transition-colors text-base"
            >
              {submitting ? t.submitting : t.submit}
            </button>
          </form>
        </div>

        <div className="text-center mt-6">
          <Link to="/" className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium">
            <ArrowLeft className="w-4 h-4 mr-1" /> {t.backHome.replace('← ', '')}
          </Link>
        </div>
      </div>
    </div>
  )
}

export default SaveMeMoneyPage
