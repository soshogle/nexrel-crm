
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import {
  Sparkles,
  TrendingUp,
  Shield,
  Zap,
  Phone,
  MessageSquare,
  BarChart3,
  Users,
  Calendar,
  DollarSign,
  Brain,
  Lock,
  Globe,
  ArrowRight,
  CheckCircle2,
  Star,
  Mic,
  CreditCard,
  Bot,
  Award,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-gray-800/50 bg-black/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-3">
              <div className="relative w-10 h-10">
                <Image
                  src="/soshogle-logo.png"
                  alt="Soshogle AI CRM"
                  fill
                  className="object-contain"
                />
              </div>
              <div>
                <span className="text-xl font-bold gradient-text">Soshogle AI</span>
                <p className="text-xs text-gray-400">Enterprise CRM</p>
              </div>
            </Link>
            <div className="flex items-center gap-4">
              <Button variant="ghost" className="text-gray-300 hover:text-white" asChild>
                <Link href="/auth/signin">
                  Sign In
                </Link>
              </Button>
              <Button className="gradient-primary text-white hover:opacity-90" asChild>
                <Link href="/auth/signup">
                  Get Started Free
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-black to-pink-900/20" />
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto mb-16">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6">
              <Shield className="h-4 w-4 text-purple-400" />
              <span className="text-sm text-purple-300">Protected by 3 US Patents</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-5xl sm:text-7xl font-bold mb-6 leading-tight">
              World's First{' '}
              <span className="gradient-text">Fully AI-Powered</span>
              <br />
              Enterprise CRM
            </h1>

            <p className="text-xl text-gray-400 mb-10 max-w-3xl mx-auto leading-relaxed">
              Revolutionary customer relationship management powered by advanced AI. Automate
              everything from voice conversations to payment processing. 10X your revenue with
              intelligent automation.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Button size="lg" className="gradient-primary text-white hover:opacity-90 px-8" asChild>
                <Link href="/auth/signup">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-gray-700 text-gray-300 hover:bg-purple-500/10 hover:border-purple-500/50 px-8"
                asChild
              >
                <Link href="/auth/signin">
                  Watch Demo
                </Link>
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-400" />
                <span>No Credit Card Required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-400" />
                <span>14-Day Free Trial</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-400" />
                <span>Cancel Anytime</span>
              </div>
            </div>
          </div>

          {/* Animated Visual Rendering */}
          <div className="max-w-5xl mx-auto">
            <div className="relative rounded-2xl overflow-hidden border border-gray-800 bg-gradient-to-br from-gray-900 to-black">
              {/* Browser Chrome */}
              <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-green-500/60" />
                </div>
                <span className="text-xs text-gray-400 ml-4">Voice AI Agent - Live Call</span>
              </div>

              {/* Animated Content */}
              <div className="p-8 relative h-96">
                {/* Gradient Orb Animation */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative">
                    <div className="w-64 h-64 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-purple-600 blur-3xl opacity-60 animate-pulse" />
                    <div className="absolute inset-0 w-64 h-64 rounded-full bg-gradient-to-tr from-blue-500 via-purple-500 to-pink-500 blur-2xl opacity-40 animate-pulse delay-500" />
                  </div>
                </div>

                {/* Voice Wave Animation */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex items-center gap-1">
                    {[...Array(40)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1 bg-gradient-to-t from-purple-500 to-pink-500 rounded-full animate-wave"
                        style={{
                          height: `${Math.random() * 100 + 20}px`,
                          animationDelay: `${i * 0.05}s`,
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Floating UI Elements */}
                <div className="absolute top-8 left-8 bg-gray-900/90 backdrop-blur-sm border border-gray-800 rounded-lg p-4 animate-float">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Phone className="h-5 w-5 text-green-400" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">Incoming Call</div>
                      <div className="text-xs text-gray-400">+1 (555) 123-4567</div>
                    </div>
                  </div>
                </div>

                <div className="absolute top-8 right-8 bg-gray-900/90 backdrop-blur-sm border border-gray-800 rounded-lg p-4 animate-float delay-300">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <Bot className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">AI Agent Active</div>
                      <div className="text-xs text-gray-400">Processing...</div>
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900/90 backdrop-blur-sm border border-gray-800 rounded-lg p-4 animate-float delay-700">
                  <div className="text-center">
                    <div className="text-2xl font-bold gradient-text">$1,247</div>
                    <div className="text-xs text-gray-400 mt-1">Revenue Generated</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ROI Stats Section */}
      <section className="py-20 border-y border-gray-800 bg-gradient-to-b from-black to-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-5xl font-bold gradient-text mb-2">10X</div>
              <div className="text-gray-400">Revenue Growth</div>
            </div>
            <div>
              <div className="text-5xl font-bold gradient-text mb-2">95%</div>
              <div className="text-gray-400">Time Saved</div>
            </div>
            <div>
              <div className="text-5xl font-bold gradient-text mb-2">3</div>
              <div className="text-gray-400">US Patents</div>
            </div>
            <div>
              <div className="text-5xl font-bold gradient-text mb-2">24/7</div>
              <div className="text-gray-400">AI Automation</div>
            </div>
          </div>
        </div>
      </section>

      {/* Patents Section */}
      <section className="py-20 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6">
              <Award className="h-4 w-4 text-purple-400" />
              <span className="text-sm text-purple-300">Patent-Protected Technology</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              <span className="gradient-text">Protected Innovation</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Our proprietary AI technology is protected by 3 US patents, ensuring cutting-edge
              capabilities exclusive to Soshogle AI CRM.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: 'AI Voice Intelligence',
                description: 'Patented conversational AI that understands context and intent',
                icon: Mic,
              },
              {
                title: 'Intelligent Automation',
                description: 'Self-learning workflows that adapt to your business',
                icon: Brain,
              },
              {
                title: 'Predictive Analytics',
                description: 'AI-powered forecasting and revenue optimization',
                icon: TrendingUp,
              },
            ].map((patent, i) => (
              <div
                key={i}
                className="p-6 bg-gray-900 rounded-xl border border-gray-800 hover:border-purple-500/50 transition-all"
              >
                <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4">
                  <patent.icon className="h-6 w-6 text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{patent.title}</h3>
                <p className="text-gray-400">{patent.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Capabilities */}
      <section className="py-20 bg-gradient-to-b from-gray-900/50 to-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              <span className="gradient-text">Revolutionary Capabilities</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Everything you need to automate, scale, and dominate your industry
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Phone,
                title: 'AI Voice Agents',
                description: 'Fully automated voice conversations that sound human',
                color: 'from-purple-500 to-pink-500',
              },
              {
                icon: MessageSquare,
                title: 'Multi-Channel Messaging',
                description: 'Unified inbox for SMS, email, and social media',
                color: 'from-blue-500 to-purple-500',
              },
              {
                icon: Calendar,
                title: 'Smart Scheduling',
                description: 'AI-powered appointment booking and management',
                color: 'from-green-500 to-blue-500',
              },
              {
                icon: CreditCard,
                title: 'Payment Processing',
                description: 'Integrated payment solutions with multiple processors',
                color: 'from-yellow-500 to-orange-500',
              },
              {
                icon: BarChart3,
                title: 'Advanced Analytics',
                description: 'Real-time insights and predictive forecasting',
                color: 'from-pink-500 to-purple-500',
              },
              {
                icon: Users,
                title: 'Customer Management',
                description: 'Complete view of customer journeys and interactions',
                color: 'from-purple-500 to-blue-500',
              },
              {
                icon: Bot,
                title: 'AI Assistant',
                description: 'Intelligent chatbot trained on your business data',
                color: 'from-green-500 to-purple-500',
              },
              {
                icon: Globe,
                title: 'Multi-Industry Support',
                description: 'Restaurants, sports clubs, healthcare, and more',
                color: 'from-blue-500 to-pink-500',
              },
              {
                icon: Lock,
                title: 'Enterprise Security',
                description: 'Bank-level encryption and compliance',
                color: 'from-red-500 to-purple-500',
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="p-6 bg-gray-900 rounded-xl border border-gray-800 hover:border-purple-500/50 transition-all group"
              >
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${feature.color} bg-opacity-10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 bg-black border-y border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              Trusted by <span className="gradient-text">Industry Leaders</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: "Soshogle AI increased our revenue by 350% in just 6 months. The voice AI is incredible.",
                author: "Restaurant Owner",
                industry: "Food & Beverage",
                rating: 5,
              },
              {
                quote: "We automated 90% of our customer communication. This CRM pays for itself 100X over.",
                author: "Sports Club Director",
                industry: "Sports & Recreation",
                rating: 5,
              },
              {
                quote: "The AI assistant handles everything. It's like having a full team working 24/7.",
                author: "Healthcare Practice",
                industry: "Medical Services",
                rating: 5,
              },
            ].map((testimonial, i) => (
              <div key={i} className="p-6 bg-gray-900 rounded-xl border border-gray-800">
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, j) => (
                    <Star key={j} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-300 mb-4 italic">"{testimonial.quote}"</p>
                <div>
                  <div className="font-semibold">{testimonial.author}</div>
                  <div className="text-sm text-gray-400">{testimonial.industry}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ROI Calculator */}
      <section className="py-20 bg-gradient-to-b from-black to-gray-900/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 rounded-2xl border border-purple-500/20 p-12">
            <div className="text-center mb-8">
              <h2 className="text-4xl sm:text-5xl font-bold mb-4">
                Calculate Your <span className="gradient-text">ROI</span>
              </h2>
              <p className="text-xl text-gray-400">
                See how much revenue Soshogle AI can generate for your business
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div className="p-6 bg-gray-900/50 rounded-xl border border-gray-800">
                <div className="text-4xl font-bold gradient-text mb-2">$50K+</div>
                <div className="text-gray-400">Monthly Revenue Increase</div>
              </div>
              <div className="p-6 bg-gray-900/50 rounded-xl border border-gray-800">
                <div className="text-4xl font-bold gradient-text mb-2">200+</div>
                <div className="text-gray-400">Hours Saved Per Month</div>
              </div>
              <div className="p-6 bg-gray-900/50 rounded-xl border border-gray-800">
                <div className="text-4xl font-bold gradient-text mb-2">10X</div>
                <div className="text-gray-400">Return on Investment</div>
              </div>
            </div>

            <div className="text-center mt-8">
              <Link href="/auth/signup">
                <Button size="lg" className="gradient-primary text-white hover:opacity-90 px-8">
                  Start Your Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-black">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl sm:text-6xl font-bold mb-6">
            Ready to <span className="gradient-text">10X Your Revenue</span>?
          </h2>
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
            Join the AI revolution. Start automating your business today with the world's first
            fully AI-powered enterprise CRM.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="gradient-primary text-white hover:opacity-90 px-8" asChild>
              <Link href="/auth/signup">
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-gray-700 text-gray-300 hover:bg-purple-500/10 hover:border-purple-500/50 px-8"
              asChild
            >
              <Link href="/auth/signin">
                Schedule Demo
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-12 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="relative w-8 h-8">
                <Image
                  src="/soshogle-logo.png"
                  alt="Soshogle AI CRM"
                  fill
                  className="object-contain"
                />
              </div>
              <div>
                <span className="font-semibold gradient-text">Soshogle AI</span>
                <p className="text-xs text-gray-400">Enterprise CRM</p>
              </div>
            </Link>
            <div className="text-sm text-gray-400">
              © 2025 Soshogle AI. All rights reserved. | Protected by 3 US Patents
            </div>
          </div>
        </div>
      </footer>

      {/* Custom Animations CSS */}
      <style jsx global>{`
        @keyframes wave {
          0%, 100% {
            transform: scaleY(0.5);
          }
          50% {
            transform: scaleY(1);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .animate-wave {
          animation: wave 1.5s ease-in-out infinite;
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .delay-300 {
          animation-delay: 300ms;
        }

        .delay-500 {
          animation-delay: 500ms;
        }

        .delay-700 {
          animation-delay: 700ms;
        }

        .delay-1000 {
          animation-delay: 1000ms;
        }
      `}</style>
    </div>
  );
}
