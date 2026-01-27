
'use client';

import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  Utensils, 
  Heart, 
  Trophy, 
  ShoppingBag, 
  Briefcase,
  GraduationCap,
  Home,
  Dumbbell,
  ArrowRight
} from 'lucide-react';

const solutions = [
  {
    icon: Utensils,
    title: 'Restaurants & Food Service',
    description: 'AI voice agents handle reservations, take orders, and answer questions 24/7. Manage tables, track deliveries, and boost repeat business.',
    features: ['Reservation Management', 'Order Taking AI', 'Delivery Tracking', 'Review Management'],
    color: 'orange'
  },
  {
    icon: Heart,
    title: 'Healthcare & Medical',
    description: 'HIPAA-compliant AI receptionists schedule appointments, send reminders, and handle patient inquiries while protecting sensitive data.',
    features: ['Appointment Scheduling', 'Patient Reminders', 'Insurance Verification', 'HIPAA Compliance'],
    color: 'blue'
  },
  {
    icon: Trophy,
    title: 'Sports Clubs & Recreation',
    description: 'Manage memberships, schedule classes, process registrations, and communicate with families—all in one platform.',
    features: ['Membership Management', 'Class Scheduling', 'Payment Processing', 'Parent Communication'],
    color: 'green'
  },
  {
    icon: ShoppingBag,
    title: 'Retail & E-commerce',
    description: 'Capture leads, recover abandoned carts, and increase customer lifetime value with AI-powered marketing automation.',
    features: ['Inventory Management', 'Customer Segmentation', 'Abandoned Cart Recovery', 'Loyalty Programs'],
    color: 'purple'
  },
  {
    icon: Briefcase,
    title: 'Professional Services',
    description: 'Streamline client onboarding, automate follow-ups, and manage projects from lead to completion with intelligent workflows.',
    features: ['Lead Qualification', 'Project Management', 'Invoice Automation', 'Client Portal'],
    color: 'indigo'
  },
  {
    icon: GraduationCap,
    title: 'Education & Training',
    description: 'Enroll students, schedule classes, send course reminders, and track progress with automated administrative tools.',
    features: ['Student Enrollment', 'Course Management', 'Attendance Tracking', 'Parent Portal'],
    color: 'yellow'
  },
  {
    icon: Home,
    title: 'Real Estate',
    description: 'Capture leads from listings, schedule property tours, send automated follow-ups, and close deals faster.',
    features: ['Lead Capture', 'Tour Scheduling', 'Pipeline Management', 'Document Automation'],
    color: 'teal'
  },
  {
    icon: Dumbbell,
    title: 'Fitness & Wellness',
    description: 'Book classes, manage memberships, send workout reminders, and nurture client relationships automatically.',
    features: ['Class Booking', 'Membership Billing', 'Attendance Tracking', 'Progress Monitoring'],
    color: 'red'
  }
];

export default function SolutionsPage() {
  return (
    <div className="bg-black min-h-screen py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-20">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="gradient-text">Industry Solutions</span>
            <br />
            <span className="text-white">Tailored for Your Business</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Powerful AI-driven CRM designed specifically for the unique needs of your industry
          </p>
        </div>

        {/* Solutions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
          {solutions.map((solution, idx) => (
            <Card key={idx} className="p-8 bg-gray-900 border-gray-800 hover:border-purple-500/50 transition-all group">
              <div className={`flex items-center justify-center w-14 h-14 rounded-lg bg-${solution.color}-500/10 mb-6 group-hover:scale-110 transition-transform`}>
                <solution.icon className={`h-7 w-7 text-${solution.color}-400`} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">{solution.title}</h3>
              <p className="text-gray-400 mb-6">{solution.description}</p>
              <div className="space-y-2 mb-6">
                {solution.features.map((feature, fIdx) => (
                  <div key={fIdx} className="flex items-center gap-2 text-gray-300">
                    <ArrowRight className="h-4 w-4 text-purple-400" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
              <Link href="/contact">
                <Button variant="outline" className="w-full border-gray-700 hover:bg-gray-800 group-hover:border-purple-500">
                  Learn More
                </Button>
              </Link>
            </Card>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center p-12 rounded-2xl bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-gray-800">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Don't See Your Industry?
          </h2>
          <p className="text-xl text-gray-400 mb-8">
            Our platform is flexible enough to work for any business. Let's discuss your specific needs.
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
