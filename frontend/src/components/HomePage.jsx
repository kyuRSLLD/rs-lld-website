import { Button } from '@/components/ui/button'
import { ArrowRight, CheckCircle, Clock, DollarSign, Truck, Users, Shield, TrendingDown, Globe } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'

// Import images
import kitchenBusyImg from '../assets/TSE7WO1LwpLe.jpg'
import kitchenCleanImg from '../assets/hero-new.jpg'
import stressedOwnerImg from '../assets/CPfEaWblUhir.jpg'
import suppliesImg from '../assets/YivSFuYpWCgX.jpg'
import storageImg from '../assets/8marOgxRClM1.jpg'
import partnershipImg from '../assets/KVSeV0OHc0aA.jpg'

const HomePage = () => {
  const { t } = useLanguage()
  
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-blue-900 to-blue-700 text-white min-h-screen flex items-center">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${kitchenCleanImg})` }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32 w-full">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6 text-white">
              {t('hero.title')}
              <span className="text-orange-400 block mt-2">{t('hero.subtitle')}</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-gray-100">
              {t('hero.description')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/products">
                <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 text-lg">
                  {t('hero.browseProducts')}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link to="/contact">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-900 px-8 py-4 text-lg">
                  {t('hero.getQuote')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Save Me Money Banner */}
      <section className="bg-gradient-to-r from-orange-500 to-orange-600 text-white py-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 py-8">
            <div className="flex items-start gap-4">
              <div className="bg-white/20 rounded-full p-3 flex-shrink-0">
                <TrendingDown className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-1">
                  {t('saveMeMoney.bannerTitle')}
                </h2>
                <p className="text-orange-100 text-base max-w-xl">
                  {t('saveMeMoney.bannerDesc')}
                </p>
              </div>
            </div>
            <Link
              to="/save-me-money"
              className="flex-shrink-0 bg-white text-orange-600 hover:bg-orange-50 font-bold px-8 py-3 rounded-lg text-base transition-colors shadow-md whitespace-nowrap"
            >
              {t('saveMeMoney.bannerCta')}
            </Link>
          </div>
        </div>
      </section>

      {/* Restaurant Reality Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t('battle.title')}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {t('battle.description')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <img 
                src={stressedOwnerImg} 
                alt="Restaurant owner managing operations - RS LLD (Restaurant Supply Leading Logistics & Distribution) serves restaurant owners nationwide" 
                className="rounded-lg shadow-lg w-full h-64 object-cover"
              />
            </div>
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <DollarSign className="w-6 h-6 text-red-500 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">{t('battle.margins.title')}</h3>
                  <p className="text-gray-600">{t('battle.margins.description')}</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <Users className="w-6 h-6 text-red-500 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">{t('battle.staff.title')}</h3>
                  <p className="text-gray-600">{t('battle.staff.description')}</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <Clock className="w-6 h-6 text-red-500 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">{t('battle.hours.title')}</h3>
                  <p className="text-gray-600">{t('battle.hours.description')}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 bg-white rounded-lg p-8 shadow-lg">
            <blockquote className="text-lg italic text-gray-700 text-center">
              "{t('battle.quote')}"
            </blockquote>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t('partner.title')}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {t('partner.description')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <CheckCircle className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">{t('partner.pricing.title')}</h3>
                  <p className="text-gray-600">{t('partner.pricing.description')}</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <Truck className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">{t('partner.supply.title')}</h3>
                  <p className="text-gray-600">{t('partner.supply.description')}</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <Shield className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">{t('partner.payment.title')}</h3>
                  <p className="text-gray-600">{t('partner.payment.description')}</p>
                </div>
              </div>
            </div>
            <div>
              <img 
                src={partnershipImg} 
                alt="RS LLD — Restaurant Supply Leading Logistics & Distribution — partnership with restaurant owners across the United States" 
                className="rounded-lg shadow-lg w-full h-64 object-cover"
              />
            </div>
          </div>

        </div>
      </section>

      {/* SEO Content Section - Rich keyword text for search engines */}
      <section className="py-12 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="p-6">
              <div className="text-4xl font-bold text-blue-600 mb-2">30+</div>
              <div className="text-lg font-semibold text-gray-900 mb-1">Years of Experience</div>
              <p className="text-gray-600 text-sm">Serving restaurant owners and food service businesses across the United States with wholesale pricing and reliable delivery.</p>
            </div>
            <div className="p-6">
              <div className="text-4xl font-bold text-blue-600 mb-2">$0</div>
              <div className="text-lg font-semibold text-gray-900 mb-1">Delivery on Large Orders</div>
              <p className="text-gray-600 text-sm">Free delivery on orders over $200. Bulk pricing available on all products for restaurant owners.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Service Area Section */}
      <section className="py-10 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Serving Restaurant Owners Nationwide</h2>
          <p className="text-gray-600 max-w-3xl mx-auto mb-6">
            RS LLD (Restaurant Supply Leading Logistics & Distribution) ships wholesale restaurant supplies to restaurants, Chinese restaurants, Asian restaurants, 
            and food service businesses across the United States. Call us at (224) 424-7271 or email 
            sales@lldrestaurantsupply.com for wholesale pricing and shipping options.
          </p>
          <div className="flex flex-wrap justify-center gap-3 text-sm text-gray-500">
            {['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose'].map(city => (
              <span key={city} className="bg-white border border-gray-200 rounded-full px-3 py-1">{city}</span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t('cta.title')}
          </h2>
          <p className="text-xl mb-8 text-blue-100 max-w-2xl mx-auto">
            {t('cta.description')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/products">
              <Button size="lg" className="bg-orange-500 hover:bg-orange-600 px-8 py-4 text-lg">
                {t('cta.viewProducts')}
              </Button>
            </Link>
            <Link to="/contact">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600 px-8 py-4 text-lg">
                {t('cta.contactSales')}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm">
              &copy; {new Date().getFullYear()} LLD Restaurant Supply. All rights reserved.
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-white transition-colors">Terms &amp; Conditions</Link>
              <Link to="/contact" className="hover:text-white transition-colors">Contact Us</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default HomePage

