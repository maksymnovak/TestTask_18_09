'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  BuildingOfficeIcon,
  ShieldCheckIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { SECTORS } from '@capital-marketplace/types';

// Step 1: Company Basics
const CompanyBasicsSchema = z.object({
  name: z.string().min(1, 'Company name is required').max(255),
  sector: z.enum(['Technology', 'Healthcare', 'Finance', 'Consumer Goods', 'Energy', 'Real Estate', 'Manufacturing', 'Education', 'Transportation', 'Other'], {
    errorMap: () => ({ message: 'Please select a valid sector' }),
  }),
  targetRaise: z.number().positive('Target raise must be positive'),
  revenue: z.number().nonnegative('Revenue cannot be negative'),
  email: z.string().email('Valid email is required'),
});

// Step 2: KYC Verification
const KYCSchema = z.object({
  companyId: z.string().uuid(),
  mockVerify: z.boolean().default(true), // For demo purposes
});

// Step 3: Financial Linking
const FinancialSchema = z.object({
  companyId: z.string().uuid(),
  plaidToken: z.string().min(1, 'Financial connection is required'),
});

type CompanyBasicsForm = z.infer<typeof CompanyBasicsSchema>;
type KYCForm = z.infer<typeof KYCSchema>;
type FinancialForm = z.infer<typeof FinancialSchema>;

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  completed: boolean;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [steps, setSteps] = useState<OnboardingStep[]>([
    {
      id: 1,
      title: 'Company Basics',
      description: 'Tell us about your company',
      icon: BuildingOfficeIcon,
      completed: false,
    },
    {
      id: 2,
      title: 'KYC Verification',
      description: 'Verify your identity',
      icon: ShieldCheckIcon,
      completed: false,
    },
    {
      id: 3,
      title: 'Link Financials',
      description: 'Connect your bank account',
      icon: BanknotesIcon,
      completed: false,
    },
  ]);

  // Forms for each step
  const companyForm = useForm<CompanyBasicsForm>({
    resolver: zodResolver(CompanyBasicsSchema),
    defaultValues: {
      email: '',
      name: '',
      sector: 'Technology',
      targetRaise: 1000000,
      revenue: 0,
    },
  });

  const kycForm = useForm<KYCForm>({
    resolver: zodResolver(KYCSchema),
  });

  const financialForm = useForm<FinancialForm>({
    resolver: zodResolver(FinancialSchema),
  });

  // Load email from session storage on mount
  useEffect(() => {
    const savedEmail = sessionStorage.getItem('onboarding_email');
    if (savedEmail) {
      companyForm.setValue('email', savedEmail);
    }
  }, [companyForm]);

  // Step completion handlers
  const handleCompanySubmit = async (data: CompanyBasicsForm) => {
    setIsLoading(true);
    try {
      const company = await api.createCompany(data);

      setCompanyId(company.id);
      kycForm.setValue('companyId', company.id);
      financialForm.setValue('companyId', company.id);

      // Mark step as completed
      setSteps(prev => prev.map(step =>
        step.id === 1 ? { ...step, completed: true } : step
      ));

      // Store progress
      sessionStorage.setItem('onboarding_progress', JSON.stringify({
        step: 2,
        companyId: company.id,
        company: company,
      }));

      toast.success('Company created successfully!');
      setCurrentStep(2);
    } catch (error: any) {
      console.error('Company creation error:', error);
      toast.error(error.response?.data?.error || 'Failed to create company');
    }
    setIsLoading(false);
  };

  const handleKYCSubmit = async (data: KYCForm) => {
    setIsLoading(true);
    try {
      const result = await api.verifyKyc(data.companyId, { mockVerify: true });

      if (result.verified) {
        // Mark step as completed
        setSteps(prev => prev.map(step =>
          step.id === 2 ? { ...step, completed: true } : step
        ));

        // Update progress
        const progress = JSON.parse(sessionStorage.getItem('onboarding_progress') || '{}');
        sessionStorage.setItem('onboarding_progress', JSON.stringify({
          ...progress,
          step: 3,
          kycVerified: true,
        }));

        toast.success('KYC verification completed!');
        setCurrentStep(3);
      } else {
        toast.error('KYC verification failed');
      }
    } catch (error: any) {
      console.error('KYC verification error:', error);
      toast.error(error.response?.data?.error || 'KYC verification failed');
    }
    setIsLoading(false);
  };

  const handleFinancialSubmit = async (data: FinancialForm) => {
    setIsLoading(true);
    try {
      // For demo purposes, we'll simulate the Plaid token
      const mockPlaidToken = `demo_token_${Date.now()}`;

      const result = await api.linkFinancials(data.companyId, mockPlaidToken);

      if (result.linked) {
        // Mark step as completed
        setSteps(prev => prev.map(step =>
          step.id === 3 ? { ...step, completed: true } : step
        ));

        // Complete onboarding
        sessionStorage.setItem('onboarding_progress', JSON.stringify({
          step: 'completed',
          companyId: data.companyId,
        }));

        toast.success('Financial accounts linked successfully!');

        // Navigate to dashboard after a brief delay
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      } else {
        toast.error('Failed to link financial accounts');
      }
    } catch (error: any) {
      console.error('Financial linking error:', error);
      toast.error(error.response?.data?.error || 'Failed to link financial accounts');
    }
    setIsLoading(false);
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <div className="flex flex-col items-center">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors ${
                step.completed
                  ? 'bg-green-500 border-green-500 text-white'
                  : currentStep === step.id
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-gray-100 border-gray-300 text-gray-400'
              }`}
            >
              {step.completed ? (
                <CheckCircleIcon className="w-6 h-6" />
              ) : (
                <step.icon className="w-6 h-6" />
              )}
            </div>
            <div className="mt-2 text-center">
              <p
                className={`text-sm font-medium ${
                  step.completed
                    ? 'text-green-600'
                    : currentStep === step.id
                    ? 'text-blue-600'
                    : 'text-gray-400'
                }`}
              >
                {step.title}
              </p>
              <p className="text-xs text-gray-500">{step.description}</p>
            </div>
          </div>
          {index < steps.length - 1 && (
            <div
              className={`w-16 h-0.5 mx-4 mt-6 ${
                steps[index + 1].completed || currentStep > step.id
                  ? 'bg-green-500'
                  : 'bg-gray-300'
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  const renderCompanyBasicsForm = () => (
    <motion.form
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      onSubmit={companyForm.handleSubmit(handleCompanySubmit)}
      className="space-y-6"
    >
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Company Name *
        </label>
        <Input
          {...companyForm.register('name')}
          placeholder="Enter your company name"
          error={companyForm.formState.errors.name?.message}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Email Address *
        </label>
        <Input
          {...companyForm.register('email')}
          type="email"
          placeholder="founder@company.com"
          error={companyForm.formState.errors.email?.message}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Industry Sector *
        </label>
        <select
          {...companyForm.register('sector')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {SECTORS.map((sector) => (
            <option key={sector} value={sector}>
              {sector}
            </option>
          ))}
        </select>
        {companyForm.formState.errors.sector && (
          <p className="text-red-500 text-sm mt-1">
            {companyForm.formState.errors.sector.message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Target Raise ($) *
          </label>
          <Input
            {...companyForm.register('targetRaise', { valueAsNumber: true })}
            type="number"
            placeholder="1000000"
            error={companyForm.formState.errors.targetRaise?.message}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Annual Revenue ($)
          </label>
          <Input
            {...companyForm.register('revenue', { valueAsNumber: true })}
            type="number"
            placeholder="500000"
            error={companyForm.formState.errors.revenue?.message}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isLoading}
          className="px-8"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
          ) : null}
          Continue
          <ChevronRightIcon className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </motion.form>
  );

  const renderKYCForm = () => (
    <motion.form
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      onSubmit={kycForm.handleSubmit(handleKYCSubmit)}
      className="space-y-6"
    >
      <div className="text-center py-8">
        <ShieldCheckIcon className="w-16 h-16 text-blue-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Identity Verification
        </h3>
        <p className="text-gray-600 mb-6">
          We need to verify your identity to ensure security and compliance.
          This helps build trust with potential investors.
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>Demo Mode:</strong> In a production environment, this would integrate
            with Persona for real identity verification. For this demo, we'll simulate
            the verification process.
          </p>
        </div>
      </div>

      <div className="flex justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={handlePrevious}
          disabled={isLoading}
        >
          <ChevronLeftIcon className="w-4 h-4 mr-2" />
          Previous
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
          ) : null}
          Verify Identity
          <ChevronRightIcon className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </motion.form>
  );

  const renderFinancialForm = () => (
    <motion.form
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      onSubmit={financialForm.handleSubmit(handleFinancialSubmit)}
      className="space-y-6"
    >
      <div className="text-center py-8">
        <BanknotesIcon className="w-16 h-16 text-green-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Link Financial Accounts
        </h3>
        <p className="text-gray-600 mb-6">
          Connect your bank accounts to provide investors with verified
          financial information. This data is encrypted and secure.
        </p>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-green-800">
            <strong>Demo Mode:</strong> In production, this would use Plaid for secure
            bank account linking. For this demo, we'll simulate the connection process.
          </p>
        </div>
      </div>

      <div>
        <Input
          {...financialForm.register('plaidToken')}
          placeholder="Plaid token (auto-generated for demo)"
          value={`demo_token_${Date.now()}`}
          readOnly
          className="bg-gray-50"
        />
      </div>

      <div className="flex justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={handlePrevious}
          disabled={isLoading}
        >
          <ChevronLeftIcon className="w-4 h-4 mr-2" />
          Previous
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
          ) : null}
          Connect Accounts
          <CheckCircleIcon className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </motion.form>
  );

  const getCurrentForm = () => {
    switch (currentStep) {
      case 1:
        return renderCompanyBasicsForm();
      case 2:
        return renderKYCForm();
      case 3:
        return renderFinancialForm();
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">CM</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Capital Marketplace</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to Your Journey
          </h1>
          <p className="text-gray-600">
            Let's get your company set up to connect with investors
          </p>
        </div>

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Form Content */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Step {currentStep}: {steps[currentStep - 1].title}
              </h2>
              <p className="text-gray-600">
                {steps[currentStep - 1].description}
              </p>
            </div>

            <AnimatePresence mode="wait">
              {getCurrentForm()}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}