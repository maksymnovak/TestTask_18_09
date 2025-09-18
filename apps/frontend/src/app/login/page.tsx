'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRightIcon, UserIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { isValidEmail } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Company {
  id: string;
  name: string;
  sector: string;
  targetRaise: number;
  revenue: number;
  kycVerified: boolean;
  financialsLinked: boolean;
  createdAt: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showCompanySelect, setShowCompanySelect] = useState(false);

  useEffect(() => {
    // Load demo companies for testing
    loadDemoCompanies();
  }, []);

  const loadDemoCompanies = async () => {
    try {
      // Try to get existing companies
      const testCompany = await api.getCompanyByEmail('test@example.com').catch(() => null);
      if (testCompany) {
        setCompanies([testCompany]);
      }
    } catch (error) {
      console.log('No existing companies found');
    }
  };

  const handleEmailSubmit = async () => {
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
      // Try to find company by email
      const company = await api.getCompanyByEmail(email);

      if (company) {
        // Store user session
        sessionStorage.setItem('current_user_email', email);
        sessionStorage.setItem('current_company', JSON.stringify(company));

        toast.success(`Welcome back, ${company.name}!`);
        router.push('/dashboard');
      } else {
        toast.error('No company found with this email. Please sign up first.');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('No account found with this email. Please check your email or sign up first.');
    }

    setIsLoading(false);
  };

  const handleQuickLogin = (company: Company) => {
    // Store user session
    sessionStorage.setItem('current_user_email', 'test@example.com');
    sessionStorage.setItem('current_company', JSON.stringify(company));

    toast.success(`Logged in as ${company.name}!`);
    router.push('/dashboard');
  };

  const handleBackToHome = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white rounded-2xl shadow-xl p-8"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">CM</span>
              </div>
              <span className="text-2xl font-bold text-gray-900">Capital Marketplace</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h1>
            <p className="text-gray-600">Access your company dashboard</p>
          </div>

          {!showCompanySelect ? (
            <div className="space-y-6">
              {/* Email Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder="Enter your company email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleEmailSubmit()}
                  className="w-full"
                />
              </div>

              {/* Login Button */}
              <Button
                onClick={handleEmailSubmit}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    Access Dashboard
                    <ArrowRightIcon className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>

              {/* Demo Access */}
              {companies.length > 0 && (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">Or try demo access</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {companies.map((company) => (
                      <motion.button
                        key={company.id}
                        onClick={() => handleQuickLogin(company)}
                        className="w-full p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 text-left"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <BuildingOfficeIcon className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{company.name}</p>
                            <p className="text-sm text-gray-500">{company.sector} • ${(company.targetRaise / 1000000).toFixed(1)}M raise</p>
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : null}

          {/* Back to Home */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={handleBackToHome}
              className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              ← Back to Home
            </button>
          </div>

          {/* Sign Up Link */}
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <button
                onClick={() => router.push('/')}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Sign up here
              </button>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}