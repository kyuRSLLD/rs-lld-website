import { Button } from '@/components/ui/button'
import { ArrowRight, CheckCircle, Clock, DollarSign, Truck, Users, Shield } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'

// Import images
import kitchenBusyImg from '../assets/TSE7WO1LwpLe.jpg'
import kitchenCleanImg from '../assets/restaurant-kitchen-clean.jpg'
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
                alt="Stressed restaurant owner" 
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
                alt="Business partnership" 
                className="rounded-lg shadow-lg w-full h-64 object-cover"
              />
            </div>
          </div>

          {/* Product Categories Preview */}
          <div className="bg-gray-50 rounded-lg p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
              {t('products.title')}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {[
                { key: 'canned', name: t('products.categories.canned') },
                { key: 'dry', name: t('products.categories.dry') },
                { key: 'condiments', name: t('products.categories.condiments') },
                { key: 'cleaning', name: t('products.categories.cleaning') },
                { key: 'paper', name: t('products.categories.paper') },
                { key: 'packaging', name: t('products.categories.packaging') }
              ].map((category, index) => (
                <div key={index} className="text-center">
                  <div className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
                      <span className="text-blue-600 font-semibold text-sm">{category.name.charAt(0)}</span>
                    </div>
                    <h4 className="font-medium text-gray-900 text-sm">{category.name}</h4>
                  </div>
                </div>
              ))}
            </div>
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
    </div>
  )
}

export default HomePage

