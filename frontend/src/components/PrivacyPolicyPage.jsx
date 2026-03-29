import { Link } from 'react-router-dom'
import { Shield, Mail, Phone } from 'lucide-react'

const PrivacyPolicyPage = () => {
  return (
    <div className="min-h-screen bg-white">

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-700 to-blue-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center mb-4">
            <Shield className="w-12 h-12 text-blue-200" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto">
            LLD Restaurant Supply is committed to protecting your privacy and personal information.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="text-sm text-gray-500 mb-8">
            <strong>Effective Date:</strong> March 22, 2026 &nbsp;|&nbsp; <strong>Last Updated:</strong> March 22, 2026
          </div>

          <div className="prose prose-lg max-w-none text-gray-700 space-y-10">

            {/* Introduction */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Introduction</h2>
              <p className="leading-relaxed">
                LLD Restaurant Supply ("we," "us," or "our") operates the website{' '}
                <a href="https://lldrestaurantsupply.com" className="text-blue-600 hover:underline">lldrestaurantsupply.com</a>{' '}
                and provides wholesale restaurant supply distribution services. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website, place orders, communicate with us via phone, SMS, or email, or otherwise interact with our services.
              </p>
              <p className="leading-relaxed mt-3">
                By using our website or services, you agree to the collection and use of information in accordance with this policy. If you do not agree with the terms of this Privacy Policy, please do not access our website or use our services.
              </p>
            </div>

            {/* Information We Collect */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Information We Collect</h2>
              <p className="leading-relaxed mb-4">
                We collect information that you provide directly to us, as well as information collected automatically when you use our services.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">Personal Information You Provide</h3>
              <p className="leading-relaxed mb-3">When you create an account, place an order, or contact us, we may collect:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Contact Information:</strong> Name, phone number, email address, and mailing/delivery address</li>
                <li><strong>Business Information:</strong> Business name, business type, tax ID or resale certificate number</li>
                <li><strong>Order Information:</strong> Order history, product preferences, delivery instructions</li>
                <li><strong>Payment Information:</strong> Credit card details, bank account information, billing address (processed securely through third-party payment processors)</li>
                <li><strong>Communication Records:</strong> Messages, emails, phone call records, and SMS/text message history</li>
                <li><strong>Account Credentials:</strong> Username and password for your online account</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Information Collected Automatically</h3>
              <p className="leading-relaxed mb-3">When you visit our website, we may automatically collect:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Device Information:</strong> IP address, browser type, operating system, device identifiers</li>
                <li><strong>Usage Data:</strong> Pages visited, time spent on pages, click patterns, referring URLs</li>
                <li><strong>Location Data:</strong> General geographic location based on IP address</li>
                <li><strong>Cookies and Tracking Technologies:</strong> Information collected through cookies, web beacons, and similar technologies</li>
              </ul>
            </div>

            {/* How We Use Your Information */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">How We Use Your Information</h2>
              <p className="leading-relaxed mb-3">We use the information we collect for the following purposes:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Order Processing:</strong> To process, fulfill, and manage your wholesale orders</li>
                <li><strong>Delivery and Shipping:</strong> To coordinate delivery logistics and provide shipping updates</li>
                <li><strong>Customer Service:</strong> To respond to your inquiries, provide support, and resolve issues</li>
                <li><strong>SMS/Text Notifications:</strong> To send order confirmations, payment links, delivery updates, and customer service messages (with your consent)</li>
                <li><strong>Payment Processing:</strong> To process payments and manage billing</li>
                <li><strong>Account Management:</strong> To create and manage your customer account</li>
                <li><strong>Communication:</strong> To send you important information about your orders, account, and our services</li>
                <li><strong>Improvement:</strong> To improve our website, products, and services</li>
                <li><strong>Legal Compliance:</strong> To comply with applicable laws, regulations, and legal processes</li>
              </ul>
            </div>

            {/* SMS/Text Messaging */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">SMS/Text Messaging Consent and Usage</h2>
              <p className="leading-relaxed mb-3">
                When you provide your phone number and consent to receive text messages from LLD Restaurant Supply, you agree to receive SMS/text messages related to your orders and account.
                You may opt in by submitting the web form at{' '}
                <Link to="/sms-opt-in" className="text-blue-600 hover:underline">lldrestaurantsupply.com/sms-opt-in</Link>,
                by providing consent at the point of sale, or by providing verbal or written consent to a sales representative.
                These messages may include:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Order confirmations and status updates</li>
                <li>Payment links and payment reminders</li>
                <li>Delivery notifications and tracking updates</li>
                <li>Customer service communications</li>
              </ul>
              <p className="leading-relaxed mt-3">
                <strong>Message Frequency:</strong> Message frequency varies based on your order activity and account interactions.
              </p>
              <p className="leading-relaxed mt-3">
                <strong>Message and Data Rates:</strong> Message and data rates may apply. Please contact your wireless carrier for details about your messaging plan.
              </p>
              <p className="leading-relaxed mt-3">
                <strong>Opt-Out:</strong> You may opt out of receiving SMS/text messages at any time by replying <strong>STOP</strong> to any message you receive from us. After opting out, you will receive a one-time confirmation message. You may also contact us directly to opt out.
              </p>
              <p className="leading-relaxed mt-3">
                <strong>Help:</strong> For help with our SMS messaging program, reply <strong>HELP</strong> to any message or contact us at{' '}
                <a href="tel:+17755915629" className="text-blue-600 hover:underline">(775) 591-5629</a> or{' '}
                <a href="mailto:kyu@lldrestaurantsupply.com" className="text-blue-600 hover:underline">kyu@lldrestaurantsupply.com</a>.
              </p>
              <p className="leading-relaxed mt-3">
                <strong>Data Sharing:</strong> We do not sell, rent, share, or loan your phone number or any personal information collected through our SMS messaging program to third parties for their marketing purposes. Information collected via SMS is used solely for the purposes described in this Privacy Policy (order processing, delivery updates, customer service, and account management). No SMS opt-in data or consent information is shared with any third parties.
              </p>
            </div>

            {/* Third-Party Services */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Third-Party Services</h2>
              <p className="leading-relaxed mb-3">
                We use the following third-party service providers to help us operate our business and deliver services to you:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Twilio:</strong> For SMS/text message delivery and communication services. Twilio processes your phone number and message content to deliver notifications. See{' '}
                  <a href="https://www.twilio.com/legal/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Twilio's Privacy Policy</a>.
                </li>
                <li><strong>ElevenLabs:</strong> For AI-powered voice services used in customer support. Voice interactions may be processed to provide automated assistance. See{' '}
                  <a href="https://elevenlabs.io/privacy-policy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">ElevenLabs' Privacy Policy</a>.
                </li>
                <li><strong>Payment Processors (Stripe):</strong> For secure credit card and payment processing. Payment information is handled directly by our payment processor and is not stored on our servers. See{' '}
                  <a href="https://stripe.com/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Stripe's Privacy Policy</a>.
                </li>
                <li><strong>Analytics Providers:</strong> We may use analytics services to understand how visitors use our website and improve our services.</li>
              </ul>
              <p className="leading-relaxed mt-3">
                These third-party providers have their own privacy policies governing the use of your information. We encourage you to review their policies.
              </p>
            </div>

            {/* Data Retention and Security */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Data Retention and Security</h2>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Data Retention</h3>
              <p className="leading-relaxed mb-3">
                We retain your personal information for as long as necessary to fulfill the purposes for which it was collected, including to satisfy any legal, accounting, or reporting requirements. Specifically:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Account information is retained for the duration of your active account and for a reasonable period thereafter</li>
                <li>Order and transaction records are retained for at least seven (7) years for tax and accounting purposes</li>
                <li>Communication records (including SMS) are retained for up to three (3) years</li>
                <li>Website usage data is retained for up to two (2) years</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Security</h3>
              <p className="leading-relaxed">
                We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. These measures include encryption of data in transit (SSL/TLS), secure server infrastructure, access controls, and regular security assessments. However, no method of transmission over the Internet or method of electronic storage is 100% secure, and we cannot guarantee absolute security.
              </p>
            </div>

            {/* Customer Rights */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Rights</h2>
              <p className="leading-relaxed mb-3">
                Depending on your location and applicable law, you may have the following rights regarding your personal information:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Right to Access:</strong> You may request a copy of the personal information we hold about you</li>
                <li><strong>Right to Correction:</strong> You may request that we correct any inaccurate or incomplete personal information</li>
                <li><strong>Right to Deletion:</strong> You may request that we delete your personal information, subject to certain exceptions (such as legal retention requirements)</li>
                <li><strong>Right to Opt-Out:</strong> You may opt out of receiving marketing communications or SMS messages at any time</li>
                <li><strong>Right to Data Portability:</strong> You may request your personal information in a structured, commonly used format</li>
              </ul>
              <p className="leading-relaxed mt-3">
                To exercise any of these rights, please contact us using the information provided in the "Contact Us" section below. We will respond to your request within 30 days.
              </p>
            </div>

            {/* CCPA / State Privacy Rights */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">California and State Privacy Rights</h2>
              <p className="leading-relaxed mb-3">
                If you are a California resident, the California Consumer Privacy Act (CCPA) and the California Privacy Rights Act (CPRA) provide you with additional rights regarding your personal information:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Right to Know:</strong> You have the right to request that we disclose the categories and specific pieces of personal information we have collected about you, the categories of sources from which we collected the information, the business purposes for collecting the information, and the categories of third parties with whom we share the information.</li>
                <li><strong>Right to Delete:</strong> You have the right to request the deletion of your personal information, subject to certain exceptions.</li>
                <li><strong>Right to Opt-Out of Sale:</strong> We do not sell your personal information. However, you have the right to opt out of any future sale of your personal information.</li>
                <li><strong>Right to Non-Discrimination:</strong> We will not discriminate against you for exercising any of your CCPA/CPRA rights.</li>
              </ul>
              <p className="leading-relaxed mt-3">
                Residents of other states with privacy laws (such as Virginia, Colorado, Connecticut, and others) may have similar rights. Please contact us to exercise your rights under applicable state privacy laws.
              </p>
              <p className="leading-relaxed mt-3">
                To submit a request, please contact us at{' '}
                <a href="mailto:kyu@lldrestaurantsupply.com" className="text-blue-600 hover:underline">kyu@lldrestaurantsupply.com</a>{' '}
                or call{' '}
                <a href="tel:+17755915629" className="text-blue-600 hover:underline">(775) 591-5629</a>.
                We may need to verify your identity before processing your request.
              </p>
            </div>

            {/* Cookie Policy */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Cookie Policy</h2>
              <p className="leading-relaxed mb-3">
                Our website uses cookies and similar tracking technologies to enhance your browsing experience and analyze website usage. Cookies are small text files stored on your device when you visit our website.
              </p>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Types of Cookies We Use</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Essential Cookies:</strong> Required for the website to function properly, including session management and authentication</li>
                <li><strong>Functional Cookies:</strong> Remember your preferences such as language settings and login information</li>
                <li><strong>Analytics Cookies:</strong> Help us understand how visitors interact with our website to improve functionality and content</li>
              </ul>
              <p className="leading-relaxed mt-3">
                You can control cookies through your browser settings. Most browsers allow you to block or delete cookies. However, disabling cookies may affect the functionality of our website.
              </p>
            </div>

            {/* Children's Privacy */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Children's Privacy</h2>
              <p className="leading-relaxed">
                Our website and services are intended for business use and are not directed at individuals under the age of 18. We do not knowingly collect personal information from children under 18. If we become aware that we have collected personal information from a child under 18, we will take steps to delete that information promptly.
              </p>
            </div>

            {/* Updates to This Policy */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Updates to This Privacy Policy</h2>
              <p className="leading-relaxed">
                We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors. When we make changes, we will update the "Last Updated" date at the top of this page. We encourage you to review this Privacy Policy periodically to stay informed about how we are protecting your information. Your continued use of our website and services after any changes to this Privacy Policy constitutes your acceptance of the updated policy.
              </p>
            </div>

            {/* Contact Us */}
            <div className="bg-gray-50 rounded-2xl p-8 mt-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Us</h2>
              <p className="leading-relaxed mb-4">
                If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Email</div>
                    <a href="mailto:kyu@lldrestaurantsupply.com" className="text-blue-600 hover:underline font-medium">kyu@lldrestaurantsupply.com</a>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Phone</div>
                    <a href="tel:+17755915629" className="text-blue-600 hover:underline font-medium">(775) 591-5629</a>
                  </div>
                </div>
              </div>
              <p className="leading-relaxed mt-4 text-sm text-gray-500">
                LLD Restaurant Supply<br />
                Chicago, Illinois<br />
                <a href="https://lldrestaurantsupply.com" className="text-blue-600 hover:underline">lldrestaurantsupply.com</a>
              </p>
            </div>

          </div>

          {/* Bottom Links */}
          <div className="mt-10 pt-6 border-t border-gray-200 flex flex-wrap gap-4 text-sm text-gray-500">
            <Link to="/terms" className="text-blue-600 hover:underline">Terms and Conditions</Link>
            <span>|</span>
            <Link to="/contact" className="text-blue-600 hover:underline">Contact Us</Link>
            <span>|</span>
            <Link to="/" className="text-blue-600 hover:underline">Home</Link>
          </div>

        </div>
      </section>
    </div>
  )
}

export default PrivacyPolicyPage
