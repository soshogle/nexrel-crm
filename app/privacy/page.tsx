'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import MainNavigation from '@/components/landing/main-navigation';
import { Shield, ArrowLeft } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-black">
      <MainNavigation />
      
      <div className="max-w-4xl mx-auto px-6 py-24 lg:px-8">
        {/* Back Button */}
        <Link href="/">
          <Button variant="ghost" className="mb-8">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        {/* Header */}
        <div className="mb-12 text-center">
          <div className="flex justify-center mb-6">
            <Shield className="h-16 w-16 text-purple-500" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">Privacy Policy</span>
          </h1>
          <p className="text-gray-400 text-lg">Last Updated: November 26, 2025</p>
        </div>

        {/* Content */}
        <div className="prose prose-invert prose-purple max-w-none">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 space-y-8">
            
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">1. Introduction</h2>
              <p className="text-gray-300 leading-relaxed">
                Soshogle ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI-powered CRM platform and services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">2. Information We Collect</h2>
              
              <h3 className="text-xl font-semibold text-purple-400 mb-3 mt-6">2.1 Information You Provide</h3>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li><strong>Account Information:</strong> Name, email address, phone number, business name, and password</li>
                <li><strong>Business Data:</strong> Customer contacts, leads, deals, appointments, and communication history</li>
                <li><strong>Payment Information:</strong> Billing address and payment method details (processed securely through third-party payment processors)</li>
                <li><strong>Communications:</strong> Emails, SMS messages, call recordings, and transcripts when you use our platform</li>
              </ul>

              <h3 className="text-xl font-semibold text-purple-400 mb-3 mt-6">2.2 Information We Collect Automatically</h3>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li><strong>Usage Data:</strong> Features used, pages visited, time spent, and interaction patterns</li>
                <li><strong>Device Information:</strong> IP address, browser type, device type, and operating system</li>
                <li><strong>Cookies and Similar Technologies:</strong> Session data and preferences</li>
              </ul>

              <h3 className="text-xl font-semibold text-purple-400 mb-3 mt-6">2.3 Third-Party Integrations</h3>
              <p className="text-gray-300 leading-relaxed">
                When you connect third-party services (Gmail, Google Calendar, Twilio, ElevenLabs), we collect data necessary for these integrations to function, in accordance with their respective privacy policies.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">3. How We Use Your Information</h2>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>Provide, maintain, and improve our CRM services</li>
                <li>Process transactions and send transaction notifications</li>
                <li>Enable AI-powered voice agents, chat assistants, and automation</li>
                <li>Analyze usage patterns to enhance user experience</li>
                <li>Send administrative information, updates, and security alerts</li>
                <li>Respond to customer support requests</li>
                <li>Comply with legal obligations and enforce our terms</li>
                <li>Prevent fraud and ensure platform security</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">4. AI and Data Processing</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                Our platform uses artificial intelligence for various features including:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li><strong>Voice AI Agents:</strong> Process call audio and generate transcripts using ElevenLabs</li>
                <li><strong>Chat Assistant:</strong> Analyze conversations to provide intelligent responses</li>
                <li><strong>Task Automation:</strong> Suggest tasks, categorize activities, and optimize workflows</li>
                <li><strong>Campaign Generation:</strong> Create personalized marketing content</li>
              </ul>
              <p className="text-gray-300 leading-relaxed mt-4">
                All AI processing is conducted securely, and we do not use your data to train third-party AI models without your explicit consent.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">5. Data Sharing and Disclosure</h2>
              
              <h3 className="text-xl font-semibold text-purple-400 mb-3 mt-6">We may share your information with:</h3>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li><strong>Service Providers:</strong> Twilio (phone/SMS), ElevenLabs (voice AI), Google (email/calendar), Stripe (payments), AWS (cloud storage)</li>
                <li><strong>Business Transfers:</strong> In connection with mergers, acquisitions, or asset sales</li>
                <li><strong>Legal Requirements:</strong> When required by law, court order, or to protect our rights</li>
                <li><strong>With Your Consent:</strong> When you explicitly authorize data sharing</li>
              </ul>
              
              <p className="text-gray-300 leading-relaxed mt-4">
                We <strong>never</strong> sell your personal information to third parties for marketing purposes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">6. Data Security</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                We implement industry-standard security measures to protect your data:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>Encryption in transit (TLS/SSL) and at rest</li>
                <li>Secure authentication with NextAuth.js</li>
                <li>Regular security audits and vulnerability assessments</li>
                <li>Access controls and role-based permissions</li>
                <li>Secure cloud infrastructure with AWS</li>
              </ul>
              <p className="text-gray-300 leading-relaxed mt-4">
                However, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security but continuously work to enhance our security practices.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">7. Data Retention</h2>
              <p className="text-gray-300 leading-relaxed">
                We retain your data for as long as your account is active or as needed to provide services. When you delete your account, we will delete or anonymize your data within 90 days, except where retention is required by law or for legitimate business purposes (e.g., resolving disputes, enforcing agreements).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">8. Your Rights and Choices</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                Depending on your location, you may have the following rights:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                <li><strong>Deletion:</strong> Request deletion of your data (subject to legal obligations)</li>
                <li><strong>Portability:</strong> Receive your data in a structured, machine-readable format</li>
                <li><strong>Opt-Out:</strong> Unsubscribe from marketing communications</li>
                <li><strong>Restriction:</strong> Request limitation of data processing</li>
              </ul>
              <p className="text-gray-300 leading-relaxed mt-4">
                To exercise these rights, contact us at <a href="mailto:privacy@soshogle.com" className="text-purple-400 hover:text-purple-300">privacy@soshogle.com</a>
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">9. Cookies and Tracking Technologies</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                We use cookies and similar technologies for:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li><strong>Essential Cookies:</strong> Required for platform functionality and authentication</li>
                <li><strong>Analytics Cookies:</strong> Track usage patterns to improve our services</li>
                <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
              </ul>
              <p className="text-gray-300 leading-relaxed mt-4">
                You can control cookies through your browser settings. Disabling essential cookies may affect platform functionality.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">10. Children's Privacy</h2>
              <p className="text-gray-300 leading-relaxed">
                Our services are not intended for individuals under 18 years of age. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">11. International Data Transfers</h2>
              <p className="text-gray-300 leading-relaxed">
                Your data may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place, such as Standard Contractual Clauses, to protect your data during international transfers.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">12. California Privacy Rights (CCPA)</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                If you are a California resident, you have additional rights under the California Consumer Privacy Act:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>Right to know what personal information is collected, used, shared, or sold</li>
                <li>Right to delete personal information</li>
                <li>Right to opt-out of the sale of personal information (we do not sell your data)</li>
                <li>Right to non-discrimination for exercising your privacy rights</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">13. European Privacy Rights (GDPR)</h2>
              <p className="text-gray-300 leading-relaxed">
                If you are in the European Economic Area (EEA), you have rights under the General Data Protection Regulation (GDPR), including the right to lodge a complaint with your local data protection authority.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">14. Changes to This Privacy Policy</h2>
              <p className="text-gray-300 leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of material changes by email or through a prominent notice on our platform. Your continued use of our services after changes constitutes acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">15. Contact Us</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                If you have questions or concerns about this Privacy Policy, please contact us:
              </p>
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                <p className="text-gray-300"><strong>Email:</strong> <a href="mailto:privacy@soshogle.com" className="text-purple-400 hover:text-purple-300">privacy@soshogle.com</a></p>
                <p className="text-gray-300 mt-2"><strong>Website:</strong> <a href="https://soshogleagents.com" className="text-purple-400 hover:text-purple-300">soshogleagents.com</a></p>
              </div>
            </section>

          </div>
        </div>

        {/* Back to Top */}
        <div className="mt-12 text-center">
          <Link href="/">
            <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
