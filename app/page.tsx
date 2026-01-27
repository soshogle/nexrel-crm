
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import MainNavigation from '@/components/landing/main-navigation';
import { 
  Zap, 
  Brain, 
  Users, 
  MessageSquare, 
  Phone, 
  BarChart, 
  Shield, 
  Rocket,
  TrendingUp,
  DollarSign,
  Clock,
  Award
} from 'lucide-react';

function HomePage() {
  return (
    <div className="min-h-screen bg-black">
      <MainNavigation />
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-pink-900/20" />
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full filter blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-600/10 rounded-full filter blur-3xl animate-pulse delay-1000" />
        </div>
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-32 text-center">
          <div className="mb-6 flex items-center justify-center gap-2">
            <Award className="h-6 w-6 text-yellow-500" />
            <span className="text-sm font-semibold text-gray-300">Protected by 3 US Patents</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="gradient-text">Transform Your Business</span>
            <br />
            <span className="text-white">With AI-Powered CRM</span>
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Operate like a Fortune 500 company without the costs. Our patented AI technology helps you capture more leads, close more deals, and maximize customer lifetime value.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link href="/contact">
              <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-lg px-8">
                Book a Demo
                <Rocket className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/features">
              <Button size="lg" variant="outline" className="text-lg px-8 border-gray-700 hover:bg-gray-800">
                Explore Features
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold gradient-text mb-1">90,000+</div>
              <div className="text-sm text-gray-400">Businesses Trust Us</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold gradient-text mb-1">200x</div>
              <div className="text-sm text-gray-400">Call Capacity</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold gradient-text mb-1">36hrs</div>
              <div className="text-sm text-gray-400">To Go Live</div>
            </div>
          </div>
        </div>
      </section>

      {/* ROI Section */}
      <section className="py-24 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="gradient-text">Explosive ROI</span> for Your Business
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Our AI-powered platform delivers measurable results that transform your bottom line
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6 bg-gray-900 border-gray-800 hover:border-purple-500/50 transition-all">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-green-500/10 mb-4">
                <TrendingUp className="h-6 w-6 text-green-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">3x Revenue</h3>
              <p className="text-gray-400">Average revenue increase within 12 months of implementation</p>
            </Card>
            <Card className="p-6 bg-gray-900 border-gray-800 hover:border-purple-500/50 transition-all">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-purple-500/10 mb-4">
                <DollarSign className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">67% Savings</h3>
              <p className="text-gray-400">Reduction in operational costs compared to traditional systems</p>
            </Card>
            <Card className="p-6 bg-gray-900 border-gray-800 hover:border-purple-500/50 transition-all">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-blue-500/10 mb-4">
                <Clock className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">85% Time Saved</h3>
              <p className="text-gray-400">Automation eliminates manual tasks and streamlines workflows</p>
            </Card>
            <Card className="p-6 bg-gray-900 border-gray-800 hover:border-purple-500/50 transition-all">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-pink-500/10 mb-4">
                <Users className="h-6 w-6 text-pink-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">10x Leads</h3>
              <p className="text-gray-400">Capture and convert more leads with AI-powered automation</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Patents Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Shield className="h-8 w-8 text-yellow-500" />
              <h2 className="text-4xl md:text-5xl font-bold">
                <span className="gradient-text">Protected Innovation</span>
              </h2>
            </div>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Our technology is backed by 3 United States patents, ensuring you have access to cutting-edge, legally protected innovations
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="p-8 bg-gradient-to-br from-purple-900/20 to-gray-900 border-gray-800">
              <div className="text-center mb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-500/10 mb-4">
                  <Brain className="h-8 w-8 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">AI Learning Systems</h3>
              </div>
              <p className="text-gray-400 text-center">
                Patented adaptive learning algorithms that understand your business context and continuously improve performance
              </p>
            </Card>
            <Card className="p-8 bg-gradient-to-br from-pink-900/20 to-gray-900 border-gray-800">
              <div className="text-center mb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pink-500/10 mb-4">
                  <MessageSquare className="h-8 w-8 text-pink-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Conversational AI</h3>
              </div>
              <p className="text-gray-400 text-center">
                Proprietary natural language processing that enables human-like interactions across 30+ languages
              </p>
            </Card>
            <Card className="p-8 bg-gradient-to-br from-blue-900/20 to-gray-900 border-gray-800">
              <div className="text-center mb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/10 mb-4">
                  <Zap className="h-8 w-8 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Automation Engine</h3>
              </div>
              <p className="text-gray-400 text-center">
                Patented workflow automation that handles up to 200 customer interactions per minute without human intervention
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Preview */}
      <section className="py-24 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="text-white">Everything You Need to</span>
              <br />
              <span className="gradient-text">Scale Your Business</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Phone, title: 'AI Voice Agents', desc: 'Handle 200 calls per minute with human-like AI staff' },
              { icon: MessageSquare, title: 'Unified Messaging', desc: 'SMS, email, social media in one inbox' },
              { icon: Users, title: 'CRM & Pipeline', desc: 'Manage leads, deals, and customer relationships' },
              { icon: BarChart, title: 'Analytics & Reports', desc: 'Real-time insights and performance metrics' },
              { icon: Zap, title: 'Marketing Automation', desc: 'Automated campaigns, funnels, and workflows' },
              { icon: Brain, title: 'AI Assistant', desc: 'Intelligent copilot trained on your business data' },
            ].map((feature, index) => (
              <Card key={index} className="p-6 bg-gray-900 border-gray-800 hover:border-purple-500/50 transition-all group cursor-pointer">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-purple-500/10 group-hover:bg-purple-500/20 mb-4 transition-all">
                  <feature.icon className="h-6 w-6 text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.desc}</p>
              </Card>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link href="/features">
              <Button size="lg" variant="outline" className="border-gray-700 hover:bg-gray-800">
                View All Features
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-black to-pink-900/30" />
        <div className="relative max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="gradient-text">Ready to Transform</span>
            <br />
            <span className="text-white">Your Business?</span>
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join 90,000+ businesses already using our patented AI platform
          </p>
          <Link href="/contact">
            <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-lg px-12">
              Book Your Demo Today
              <Rocket className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800 mt-24">
        <div className="max-w-7xl mx-auto px-6 py-12 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <h3 className="text-xl font-bold gradient-text mb-4">Soshogle</h3>
              <p className="text-gray-400 mb-4">
                AI-powered CRM that helps businesses operate like large corporations without the costs. Transform your sales, marketing, and customer relationships with our patented technology.
              </p>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>🏆 3 US Patents</span>
                <span>•</span>
                <span>🚀 90,000+ Businesses</span>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Solutions</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/solutions" className="hover:text-purple-400">View All Solutions</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/about" className="hover:text-purple-400">About Us</Link></li>
                <li><Link href="/contact" className="hover:text-purple-400">Contact</Link></li>
                <li><Link href="/auth/signin" className="hover:text-purple-400">Sign In</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-gray-500 text-sm">
              <p>&copy; 2025 Soshogle. All rights reserved. Protected by 3 US Patents.</p>
              <div className="flex gap-6">
                <Link href="/privacy" className="hover:text-purple-400 transition-colors">
                  Privacy Policy
                </Link>
                <Link href="/terms" className="hover:text-purple-400 transition-colors">
                  Terms of Service
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;
