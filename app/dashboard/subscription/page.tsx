'use client';

import React, { useState, Suspense } from 'react';

import RefreshOnSuccess from './RefreshOnSuccess';
import { useBillingController } from './useBillingController';

import { Badge } from '@/components/ui/badge';
import { Check, Crown, Zap, Star, Users } from 'lucide-react';

// SSR/CSR tutarlı tarih (UTC kullanarak)
const fmtDate = (iso?: string | null) =>
  !iso ? 'N/A' : new Date(iso).toLocaleDateString('tr-TR', { timeZone: 'UTC' });

import { cn } from '@/lib/utils';

interface BillingSubscription {
  status: string;
  plan_type: 'mini' | 'full';
  billing_cycle?: 'monthly' | 'yearly';
  current_period_start?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean | null;
}

const CREDIT_PACKAGES = [
  { amount: 10, price: '€10', description: 'Perfect for trying out' },
  { amount: 20, price: '€20', description: 'Popular choice' },
  { amount: 50, price: '€50', description: 'Great value' },
  { amount: 100, price: '€100', description: 'Most popular' },
  { amount: 200, price: '€200', description: 'Best value' },
] as const;

const SUBSCRIPTION_PLANS = [
  {
    type: 'free' as const,
    name: 'Free Plan',
    monthlyPrice: '€0',
    yearlyPrice: '€0',
    description: 'Perfect for getting started',
    features: [
      'Link 1 profile',
      'Monthly 30 Facebook Post (text+image)',
      'Email Support',
    ],
    icon: Star,
    popular: false,
    buttonText: 'Current Plan',
    disabled: true,
  },
  {
    type: 'mini' as const,
    name: 'Mini Plan',
    monthlyPrice: '€39',
    yearlyPrice: '€33',
    description: 'Great for small businesses',
    features: [
      'Link 2 profiles',
      '(Facebook, Instagram)',
      'Unlimited Facebook Posts (text+image)',
      'Chrome Extension',
      'Monthly 15 Reels/Stories (text+video)',
      'Adding Credits Option (credits=€1 reels)',
      'Basic Listing Analytics',
      'Design Templates',
      'Priority Support',
    ],
    icon: Zap,
    popular: false,
    buttonText: 'Get Plan',
    disabled: false,
  },
  {
    type: 'full' as const,
    name: 'Full Plan',
    monthlyPrice: '€89',
    yearlyPrice: '€76',
    description: 'Perfect for growing teams',
    features: [
      'Link 5 profiles',
      '(Facebook, Instagram, TikTok, Messenger, WhatsApp)',
      'Unlimited Facebook Posts (text+image)',
      'Chrome Extension for posts',
      'Monthly 30 Reels (text+video)',
      'Adding Credits Option (credits=€1 reels)',
      'Advanced Listing Analytics',
      'More Design templates',
      'Messenger and Whatsapp chatbots',
      'Lead Capture Mode',
      'CRM Client database',
      'Priority Support',
    ],
    icon: Crown,
    popular: true,
    buttonText: 'Get Plan',
    disabled: false,
  },
  {
    type: 'enterprise' as const,
    name: 'Enterprise',
    monthlyPrice: 'Custom',
    yearlyPrice: 'Custom',
    description: 'For agencies and teams',
    features: ['Unlimited profiles', 'All features included', 'Priority support', 'Custom integrations', 'For agencies and teams', 'Contact us for pricing!'],
    icon: Users,
    popular: false,
    buttonText: 'Contact Sales',
    disabled: false,
  },
] as const;

export default function SubscriptionPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const {
    buySubscription, buyCredit,
    loadingKey, credits, sub, monthlyPostUsage,
  } = useBillingController();

  return (
    <Suspense fallback={<div className="max-w-6xl mx-auto p-6">Loading...</div>}>
      <SubscriptionContent
        billingCycle={billingCycle}
        setBillingCycle={setBillingCycle}
        buySubscription={buySubscription}
        buyCredit={buyCredit}
        loadingKey={loadingKey}
        credits={credits}
        sub={sub}
        monthlyPostUsage={monthlyPostUsage}
      />
    </Suspense>
  );
}

