import { Heart, Users, Award, ChefHat, Clock, Star } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import simonPortrait from '../assets/simon-portrait.jpg'
import robertPortrait from '../assets/robert-portrait.jpg'

const AboutPage = () => {
  const { currentLanguage } = useLanguage()

  const content = {
    en: {
      heroTitle: "About RS LLD",
      heroSubtitle: "Two brothers. Thirty years in the kitchen. One mission: to make your operation run smoother.",
      meetTitle: "Meet the Brothers Behind RS LLD",
      meetIntro: "RS LLD was founded by Simon and Robert — two brothers who have spent their entire lives in the restaurant industry. Together, they bring over 60 combined years of hands-on experience running Chinese restaurants, and they built RS LLD because they know firsthand what restaurant operators truly need.",
      simonName: "Simon",
      simonAge: "Co-Founder · Age 70",
      simonBio: "Simon has been a chef since he was a teenager, learning the craft in the kitchen before he could even see over the counter. Over the past 30 years, he owned and operated multiple Chinese restaurants, managing everything from the wok to the supply orders. He has felt the frustration of unreliable suppliers, inflated prices, and last-minute shortages — and he decided to do something about it.",
      simonQuote: "\"I spent 30 years ordering supplies and never once felt like the supplier truly understood what I was going through. That's why we built RS LLD.\"",
      robertName: "Robert",
      robertAge: "Co-Founder · Age 64",
      robertBio: "Robert, Simon's younger brother, followed the same path — starting as a chef and growing into a full restaurant operator. His sharp eye for operations and cost management made him the backbone of their restaurant businesses. Robert's passion is helping other restaurant owners avoid the costly mistakes and supply headaches he experienced over three decades in the industry.",
      robertQuote: "\"Every dollar matters in this business. We built RS LLD so that operators can focus on cooking great food — not chasing down supplies.\"",
      storyTitle: "Our Story",
      storyContent: "After more than 30 years of running Chinese restaurants, Simon and Robert had seen it all — the long hours, the thin margins, the constant pressure of keeping a kitchen stocked and running. They experienced firsthand how difficult it was to find a reliable supplier who understood the pace and demands of a real restaurant kitchen. So they built one themselves.",
      storyContent2: "RS LLD was born from that frustration and that passion. Today, Simon and Robert channel everything they learned as operators into building a supply company that truly serves restaurant owners — with fair pricing, reliable stock, and the kind of understanding that only comes from having stood behind the stove yourself.",
      missionTitle: "Our Mission",
      missionText: "To help restaurant operators run as smoothly as possible — by providing the right supplies, at the right price, with the reliability and understanding that only fellow operators can offer.",
      valuesTitle: "Our Values",
      valuesList: [
        { icon: "heart", color: "blue", title: "Empathy", desc: "We've been in your shoes. We know the 4 AM prep, the supply emergencies, and the pressure of keeping a kitchen running." },
        { icon: "chef", color: "orange", title: "Craft & Experience", desc: "With over 60 combined years as chefs and restaurant owners, we bring real-world knowledge to every product we carry." },
        { icon: "award", color: "green", title: "Reliability", desc: "Consistent stock, fair pricing, and dependable service — because your kitchen can't afford surprises." },
        { icon: "users", color: "purple", title: "Partnership", desc: "We're not just a supplier. We're fellow operators who want to see your restaurant thrive." }
      ],
      commitTitle: "Our Commitment to You",
      commitText: "Simon and Robert built RS LLD with one goal: to be the supplier they always wished they had. Every product we carry, every price we set, and every order we fulfill is guided by the question — \"Would this have helped us when we were running our restaurants?\"",
      commitPoints: [
        { title: "Transparent Pricing", desc: "No hidden fees, no surprise charges. You'll always know exactly what you're paying." },
        { title: "Operator-First Mindset", desc: "Every decision we make is guided by what's best for the restaurant operator." },
        { title: "Reliable Supply", desc: "We maintain strong supplier relationships so your kitchen never runs short." }
      ]
    },
    zh: {
      heroTitle: "关于 RS LLD",
      heroSubtitle: "两兄弟。三十年厨房经验。一个使命：让您的餐厅运营更顺畅。",
      meetTitle: "认识 RS LLD 背后的两兄弟",
      meetIntro: "RS LLD 由 Simon 和 Robert 两兄弟创立。他们一生都在餐饮行业中打拼，合计拥有超过60年的中餐厅经营经验。他们创立 RS LLD，是因为他们深知餐厅经营者真正需要什么。",
      simonName: "Simon",
      simonAge: "联合创始人 · 70岁",
      simonBio: "Simon 从少年时期就开始学厨，在厨房里磨练手艺。在过去30年里，他拥有并经营了多家中餐厅，从炒锅到采购订单，事事亲力亲为。他深刻体会过供应商不可靠、价格虚高、临时断货的痛苦——于是他决定改变这一切。",
      simonQuote: "\"我花了30年订购供应品，却从未感受过供应商真正理解我的处境。这就是我们创立 RS LLD 的原因。\"",
      robertName: "Robert",
      robertAge: "联合创始人 · 64岁",
      robertBio: "Robert 是 Simon 的弟弟，走上了同样的道路——从厨师起步，成长为全面的餐厅经营者。他对运营和成本管理的敏锐眼光，是他们餐厅业务的核心支柱。Robert 的热情在于帮助其他餐厅老板避免他在三十年行业经验中所经历的代价高昂的错误和供应难题。",
      robertQuote: "\"在这个行业里，每一分钱都很重要。我们创立 RS LLD，就是为了让经营者专注于烹饪美食——而不是追着供应商跑。\"",
      storyTitle: "我们的故事",
      storyContent: "在经营中餐厅超过30年后，Simon 和 Robert 见识了一切——漫长的工作时间、微薄的利润、保持厨房备货和运转的持续压力。他们亲身体验了找到一个真正了解真实餐厅厨房节奏和需求的可靠供应商有多困难。于是，他们自己建了一个。",
      storyContent2: "RS LLD 正是从那种挫折和热情中诞生的。如今，Simon 和 Robert 将他们作为经营者所学到的一切，投入到打造一家真正服务于餐厅老板的供应公司中——以公平的价格、可靠的库存，以及只有亲身站在灶台后面才能拥有的理解。",
      missionTitle: "我们的使命",
      missionText: "帮助餐厅经营者尽可能顺畅地运营——通过提供正确的供应品、合理的价格，以及只有同行经营者才能给予的可靠性和理解。",
      valuesTitle: "我们的价值观",
      valuesList: [
        { icon: "heart", color: "blue", title: "同理心", desc: "我们曾经历过您的处境。我们了解凌晨4点的备料、供应紧急情况，以及保持厨房运转的压力。" },
        { icon: "chef", color: "orange", title: "工艺与经验", desc: "合计超过60年的厨师和餐厅老板经验，让我们为每一款产品带来真实的行业知识。" },
        { icon: "award", color: "green", title: "可靠性", desc: "稳定的库存、公平的价格和可靠的服务——因为您的厨房承受不起意外。" },
        { icon: "users", color: "purple", title: "合作伙伴关系", desc: "我们不仅仅是供应商，我们是希望看到您的餐厅蓬勃发展的同行经营者。" }
      ],
      commitTitle: "我们对您的承诺",
      commitText: "Simon 和 Robert 创立 RS LLD 只有一个目标：成为他们一直希望拥有的那种供应商。我们携带的每一款产品、设定的每一个价格、履行的每一笔订单，都以一个问题为指导——\"这在我们经营餐厅时会对我们有帮助吗？\"",
      commitPoints: [
        { title: "透明定价", desc: "没有隐藏费用，没有意外收费。您将始终清楚地知道您在支付什么。" },
        { title: "经营者优先理念", desc: "我们做出的每一个决定都以对餐厅经营者最有利为导向。" },
        { title: "可靠供应", desc: "我们维护强大的供应商关系，确保您的厨房永不断货。" }
      ]
    },
    ko: {
      heroTitle: "RS LLD 소개",
      heroSubtitle: "두 형제. 30년의 주방 경험. 하나의 사명: 당신의 운영을 더 원활하게.",
      meetTitle: "RS LLD 뒤에 있는 형제를 만나보세요",
      meetIntro: "RS LLD는 Simon과 Robert 두 형제가 설립했습니다. 그들은 평생을 레스토랑 업계에서 보냈으며, 합쳐서 60년 이상의 중국 레스토랑 운영 경험을 보유하고 있습니다. 그들은 레스토랑 운영자가 진정으로 필요로 하는 것을 직접 알기 때문에 RS LLD를 설립했습니다.",
      simonName: "Simon",
      simonAge: "공동 창업자 · 70세",
      simonBio: "Simon은 십대 때부터 요리사로 일하며 주방에서 기술을 연마했습니다. 지난 30년 동안 여러 중국 레스토랑을 소유하고 운영하면서 웍에서 공급 주문까지 모든 것을 직접 관리했습니다. 그는 신뢰할 수 없는 공급업체, 부풀려진 가격, 갑작스러운 재고 부족의 좌절감을 느꼈고, 이를 해결하기로 결심했습니다.",
      simonQuote: "\"30년 동안 공급품을 주문했지만 공급업체가 내 상황을 진정으로 이해한다고 느낀 적이 한 번도 없었습니다. 그래서 우리가 RS LLD를 만들었습니다.\"",
      robertName: "Robert",
      robertAge: "공동 창업자 · 64세",
      robertBio: "Robert는 Simon의 남동생으로, 같은 길을 걸었습니다 — 요리사로 시작해 완전한 레스토랑 운영자로 성장했습니다. 운영과 비용 관리에 대한 그의 예리한 안목은 레스토랑 사업의 핵심이었습니다. Robert의 열정은 30년 업계 경험에서 겪은 값비싼 실수와 공급 문제를 다른 레스토랑 사장님들이 피할 수 있도록 돕는 것입니다.",
      robertQuote: "\"이 사업에서는 모든 돈이 중요합니다. 우리는 운영자들이 훌륭한 음식 요리에 집중할 수 있도록 RS LLD를 만들었습니다 — 공급품을 쫓아다니는 것이 아니라.\"",
      storyTitle: "우리의 이야기",
      storyContent: "30년 이상 중국 레스토랑을 운영한 후, Simon과 Robert는 모든 것을 경험했습니다 — 긴 근무 시간, 얇은 마진, 주방을 채우고 운영하는 지속적인 압박. 그들은 실제 레스토랑 주방의 속도와 요구를 이해하는 신뢰할 수 있는 공급업체를 찾는 것이 얼마나 어려운지 직접 경험했습니다. 그래서 그들은 직접 만들었습니다.",
      storyContent2: "RS LLD는 그 좌절과 열정에서 탄생했습니다. 오늘날 Simon과 Robert는 운영자로서 배운 모든 것을 레스토랑 사장님들을 진정으로 섬기는 공급 회사를 구축하는 데 쏟아붓고 있습니다 — 공정한 가격, 신뢰할 수 있는 재고, 그리고 직접 스토브 뒤에 서본 사람만이 줄 수 있는 이해로.",
      missionTitle: "우리의 사명",
      missionText: "레스토랑 운영자들이 가능한 한 원활하게 운영할 수 있도록 돕는 것 — 올바른 공급품, 올바른 가격, 그리고 동료 운영자만이 제공할 수 있는 신뢰성과 이해로.",
      valuesTitle: "우리의 가치",
      valuesList: [
        { icon: "heart", color: "blue", title: "공감", desc: "우리는 당신의 입장을 경험했습니다. 새벽 4시 준비 작업, 공급 긴급 상황, 주방 운영 압박을 알고 있습니다." },
        { icon: "chef", color: "orange", title: "장인 정신과 경험", desc: "합쳐서 60년 이상의 요리사 및 레스토랑 사장 경험으로 모든 제품에 실제 지식을 담습니다." },
        { icon: "award", color: "green", title: "신뢰성", desc: "일관된 재고, 공정한 가격, 신뢰할 수 있는 서비스 — 주방은 예상치 못한 일을 감당할 수 없기 때문입니다." },
        { icon: "users", color: "purple", title: "파트너십", desc: "우리는 단순한 공급업체가 아닙니다. 당신의 레스토랑이 번창하길 바라는 동료 운영자입니다." }
      ],
      commitTitle: "당신에 대한 우리의 약속",
      commitText: "Simon과 Robert는 하나의 목표로 RS LLD를 설립했습니다: 그들이 항상 원했던 공급업체가 되는 것. 우리가 취급하는 모든 제품, 설정하는 모든 가격, 이행하는 모든 주문은 하나의 질문으로 안내됩니다 — \"이것이 우리가 레스토랑을 운영할 때 도움이 되었을까?\"",
      commitPoints: [
        { title: "투명한 가격", desc: "숨겨진 수수료도, 예상치 못한 청구도 없습니다. 항상 정확히 무엇을 지불하는지 알 수 있습니다." },
        { title: "운영자 우선 사고방식", desc: "우리의 모든 결정은 레스토랑 운영자에게 최선인 것을 기준으로 합니다." },
        { title: "안정적인 공급", desc: "강력한 공급업체 관계를 유지하여 주방이 절대 부족하지 않도록 합니다." }
      ]
    }
  }

  const C = content[currentLanguage] || content.en

  const iconColorMap = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-600' },
    green: { bg: 'bg-green-100', text: 'text-green-600' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600' },
  }

  const ValueIcon = ({ icon, color }) => {
    const cls = `w-8 h-8 ${iconColorMap[color].text}`
    if (icon === 'heart') return <Heart className={cls} />
    if (icon === 'chef') return <ChefHat className={cls} />
    if (icon === 'award') return <Award className={cls} />
    if (icon === 'users') return <Users className={cls} />
    return <Star className={cls} />
  }

  return (
    <div className="min-h-screen bg-white">

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-700 to-blue-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">{C.heroTitle}</h1>
          <p className="text-xl md:text-2xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
            {C.heroSubtitle}
          </p>
        </div>
      </section>

      {/* Meet the Founders */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{C.meetTitle}</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">{C.meetIntro}</p>
          </div>

          {/* Simon */}
          <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
            <div className="flex justify-center">
              <div className="relative">
                <img
                  src={simonPortrait}
                  alt="Simon - Co-Founder"
                  className="w-72 h-96 object-cover rounded-2xl shadow-xl"
                />
                <div className="absolute -bottom-4 -right-4 bg-blue-600 text-white px-4 py-2 rounded-xl shadow-lg">
                  <div className="flex items-center gap-2">
                    <ChefHat className="w-4 h-4" />
                    <span className="text-sm font-semibold">50+ yrs cooking</span>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-3xl font-bold text-gray-900 mb-1">{C.simonName}</h3>
              <p className="text-blue-600 font-medium mb-5">{C.simonAge}</p>
              <p className="text-gray-600 leading-relaxed mb-6">{C.simonBio}</p>
              <blockquote className="border-l-4 border-blue-500 pl-5 italic text-gray-700 text-lg">
                {C.simonQuote}
              </blockquote>
            </div>
          </div>

          {/* Robert */}
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1">
              <h3 className="text-3xl font-bold text-gray-900 mb-1">{C.robertName}</h3>
              <p className="text-blue-600 font-medium mb-5">{C.robertAge}</p>
              <p className="text-gray-600 leading-relaxed mb-6">{C.robertBio}</p>
              <blockquote className="border-l-4 border-blue-500 pl-5 italic text-gray-700 text-lg">
                {C.robertQuote}
              </blockquote>
            </div>
            <div className="order-1 md:order-2 flex justify-center">
              <div className="relative">
                <img
                  src={robertPortrait}
                  alt="Robert - Co-Founder"
                  className="w-72 h-96 object-cover rounded-2xl shadow-xl"
                />
                <div className="absolute -bottom-4 -left-4 bg-blue-600 text-white px-4 py-2 rounded-xl shadow-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-semibold">30+ yrs operating</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">{C.storyTitle}</h2>
          <p className="text-lg text-gray-600 leading-relaxed mb-6">{C.storyContent}</p>
          <p className="text-lg text-gray-600 leading-relaxed">{C.storyContent2}</p>
        </div>
      </section>

      {/* Mission Banner */}
      <section className="py-14 bg-blue-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold mb-4">{C.missionTitle}</h2>
          <p className="text-xl text-blue-100 leading-relaxed">{C.missionText}</p>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{C.valuesTitle}</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {C.valuesList.map((v, i) => (
              <div key={i} className="text-center">
                <div className={`w-16 h-16 ${iconColorMap[v.color].bg} rounded-full flex items-center justify-center mx-auto mb-4`}>
                  <ValueIcon icon={v.icon} color={v.color} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{v.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Commitment */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-blue-700 rounded-2xl text-white p-8 md:p-12">
            <div className="max-w-3xl mx-auto text-center mb-10">
              <h2 className="text-3xl font-bold mb-4">{C.commitTitle}</h2>
              <p className="text-lg text-blue-100 leading-relaxed">{C.commitText}</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 text-left">
              {C.commitPoints.map((p, i) => (
                <div key={i} className="bg-blue-600 bg-opacity-50 rounded-xl p-5">
                  <h3 className="font-semibold text-lg mb-2">{p.title}</h3>
                  <p className="text-blue-100 text-sm leading-relaxed">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}

export default AboutPage
