import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Phone, Mail, MapPin, Send, MessageCircle } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import whatsappQr from '../assets/whatsapp-qr.png'
import wechatQr from '../assets/wechat-qr.png'

const translations = {
  en: {
    hero_title: 'Get in Touch',
    hero_sub: "Ready to simplify your restaurant supply chain? We're here to help.",
    section_title: "Let's Talk Business",
    section_sub: "Whether you're looking for a quote, have questions about our products, or want to discuss how we can help your restaurant succeed — reach out anytime.",
    phone_label: 'Phone',
    email_label: 'Email',
    email_note: 'We respond within 24 hours',
    address_label: 'Address',
    messaging_label: 'WhatsApp & WeChat',
    messaging_note: 'Scan to chat with us directly',
    whatsapp_title: 'WhatsApp',
    wechat_title: 'WeChat',
    scan_label: 'Scan to add',
    why_title: 'Why Contact Us?',
    why_items: [
      'Get personalized pricing for your restaurant',
      'Discuss bulk discounts and volume pricing',
      'Flexible delivery schedules',
      'Set up your account and place your first order',
      'Expert advice on product selection',
    ],
    form_title: 'Send Us a Message',
    name: 'Name',
    email_field: 'Email',
    company: 'Restaurant / Company Name',
    phone_field: 'Phone Number',
    message: 'Message',
    message_placeholder: 'Tell us about your restaurant and how we can help...',
    send: 'Send Message',
    sending: 'Sending...',
    success_title: 'Message Sent!',
    success_sub: "Thank you for reaching out. We'll get back to you within 24 hours.",
    send_another: 'Send Another Message',
  },
  zh: {
    hero_title: '联系我们',
    hero_sub: '准备好简化您的餐厅供应链了吗？我们随时为您服务。',
    section_title: '随时联系我们',
    section_sub: '无论您需要报价、有产品问题，还是想了解我们如何帮助您的餐厅——随时联系我们。',
    phone_label: '电话',
    email_label: '电子邮件',
    email_note: '我们在24小时内回复',
    address_label: '地址',
    messaging_label: 'WhatsApp 和 微信',
    messaging_note: '扫码直接与我们聊天',
    whatsapp_title: 'WhatsApp',
    wechat_title: '微信',
    scan_label: '扫码添加',
    why_title: '为什么联系我们？',
    why_items: [
      '获取针对您餐厅的个性化报价',
      '了解批量折扣和大量采购价格',
      '灵活的配送时间安排',
      '开设账户并下第一笔订单',
      '专业的产品选择建议',
    ],
    form_title: '给我们发消息',
    name: '姓名',
    email_field: '电子邮件',
    company: '餐厅 / 公司名称',
    phone_field: '电话号码',
    message: '留言',
    message_placeholder: '告诉我们您的餐厅情况以及我们如何帮助您...',
    send: '发送消息',
    sending: '发送中...',
    success_title: '消息已发送！',
    success_sub: '感谢您的联系，我们将在24小时内回复您。',
    send_another: '再发一条消息',
  },
  ko: {
    hero_title: '문의하기',
    hero_sub: '레스토랑 공급망을 간소화할 준비가 되셨나요? 언제든지 도와드리겠습니다.',
    section_title: '비즈니스 상담',
    section_sub: '견적 요청, 제품 문의, 또는 레스토랑 성공을 위한 상담 — 언제든지 연락주세요.',
    phone_label: '전화',
    email_label: '이메일',
    email_note: '24시간 이내에 답변드립니다',
    address_label: '주소',
    messaging_label: 'WhatsApp & 위챗',
    messaging_note: 'QR코드를 스캔하여 직접 채팅하세요',
    whatsapp_title: 'WhatsApp',
    wechat_title: '위챗',
    scan_label: '스캔하여 추가',
    why_title: '왜 문의하시나요?',
    why_items: [
      '레스토랑 맞춤 견적 받기',
      '대량 할인 및 볼륨 가격 상담',
      '유연한 배송 일정',
      '계정 개설 및 첫 주문',
      '제품 선택 전문 조언',
    ],
    form_title: '메시지 보내기',
    name: '이름',
    email_field: '이메일',
    company: '레스토랑 / 회사명',
    phone_field: '전화번호',
    message: '메시지',
    message_placeholder: '레스토랑에 대해 알려주시고 어떻게 도와드릴 수 있는지 말씀해 주세요...',
    send: '메시지 보내기',
    sending: '전송 중...',
    success_title: '메시지가 전송되었습니다!',
    success_sub: '연락해 주셔서 감사합니다. 24시간 이내에 답변드리겠습니다.',
    send_another: '다른 메시지 보내기',
  },
}

