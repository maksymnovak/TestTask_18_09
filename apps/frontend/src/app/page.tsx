'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ChartBarIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  StarIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isValidEmail } from '@/lib/utils';
import toast from 'react-hot-toast';

const features = [
  {
    icon: ShieldCheckIcon,
    title: 'KYC Verification',
    description: 'Secure identity verification powered by Persona to build trust with investors.',
  },
  {
    icon: DocumentTextIcon,
    title: 'Secure Data Room',
    description: 'Upload and organize your pitch deck, financials, and legal documents securely.',
  },
  {
    icon: ChartBarIcon,
    title: 'Investability Score',
    description: 'Real-time scoring based on your company profile, documents, and verification status.',
  },
];

const testimonials = [
  {
    name: 'Sarah Chen',
    company: 'TechVenture AI',
    content: 'Capital Marketplace streamlined our fundraising process. The investability score helped us identify areas for improvement.',
    avatar: '👩‍💼',
  },
  {
    name: 'Michael Rodriguez',
    company: 'HealthTech Solutions',
    content: 'The secure data room and KYC verification gave investors confidence in our startup.',
    avatar: '👨‍💻',
  },
];

export default function HomePage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGetStarted = async () => {
    if (!email.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    if (!isValidEmail(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      // Store email in session storage for onboarding
      sessionStorage.setItem('onboarding_email', email);

      // Navigate to onboarding
      router.push('/onboarding');
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };

  const handleExistingUser = () => {
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Hero Section */}
      <main className="relative">
        {/* Navigation */}
        <nav className="relative px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">CM</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Capital Marketplace</span>
            </div>
            <Button
              variant="ghost"
              onClick={handleExistingUser}
              className="text-gray-600 hover:text-gray-900"
            >
              Existing User? Sign In
            </Button>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="px-6 lg:px-8 py-12 lg:py-20">
          <div className="max-w-7xl mx-auto">
            <div className="text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6">
                  Connect with
                  <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    {' '}Investors
                  </span>
                </h1>
                <p className="text-xl lg:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
                  The premier platform for startups to showcase their potential,
                  manage secure data rooms, and connect with the right investors.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="max-w-md mx-auto mb-12"
              >
                <div className="flex space-x-4">
                  <Input
                    type="email"
                    placeholder="Enter your email to get started"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleGetStarted()}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleGetStarted}
                    disabled={isLoading}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        Get Started
                        <ArrowRightIcon className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-sm text-gray-500 mt-3">
                  Free to start • No credit card required
                </p>
              </motion.div>

              {/* Trust Indicators */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="flex items-center justify-center space-x-8 text-sm text-gray-500"
              >
                <div className="flex items-center space-x-1">
                  <CheckCircleIcon className="w-4 h-4 text-green-500" />
                  <span>SOC 2 Compliant</span>
                </div>
                <div className="flex items-center space-x-1">
                  <ShieldCheckIcon className="w-4 h-4 text-blue-500" />
                  <span>Bank-Grade Security</span>
                </div>
                <div className="flex items-center space-x-1">
                  <StarIcon className="w-4 h-4 text-yellow-500" />
                  <span>Trusted by 500+ Startups</span>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                Everything you need to raise capital
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Our platform provides all the tools you need to present your startup
                professionally and connect with the right investors.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="text-center p-8 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors duration-200"
                >
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center mx-auto mb-6">
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-600">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
                Trusted by founders worldwide
              </h2>
              <p className="text-xl text-blue-100">
                See what our customers have to say about their experience
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {testimonials.map((testimonial, index) => (
                <motion.div
                  key={testimonial.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="bg-white/10 backdrop-blur-sm rounded-2xl p-8"
                >
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="text-3xl">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-white">
                        {testimonial.name}
                      </h4>
                      <p className="text-blue-100">
                        {testimonial.company}
                      </p>
                    </div>
                  </div>
                  <p className="text-white text-lg leading-relaxed">
                    "{testimonial.content}"
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-white">
          <div className="max-w-4xl mx-auto text-center px-6 lg:px-8">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
              Ready to raise capital?
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Join hundreds of startups already using Capital Marketplace to connect with investors.
            </p>
            <Button
              onClick={() => email ? handleGetStarted() : setEmail('demo@example.com')}
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-8 py-3 text-lg"
            >
              Start Your Journey
              <ArrowRightIcon className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">CM</span>
              </div>
              <span className="text-xl font-bold">Capital Marketplace</span>
            </div>
            <p className="text-gray-400 mb-6">
              Connecting startups with investors since 2024
            </p>
            <div className="flex items-center justify-center space-x-6 text-sm text-gray-400">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}