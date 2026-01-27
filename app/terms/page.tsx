'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import MainNavigation from '@/components/landing/main-navigation';
import { FileText, ArrowLeft } from 'lucide-react';

export default function TermsOfServicePage() {
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
            <FileText className="h-16 w-16 text-purple-500" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">Terms of Service</span>
          </h1>
          <p className="text-gray-400 text-lg">Last Updated: November 26, 2025</p>
        </div>

        {/* Content */}
        <div className="prose prose-invert prose-purple max-w-none">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 space-y-8">
            
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">1. Agreement to Terms</h2>
              <p className="text-gray-300 leading-relaxed">
                By accessing or using Soshogle's AI-powered CRM platform (the "Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not access or use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">2. Description of Service</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                Soshogle provides an AI-powered customer relationship management (CRM) platform that includes:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>Contact and lead management</li>
                <li>Voice AI agents for inbound and outbound calls</li>
                <li>Unified messaging (SMS, Email, Chat)</li>
                <li>Calendar and appointment scheduling</li>
                <li>Task management and automation</li>
                <li>Marketing campaigns and analytics</li>
                <li>Integrations with third-party services (Gmail, Google Calendar, Twilio, ElevenLabs, Stripe)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">3. User Accounts</h2>
              
              <h3 className="text-xl font-semibold text-purple-400 mb-3 mt-6">3.1 Account Registration</h3>
              <p className="text-gray-300 leading-relaxed">
                To use the Service, you must create an account by providing accurate and complete information. You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account.
              </p>

              <h3 className="text-xl font-semibold text-purple-400 mb-3 mt-6">3.2 Account Security</h3>
              <p className="text-gray-300 leading-relaxed">
                You must notify us immediately of any unauthorized use of your account or any other security breach. We are not liable for any loss or damage arising from your failure to maintain account security.
              </p>

              <h3 className="text-xl font-semibold text-purple-400 mb-3 mt-6">3.3 Account Eligibility</h3>
              <p className="text-gray-300 leading-relaxed">
                You must be at least 18 years old and have the legal capacity to enter into contracts to use the Service. By creating an account, you represent and warrant that you meet these requirements.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">4. Acceptable Use Policy</h2>
              
              <h3 className="text-xl font-semibold text-purple-400 mb-3 mt-6">You agree NOT to:</h3>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>Use the Service for any illegal purpose or in violation of any laws</li>
                <li>Violate the privacy rights of others or harvest personal information</li>
                <li>Send spam, unsolicited communications, or engage in phishing</li>
                <li>Transmit viruses, malware, or other harmful code</li>
                <li>Attempt to gain unauthorized access to our systems or other users' accounts</li>
                <li>Interfere with or disrupt the Service or servers</li>
                <li>Reverse engineer, decompile, or disassemble the Service</li>
                <li>Use the Service to compete with us or create a similar product</li>
                <li>Remove or alter any proprietary notices or labels</li>
                <li>Violate any third-party terms (e.g., Twilio, ElevenLabs, Google, Stripe)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">5. Intellectual Property Rights</h2>
              
              <h3 className="text-xl font-semibold text-purple-400 mb-3 mt-6">5.1 Soshogle's IP</h3>
              <p className="text-gray-300 leading-relaxed">
                The Service, including all software, technology, algorithms, user interfaces, and content (excluding user-generated content), is protected by 3 US Patents and other intellectual property rights owned by Soshogle. You are granted a limited, non-exclusive, non-transferable license to use the Service solely for your internal business purposes.
              </p>

              <h3 className="text-xl font-semibold text-purple-400 mb-3 mt-6">5.2 User Content</h3>
              <p className="text-gray-300 leading-relaxed">
                You retain ownership of all content you submit to the Service ("User Content"). By submitting User Content, you grant Soshogle a worldwide, non-exclusive, royalty-free license to use, store, display, reproduce, and process your User Content solely to provide and improve the Service.
              </p>

              <h3 className="text-xl font-semibold text-purple-400 mb-3 mt-6">5.3 Patented Technology</h3>
              <p className="text-gray-300 leading-relaxed">
                Our AI learning systems, conversational AI technology, and automation engine are protected by 3 US Patents. Any unauthorized use, reproduction, or distribution of our patented technology is strictly prohibited.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">6. Payment and Billing</h2>
              
              <h3 className="text-xl font-semibold text-purple-400 mb-3 mt-6">6.1 Fees</h3>
              <p className="text-gray-300 leading-relaxed">
                Use of the Service may require payment of subscription fees and usage-based charges (e.g., phone calls, SMS, AI tokens). Current pricing is available on our website and may be updated with notice.
              </p>

              <h3 className="text-xl font-semibold text-purple-400 mb-3 mt-6">6.2 Billing</h3>
              <p className="text-gray-300 leading-relaxed">
                You authorize us to charge your payment method on a recurring basis for subscription fees and usage charges. All fees are non-refundable unless otherwise stated or required by law.
              </p>

              <h3 className="text-xl font-semibold text-purple-400 mb-3 mt-6">6.3 Overdue Payments</h3>
              <p className="text-gray-300 leading-relaxed">
                If payment is overdue, we may suspend or terminate your access to the Service until payment is received. You are responsible for any collection costs or legal fees incurred.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">7. Third-Party Services</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                The Service integrates with third-party services including:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li><strong>Twilio:</strong> Phone and SMS services</li>
                <li><strong>ElevenLabs:</strong> Voice AI and conversational agents</li>
                <li><strong>Google:</strong> Gmail and Google Calendar integration</li>
                <li><strong>Stripe:</strong> Payment processing</li>
                <li><strong>AWS:</strong> Cloud storage and infrastructure</li>
              </ul>
              <p className="text-gray-300 leading-relaxed mt-4">
                Your use of these third-party services is subject to their respective terms and privacy policies. We are not responsible for the availability, performance, or security of third-party services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">8. AI and Automated Processing</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                Our Service uses artificial intelligence for:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>Voice AI agents that conduct phone conversations</li>
                <li>AI chat assistants for customer support</li>
                <li>Automated task suggestions and categorization</li>
                <li>Campaign content generation</li>
                <li>Predictive analytics and insights</li>
              </ul>
              <p className="text-gray-300 leading-relaxed mt-4">
                You acknowledge that AI-generated content may not always be accurate and should be reviewed before use. You are responsible for ensuring compliance with applicable laws when using AI features.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">9. Data Privacy and Security</h2>
              <p className="text-gray-300 leading-relaxed">
                Your use of the Service is also governed by our <Link href="/privacy" className="text-purple-400 hover:text-purple-300">Privacy Policy</Link>. We implement industry-standard security measures to protect your data, but we cannot guarantee absolute security. You are responsible for maintaining backups of your critical data.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">10. Service Availability and Support</h2>
              
              <h3 className="text-xl font-semibold text-purple-400 mb-3 mt-6">10.1 Uptime</h3>
              <p className="text-gray-300 leading-relaxed">
                We strive to maintain 99.9% uptime for the Service, but we do not guarantee uninterrupted or error-free access. Scheduled maintenance will be communicated in advance when possible.
              </p>

              <h3 className="text-xl font-semibold text-purple-400 mb-3 mt-6">10.2 Support</h3>
              <p className="text-gray-300 leading-relaxed">
                Support is available via email at <a href="mailto:support@abacus.ai" className="text-purple-400 hover:text-purple-300">support@abacus.ai</a>. Response times vary based on your subscription plan.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">11. Term and Termination</h2>
              
              <h3 className="text-xl font-semibold text-purple-400 mb-3 mt-6">11.1 Term</h3>
              <p className="text-gray-300 leading-relaxed">
                These Terms remain in effect while you use the Service. Subscription plans continue until cancelled by you or terminated by us.
              </p>

              <h3 className="text-xl font-semibold text-purple-400 mb-3 mt-6">11.2 Termination by You</h3>
              <p className="text-gray-300 leading-relaxed">
                You may terminate your account at any time through the settings page or by contacting support. Termination does not entitle you to a refund of prepaid fees.
              </p>

              <h3 className="text-xl font-semibold text-purple-400 mb-3 mt-6">11.3 Termination by Us</h3>
              <p className="text-gray-300 leading-relaxed">
                We may suspend or terminate your account immediately if you violate these Terms, engage in fraudulent activity, or fail to pay fees. We will provide notice when reasonably possible.
              </p>

              <h3 className="text-xl font-semibold text-purple-400 mb-3 mt-6">11.4 Effect of Termination</h3>
              <p className="text-gray-300 leading-relaxed">
                Upon termination, your right to use the Service ceases immediately. We will delete or anonymize your data within 90 days, except where retention is required by law. You may request an export of your data before termination.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">12. Disclaimers and Limitations of Liability</h2>
              
              <h3 className="text-xl font-semibold text-purple-400 mb-3 mt-6">12.1 Disclaimer of Warranties</h3>
              <p className="text-gray-300 leading-relaxed">
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE.
              </p>

              <h3 className="text-xl font-semibold text-purple-400 mb-3 mt-6">12.2 Limitation of Liability</h3>
              <p className="text-gray-300 leading-relaxed">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, SOSHOGLE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, DATA, OR USE, ARISING OUT OF OR RELATED TO THESE TERMS OR THE SERVICE. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT PAID BY YOU IN THE 12 MONTHS PRECEDING THE CLAIM.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">13. Indemnification</h2>
              <p className="text-gray-300 leading-relaxed">
                You agree to indemnify, defend, and hold harmless Soshogle and its officers, directors, employees, and agents from any claims, liabilities, damages, losses, and expenses (including legal fees) arising out of or related to your use of the Service, violation of these Terms, or infringement of any rights of a third party.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">14. Dispute Resolution</h2>
              
              <h3 className="text-xl font-semibold text-purple-400 mb-3 mt-6">14.1 Informal Resolution</h3>
              <p className="text-gray-300 leading-relaxed">
                Before filing a claim, you agree to contact us at <a href="mailto:legal@soshogle.com" className="text-purple-400 hover:text-purple-300">legal@soshogle.com</a> to attempt to resolve the dispute informally for at least 30 days.
              </p>

              <h3 className="text-xl font-semibold text-purple-400 mb-3 mt-6">14.2 Arbitration</h3>
              <p className="text-gray-300 leading-relaxed">
                Any dispute that cannot be resolved informally shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association. Arbitration shall take place in the United States. You waive your right to a jury trial or to participate in a class action.
              </p>

              <h3 className="text-xl font-semibold text-purple-400 mb-3 mt-6">14.3 Exceptions</h3>
              <p className="text-gray-300 leading-relaxed">
                Either party may seek injunctive relief or other equitable remedies in court to protect intellectual property rights.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">15. Governing Law</h2>
              <p className="text-gray-300 leading-relaxed">
                These Terms are governed by the laws of the United States and the State of California, without regard to conflict of law principles. Any legal action must be brought in the federal or state courts located in San Francisco, California.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">16. Changes to Terms</h2>
              <p className="text-gray-300 leading-relaxed">
                We may modify these Terms at any time. We will provide notice of material changes by email or through the Service. Your continued use after changes constitutes acceptance. If you do not agree to the modified Terms, you must stop using the Service and terminate your account.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">17. Miscellaneous</h2>
              
              <h3 className="text-xl font-semibold text-purple-400 mb-3 mt-6">17.1 Entire Agreement</h3>
              <p className="text-gray-300 leading-relaxed">
                These Terms, together with our Privacy Policy, constitute the entire agreement between you and Soshogle regarding the Service.
              </p>

              <h3 className="text-xl font-semibold text-purple-400 mb-3 mt-6">17.2 Severability</h3>
              <p className="text-gray-300 leading-relaxed">
                If any provision of these Terms is found to be unenforceable, the remaining provisions will remain in full force and effect.
              </p>

              <h3 className="text-xl font-semibold text-purple-400 mb-3 mt-6">17.3 Waiver</h3>
              <p className="text-gray-300 leading-relaxed">
                Our failure to enforce any right or provision of these Terms does not constitute a waiver of that right or provision.
              </p>

              <h3 className="text-xl font-semibold text-purple-400 mb-3 mt-6">17.4 Assignment</h3>
              <p className="text-gray-300 leading-relaxed">
                You may not assign or transfer these Terms or your account without our prior written consent. We may assign these Terms without restriction.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">18. Contact Information</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                If you have questions about these Terms, please contact us:
              </p>
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                <p className="text-gray-300"><strong>Email:</strong> <a href="mailto:legal@soshogle.com" className="text-purple-400 hover:text-purple-300">legal@soshogle.com</a></p>
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
