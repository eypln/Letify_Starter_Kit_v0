'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Check, Crown, Zap, Star, Users, MessageCircle, BarChart3, Palette, Headphones, Globe, Video, Plus, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BillingCustomer {
  credits: number;
}

interface BillingSubscription {
  status: string;
  plan_type: 'mini' | 'full';
  billing_cycle?: 'monthly' | 'yearly';
  current_period_start?: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
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
      'Monthly 15 Facebook Post (text+image)',
      'Email Support'
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
      'Priority Support'
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
      '(Facebook, Instagram, Tiktok, Mastodon, Whatsapp)',
      'Unlimited Facebook Posts (text+image)',
      'Chrome Extension for posts',
      'Montly 30 Reels (text+video)',
      'Adding Credits Option (credits=€1 reels)',
      'Advanced Listing Analytics',
      'More Design templates',
      'Messenger and Whatsapp chatbots',
      'Lead Capture Mode',
      'CRM Client database',
      'Priority Support'
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
    features: [
      'For agencies and teams',
      'Contact us for pricing!'
    ],
    icon: Users,
    popular: false,
    buttonText: 'Contact Sales',
    disabled: false,
  },
] as const;

export default function SubscriptionPage() {
  const [billing, setBilling] = useState<BillingCustomer | null>(null);
  const [subscription, setSubscription] = useState<BillingSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    loadBillingData();
  }, []);

  const loadBillingData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load billing customer data
      const { data: billingData } = await supabase
        .from('billing_customers')
        .select('credits')
        .eq('user_id', user.id)
        .single();

      setBilling(billingData);

      // Load subscription data
      const { data: subscriptionData } = await supabase
        .from('billing_subscriptions')
        .select('status, plan_type, billing_cycle, current_period_start, current_period_end, cancel_at_period_end')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      setSubscription(subscriptionData);
    } catch (error) {
      console.error('Error loading billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscriptionCheckout = async (plan: 'mini' | 'full') => {
    setCheckoutLoading(`subscription-${plan}-${billingCycle}`);
    try {
      const response = await fetch('/api/stripe/checkout/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, billing: billingCycle }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast({
        title: 'Error',
        description: 'Failed to start checkout process. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleCreditCheckout = async (credits: number) => {
    setCheckoutLoading(`credits-${credits}`);
    try {
      const response = await fetch('/api/stripe/checkout/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credits: credits.toString() }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast({
        title: 'Error',
        description: 'Failed to start checkout process. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleBillingPortal = async () => {
    setCheckoutLoading('billing-portal');
    try {
      const response = await fetch('/api/stripe/billing-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No billing portal URL received');
      }
    } catch (error) {
      console.error('Error opening billing portal:', error);
      toast({
        title: 'Error',
        description: 'Failed to open billing portal. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleEnterpriseContact = () => {
    window.open('mailto:sales@letify.cloud?subject=Enterprise Plan Inquiry', '_blank');
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading billing information...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Subscription & Billing
        </h1>
        <p className="text-gray-600">Manage your subscription and billing details</p>
      </div>

      {/* User Subscription Details - Top Section */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
        <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-6">
          {/* Plan Type */}
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-600">Plan Type</p>
            <p className="text-lg font-semibold">
              {subscription ? (
                `${subscription.plan_type === 'mini' ? 'Mini' : 'Full'} Plan`
              ) : (
                'Free Plan'
              )}
            </p>
          </div>

          {/* Start Date */}
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-600">Start Date</p>
            <p className="text-lg font-semibold">
              {subscription ? (
                new Date(subscription.current_period_start || new Date()).toLocaleDateString()
              ) : (
                'N/A'
              )}
            </p>
          </div>

          {/* Next Billing Date */}
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-600">Next Billing</p>
            <p className="text-lg font-semibold">
              {subscription ? (
                new Date(subscription.current_period_end).toLocaleDateString()
              ) : (
                'N/A'
              )}
            </p>
          </div>

          {/* Outstanding Balance */}
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-600">Outstanding Balance</p>
            <p className="text-lg font-semibold text-green-600">€0.00</p>
          </div>

          {/* Usage This Month */}
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-600">Usage This Month</p>
            <p className="text-lg font-semibold">
              {subscription ? (
                subscription.plan_type === 'mini' ? '8/15 Posts' : '12/30 Reels'
              ) : (
                '3/15 Posts'
              )}
            </p>
          </div>

          {/* Credit Balance */}
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-600">Credit Balance</p>
            <p className="text-lg font-semibold text-blue-600">
              {billing?.credits || 0} credits
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-gray-200">
          {subscription && (
            <>
              <Button 
                onClick={handleBillingPortal} 
                disabled={checkoutLoading === 'billing-portal'}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {checkoutLoading === 'billing-portal' ? 'Loading...' : 'Upgrade Plan'}
              </Button>
              <Button 
                onClick={handleBillingPortal} 
                variant="outline"
                disabled={checkoutLoading === 'billing-portal'}
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                Cancel Plan
              </Button>
            </>
          )}
          <Button 
            onClick={handleBillingPortal} 
            variant="outline"
            disabled={checkoutLoading === 'billing-portal'}
          >
            {checkoutLoading === 'billing-portal' ? 'Loading...' : 'Billing Portal'}
          </Button>
          {subscription && (
            <div className="flex items-center gap-2 ml-auto">
              <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                {subscription.status}
              </Badge>
              {subscription.cancel_at_period_end && (
                <Badge variant="destructive">Canceling</Badge>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Credit Packages */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-center">Buy Credits</h2>
        <p className="text-center text-gray-600 mb-6">Purchase credits to generate more content and reels</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {CREDIT_PACKAGES.map((pkg) => (
            <Card key={pkg.amount} className="hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <CardTitle className="text-lg">{pkg.amount} Credits</CardTitle>
                <CardDescription>{pkg.description}</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-2xl font-bold text-blue-600">{pkg.price}</div>
                <p className="text-sm text-gray-500 mt-1">€{(parseInt(pkg.price.replace('€', '')) / pkg.amount).toFixed(2)} per credit</p>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={() => handleCreditCheckout(pkg.amount)}
                  disabled={checkoutLoading === `credits-${pkg.amount}`}
                  className="w-full"
                  variant={pkg.amount === 100 ? 'default' : 'outline'}
                >
                  {checkoutLoading === `credits-${pkg.amount}` ? 'Loading...' : 'Buy Now'}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>

      {/* Subscription Plans */}
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Subscription Plans</h2>
          <p className="text-gray-600">Choose the perfect plan for your business needs</p>
          
          {/* Monthly/Yearly Toggle */}
          <div className="inline-flex items-center gap-2 bg-gray-100 rounded-full p-1">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium transition-all',
                billingCycle === 'monthly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium transition-all',
                billingCycle === 'yearly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              Yearly
            </button>
          </div>
          {billingCycle === 'yearly' && (
            <p className="text-green-600 font-medium">%15 discount for yearly subscription</p>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {SUBSCRIPTION_PLANS.map((plan) => {
            const Icon = plan.icon;
            const isCurrentPlan = subscription?.plan_type === plan.type || (plan.type === 'free' && !subscription);
            const currentPrice = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
            const isEnterprise = plan.type === 'enterprise';
            
            return (
              <Card 
                key={plan.type} 
                className={cn(
                  'relative transition-all duration-200 hover:shadow-lg',
                  plan.popular && 'ring-2 ring-blue-500 scale-105',
                  isCurrentPlan && 'ring-2 ring-green-500'
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-blue-500 text-white px-3 py-1">
                      Most Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-2">
                    <Icon className={cn(
                      'h-8 w-8',
                      plan.type === 'free' && 'text-gray-500',
                      plan.type === 'mini' && 'text-blue-500',
                      plan.type === 'full' && 'text-purple-500',
                      plan.type === 'enterprise' && 'text-orange-500'
                    )} />
                  </div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <div className="space-y-1">
                    <div className="text-3xl font-bold">
                      {currentPrice}
                      {!isEnterprise && currentPrice !== '€0' && (
                        <span className="text-sm font-normal text-gray-500">
                          /{billingCycle === 'yearly' ? 'year' : 'month'}
                        </span>
                      )}
                    </div>
                    {billingCycle === 'yearly' && !isEnterprise && plan.monthlyPrice !== '€0' && (
                      <div className="text-sm text-gray-500 line-through">
                        {plan.monthlyPrice}/month
                      </div>
                    )}
                  </div>
                  <CardDescription className="text-center">
                    {plan.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={() => {
                      if (isEnterprise) {
                        handleEnterpriseContact();
                      } else if (plan.type !== 'free') {
                        handleSubscriptionCheckout(plan.type as 'mini' | 'full');
                      }
                    }}
                    disabled={
                      plan.disabled || 
                      isCurrentPlan || 
                      checkoutLoading === `subscription-${plan.type}-${billingCycle}`
                    }
                    className={cn(
                      'w-full',
                      plan.popular && 'bg-blue-500 hover:bg-blue-600',
                      isCurrentPlan && 'bg-green-500 hover:bg-green-600'
                    )}
                    variant={plan.popular ? 'default' : 'outline'}
                  >
                    {checkoutLoading === `subscription-${plan.type}-${billingCycle}` 
                      ? 'Loading...' 
                      : isCurrentPlan 
                      ? 'Current Plan' 
                      : plan.buttonText
                    }
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}