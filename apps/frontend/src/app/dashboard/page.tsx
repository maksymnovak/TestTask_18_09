'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ChartBarIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  BanknotesIcon,
  CalendarIcon,
  BellIcon,
  PlusIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  UsersIcon,
  FolderIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import axios from 'axios';
import { formatCurrency, formatDate, formatRelativeTime } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Company {
  id: string;
  name: string;
  sector: string;
  targetRaise: number;
  revenue: number;
  kycVerified: boolean;
  financialsLinked: boolean;
  createdAt: string | Date;
}

interface InvestabilityScore {
  score: number;
  breakdown: {
    kycVerified: number;
    financialsLinked: number;
    documentsUploaded: number;
    revenueScore: number;
  };
}

interface Document {
  id: string;
  name: string;
  size: number;
  category?: string;
  createdAt: string | Date;
}

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  createdAt: string | Date;
  readAt?: string | Date;
}

export default function DashboardPage() {
  const router = useRouter();
  const [company, setCompany] = useState<Company | null>(null);
  const [score, setScore] = useState<InvestabilityScore | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingActions, setLoadingActions] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // Try to get company from various sources - PRIORITY ORDER IS CRITICAL
      let companyData: Company | null = null;

      // 1. HIGHEST PRIORITY: Try to get from onboarding progress (fresh data)
      const progress = sessionStorage.getItem('onboarding_progress');
      if (progress) {
        const progressData = JSON.parse(progress);
        if (progressData.company) {
          // Use the company data directly saved during onboarding
          companyData = progressData.company;
          console.log('✅ Dashboard: Loaded company from onboarding data:', companyData.name);
        } else if (progressData.companyId) {
          try {
            // Fallback: fetch by ID
            const userEmail = sessionStorage.getItem('onboarding_email') || sessionStorage.getItem('current_user_email');
            if (userEmail) {
              companyData = await api.getCompanyByEmail(userEmail);
              console.log('✅ Dashboard: Loaded company by email from onboarding:', companyData.name);
            }
          } catch (error) {
            console.error('Error fetching company from onboarding:', error);
          }
        }
      }

      // 2. Try to get from current session (login)
      if (!companyData) {
        const currentCompany = sessionStorage.getItem('current_company');
        if (currentCompany) {
          try {
            companyData = JSON.parse(currentCompany);
            console.log('✅ Dashboard: Loaded company from login session:', companyData.name);
          } catch (error) {
            console.error('Error parsing current company:', error);
          }
        }
      }

      // 3. Fallback: Try to get from current user email
      if (!companyData) {
        const userEmail = sessionStorage.getItem('current_user_email');
        if (userEmail) {
          try {
            companyData = await api.getCompanyByEmail(userEmail);
            console.log('✅ Dashboard: Loaded company by current user email:', companyData.name, 'ID:', companyData.id);
          } catch (error) {
            console.log('No company found for current user email');
          }
        }
      }

      // 4. Last resort: create demo company (REMOVED - we always use existing)
      if (!companyData) {
        console.log('❌ Dashboard: No company found! This should not happen.');
        toast.error('No company found. Please complete onboarding first.');
        return;
      }

      if (companyData) {
        console.log('🏢 Dashboard: Using company:', companyData.name, 'ID:', companyData.id);
        setCompany(companyData);

        // Also save to session for consistency
        sessionStorage.setItem('current_company', JSON.stringify(companyData));

        await Promise.all([
          loadInvestabilityScore(companyData.id),
          loadDocuments(companyData.id),
          loadNotifications(companyData.userId),
        ]);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast.error('Failed to load dashboard data');
    }
    setIsLoading(false);
  };

  const createDemoCompany = async (): Promise<Company | null> => {
    try {
      const company = await api.createCompany({
        name: 'TechStartup Inc',
        sector: 'Technology',
        targetRaise: 2000000,
        revenue: 500000,
        email: 'test@example.com',
      });
      return company;
    } catch (error) {
      console.error('Error creating demo company:', error);
    }
    return null;
  };

  const loadInvestabilityScore = async (companyId: string) => {
    try {
      console.log('🔄 Loading investability score for company:', companyId);
      const scoreData = await api.getInvestabilityScore(companyId);
      console.log('✅ Score loaded:', scoreData);
      setScore(scoreData);

      // Force re-render by updating state
      setScore({ ...scoreData });
    } catch (error) {
      console.error('❌ Error loading score:', error);
    }
  };

  const loadDocuments = async (companyId: string) => {
    try {
      console.log('📂 Dashboard: Loading documents for company ID:', companyId);
      const documentsData = await api.getDocuments(companyId);
      console.log('📂 Dashboard: Documents loaded:', documentsData.length, 'documents');
      setDocuments(documentsData);
    } catch (error) {
      console.error('❌ Dashboard: Error loading documents:', error);
    }
  };

  const loadNotifications = async (userId: string) => {
    try {
      const result = await api.getNotifications(userId);
      setNotifications(result.notifications || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const handleAction = async (action: string, callback: () => Promise<void>) => {
    setLoadingActions(prev => new Set(prev).add(action));
    try {
      await callback();
      await loadDashboardData(); // Refresh all data
    } catch (error) {
      console.error(`Action ${action} failed:`, error);
    }
    setLoadingActions(prev => {
      const next = new Set(prev);
      next.delete(action);
      return next;
    });
  };

  const handleKYCVerification = async () => {
    if (!company) return;

    const result = await api.verifyKyc(company.id, { mockVerify: true });
    if (result.verified) {
      toast.success('KYC verification completed!');
    } else {
      throw new Error('KYC verification failed');
    }
  };

  const handleLinkFinancials = async () => {
    if (!company) return;

    const result = await api.linkFinancials(company.id, `demo_token_${Date.now()}`);
    if (result.linked) {
      toast.success('Financial accounts linked successfully!');
    } else {
      throw new Error('Financial linking failed');
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreDescription = (score: number) => {
    if (score >= 90) return 'Excellent - Highly investable';
    if (score >= 80) return 'Very Good - Strong investment potential';
    if (score >= 60) return 'Good - Some improvements needed';
    if (score >= 40) return 'Fair - Needs significant improvement';
    return 'Needs Work - Multiple improvements required';
  };

  const getNextSteps = () => {
    if (!company) return [];

    const steps = [];
    if (!company.kycVerified) {
      steps.push({
        title: 'Complete KYC Verification',
        description: 'Verify your identity to build trust with investors',
        action: 'kyc',
        icon: ShieldCheckIcon,
        priority: 'high',
      });
    }
    if (!company.financialsLinked) {
      steps.push({
        title: 'Link Financial Accounts',
        description: 'Connect your bank accounts for financial transparency',
        action: 'financials',
        icon: BanknotesIcon,
        priority: 'high',
      });
    }
    if (documents.length < 3) {
      steps.push({
        title: 'Upload More Documents',
        description: 'Add pitch deck, financial statements, and business plan',
        action: 'documents',
        icon: DocumentTextIcon,
        priority: 'medium',
      });
    }

    return steps;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <ExclamationTriangleIcon className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Company Not Found
          </h1>
          <p className="text-gray-600 mb-6">
            We couldn't load your company data. Please try again or complete onboarding.
          </p>
          <div className="space-y-3">
            <Button onClick={() => router.push('/onboarding')} className="w-full">
              Start Onboarding
            </Button>
            <Button onClick={loadDashboardData} variant="outline" className="w-full">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const nextSteps = getNextSteps();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">CM</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{company.name}</h1>
                <p className="text-sm text-gray-500">{company.sector}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/notifications')}
                  title="View notifications"
                >
                  <BellIcon className="w-5 h-5" />
                  {notifications.filter(n => !n.readAt).length > 0 && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
                  )}
                </Button>
              </div>
              <Button
                onClick={() => router.push('/')}
                variant="outline"
                size="sm"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome back! 👋
          </h2>
          <p className="text-gray-600">
            Here's what's happening with your fundraising journey.
          </p>
        </motion.div>

        {/* Key Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <ChartBarIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${score ? getScoreColor(score.score) : 'text-gray-400'}`}>
                  {score ? score.score : '—'}/100
                </p>
                <p className="text-sm text-gray-500">Investability Score</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <ArrowTrendingUpIcon className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(company.targetRaise)}
                </p>
                <p className="text-sm text-gray-500">Target Raise</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <DocumentTextIcon className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{documents.length}</p>
                <p className="text-sm text-gray-500">Documents</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <ClockIcon className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.floor((Date.now() - new Date(company.createdAt).getTime()) / (1000 * 60 * 60 * 24))}d
                </p>
                <p className="text-sm text-gray-500">Days Active</p>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Investability Score Details */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Investability Score</h3>
                <Button
                  onClick={() => loadInvestabilityScore(company.id)}
                  variant="outline"
                  size="sm"
                  disabled={loadingActions.has('score')}
                >
                  {loadingActions.has('score') ? (
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Refresh Score'
                  )}
                </Button>
              </div>

              {score ? (
                <div>
                  <div className="text-center mb-8">
                    <div className={`text-4xl font-bold ${getScoreColor(score.score)} mb-2`}>
                      {score.score}/100
                    </div>
                    <p className="text-gray-600">{getScoreDescription(score.score)}</p>
                  </div>

                  <div className="space-y-4">
                    {[
                      { label: 'KYC Verification', value: score.breakdown.kycVerified, max: 30, color: 'blue' },
                      { label: 'Financial Accounts', value: score.breakdown.financialsLinked, max: 20, color: 'green' },
                      { label: 'Documents Uploaded', value: score.breakdown.documentsUploaded, max: 25, color: 'purple' },
                      { label: 'Revenue Score', value: score.breakdown.revenueScore, max: 25, color: 'orange' },
                    ].map((item, index) => (
                      <div key={index}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-700">{item.label}</span>
                          <span className="text-sm text-gray-900">{item.value}/{item.max}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(item.value / item.max) * 100}%` }}
                            transition={{ delay: 0.3 + index * 0.1, duration: 0.6 }}
                            className={`h-2 rounded-full ${
                              item.color === 'blue' ? 'bg-blue-600' :
                              item.color === 'green' ? 'bg-green-600' :
                              item.color === 'purple' ? 'bg-purple-600' :
                              item.color === 'orange' ? 'bg-orange-600' :
                              'bg-gray-600'
                            }`}
                            style={{ width: `${(item.value / item.max) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <ChartBarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Unable to load investability score</p>
                </div>
              )}
            </motion.div>

            {/* Next Steps */}
            {nextSteps.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
              >
                <h3 className="text-xl font-semibold text-gray-900 mb-6">Recommended Next Steps</h3>
                <div className="space-y-4">
                  {nextSteps.map((step, index) => (
                    <div
                      key={step.action}
                      className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        step.priority === 'high' ? 'bg-red-100' : 'bg-blue-100'
                      }`}>
                        <step.icon className={`w-5 h-5 ${
                          step.priority === 'high' ? 'text-red-600' : 'text-blue-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{step.title}</h4>
                        <p className="text-sm text-gray-600">{step.description}</p>
                      </div>
                      <Button
                        size="sm"
                        disabled={loadingActions.has(step.action)}
                        onClick={() => {
                          if (step.action === 'kyc') {
                            handleAction('kyc', handleKYCVerification);
                          } else if (step.action === 'financials') {
                            handleAction('financials', handleLinkFinancials);
                          } else if (step.action === 'documents') {
                            router.push('/data-room');
                          }
                        }}
                      >
                        {loadingActions.has(step.action) ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            {step.action === 'documents' ? 'Upload' : 'Complete'}
                            <ArrowRightIcon className="w-4 h-4 ml-1" />
                          </>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Recent Documents */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Recent Documents</h3>
                <Button
                  onClick={() => router.push('/data-room')}
                  variant="outline"
                  size="sm"
                >
                  View All
                </Button>
              </div>

              {documents.length > 0 ? (
                <div className="space-y-3">
                  {documents.slice(0, 3).map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <DocumentTextIcon className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                          <p className="text-xs text-gray-500">
                            {doc.category && `${doc.category} • `}
                            {formatRelativeTime(doc.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FolderIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">No documents uploaded yet</p>
                  <Button onClick={() => router.push('/data-room')}>
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Upload First Document
                  </Button>
                </div>
              )}
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Company Status */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Status</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ShieldCheckIcon className="w-5 h-5 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">KYC Status</span>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    company.kycVerified
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {company.kycVerified ? 'Verified' : 'Pending'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <BanknotesIcon className="w-5 h-5 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Financials</span>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    company.financialsLinked
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {company.financialsLinked ? 'Linked' : 'Pending'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <DocumentTextIcon className="w-5 h-5 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Data Room</span>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                    {documents.length} docs
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Button
                  onClick={() => router.push('/data-room')}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <FolderIcon className="w-4 h-4 mr-2" />
                  Manage Data Room
                </Button>

                <Button
                  onClick={() => router.push('/scheduling')}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  Schedule Meetings
                </Button>

                <Button
                  onClick={() => router.push('/notifications')}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <BellIcon className="w-4 h-4 mr-2" />
                  View Notifications
                  {notifications.filter(n => !n.readAt).length > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-1">
                      {notifications.filter(n => !n.readAt).length}
                    </span>
                  )}
                </Button>
              </div>
            </motion.div>

            {/* Company Details */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Revenue</span>
                  <span className="text-gray-900">{formatCurrency(company.revenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Target Raise</span>
                  <span className="text-gray-900">{formatCurrency(company.targetRaise)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Sector</span>
                  <span className="text-gray-900">{company.sector}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Created</span>
                  <span className="text-gray-900">{formatDate(company.createdAt)}</span>
                </div>
              </div>
            </motion.div>

            {/* Recent Notifications */}
            {notifications.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Notifications</h3>
                <div className="space-y-3">
                  {notifications.slice(0, 3).map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 rounded-lg border-l-4 ${
                        notification.type === 'success' ? 'bg-green-50 border-green-400' :
                        notification.type === 'warning' ? 'bg-yellow-50 border-yellow-400' :
                        notification.type === 'error' ? 'bg-red-50 border-red-400' :
                        'bg-blue-50 border-blue-400'
                      }`}
                    >
                      <p className="text-sm text-gray-900">{notification.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatRelativeTime(notification.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}