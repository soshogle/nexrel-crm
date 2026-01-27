
'use client';

import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  Award, 
  Target, 
  Users, 
  Rocket,
  Shield,
  Brain,
  TrendingUp,
  Globe
} from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="bg-black min-h-screen py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-20">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="text-white">Empowering Businesses</span>
            <br />
            <span className="gradient-text">With Patented AI Technology</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            We're on a mission to help small and medium businesses operate like Fortune 500 companies—without the costs
          </p>
        </div>

        {/* Mission & Vision */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
          <Card className="p-8 bg-gradient-to-br from-purple-900/20 to-gray-900 border-gray-800">
            <div className="flex items-center justify-center w-14 h-14 rounded-lg bg-purple-500/10 mb-6">
              <Target className="h-7 w-7 text-purple-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Our Mission</h2>
            <p className="text-gray-400 text-lg">
              To democratize access to enterprise-grade AI technology, enabling businesses of all sizes to scale rapidly, increase margins, and reduce costs through intelligent automation.
            </p>
          </Card>
          <Card className="p-8 bg-gradient-to-br from-pink-900/20 to-gray-900 border-gray-800">
            <div className="flex items-center justify-center w-14 h-14 rounded-lg bg-pink-500/10 mb-6">
              <Rocket className="h-7 w-7 text-pink-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Our Vision</h2>
            <p className="text-gray-400 text-lg">
              A world where every business has access to AI-powered tools that eliminate missed opportunities, prevent revenue loss, and drive explosive growth through intelligent automation.
            </p>
          </Card>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20">
          <div className="text-center p-6">
            <div className="text-4xl font-bold gradient-text mb-2">90,000+</div>
            <div className="text-gray-400">Businesses Served</div>
          </div>
          <div className="text-center p-6">
            <div className="text-4xl font-bold gradient-text mb-2">3</div>
            <div className="text-gray-400">US Patents</div>
          </div>
          <div className="text-center p-6">
            <div className="text-4xl font-bold gradient-text mb-2">30+</div>
            <div className="text-gray-400">Languages Supported</div>
          </div>
          <div className="text-center p-6">
            <div className="text-4xl font-bold gradient-text mb-2">24/7</div>
            <div className="text-gray-400">AI Support</div>
          </div>
        </div>

        {/* Why Choose Us */}
        <div className="mb-20">
          <h2 className="text-4xl font-bold text-center mb-12">
            <span className="gradient-text">Why Choose Soshogle</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="p-8 bg-gray-900 border-gray-800 hover:border-purple-500/50 transition-all">
              <div className="flex items-center justify-center w-14 h-14 rounded-lg bg-purple-500/10 mb-6">
                <Shield className="h-7 w-7 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Patented Technology</h3>
              <p className="text-gray-400">
                Our platform is protected by 3 US patents, ensuring you have access to cutting-edge innovations that competitors can't replicate.
              </p>
            </Card>
            <Card className="p-8 bg-gray-900 border-gray-800 hover:border-purple-500/50 transition-all">
              <div className="flex items-center justify-center w-14 h-14 rounded-lg bg-blue-500/10 mb-6">
                <Brain className="h-7 w-7 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">True AI Intelligence</h3>
              <p className="text-gray-400">
                Not just automation—our AI learns from your business, understands context, and makes intelligent decisions in real-time.
              </p>
            </Card>
            <Card className="p-8 bg-gray-900 border-gray-800 hover:border-purple-500/50 transition-all">
              <div className="flex items-center justify-center w-14 h-14 rounded-lg bg-green-500/10 mb-6">
                <TrendingUp className="h-7 w-7 text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Proven ROI</h3>
              <p className="text-gray-400">
                Our customers see 3x revenue increase and 67% cost savings on average within 12 months of implementation.
              </p>
            </Card>
            <Card className="p-8 bg-gray-900 border-gray-800 hover:border-purple-500/50 transition-all">
              <div className="flex items-center justify-center w-14 h-14 rounded-lg bg-pink-500/10 mb-6">
                <Rocket className="h-7 w-7 text-pink-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Fast Implementation</h3>
              <p className="text-gray-400">
                Go live in just 36 hours with our business-in-a-box solution. No lengthy setup or complex integrations required.
              </p>
            </Card>
            <Card className="p-8 bg-gray-900 border-gray-800 hover:border-purple-500/50 transition-all">
              <div className="flex items-center justify-center w-14 h-14 rounded-lg bg-yellow-500/10 mb-6">
                <Globe className="h-7 w-7 text-yellow-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Global Reach</h3>
              <p className="text-gray-400">
                Support customers worldwide with AI that speaks 30+ languages and understands cultural nuances.
              </p>
            </Card>
            <Card className="p-8 bg-gray-900 border-gray-800 hover:border-purple-500/50 transition-all">
              <div className="flex items-center justify-center w-14 h-14 rounded-lg bg-red-500/10 mb-6">
                <Users className="h-7 w-7 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Dedicated Support</h3>
              <p className="text-gray-400">
                Get expert guidance and support every step of the way. Our team ensures your success from day one.
              </p>
            </Card>
          </div>
        </div>

        {/* Technology */}
        <div className="mb-20 p-12 rounded-2xl bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-gray-800">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Award className="h-8 w-8 text-yellow-500" />
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                Protected by <span className="gradient-text">3 US Patents</span>
              </h2>
            </div>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Our proprietary technology stack includes patented algorithms for AI learning, conversational AI, and automation engines that set us apart from competitors
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-5xl mb-4">🧠</div>
              <h4 className="font-bold text-white mb-2">Adaptive Learning</h4>
              <p className="text-gray-400 text-sm">Algorithms that understand your business context and continuously improve</p>
            </div>
            <div className="text-center">
              <div className="text-5xl mb-4">💬</div>
              <h4 className="font-bold text-white mb-2">Natural Conversations</h4>
              <p className="text-gray-400 text-sm">Proprietary NLP enabling human-like interactions across 30+ languages</p>
            </div>
            <div className="text-center">
              <div className="text-5xl mb-4">⚡</div>
              <h4 className="font-bold text-white mb-2">Automation at Scale</h4>
              <p className="text-gray-400 text-sm">Handle 200 interactions per minute without human intervention</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center p-12 rounded-2xl bg-gray-900 border border-gray-800">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Transform Your Business?
          </h2>
          <p className="text-xl text-gray-400 mb-8">
            Join 90,000+ businesses already using our patented AI platform
          </p>
          <Link href="/contact">
            <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-lg px-12">
              Book a Demo
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
