import { Link } from 'react-router-dom'
import { FileText, Mail, Phone } from 'lucide-react'

const TermsPage = () => {
  return (
    <div className="min-h-screen bg-white">

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-700 to-blue-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center mb-4">
            <FileText className="w-12 h-12 text-blue-200" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Terms and Conditions</h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto">
            Please read these terms carefully before using our services.
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
                These Terms and Conditions ("Terms") govern your use of the website{' '}
                <a href="https://lldrestaurantsupply.com" className="text-blue-600 hover:underline">lldrestaurantsupply.com</a>{' '}
                and all related services provided by LLD Restaurant Supply ("we," "us," or "our"), a wholesale distributor of non-perishable restaurant supplies based in Chicago, Illinois.
              </p>
              <p className="leading-relaxed mt-3">
                By accessing our website, placing an order, or using any of our services (including SMS messaging), you agree to be bound by these Terms. If you do not agree to these Terms, please do not use our website or services.
              </p>
            </div>

            {/* SMS Messaging Program */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">SMS/Text Messaging Program</h2>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">LLD Restaurant Supply Alerts</h3>
                <p className="text-blue-800 leading-relaxed mb-4">
                  By opting in to our SMS messaging program, you consent to receive text messages from LLD Restaurant Supply at the phone number you provide. Your consent is not a condition of any purchase.
                </p>
                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-semibold text-blue-900">Program Name</div>
                    <div className="text-blue-700">LLD Restaurant Supply Alerts</div>
                  </div>
                  <div>
                    <div className="font-semibold text-blue-900">Message Frequency</div>
                    <div className="text-blue-700">Varies based on order activity</div>
                  </div>
                  <div>
                    <div className="font-semibold text-blue-900">Opt-Out</div>
                    <div className="text-blue-700">Reply STOP to any message</div>
                  </div>
                  <div>
                    <div className="font-semibold text-blue-900">Help</div>
                    <div className="text-blue-700">Reply HELP to any message</div>
                  </div>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">Message Types</h3>
              <p className="leading-relaxed mb-3">You may receive the following types of text messages:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Order Confirmations:</strong> Confirmation that your order has been received and is being processed</li>
                <li><strong>Payment Links:</strong> Secure links to complete payment for your orders</li>
                <li><strong>Delivery Updates:</strong> Notifications about your delivery status, including estimated delivery times and delivery confirmations</li>
                <li><strong>Customer Service:</strong> Responses to your inquiries and important account notifications</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Message Frequency</h3>
              <p className="leading-relaxed">
                Message frequency varies based on your order activity and account interactions. You may receive multiple messages per order (e.g., confirmation, payment, delivery updates). If you have no active orders, you will not receive messages.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Message and Data Rates</h3>
              <p className="leading-relaxed">
                Message and data rates may apply to any messages sent or received. Please contact your wireless carrier for details about your text messaging plan and any applicable charges. LLD Restaurant Supply is not responsible for any charges incurred by your wireless carrier.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Opt-In</h3>
              <p className="leading-relaxed">
                You may opt in to receive SMS messages by providing your phone number during account registration, order placement, or by contacting us directly. By providing your phone number and agreeing to receive messages, you expressly consent to receive recurring automated text messages from LLD Restaurant Supply.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Opt-Out</h3>
              <p className="leading-relaxed">
                You may opt out of receiving SMS messages at any time by replying <strong>STOP</strong> to any message you receive from us. After opting out, you will receive a one-time confirmation message confirming your unsubscription. You will no longer receive text messages from us unless you opt in again. Opting out of SMS messages will not affect your ability to place orders or use our other services.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Help</h3>
              <p className="leading-relaxed">
                For assistance with our SMS messaging program, reply <strong>HELP</strong> to any message or contact us at:
              </p>
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li>Phone: <a href="tel:+17755915629" className="text-blue-600 hover:underline">(775) 591-5629</a></li>
                <li>Email: <a href="mailto:kyu@lldrestaurantsupply.com" className="text-blue-600 hover:underline">kyu@lldrestaurantsupply.com</a></li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Supported Carriers</h3>
              <p className="leading-relaxed">
                Our SMS messaging program is supported by major U.S. wireless carriers. Carriers are not liable for delayed or undelivered messages.
              </p>
            </div>

            {/* Ordering Terms */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Ordering Terms</h2>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Wholesale Orders</h3>
              <p className="leading-relaxed mb-3">
                LLD Restaurant Supply is a wholesale distributor serving restaurants, food service businesses, and commercial establishments. By placing an order, you represent that you are purchasing products for business use.
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Minimum Order Quantities (MOQ):</strong> Certain products may have minimum order quantities. MOQ requirements will be clearly indicated on product listings or communicated at the time of order.</li>
                <li><strong>Pricing:</strong> All prices are listed in U.S. dollars and are subject to change without notice. Prices displayed on the website are wholesale prices intended for business customers.</li>
                <li><strong>Order Acceptance:</strong> All orders are subject to acceptance by LLD Restaurant Supply. We reserve the right to refuse or cancel any order for any reason, including product availability, pricing errors, or suspected fraudulent activity.</li>
                <li><strong>Product Availability:</strong> While we strive to maintain accurate inventory levels, product availability is subject to change. If a product becomes unavailable after you place an order, we will notify you and offer alternatives or a refund.</li>
              </ul>
            </div>

            {/* Payment Terms */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Payment Terms</h2>
              <p className="leading-relaxed mb-3">We accept the following payment methods:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Credit Card:</strong> We accept major credit cards (Visa, Mastercard, American Express, Discover) processed securely through Stripe.</li>
                <li><strong>Check:</strong> We accept business checks. Orders paid by check will be processed after the check has cleared.</li>
                <li><strong>Net 30 Terms:</strong> Approved business accounts may qualify for Net 30 payment terms. Net 30 terms are available at our sole discretion and require a credit application and approval process. Invoices on Net 30 terms are due within 30 days of the invoice date. Late payments may be subject to a late fee of 1.5% per month on the outstanding balance.</li>
              </ul>
              <p className="leading-relaxed mt-3">
                All payments are due in U.S. dollars. We reserve the right to modify payment terms or revoke credit terms at any time.
              </p>
            </div>

            {/* Delivery and Shipping */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Delivery and Shipping</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Delivery Area:</strong> We deliver to restaurants and businesses. Delivery availability and fees may vary by location.</li>
                <li><strong>Free Delivery:</strong> Free delivery may be available on qualifying orders. Minimum order amounts for free delivery will be communicated at the time of order.</li>
                <li><strong>Delivery Times:</strong> Estimated delivery times are provided at the time of order and are not guaranteed. Delivery times may be affected by product availability, weather, traffic, and other factors beyond our control.</li>
                <li><strong>Inspection Upon Delivery:</strong> You are responsible for inspecting all products upon delivery. Any damage, shortages, or discrepancies must be reported to us within 24 hours of delivery.</li>
                <li><strong>Risk of Loss:</strong> Risk of loss and title for products pass to you upon delivery to the specified delivery address.</li>
              </ul>
            </div>

            {/* Returns and Refunds */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Returns and Refunds</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Damaged or Defective Products:</strong> If you receive damaged or defective products, please contact us within 24 hours of delivery. We will arrange for a replacement or issue a refund at our discretion.</li>
                <li><strong>Incorrect Orders:</strong> If you receive incorrect products, please contact us within 24 hours. We will arrange for the correct products to be delivered and for the incorrect products to be returned.</li>
                <li><strong>Change of Mind:</strong> Due to the nature of our wholesale business, we generally do not accept returns for change of mind. Exceptions may be made on a case-by-case basis at our sole discretion.</li>
                <li><strong>Refund Processing:</strong> Approved refunds will be processed within 7–10 business days using the original payment method. For Net 30 accounts, refunds will be applied as a credit to your account.</li>
                <li><strong>Restocking Fee:</strong> A restocking fee of up to 15% may apply to approved returns that are not due to damage, defect, or our error.</li>
              </ul>
            </div>

            {/* Intellectual Property */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Intellectual Property</h2>
              <p className="leading-relaxed">
                All content on our website, including text, images, logos, graphics, and software, is the property of LLD Restaurant Supply or its licensors and is protected by copyright, trademark, and other intellectual property laws. You may not reproduce, distribute, modify, or create derivative works from any content on our website without our prior written consent.
              </p>
            </div>

            {/* Limitation of Liability */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Limitation of Liability</h2>
              <p className="leading-relaxed mb-3">
                TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>LLD Restaurant Supply provides its website and services on an "AS IS" and "AS AVAILABLE" basis without warranties of any kind, either express or implied.</li>
                <li>We do not warrant that our website will be uninterrupted, error-free, or free of viruses or other harmful components.</li>
                <li>In no event shall LLD Restaurant Supply, its owners, officers, employees, or agents be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of our website or services.</li>
                <li>Our total liability for any claim arising out of or related to these Terms or our services shall not exceed the amount you paid to us for the specific order or service giving rise to the claim.</li>
              </ul>
            </div>

            {/* Indemnification */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Indemnification</h2>
              <p className="leading-relaxed">
                You agree to indemnify, defend, and hold harmless LLD Restaurant Supply, its owners, officers, employees, and agents from and against any and all claims, liabilities, damages, losses, costs, and expenses (including reasonable attorneys' fees) arising out of or related to your use of our website or services, your violation of these Terms, or your violation of any rights of a third party.
              </p>
            </div>

            {/* Governing Law */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Governing Law and Dispute Resolution</h2>
              <p className="leading-relaxed mb-3">
                These Terms shall be governed by and construed in accordance with the laws of the State of Illinois, without regard to its conflict of law provisions.
              </p>
              <p className="leading-relaxed">
                Any dispute arising out of or related to these Terms or our services shall be resolved through good-faith negotiation between the parties. If the dispute cannot be resolved through negotiation, either party may pursue resolution through the courts of competent jurisdiction in Cook County, Illinois.
              </p>
            </div>

            {/* Severability */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Severability</h2>
              <p className="leading-relaxed">
                If any provision of these Terms is found to be invalid, illegal, or unenforceable by a court of competent jurisdiction, the remaining provisions shall continue in full force and effect. The invalid provision shall be modified to the minimum extent necessary to make it valid and enforceable.
              </p>
            </div>

            {/* Changes to Terms */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Changes to These Terms</h2>
              <p className="leading-relaxed">
                We reserve the right to modify these Terms at any time. When we make changes, we will update the "Last Updated" date at the top of this page. Your continued use of our website and services after any changes constitutes your acceptance of the updated Terms. We encourage you to review these Terms periodically.
              </p>
            </div>

            {/* Contact Us */}
            <div className="bg-gray-50 rounded-2xl p-8 mt-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Us</h2>
              <p className="leading-relaxed mb-4">
                If you have any questions about these Terms and Conditions, please contact us:
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
            <Link to="/privacy-policy" className="text-blue-600 hover:underline">Privacy Policy</Link>
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

export default TermsPage
