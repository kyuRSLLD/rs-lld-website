import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageSquare, CheckCircle, AlertCircle, ShieldCheck } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'

const API_BASE = import.meta.env.VITE_API_URL || ''

// ─── Translations ────────────────────────────────────────────────────────────
const translations = {
  en: {
    hero_title: 'SMS Text Message Opt-In',
    hero_sub:
      'Sign up to receive order updates, delivery notifications, and important account information via text message from RS LLD Restaurant Supply.',
    form_title: 'Subscribe to SMS Notifications',
    first_name: 'First Name',
    last_name: 'Last Name (optional)',
    phone: 'Mobile Phone Number',
    phone_placeholder: '(xxx) xxx-xxxx',
    email: 'Email Address (optional)',
    email_placeholder: 'your@email.com',
    consent_label:
      'I agree to receive recurring automated SMS/text messages from RS LLD Restaurant Supply at the mobile number provided. Message frequency varies. Message and data rates may apply.',
    submit: 'Opt In to SMS',
    submitting: 'Submitting…',
    success_title: 'You\'re Opted In!',
    success_body:
      'Thank you! You will receive a confirmation text message shortly. You can reply STOP at any time to unsubscribe.',
    opt_in_another: 'Submit Another Number',
    required_error: 'Please fill in all required fields and agree to the terms.',
    phone_error: 'Please enter a valid US phone number.',
    server_error: 'Something went wrong. Please try again.',
    // Disclosure block
    disc_title: 'Important Information',
    disc_brand: 'RS LLD Restaurant Supply',
    disc_how_title: 'How You Are Opting In',
    disc_how_body:
      'By submitting this web form at lldrestaurantsupply.com/sms-opt-in, you are providing express written consent to receive SMS/text messages from RS LLD Restaurant Supply.',
    disc_types_title: 'Types of Messages You Will Receive',
    disc_types: [
      'Order confirmations and status updates',
      'Delivery notifications and scheduling',
      'Payment reminders and receipts',
      'Account alerts and important notices',
      'Promotional offers (occasional)',
    ],
    disc_freq: 'Message frequency varies based on your order activity. You may receive up to 10 messages per month.',
    disc_rates: 'Message and data rates may apply. Please contact your wireless carrier for details.',
    disc_stop: 'Reply STOP to unsubscribe from all SMS messages at any time.',
    disc_help: 'Reply HELP for assistance, or contact us at (775) 591-5629 or kyu@lldrestaurantsupply.com.',
    disc_sharing:
      'We do not sell, rent, or share your phone number or SMS opt-in data with third parties for their marketing purposes.',
    disc_links: 'By opting in, you agree to our',
    disc_and: 'and',
    disc_privacy: 'Privacy Policy',
    disc_terms: 'Terms and Conditions',
    back_home: '← Back to Home',
  },
  zh: {
    hero_title: '短信通知订阅',
    hero_sub:
      '订阅以接收来自RS LLD餐厅供应的订单更新、配送通知及重要账户信息短信。',
    form_title: '订阅短信通知',
    first_name: '名字',
    last_name: '姓氏（可选）',
    phone: '手机号码',
    phone_placeholder: '(xxx) xxx-xxxx',
    email: '电子邮件（可选）',
    email_placeholder: 'your@email.com',
    consent_label:
      '我同意在所提供的手机号码上接收来自RS LLD餐厅供应的定期自动短信。短信频率不定。可能收取短信和数据费用。',
    submit: '订阅短信',
    submitting: '提交中…',
    success_title: '订阅成功！',
    success_body:
      '感谢您！您将很快收到一条确认短信。您可以随时回复 STOP 取消订阅。',
    opt_in_another: '提交另一个号码',
    required_error: '请填写所有必填字段并同意条款。',
    phone_error: '请输入有效的美国手机号码。',
    server_error: '出现错误，请重试。',
    disc_title: '重要信息',
    disc_brand: 'RS LLD餐厅供应',
    disc_how_title: '您的订阅方式',
    disc_how_body:
      '通过在 lldrestaurantsupply.com/sms-opt-in 提交此网络表单，您正在提供明确的书面同意，以接收来自RS LLD餐厅供应的短信。',
    disc_types_title: '您将收到的消息类型',
    disc_types: [
      '订单确认和状态更新',
      '配送通知和安排',
      '付款提醒和收据',
      '账户提醒和重要通知',
      '促销优惠（偶尔）',
    ],
    disc_freq: '短信频率因您的订单活动而异。每月最多可收到10条短信。',
    disc_rates: '可能收取短信和数据费用。请联系您的运营商了解详情。',
    disc_stop: '随时回复 STOP 取消所有短信订阅。',
    disc_help: '回复 HELP 获取帮助，或联系我们：(775) 591-5629 或 kyu@lldrestaurantsupply.com。',
    disc_sharing:
      '我们不会将您的手机号码或短信订阅数据出售、出租或分享给第三方用于营销目的。',
    disc_links: '订阅即表示您同意我们的',
    disc_and: '和',
    disc_privacy: '隐私政策',
    disc_terms: '服务条款',
    back_home: '← 返回首页',
  },
  ko: {
    hero_title: 'SMS 문자 메시지 수신 동의',
    hero_sub:
      'RS LLD Restaurant Supply로부터 주문 업데이트, 배송 알림 및 중요 계정 정보를 문자 메시지로 받아보세요.',
    form_title: 'SMS 알림 구독',
    first_name: '이름',
    last_name: '성 (선택)',
    phone: '휴대폰 번호',
    phone_placeholder: '(xxx) xxx-xxxx',
    email: '이메일 주소 (선택)',
    email_placeholder: 'your@email.com',
    consent_label:
      '제공한 휴대폰 번호로 RS LLD Restaurant Supply의 반복 자동 SMS/문자 메시지 수신에 동의합니다. 메시지 빈도는 다를 수 있습니다. 메시지 및 데이터 요금이 적용될 수 있습니다.',
    submit: 'SMS 수신 동의',
    submitting: '제출 중…',
    success_title: '구독 완료!',
    success_body:
      '감사합니다! 곧 확인 문자를 받으실 것입니다. 언제든지 STOP을 회신하여 구독을 취소할 수 있습니다.',
    opt_in_another: '다른 번호 제출',
    required_error: '모든 필수 항목을 입력하고 약관에 동의해 주세요.',
    phone_error: '유효한 미국 휴대폰 번호를 입력해 주세요.',
    server_error: '오류가 발생했습니다. 다시 시도해 주세요.',
    disc_title: '중요 정보',
    disc_brand: 'RS LLD Restaurant Supply',
    disc_how_title: '수신 동의 방법',
    disc_how_body:
      'lldrestaurantsupply.com/sms-opt-in의 이 웹 양식을 제출함으로써 RS LLD Restaurant Supply로부터 SMS/문자 메시지를 받는 것에 명시적 서면 동의를 제공합니다.',
    disc_types_title: '수신할 메시지 유형',
    disc_types: [
      '주문 확인 및 상태 업데이트',
      '배송 알림 및 일정',
      '결제 알림 및 영수증',
      '계정 알림 및 중요 공지',
      '프로모션 혜택 (가끔)',
    ],
    disc_freq: '메시지 빈도는 주문 활동에 따라 다릅니다. 월 최대 10개의 메시지를 받을 수 있습니다.',
    disc_rates: '메시지 및 데이터 요금이 적용될 수 있습니다. 자세한 내용은 이동통신사에 문의하세요.',
    disc_stop: '언제든지 STOP을 회신하여 모든 SMS 메시지 구독을 취소할 수 있습니다.',
    disc_help: '도움이 필요하면 HELP를 회신하거나 (775) 591-5629 또는 kyu@lldrestaurantsupply.com으로 문의하세요.',
    disc_sharing:
      '저희는 귀하의 전화번호나 SMS 수신 동의 데이터를 마케팅 목적으로 제3자에게 판매, 임대 또는 공유하지 않습니다.',
    disc_links: '수신 동의 시 당사',
    disc_and: '및',
    disc_privacy: '개인정보처리방침',
    disc_terms: '이용약관',
    back_home: '← 홈으로 돌아가기',
  },
}

