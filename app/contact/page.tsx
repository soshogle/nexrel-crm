
'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Clock,
  CheckCircle2,
  Rocket
} from 'lucide-react';

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    industry: '',
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success('Demo request submitted! We\'ll contact you within 24 hours.');
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        company: '',
        industry: '',
        message: '',
      });
    }, 1500);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="bg-black min-h-screen py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-20">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="gradient-text">Book Your Demo</span>
            <br />
            <span className="text-white">See Soshogle in Action</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Schedule a personalized demo and discover how our AI-powered CRM can transform your business
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Contact Form */}
          <div className="lg:col-span-2">
            <Card className="p-8 bg-gray-900 border-gray-800">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="firstName" className="text-white">First Name *</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => handleChange('firstName', e.target.value)}
                      required
                      className="bg-gray-800 border-gray-700 text-white"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="text-white">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => handleChange('lastName', e.target.value)}
                      required
                      className="bg-gray-800 border-gray-700 text-white"
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email" className="text-white">Work Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    required
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="john@company.com"
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className="text-white">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    required
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>

                <div>
                  <Label htmlFor="company" className="text-white">Company Name *</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => handleChange('company', e.target.value)}
                    required
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="Acme Inc."
                  />
                </div>

                <div>
                  <Label htmlFor="industry" className="text-white">Industry *</Label>
                  <Select value={formData.industry || undefined} onValueChange={(value) => handleChange('industry', value)} required>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue placeholder="Select your industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="restaurants">Restaurants & Food Service</SelectItem>
                      <SelectItem value="healthcare">Healthcare & Medical</SelectItem>
                      <SelectItem value="sports">Sports Clubs & Recreation</SelectItem>
                      <SelectItem value="retail">Retail & E-commerce</SelectItem>
                      <SelectItem value="professional">Professional Services</SelectItem>
                      <SelectItem value="education">Education & Training</SelectItem>
                      <SelectItem value="realestate">Real Estate</SelectItem>
                      <SelectItem value="fitness">Fitness & Wellness</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="message" className="text-white">Tell us about your business (Optional)</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => handleChange('message', e.target.value)}
                    rows={4}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="What are your main challenges? What are you looking to achieve?"
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  size="lg"
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  {isSubmitting ? (
                    'Submitting...'
                  ) : (
                    <>
                      Book My Demo
                      <Rocket className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>

                <p className="text-sm text-gray-400 text-center">
                  By submitting this form, you agree to receive marketing communications from Soshogle
                </p>
              </form>
            </Card>
          </div>

          {/* Contact Info & Benefits */}
          <div className="space-y-6">
            {/* Contact Information */}
            <Card className="p-6 bg-gray-900 border-gray-800">
              <h3 className="text-xl font-bold text-white mb-6">Contact Information</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-purple-400 mt-1" />
                  <div>
                    <div className="text-sm text-gray-400">Email</div>
                    <a href="https://soshogle.com" target="_blank" rel="noopener noreferrer" className="text-white hover:text-purple-400">
                      Visit soshogle.com
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-purple-400 mt-1" />
                  <div>
                    <div className="text-sm text-gray-400">Response Time</div>
                    <div className="text-white">Within 24 hours</div>
                  </div>
                </div>
              </div>
            </Card>

            {/* What to Expect */}
            <Card className="p-6 bg-gradient-to-br from-purple-900/20 to-gray-900 border-gray-800">
              <h3 className="text-xl font-bold text-white mb-6">What to Expect</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-400 mt-1" />
                  <div>
                    <div className="font-semibold text-white">30-Minute Demo</div>
                    <div className="text-sm text-gray-400">Personalized walkthrough of features relevant to your industry</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-400 mt-1" />
                  <div>
                    <div className="font-semibold text-white">ROI Analysis</div>
                    <div className="text-sm text-gray-400">See projected cost savings and revenue increase for your business</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-400 mt-1" />
                  <div>
                    <div className="font-semibold text-white">Q&A Session</div>
                    <div className="text-sm text-gray-400">Get all your questions answered by our product experts</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-400 mt-1" />
                  <div>
                    <div className="font-semibold text-white">Custom Proposal</div>
                    <div className="text-sm text-gray-400">Receive a tailored implementation plan for your business</div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Trust Badges */}
            <Card className="p-6 bg-gray-900 border-gray-800">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-gray-300">
                  <span className="text-2xl">🏆</span>
                  <span className="font-semibold">3 US Patents</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <span className="text-2xl">🚀</span>
                  <span className="font-semibold">90,000+ Businesses</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <span className="text-2xl">⚡</span>
                  <span className="font-semibold">36-Hour Setup</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <span className="text-2xl">🌍</span>
                  <span className="font-semibold">30+ Languages</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
