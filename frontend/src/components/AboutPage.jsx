import { Heart, Users, Shield, Award } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'

const AboutPage = () => {
  const { t } = useLanguage()
  
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">{t('about.title')}</h1>
            <p className="text-xl md:text-2xl text-blue-100 max-w-3xl mx-auto">
              {t('about.subtitle')}
            </p>
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">{t('about.story.title')}</h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              {t('about.story.content')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">{t('about.experience.title')}</h3>
              <p className="text-gray-600 mb-4">
                {t('about.experience.content')}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-8">
              <blockquote className="text-lg italic text-gray-700">
                "We started RS LLD because we knew there had to be a better way. Restaurant owners deserve suppliers who understand their business and genuinely want to help them succeed."
              </blockquote>
              <cite className="block mt-4 text-sm text-gray-500">- RS LLD Founders</cite>
            </div>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('about.values.title')}</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              These principles guide every decision we make and every relationship we build.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('about.values.empathy.title')}</h3>
              <p className="text-gray-600">
                {t('about.values.empathy.description')}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('about.values.reliability.title')}</h3>
              <p className="text-gray-600">
                {t('about.values.reliability.description')}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('about.values.value.title')}</h3>
              <p className="text-gray-600">
                {t('about.values.value.description')}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('about.values.partnership.title')}</h3>
              <p className="text-gray-600">
                {t('about.values.partnership.description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Commitment */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-blue-600 rounded-2xl text-white p-8 md:p-12">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl font-bold mb-6">Our Commitment to You</h2>
              <p className="text-xl text-blue-100 mb-8">
                Every restaurant owner deserves a supply partner who understands their business, respects their challenges, and is committed to their success.
              </p>
              
              <div className="grid md:grid-cols-3 gap-6 text-left">
                <div>
                  <h3 className="font-semibold mb-2">Transparent Pricing</h3>
                  <p className="text-blue-100 text-sm">No hidden fees, no surprise charges. You'll always know exactly what you're paying and why.</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Responsive Service</h3>
                  <p className="text-blue-100 text-sm">When you call, you'll speak with someone who understands your business and can solve your problems.</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Continuous Improvement</h3>
                  <p className="text-blue-100 text-sm">We're always looking for ways to serve you better and help your business grow.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default AboutPage