// ─── Phone formatter ─────────────────────────────────────────────────────────
function formatPhone(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 10)
  if (digits.length <= 3) return digits.length ? `(${digits}` : ''
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function SmsOptInPage() {
  const { currentLanguage } = useLanguage()
  const lang = translations[currentLanguage] || translations.en
  const t = lang

  const [form, setForm] = useState({ first_name: '', last_name: '', phone: '', email: '', consent: false })
  const [status, setStatus] = useState('idle') // idle | submitting | success | error
  const [errorMsg, setErrorMsg] = useState('')

  const handlePhoneChange = (e) => {
    setForm((f) => ({ ...f, phone: formatPhone(e.target.value) }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')

    if (!form.first_name.trim() || !form.phone.trim() || !form.consent) {
      setErrorMsg(t.required_error)
      return
    }

    setStatus('submitting')
    try {
      const res = await fetch(`${API_BASE}/api/sms-optin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          phone: form.phone,
          email: form.email.trim(),
          consent: form.consent,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setStatus('success')
      } else {
        setErrorMsg(data.error || t.server_error)
        setStatus('error')
      }
    } catch {
      setErrorMsg(t.server_error)
      setStatus('error')
    }
  }

  const reset = () => {
    setForm({ first_name: '', last_name: '', phone: '', email: '', consent: false })
    setStatus('idle')
    setErrorMsg('')
  }

  return (
    <div className="min-h-screen bg-white">
      {/* ── Hero ── */}
      <section className="bg-gradient-to-r from-blue-700 to-blue-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center mb-4">
            <MessageSquare className="w-12 h-12 text-blue-200" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{t.hero_title}</h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto">{t.hero_sub}</p>
        </div>
      </section>

      {/* ── Main content ── */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12">

          {/* ── Left: Form ── */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{t.form_title}</h2>

            {status === 'success' ? (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
                <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-green-800 mb-2">{t.success_title}</h3>
                <p className="text-green-700 mb-6">{t.success_body}</p>
                <button
                  onClick={reset}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors"
                >
                  {t.opt_in_another}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* First name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    {t.first_name} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.first_name}
                    onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Last name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{t.last_name}</label>
                  <input
                    type="text"
                    value={form.last_name}
                    onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    {t.phone} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={handlePhoneChange}
                    placeholder={t.phone_placeholder}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{t.email}</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder={t.email_placeholder}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Consent checkbox */}
                <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <input
                    id="consent"
                    type="checkbox"
                    required
                    checked={form.consent}
                    onChange={(e) => setForm((f) => ({ ...f, consent: e.target.checked }))}
                    className="mt-1 w-4 h-4 accent-blue-600 flex-shrink-0"
                  />
                  <label htmlFor="consent" className="text-sm text-gray-700 leading-snug cursor-pointer">
                    {t.consent_label}
                  </label>
                </div>

                {/* Error */}
                {(status === 'error' || errorMsg) && (
                  <div className="flex items-start gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{errorMsg || t.server_error}</span>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3 rounded-lg transition-colors text-lg"
                >
                  {status === 'submitting' ? t.submitting : t.submit}
                </button>

                {/* Mini legal */}
                <p className="text-xs text-gray-500 leading-relaxed">
                  {t.disc_rates} {t.disc_stop} {t.disc_help}
                </p>
              </form>
            )}
          </div>

          {/* ── Right: Disclosures ── */}
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold text-gray-900">{t.disc_title}</h3>
              </div>

              <div className="space-y-4 text-sm text-gray-700">
                <div>
                  <p className="font-semibold text-gray-900 mb-1">{t.disc_how_title}</p>
                  <p className="leading-relaxed">{t.disc_how_body}</p>
                </div>

                <div>
                  <p className="font-semibold text-gray-900 mb-1">{t.disc_types_title}</p>
                  <ul className="list-disc pl-5 space-y-1">
                    {t.disc_types.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>

                <p className="leading-relaxed">{t.disc_freq}</p>

                <p className="leading-relaxed font-medium text-gray-800">{t.disc_rates}</p>

                <p className="leading-relaxed">
                  <strong>STOP:</strong> {t.disc_stop}
                </p>

                <p className="leading-relaxed">
                  <strong>HELP:</strong> {t.disc_help}
                </p>

                <p className="leading-relaxed text-gray-600">{t.disc_sharing}</p>

                <p className="leading-relaxed">
                  {t.disc_links}{' '}
                  <Link to="/privacy-policy" className="text-blue-600 hover:underline font-medium">
                    {t.disc_privacy}
                  </Link>{' '}
                  {t.disc_and}{' '}
                  <Link to="/terms" className="text-blue-600 hover:underline font-medium">
                    {t.disc_terms}
                  </Link>
                  .
                </p>
              </div>
            </div>

            {/* Contact card */}
            <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
              <p className="text-sm font-bold text-blue-900 mb-1">RS LLD Restaurant Supply</p>
              <p className="text-sm text-blue-700">Chicago, Illinois</p>
              <p className="text-sm text-blue-700 mt-1">
                <a href="tel:+17755915629" className="hover:underline">(775) 591-5629</a>
              </p>
              <p className="text-sm text-blue-700">
                <a href="mailto:kyu@lldrestaurantsupply.com" className="hover:underline">
                  kyu@lldrestaurantsupply.com
                </a>
              </p>
              <p className="text-sm text-blue-700 mt-1">
                <a href="https://lldrestaurantsupply.com" className="hover:underline">
                  lldrestaurantsupply.com
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Back link */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
          <Link to="/" className="text-blue-600 hover:underline text-sm">
            {t.back_home}
          </Link>
        </div>
      </section>
    </div>
  )
}