function SubscriptionContent({
  billingCycle,
  setBillingCycle,
  buySubscription,
  buyCredit,
  loadingKey,
  credits,
  sub,
  monthlyPostUsage,
}: {
  billingCycle: 'monthly' | 'yearly';
  setBillingCycle: (cycle: 'monthly' | 'yearly') => void;
  buySubscription: (plan: 'mini' | 'full', cycle: 'monthly' | 'yearly') => Promise<void>;
  buyCredit: (amount: 10 | 20 | 50 | 100 | 200) => Promise<void>;
  loadingKey: string | null;
  credits: number | null;
  sub: BillingSubscription | null;
  monthlyPostUsage: number | null;
}) {
  return (
    <>
      {/* görünmez, görseli bozmaz */}
      <Suspense fallback={null}>
        <RefreshOnSuccess />
      </Suspense>

      <div className="max-w-6xl mx-auto p-6 space-y-8 relative">
        <div className="absolute top-6 right-8 z-10">
          <a
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm hover:bg-purple-50 dark:hover:bg-purple-900/30"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" className="opacity-70">
              <path
                d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8v-10h-8v10zm0-18v6h8V3h-8z"
                fill="currentColor"
              />
            </svg>
            Dashboard
          </a>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent">
            Subscription & Billing
          </h1>
          <p className="text-gray-600">Manage your subscription and billing details</p>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-6">
          <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-6">
            {/* Plan Type */}
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Plan</p>
              <p className="text-lg font-semibold">
                {sub
                  ? sub.plan_type === 'mini'
                    ? 'Mini Plan'
                    : sub.plan_type === 'full'
                      ? 'Full Plan'
                      : 'Free Plan'
                  : 'Free Plan'}
              </p>
            </div>

            {/* Start Date */}
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Start Date</p>
              <p className="text-lg font-semibold">
                <span suppressHydrationWarning>{fmtDate(sub?.current_period_start)}</span>
              </p>
            </div>

            {/* Next Billing Date */}
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Next Billing Date</p>
              <p className="text-lg font-semibold">
                <span suppressHydrationWarning>{fmtDate(sub?.current_period_end)}</span>
              </p>
            </div>

            {/* Outstanding Balance */}
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Outstanding Balance</p>
              <p className="text-lg font-semibold text-purple-600">{sub && sub.status === 'active' ? '€0.00' : '-'}</p>
            </div>

            {/* Usage This Month */}
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Usage This Month</p>
              <p className="text-lg font-semibold">
                {sub && sub.status === 'active' ? (
                  sub.plan_type === 'mini' || sub.plan_type === 'full' 
                    ? `${monthlyPostUsage ?? 0}/Unlimited Posts` 
                    : `${monthlyPostUsage ?? 0}/30 Posts`
                ) : '-'}
              </p>
            </div>

            {/* Credit Balance */}
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Credit Balance</p>
              <p className="text-lg font-semibold text-purple-600">
                {credits !== null ? `${credits} credits` : '-'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-purple-200">
            <div className="flex items-center gap-2 ml-auto">
              {sub && sub.status === 'active' && String(sub.plan_type) !== 'free' ? (
                <Badge className="px-2 py-1 rounded-md text-xs bg-green-100 text-green-700">active</Badge>
              ) : (
                <Badge className="px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700">free</Badge>
              )}
              {sub && Boolean(sub?.cancel_at_period_end) && (
                <Badge className="px-2 py-1 rounded-md text-xs bg-red-600 text-white">Canceling</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Credit Packages */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-center">Buy Credits</h2>
          <p className="text-center text-gray-600 mb-6">
            Purchase credits to generate more content and reels
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {CREDIT_PACKAGES.map((pkg) => (
              <div key={pkg.amount} className="rounded-lg border border-purple-200 bg-card text-card-foreground shadow-sm hover:shadow-lg transition-shadow">
                <div className="p-6 pb-4 text-center">
                  <h3 className="text-lg font-semibold leading-none tracking-tight">{pkg.amount} Credits</h3>
                  <p className="text-sm text-muted-foreground mt-2">{pkg.description}</p>
                </div>
                <div className="p-6 pt-0 text-center">
                  <div className="text-2xl font-bold text-purple-600">{pkg.price}</div>
                  <p className="text-sm text-gray-500 mt-1">
                    €
                    {(parseInt(pkg.price.replace('€', '')) / pkg.amount).toFixed(2)} per credit
                  </p>
                </div>
                <div className="p-6 pt-0">
                  <button
                    onClick={() => buyCredit(pkg.amount as 10 | 20 | 50 | 100 | 200)}
                    disabled={loadingKey === `credit-${pkg.amount}`}
                    className="w-full px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingKey === `credit-${pkg.amount}` ? 'Loading...' : 'Buy Now'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Subscription Plans */}
        <div className="space-y-6">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold">Subscription Plans</h2>
            <p className="text-gray-600">Choose the perfect plan for your business needs</p>

            {/* Monthly/Yearly Toggle */}
            <div className="inline-flex items-center gap-2 bg-purple-100 rounded-full p-1">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-medium transition-all',
                  billingCycle === 'monthly'
                    ? 'bg-purple-500 text-white shadow-sm'
                    : 'text-purple-600 hover:text-purple-900'
                )}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-medium transition-all',
                  billingCycle === 'yearly'
                    ? 'bg-purple-500 text-white shadow-sm'
                    : 'text-purple-600 hover:text-purple-900'
                )}
              >
                Yearly
              </button>
            </div>
            {billingCycle === 'yearly' && (
              <p className="text-purple-600 font-medium">15% discount for yearly subscription</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {SUBSCRIPTION_PLANS.map((plan) => {
              // Bazı kurulumlarda lucide tipleri JSX'te uyarı verebilir.
              const IconComp = plan.icon as unknown as React.ComponentType<React.SVGProps<SVGSVGElement>>;
              const isCurrentPlan = sub?.plan_type === plan.type || (plan.type === 'free' && !sub);
              const currentPrice = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
              const isEnterprise = plan.type === 'enterprise';

              return (
                <div
                  key={plan.type}
                  className={cn(
                    'relative rounded-lg border bg-card text-card-foreground shadow-sm transition-all duration-200 hover:shadow-lg flex flex-col',
                    plan.popular && 'ring-2 ring-purple-500 scale-105',
                    isCurrentPlan && 'ring-2 ring-purple-600'
                  )}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-purple-500 text-white px-3 py-1">Most Popular</Badge>
                    </div>
                  )}
                  <div className="p-6 pb-4 text-center">
                    <div className="flex justify-center mb-2">
                      <IconComp
                        className={cn(
                          'h-8 w-8',
                          plan.type === 'free' && 'text-gray-500',
                          plan.type === 'mini' && 'text-purple-500',
                          plan.type === 'full' && 'text-purple-600',
                          plan.type === 'enterprise' && 'text-purple-400'
                        )}
                      />
                    </div>
                    <h3 className="text-xl font-semibold leading-none tracking-tight">{plan.name}</h3>
                    <div className="space-y-1 mt-2">
                      <div className="text-3xl font-bold text-purple-600">
                        {currentPrice}
                        {!isEnterprise && currentPrice !== '€0' && (
                          <span className="text-sm font-normal text-purple-400">
                            /{billingCycle === 'yearly' ? 'year' : 'month'}
                          </span>
                        )}
                      </div>
                      {billingCycle === 'yearly' && !isEnterprise && plan.monthlyPrice !== '€0' && (
                        <div className="text-sm text-purple-400 line-through">
                          {plan.monthlyPrice}/month
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 text-center">{plan.description}</p>
                  </div>

                  <div className="p-6 pt-0 flex-1">
                    <ul className="space-y-2">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          {/* lucide Check için de aynı cast */}
                          {React.createElement(Check as unknown as React.ComponentType<React.SVGProps<SVGSVGElement>>, {
                            className: 'w-4 h-4 text-green-500 mt-0.5 flex-shrink-0',
                          })}
                          <span className="text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-6 pt-0">
                    <button
                      onClick={() => {
                        if (isEnterprise) {
                          window.open(
                            'mailto:sales@letify.cloud?subject=Enterprise Plan Inquiry',
                            '_blank'
                          );
                        } else if (plan.type !== 'free') {
                          buySubscription(plan.type as 'mini' | 'full', billingCycle);
                        }
                      }}
                      disabled={
                        plan.disabled ||
                        isCurrentPlan ||
                        loadingKey === `sub-${plan.type}-${billingCycle}`
                      }
                      className={cn(
                        'w-full px-4 py-2 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                        'bg-purple-500 hover:bg-purple-600',
                        isCurrentPlan && 'bg-purple-600 hover:bg-purple-700'
                      )}
                    >
                      {loadingKey === `sub-${plan.type}-${billingCycle}`
                        ? 'Loading...'
                        : isCurrentPlan
                        ? 'Current Plan'
                        : plan.buttonText}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}