const ContactPage = () => {
  const { currentLanguage } = useLanguage()
  const t = translations[currentLanguage] || translations.en

  const [formData, setFormData] = useState({ name: '', email: '', company: '', phone: '', message: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setTimeout(() => {
      setIsSubmitting(false)
      setSubmitted(true)
      setFormData({ name: '', email: '', company: '', phone: '', message: '' })
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{t.hero_title}</h1>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto">{t.hero_sub}</p>
        </div>
      </section>

      {/* Contact Content */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">

            {/* Left: Contact Info */}
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">{t.section_title}</h2>
              <p className="text-lg text-gray-600 mb-8">{t.section_sub}</p>

              <div className="space-y-6">
                {/* Phone */}
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Phone className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">{t.phone_label}</h3>
                    <a href="tel:+12244247271" className="text-blue-600 hover:underline text-lg font-medium">
                      +1 (224) 424-7271
                    </a>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">{t.email_label}</h3>
                    <a href="mailto:sales@lldrestaurantsupply.com" className="text-blue-600 hover:underline">
                      sales@lldrestaurantsupply.com
                    </a>
                    <p className="text-sm text-gray-500 mt-1">{t.email_note}</p>
                  </div>
                </div>

                {/* Address */}
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">{t.address_label}</h3>
                    <p className="text-gray-700">218 Terrace Dr</p>
                    <p className="text-gray-700">Mundelein, IL 60060</p>
                    <a
                      href="https://maps.google.com/?q=218+Terrace+Dr,+Mundelein,+IL+60060"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline mt-1 inline-block"
                    >
                      View on Google Maps →
                    </a>
                  </div>
                </div>
              </div>

              {/* QR Codes Section */}
              <div className="mt-10">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-6 h-6 text-teal-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{t.messaging_label}</h3>
                    <p className="text-sm text-gray-500">{t.messaging_note}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 mt-4">
                  {/* WhatsApp QR */}
                  <div className="bg-white rounded-xl shadow-md p-4 text-center border border-gray-100">
                    <div className="flex items-center justify-center space-x-2 mb-3">
                      <div className="w-6 h-6 bg-[#25D366] rounded-full flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                      </div>
                      <span className="font-semibold text-gray-800">{t.whatsapp_title}</span>
                    </div>
                    <img
                      src={whatsappQr}
                      alt="WhatsApp QR Code"
                      className="w-full max-w-[160px] mx-auto rounded-lg"
                    />
                    <p className="text-xs text-gray-500 mt-2">+1 (224) 424-7271</p>
                    <p className="text-xs text-gray-400">{t.scan_label}</p>
                  </div>

                  {/* WeChat QR */}
                  <div className="bg-white rounded-xl shadow-md p-4 text-center border border-gray-100">
                    <div className="flex items-center justify-center space-x-2 mb-3">
                      <div className="w-6 h-6 bg-[#07C160] rounded-full flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                          <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-3.898-6.348-7.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178A1.17 1.17 0 014.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178 1.17 1.17 0 01-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 01.598.082l1.584.926a.272.272 0 00.14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 01-.023-.156.49.49 0 01.201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-7.063-6.122zm-3.19 3.099c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.97-.982zm6.274 0c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.969-.982z"/>
                        </svg>
                      </div>
                      <span className="font-semibold text-gray-800">{t.wechat_title}</span>
                    </div>
                    <img
                      src={wechatQr}
                      alt="WeChat QR Code"
                      className="w-full max-w-[160px] mx-auto rounded-lg"
                    />
                    <p className="text-xs text-gray-500 mt-2">LLD Sales</p>
                    <p className="text-xs text-gray-400">{t.scan_label}</p>
                  </div>
                </div>
              </div>

              {/* Why Contact Us */}
              <div className="mt-10 bg-blue-50 rounded-xl p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">{t.why_title}</h3>
                <ul className="space-y-2 text-gray-600">
                  {t.why_items.map((item, i) => (
                    <li key={i} className="flex items-start space-x-2">
                      <span className="text-blue-500 mt-1">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Right: Contact Form */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">{t.form_title}</h3>

              {submitted ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Send className="w-8 h-8 text-green-600" />
                  </div>
                  <h4 className="text-xl font-semibold text-gray-900 mb-2">{t.success_title}</h4>
                  <p className="text-gray-600">{t.success_sub}</p>
                  <Button onClick={() => setSubmitted(false)} className="mt-4" variant="outline">
                    {t.send_another}
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t.name} *</label>
                      <input
                        type="text" name="name" value={formData.name} onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t.email_field} *</label>
                      <input
                        type="email" name="email" value={formData.email} onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t.company}</label>
                      <input
                        type="text" name="company" value={formData.company} onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t.phone_field}</label>
                      <input
                        type="tel" name="phone" value={formData.phone} onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.message} *</label>
                    <textarea
                      name="message" value={formData.message} onChange={handleInputChange}
                      rows={5}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={t.message_placeholder}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 py-3" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>{t.sending}</>
                    ) : (
                      <><Send className="w-4 h-4 mr-2" />{t.send}</>
                    )}
                  </Button>
                </form>
              )}
            </div>

          </div>
        </div>
      </section>
    </div>
  )
}

export default ContactPage
